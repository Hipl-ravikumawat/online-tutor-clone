
const mysqlOrm = require('mysql-orm');
const Event = require("../../models/Event");
const EventAttendance = require('../../models/EventAttendance');
const EventTemplate = require("../../models/EventTemplate");
const EventGroupNote = require('../../models/EventGroupNote');
const AssignedTutors = require('../../models/AssignedTutors');
const slugify = require('slugify')
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const globalHelper = require("../../_helper/GlobalHelper");
const globalConstants = require("../../_helper/GlobalConstants");
const BusinessSetting = require("../../models/BusinessSetting");
const ChargeCategory = require("../../models/ChargeCategory");
const { saveTransaction, deleteTransaction } = require("../../services/TransactionService");
const { saveTransaction: saveStaffTransaction, deleteTransaction: deleteStaffTransaction } = require("../../services/StaffTransactionService");

global.ReadableStream = require('web-streams-polyfill').ReadableStream;

const slugify_options = {
  replacement: "-", // replace spaces with replacement character, defaults to `-`
  remove: undefined, // remove characters that match regex, defaults to `undefined`
  lower: true, // convert to lower case, defaults to `false`
  strict: false, // strip special characters except replacement, defaults to `false`
  locale: "en", // language code of the locale to use
  trim: true, // trim leading and trailing replacement chars, defaults to `true`
};

module.exports = {
  index,
  takeAttendancePage,
  markAttendance,
  noteTemplate,
  storeNoteTemplate,
  editNoteTemplate,
  renderSharedTemplate,
  destroyNoteTemplate,
  destroyNoteAttachment,
  attendanceDetails,
  editNoteAndAttachment,
  storeEventGroupNoteAndAttachments,
  updateEventNoteAccordingToPreference,
  studentNotesListing,
  studentNotesAttachments,
  createReport
}

/**
 * attendance and notes. 
 * @param {*} req
 * @param {*} res
 */
async function index(req, res) {
  try {
    const { _id: studentId } = res.locals.loggedUserInfo;
    const [eventData, attendanceData] = await Promise.all([
      Event.find({ student_ids: mysqlOrm.Types.ObjectId(studentId) }),
      EventAttendance.find({ 'attendees.student_id': studentId }, { 'attendees.$': 1 })
    ]);
    let presentCount = 0;
    let absentCount = 0;
    let unrecorded = 0;
    let percentage = 0;
    const eventCount = eventData.length;

    const attendees = attendanceData.length > 0 ? attendanceData[0].attendees : [];

    if (attendanceData.length > 0) {
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

    const studentEventData = {
      totalEvent: eventCount,
      present: presentCount,
      absent: absentCount,
      unrecorded: unrecorded,
      percentage: percentage
    };

    return res.render("../views/admin/attendanceAndNotes/index", {
      loggedUser: res.locals.loggedUserInfo,
      studentEventData: studentEventData
    });
  } catch (error) {
    console.error('index: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 *  take attendance page.
 * @param {*} req
 * @param {*} res
 */
async function takeAttendancePage(req, res) {
  try {
    const { eventId } = req.params;
    let markedAttendance = [];
    const fetchedEvent = await Event.findById(eventId, { id: 1, student_ids: 1, event_category_id: 1, event_location_id: 1, start_date: 1, start_time: 1, duration: 1, end_time: 1, status: 1, event_attendance_id: 1, student_pricing_option: 1, per_std_lesson_price: 1, is_substitute_tutor: 1, tutor_id: 1, substitute_tutor_id: 1 })
    .populate({
      path: "student_ids",
      model: "users",
      select: { _id: 1, first_name: 1, last_name: 1, email: 1 },
    })
      .populate({
        path: "event_category_id",
        model: "event_categories",
        select: { _id: 1, name: 1 },
      })
      .populate({
        path: "event_location_id",
        model: "event_locations",
        select: { _id: 1, name: 1 },
      })
      .populate({
        path: "event_attendance_id",
        model: "event_attendances",
        select: { _id: 1, group_note_id: 1 },
        populate: {
          path: "group_note_id",
          model: "event_group_notes_and_attachments",
          select: { _id: 1, attachments: 1, student_note: 1, tutor_note: 1, parent_note: 1 }
        }
      })
      .sort({ _id: -1 });

    let assignTutorId = fetchedEvent.is_substitute_tutor ? fetchedEvent.substitute_tutor_id : fetchedEvent.tutor_id;
    const studentIdsArray = fetchedEvent.student_ids.map(s => s._id);
    const records = await AssignedTutors.find({ tutor_id: assignTutorId, student_id: { $in: studentIdsArray } });
    const currency = globalConstants.currency;

    const assignedTutorResult = records.map(item => {
      const durationMinutes = Number(fetchedEvent?.duration);
      const hourlyPrice = item.price || 0;
      const calculatedPrice = (durationMinutes / 60) * hourlyPrice;

      return {
        price: calculatedPrice,
        student_id: item.student_id.toString()
      };
    });

    let eventNoteTemplates = await EventTemplate.find({ isDeleted: false }, { name: 1, description: 1 });

    if (fetchedEvent.event_attendance_id != null) {
      markedAttendance = await EventAttendance.findById(fetchedEvent.event_attendance_id);
    }
    const businessSettingData = await BusinessSetting.find({}, { family_contact_settings: 1 }).limit(1);
    const payments = businessSettingData[0]?.family_contact_settings[0]?.payment_methods || [];
    const familyContacts = await globalHelper.getFamiliesListForFamiliesInvoices(fetchedEvent.student_ids);

    // merge attachedStudents (fetchedEvent.student_ids) with familyContacts
    const attachedStudents = fetchedEvent.student_ids.map(student => {
      // find matching family contact for this student
      const matchingFamily = familyContacts.find(fc => 
        fc._id.toString() === student._id.toString()
      );

      // student email (if exists)
      const studentEmailObj = student.email
        ? [{
            name: `${student.first_name} ${student.last_name}`,
            email: student.email
          }]
        : [];

      // family contacts emails (if exist)
      const contactEmails = (matchingFamily?.contacts || []).map(contact => ({
        name: contact.company_name ? contact.company_name : `${contact.first_name} ${contact.last_name}`,
        email: contact.email
      }));
      return {
        ...student.toObject(),   // student details from event
        familyContacts: matchingFamily ? matchingFamily.contacts : [], // attach contacts
        student_email: matchingFamily?.student_email || null,
        allEmails: [...studentEmailObj, ...contactEmails]
      };
    });
    
    return res.render("../views/admin/attendanceAndNotes/take-attendance", {
      fetchedEvent: fetchedEvent,
      templates: eventNoteTemplates,
      markedAttendance: markedAttendance.attendees === undefined ? [] : markedAttendance.attendees,
      attachStudentsLength: fetchedEvent.student_ids.length,
      attachStudents: attachedStudents,
      moment: res.locals.moment,
      assignedTutorResult: assignedTutorResult,
      payments: payments,
      // emails: emails,
      familyContacts,
      currency,
    });
  } catch (error) {
    console.error('takeAttendancePage: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store Attendance.
 * @param {*} req
 * @param {*} res
 */
// async function markAttendance(req, res) {
//   try {
//     const { loggedUserInfo } = res.locals;
//     const { _id: userId } = loggedUserInfo;

//     const { event_id, attendance_status, student_ids: studentIdsJSON, std_was_late } = req.body;
//     // console.log(req.body,"event id"); return false;

//     const selectedStudentIds = studentIdsJSON;
//     const now = new Date();
//     const formattedDateTime = now.toISOString();

//     let normalizedStatus = Array.isArray(attendance_status)
//       ? attendance_status.find(s => s && s.trim() !== "") || "unrecorded"
//       : attendance_status || "unrecorded";

//     const fetchedEvent = await Event.findById(event_id).select('student_ids tutor_id is_substitute_tutor substitute_tutor_id event_attendance_id');
//     if (!fetchedEvent) {
//       return res.status(404).json({ message: "Event not found." });
//     }

//     let eventAttendees = [];
//     let recordStatus = false;
//     console.log(fetchedEvent.event_attendance_id,"ssssssss");
//     if (fetchedEvent.event_attendance_id != null) {
//       const recordedEventAttendance = await EventAttendance.findById(fetchedEvent.event_attendance_id);
//       if (!recordedEventAttendance) {
//         return res.status(404).json({ message: "Attendance record not found." });
//       } 
//       console.log("case 1");
//       const selectedStudentIdSet = new Set(selectedStudentIds);
//       eventAttendees = recordedEventAttendance.attendees.map(attendee => {
//         if (selectedStudentIdSet.has(attendee.student_id.toString())) {
//           return {
//             ...attendee.toObject(),
//             status: normalizedStatus,
//             std_was_late: normalizedStatus === "present" && req.body.std_was_late ? true : false,
//             marked_attendance_at: formattedDateTime,
//           };
//         }
//         return attendee;
//       });
      
//       console.log("case 2");

//       const updateResult = await EventAttendance.findByIdAndUpdate(
//         fetchedEvent.event_attendance_id,
//         { attendees: eventAttendees },
//         { new: true, useFindAndModify: false }
//       );
//       console.log("case 3");

//       recordStatus = true;
//     } else {
//       console.log("case 4");

//       eventAttendees = fetchedEvent.student_ids.map(studentId => ({
//         student_id: studentId,
//         status: selectedStudentIds.includes(studentId.toString()) ? normalizedStatus  : 'unrecorded',
//         std_was_late: selectedStudentIds.includes(studentId.toString()) && normalizedStatus  === "present" && std_was_late ? true : false,
//         marked_attendance_at: selectedStudentIds.includes(studentId.toString()) ? formattedDateTime : null,
//       }));
//       console.log("case 5");

//       const isSubstitute = fetchedEvent.is_substitute_tutor && fetchedEvent.substitute_tutor_id.equals(userId);
//       const attendanceData = {
//         event_id,
//         is_substitute: isSubstitute,
//         tutor_id: userId,
//         attendees: eventAttendees,
//       };
//       console.log("case 6",attendanceData);

//       const newAttendance = await EventAttendance.create(attendanceData);
//       console.log("case 7");
//       console.log(newAttendance,"newAttendance");
//       await Event.findByIdAndUpdate(event_id, { event_attendance_id: newAttendance._id });
//       recordStatus = true;
//     }
//       console.log("case 7");

//     if (recordStatus) {
//       req.flash("success", "The attendance is marked successfully!");
//       return res.status(200).json({
//         success: true,
//         message: "The attendance is marked successfully",
//         redirectUrl: "page-reload",
//         data: eventAttendees,
//       });
//     }

//     return res.status(500).json({
//       message: "Something went wrong, please try again later.",
//     });
//   } catch (error) {
//     console.error("marking attendance: ", error);
//     return res.status(500).json({ message: "Something went wrong, please try again later." });
//   }
// }

async function markAttendance(req, res) {
  try {
    const { loggedUserInfo } = res.locals;
    const { _id: userId } = loggedUserInfo;
    const payload = req.body;
    const { event_id, attendance_status, student_id, student_ids} = payload;
    const now = new Date();
    const formattedDateTime = now.toISOString();
    const fetchedEvent = await Event.findById(event_id).select('student_ids tutor_id is_substitute_tutor substitute_tutor_id event_attendance_id event_category_id start_date');
    const chargeCategory = await ChargeCategory.findOne({ name: 'Group Lesson' });
    const staffTutorId = fetchedEvent?.is_substitute_tutor ? fetchedEvent?.substitute_tutor_id : fetchedEvent?.tutor_id;
    // console.log('fetchedEvent',fetchedEvent);
    if (!fetchedEvent) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (fetchedEvent.event_attendance_id != null) {
      const recordedEventAttendance = await EventAttendance.findById(fetchedEvent.event_attendance_id);
      if (!recordedEventAttendance) {
        return res.status(404).json({ message: "Attendance record not found." });
      } 
      // console.log(selectedStudentIdSet,"selectedStudentIdSet",student_ids);
      // return false;
    
      const updatedData = await updateAttendees(recordedEventAttendance.attendees,payload);
      // console.log('updatedData',updatedData);
      const updateResult = await EventAttendance.findByIdAndUpdate(
        fetchedEvent.event_attendance_id,
        { attendees: updatedData },
        { new: true, useFindAndModify: false }
      );
      recordStatus = true;  
    }else{
      const normalizedBody = {};
      for (const key in payload) {
        normalizedBody[key] = payload[key] === 'on' ? true : payload[key];
      }
      // normalizedBody.student_ids = normalizedBody.student_ids;
      const eventAttendees = fetchedEvent.student_ids.map(studentId => {
        const isCurrentStudent = student_id == studentId.toString();

        // Base attendee object
        const attendee = {
          student_id: studentId,
          status: isCurrentStudent ? attendance_status : 'unrecorded',
          marked_attendance_at: isCurrentStudent ? formattedDateTime : null,
        };

        // If student matches, merge dynamic keys from normalizedBody
        if (isCurrentStudent) {
          return { ...attendee, ...normalizedBody };
        }
        return attendee;
      });

      // eventAttendees = fetchedEvent.student_ids.map(studentId => ({
      //   student_id: studentId,
      //   status: student_ids.includes(studentId.toString()) ? attendance_status  : 'unrecorded',
      //   // std_was_late: student_ids.includes(studentId.toString()) && attendance_status  === "present" && std_was_late ? true : false,
      //   marked_attendance_at: student_ids.includes(studentId.toString()) ? formattedDateTime : null,
      // }));

      const isSubstitute = fetchedEvent.is_substitute_tutor && fetchedEvent.substitute_tutor_id.equals(userId);
      const attendanceData = {
        event_id,
        is_substitute: isSubstitute,
        tutor_id: userId,
        attendees: eventAttendees,
      };
      // console.log('attendanceData',attendanceData);
      const newAttendance = await EventAttendance.create(attendanceData);
      await Event.findByIdAndUpdate(event_id, { event_attendance_id: newAttendance._id });
      recordStatus = true;
    }

    // Step 1: If lesson_price > 0, create CHARGE transaction
    if (payload.lesson_price && Number(payload.lesson_price) > 0) {
      await saveTransaction({
        user: res.locals.loggedUserInfo,
        event_id: event_id,
        type: "Charge",
        student_id: student_id,
        families: [student_id],
        charge_type: "family",
        category: chargeCategory ? `charge:${chargeCategory?._id}` : null,
        charges_discount_amount: Number(payload.lesson_price),
        note: "Lesson charge",
        discount_date: new Date(fetchedEvent.start_date),
      });
    } else {
      await deleteTransaction({
        event_id,
        student_id,
        type: "Charge",
      });
    }

    // Step 1b: If tutor_price > 0, create/update staff CHARGE transaction
    const tutorChargeAmount = Number(payload.tutor_price || 0);
    if (staffTutorId) {
      if (!isNaN(tutorChargeAmount) && tutorChargeAmount > 0) {
        await saveStaffTransaction({
          user: res.locals.loggedUserInfo,
          tutor_id: staffTutorId,
          student_id: student_id,
          event_id: event_id,
          type: "Charge",
          charge_type: "lesson_charge",
          category: chargeCategory ? `charge:${chargeCategory?._id}` : null,
          charges_discount_amount: tutorChargeAmount,
          note: "Tutor charge",
          discount_date: new Date(fetchedEvent.start_date),
        });
      } else {
        await deleteStaffTransaction({
          event_id,
          student_id: student_id,
          tutor_id: staffTutorId,
          type: "Charge",
        });
      }
    }

    // Step 2: If lesson_price_paid_at_lesson === 1, create PAYMENT transaction
    if (payload.is_lesson_price_paid_at_lesson === 'true' && payload.lesson_price_paid_at_lesson > 0) {
      const send_receipt = payload.email_receipt ? true : false;
      const email_recipient = payload.email_receipt ?? null;
      const cc_me_email = payload.is_cc_email_receipt ?? null;
      
      await saveTransaction({
        user: res.locals.loggedUserInfo,
        event_id: event_id,
        type: "Payment",
        student_id: student_id,
        payment_refund_amount: Number(payload.lesson_price_paid_at_lesson),
        note: payload.payment_note,
        payment_method: payload.payment_method,
        payment_date: new Date(fetchedEvent.start_date),
        send_receipt,
        email_recipient,
        cc_me_email,
      });
    }

    if (recordStatus) {
      req.flash("success", "The attendance is marked successfully!");
      return res.status(200).json({
        success: true,
        message: "The attendance is marked successfully",
        redirectUrl: "page-reload",
        // data: eventAttendees,
      });
    }
   
    // return res.status(500).json({
    //   message: "Something went wrong, please try again later.",
    // });

  } catch (error) {
    console.error("marking attendance: ", error);
    return res.status(500).json({ message: "Something went wrong, please try again later." });
  }
}

/**
 * store event group notes and attachments.
 * @param {*} req
 * @param {*} res
 */
async function studentNotesAttachments(req, res) {
  try {
    let { groupNoteId, status, tutorName, eventDate } = req.body
    let studentNotes = await EventGroupNote.findById(groupNoteId);
    if (studentNotes == null) {
      return res.send('<h2>No data found</h2>');
    }

    let html = `<div class="row"><div class="col-md-12"><div class="form-group"><label class="mb-1">Attendance</label><p class="mb-0"><span class="stu-present">${status} (â‚¹)</span></p></div></div><div class="col-md-12"><div class="form-group"><label class="mb-1">Date & Time</label><p class="mb-0">${eventDate}</p></div></div><div class="col-md-12"><div class="form-group"><label class="mb-1">Tutor</label><p class="mb-0">${tutorName}</p></div></div>`;
    if (studentNotes.tutor_note !== '') {
      html += `<div class="col-md-12"><div class="form-group"><label class="mb-1">Tutor Notes</label><p class="mb-0">${studentNotes.tutor_note}</p></div></div>`;
    }
    if (studentNotes.student_note !== '') {
      html += `<div class="col-md-12"><div class="form-group"><label class="mb-1">Student Notes</label><p class="mb-0">${studentNotes.student_note}</p></div></div>`;
    }
    if (studentNotes.parent_note !== '') {
      html += `<div class="col-md-12"><div class="form-group"><label class="mb-1">Parent Notes</label><p class="mb-0">${studentNotes.parent_note}</p></div></div>`;
    }

    html += `<div class="col-md-12"><div class="form-group"> <label class="mb-1">Linked Resources</label>`;

    for (let attachments of studentNotes.attachments) {
      html += `<ul class="linked_resource"><li><div class="linked_resource_top"><h6>${attachments.name}</h6></div><div class="linked_resource_bottom"><ul class="notes-file-size pb-2"><li><img src="/images/files.svg" alt="files" class="img-fluid"> <span>${attachments.extension}</span></li><li>${attachments.name}</li></ul><a href="/EventAttachments/${attachments.name}" download class="note_download"><img src="/images/download-orange.svg" alt="" class="mr-2">Download</a></div></li></ul>`;
    }
    html += `</div></div>`;

    return res.send(html);
  } catch (error) {
    console.error('studentNotesAttachments: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store event group notes and attachments.
 * @param {*} req
 * @param {*} res
 */
async function studentNotesListing(req, res) {
  try {
    const { studentId } = req.body;
    const user_detail = res.locals.loggedUserInfo;
    const userRole = user_detail.role;
    const userId = user_detail._id;
    let searchStr = req.body.search.value || '';
    let obj = {};
    if (userRole === 3) {
      obj['attendees.student_id'] = mysqlOrm.Types.ObjectId(userId);
    }

    let searchQuery = {};

    const removeSpecialCharacters = (text) => {
      return text.replace(/[^a-zA-Z0-9\s]/g, '');
    };

    searchStr = removeSpecialCharacters(searchStr).trim();

    const filter = [];
    var recordsTotal = 0;
    var recordsFiltered = 0;

    if (searchStr) {
      const regex = new RegExp(searchStr, "i");

      searchQuery = {
        $or: [
          // { 'event.duration': regex },      
          { 'tutor.full_name': regex },
          { 'attendees.status': regex }
        ]
      };
    }

    recordsTotal = await EventAttendance.count({ $and: [obj, searchQuery] });
    recordsFiltered = await EventAttendance.count({ $and: [obj, searchQuery] });
    let eventAttendance = await EventAttendance.aggregate([
      { $match: { $and: [obj] } },

      // Unwind the attendees array to filter individual documents
      { $unwind: '$attendees' },
      // Match documents where student_id matches the specific ID
      { $match: { 'attendees.student_id': mysqlOrm.Types.ObjectId(studentId) } },
      { $match: { 'attendees.status': { $in: ['present', 'absent'] } } },
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

      { $skip: Number(req.body.start) },
      { $limit: Number(req.body.length) },

      { $sort: { 'event_id.start_time': -1 } },
    ]);

    const data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: eventAttendance.length > 0 ? recordsFiltered : 0,
      recordsTotal: recordsTotal,
      data: eventAttendance,
    });
    return res.send(data);
  } catch (error) {
    console.error('studentNotesListing: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * editNoteAndAttachment
 * @param {*} req
 * @param {*} res
 */
async function editNoteAndAttachment(req, res) {
  try {
    const { noteId } = req.body;
    let result = await EventGroupNote.findById(noteId);
    res.send(result)
  } catch (error) {
    console.error('editNoteAndAttachment: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store event group notes and attachments.
 * @param {*} req
 * @param {*} res
 */
async function storeEventGroupNoteAndAttachments(req, res) {
  try {
    let formData = req.body;
    formData[formData.type] = formData.event_note;
    delete formData.event_note;
    let attachments = [];

    if (req.body.group_attachments) {
      try {
        attachments = JSON.parse(req.body.group_attachments);
      } catch (e) {
        attachments = [];
      }
    }
    const uniqueAttachmentsMap = attachments.reduce((map, obj) => map.set(obj.name, obj), new Map());
    let uniqueAttachments = Array.from(uniqueAttachmentsMap.values()).map(({ name, extension, size }) => ({ name, extension, size }));

    if (formData.note_id !== '') {
      let fetchEventGroupNote = await EventGroupNote.findById(formData.note_id);
      let attachment = fetchEventGroupNote.attachments;
      uniqueAttachments = [...uniqueAttachments, ...attachment];
      formData.attachments = uniqueAttachments;
      if (uniqueAttachments.length == 0) {
        delete formData.attachments;
      }
      const updateEventGroupNote = await EventGroupNote.findByIdAndUpdate(formData.note_id, formData);
      if (updateEventGroupNote) {
        req.flash("success", "The Group notes & attachments are updated successfully!");
        res.status(200).json({
          success: true,
          message: "The Group notes & attachments are updated successfully!",
          redirectUrl: "page-reload",
        });
      }
    } else {
      formData.attachments = uniqueAttachments;
      const storedEventGroupNote = await EventGroupNote.create(formData);
      if (storedEventGroupNote) {

        await EventAttendance.updateOne({ event_id: mysqlOrm.Types.ObjectId(formData.event_id) }, { group_note_id: storedEventGroupNote.id });
        req.flash("success", "The Group notes & attachments are stored successfully!");
        res.status(200).json({
          success: true,
          message: "The Group notes & attachments are stored successfully!",
          redirectUrl: "page-reload",
        });
      }
    }

  } catch (error) {
    console.error('storeEventGroupNoteAndAttachments: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * destroy shared template.
 * @param {*} req
 * @param {*} res
 */
async function destroyNoteAttachment(req, res) {
  try {
    const { attachmentId, notesId } = req.body;
    let groupAttachments = await EventGroupNote.findById(notesId);
    if (!groupAttachments) {
      return res.status(404).json({ message: "Note not found." });
    }

    let attachmentData = groupAttachments.attachments;
    const attachment = groupAttachments.attachments.find(att => att._id.toString() === attachmentId);
    const filePath = `./assets/EventAttachments/${attachment.name}`;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    } else {
      console.log("The file not found, so not deleted.");
    }

    groupAttachments.attachments = attachmentData.filter((data) => data._id.toString() != attachmentId);
    await groupAttachments.save();

    req.flash("success", "Attachment deleted successfully!");
    res.status(200).json({ "success": true, "message": "Attachment deleted successfully!", "redirectUrl": "page-reload" });
  } catch (error) {
    console.error('destroyNoteAttachment: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * shared templates.
 * @param {*} req
 * @param {*} res
 */
async function noteTemplate(req, res) {
  try {
    let templates = await EventTemplate.find({ isDeleted: false });
    return res.render("../views/admin/attendanceAndNotes/notes-template", { templates: templates });
  } catch (error) {
    console.error('noteTemplate: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store shared template.
 * @param {*} req
 * @param {*} res
 */
async function storeNoteTemplate(req, res) {
  try {
    let slug = slugify(req.body.name, slugify_options);
    let eventTemplate = '';

    if (req.body.template_id != '') {
      let countTemplateExist = await EventTemplate.find({ slug: req.body.slug, _id: { $ne: req.body.template_id } }).count();
      if (countTemplateExist > 0) {
        req.flash("error", "Sorry! Template name is already in use. Please use another name");
        res.status(200).json({ "success": true, "message": "Sorry! Template name is already in use. Please use another name", "redirectUrl": "page-reload" });
      }
      eventTemplate = await EventTemplate.findByIdAndUpdate(req.body.template_id, req.body);
      if (eventTemplate) {
        req.flash("success", "The Template is updated successfully!");
        res.status(200).json({ "success": true, "message": "The Template is updated successfully!", "redirectUrl": "page-reload" });
      } else {
        req.flash("error", "Sorry! Template is not updated");
        res.status(200).json({ "success": true, "message": "Sorry! Template is not updated!", "redirectUrl": "page-reload" });
      }
    } else {
      let countTemplateExist = await EventTemplate.find({ slug: slug }).count();
      if (countTemplateExist > 0) {
        req.flash("error", "Sorry ! Template name is already in use. Please use another name");
        res.status(200).json({ "success": true, "message": "Template name is already in use. Please use another name!", "redirectUrl": "page-reload" });
      }

      eventTemplate = await EventTemplate.create(req.body);
      if (eventTemplate) {
        req.flash("success", "The Template is added successfully!");
      } else {
        req.flash("error", "Sorry ! Template is not added");
      }
      res.status(200).json({ "success": true, "message": "The Template is added successfully!", "redirectUrl": "page-reload" });
    }
  } catch (error) {
    console.error('storeNoteTemplate: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit shared template.
 * @param {*} req
 * @param {*} res
 */
async function editNoteTemplate(req, res) {
  try {
    let template = await EventTemplate.findById(req.body.template_id);
    res.send(template);
  } catch (error) {
    console.error('editNoteTemplate: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * updateEventNoteAccordingToPreference
 * @param {*} req
 * @param {*} res
 */
async function updateEventNoteAccordingToPreference(req, res) {
  try {
    const { groupNoteId } = req.body;
    let result = await EventGroupNote.findById(groupNoteId, { student_note: 1, parent_note: 1, tutor_note: 1 });
    res.send(result)
  } catch (error) {
    console.error('updateEventNoteAccordingToPreference: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * destroy shared template.
 * @param {*} req
 * @param {*} res
 */
async function destroyNoteTemplate(req, res) {
  try {
    let template = await EventTemplate.findByIdAndUpdate(req.params.id, { isDeleted: true });
    req.flash("success", "Template deleted successfully");
    if (template) {
      return res.status(400).json({
        success: true,
        redirectUrl: "page-reload",
        message:
          "Template deleted successfully",
      });
    }
  } catch (error) {
    console.error('destroyNoteTemplate: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * render shared templates.
 * @param {*} req
 * @param {*} res
 */
async function renderSharedTemplate(req, res) {
  try {
    let template = await EventTemplate.findById(req.body.template_id);
    res.send(template);
  } catch (error) {
    console.error('renderSharedTemplate: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * attendance details.
 * @param {*} req
 * @param {*} res
 */
async function attendanceDetails(req, res) {
  try {
    return res.render("../views/admin/attendanceAndNotes/attendance-details");
  } catch (error) {
    console.error('attendanceDetails: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * createReport.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function createReport(req, res) {
  try {
    const { date_range, note_report, student_name, student_id } = req.body;

    if (!date_range || !note_report || !student_name || !student_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const [startDateString, endDateString] = date_range.split(' - ');
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ success: false, error: 'Invalid date range' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ success: false, error: 'Start date must be before end date' });
    }

    const results = await EventAttendance.find({
      'attendees': { $elemMatch: { student_id: mysqlOrm.Types.ObjectId(student_id) } },
      'event_id': { $exists: true, $ne: null },
    })
      .populate({
        path: 'event_id',
        match: {
          'start_time': { $gte: startDate, $lte: endDate },
        },
        populate: [
          { model: 'event_categories', path: 'event_category_id' },
          { model: 'event_locations', path: 'event_location_id' },
        ],
      })
      .populate('tutor_id')
      .populate('group_note_id');

    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'No attendance records found for this student' });
    }

    const moment = res.locals.moment;
    const user_detail = res.locals.loggedUserInfo;
    const timezone = user_detail.time_zone;

    const newDataArray = await transformEventData(results, moment, timezone);

    if (newDataArray.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid data found for report generation. Please adjust your filters.' });
    }

    const templatePath = `./views/admin/attendanceAndNotes/create-report.ejs`;
    const htmlTemplate = await ejs.renderFile(templatePath, {
      newDataArray,
      student_name,
      date_range,
      note_report,
    });

    const browser = await puppeteer.launch({
      // executablePath: '/snap/bin/chromium',  // Path for Snap-installed Chromium
      // executablePath: '/usr/bin/chromium-browser',  // Make sure this path is correct
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
      headless: true,
    });

    console.log('Chromium launched successfully');

    const page = await browser.newPage();
    await page.setContent(htmlTemplate);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      displayHeaderFooter: true,
      footerTemplate: `
        <footer class="clearboth">
          <div class="left clearboth text-light">Pioneers Learning Hub</div>
          <div class="right clearboth text-light">Student Attendance</div>
        </footer>
      `
    });
    await browser.close();

    const reportsDir = './assets/AttendanceReports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true }); // Create the reports directory if it doesn't exist
    }

    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const pdfFilename = `attendance_report_${timestamp}.pdf`;
    const pdfPath = path.join(reportsDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer); // Save the PDF to the disk

    const pdfUrl = `/reports/${pdfFilename}`;
    res.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ success: false, error: 'Something went wrong, please try again later.' });
  }
}

/**
 * transformEventData
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function transformEventData(events, moment, timezone) {
  return events.reduce((acc, event) => {
    const eventDetails = event.event_id ? event.event_id : null; // Directly access event_id here
    if (!eventDetails) {
      // Skip event if event_id is missing or not valid
      return acc;
    }

    // Find attendance status
    const attendanceStatus = event.attendees && event.attendees.find(att => att.status === 'present') ? 'present' : 'unrecorded';

    // Group note handling, assuming group_note_id is optional
    const groupNote = event.group_note_id || {};

    // Building eventData with proper structure
    const eventData = {
      date: eventDetails?.start_time ? moment(eventDetails.start_time).tz(timezone).format('YYYY-MM-DD') : 'N/A',
      time: eventDetails?.start_time && eventDetails?.end_time ?
        `${moment(eventDetails.start_time).tz(timezone).format('hh:mm A')}-${moment(eventDetails.end_time).tz(timezone).format('hh:mm A')}` : 'N/A',
      location: eventDetails?.event_location_id ? eventDetails.event_location_id.name : 'No location',
      event: eventDetails?.event_category_id ? eventDetails.event_category_id.name : 'No category',
      attendance: attendanceStatus,
      notes: {
        parentNotes: groupNote.parent_note || 'No parent notes',
        studentNotes: groupNote.student_note || 'No student notes',
        privateNotes: groupNote.tutor_note || 'No tutor notes'
      }
    };

    // console.log('Transformed Event Data:', eventData);
    acc.push(eventData); // Push to accumulator array
    return acc;
  }, []);
}

function updateAttendees(attendees, body) {
  const updatedAttendees = attendees.map(attendee => {
    if (String(attendee.student_id) === String(body.student_id)) {
      const normalized = {};
      // Convert all "on" to true dynamically
      for (const key in body) {
        if (body[key] === "on") normalized[key] = true;
        else normalized[key] = body[key];
      }

      return {
        ...attendee.toObject(), // convert mysqlOrm doc to plain object
        status: normalized.attendance_status ?? attendee.status,
        ...normalized,
      };
    }
    return attendee.toObject(); // convert rest too
  });

  return updatedAttendees;
}

