const mysqlOrm = require('mysql-orm');
const TutorPreference = require("../../models/TutorPreference");
const TutorAvailability = require("../../models/TutorAvailability");
const TutorLeave = require("../../models/TutorLeave");

const User = require("../../models/User");
const globalHelper = require("../../_helper/GlobalHelper");
const fs = require("fs");
const moment = require('moment-timezone');

module.exports = {
  index,
  storePrivateNote,
  dropzoneUploadAttachments,
  dropzoneRemoveAttachment,
  storePrivateAttachments,
  editRelativeAttachmentNote,
  updateRelativeNote,
  destroyAttachment,
  emailNotificationPreference,
};

/**
 * tutor setting index.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const tutorId = mysqlOrm.Types.ObjectId(req.params.id);
    const allStudents = await globalHelper.fetchAllAssignStudentOfTutor(
      req.params.id
    );

    const assignedStudents = await User.find(
      { _id: { $in: allStudents } },
      "_id first_name last_name"
    );
    const tutor = await User.findById(tutorId).populate('subject_ids');
    // fetch tutor availability data
    let fetchTutorAvailability = await TutorAvailability.find({tutor_id:tutor.id, isDeleted:false}).sort({'created_at':'-1'});
    let fetchTutorPreference = await TutorPreference.find({isDeleted:false}).sort({'created_by':'-1'});

    // fetch tutor leave requests
    let fetchTutorLeaveRequests = await TutorLeave
    .find({ tutor_id: tutor.id, isDeleted: false })
    .sort({ created_at: -1 });

    const loggedUserInfo = res.locals.loggedUserInfo;
    return res.render("../views/admin/tutors/settings/index", {
      moment:moment,
      user: tutor,
      loggedUserInfo:loggedUserInfo,
      assignedStudents: assignedStudents,
      fetchTutorAvailability:fetchTutorAvailability,
      fetchTutorPreference:fetchTutorPreference,
      fetchTutorLeaveRequests:fetchTutorLeaveRequests,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store private note.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function storePrivateNote(req, res) {
  try {
    const tutorId = req.body.tutor_id;
    const note = req.body.note;
    const response = await User.findByIdAndUpdate(tutorId, { note: note });
    if (response) {
      req.flash("success", "Note is added successfully!");
    } else {
      req.flash("error", "Sorry ! Note not added!");
    }
    res.redirect("back");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store user private attachments.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function dropzoneUploadAttachments(req, res) {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No attachment files found in the request.",
      });
    }

    const attachments = files.map(createImageObject);
    return res.status(201).json({
      success: true,
      attachments: attachments,
      message: "The attachment is saved successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * remove an attachment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function dropzoneRemoveAttachment(req, res) {
  try {
    let filePath = `./assets/UserAttachments/${req.body.filename}`;

    if(req.body.destination && req.body.destination != ''){
      filePath = `./assets/${req.body.destination}/${req.body.filename}`;
    }

    const attachmentRemoved = globalHelper.removeAnyFile(filePath);
    if (attachmentRemoved) {
      return res.status(200).json({
        success: true,
        message: "The Attachment is successfully removed from directory.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "The Attachment is not removed from directory.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store user attachments data.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function storePrivateAttachments(req, res) {
  try {
    const userId = req.body.user_id; // "641b1670a489f7f878a95bf1";
    let privateAttachments = JSON.parse(req.body.private_attachments);
    const uniqueAttachments = privateAttachments.reduce((acc, obj) => {
      const key = obj.originalname; // Use "originalname" as the key for uniqueness
      if (!acc.hasOwnProperty(key)) {
        acc[key] = obj;
      }
      return acc;
    }, {});
    
    privateAttachments = Object.values(uniqueAttachments);

    privateAttachments.forEach((object) => {
      object.note = req.body.attachment_note ?? "";
      delete object.originalname;
      delete object.path;
    });

    const user = await User.findById(userId, { attachments: 1 });
    let mergedArray = [];
    let existingAttachments = user.attachments;
    if (existingAttachments && existingAttachments.length > 0) {
      mergedArray = existingAttachments.concat(privateAttachments);
    } else {
      mergedArray = privateAttachments;
    }

    const result = await User.findByIdAndUpdate(userId, {
      attachments: mergedArray,
    });

    if (result) {
      req.flash("success", "Attachment added successfully!");
      return res.status(200).json({
        success: true,
        message: "Attachment added successfully!",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Sorry! Attachment is not added",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit relative attachment's note.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function editRelativeAttachmentNote(req, res){
  try{
    let userId = req.body.user_id;
    let attachmentId = req.body.attachment_id;
    let fetchUserData = await User.findById(userId,{attachments:1});
    let existingAttachments = fetchUserData.attachments;
    const filteredObject = existingAttachments.find(obj => obj._id.toString() === attachmentId);
    return res.send(filteredObject);
  }catch(error){
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update relative note of an attachment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateRelativeNote(req, res) {
  try {
    const userId = req.body.user_id;
    const attachmentId = req.body.attachment_id;
    const notes = req.body.attachment_note;
    const fetchUserData = await User.findById(userId, { attachments: 1 });
    const existingAttachments = fetchUserData.attachments;

    // Find the object with the specified ID
    const targetObjectIndex = existingAttachments.findIndex(
      (obj) => obj._id.toString() === attachmentId
    );
    if (targetObjectIndex !== -1) {
      existingAttachments[targetObjectIndex].note = notes;
    }

    const result = await User.findByIdAndUpdate(userId, {
      attachments: existingAttachments,
    });
    if (result) {
      req.flash("success", "Attachment updated successfully!");
    } else {
      req.flash("error", "Sorry! Attachment not updated!");
    }
    res.redirect("back");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * destroy an attachment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroyAttachment(req, res) {
  try {
    const userId = req.body.user_id;
    const attachmentId = req.body.attachment_id;
    const fetchUserData = await User.findById(userId, { attachments: 1 });
    const existingAttachments = fetchUserData.attachments;

    const userAttachment = existingAttachments.filter(
      (obj) => obj._id.toString() == attachmentId
    );

    const filePath = `./assets/UserAttachments/${userAttachment[0].name}`;

    const filteredArray = existingAttachments.filter(
      (obj) => obj._id.toString() !== attachmentId
    );

    const result = await User.findByIdAndUpdate(userId, {
      attachments: filteredArray,
    });

    if (result) {
      const attachmentRemoved = globalHelper.removeAnyFile(filePath);

      req.flash("success", "Attachment deleted successfully!");
      return res.status(200).json({
        success: true,
        message: "Attachment deleted successfully!",
      });
    } else {
      req.flash("error", "Sorry! Attachment not deleted!");
      return res.status(400).json({
        success: false,
        message: "Attachment not deleted successfully!",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * destroy an attachment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function emailNotificationPreference(req, res) {
  try{
    let Object = {
      register_for_lesson: req.body.register_for_lesson == '1' ? true:false,
      cancel_for_lesson: req.body.cancel_for_lesson == '1' ? true:false,
      email_daily_agenda: req.body.email_daily_agenda,
      select_time: req.body.start_time ,
      send_email_daily_agenda: req.body.send_email_daily_agenda == '1' ? true:false,
    }
    let result = '';
    if(req.body.tutor_preference_id !==''){
      result = await TutorPreference.findByIdAndUpdate(req.body.tutor_preference_id, {email_notification_preferences:Object});
    }else{
      result = await TutorPreference.create({tutor_id: req.body.tutor_id,email_notification_preferences:Object});
    }
    if (result) {
      req.flash("success", "Attachment deleted successfully!");
    } else {
      req.flash("error", "Sorry! Attachment not deleted!");
    }
    res.redirect('back');
  }catch(error){
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * create Image Object as collection field.
 * @param {*} req
 * @param {*} res
 * @returns
 */
function createImageObject(file) {
  try {
    // Extract extension from filename
    const extension = file.originalname.split(".").pop();

    // Convert size to MB or KB
    let size;
    if (file.size >= 1024 * 1024) {
      size = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      size = `${(file.size / 1024).toFixed(2)} KB`;
    }

    return {
      name: file.filename,
      originalname: file.originalname,
      extension: extension,
      size: size,
      path: file.path,
    };
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}