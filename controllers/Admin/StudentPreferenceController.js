const mysqlOrm = require('mysql-orm');

const moment = require("moment");
const StudentPreference = require("../../models/StudentPreference");
const FamilyContacts = require("../../models/FamilyContacts");
const Assessment = require("../../models/Assessment");
const Event = require("../../models/Event");
const GroupTag = require("../../models/GroupTag");
const EventAttendance = require("../../models/EventAttendance");
const User = require("../../models/User");
const EventGroupNote = require("../../models/EventGroupNote");
const globalHelper = require("../../_helper/GlobalHelper");
const AssignedTutors = require("../../models/AssignedTutors");
const GlobalConstants = require("../../_helper/GlobalConstants");
const Notification = require("../../models/Notifications");
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

const Invoices = require("../../models/Invoice");
const Transaction = require("../../models/Transaction");
const { generateReceipt } = require("../../services/attechmentService");
const { createNotification } = require("../../services/NotificationService");
const mail = require("../../config/mail");
const PointBalance = require("../../models/PointBalance");

module.exports = {
  index,
  store,
  edit,
  update,
  destroy,

  storePrivateNote,
  storePrivateAttachments,
  dropzoneUploadAttachments,
  dropzoneRemoveAttachment,
  editRelativeAttachmentNote,
  updateRelativeNote,
  destroyAttachment,

  checkFamilyContactForLegalGuardian,
  checkFamilyContactForInvoiceRecipient,

  assignTutor,
  getAssignedTutor,
  updateAssignedTutor,
  getAssignedTutorsList,

  studentAttendanceNotesDataTable,
  studentNoteAndAttachments,
  studentMessageHistory,
  generatePdf,
  downloadTransactionReceipt,
  studentMessageHistoryTable,
  messageHistory,
  getMessageHistoryData,
  forwardMessage,
};

/**
 * student setting index.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const userRole = res.locals.loggedUserInfo.role;
    const userDetails = res.locals.loggedUserInfo;

    let studentId = req.params.id;

    let allTutors = await globalHelper.fetchAllAssignTutorOfStudent(studentId);
    const users = await User.find({ role: { $in: [2, 3] } }, { first_name: 1, last_name: 1, email: 1, role: 1 }).lean();
    const familyUsers = await User.find({ role: 4 }, { first_name: 1, last_name: 1, email: 1, role: 1 }).lean();
    const currentStudent = await User.findById(studentId).populate([
      {
        path: "school_id",
        model: "schools",
        select: "name",
      },
      {
        path: "grade_id",
        model: "grades",
        select: "name",
      }
    ]);

    const pointBalance = await PointBalance.findOne({
      userId: studentId
    }).lean();

    currentStudent.awarded_reward_points =
      pointBalance?.balance || 0;

    const sentFrom = [
      {
        value: process.env.APP_EMAIL || "alicia@pioneerstutoring.com",
        label: process.env.APP_NAME ||  "HIPL Learning Hub"
      },
      {
        value: userDetails.email,
        label: `${userDetails.first_name} ${userDetails.last_name}`
      }
    ];


    // Fetch group tags manually
    const studentGroupTags = await GroupTag.find(
      { student_ids: studentId },
      { name: 1, color: 1, _id: 0 }
    ).lean();

    const tagColors = GlobalConstants.tag_colors;

    currentStudent.groupTagsLength = studentGroupTags.length;
    currentStudent.groupTags = `<label class="group-tags-container">${
      studentGroupTags.map((group) => {
        let colorData = tagColors.find((tagColor) => tagColor.key === group.color);
        return `<span class="badge" style="background-color:${colorData.background_color};color:${colorData.color}">${group.name || ''}</span>`;
      }).join(' ')
    }</label>`;
    
    // let assignedTutor = await User.find({ _id: { $in: allTutors } }, '_id first_name last_name');
    let assignedTutors = allTutors;

    let lessonCategory = GlobalConstants.lessonCategory;

    const familyContacts = await FamilyContacts.find({ isDeleted: false, student_id: studentId }).populate('user_id');
    const eventData = await Event.find({ student_ids: mysqlOrm.Types.ObjectId(studentId) });

    const attendanceData = await EventAttendance.find({ 'attendees.student_id': studentId }, { 'attendees.$': 1 });
    let relatedUsers = await User.find({
      $or: [
        { role: 2, status: 1, isDeleted: false },
        { role: 3, status: 1, isDeleted: false },
      ],
    }).sort({ role: 1, first_name: 1 });
    let tutors = relatedUsers.filter((user) => user.role === 2);


    let eventCount = eventData.length;
    let presentCount = 0;
    let absentCount = 0;
    let unrecorded = 0;
    let percentage = 0;

    if (attendanceData.length > 0) {
      // Initialize counters for present and absent statuses
      // Iterate over data and count the statuses
      attendanceData.forEach(item => {
        item.attendees.forEach(attendee => {
          if (attendee.status === 'present') {
            presentCount++;
          } else if (attendee.status === 'absent') {
            absentCount++;
          }
        });
      });
      let recordedEvent = parseInt(presentCount) + parseInt(absentCount);
      unrecorded = eventCount - recordedEvent;
      percentage = (presentCount / recordedEvent) * 100;

      if (Number.isInteger(percentage) === false) {
        percentage = percentage.toFixed(2);
      }
      if (isNaN(percentage)) {
        percentage = 0;
      }
    }
    let studentEventData = { totalEvent: eventData.length, present: presentCount, absent: absentCount, unrecorded: unrecorded, percentage: percentage }

    return res.render("../views/admin/students/settings/index", { currentStudent: currentStudent, familyContacts: familyContacts, assignedTutors: assignedTutors, lessonCategory: lessonCategory, studentEventData: studentEventData, userRole: userRole, tutors: tutors,ucwords: globalHelper.ucwords, sentFrom: sentFrom , toEmails: [] ,redirectUrl: req.originalUrl});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    await saveFamilyContact(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let result = await FamilyContacts.findById(req.body.id).populate('user_id');
    return res.status(200).json({ status: true, data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    const {
      title,
      first_name,
      last_name,
      company_name,
      contact_type,
      relationship,
      email,
      address,
      mobile_number_dial_code,
      mobile_number_iso_code,
      mobile_number,
      mobile_number_sms_capable,
      home_number_dial_code,
      home_number_iso_code,
      home_number,
      home_number_sms_capable,
      work_number_dial_code,
      work_number_iso_code,
      work_number,
      work_number_sms_capable,
      private_note,
      student_id,
      show_in_student_portal,
      preferred_invoice_recipient,
      email_lesson_reminders,
      sms_lesson_reminders,
      legal_parents,
      family_contact_id
    } = req.body;
    
    // Create user details
    const userDetails = { title, email, address, company_name, relationship, contact_type };
    if (contact_type === "person") {
      userDetails.first_name = first_name || " ";
      userDetails.last_name = last_name || " ";
      userDetails.company_name = "";
    }

    if (contact_type === "company") {
      userDetails.company_name = company_name || " ";
      userDetails.first_name = "";
      userDetails.last_name = "";
    }
    let familyContacts = await FamilyContacts.findById(family_contact_id).select("_id user_id student_id preferred_invoice_recipient legal_parents");
    const user_id = familyContacts.user_id;
    let userData = await User.findByIdAndUpdate(user_id, userDetails, { new: true });
    if (!userData) {
      throw new Error("Failed to create user details.");
    }

    // const forceLegal = legal_parents && legal_parents === "1" && req.body["force_update_legal_parents"] === "1";
    // let legal_parents_val = 0;
    // if (legal_parents === "1" && forceLegal) {
    //   // Unset legal_parents from all others for this student
    //   await FamilyContacts.updateMany(
    //     { student_id, student_id: { $ne: family_contact_id } },
    //     { $set: { legal_parents: false } }
    //   );
    //   legal_parents_val = 1;
    // }else{
    //   legal_parents_val = (legal_parents && legal_parents === "1");
    // }
    const forceInvoiceRecipient = preferred_invoice_recipient && preferred_invoice_recipient === "1" && req.body["force_update_invoice_recipient"] === "1";
    let preferred_invoice_recipient_val = 0;
    if (preferred_invoice_recipient === "1" && forceInvoiceRecipient) {
      // Unset legal_parents from all others for this student
      await FamilyContacts.updateMany(
        { student_id, student_id: { $ne: family_contact_id } },
        { $set: { preferred_invoice_recipient: false } }
      );
      preferred_invoice_recipient_val = 1;
    }else{
      preferred_invoice_recipient_val = (preferred_invoice_recipient && preferred_invoice_recipient === "1");
    }

    // Create family contact details
    let familyDetailsData = await FamilyContacts.findByIdAndUpdate(family_contact_id, {
      mobile_number: {
        dial_code: mobile_number_dial_code || null,
        iso_code: mobile_number_iso_code || null,
        phone: mobile_number || "",
        sms_capable: mobile_number_sms_capable === "1",
      },
      home_number: {
        dial_code: home_number_dial_code || null,
        iso_code: home_number_iso_code || null,
        phone: home_number || "",
        sms_capable: home_number_sms_capable === "1",
      },
      work_number: {
        dial_code: work_number_dial_code || null,
        iso_code: work_number_iso_code || null,
        phone: work_number || "",
        sms_capable: work_number_sms_capable === "1",
      },
      private_note,
      show_in_student_portal: show_in_student_portal == '1',
      preferred_invoice_recipient: preferred_invoice_recipient_val == '1',
      email_lesson_reminders: email_lesson_reminders == '1',
      sms_lesson_reminders: sms_lesson_reminders == '1',
      legal_parents: legal_parents == '1',
    },{ new: true });
    if (familyDetailsData) {
      let msg = "The family detail updated successfully.";
      req.flash("success", msg);
      return res.status(200).json({
        success: true,
        message: msg,
      });
    } else {
      req.flash("error", "The family detail updated successfully.");
      return res.status(201).json({
        success: false,
        message: "The family detail updated successfully.",
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
 * destroy tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    let id = req.params.id;
    let contactUpdates = { isDeleted: true, deleted_at: new Date() };

    let userData = await FamilyContacts.findById(id).select("_id user_id student_id preferred_invoice_recipient legal_parents");
    const deleteUserData = await User.findByIdAndUpdate(userData.user_id, contactUpdates);    
    if (!deleteUserData) {
      throw new Error("Failed to delete user.");
    }
    const deleteFamilyData = await FamilyContacts.findByIdAndUpdate(id, contactUpdates);
    if (deleteFamilyData) {
      // if the deleted contact was invoice recipient
      if (userData.preferred_invoice_recipient) {
        // find the first other contact of the same student_id which is not deleted
        const newInvoiceRecipient = await FamilyContacts.findOneAndUpdate(
          { student_id: userData.student_id, _id: { $ne: id }, isDeleted: { $ne: true } },
          { $set: { preferred_invoice_recipient: true } },
          { new: true, sort: { createdAt: 1 } } // pick the earliest contact
        );
      }
      if (userData.legal_parents) {
        // find the first other contact of the same student_id which is not deleted
        const newLegalParent = await FamilyContacts.findOneAndUpdate(
          { student_id: userData.student_id, _id: { $ne: id }, isDeleted: { $ne: true } },
          { $set: { legal_parents: true } },
          { new: true, sort: { createdAt: 1 } } // pick the earliest contact
        );
      }

      req.flash("success", "Family Contact is deleted successfully!");
      return res.status(200).json({
        success: true,
        message: "Family Contact is deleted successfully!",
        redirectUrl: 'page-reload',
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Family Contact not found or already deleted.",
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
 * store the private note.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function storePrivateNote(req, res) {
  try {
    const studentId = req.body.student_id;
    const note = req.body.note;
    const response = await User.findByIdAndUpdate(studentId, { note: note });
    if (response) {
      req.flash("success", "The Notes is update successfully.");
    } else {
      req.flash("error", "Sorry!, Note not added.");
    }
    res.redirect("back");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function checkFamilyContactForLegalGuardian(req, res) {
  try {
    const studentId = req.params.studentId;
    const objectId = mysqlOrm.Types.ObjectId(studentId); // Convert string to ObjectId

    const existingLegal = await FamilyContacts.findOne({
      student_id: objectId,
      legal_parents: true,
    });

    if (existingLegal) {
      res.json({ exists: true, contactId: existingLegal._id.toString() });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    res.status(500).send('Failed to check for legal contact');
  }
}

async function checkFamilyContactForInvoiceRecipient(req, res) {
  try {
    const studentId = req.params.studentId;
    const objectId = mysqlOrm.Types.ObjectId(studentId); // Convert string to ObjectId

    const existingLegal = await FamilyContacts.findOne({
      student_id: objectId,
      preferred_invoice_recipient: true,
      isDeleted:false,
    });

    if (existingLegal) {
      res.json({ exists: true, contactId: existingLegal._id.toString() });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    res.status(500).send('Failed to check for legal contact');
  }
}

async function assignTutor(req, res) {
  try {

    const {
      student_id,
      tutor_id,
      default_lesson_category,
      default_duration,
      price,
      billing_list
    } = req.body;

    const existing = await AssignedTutors.findOne({
      student_id,
      tutor_id,
      deleted_at: null
    });

    if (existing) {
      req.flash("error", "A tutor is already assigned to this student.");
      return res.status(402).json({ status: false,message: "A tutor is already assigned to this student." });
    }

    const response = await AssignedTutors.create({
      student_id,
      tutor_id,
      default_lesson_category,
      default_duration,
      price,
      default_billing: billing_list,
      deleted_at: null
    });

    if (response) {
      req.flash("success", "Tutor assigned successfully.");
      return res.status(200).json({ status: true,message: "Tutor assigned successfully", data: response });
    }
  } catch (err) {
    console.error("Assign Tutor Error:", err);
    res.status(500).send('Failed to assign tutor');
  }
};

async function getAssignedTutorsList(req, res) {
  try {
    const studentId = req.params.studentId;

    let allTutors = await globalHelper.fetchAllAssignTutorOfStudent(studentId);
    let assignedTutors = allTutors;
    let lessonCategory = GlobalConstants.lessonCategory;
    const lessonCategoryMapped = {};
    lessonCategory.forEach(item => {
      lessonCategoryMapped[item.key] = item.label;
    });
    const billingLabels = {
      no_calendar_generated_charges: "Don't automatically create any calendar-generated charges",
      lesson_based_payment: "Student pays based on the number of lessons taken",
      fixed_monthly_payment: "Student pays the same amount each month regardless of number of lessons",
      hourly_rate_payment: "Student pays an hourly rate"
    };

    res.render("../views/admin/students/settings/partials/assigned_tutors_list", {
      assignedTutors: assignedTutors,
      currentStudent: { _id: studentId },
      userRole: res.locals.loggedUserInfo.role,
      layout: false,
      lessonCategory: lessonCategoryMapped,
      billingLabels: billingLabels,
    });
  } catch (err) {
    res.status(500).send('Failed to fetch tutors');
  }
}

async function getAssignedTutor(req, res) {
  try {
    const result = await AssignedTutors.find()
      .where('student_id').equals(req.body.student_id)
      .where('tutor_id').equals(req.body.tutor_id);
    let duration = result?.duration ?? GlobalConstants.defaultTutorDuration;
     const billingLabels = {
      no_calendar_generated_charges: "Don't automatically create any calendar-generated charges",
      lesson_based_payment: "Student pays based on the number of lessons taken",
      fixed_monthly_payment: "Student pays the same amount each month regardless of number of lessons",
      hourly_rate_payment: "Student pays an hourly rate",
    };
      let data = result.map(t => ({
      ...t._doc,
      billing_label: billingLabels[t.default_billing] || t.default_billing,
    }));

    return res.status(200).json({ status: true, data: result, duration: duration });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function updateAssignedTutor(req, res) {
  try {
    const {
      assigned_tutor_id,
      student_id,
      tutor_id,
      default_lesson_category,
      default_duration,
      price,
      billing_list
    } = req.body;

    if (!mysqlOrm.Types.ObjectId.isValid(assigned_tutor_id)) {
      return res.status(400).json({ message: "Invalid assigned_tutor_id" });
    }

    const duplicate = await AssignedTutors.findOne({
      _id: { $ne: assigned_tutor_id },
      student_id,
      tutor_id,
      deleted_at: null
    });

    if (duplicate) {
      const msg = "This tutor is already assigned to this student.";
      req.flash("error", msg);
      return res.status(400).json({ status: false, message: msg });
    }

    const response = await AssignedTutors.findByIdAndUpdate(
      assigned_tutor_id,
      {
        $set: {
          student_id,
          tutor_id,
          default_lesson_category,
          default_duration,
          price,
          default_billing: billing_list,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    let msg = "";
    if (response) {
      msg = "The assigned tutor details updated successfully.";
      req.flash("success", msg);
    } else {
      msg = "Sorry! Assigned tutor not found.";
      req.flash("error", msg);
    }
    return res.status(200).json({ status: true, message: msg, data: response });
  } catch (error) {
    console.error("Update Assigned Tutor Error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * dropzone upload attachments.
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
 * dropzone remove an attachment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function dropzoneRemoveAttachment(req, res) {
  try {
    const filePath = `./assets/UserAttachments/${req.body.filename}`;
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
 * store private attachments data.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function storePrivateAttachments(req, res) {
  try {
    const userId = req.body.student_id; // "641b1670a489f7f878a95bf1";
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
async function editRelativeAttachmentNote(req, res) {
  try {
    let studentId = req.body.student_id;
    let attachmentId = req.body.attachment_id;
    let fetchUserData = await User.findById(studentId, { attachments: 1 });
    let existingAttachments = fetchUserData.attachments;
    const filteredObject = existingAttachments.find(obj => obj._id.toString() === attachmentId);
    return res.send(filteredObject);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update relative attachment's note.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateRelativeNote(req, res) {
  try {
    const userId = req.body.student_id;
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
    const userId = req.body.student_id;
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
      req.flash("success", "The attachment is deleted successfully.");
      return res.status(200).json({
        success: true,
        message: "The attachment is deleted successfully.",
      });
    } else {
      req.flash("error", "Sorry! Attachment not deleted.");
      return res.status(400).json({
        success: false,
        message: "Sorry! Attachment not deleted.",
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
 * create image object as collection field.
 * @param {*} req
 * @param {*} res
 * @returns
 */
function createImageObject(file) {
  try {
    const extension = file.originalname.split(".").pop();
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


/**
 * student's attendance dataTable.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function studentAttendanceNotesDataTable(req, res) {
  try {
    const { studentId } = req.body;
    const user_detail = res.locals.loggedUserInfo;
    const userRole = user_detail.role;
    const userId = user_detail._id;
    let searchStr = req.body.search.value || '';

    let obj = {};
    if (userRole === 2) {
      obj.tutor_id = mysqlOrm.Types.ObjectId(userId);
    }

    obj.attendees = { $elemMatch: { student_id: mysqlOrm.Types.ObjectId(studentId) } }

    let searchQuery = {};

    // Function to remove special characters from the search string
    const removeSpecialCharacters = (text) => {
      return text.replace(/[^a-zA-Z0-9\s]/g, ''); // Keep only alphanumeric characters and whitespace
    };

    searchStr = removeSpecialCharacters(searchStr).trim();

    if (searchStr) {
      // Create a regex pattern for the search string
      const regex = new RegExp(searchStr, "i"); // Case-insensitive regex

      // Search across multiple fields
      searchQuery = {
        $or: [
          // { 'event.duration': regex },      // Search by duration
          { 'tutor.full_name': regex },     // Search by tutor name
          { 'attendees.status': regex }      // Search by attendance status
        ]
      };
    }

    const filter = ['first_name', 'category_name', 'duration', "attendance"];

    var recordsTotal = 0;
    var recordsFiltered = 0;
    recordsTotal = await EventAttendance.count({ $and: [obj, searchQuery] });
    recordsFiltered = await EventAttendance.count({ $and: [obj, searchQuery] });

    let eventAttendance = await EventAttendance.aggregate([
      // Match documents based on provided criteria
      { $match: { $and: [obj] } },

      // Unwind the attendees array to filter individual documents
      { $unwind: '$attendees' },

      // Match documents where student_id matches the specific ID
      { $match: { 'attendees.student_id': mysqlOrm.Types.ObjectId(studentId) } },

      // Filter to include only documents where status is 'present' or 'absent'
      { $match: { 'attendees.status': { $in: ['present', 'absent'] } } },

      // Lookup to join with events collection
      {
        $lookup: {
          from: 'events',
          localField: 'event_id',
          foreignField: '_id',
          as: 'event'
        }
      },

      // Unwind the event array to deconstruct the array into individual documents
      { $unwind: '$event' },

      // Lookup to join with event_categories collection
      {
        $lookup: {
          from: 'event_categories',
          localField: 'event.event_category_id',
          foreignField: '_id',
          as: 'event_category'
        }
      },

      // Add event_category data into the event object under event_category_id
      {
        $addFields: {
          'event.event_category_id': { $arrayElemAt: ['$event_category', 0] }
        }
      },

      // Remove the temporary event_category field
      { $unset: 'event_category' },

      // Rename the event field to event_id
      {
        $addFields: {
          event_id: '$event'
        }
      },

      // Remove the old event field
      { $unset: 'event' },

      // Lookup to join with users collection for tutors
      {
        $lookup: {
          from: 'users',
          localField: 'tutor_id',
          foreignField: '_id',
          as: 'tutor'
        }
      },

      // Unwind the tutor array
      { $unwind: '$tutor' },

      // Add the tutor's full name field to the documents
      {
        $addFields: {
          'tutor.full_name': {
            $concat: ['$tutor.first_name', ' ', '$tutor.last_name']
          }
        }
      },

      // Add search query to filter by tutor name, duration, or attendance status
      { $match: searchQuery },

      // Group back to reconstruct the document structure
      {
        $group: {
          _id: '$_id',
          event_id: { $first: '$event_id' },
          tutor_id: { $first: '$tutor_id' },
          attendees: { $push: '$attendees' },
          group_note_id: { $first: '$group_note_id' },
          tutor: { $first: '$tutor' },
          isDeleted: { $first: '$isDeleted' },
          created_at: { $first: '$created_at' },
          updated_at: { $first: '$updated_at' }
        }
      },

      // Pagination
      { $skip: Number(req.body.start) },
      { $limit: Number(req.body.length) },

      // Sorting (Optional)
      { $sort: { 'event_id.start_time': -1 } },
    ]);

    // Log the result for debugging
    const data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: eventAttendance.length > 0 ? recordsFiltered : 0,
      recordsTotal: recordsTotal,
      data: eventAttendance,
    });
    return res.send(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
* studentNoteAndAttachments
* @param {*} req
* @param {*} res
* @returns
*/
async function studentNoteAndAttachments(req, res) {
  try {
    let { groupNoteId } = req.body
    let studentNotes = await EventGroupNote.findById(groupNoteId);
    let html = `<div class="row">`;
    if (studentNotes.tutor_note !== '') {
      html += `<div class="col-md-12"><div class="form-group  st-note-indata"><label class="mb-1">Tutor Notes</label><p class="mb-0">${studentNotes.tutor_note}</p></div></div>`;
    }
    if (studentNotes.student_note !== '') {
      html += `<div class="col-md-12"><div class="form-group  st-note-indata"><label class="mb-1">Student Notes</label><p class="mb-0">${studentNotes.student_note}</p></div></div>`;
    }
    if (studentNotes.parent_note !== '') {
      html += `<div class="col-md-12"><div class="form-group  st-note-indata"><label class="mb-1">Parent Notes</label><p class="mb-0">${studentNotes.parent_note}</p></div></div>`;
    }

    html += `<div class="col-md-12"><div class="form-group"> <label class="mb-1">Linked Resources</label>`;

    for (let attachments of studentNotes.attachments) {
      html += `<ul class="linked_resource"><li><div class="linked_resource_top"><h6>${attachments.name}</h6></div><div class="linked_resource_bottom"><ul class="notes-file-size pb-2"><li><img src="/images/files.svg" alt="files" class="img-fluid"> <span>${attachments.extension}</span></li><li>${attachments.name}</li></ul><a href="/EventAttachments/${attachments.name}" download class="note_download"><img src="/images/download-orange.svg" alt="" class="mr-2">Download</a></div></li></ul>`;
    }
    html += `</div></div>`;

    return res.send(html);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function studentMessageHistory(req, res) {
  const userDetail = res.locals.loggedUserInfo;
  const studentId = userDetail._id;
  
  res.render("../views/admin/students/studentMessageHistory/index", {
    studentId,
    userRole: res.locals.loggedUserInfo?.role,
    loggedUserDetails: res.locals.loggedUserInfo
  });
}

async function generatePdfBuffer(txnId, userDetail) {
  try {
    const currency = GlobalConstants.currency?.symbol || "â‚¹";
    
    // Load business settings
    const businessSettings = await globalHelper.getBusinessSettingValue();
    let invoiceSettings = {};
    if (businessSettings.invoice_formatting) {
      invoiceSettings = businessSettings?.invoice_formatting[0];
    }
    
    const logoPath = path.resolve(__dirname, "../../assets/images/logo.svg");
    const logoData = fs.readFileSync(logoPath, "utf8");
    const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

    // Load invoice
    const invoiceData = await Invoices.findById(txnId)
      .populate("student_id", "first_name last_name address ndis_number")
      .lean();

    if (!invoiceData) {
      return null;
    }

    const templatePath = path.resolve(
      __dirname,
      "../../views/admin/familyAndInvoices/invoices/invoicePdf/invoice_pdf.ejs"
    );

    const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

    let totalCharges = 0;
    let totalPayments = 0;
    const taxSummary = {};

    // Build transaction rows
    function buildTransactionRows(transactions, displayType = "itemized") {
      const rows = [];

      if (!transactions || transactions.length === 0) {
        return `
          <tr>
            <td colspan="4" style="padding:10px; text-align:center;">
              There are no billable lessons, events, or charges in the invoice period
            </td>
          </tr>
          <hr>`;
      }

      (transactions || []).forEach((txn) => {
        let chargeCell = "";
        let paymentCell = "";

        if (txn.type === "Charge") {
          chargeCell = `${currency}${txn.amount.toFixed(2)}`;
          totalCharges += txn.amount;

          // collect taxes
          (txn.charge_taxes || []).forEach((tax) => {
            const taxAmount = (txn.amount * tax.tax_rate) / 100;

            if (!taxSummary[tax.tax_name]) {
              taxSummary[tax.tax_name] = { rate: tax.tax_rate, amount: 0 };
            }

            taxSummary[tax.tax_name].amount += taxAmount;
          });

        } else if (txn.type === "Discount") {
          chargeCell = `-${currency}${txn.amount.toFixed(2)}`;
          totalCharges -= txn.amount;
        } else if (txn.type === "Payment") {
          paymentCell = `${currency}${txn.amount.toFixed(2)}`;
          totalPayments += txn.amount;
        } else if (txn.type === "Refund") {
          paymentCell = `-${currency}${txn.amount.toFixed(2)}`;
          totalPayments -= txn.amount;
        }

        rows.push(`
          <tr>
            <td style="padding:10px; border-bottom:1px solid #888;">${formatDate(txn.date)}</td>
            <td style="padding:10px; border-bottom:1px solid #888;">${txn.note || txn.type}</td>
            <td style="padding:10px; border-bottom:1px solid #888; text-align:right;">${chargeCell}</td>
            <td style="padding:10px; border-bottom:1px solid #888; text-align:right;">${paymentCell}</td>
          </tr>
        `);
      });

      // Add tax rows if enabled
      if (invoiceSettings?.options?.includes("3") && Object.keys(taxSummary).length > 0) {
        rows.push(`
          <tr>
            <td style="padding:3px;"></td>
            <td style="padding:3px; font-weight:bold;">
              Taxes (Included in Total)
            </td>
            <td style="padding:3px;"></td>
            <td style="padding:3px;"></td>
          </tr>
        `);

        Object.entries(taxSummary).forEach(([taxName, { rate, amount }]) => {
          rows.push(`
            <tr>
              <td style="padding:3px;border-bottom:1px solid #888;"></td>
              <td style="padding:3px;border-bottom:1px solid #888;">
                ${taxName} - (${rate}%)
              </td>
              <td style="padding:3px;border-bottom:1px solid #888; text-align:right;">
                ${currency}${amount.toFixed(2)}
              </td>
              <td style="padding:3px;border-bottom:1px solid #888;"></td>
            </tr>
          `);
        });
      }

      return rows.join("");
    }

    const transactionRows = buildTransactionRows(invoiceData.transactions, invoiceData.displayType || "itemized");
    const balance = totalCharges - totalPayments;
    const previousBalance = invoiceData?.previous_balance || 0;
    // Render EJS template
    const html = await ejs.renderFile(templatePath, {
      invoiceDate: formatDate(invoiceData.date),
      invoiceData,
      dueDate: formatDate(invoiceData.due_date),
      invoiceNumber: invoiceData.invoice_number || "",
      studentAddress: invoiceData.student_id?.address || "",
      studentName: invoiceData.student_id
        ? `${invoiceData.student_id?.first_name || ""} ${invoiceData.student_id?.last_name || ""}`.trim()
        : "Unknown",
      ndisNumber: invoiceData.student_id?.ndis_number || "",
      invoiceAmount: `${currency}${invoiceData.invoice_amount?.toFixed(2) || "0.00"}`,
      txnId,
      absoluteLogoPath: logoBase64,
      transactionRows,
      chargesTotal: `${currency}${totalCharges.toFixed(2)}`,
      paymentsTotal: `${currency}${totalPayments.toFixed(2)}`,
      invoiceFooterTxt: invoiceSettings?.invoice_footer_text || (invoiceData.footer_note),
      balance: `${currency}${balance.toFixed(2)}`,
      previousBalance: `${currency}${previousBalance.toFixed(2)}`,
      userDetail,
    });

    // Generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "40px", bottom: "60px" }
    });

    await browser.close();
    return pdfBuffer;
  } catch (err) {
    console.error("Error in generatePdfBuffer:", err);
    return null;
  }
}


async function generatePdf(req, res) {
  try {
    const userDetail = res.locals.loggedUserInfo;

    const txnId = req.params.invoiceId;
    const businessSettings = await globalHelper.getBusinessSettingValue();     
    let invoiceSettings = {};    
    if(businessSettings.invoice_formatting){
      invoiceSettings = businessSettings.invoice_formatting[0];
    }
    const fileNamePrefix = invoiceSettings?.invoice_name || "invoice";

    const pdfBuffer = await generatePdfBuffer(txnId, userDetail);

    const isDownload = req.query.download === "true";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename=${fileNamePrefix}-${txnId}.pdf`
    );
    res.end(pdfBuffer);
  } catch (err) {
    console.error("Error generating invoice PDF:", err);
    res.status(500).send("Internal server error");
  }
}

async function downloadTransactionReceipt(req, res) {
  try {
    const id = req.params.txnId;

    const transaction = await Transaction.findById(id)
      .populate("student_id", "first_name last_name")
      .lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const pdfBuffer = await generateReceipt(transaction);

    const formattedDate = new Date().toISOString().split("T")[0];
    const studentName = (transaction?.student_id?.first_name || "student")
      .replace(/[^a-z0-9]/gi, "_");

    const fileName = `receipt_${studentName}_${formattedDate}.pdf`;

    res.setHeader("Content-Type", "application/pdf");

    if (req.query.download === "true") {
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    }

    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (error) {
    console.error("downloadReceipt error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}


async function studentMessageHistoryTable(req, res) {
  try {
    const { studentId, start = 0, length = 10, draw, months,search, order, columns } = req.body;

    const objectId = mysqlOrm.Types.ObjectId(studentId);

    const query = { student_id: objectId };

    if (months) {
      const monthsInt = parseInt(months);
      if (!isNaN(monthsInt) && monthsInt > 0) {
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - monthsInt);
        query.created_at = { $gte: fromDate }; 
      }
    }

     if (req.body.by_type && req.body.by_type !== "all") {
      const type = req.body.by_type.trim();
      query.type = new RegExp(`^${type}$`, "i");
    }

    const searchValue = req.body.category_search || (search && search.value);
    if (searchValue) {
      const regex = new RegExp(searchValue, "i");
      if (req.body.message_body) { 
        query.$or = [
          { subject: regex },
          { "receiver.email": regex },
          { "sender.email": regex },
          { messageBody: regex } 
        ];
      } else {
        query.$or = [
          { subject: regex },
          { "receiver.email": regex },
          { "sender.email": regex }
        ];
      }
    }

    let sort = { created_at: -1 }; 
    if (order && order.length > 0) {
      const colIdx = order[0].column;
      const dir = order[0].dir === "asc" ? 1 : -1;
      const colName = columns[colIdx].data;

      if (colName === "created_at" || colName === "sentAt" || colName === "sender" || colName === "receiver") {
        sort = { created_at: dir };
      } else if (["subject", "type", "status"].includes(colName)) {
        sort = { [colName]: dir };
      }
    }

    const total = await Notification.countDocuments({ student_id: objectId });

    const filteredCount = await Notification.countDocuments(query);

    const messages = await Notification.find(query)
      .sort(sort)
      .skip(parseInt(start))
      .limit(parseInt(length));

    if (messages.length === 0) {
      return res.json({
        success: false,
        draw: parseInt(draw),
        recordsTotal: total,
        recordsFiltered: filteredCount,
        data: [],
        message: "No messages found for this filter"
      });
    }

    const data = messages.map((item) => {
      return {
        id: item._id,
        type: item.type,
        subject: item.subject,
        messageBody: item.messageBody,
        receiver: item.receiver || null,
        meta: item.meta || null,
        sender: item.sender || null,
        status: item.status,
        sentAt: item.sentAt
          ? moment(item.sentAt).format("DD-MM-YYYY H:mm A")
          : "-",
        created_at: moment(item.created_at).format("DD-MM-YYYY H:mm A")
      };
    });

    res.json({
      success: true,
      draw: parseInt(draw),
      recordsTotal: total,
      recordsFiltered: filteredCount,
      data: data
    });

  } catch (err) {
    console.error("studentMessageHistoryTable error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}


async function messageHistory(req, res) {
  try {
    const { studentId, start, length, draw, search, order, columns, months } = req.body;
    const objectId = mysqlOrm.Types.ObjectId(studentId);

    let query = { student_id: objectId };

    if (months && months !== "all") {
      const monthsInt = parseInt(months);
      if (!isNaN(monthsInt)) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - monthsInt);
        query.created_at = { $gte: cutoff };
      }
    }

    if (req.body.by_type && req.body.by_type !== "all") {
      const type = req.body.by_type.trim();
      query.type = new RegExp(`^${type}$`, "i");
    }

    const searchValue = req.body.category_search || (search && search.value);
    if (searchValue) {
      const regex = new RegExp(searchValue, "i");
      if (req.body.message_body) { 
        query.$or = [
          { subject: regex },
          { "receiver.email": regex },
          { "sender.email": regex },
          { messageBody: regex } 
        ];
      } else {
        query.$or = [
          { subject: regex },
          { "receiver.email": regex },
          { "sender.email": regex }
        ];
      }
    }

    let sort = { created_at: -1 }; 
    if (order && order.length > 0) {
      const colIdx = order[0].column;
      const dir = order[0].dir === "asc" ? 1 : -1;
      const colName = columns[colIdx].data;

      if (colName === "sentAt") {
        sort = { created_at: dir };
      } else if (["subject", "type", "status"].includes(colName)) {
        sort = { [colName]: dir };
      }
    }

    const total = await Notification.countDocuments({ student_id: objectId });
    const recordsFiltered = await Notification.countDocuments(query);

    const messages = await Notification.find(query)
      .populate("student_id", "role")
      .sort(sort)
      .skip(parseInt(start) || 0)
      .limit(parseInt(length) || 10);

    if (!messages.length) {
      return res.json({
        success: false,
        draw: parseInt(draw),
        recordsTotal: total,
        recordsFiltered,
        data: [],
        message: "No messages found"
      });
    }

    res.json({
      success: true,
      draw: parseInt(draw),
      recordsTotal: total,
      recordsFiltered,
      data: messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}


async function getMessageHistoryData(req, res) {
  try {
    const { messageId, userId, type, sendTo, familyId } = req.body;
    const loggedInUser = req.user;

    // ---------- Forward existing message ----------
    if (type === "forward" && messageId) {
      const message = await Notification.findById(messageId).lean();
      if (!message) {
        return res.json({ success: false, message: "Message not found" });
      }

      // rolesToGet can be customized if needed
      const users = await User.find(
        { role: { $in: [2, 3] } },
        { first_name: 1, last_name: 1, company_name: 1, email: 1 }
      ).lean();

      const emailList = users
        .filter(u => u.email)
        .map(u => ({
          label:
            `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
            u.company_name ||
            "User",
          value: u.email
        }));

      return res.json({
        success: true,
        data: {
          _id: message._id,
          subject: message.subject,
          messageBody: message.messageBody,
          transactionId: message.meta?.transactionId,
          invoiceId: message.meta?.invoiceId,
          toEmails: emailList
        }
      });
    }

    // ---------- Create new message ----------
    if (type === "new-msg" && userId) {
      const student = await User.findById(userId, {
        first_name: 1,
        last_name: 1,
        email: 1
      }).lean();

      if (!student) {
        return res.json({ success: false, message: "Student not found" });
      }

      let toEmails = [];

      if (sendTo === "student") {
        // student + logged-in user
        if (student.email) {
          toEmails.push({
            label:
              `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
              "Student",
            value: student.email,
            type: 'student',
          });
        }

        if (loggedInUser?.email) {
          toEmails.push({
            label:
              `${loggedInUser.first_name || ""} ${loggedInUser.last_name || ""}`.trim() ||
              "Me",
            value: loggedInUser.email,
            type: 'me',
          });
        }
      }

      else if (sendTo === "family" && familyId) {
        const familyContact = await FamilyContacts.findOne(
          { student_id: userId, user_id: familyId },
          { user_id: 1 }
        )
          .populate(
            "user_id",
            "first_name last_name company_name email"
          )
          .lean();

        if (familyContact?.user_id?.email) {
          toEmails.push({
            label:
              `${familyContact.user_id.first_name || ""} ${familyContact.user_id.last_name || ""}`.trim() ||
              familyContact.user_id.company_name ||
              "Contact",
            value: familyContact.user_id.email,
            type: 'family',
          });
        }
      }

      else if (sendTo === "all") {
        // student
        if (student.email) {
          toEmails.push({
            label:
              `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
              "Student",
            value: student.email,
            type: 'student',
          });
        }

        // all family contacts
        const familyContacts = await FamilyContacts.find(
          { student_id: userId },
          { user_id: 1 }
        )
          .populate(
            "user_id",
            "first_name last_name company_name email"
          )
          .lean();

        familyContacts.forEach(fc => {
          if (fc.user_id?.email) {
            toEmails.push({
              label:
                `${fc.user_id.first_name || ""} ${fc.user_id.last_name || ""}`.trim() ||
                fc.user_id.company_name ||
                "Contact",
              value: fc.user_id.email,
              type: 'family',
            });
          }
        });

        // logged-in user
        if (loggedInUser?.email) {
          toEmails.push({
            label:
              `${loggedInUser.first_name || ""} ${loggedInUser.last_name || ""}`.trim() ||
              "Me",
            value: loggedInUser.email,
            type: 'me',
          });
        }
      }

      // Deduplicate by email
      const uniqueEmails = [];
      const seen = new Set();
      for (const e of toEmails) {
        if (e.value && !seen.has(e.value)) {
          seen.add(e.value);
          uniqueEmails.push(e);
        }
      }

      return res.json({
        success: true,
        data: {
          _id: null,
          subject: "",
          messageBody: "",
          toEmails: uniqueEmails,
          sendTo: sendTo,
        }
      });
    }

    return res.json({ success: false, message: "Invalid request" });
  } catch (err) {
    console.error("get-data error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}



async function forwardMessage(req, res) {
  try {
    const { messageId, from_mail, to_mail, subject, message, cc_email , transactionId, invoiceId} = req.body;
    const userDetail = res.locals.loggedUserInfo;
    const userName = `${userDetail.first_name} ${userDetail.last_name}`;
     let transaction = null;
    if (transactionId) {
      transaction = await Transaction.findById(transactionId)
        .populate('student_id')     
        .populate('created_by')   
        .populate('amount');    
    }
    let invoice = null;
    if(invoiceId) {
      invoice = await Invoices.findById(invoiceId)
        .populate('student_id')     
        .populate('created_by')   
    }
 
    const studentId = transaction ? transaction?.student_id : invoice ? invoice?.student_id : '';
   
    const pdfBuffer = transaction ? await generateReceipt(transaction) : null;
   
    const bodyData = `
      <p><b>${messageId ? "Forwarded message:" : "New Message:"}</b></p>
      <p><b>Subject:</b> ${subject}</p>
      <p>${message}</p>
    `;
 
     const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `Transaction-${transactionId}.pdf`,
        content: pdfBuffer,
      });
    }
    const mailOptions = {
      from: from_mail,
      to: Array.isArray(to_mail) ? to_mail : [to_mail],
      cc: cc_email ? userDetail.email : undefined,
      subject: subject,
      html: bodyData,
      attachments: attachments,
    };

    // const transporter = await mail.getTransporter();
    const info =  mail.transporter.sendMail(mailOptions);

    const senderUser = await User.findOne({ email: from_mail });
    const senderName = senderUser 
     ? `${senderUser.first_name} ${senderUser.last_name}` 
    : userName; 

   const receiverUser = await User.findOne({ email: to_mail });
   const receiverName = receiverUser 
   ? `${receiverUser.first_name} ${receiverUser.last_name}` 
   : to_mail; 
   const receiverId = receiverUser 
   ? `${receiverUser._id}` 
   : to_mail; 

    // Create notification
    await createNotification({
      student_id: studentId ? studentId : receiverId,
      type: "Email",
      subject,
      messageBody: bodyData,
      slug: req.body?.transactionId ? "payment" : req.body?.invoiceId ? "invoice" : "email",
      receiver: { 
        email: Array.isArray(to_mail) ? to_mail[0] : to_mail, 
        name: receiverName
      },
      sender: { 
        email: from_mail, 
        name: senderName 
      },
      status: info ? "sent" : "unsent",
      meta: { forwardedFrom: messageId },
      sentAt: new Date(),
    });


    return res.status(200).json({ success: true, message: "Message forwarded." });
  } catch (err) {
    console.error("Error forwarding message:", err);
    return res.status(500).json({ success: false, message: "Failed to forward message." });
  }
}


/**
 * save a family contact of student.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function saveFamilyContact(req, res) {
  try {
    const {
      student_id,
      title,
      first_name,
      last_name,
      company_name,
      contact_type,
      relationship,
      email,
      address,
      mobile_number_dial_code,
      mobile_number_iso_code,
      mobile_number,
      mobile_number_sms_capable,
      home_number_dial_code,
      home_number_iso_code,
      home_number,
      home_number_sms_capable,
      work_number_dial_code,
      work_number_iso_code,
      work_number,
      work_number_sms_capable,
      private_note,
      show_in_student_portal,
      preferred_invoice_recipient,
      email_lesson_reminders,
      sms_lesson_reminders,
      legal_parents,
    } = req.body;

    // Create user details
    const userDetails = { title, email, address, company_name, relationship ,contact_type};
    if (contact_type === "person") {
      userDetails.first_name = first_name || " ";
      userDetails.last_name = last_name || " ";
      userDetails.company_name = ""; 
    }

    if (contact_type === "company") {
      userDetails.company_name = company_name || " ";
      userDetails.first_name = "";
      userDetails.last_name = "";
    }
    let userData = await User.create(userDetails);
    if (!userData) {
      throw new Error("Failed to create user details.");
    }

    // const forceLegal = legal_parents && legal_parents === "1" && req.body["force_update_legal_parents"] === "1";
    // let legal_parents_val = 0;
    // if (legal_parents === "1" && forceLegal) {
    //   // Unset legal_parents from all others for this student
    //   await FamilyContacts.updateMany(
    //     { student_id: student_id },
    //     { $set: { legal_parents: false } }
    //   );
    //   legal_parents_val = 1;
    // }else{
    //   legal_parents_val = (legal_parents && legal_parents === "1");
    // }

    const forceInvoiceRecipient = preferred_invoice_recipient && preferred_invoice_recipient === "1" && req.body["force_update_invoice_recipient"] === "1";
  
    let preferred_invoice_recipient_val = 0;
    if (preferred_invoice_recipient === "1" && forceInvoiceRecipient) {
      // Unset legal_parents from all others for this student
      await FamilyContacts.updateMany(
        { student_id: student_id },
        { $set: { preferred_invoice_recipient: false } }
      );
      preferred_invoice_recipient_val = 1;
    }else{
      preferred_invoice_recipient_val = (preferred_invoice_recipient && preferred_invoice_recipient === "1");
    }

    // Create family contact details
    let familyDetailsData = await FamilyContacts.create({
      student_id: student_id, // Adding student_id
      user_id: userData.id, // Adding user_id
      mobile_number: {
        dial_code: mobile_number_dial_code || null,
        iso_code: mobile_number_iso_code || null,
        phone: mobile_number || "",
        sms_capable: mobile_number_sms_capable === "1",
      },
      home_number: {
        dial_code: home_number_dial_code || null,
        iso_code: home_number_iso_code || null,
        phone: home_number || "",
        sms_capable: home_number_sms_capable === "1",
      },
      work_number: {
        dial_code: work_number_dial_code || null,
        iso_code: work_number_iso_code || null,
        phone: work_number || "",
        sms_capable: work_number_sms_capable === "1",
      },
      private_note,
      show_in_student_portal: show_in_student_portal == '1',
      preferred_invoice_recipient: preferred_invoice_recipient == '1',
      email_lesson_reminders: email_lesson_reminders == '1',
      sms_lesson_reminders: sms_lesson_reminders == '1',
      legal_parents: legal_parents == '1',
    });
    
    if (familyDetailsData) {
      req.flash("success", "Family contact details added successfully.");
      return res.status(201).json({
        success: true,
        message: "Family contact details added successfully.",
      });
    } else {
      throw new Error("Failed to add family contact details.");
    }
  } catch (error) {
    console.error("Error saving family contact:", error.message || error);
    req.flash("error", "Something went wrong, please try again later.");
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

