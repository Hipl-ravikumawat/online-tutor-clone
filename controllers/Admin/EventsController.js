const Event = require("../../models/Event");
const EventCourse = require("../../models/EventCourse");
const EventCategory = require("../../models/EventCategory");
const EventLocation = require("../../models/EventLocation");
const Lesson = require("../../models/Lesson");
const LearningContent = require("../../models/LearningContent");
const User = require("../../models/User");
const FamilyContacts = require("../../models/FamilyContacts");
const mysqlOrm = require('mysql-orm');
const globalConstants = require("../../_helper/GlobalConstants");
const globalHelper = require("../../_helper/GlobalHelper");
const momentTimezone = require('moment-timezone'); // Install moment-timezone
const mail = require("../../config/mail");
const MailTemplates = require("../../_helper/MailTemplates");
const Topic = require('../../models/Topic');
const Grade = require('../../models/Grade');
const moment = require('moment');
const LearningContentVersion = require('../../models/LearningContentVersions');
const LessonVersion = require('../../models/LessonVersions');
const SlideVersion = require('../../models/SlideVersions');
const Slide = require('../../models/Slide');
const randomStr = require("randomstring");
const InvoiceService = require("../../services/InvoiceService");
const smsService = require("../../services/SmsService");
const { createNotification } = require("../../services/NotificationService");
const globalconstants = require("../../_helper/GlobalConstants");
const fs = require("fs");

module.exports = {
  fetchEvents,
  addAnEvent,
  storeAnEvent,
  editAnEvent,
  updateAnEvent,
  destroyAnEvent,
  cloneAnEvent,
  cancelThisEvent,
  cancelEventListing,
  checkRecurringEvents,

  //--------------------
  updateOneDayEvent,
  updateRecurringEvent,
  reviewEventConflictOnUpdate,
  storeEventCourse,
  updateEventCourse,
  eventsManipulation,
  calculateEventDateTime,
  createEventDatesArray,
  checkEventConflict,
  renderSubstituteTutors,
  fetchStudentPricing,
};


async function upsertEventCourse(req, res, eventCourseId, allEventIds) {
  if (req.body.lockContentEdit) return eventCourseId;

  if (eventCourseId && eventCourseId.toString() !== 'undefined') {
    await updateEventCourse(req, res, eventCourseId, allEventIds);
    return eventCourseId;
  }

  if (req.body.courses && req.body.courses !== '[]') {
    const newCourseId = await storeEventCourse(req, res, allEventIds);
    if (newCourseId) {
      await Event.updateMany(
        { _id: { $in: allEventIds } },
        { $set: { event_course_id: newCourseId } }
      );
    }
    return newCourseId;
  }

  return eventCourseId;
}


/**
 * Delete invoices and transactions associated with an event
 * @param {Object} eventId - Event ID
 * @returns {Object} - Result of deletion
 */
async function deleteEventInvoicesAndTransactions(eventId) {
  try {
    const Invoice = require("../../models/Invoice");
    const Transaction = require("../../models/Transaction");
    const StaffTransaction = require("../../models/StaffTransaction");
    const StaffInvoices = require("../../models/StaffInvoices");

    // Convert to ObjectId safely
    let eventObjectId;
    try {
      eventObjectId = mysqlOrm.Types.ObjectId(eventId);
    } catch (e) {
      console.error('Invalid eventId:', eventId);
      return { success: false, error: 'Invalid eventId' };
    }

    // Step 1: Find and soft-delete all standalone family Transactions linked to this event
    const transactions = await Transaction.find({
      event_id: eventObjectId,
      isDeleted: false
    });

    const transactionIds = transactions.map(t => t._id);
    console.log(`Event ${eventId}: found ${transactionIds.length} family transaction(s)`);

    if (transactionIds.length > 0) {
      await Transaction.updateMany(
        { _id: { $in: transactionIds } },
        {
          $set: {
            isDeleted: true,
            deleted_at: new Date(),
          }
        }
      );
    }

    // Step 2: Find family Invoices that have this event_id inside their embedded transactions array
    const invoices = await Invoice.find({
      "transactions.event_id": eventObjectId,
      isDeleted: false
    });

    console.log(`Event ${eventId}: found ${invoices.length} family invoice(s)`);

    let deletedInvoiceCount = 0;
    if (invoices.length > 0) {
      const invoiceIds = invoices.map(i => i._id);
      const result = await Invoice.updateMany(
        {
          _id: { $in: invoiceIds },
          isDeleted: false
        },
        {
          $set: {
            isDeleted: true,
            deleted_at: new Date(),
          }
        }
      );
      deletedInvoiceCount = result.modifiedCount;
    }

    // Step 3: Find and soft-delete all staff Transactions linked to this event
    const staffTransactions = await StaffTransaction.find({
      event_id: eventObjectId,
      isDeleted: false
    });

    const staffTransactionIds = staffTransactions.map(t => t._id);
    console.log(`Event ${eventId}: found ${staffTransactionIds.length} staff transaction(s)`);

    if (staffTransactionIds.length > 0) {
      await StaffTransaction.updateMany(
        { _id: { $in: staffTransactionIds } },
        {
          $set: {
            isDeleted: true,
            deleted_at: new Date(),
          }
        }
      );
    }

    // Step 4: Find staff invoices linked to this event either by top-level event_id or embedded transaction event_id
    const staffInvoices = await StaffInvoices.find({
      isDeleted: false,
      $or: [
        { event_id: eventObjectId },
        { "transactions.event_id": eventObjectId }
      ]
    });

    console.log(`Event ${eventId}: found ${staffInvoices.length} staff invoice(s)`);

    let deletedStaffInvoiceCount = 0;
    if (staffInvoices.length > 0) {
      const staffInvoiceIds = staffInvoices.map(i => i._id);
      const result = await StaffInvoices.updateMany(
        {
          _id: { $in: staffInvoiceIds },
          isDeleted: false
        },
        {
          $set: {
            isDeleted: true,
            deleted_at: new Date(),
          }
        }
      );
      deletedStaffInvoiceCount = result.modifiedCount;
    }

    console.log(`Event ${eventId}: deleted ${deletedInvoiceCount} family invoice(s), ${transactionIds.length} family transaction(s), ${deletedStaffInvoiceCount} staff invoice(s), ${staffTransactionIds.length} staff transaction(s)`);

    return {
      success: true,
      deletedInvoices: deletedInvoiceCount,
      deletedTransactions: transactionIds.length,
      deletedStaffInvoices: deletedStaffInvoiceCount,
      deletedStaffTransactions: staffTransactionIds.length,
      message: `Deleted ${deletedInvoiceCount} family invoice(s), ${transactionIds.length} family transaction(s), ${deletedStaffInvoiceCount} staff invoice(s), ${staffTransactionIds.length} staff transaction(s)`
    };

  } catch (error) {
    console.error('Error in deleteEventInvoicesAndTransactions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all events in a recurring series
 * @param {Object} eventData - The event data
 * @param {string} deleteOption - 'this_one' or 'all'
 * @returns {Array} - Array of event IDs to delete
 */
async function getEventsToDelete(eventData, deleteOption) {
  const Event = require("../../models/Event");
  let eventsToDelete = [];
  
  if (deleteOption === 'this_one') {
    eventsToDelete = [eventData._id];
  } else if (deleteOption === 'all') {
    if (eventData.parent_event_id === null) {
      // This is parent event, get all child events
      const childEvents = await Event.find({ parent_event_id: eventData._id }, { _id: 1 });
      eventsToDelete = [eventData._id, ...childEvents.map(e => e._id)];
    } else {
      // This is child event, get parent and all future events
      const parentEvent = await Event.findById(eventData.parent_event_id);
      const otherChildEvents = await Event.find({ 
        parent_event_id: eventData.parent_event_id,
        start_date: { $gte: eventData.start_date }
      }, { _id: 1 });
      eventsToDelete = [eventData.parent_event_id, ...otherChildEvents.map(e => e._id)];
    }
  }
  
  return eventsToDelete;
}

/**
 * calendar events to display on calender.
 * @param {*} req
 * @param {*} res
 */
async function fetchEvents(req, res) {
  try {
    let moment = res.locals.moment;
    const user_detail = res.locals.loggedUserInfo;
    const userRole = user_detail.role;
    let obj = {};
    if (userRole === 2) {
      const tutorId = mysqlOrm.Types.ObjectId(user_detail._id);
      obj['$or'] = [
        { 'tutor_id': tutorId },
        { 'substitute_tutor_id': tutorId }
      ];

    } else if (userRole === 3) {
      obj['student_ids'] = mysqlOrm.Types.ObjectId(user_detail._id);
    }
    if (req.body.selectedStudents !== undefined) {
      const selectedStudents = req.body.selectedStudents.map(id => mysqlOrm.Types.ObjectId(id));
      obj['student_ids'] = { $in: selectedStudents };
    }
    if (req.body.selectedTutor !== undefined) {
      obj['tutor_id'] = req.body.selectedTutor;
    }
    if (req.body.selectedSubstituteTutor !== undefined) {
      obj['substitute_tutor_id'] = req.body.selectedSubstituteTutor;
    }

    if (req.body.selectedLocation !== undefined) {
      obj['event_location_id'] = req.body.selectedLocation;
    }

    if (req.body.selectedCategory !== undefined) {
      obj['event_category_id'] = req.body.selectedCategory;
    }

    const startDate = new Date(Date.UTC(req.body.year, req.body.month - 1, 1));
    const endDate = new Date(Date.UTC(req.body.year, req.body.month, 1));

    obj['start_time'] = { $gte: startDate, $lte: endDate };


    const events = await Event.find(obj, "parent_event_id tutor_id is_substitute_tutor substitute_tutor_id student_ids event_category_id event_location_id start_date end_time start_time duration  will_repeat public_note private_note status timezone_warning_acknowledged leave_warning_acknowledged"
    )
      .populate({
        path: "tutor_id",
        model: "users",
        select: { _id: 1, first_name: 1, last_name: 1 },
      })
      .populate({
        path: "student_ids",
        model: "users",
        select: { _id: 1, first_name: 1, last_name: 1 },
      })
      .populate({
        path: "event_category_id",
        model: "event_categories",
        select: { _id: 1, name: 1, color: 1 },
      })
      .populate({
        path: "event_location_id",
        model: "event_locations",
        select: { _id: 1, name: 1, color: 1, location_type: 1, icons: 1 },
      })
      .populate({
        path: "event_attendance_id",
        model: "event_attendances",
        select: { _id: 1, attendees: 1 },
      }).populate('substitute_tutor_id')
      .sort({ _id: 1 });
    const newData = [];
    for (const event of events) {
      let attendeesArray = [];
   
      if (event.event_attendance_id !== null) {
        let attendees = event.event_attendance_id.attendees;
        attendeesArray = attendees.reduce((acc, current) => {
          acc[current.student_id] = current.status;
          return acc;
        }, {});
      }
      let substituteTutorText = '';
      if (event.substitute_tutor_id !== null && event.is_substitute_tutor === true) {
        substituteTutorText = `substituted by ${event.substitute_tutor_id.first_name} ${event.substitute_tutor_id.last_name}`
      }

      const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;

      const startDateTime = moment.utc(event.start_time).tz(loggedUserSpecificTimezone);
      //.utcOffset('+10:00');
      const endDateTime = moment.utc(event.end_time).tz(loggedUserSpecificTimezone);
      //.utcOffset('+10:00');
      const startTime = startDateTime.format('hh:mm A');
      const endTime = endDateTime.format('hh:mm A');

      newData.push({
        title: `Lesson with tutor ${event.tutor_id.first_name} ${event.tutor_id.last_name} ${substituteTutorText}`,
        eventId: event._id,
        start: startDateTime,
        end: endDateTime,
        timings: `${startTime}-${endTime}`,
        totalAttendees: event.student_ids,
        attendeesArray: attendeesArray,
        eventStatus: event.status,
        location: event.event_location_id,
        categoryColor: event.event_category_id.color,
        categoryName: event.event_category_id.name,
        isRecurring: event.will_repeat == true ? 'recurring' : 'single',
        isParent: event.parent_event_id == null ? true : false,
        loggedUserSpecificTimezone: loggedUserSpecificTimezone,
        isSubstituteTutor: event.is_substitute_tutor,
        substituteTutorId: event.substitute_tutor_id !== null ? event.substitute_tutor_id._id.toString() : '',
        tutorId: event.tutor_id._id.toString(),
        timezoneWarningAcknowledged: event?.timezone_warning_acknowledged || false,
        leaveWarningAcknowledged: event?.leave_warning_acknowledged || false,
      });
    }

    return res.status(201).json({
      success: true,
      data: newData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * add an event on calender.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function addAnEvent(req, res) {
  try {
    let activeTopics = await Topic.find({ "status": 1, "isDeleted": false }).sort({ 'name': 1 });
    let activeGrades = await Grade.find({ "status": 1, "isDeleted": false }).sort({ 'name': 1 });
    const groupTags = await globalHelper.getGroupTagsList();
    const [tutors, students, eventCategories, eventLocations] =
      await Promise.all([
        User.find(
          { role: 2, isDeleted: false, status: 1 },
          "_id first_name last_name"
        ).sort({ first_name: 1 }),
        User.find(
          { role: 3, isDeleted: false, status: 1 },
          "_id first_name last_name"
        ).sort({ first_name: 1 }),
        EventCategory.find({ isDeleted: false }, "_id name").sort({ name: 1 }),
        EventLocation.find({ isDeleted: false }, "_id name").sort({ name: 1 }),
      ]);

    return res.render("../views/admin/calendar/events/add_event", {
      tutors: tutors,
      students: students,
      eventCategories: eventCategories,
      eventLocations: eventLocations,
      activeTopics: activeTopics,
      activeGrades: activeGrades,
      groupTags: groupTags,
      currency: globalConstants.currency,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store an event.
 * @param {*} req
 * @param {*} res
 */
async function storeAnEvent(req, res) {
  try {
    // organize the request body
    const { moment } = res.locals; // Destructure moment from locals
    let recurring_info = [];
    let createdEventIds = [];

    delete req.body.student_ids;
    let [hours, minutes] = req.body.duration.split(':').map(Number);
    let timeMinutes = (hours * 60) + minutes;
    req.body.duration = timeMinutes;
    req.body.student_ids = req.body.attendees;
    req.body.substitute_tutor_id = req.body.substitute_tutor_id != "" ? req.body.substitute_tutor_id : null;
    let numberOfRecurring = req.body.recurring_type == "weekly" ? req.body.no_of_week : req.body.no_of_fortnightly;
    let repeatIndefinitely = req.body.repeat_indefinitely == "1" ? true : false;
    delete req.body.attendees;

    req.body.timezone_warning_acknowledged = req.body.timezone_warning_acknowledged === '1';
    req.body.leave_warning_acknowledged = req.body.leave_warning_acknowledged === '1';

    // calculate event startDataTime & endDateTime
    const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;

    eventDateTimings = await calculateEventDateTime(moment, loggedUserSpecificTimezone, req.body.start_date, req.body.start_time, req.body.duration);
    req.body.start_time = eventDateTimings.startDateTimeUTC;
    req.body.end_time = eventDateTimings.endDateTimeUTC;

    if (repeatIndefinitely) {
      numberOfRecurring = globalConstants.numberOfRecurringEvents;
    }

    if (!req.body.will_repeat) {
      numberOfRecurring = 1;
    }


    // create possible startDataTime & endDateTime combination on the basics of number of recurrence of an event.
    eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);

    if (eventDatesArray.length == 0) {
      return res.status(500).json({
        success: false,
        flag: 'eventDatesArray',
        redirectUrl: 'page-reload',
        message: "Something went wrong, try again later.",
      });
    }

    const eventConflicts = await checkEventConflict(req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment);

    if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
      return res.status(500).json({
        success: false,
        flag: 'scheduleEventConflict',
        conflictMessage: eventConflicts.conflictBlockHtml,
        totalConflicts: eventConflicts.total,
        message: "The event conflict is raised, please resolve it.",
      });
    }

    // inserting the non-recurring events.
    if (!req.body.will_repeat) {
      createdEvent = await Event.create(req.body);
      createdEventIds.push(createdEvent._id);
    }

    // inserting the recurring events.
    if (req.body.will_repeat == "1") {
      const startDate = new Date(req.body.start_date);
      let lastDateOfEvent = null;
      if(req.body.will_repeat == "1" && req.body.repeat_indefinitely != "1"){
        lastDateOfEvent = await generateRecurringDates(startDate, req.body.recurring_type, numberOfRecurring);
      }

      let parentEventId = null;
      recurring_info = {
        recurring_type: req.body.recurring_type,
        no_of_recurring: numberOfRecurring,
        repeat_indefinitely: repeatIndefinitely,
        recurring_until:lastDateOfEvent,
      };
      req.body.recurring_info = recurring_info;

      for (let i = 0; i < numberOfRecurring; i++) {
        try {
          req.body.parent_event_id = parentEventId;
          let createdEvent = await Event.create(req.body);
          createdEventIds.push(createdEvent._id);
          if (req.body.recurring_type == "weekly") {
            req.body.start_date = moment(req.body.start_date).add(7, "days");
            req.body.start_time = moment(req.body.start_time).add(7, "days");
            req.body.end_time = moment(req.body.end_time).add(7, "days");
          } else {
            req.body.start_date = moment(req.body.start_date).add(14, "days");
            req.body.start_time = moment(req.body.start_time).add(14, "days");
            req.body.end_time = moment(req.body.end_time).add(14, "days");
          }
          if (i == 0) {
            req.body.recurring_info.recurring_until = null;
            parentEventId = createdEvent._id;
          }
        } catch (error) {
          // Consider logging details and notifying the user about partial success.
          console.error(`Error creating event ${i + 1}:`, error);
        }
      }
    }
     // Store event course (optional)
    const createdEventCourseId = await storeEventCourse(req, res, createdEventIds);
    
    // Only update events if we got an event course ID
    if (createdEventCourseId) {
      await Event.updateMany({ _id: { $in: createdEventIds } }, { 
        $set: { event_course_id: createdEventCourseId } 
      });
    }

    const successMsg = "The calender event is stored successfully!";
    req.flash("success", successMsg);
    res.status(200).json({
      success: true,
      message: successMsg,
      redirectUrl: "/calendar",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

// async function storeAnEvent(req, res) {
//   try {
//     // Initial setup and validation
//     const { moment } = res.locals;
//     let recurring_info = [];
//     let createdEventIds = [];

//     // Process request body
//     processRequestBody(req);

//     // Calculate event timings
//     const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;
//     const eventDateTimings = await calculateEventDateTime(
//       moment, loggedUserSpecificTimezone, 
//       req.body.start_date, req.body.start_time, req.body.duration
//     );
//     req.body.start_time = eventDateTimings.startDateTimeUTC;
//     req.body.end_time = eventDateTimings.endDateTimeUTC;

//     // Determine recurrence settings
//     const { numberOfRecurring, repeatIndefinitely } = getRecurrenceSettings(req);

//     // Create event dates array
//     const eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);
//     if (eventDatesArray.length === 0) {
//       return handleErrorResponse(res, 'eventDatesArray', 'Something went wrong, try again later.');
//     }

//     // Check for event conflicts
//     const eventConflicts = await checkEventConflict(
//       req.body.tutor_id, req.body.substitute_tutor_id, 
//       req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment
//     );
//     if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
//       return handleConflictResponse(res, eventConflicts);
//     }

//     // Create content version if needed
//     let versionedContentId = null;
//     console.log(req.body.learning_content_id,"Hello");
//     if (req.body.learning_content_id) {
//       versionedContentId = await createContentVersion(req.body.learning_content_id);
//       req.body.learning_content_id = versionedContentId;
//     }

//     // Create events (single or recurring)
//     if (!req.body.will_repeat) {
//       await createSingleEvent(req, createdEventIds);
//     } else {
//       await createRecurringEvents(req, numberOfRecurring, createdEventIds);
//     }

//     // Finalize event creation
//     await finalizeEventCreation(req, res, createdEventIds);
//     console.log("===============================");
//     console.log("exit");
//     console.log("===============================");
//     return false;
//     // return handleSuccessResponse(res,req);

//   } catch (error) {
//     console.error(error);
//     return handleErrorResponse(res, 'general', 'Something went wrong, please try again later.');
//   }
// }

// Helper functions for storeAnEvent
// function processRequestBody(req) {
//   delete req.body.student_ids;
//   const [hours, minutes] = req.body.duration.split(':').map(Number);
//   req.body.duration = (hours * 60) + minutes;
//   req.body.student_ids = req.body.attendees;
//   req.body.substitute_tutor_id = req.body.substitute_tutor_id !== "" ? req.body.substitute_tutor_id : null;
//   delete req.body.attendees;
// }

// function getRecurrenceSettings(req) {
//   let numberOfRecurring = req.body.recurring_type === "weekly" 
//     ? req.body.no_of_week 
//     : req.body.no_of_fortnightly;
//   const repeatIndefinitely = req.body.repeat_indefinitely === "1";

//   if (repeatIndefinitely) {
//     numberOfRecurring = globalConstants.numberOfRecurringEvents;
//   }
//   if (!req.body.will_repeat) {
//     numberOfRecurring = 1;
//   }

//   return { numberOfRecurring, repeatIndefinitely };
// }

// async function createSingleEvent(req, createdEventIds) {
//   const createdEvent = await Event.create(req.body);
//   createdEventIds.push(createdEvent._id);
// }

// async function createRecurringEvents(req, numberOfRecurring, createdEventIds) {
//   let parentEventId = null;
//   req.body.recurring_info = {
//     recurring_type: req.body.recurring_type,
//     no_of_recurring: numberOfRecurring,
//     repeat_indefinitely: req.body.repeat_indefinitely === "1",
//   };

//   for (let i = 0; i < numberOfRecurring; i++) {
//     try {
//       req.body.parent_event_id = parentEventId;
//       const createdEvent = await Event.create(req.body);
//       createdEventIds.push(createdEvent._id);

//       // Update dates for next recurrence
//       const daysToAdd = req.body.recurring_type === "weekly" ? 7 : 14;
//       req.body.start_date = moment(req.body.start_date).add(daysToAdd, "days");
//       req.body.start_time = moment(req.body.start_time).add(daysToAdd, "days");
//       req.body.end_time = moment(req.body.end_time).add(daysToAdd, "days");

//       if (i === 0) {
//         parentEventId = createdEvent._id;
//       }
//     } catch (error) {
//       console.error(`Error creating event ${i + 1}:`, error);
//     }
//   }
// }

// async function finalizeEventCreation(req, res, createdEventIds) {
//   const createdEventCourseId = await storeEventCourse(req, res, createdEventIds);
//   await Event.updateMany(
//     { _id: { $in: createdEventIds } }, 
//     { $set: { event_course_id: createdEventCourseId } }
//   );
// }

// function handleErrorResponse(res, flag, message) {
//   return res.status(500).json({
//     success: false,
//     flag,
//     redirectUrl: 'page-reload',
//     message
//   });
// }

// function handleConflictResponse(res, eventConflicts) {
//   return res.status(500).json({
//     success: false,
//     flag: 'scheduleEventConflict',
//     conflictMessage: eventConflicts.conflictBlockHtml,
//     totalConflicts: eventConflicts.total,
//     message: "The event conflict is raised, please resolve it.",
//   });
// }

// function handleSuccessResponse(res,req) {
//   const successMsg = "The calendar event is stored successfully!";
//   req.flash("success", successMsg);
//   return res.status(200).json({
//     success: true,
//     message: successMsg,
//     redirectUrl: "/calendar",
//   });
// }

function convertDurationToMinutes(duration) {
  if (duration == null || duration === "") return null;

  // if already number
  if (typeof duration === "number") return duration;

  // if string like "01:30"
  if (typeof duration === "string") {
    if (duration.includes(":")) {
      const [h, m] = duration.split(":").map(Number);
      return (h * 60) + m;
    }
    return Number(duration);
  }

  return Number(duration);
}

/**
 * edit an event.
 * @param {*} req
 * @param {*} res
 */
async function editAnEvent(req, res) {
  try {
    const { moment } = res.locals; // Destructure moment from locals.
    const eventId = req.params.eventId;
    const user_detail = res.locals.loggedUserInfo;
    const userTimeZone = user_detail.time_zone;
    const groupTags = await globalHelper.getGroupTagsList();



    // Add validation
    if (!eventId || eventId === 'undefined' || eventId === 'null') {
      req.flash("error", "Invalid event ID");
      return res.redirect("/calendar");
    }

    // Validate mysqlOrm ObjectId
    if (!mysqlOrm.Types.ObjectId.isValid(eventId)) {
      req.flash("error", "Invalid event ID format");
      return res.redirect("/calendar");
    }

    const eventData = await Event.findById(eventId).populate({
      path: "parent_event_id",
      select: "start_date recurring_info",
    }).lean();

    if (!eventData) {
      req.flash("error", "The event could not be found. It may have been deleted or updated.");
      return res.redirect("/calendar");
    }

    // Convert ObjectIds to strings
    eventData.student_ids = eventData.student_ids.map(objectId => objectId.toString());

    // find final end_date of a recurring event.
    let final_end_date;
    if (eventData.will_repeat === false) {
      eventData["final_end_date"] = eventData.start_date;
    } else {
      if (eventData.parent_event_id !== null) {
        final_end_date = eventData.parent_event_id.start_date;
        const recurring_type = eventData.parent_event_id.recurring_info[0].recurring_type;
        const no_of_recurring = eventData.parent_event_id.recurring_info[0].no_of_recurring;
        let sum_of_recurring = 0;

        if (recurring_type == "weekly") {
          sum_of_recurring = parseInt(no_of_recurring) * 7 - 7;
        } else {
          sum_of_recurring = parseInt(no_of_recurring) * 14 - 14;
        }
        final_end_date = moment(final_end_date).add(sum_of_recurring, "days");
        eventData["final_end_date"] = final_end_date;
      } else {
        final_end_date = eventData.start_date;
        const recurring_type = eventData.recurring_info[0].recurring_type;
        const no_of_recurring = eventData.recurring_info[0].no_of_recurring;
        let sum_of_recurring = 0;

        if (recurring_type == "weekly") {
          sum_of_recurring = parseInt(no_of_recurring) * 7 - 7;
        } else {
          sum_of_recurring = parseInt(no_of_recurring) * 14 - 14;
        }
        final_end_date = moment(final_end_date).add(sum_of_recurring, "days");
        eventData["final_end_date"] = final_end_date;
      }
    }

    const activeTopics = await Topic.find({ "status": 1 }).sort({ 'name': 1 });
    const activeGrades = await Grade.find({ "status": 1 }).sort({ 'name': 1 });

    const [tutors, substitute_tutors, students, eventCategories, eventLocations] =
      await Promise.all([
        User.find(
          { role: 2, isDeleted: false },
          "_id first_name last_name"
        ).sort({ first_name: 1 }),
        User.find(
          { role: 2, isDeleted: false },
          "_id first_name last_name"
        ).sort({first_name: 1 }),
        User.aggregate([
          { $match: { role: 3, isDeleted: false } },
          {
            $project: {
              id: { $toString: "$_id" },
              first_name: 1,
              last_name: 1
            }
          },
          { $sort: { first_name: 1 } }
        ]),
        EventCategory.find({ isDeleted: false }, "_id name").sort({'name': 1 }),
        EventLocation.find({ isDeleted: false }, "_id name").sort({'name': 1 }),
      ]);

        let oldEventContents = [];
    
      // Only fetch event contents if event_course_id exists
      if (eventData.event_course_id) {
        const eventContents = await EventCourse.find({ event_ids: mysqlOrm.Types.ObjectId(eventId) }, { content: 1 }).populate([{
          path: 'content.learning_content_id',
          model: 'learning_content_versions',
          select: "_id grade_id topic_id sub_topic_id title",
          populate: [{
            path: 'grade_id',
            model: 'grades',
            select: "_id name"
          },
          {
            path: 'topic_id',
            model: 'topics',
            select: "_id name"
          },
          {
            path: 'sub_topic_id',
            model: 'subTopics',
            select: "_id name topic_id",
          }],
        }]).populate([{
          path: 'content.lesson_id',
          model: 'lesson_versions',
          select: "_id title",
        }]).sort({ _id: -1 });

        // Check if eventContents has data
        if (eventContents.length > 0 && eventContents[0].content) {
          oldEventContents = eventContents[0].content.map(content => {
            return {
              learning_content_id: {
                id: content.learning_content_id._id.toString(),
                title: content.learning_content_id.title,
                gradeTitle: content.learning_content_id?.grade_id?.name,
                topicTitle: content.learning_content_id?.topic_id?.name,
                subTopicTitle: content.learning_content_id?.sub_topic_id?.name,
              },
              lesson_id: {
                id: content.lesson_id._id.toString(),
                title: content.lesson_id.title,
                is_default: content.is_default,
              },
              slide_score: content.slide_score || 0,
            };
          });
        }
      }

      const eventStatus = (() => {
        const now = moment();
        const start = moment(eventData.start_time);
        const end = moment(eventData.end_time);

        if (end.isBefore(now)) return "past";
        if (start.isSameOrBefore(now) && end.isSameOrAfter(now)) return "ongoing";
        return "future";
      })();
    eventData.duration = eventData.duration;

    return res.render("../views/admin/calendar/events/edit_event", {
      data: eventData,
      tutors: tutors,
      students: students,
      substitute_tutors: substitute_tutors,
      userTimeZone: userTimeZone,
      eventCategories: eventCategories,
      eventLocations: eventLocations,
      activeTopics: activeTopics,
      activeGrades: activeGrades,
      oldEventContents: oldEventContents,
      groupTags: groupTags,
      eventStatus: eventStatus,
      currency: globalConstants.currency
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update an event. 
 * @param {*} req
 * @param {*} res
 */
async function updateAnEvent(req, res) {
  try {
    const eventId = req.body.event_id;

    if (!eventId || eventId === 'undefined' || eventId === 'null') {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
        redirectUrl: "page-reload",
      });
    }

    // Validate mysqlOrm ObjectId
    if (!mysqlOrm.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format",
        redirectUrl: "page-reload",
      });
    }

    const eventData = await Event.findById(eventId).populate({
      path: "event_course_id",
      model: "event_courses",
    }).populate({
      path: "parent_event_id",
      model: "events",
      select: "_id",
    });

    if (!eventData) {
      req.flash("error", "The event is not found.");
      return res.status(404).json({  // ADDED RETURN HERE
        success: false,
        message: "The event is not found.",
        redirectUrl: "page-reload",
      });
    }

    const { moment } = res.locals;

    const now = moment();
    const start = moment(eventData.start_time);
    const end = moment(eventData.end_time);

    let eventStatus = "future";
    if (end.isBefore(now)) eventStatus = "past";
    else if (start.isSameOrBefore(now) && end.isSameOrAfter(now)) eventStatus = "ongoing";

    const originalData = {
      student_ids: eventData.student_ids,
      tutor_id: eventData.tutor_id,
      substitute_tutor_id: eventData.substitute_tutor_id,
      event_course_id: eventData.event_course_id
    };

    // organize the request body
    let recurring_info = [];

   
    
    if (req.body.duration != null) {
      let totalMinutes;

      if (typeof req.body.duration === "string" && req.body.duration.includes(":")) {
        let [hours, minutes] = req.body.duration.split(":").map(Number);
        totalMinutes = (hours * 60) + minutes;
      } else {
        totalMinutes = Number(req.body.duration);
      }

      req.body.duration = totalMinutes;
    }

  if (eventStatus === "future") {
    delete req.body.student_ids;
    
    // FIX: Validate and convert student IDs
    req.body.student_ids = [];
    if (req.body.attendees && Array.isArray(req.body.attendees)) {
      for (let studentId of req.body.attendees) {
        if (studentId && studentId !== 'undefined' && studentId !== 'null' && 
            mysqlOrm.Types.ObjectId.isValid(studentId)) {
          req.body.student_ids.push(new mysqlOrm.Types.ObjectId(studentId));
        }
      }
    }
    
    req.body.is_substitute_tutor = req.body.is_substitute_tutor === undefined ? false : true;

    req.body.timezone_warning_acknowledged = req.body.timezone_warning_acknowledged === '1';
    req.body.leave_warning_acknowledged = req.body.leave_warning_acknowledged === '1';
    
    // FIX: Validate substitute_tutor_id
    if (req.body.is_substitute_tutor && req.body.substitute_tutor_id && 
        req.body.substitute_tutor_id !== 'undefined' && req.body.substitute_tutor_id !== 'null' &&
        mysqlOrm.Types.ObjectId.isValid(req.body.substitute_tutor_id)) {
      req.body.substitute_tutor_id = new mysqlOrm.Types.ObjectId(req.body.substitute_tutor_id);
    } else {
      req.body.substitute_tutor_id = null;
    }
    
    // FIX: Validate tutor_id
    if (!req.body.tutor_id || req.body.tutor_id === 'undefined' || req.body.tutor_id === 'null' ||
        !mysqlOrm.Types.ObjectId.isValid(req.body.tutor_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tutor ID",
        redirectUrl: "page-reload",
      });
    }
    req.body.tutor_id = new mysqlOrm.Types.ObjectId(req.body.tutor_id);
  }
    
    let numberOfRecurring = req.body.recurring_type == "weekly" ? req.body.no_of_week : req.body.no_of_fortnightly;
    let repeatIndefinitely = req.body.repeat_indefinitely == "1" ? true : false;
    delete req.body.attendees;

    if (repeatIndefinitely) {
      numberOfRecurring = globalConstants.numberOfRecurringEvents;
    }

    if (!req.body.will_repeat) {
      numberOfRecurring = 1;
    }

    req.body.recurring_info = { recurring_type: req.body.recurring_type, no_of_recurring: numberOfRecurring, repeat_indefinitely: repeatIndefinitely };

    req.body.status = 'N/A';
    req.body.comment = '';

    // Pass event_course_id in request body for optional content handling
    // FIX: Safely handle event_course_id
    req.body.event_course_id = eventData.event_course_id ? 
      (typeof eventData.event_course_id === 'object' ? eventData.event_course_id._id : eventData.event_course_id) : 
      null;

    req.body.duration = convertDurationToMinutes(req.body.duration);

    if (eventStatus === "past" || eventStatus === "ongoing") {
      req.body.student_ids = originalData.student_ids;
      req.body.tutor_id = originalData.tutor_id;
      req.body.substitute_tutor_id = originalData.substitute_tutor_id;
      req.body.event_course_id = originalData.event_course_id;
      if (!req.body.duration) {
        req.body.duration = eventData.duration;
      }

      // prevent overwrite from attendees
      delete req.body.attendees;

      // flag to skip course update
      req.body.skipCourseUpdate = true;
      req.body.lockContentEdit = true;
    }
    
    let finalResponse;
    // console.log(eventData.will_repeat,"boolean");
    if (eventData.will_repeat === false) {
      finalResponse = await updateOneDayEvent(req, res, eventData)
    } else {
      finalResponse = await updateRecurringEvent(req, res, eventData, repeatIndefinitely)
    }
    if (finalResponse.success === true) {
      const newStartTime = req.body.start_time; // already calculated inside updateOneDayEvent/updateRecurringEvent
      await syncTransactionDatesForEvent(eventData._id, newStartTime);
      if (eventStatus === "past" || eventStatus === "ongoing") {
        const updatedEvent = await Event.findById(eventData._id).populate({
          path: "parent_event_id",
          model: "events",
          select: "_id",
        });

        if (shouldRegenerateInvoicesForUpdatedPrice(eventData, updatedEvent)) {
          try {
            await handleUpdatedEventPriceInvoices(req, res, eventData, updatedEvent);
          } catch (invoiceError) {
            console.error("Invoice regeneration failed after event update:", invoiceError);
          }
        }
      }
      req.flash("success", finalResponse.message);
      return res.status(200).json({
        success: true,
        message: finalResponse.message,
        redirectUrl: "/calendar",
      });
    } else {
      return res.status(500).json(finalResponse);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function collectRelatedEventIdsForInvoiceUpdate(eventData) {
  const ids = new Set();
  const addId = (id) => {
    if (!id) return;
    const normalized = id._id ? id._id.toString() : id.toString();
    ids.add(normalized);
  };

  addId(eventData._id);

  let parentId = null;
  if (eventData.parent_event_id) {
    parentId = eventData.parent_event_id._id ? eventData.parent_event_id._id : eventData.parent_event_id;
  } else if (eventData.will_repeat) {
    parentId = eventData._id;
  }

  if (parentId) {
    addId(parentId);
    const relatedEvents = await Event.find({ parent_event_id: parentId }, { _id: 1 }).lean();
    relatedEvents.forEach((event) => addId(event._id));
  }

  return Array.from(ids).map((id) => mysqlOrm.Types.ObjectId(id));
}

function shouldRegenerateInvoicesForUpdatedPrice(eventData, updatedEventData) {
  const oldPrice = Number(eventData.per_std_lesson_price || 0);
  const newPrice = Number(updatedEventData?.per_std_lesson_price || 0);

  const priceChanged = !Number.isNaN(newPrice) && newPrice !== oldPrice;
  const optionChanged = updatedEventData?.student_pricing_option !== eventData.student_pricing_option;

  return priceChanged || optionChanged;
}

async function handleUpdatedEventPriceInvoices(req, res, eventData, updatedEventData) {
  const userDetail = res.locals.loggedUserInfo;
  const eventIds = await collectRelatedEventIdsForInvoiceUpdate(eventData);
  if (!eventIds.length) return;

  const studentPricingOption = updatedEventData?.student_pricing_option ?? req.body.student_pricing_option;
  const perStdLessonPrice = updatedEventData?.per_std_lesson_price ?? req.body.per_std_lesson_price;

  await InvoiceService.updateEventChargeTransactions(
    eventIds,
    studentPricingOption,
    perStdLessonPrice
  );

  await InvoiceService.regenerateInvoicesForEventPriceChange(eventIds, userDetail);
}

/**
 * delete an event. 
 * @param {*} req
 * @param {*} res
 */
async function destroyAnEvent(req, res) {
  try {
    const eventId = req.body.event_id_to_delete;
    const eventType = req.body.event_type;
    const deleteOption = req.body.delete_option;
    const eventData = await Event.findById(eventId).populate('event_course_id');

    if (!eventData) {
      req.flash("error", "The event is not found.");
      res.status(500).json({
        success: true,
        message: "The event is not found.",
        redirectUrl: "page-reload",
      });
    }

     // Get the event status
    const now = moment();
    const start = moment(eventData.start_time);
    const end = moment(eventData.end_time);
    let eventStatus = "future";
    if (end.isBefore(now)) eventStatus = "past";
    else if (start.isSameOrBefore(now) && end.isSameOrAfter(now)) eventStatus = "ongoing";
    
    // Get all events to delete (for recurring)
    const eventsToDelete = await getEventsToDelete(eventData, deleteOption);
    
    // Delete associated invoices and transactions for each event
    let totalDeletedInvoices = 0;
    let totalDeletedTransactions = 0;
    
    for (const evId of eventsToDelete) {
      const invoiceResult = await deleteEventInvoicesAndTransactions(evId);
      if (invoiceResult.success) {
        totalDeletedInvoices += invoiceResult.deletedInvoices;
        totalDeletedTransactions += invoiceResult.deletedTransactions;
      }
    }
    
    if(eventData?.event_course_id?.event_ids.length < 2 || deleteOption == 'all'){
      const deletedContent = await deleteVersionedContent(eventData?.event_course_id?.content);
      // console.log(deletedContent,"deletedContent");
    }
  
    if (deleteOption === 'this_one') {
      if (eventData.will_repeat == false) {
        await EventCourse.findByIdAndDelete(eventData.event_course_id);
        await Event.findByIdAndDelete(eventId);
      } else {
        if (eventData.parent_event_id != null) {
          await EventCourse.updateOne({ id: eventData.event_course_id }, { $pull: { event_ids: eventData._id } });
        } else {
          await EventCourse.findByIdAndDelete(eventData.event_course_id);
        }
        await Event.findByIdAndDelete(eventId);
      }
    }
    else {
      if (eventData.parent_event_id == null) {
        allChildEvents = await Event.find({ parent_event_id: eventId }, { _id: 1 });
        await EventCourse.findByIdAndDelete(eventData.event_course_id);
        allChildEvents.push({ _id: eventData._id });
        await Event.deleteMany({ _id: allChildEvents });
      } else {
        // console.log(eventData.start_date,"eventData.start_date");
        const lastOccurrenceEventDate = await getLastRecurringDate(eventData);
        allUpcomingEvents = await Event.find({ start_date: { $gte: eventData.start_date }, parent_event_id: eventData.parent_event_id }, { _id: 1 });

        await EventCourse.updateOne({ id: eventData.event_course_id }, { $pull: { event_ids: { $in: allUpcomingEvents } } });
        await Event.deleteMany({ _id: allUpcomingEvents });
        await Event.updateOne({ _id: eventData.parent_event_id }, { $set: { 'recurring_info.0.recurring_until': lastOccurrenceEventDate } });
      }
    }

    let successMsg = "The event data is deleted successfully!";
    req.flash("success", successMsg);
    return res.status(200).json({
      success: true,
      redirectUrl: "page-reload",
      message: successMsg,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "page-reload",
      message: "Something went wrong, please try again later.",
    });
  }
}

async function deleteVersionedContent(dataToDelete = []) {
  const learningContentIds = [];
  const lessonIds = [];
  const slideIds = [];

  for (const item of dataToDelete) {
    const contents = item.content || [item]; // normalize nested or flat format

    for (const content of contents) {
      // LearningContent and Lesson IDs
      if (content.learning_content_id) {
        learningContentIds.push(new mysqlOrm.Types.ObjectId(content.learning_content_id));
      }

      if (content.lesson_id) {
        lessonIds.push(new mysqlOrm.Types.ObjectId(content.lesson_id));
      }

      // Collect Slide IDs
      if (Array.isArray(content.slides)) {
        for (const slide of content.slides) {
          if (slide.slide_id) {
            slideIds.push(new mysqlOrm.Types.ObjectId(slide.slide_id));
          }
        }
      }
    }
  }
  // Bulk delete
  const [deletedLC, deletedLessons, deletedSlides] = await Promise.all([
    LearningContentVersion.deleteMany({ _id: { $in: learningContentIds } }),
    LessonVersion.deleteMany({ _id: { $in: lessonIds } }),
    SlideVersion.deleteMany({ _id: { $in: slideIds } }),
  ]);

  return {
    deletedLearningContents: deletedLC.deletedCount,
    deletedLessonVersions: deletedLessons.deletedCount,
    deletedSlideVersions: deletedSlides.deletedCount,
  };
}

async function checkRecurringEvents(req, res){
  try {
    const { month, year } = req.body;
    let moment = res.locals.moment;
    
    const user_detail = res.locals.loggedUserInfo;
    const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;
    
    const userRole = user_detail.role;
    const obj = {
      parent_event_id: null, // This finds only parent events
      will_repeat: true,
      'recurring_info.repeat_indefinitely': true,
    };

    if (userRole === 2) {
      const tutorId = mysqlOrm.Types.ObjectId(user_detail._id);
      obj['$or'] = [
        { tutor_id: tutorId },
        { substitute_tutor_id: tutorId },
      ];
    } else if (userRole === 3) {
      obj['student_ids'] = mysqlOrm.Types.ObjectId(user_detail._id);
    }

    // This finds only parent events (parent_event_id: null)
    const parentEvents = await Event.find(
      obj,
      'parent_event_id tutor_id is_substitute_tutor substitute_tutor_id student_ids event_category_id event_location_id start_date end_time start_time duration  will_repeat public_note private_note status recurring_info'
    );

    const startOfMonth = moment({ year: Number(year), month: Number(month) - 1, day: 1 }).startOf('month');
    const endOfMonth = moment(startOfMonth).endOf('month');

    let createdEvents = 0;
    
    for (const parentEvent of parentEvents) {
      const lastOccurrenceEventDate = parentEvent.recurring_info[0].recurring_until;
      const recurringType = parentEvent.recurring_info[0].recurring_type;
      const intervalDays = recurringType === 'weekly' ? 7 : 14;
      const eventDuration = parentEvent.duration;

      // Find the last child event for this parent
      const lastOccurrence = await Event.findOne(
        { parent_event_id: parentEvent._id },
        '_id parent_event_id start_date start_time end_time'
      ).sort({ start_date: -1 });
      
      const recurringInfo = parentEvent.recurring_info[0];
      delete recurringInfo._id;
      
      // Start from the parent event's start time
      let nextDateTime = moment(parentEvent.start_time);

      // Debug: Check what child events already exist for this parent
      // console.log('=== Checking events for parent:', parentEvent._id, '===');
      const existingChildEvents = await Event.find({
        parent_event_id: parentEvent._id
      }).sort({ start_time: 1 });

      // console.log('Existing child events:', existingChildEvents.length);
      // existingChildEvents.forEach(child => {
      //   console.log(' -', child.start_time, 'ID:', child._id);
      // });

      // Skip the parent event date itself - it should not be recreated
      nextDateTime.add(intervalDays, 'days');

      while (nextDateTime.isSameOrBefore(endOfMonth) && (lastOccurrenceEventDate == null || nextDateTime.isSameOrBefore(moment(lastOccurrenceEventDate).endOf('day')))) {
        const startOfDay = nextDateTime.clone().startOf('day').toDate();
        const endOfDay = nextDateTime.clone().endOf('day').toDate();

        const existingEvent = await Event.findOne({
          parent_event_id: parentEvent._id,
          start_time: { $gte: startOfDay, $lte: endOfDay }
        });
        
        console.log("Checking date:", nextDateTime.format('YYYY-MM-DD'));
        console.log("Date range:", startOfDay, "to", endOfDay);
        console.log("Existing event:", existingEvent ? "FOUND" : "NOT FOUND");
        
        if (!existingEvent) {
          // console.log("CREATING NEW EVENT for:", nextDateTime.format('YYYY-MM-DD'));
          const nextStartTime = nextDateTime.clone().toDate();
          const nextEndTime = moment(nextStartTime).add(eventDuration, 'minutes').toDate();
          
          const newEvent = new Event({
            ...parentEvent.toObject(),
            _id: undefined,
            parent_event_id: parentEvent._id, // Set parent reference
            start_date: nextDateTime.clone().startOf('day').toDate(),
            start_time: nextStartTime,
            end_time: nextEndTime,
            will_repeat: true, // Child events should not repeat
            recurring_info: recurringInfo, // Child events should not have recurring info
            created_at: new Date(),
            updated_at: new Date(),
          });

          await newEvent.save();
          createdEvents++;
        }

        nextDateTime.add(intervalDays, 'days');
      }
    }

    return res.status(200).json({
      success: true,
      createdEvents,
      message: `${createdEvents} new events created.`,
    });

  } catch (err) {
    console.error("Error generating recurring events:", err);
    return res.status(500).json({ success: false, message: "Failed to generate recurring events" });
  }
}

async function fetchStudentPricing(req,res) {
  try {
    const {id} = req.body;
    if(id ==''){
      return res.status(200).json({ success: false, message: "Please select tutor first" });
    }
    const userData = await User.findById(id);
    const payroll = userData?.payroll[0]?.pay_rate_hourly_rate || 0;
    return res.status(200).json({ success: false, data:payroll });
  } catch (err) {
    console.error("Error generating recurring events:", err);
    return res.status(500).json({ success: false, message: "Failed to generate recurring events" });
  }
}
/**
 * clone an event. 
 * @param {*} req
 * @param {*} res
 */
async function cloneAnEvent(req, res) {
  try {
    const eventId = req.body.event_id_to_clone;
    const { moment } = res.locals; // Destructure moment from locals
    const numberOfRecurring = 1;
    const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;

    const eventToClone = await Event.findById(eventId).populate({
      path: "event_course_id",
      model: "event_courses",
    });

    if (!eventToClone) {
      return res.status(500).json({
        success: false,
        redirectUrl: "page-reload",
        message: "Something went wrong, Event not found.",
      });
    }

    // calculate event startDataTime & endDateTime
    let eventDateTimings = await calculateEventDateTime(moment, loggedUserSpecificTimezone, req.body.start_date, req.body.start_time, eventToClone.duration);

    req.body.start_time = eventDateTimings.startDateTimeUTC;
    req.body.end_time = eventDateTimings.endDateTimeUTC;

    // create possible startDataTime & endDateTime combination on the basics of number of recurrence of an event.
    let eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);

    if (eventDatesArray.length == 0) {
      return res.status(500).json({
        success: false,
        flag: 'eventDatesArray',
        redirectUrl: 'page-reload',
        message: "Something went wrong, try again later.",
      });
    }

    const event_substitute_tutor_id = eventToClone.substitute_tutor_id != null ? eventToClone.substitute_tutor_id.toString() : null
    const eventConflicts = await checkEventConflict(eventToClone.tutor_id.toString(), event_substitute_tutor_id, eventToClone.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment);

    if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
      return res.status(500).json({
        success: false,
        flag: 'scheduleEventConflict',
        conflictMessage: eventConflicts.conflictBlockHtml,
        totalConflicts: eventConflicts.total,
        message: "The event conflict is raised, please resolve it.",
      });
    }

    // Clone the event_course data (if it exists)

    let clonedEventCourse;
    if (eventToClone.event_course_id) {
      const eventCourseToClone = eventToClone.event_course_id;
      const contentToClone = await cloneContentToVersions(eventCourseToClone.content);
      clonedEventCourse = new EventCourse({
        ...eventCourseToClone._doc, // Clone event_course properties
        _id: undefined, // Set _id to undefined for new document
        event_ids: [],
        content:contentToClone,
        percentage: 0,
      });
      // Deep clone the content array with modifications
      clonedEventCourse.content = JSON.parse(
        JSON.stringify(contentToClone.map((content) => ({
          ...content,
          status: "N/A",
          is_skipped: false,
          slides: content.slides.map((slide) => ({
            slide_id: slide.slide_id, // Maintain slide_id reference
            attached_event_id: null,
            mark_as_read: null,
            mark_at: null,
          })),
          slide_score: 0,
        })))
      );

      // console.log(clonedEventCourse.content,"clonedEventCourse.content");
      await clonedEventCourse.save(); // Save the cloned event_course
    }

    // Set the cloned event_course reference (if applicable)
    if (clonedEventCourse) {
      // Clone the event object with a new mysqlOrm object to avoid reference issues
      const clonedEvent = new Event({
        ...eventToClone._doc, // Spread operator to copy all properties
        _id: undefined, // Set _id to undefined for new document
        event_course_id: clonedEventCourse._id,
        event_attendance_id: null,
        parent_event_id: null,
        start_date: req.body.start_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        status: "N/A",
        comment: '',
        public_note: '',
        private_note: '',
        will_repeat: false,
        recurring_info: [],
        ignore_conflict: req.body.ignore_conflict == '1' ? true : false,
        isDeleted: false,
        deleted_at: null,
      });

      clonedEvent.event_course = clonedEventCourse._id;
      const savedEvent = await clonedEvent.save();
      await EventCourse.findByIdAndUpdate({ _id: clonedEventCourse._id }, { $push: { event_ids: savedEvent._id } });
      let successMsg = "The event cloned successfully";
      req.flash("success", successMsg);
      return res.status(201).json({
        success: true,
        redirectUrl: "page-reload",
        message: successMsg,
      });
    } else {
      return res.status(500).json({
        success: false,
        flag: 'eventCourseIssue',
        redirectUrl: 'page-reload',
        message: "Something went wrong, try again later.",
      });
    }
  } catch (error) {
    console.log(error);
    // return res.status(500).json({
    //   success: false,
    //   redirectUrl: "page-reload",
    //   message: "Something went wrong, Error during cloning event.",
    // });
  }
}

async function cloneContentToVersions(content = []) {
  const learningContentMap = new Map();
  const lessonMap = new Map();
  const slideMap = new Map();

  const updatedContent = [];

  for (const item of content) { 
    // ====== CLONE LEARNING CONTENT ======
    const lcKey = item.learning_content_id.toString();
    let learningContentVersion = learningContentMap.get(lcKey);
    let newContentDirectory = "";
    let oldContentDirectory = "";
    
    if (!learningContentVersion) {
      const learningContent = await LearningContentVersion.findById(lcKey);
      if (!learningContent) throw new Error(`LearningContent not found: ${lcKey}`);

      // create folder of content directory

      const randomString = randomStr.generate({
        length: 8,
        charset: "alphabetic",
      });
      newContentDirectory = "lc_" + randomString + Date.now();
      
      if (!fs.existsSync("./assets/LearningContent")) {
        fs.mkdirSync("./assets/LearningContent", { recursive: true });
      }

      const dir = "./assets/LearningContent/" + newContentDirectory;
      await fs.mkdir(dir, (error) => {
        console.log(error);
      });
      oldContentDirectory = learningContent.content_directory;

      let contentThumbnail = "";
      if (learningContent.thumbnail != "" && learningContent.thumbnail != null) {
        let thumbnail = learningContent.thumbnail.split("-");
        thumbnail[0] = Date.now();
        contentThumbnail = thumbnail.join("-");
        
        globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${learningContent.thumbnail}`,`./assets/LearningContent/${newContentDirectory}/${contentThumbnail}`);
      }

      learningContentVersion = await LearningContentVersion.create({
        ...learningContent.toObject(),
        thumbnail: contentThumbnail,
        content_directory: newContentDirectory,
        original_id: learningContent._id,
        lesson_ids: [],
        _id: undefined,
      });

      learningContentMap.set(lcKey, learningContentVersion);
    }

    // ====== CLONE LESSON ======
    const lessonKey = item.lesson_id.toString();
    let lessonVersion = lessonMap.get(lessonKey);

    if (!lessonVersion) {
      const lesson = await LessonVersion.findById(lessonKey);
      if (!lesson) throw new Error(`Lesson not found: ${lessonKey}`);

      lessonVersion = await LessonVersion.create({
        ...lesson.toObject(),
        original_id: lesson._id,
        slide_ids: [],
        practice_ids: [],
        challenge_ids: [],
        _id: undefined,
      });

      lessonMap.set(lessonKey, lessonVersion);

      // Add cloned lesson to learningContentVersion.lesson_ids
      learningContentVersion.lesson_ids.push(lessonVersion._id);
      await learningContentVersion.save();
    }

    // ====== CLONE SLIDES ======
    const updatedSlides = [];

    for (const slide of item.slides) {
      const slideKey = slide.slide_id.toString();
      let slideVersion = slideMap.get(slideKey);

      if (!slideVersion) {
        const originalSlide = await SlideVersion.findById(slideKey);
        if (!originalSlide) throw new Error(`Slide not found: ${slideKey}`);

        let newAttachment = (video = "");
        if (originalSlide.attachments[0] != "" && originalSlide.attachments[0] != null && originalSlide.attachments[0] != undefined) {
          let attachment = originalSlide.attachments[0].split("-");
          attachment[0] = Date.now();
          newAttachment = attachment.join("-");

          globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalSlide.attachments[0]}`,`./assets/LearningContent/${newContentDirectory}/${newAttachment}`);
        }

        if (originalSlide.video != "" && originalSlide.video != null && originalSlide.video != undefined) {
          let videoName = originalSlide.video.split("-");
          videoName[0] = Date.now();
          video = videoName.join("-");

          globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalSlide.video}`,`./assets/LearningContent/${newContentDirectory}/${video}`);
        }        
        
        slideVersion = await SlideVersion.create({
          ...originalSlide.toObject(),
          video_url: originalSlide.video_url,
          video: video,
          attachments: newAttachment,
          content_directory: newContentDirectory,
          original_id: originalSlide._id,
          _id: undefined,
        });

        slideMap.set(slideKey, slideVersion);

        // Add cloned slide to lessonVersion.slide_ids
        lessonVersion.slide_ids.push(slideVersion._id);
      }

      // If `slide` is a mysqlOrm doc, convert to plain object
      const plainSlide = slide.toObject?.() ?? slide;

      updatedSlides.push({
        ...plainSlide,
        slide_id: slideVersion._id,
      });
    }

    await lessonVersion.save();

    // ====== FINAL STRUCTURE ======
    const plainItem = item.toObject?.() ?? item;

    updatedContent.push({
      ...plainItem,
      learning_content_id: learningContentVersion._id,
      lesson_id: lessonVersion._id,
      slides: updatedSlides,
    });
  }

  // Optional: print formatted output
  // console.log(JSON.stringify(updatedContent, null, 2));

  return updatedContent;
}



/**
 * cancel an event.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function cancelThisEvent(req, res) {
  try {
    const { eventId, status, cancelNoteForTutor, cancelWholeDay, eventIds,sendEmail,sendSMS } = req.body;
    const { moment, loggedUserInfo } = res.locals;
    let successMsg = '';
    let requestObject;
    const shouldSendEmail = sendEmail == 1 || sendEmail == '1' || sendEmail === true;

    const shouldSendSMS = sendSMS == 1 || sendSMS == '1' || sendSMS === true;

    if (status === 'Requested_To_Cancel') {
      successMsg = "The event cancellation request was sent to admin successfully!";
      requestObject = { status: status, comment: cancelNoteForTutor };
      if (cancelWholeDay === '1' || cancelWholeDay === 'true' || cancelWholeDay === true) {
        requestObject.cancel_requested_whole_day = true;
      }
    } else {
      if (status === 'Cancelled') {
        successMsg = "The event cancellation request is approved!";
      }

      if (status === 'Rejected') {
        successMsg = "The event cancellation request is rejected!";
      }
      requestObject = { status: status };
    }

    const ids = eventIds
      ? (Array.isArray(eventIds) ? eventIds : [eventIds])
      : [eventId];




    let result;
    if (status === 'Requested_To_Cancel' &&
      (cancelWholeDay === '1' || cancelWholeDay === 'true' || cancelWholeDay === true)) {
      const eventDetails = await Event.findById(eventId);
      if (!eventDetails) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }

      const startDay = moment(eventDetails.start_date).startOf('day').toDate();
      const endDay = moment(eventDetails.start_date).endOf('day').toDate();

      result = await Event.updateMany(
        {
          tutor_id: eventDetails.tutor_id,
          start_date: { $gte: startDay, $lte: endDay },
          status: { $nin: ['Cancelled', 'Rejected'] },
          isDeleted: false,
        },
        requestObject
      );
    } else {
      const query = {
        _id: ids.length === 1 ? ids[0] : { $in: ids },
        ...(status === 'Cancelled' || status === 'Rejected' ? { status: 'Requested_To_Cancel' } : {}),
      };

      if (ids.length === 1) {
        result = await Event.findOneAndUpdate(query, requestObject, { new: true });
      } else {
        result = await Event.updateMany(query, requestObject);
      }
    }

    if (!result || (Array.isArray(ids) && ids.length > 1 && result.matchedCount === 0)) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Handle email sending for whole-day cancellation requests
    if (status === 'Requested_To_Cancel' &&
      (cancelWholeDay === '1' || cancelWholeDay === 'true' || cancelWholeDay === true)) {
      const eventDetails = await Event.findById(eventId);
      const startDay = moment(eventDetails.start_date).startOf('day').toDate();
      const endDay = moment(eventDetails.start_date).endOf('day').toDate();

      const allDayEvents = await Event.find({
        tutor_id: eventDetails.tutor_id,
        start_date: { $gte: startDay, $lte: endDay },
        status: 'Requested_To_Cancel',
        cancel_requested_whole_day: true,
        isDeleted: false,
      });

      for (const event of allDayEvents) {
        const eventDateTime = moment(event.start_time).format('DD MMM YYYY hh:mm A');
        const relatedLink = globalHelper.baseUrl(req) + `/calendar/cancelled-events/${event._id}`;
        const tutorRequestTemplate = await MailTemplates.cancelEventRequestToAdmin(loggedUserInfo, relatedLink, eventDateTime, cancelNoteForTutor);

        await mail.transporter.sendMail({
          from: loggedUserInfo.email,
          to: process.env.APP_EMAIL,
          subject: tutorRequestTemplate.subject,
          html: tutorRequestTemplate.message,
        });
      }
    } else if (status === 'Cancelled' || status === 'Rejected') {
      // Handle bulk and single approval/rejection
      const eventsToNotify = await Event.find({
        _id: ids.length === 1 ? ids[0] : { $in: ids },
        isDeleted: false,
      })
        .populate('student_ids', 'first_name last_name email')
        .populate('tutor_id', 'first_name last_name email')
        .populate('substitute_tutor_id', 'first_name last_name email');

      for (const event of eventsToNotify) {
        const eventDate = moment(event.start_time).format('DD MMM YYYY hh:mm A');
        const isSubstituteTutor = event.is_substitute_tutor;
        const tutor = isSubstituteTutor ? event.substitute_tutor_id : event.tutor_id;
        const tutorEmail = tutor?.email;
        const tutorName = `${tutor?.first_name || ''} ${tutor?.last_name || ''}`.trim();

        if (status === 'Cancelled') {
          // Send email to parents and tutor
          const studentIds = event.student_ids.map(student => student._id ? student._id : student);
          const familyContacts = await FamilyContacts.find({
            student_id: { $in: studentIds },
            isDeleted: false,
          }).populate('user_id', 'first_name last_name email');

          const parentEmails = [...new Set(
            familyContacts
              .map(contact => contact.user_id?.email)
              .filter(email => email && email.trim())
          )];

          const [parentTemplate, tutorTemplate] = await Promise.all([
            MailTemplates.cancelEventNotifyToUser(eventDate, tutorName),
            MailTemplates.cancelEventReplyToTutor(status, eventDate, tutorName)
          ]);

          const mailTasks = [];
          if (shouldSendEmail && parentEmails.length > 0) {

            const parentMailOptions = {
              from: process.env.APP_EMAIL,
              to: parentEmails.join(','),
              subject: parentTemplate.subject,
              html: parentTemplate.message,
            };

            const parentMailResponse =
              await mail.transporter.sendMail(parentMailOptions);

            // Create notification only for parent email
            for (const studentId of event.student_ids) {

              await createNotification({
                student_id: studentId,
                type: "Email",

                subject:
                  parentTemplate?.subject ||
                  "Class Cancellation Notification",

                messageBody:
                  parentTemplate?.message ||
                  "Your scheduled class has been cancelled.",

                slug: "cancel-event-notification-to-user",

                receiver: {
                  email: parentEmails.join(','),
                  name: "Parents",
                },

                sender: {
                  email: process.env.APP_EMAIL,
                  name: process.env.APP_NAME || "System",
                },

                status: parentMailResponse ? "sent" : "unsent",

                meta: {
                  eventId: event._id,
                  eventStatus: status,
                },

                sentAt: new Date(),
              });

            }
          }

          if (tutorEmail) {
            mailTasks.push(
              mail.transporter.sendMail({
                from: process.env.APP_EMAIL,
                to: tutorEmail,
                subject: tutorTemplate.subject,
                html: tutorTemplate.message,
              })
            );
          }

          if (mailTasks.length > 0) {
            await Promise.all(mailTasks);
          }

          /**
          * -----------------------
          * SMS Sending Logic
          * -----------------------
          */
         if (shouldSendSMS) {
          const smsTasks = [];
          const processedNumbers = new Set();

          for (const contact of familyContacts) {

            const phoneFields = [
              contact.mobile_number,
              contact.home_number,
              contact.work_number
            ];

            for (const num of phoneFields) {

              if (num?.sms_capable && num?.phone) {

                const fullNumber =
                  `+${num.dial_code ?? ''}${num.phone}`.replace(/\s+/g, '');

                // Avoid duplicate SMS
                if (!processedNumbers.has(fullNumber)) {

                  processedNumbers.add(fullNumber);

                  smsTasks.push(
                    smsService.sendCancelEventSMS(
                      event,
                      familyContacts,
                      fullNumber,
                      eventDate,
                      tutorName
                    )
                  );
                }
              }
            }
          }

          // Send all SMS in parallel
          if (smsTasks.length > 0) {
            await Promise.all(smsTasks);
          }
        }
        } else if (status === 'Rejected') {
          // Send rejection email to tutor
          const tutorTemplate = await MailTemplates.cancelEventReplyToTutor(status, eventDate, tutorName);
          if (tutorEmail) {
            await mail.transporter.sendMail({
              from: process.env.APP_EMAIL,
              to: tutorEmail,
              subject: tutorTemplate.subject,
              html: tutorTemplate.message,
            });
          }
        }
      }
    } else if (ids.length === 1) {
      const mainEventId = eventId || ids[0];
      const eventDetails = await Event.findById(mainEventId);

      if (!eventDetails) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const eventDate = moment(eventDetails.start_time).format('DD MMM YYYY hh:mm A');

      if (status === 'Requested_To_Cancel') {
        const relatedLink = globalHelper.baseUrl(req) + `/calendar/cancelled-events/${mainEventId}`;
        const tutorRequestTemplate = await MailTemplates.cancelEventRequestToAdmin(loggedUserInfo, relatedLink, eventDate, cancelNoteForTutor);

        await mail.transporter.sendMail({
          from: loggedUserInfo.email,
          to: process.env.APP_EMAIL,
          subject: tutorRequestTemplate.subject,
          html: tutorRequestTemplate.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      redirectUrl: "page-reload",
      message: successMsg,
    });
  } catch (error) {
    console.error("cancelThisEvent error: ", error);

    let message = "Internal Server Error";

    if (error.code === "EAUTH") {
      message = "Event status updated successfully. However, email notifications could not be delivered.";
    }

    return res.status(500).json({
      success: false,
      redirectUrl: "page-reload",
      message
    });
  }


}

/**
 * cancelled events list.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function cancelEventListing(req, res) {
  try {
    const { tutor, student, dateRangeBlock, requestedEventId, search } = req.body;
    const { draw, start, length } = req.body;
    const { moment } = res.locals;

    const searchFilter = search.value
      ? { name: new RegExp(search.value, 'i') }
      : {};

    const userDetail = res.locals.loggedUserInfo;
    const userRole = userDetail.role;
    const userId = userDetail._id.toString();

    // Build query object
    const query = {};
    if (tutor) {
      query.tutor_id = mysqlOrm.Types.ObjectId(tutor);
    } else if (userRole === 2) {
      query.$or = [
        { tutor_id: userId },
        { substitute_tutor_id: userId }
      ];
    }

    if (requestedEventId && requestedEventId.length === 12) {
      query._id = mysqlOrm.Types.ObjectId(requestedEventId);
    }

    if (dateRangeBlock) {
      const [startDateStr, endDateStr] = dateRangeBlock.split('-').map(date => date.trim());

      // Parse dates using moment and normalize to start and end of day
      const startDate = moment(startDateStr).startOf('day').toDate();
      const endDate = moment(endDateStr).endOf('day').toDate();

      // Log for debugging
      query.start_time = { $gte: startDate, $lte: endDate };
    }

    query.status = { $in: ['Requested_To_Cancel', 'Rejected', 'Cancelled'] };

    // Perform query and populate fields
    const [recordsTotal, recordsFiltered] = await Promise.all([
      Event.countDocuments({ ...query, ...searchFilter }),
      Event.countDocuments({ ...query, ...searchFilter })
    ]);

const results = await Event.aggregate([
  {
    $match: { ...query, ...searchFilter }
  },

  // Put Requested_To_Cancel records first
  {
    $addFields: {
      statusPriority: {
        $cond: [
          { $eq: ["$status", "Requested_To_Cancel"] },
          1,
          2
        ]
      }
    }
  },

  // Populate tutor_id
  {
    $lookup: {
      from: "users",
      localField: "tutor_id",
      foreignField: "_id",
      as: "tutor_id"
    }
  },

  {
    $unwind: {
      path: "$tutor_id",
      preserveNullAndEmptyArrays: true
    }
  },

  // Populate substitute_tutor_id
  {
    $lookup: {
      from: "users",
      localField: "substitute_tutor_id",
      foreignField: "_id",
      as: "substitute_tutor_id"
    }
  },

  {
    $unwind: {
      path: "$substitute_tutor_id",
      preserveNullAndEmptyArrays: true
    }
  },

  // Exact response format
  {
    $project: {
      _id: 1,

      tutor_id: {
        _id: "$tutor_id._id",
        first_name: "$tutor_id.first_name",
        last_name: "$tutor_id.last_name",
        id: {
          $toString: "$tutor_id._id"
        }
      },

     substitute_tutor_id: {
      $cond: [
        { $ifNull: ["$substitute_tutor_id._id", false] },
        {
          _id: "$substitute_tutor_id._id",
          first_name: "$substitute_tutor_id.first_name",
          last_name: "$substitute_tutor_id.last_name",
          id: {
            $toString: "$substitute_tutor_id._id"
          }
        },
        null
      ]
    },

      start_time: 1,
      end_time: 1,
      status: 1,
      comment: 1,
      updated_at: 1,
      statusPriority: 1
    }
  },

  // Requested_To_Cancel first, then latest updated records
  {
    $sort: {
      statusPriority: 1,
      updated_at: -1
    }
  },

  {
    $skip: Number(start)
  },

  {
    $limit: Number(length)
  }
]);

  res.json({
      draw,
      recordsFiltered,
      recordsTotal,
      data: results
    });
  } catch (error) {
    console.error('Error in cancelEventListing:', error);
    res.status(500).send({ error: 'An error occurred while processing your request.' });
  }
}

//-------------- Related Functions ---------------------------------------

/**
 * updateOneDayEvent
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateOneDayEvent(req, res, eventData) {
  try {
    const eventId = req.body.event_id;
    const { moment } = res.locals;
    let allEventIds = [];
    let ignoredEventIds = [];
    let numberOfRecurring = req.body.recurring_info.no_of_recurring;
    ignoredEventIds.push(eventData._id);

    const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;

    eventDateTimings = await calculateEventDateTime(moment, loggedUserSpecificTimezone, req.body.start_date, req.body.start_time, req.body.duration);
    req.body.start_time = eventDateTimings.startDateTimeUTC;
    req.body.end_time = eventDateTimings.endDateTimeUTC;

    // create possible startDataTime & endDateTime combination on the basics of number of recurrence of an event.
    eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);

    const eventConflicts = await reviewEventConflictOnUpdate(eventId, req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds);

    if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
      return {
        success: false,
        flag: 'scheduleEventConflict',
        conflictMessage: eventConflicts.conflictBlockHtml,
        totalConflicts: eventConflicts.total,
        message: "The event conflict is raised, please resolve it.",
      };
    } else {
      //-- On One-Day Event Update, If Event is still one-day event, other form data is changed.
      if (!req.body.will_repeat) {
        const updatedEvent = await Event.findByIdAndUpdate(eventId, req.body);
        allEventIds.push(updatedEvent._id);
        // Update event course if it exists
        await upsertEventCourse(req, res, eventData.event_course_id, allEventIds);
        return { success: true, message: "Event updated successfully." };
      }  // button showed & clicked `this_one_only`. 

      //-- On One-Day Event Update, If Event is changed to recurring event.
      if (req.body.will_repeat == '1') {
        // inserting new recurring events.         
        const parentEventId = eventData.id;
        const allEventIds = await eventsManipulation(req, res, parentEventId, numberOfRecurring, moment);
        // Update event course if it exists
        await upsertEventCourse(req, res, eventData.event_course_id, allEventIds);

        return { success: true, message: "Event updated successfully." };
      } // button showed & clicked  `this_one_only`.
    }
  } catch (error) {
    console.error(error, "=updateOneDayEvent=");
    return { success: false, message: error };
  }
}

/**
 * updateRecurringEvent
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateRecurringEvent(req, res, eventData, repeatIndefinitely) {
  try {
    const eventId = req.body.event_id;
    const { moment } = res.locals;
    let recurringInfoChanged = false;
    let allEventIds = [];
    let ignoredEventIds = [];
    let old_recurring_info;
    let form_recurring_info;
    let numberOfRecurring = req.body.recurring_info.no_of_recurring;
    const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;

    ignoredEventIds.push(eventData._id);
    eventDateTimings = await calculateEventDateTime(moment, loggedUserSpecificTimezone, req.body.start_date, req.body.start_time, req.body.duration);
    req.body.start_time = eventDateTimings.startDateTimeUTC;
    req.body.end_time = eventDateTimings.endDateTimeUTC;

    // console.log(eventData.will_repeat == false && !req.body.will_repeat);
    // console.log(eventData.will_repeat == false && req.body.will_repeat == '1');
    // console.log(!req.body.will_repeat && eventData.parent_event_id == null);
    // console.log(!req.body.will_repeat && eventData.parent_event_id != null);

    // Event changed to One day event.
    if (!req.body.will_repeat) {
      // create possible startDataTime & endDateTime combination on the basics of number of recurrence of an event.
      eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);

      const eventConflicts = await reviewEventConflictOnUpdate(eventId, req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds);

      if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
        return {
          success: false,
          flag: 'scheduleEventConflict',
          conflictMessage: eventConflicts.conflictBlockHtml,
          totalConflicts: eventConflicts.total,
          message: "The event conflict is raised, please resolve it.",
        };
      } else {
        //-- On Recurring Event Update, If PARENT Recurring Event is changed to One-Day event.
        if (eventData.parent_event_id == null) {
          req.body.will_repeat = false;
          req.body.recurring_info = [];
          await Event.findByIdAndUpdate(eventData.id, req.body);
          allEventIds.push(eventData._id);
          const allChildEvents = await Event.find({ parent_event_id: eventData._id }, { _id: 1 });
          await Event.deleteMany({ _id: allChildEvents });
         await upsertEventCourse(req, res, eventData.event_course_id, allEventIds);

          return { success: true, message: "Event updated successfully." };
        } // button showed & clicked `this_one_only`

        //-- On Recurring Event Update, If CHILD Recurring Event is changed to One-Day event.
        if (eventData.parent_event_id != null) {
          let allChildEventIds = [];
          if (eventData.parent_event_id && eventData.parent_event_id._id) {
            allChildEventIds = await Event.find({ 
              _id: { $ne: eventData._id }, 
              parent_event_id: eventData.parent_event_id._id 
            }, { _id: 1 });
          }

          if (eventData.parent_event_id && eventData.parent_event_id._id) {
            allChildEventIds.push({ _id: eventData.parent_event_id._id });
          }
          allEventIds.push(...allChildEventIds);

          const newRecurringValue = eventData.recurring_info[0].no_of_recurring > 1 ? parseInt(eventData.recurring_info[0].no_of_recurring) - 1 : 1;

          if (eventData.event_course_id) {
            await EventCourse.updateOne({ _id: eventData.event_course_id._id || eventData.event_course_id }, { $pull: { event_ids: { $in: eventData._id } } });
          }
          await Event.updateMany({ _id: { $in: allEventIds } }, { $set: { 'recurring_info.0.no_of_recurring': newRecurringValue } });

          allEventIds = [];
          allEventIds.push(eventData._id);
          const createdEventCourseId = await storeEventCourse(req, res, allEventIds);
          req.body.parent_event_id = null;
          req.body.event_course_id = createdEventCourseId;
          req.body.status = "N/A";
          req.body.will_repeat = false;
          req.body.recurring_info = [];
          const updatedEvent = await Event.findByIdAndUpdate({ _id: eventData._id }, req.body);

          return { success: true, message: "Event updated successfully." };
        }  // button showed & clicked `this_one_only`.
      }
    }

    //----------------- Check recurring info is changed or not!!-----------------------------------
    // On Recurring event update, Check submitted recurring info is still with original event.
    if (req.body.will_repeat == '1') {
      old_recurring_info = {
        recurring_type: eventData.recurring_info[0].recurring_type,
        no_of_recurring: eventData.recurring_info[0].no_of_recurring,
        repeat_indefinitely: eventData.recurring_info[0].repeat_indefinitely,
      };

      form_recurring_info = {
        recurring_type: req.body.recurring_type,
        no_of_recurring: parseInt(numberOfRecurring),
        repeat_indefinitely: repeatIndefinitely,
      }

      // console.log(old_recurring_info, 'old_recurring_info');
      // console.log(form_recurring_info, 'form_recurring_info');

      if (JSON.stringify(old_recurring_info) === JSON.stringify(form_recurring_info)) {
        recurringInfoChanged = false;
      } else {
        recurringInfoChanged = true;
      }

      // console.log('recurringInfoChanged => No', req.body.will_repeat == '1' && !recurringInfoChanged);
      // console.log('recurringInfoChanged => YES', req.body.will_repeat == '1' && recurringInfoChanged);
    }

    //----- get event Ids which will be ignored during the conflict check. 
    if (eventData.parent_event_id == null) {
      let allRelatedIds = await Event.find({ parent_event_id: eventData._id }, { _id: 1 }).lean();
      const objectIdsArray = allRelatedIds.map(doc => doc._id);
      ignoredEventIds = [...ignoredEventIds, ...objectIdsArray];
    } else {
      // Get parent event ID safely with null checks
      let parentEventId = null;
      let parentEventIdStr = null;

      // Check if parent_event_id exists and is not null/undefined
      if (eventData.parent_event_id) {
        try {
          // Handle different possible formats
          if (eventData.parent_event_id instanceof mysqlOrm.Types.ObjectId) {
            parentEventId = eventData.parent_event_id;
            parentEventIdStr = parentEventId.toString();
          } else if (typeof eventData.parent_event_id === 'object' && eventData.parent_event_id._id) {
            parentEventId = eventData.parent_event_id._id;
            parentEventIdStr = parentEventId.toString();
          } else if (typeof eventData.parent_event_id === 'string' && mysqlOrm.Types.ObjectId.isValid(eventData.parent_event_id)) {
            parentEventId = mysqlOrm.Types.ObjectId(eventData.parent_event_id);
            parentEventIdStr = eventData.parent_event_id;
          }
        } catch (error) {
          console.error('Error parsing parent_event_id:', error);
          parentEventId = null;
          parentEventIdStr = null;
        }
      }
  
  // Only proceed if we have a valid parentEventId
  if (parentEventId && parentEventIdStr) {
    // Add parent ID to ignored list
    if (!ignoredEventIds.includes(parentEventIdStr)) {
      ignoredEventIds.push(parentEventIdStr);
    }
    
    // Find related events
    try {
      let allRelatedIds = await Event.find({ 
        _id: { $ne: mysqlOrm.Types.ObjectId(eventData._id) }, 
        parent_event_id: parentEventId 
      }, { _id: 1 }).lean();
      
      const objectIdsArray = allRelatedIds.map(doc => doc._id.toString());
      ignoredEventIds = [...ignoredEventIds, ...objectIdsArray];
    } catch (error) {
      console.error('Error finding related events:', error);
    }
  }
    }

    //-- On Recurring Event Update, If RECURRING Event's will_repeat & recurring_info is still SAME, No matter other data changed or not (`recurringInfoChanged` is false).
    if (req.body.will_repeat == '1' && !recurringInfoChanged) {
      if (req.body.update_option === 'this_one_only') {
        eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);
        const eventConflicts = await reviewEventConflictOnUpdate(eventId, req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds);

        if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
          return {
            success: false,
            flag: 'scheduleEventConflict',
            conflictMessage: eventConflicts.conflictBlockHtml,
            totalConflicts: eventConflicts.total,
            message: "The event conflict is raised, please resolve it.",
          };
        } else {
          updatedEvent = await Event.findByIdAndUpdate(eventId, req.body);

          // Only this event should get the new content.
          const courseIdStr = eventData.event_course_id?._id
            ? eventData.event_course_id._id.toString()
            : eventData.event_course_id?.toString();

          let isSharedWithOthers = false;
          let existingCourse = null;

          if (courseIdStr) {
            existingCourse = await EventCourse.findById(courseIdStr, { event_ids: 1 });
            if (existingCourse) {
              isSharedWithOthers = existingCourse.event_ids
                .filter(id => id.toString() !== eventData._id.toString()).length > 0;
            }
          }


            if (isSharedWithOthers) {
            
            const emptyCourse = await EventCourse.create({
              event_ids: [eventData._id],
              content: [],
            });

            const updatedCourse = await updateEventCourse(req, res, emptyCourse._id, [eventData._id]);

            if (updatedCourse) {
              await Event.findByIdAndUpdate(eventData._id, { event_course_id: emptyCourse._id });

              if (courseIdStr) {
                await EventCourse.findByIdAndUpdate(courseIdStr, {
                  $pull: { event_ids: eventData._id }
                });
              }
            } else {
              console.error('Failed to detach event content for event:', eventData._id);
              await EventCourse.findByIdAndDelete(emptyCourse._id);
            }
          } else {
           
            await upsertEventCourse(req, res, eventData.event_course_id, [eventData._id]);
          }

          return { success: true, message: "Event updated successfully." };
        }
      } // clicked `this_one_only`. 

      if (req.body.update_option === 'this_one_and_future') {

        if (eventData.parent_event_id == null) {
          eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);

          const eventConflicts = await reviewEventConflictOnUpdate(eventId, req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds);

          if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
            return {
              success: false,
              flag: 'scheduleEventConflict',
              conflictMessage: eventConflicts.conflictBlockHtml,
              totalConflicts: eventConflicts.total,
              message: "The event conflict is raised, please resolve it.",
            };
          } else {
            relatedChildEvents = await Event.find({ parent_event_id: eventData._id }, { _id: 1 });

            await EventCourse.findByIdAndUpdate(eventData.event_course_id, { $pull: { event_ids: { $in: relatedChildEvents } } });
            await Event.deleteMany({ _id: relatedChildEvents });

            // inserting the new recurring events & updating course data universal.
            const recurring_info = {
              recurring_type: eventData.recurring_info[0].recurring_type,
              no_of_recurring: eventData.recurring_info[0].no_of_recurring,
              repeat_indefinitely: eventData.recurring_info[0].repeat_indefinitely,
            };

            req.body.recurring_info = recurring_info;
            req.body.event_course_id = eventData.event_course_id;

            allEventIds = await eventsManipulation(req, res, eventData.id, numberOfRecurring, moment);
            await upsertEventCourse(req, res, eventData.event_course_id, allEventIds);


            return { success: true, message: "Event updated successfully." };
          }

        } else {
          if (eventData.parent_event_id && eventData.parent_event_id._id) {
            upcomingChildEvents = await Event.find({ 
              parent_event_id: eventData.parent_event_id._id, 
              start_date: { $gt: eventData.start_date } 
            }, { _id: 1 });
          } else {
            upcomingChildEvents = [];
          }

          numberOfRecurring = upcomingChildEvents.length > 0 ? upcomingChildEvents.length : 1;
          eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);

          const eventConflicts = await reviewEventConflictOnUpdate(eventId, req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds);

          if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
            return {
              success: false,
              flag: 'scheduleEventConflict',
              conflictMessage: eventConflicts.conflictBlockHtml,
              totalConflicts: eventConflicts.total,
              message: "The event conflict is raised, please resolve it.",
            };
          } else {
            if (upcomingChildEvents.length > 0) {
              await EventCourse.findByIdAndUpdate(eventData.event_course_id, { $pull: { event_ids: { $in: upcomingChildEvents } } });
              await Event.deleteMany({ _id: upcomingChildEvents });
              upcomingChildEvents.push(eventData._id);

              // inserting the new child recurring events & updating course data universal.
              const recurring_info = {
                recurring_type: eventData.recurring_info[0].recurring_type,
                no_of_recurring: eventData.recurring_info[0].no_of_recurring,
                repeat_indefinitely: eventData.recurring_info[0].repeat_indefinitely,
              };

              req.body.recurring_info = recurring_info;
              req.body.event_course_id = eventData.event_course_id;

              for (let i = 0; i < upcomingChildEvents.length; i++) {
                try {
                  if (i == 0) {
                    updatedCurrentEvent = await Event.findByIdAndUpdate(eventData.id, req.body);
                    allEventIds.push(updatedCurrentEvent._id);
                  }

                  if (i != 0) {
                    req.body.parent_event_id = eventData.parent_event_id.id;

                    if (req.body.recurring_type == "weekly") {
                      req.body.start_date = moment(req.body.start_date).add(7, "days");
                      req.body.start_time = moment(req.body.start_time).add(7, "days");
                      req.body.end_time = moment(req.body.end_time).add(7, "days");
                    } else {
                      req.body.start_date = moment(req.body.start_date).add(14, "days");
                      req.body.start_time = moment(req.body.start_time).add(14, "days");
                      req.body.end_time = moment(req.body.end_time).add(14, "days");
                    }
                    let createdEvent = await Event.create(req.body);
                    allEventIds.push(createdEvent._id);
                  }
                } catch (error) {
                  console.error(`Error creating event ${i + 1}:`, error);
                  // Consider logging details and notifying the user about partial success (optional)
                }
              }

              if (eventData.event_course_id) {
                await EventCourse.findByIdAndUpdate(
                  { _id: eventData.event_course_id._id || eventData.event_course_id },
                  { $push: { event_ids: { $each: allEventIds } } }
                );
              }
              await upsertEventCourse(req, res, eventData.event_course_id, allEventIds);

              return { success: true, message: "Event updated successfully." };
            } else {
              // that means this event is The Last Event of recurrence.
              updatedChildEvent = await Event.findByIdAndUpdate(eventId, req.body);
              await upsertEventCourse(req, res, eventData.event_course_id, [eventData._id]);

              return { success: true, message: "Event updated successfully." };
            }
          }
        }
      } // clicked `this_one_and_future`.      
    }  // button showed `this_one_and_future` & `this_one_only`.

    //-- On Recurring Event Update, If RECURRING Event's will_repeat is still TRUE But Recurring Information is changed, No matter other data changed or not (`recurringInfoChanged` is true).   
    if (req.body.will_repeat == '1' && recurringInfoChanged) {
      if (eventData.parent_event_id == null) {
        eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);

        const eventConflicts = await reviewEventConflictOnUpdate(eventId, req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds);

        if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
          return {
            success: false,
            flag: 'scheduleEventConflict',
            conflictMessage: eventConflicts.conflictBlockHtml,
            totalConflicts: eventConflicts.total,
            message: "The event conflict is raised, please resolve it.",
          };
        } else {
          const relatedEventIds = await Event.find({ parent_event_id: mysqlOrm.Types.ObjectId(eventId) }, { _id: 1 });
          if (relatedEventIds.length > 0) {
            await EventCourse.findByIdAndUpdate(eventData.event_course_id, { $pull: { event_ids: { $in: relatedEventIds } } });
            await Event.deleteMany({ _id: relatedEventIds });
          }

          /* inserting the new recurring events according to new recurring information. */
          const recurring_info = {
            recurring_type: req.body.recurring_type,
            no_of_recurring: numberOfRecurring,
            repeat_indefinitely: repeatIndefinitely,
          };

          req.body.recurring_info = recurring_info;
          req.body.event_course_id = eventData.event_course_id;
          allEventIds = await eventsManipulation(req, res, eventData.id, numberOfRecurring, moment);
            await upsertEventCourse(req, res, eventData.event_course_id, allEventIds);


          return { success: true, message: "Event updated successfully." };
          /* inserting the new recurring events according to new recurring information. */
        }
      } else {
        let relatedEventIds = [];
          if (eventData.parent_event_id) {
            relatedEventIds = await Event.find({ 
              parent_event_id: mysqlOrm.Types.ObjectId(eventData.parent_event_id), 
              start_date: { $gt: eventData.start_date } 
            }, { _id: 1 });
          }
        const relatedEventCount = relatedEventIds.length;

        numberOfRecurring = relatedEventCount >= 1 ? relatedEventCount : 1;

        // Add this before the if statement:
          eventDatesArray = await createEventDatesArray(req, res, numberOfRecurring, moment);
          const eventConflicts = await reviewEventConflictOnUpdate(eventId, req.body.tutor_id, req.body.substitute_tutor_id, req.body.student_ids, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds);

        if (eventConflicts.total > 0 && !req.body.ignore_conflict) {
          return {
            success: false,
            flag: 'scheduleEventConflict',
            conflictMessage: eventConflicts.conflictBlockHtml,
            totalConflicts: eventConflicts.total,
            message: "The event conflict is raised, please resolve it.",
          };
        } else {
          let recurring_info = {};
          if (relatedEventIds.length > 0) {
            // numberOfRecurring = relatedEventCount >= 1 ? relatedEventCount : 1;
            recurring_info = {
              recurring_type: req.body.recurring_type,
              no_of_recurring: numberOfRecurring,
              repeat_indefinitely: repeatIndefinitely,
            };
            await EventCourse.findByIdAndUpdate(eventData.event_course_id, { $pull: { event_ids: { $in: relatedEventIds } } });
            await Event.deleteMany({ _id: relatedEventIds });
          } else {
            // numberOfRecurring = 1;
            recurring_info = {
              recurring_type: eventData.recurring_info[0].recurring_type,
              no_of_recurring: eventData.recurring_info[0].no_of_recurring,
              repeat_indefinitely: eventData.recurring_info[0].repeat_indefinitely,
            };
          }

          if (eventData.parent_event_id && eventData.parent_event_id._id) {
            allEventIds.push(eventData.parent_event_id._id);
          }
          let oldRelatedEventIds = [];
          if (eventData.parent_event_id) {
            oldRelatedEventIds = await Event.find({ 
              parent_event_id: mysqlOrm.Types.ObjectId(eventData.parent_event_id), 
              start_date: { $lt: eventData.start_date } 
            }, { _id: 1 });
          }
          allEventIds.push(...oldRelatedEventIds);

          /* inserting the new recurring events according to new recurring information. */
          req.body.recurring_info = recurring_info;
          req.body.event_course_id = eventData.event_course_id;

          for (let i = 0; i < numberOfRecurring; i++) {
            try {
              if (i == 0) {
                updatedCurrentEvent = await Event.findByIdAndUpdate(eventData.id, req.body);
                allEventIds.push(updatedCurrentEvent._id);
              }

              if (i != 0) {
                if (req.body.recurring_type == "weekly") {
                  req.body.start_date = moment(req.body.start_date).add(7, "days");
                  req.body.start_time = moment(req.body.start_time).add(7, "days");
                  req.body.end_time = moment(req.body.end_time).add(7, "days");
                } else {
                  req.body.start_date = moment(req.body.start_date).add(7, "days");
                  req.body.start_time = moment(req.body.start_time).add(14, "days");
                  req.body.end_time = moment(req.body.end_time).add(14, "days");
                }

                req.body.parent_event_id = eventData.id;
                let createdEvent = await Event.create(req.body);
                allEventIds.push(createdEvent._id);
              }
            } catch (error) {
              console.error(`Error creating event ${i + 1}:`, error);
              // Consider logging details and notifying the user about partial success (optional)
            }
          }

          await upsertEventCourse(req, res, eventData.event_course_id, allEventIds);

          return { success: true, message: "Event updated successfully." };
          /* inserting the new recurring events according to new recurring information. */
        }
      }
    } // button showed & clicked `this_one_and_future`.
  } catch (error) {
    console.error(error, "=updateRecurringEvent=");
    return { success: false, message: error };
  }
}

/**
 * reviewEventConflictOnUpdate
 * @param {*} req
 * @param {*} res
 * @returns
 */
/**
 * reviewEventConflictOnUpdate
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function reviewEventConflictOnUpdate(CurrentEventId, mainTutorId, substituteTutorId, studentIds, eventDatesArray, loggedUserSpecificTimezone, moment, ignoredEventIds) {
  let conflictedMainTutorEvents = [];
  let conflictedSubstituteTutorEvents = [];
  let conflictedStudentEvents = [];
  let overallEventConflicts = [];

  // Validate and filter ignoredEventIds
  let validIgnoredEventIds = [];
  if (ignoredEventIds && Array.isArray(ignoredEventIds)) {
    validIgnoredEventIds = ignoredEventIds
      .filter(id => {
        // Filter out invalid values
        if (!id) return false;
        if (id === 'null' || id === 'undefined' || id === '' || id.toString() === 'undefined') return false;
        return true;
      })
      .map(id => {
        try {
          // Convert to ObjectId safely
          return new mysqlOrm.Types.ObjectId(id);
        } catch (error) {
          console.error('Invalid ignoredEventId:', id, error.message);
          return null;
        }
      })
      .filter(id => id !== null); // Remove null values
  }

  for (eventDatePair of eventDatesArray) {
    let startTime = eventDatePair.start_time.toDate();
    let endTime = eventDatePair.end_time.toDate();
    // Check for conflicts with Main Tutor.
    const mainTutorOrCondition = [];
    if (mainTutorId && mainTutorId !== 'null' && mainTutorId !== 'undefined') {
      try {
        mainTutorOrCondition.push({ tutor_id: mysqlOrm.Types.ObjectId(mainTutorId) });
        mainTutorOrCondition.push({ substitute_tutor_id: mysqlOrm.Types.ObjectId(mainTutorId) });
      } catch (error) {
        console.error('Invalid mainTutorId:', mainTutorId);
      }
    }

    conflictedMainTutorEventData = await Event.find({
      $and: [
        {
          $or: mainTutorOrCondition.length > 0 ? mainTutorOrCondition : [{ _id: null }] // Use dummy condition if empty
        },
        { start_date: { $lte: endTime } }, // Existing event starts before the new event ends
        { end_date: { $gte: startTime } }, 
        {
          $or: [ // Check for various time overlap scenarios
            { start_time: { $lt: startTime }, end_time: { $gt: startTime } }, // Existing event wraps around the new event's start
            { start_time: { $lt: endTime }, end_time: { $gt: endTime } }, // Existing event completely overlaps the new event
            { start_time: { $gte: startTime }, end_time: { $lte: endTime } }, // New event is inside the existing event
          ]
        }
      ],
      isDeleted: false,
      _id: { $nin: validIgnoredEventIds } // Exclude the related eventIds
    }, { _id: 1, tutor_id: 1, substitute_tutor_id: 1, start_time: 1, end_time: 1 }).populate({
      path: "tutor_id",
      model: "users",
      select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
    }).populate({
      path: "substitute_tutor_id",
      model: "users",
      select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
    });
    conflictedMainTutorEvents.push(...conflictedMainTutorEventData);

    if (substituteTutorId && substituteTutorId !== 'null' && substituteTutorId !== 'undefined') {
      // Build the $or condition safely for substitute tutor
      const substituteTutorOrCondition = [];
      try {
        substituteTutorOrCondition.push({ tutor_id: mysqlOrm.Types.ObjectId(substituteTutorId) });
        substituteTutorOrCondition.push({ substitute_tutor_id: mysqlOrm.Types.ObjectId(substituteTutorId) });
      } catch (error) {
        console.error('Invalid substituteTutorId:', substituteTutorId);
      }
      
      // Check for conflicts with Substitute Tutor.
      conflictedSubstituteTutorEventData = await Event.find({
        $and: [
          {
            $or: substituteTutorOrCondition.length > 0 ? substituteTutorOrCondition : [{ _id: null }]
          },
          { start_date: { $lte: endTime } }, // Existing event starts before the new event ends
          { end_date: { $gte: startTime } }, // Existing event ends after the new event starts
          {
            $or: [ // Check for various time overlap scenarios
              { start_time: { $lt: startTime }, end_time: { $gt: startTime } }, // Existing event wraps around the new event's start
              { start_time: { $lt: endTime }, end_time: { $gt: endTime } }, // Existing event completely overlaps the new event
              { start_time: { $gte: startTime }, end_time: { $lte: endTime } }, // New event is inside the existing event
            ]
          }
        ],
        isDeleted: false,
        _id: { $nin: validIgnoredEventIds } // Exclude the related eventIds
      }, { _id: 1, tutor_id: 1, substitute_tutor_id: 1, start_time: 1, end_time: 1 }).populate({
        path: "tutor_id",
        model: "users",
        select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
      }).populate({
        path: "substitute_tutor_id",
        model: "users",
        select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
      });
      conflictedSubstituteTutorEvents.push(...conflictedSubstituteTutorEventData);
    }

    // Check for conflicts with students.
    let validStudentIds = [];
    if (studentIds && Array.isArray(studentIds)) {
      validStudentIds = studentIds
        .filter(id => id && id !== 'null' && id !== 'undefined' && id !== '' && id.toString() !== 'undefined')
        .map(id => {
          try {
            return mysqlOrm.Types.ObjectId(id);
          } catch (error) {
            console.error('Invalid student ID:', id);
            return null;
          }
        })
        .filter(id => id !== null);
    }

    // Only run the query if we have valid student IDs
    if (validStudentIds.length > 0) {
      conflictedStudentEventData = await Event.find({
        $and: [
          {  // Check for conflicts with either tutor or students
            student_ids: { $in: validStudentIds }
          },
          { start_date: { $lte: endTime } }, // Existing event starts before the new event ends
          { end_date: { $gte: startTime } }, // Existing event ends after the new event starts
          {
            $or: [ // Check for various time overlap scenarios
              { start_time: { $lt: startTime }, end_time: { $gt: startTime } }, // Existing event wraps around the new event's start
              { start_time: { $lt: endTime }, end_time: { $gt: endTime } }, // Existing event completely overlaps the new event
              { start_time: { $gte: startTime }, end_time: { $lte: endTime } }, // New event is inside the existing event
            ]
          }
        ],
        isDeleted: false,
        _id: { $nin: validIgnoredEventIds } // Use the validated ignored IDs here
      }, { _id: 1, student_ids: 1, start_time: 1, end_time: 1, role: 1 }).populate({
        path: "student_ids",
        model: "users",
        select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
      });
      conflictedStudentEvents.push(...conflictedStudentEventData);
    } else {
      conflictedStudentEventData = []; // Set to empty array if no valid student IDs
    }
  }

  if (conflictedMainTutorEvents.length > 0) {
    overallEventConflicts.push(...conflictedMainTutorEvents);
  }

  if (conflictedSubstituteTutorEvents.length > 0) {
    overallEventConflicts.push(...conflictedSubstituteTutorEvents);
  }

  if (conflictedStudentEvents.length > 0) {
    overallEventConflicts.push(...conflictedStudentEvents);
  }

  const uniqueResults = await globalHelper.removeIdenticalObjects(overallEventConflicts);

  let conflicts = {
    results: uniqueResults,
    total: 0,
  };

  if (uniqueResults.length > 0) {
    let totalConflict = 0;
    let conflictBlockHtml = '';
    conflictBlockHtml = `<div class="conflict_block"><div class="conflict_left"><img src="/images/disclaimer_icon.svg" alt="disclaimer-icon"></div><div class="conflict_right"><h4><span id="total-conflict">${conflicts.total}</span> scheduling conflicts were detected:</h4><ul>`;
    
    for (let eventConflict of uniqueResults) {
      let startDateTime = moment.utc(eventConflict.start_time).tz(loggedUserSpecificTimezone);
      const parsedDate = moment(startDateTime, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
      startDateTime = parsedDate.format('MMM DD YYYY h:mm A');

      let endDateTime = moment.utc(eventConflict.end_time).tz(loggedUserSpecificTimezone);
      const parsedEndDate = moment(endDateTime, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
      endDateTime = parsedEndDate.format('MMM DD YYYY h:mm A');

      // FIX: Add null checks for tutor_id and substitute_tutor_id
      if (mainTutorId !== null) {
        // Check if tutor_id exists and has _id
        if (eventConflict.tutor_id && eventConflict.tutor_id._id && 
            eventConflict.tutor_id._id.toString() === mainTutorId.toString()) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.tutor_id.first_name + ' ' + eventConflict.tutor_id.last_name} is already tutoring as the main tutor at this time on ${startDateTime}.</li>`;
        }

        // Check if substitute_tutor_id exists and has _id
        if (eventConflict.substitute_tutor_id && eventConflict.substitute_tutor_id._id && 
            eventConflict.substitute_tutor_id._id.toString() === mainTutorId.toString()) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.substitute_tutor_id.first_name + ' ' + eventConflict.substitute_tutor_id.last_name} is already tutoring as the substitute tutor at this time on ${startDateTime}.</li>`;
        }
      }

      if (substituteTutorId !== null) {
        // Check if tutor_id exists and has _id
        if (eventConflict.tutor_id && eventConflict.tutor_id._id && 
            eventConflict.tutor_id._id.toString() === substituteTutorId.toString()) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.tutor_id.first_name + ' ' + eventConflict.tutor_id.last_name} is already tutoring as the main tutor at this time on ${startDateTime}.</li>`;
        }

        // Check if substitute_tutor_id exists and has _id
        if (eventConflict.substitute_tutor_id && eventConflict.substitute_tutor_id._id && 
            eventConflict.substitute_tutor_id._id.toString() === substituteTutorId.toString()) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.substitute_tutor_id.first_name + ' ' + eventConflict.substitute_tutor_id.last_name} is already tutoring as the substitute tutor at this time on ${startDateTime}.</li>`;
        }
      }

      // FIX: Add null check for student_ids
      if (eventConflict.student_ids && Array.isArray(eventConflict.student_ids)) {
        for (let student of eventConflict.student_ids) {
          // Check if student object exists and has id/_id
          let stId = null;
          if (student && student.id) {
            stId = student.id.toString();
          } else if (student && student._id) {
            stId = student._id.toString();
          }
          
          if (stId && studentIds && Array.isArray(studentIds)) {
            // Convert studentIds to strings for comparison
            const studentIdStrings = studentIds.map(id => id.toString());
            if (studentIdStrings.includes(stId)) {
              totalConflict++;
              conflictBlockHtml += `<li>${student.first_name + ' ' + student.last_name} is already attending another event at this time on ${startDateTime}.</li>`;
            }
          }
        }
      }
    }
    
    conflictBlockHtml += `</ul><div><div class="form-group mb-0"><div class="form-check"><input type="checkbox" name="ignore_conflict" value="1" class="form-check-input" id="ignore_conflict"><label class="form-check-label" for="ignore_conflict">Ignore conflicts and continue</label></div></div></div></div></div>`;
    conflicts.conflictBlockHtml = conflictBlockHtml;
    conflicts.total = totalConflict;
  }

  return conflicts;
}

/**
 * store event course.
 * @param {*} req
 * @param {*} res
 * @returns
 */
// async function storeEventCourse(req, res, createdEventIds) {
//   try {
//     let contents = JSON.parse(req.body.courses);
   
//     for (let content of contents) {
//       let lesson = await Lesson.findById(content.lesson_id);
//       if (!lesson) {
//         throw new Error(`Lesson with ID ${content.lesson_id} not found`); // Throw specific error
//       }
//       let slideIds = lesson.slide_ids;
//       const result = slideIds.map((id) => ({
//         slide_id: id.toString(),
//         attached_event_id: null,
//         mark_as_read: false,
//         mark_at: "",
//       }));
//       content.slides = result;
//     }

//     const createdEventCourse = await EventCourse.create({
//       event_ids: createdEventIds,
//       content: contents,
//     });

//     return createdEventCourse.id;
//   } catch (error) {
//     console.error(error, 'storeEventCourse Error.');
//     return false;
//   }
// }

async function storeEventCourse(req, res, createdEventIds) {
  try {

     if (!req.body.courses || req.body.courses === '[]') {
      return null; // Return null if no content
    }

    let contents = Array.isArray(req.body.courses) ? req.body.courses : JSON.parse(req.body.courses);

     if (!contents || contents.length === 0) {
      return null; // Return null if empty array
    }

    let versionedContents = [];
    
    // Track which learning contents we've already versioned
    const versionedLearningContents = new Map();
    // Track which lessons we've already versioned
    const versionedLessons = new Map();
    let newContentDirectory = "";
    let oldContentDirectory = "";
    for (let content of contents) {
      // 1. Check if we've already versioned this learning content
      let savedContentVersion;
      if (!versionedLearningContents.has(content.learning_content_id)) {
        // Version the learning content if we haven't already
        const originalContent = await LearningContent.findById(content.learning_content_id)
          .populate('lesson_ids')
          .lean();

        if (!originalContent) {
          console.error('Original content not found');
          throw new Error(`Learning content with ID ${content.learning_content_id} not found`);
        }

        // create folder of content directory

        const randomString = randomStr.generate({
          length: 8,
          charset: "alphabetic",
        });
        newContentDirectory = "lc_" + randomString + Date.now();
        
        if (!fs.existsSync("./assets/LearningContent")) {
          fs.mkdirSync("./assets/LearningContent", { recursive: true });
        }

        const dir = "./assets/LearningContent/" + newContentDirectory;
        await fs.mkdir(dir, (error) => {
          console.log(error);
        });
        oldContentDirectory = originalContent.content_directory;

        let contentThumbnail = "";
        if (originalContent.thumbnail != "" && originalContent.thumbnail != null) {
          let thumbnail = originalContent.thumbnail.split("-");
          thumbnail[0] = Date.now();
          contentThumbnail = thumbnail.join("-");
          
          globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalContent.thumbnail}`,`./assets/LearningContent/${newContentDirectory}/${contentThumbnail}`);
        }

        // Create versioned learning content without the original _id
        const contentVersion = new LearningContentVersion({
          ...originalContent,
          _id: undefined, // Let the MySQL ORM generate a new ID
          original_id: originalContent._id,
          content_directory:newContentDirectory,
          thumbnail: contentThumbnail,
          version_type: 'event',
          lesson_ids: [] // Start with empty array
        });
        
        savedContentVersion = await contentVersion.save();
        versionedLearningContents.set(content.learning_content_id, savedContentVersion);
      } else {
        savedContentVersion = versionedLearningContents.get(content.learning_content_id);
      }

      // 2. Check if we've already versioned this lesson
      let savedLessonVersion;
      if (!versionedLessons.has(content.lesson_id)) {
        // Version the lesson if we haven't already
        const originalLesson = await Lesson.findById(content.lesson_id)
          .populate('slide_ids')
          .lean();

        if (!originalLesson) {
          console.error('Original lesson not found');
          throw new Error(`Lesson with ID 2 ${content.lesson_id} not found`);
        }

        const oldSlides = originalLesson.slide_ids || [];

        // Create versioned lesson without the original _id
        const lessonVersion = new LessonVersion({
          ...originalLesson,
          _id: undefined, // Let the MySQL ORM generate a new ID
          original_id: originalLesson._id,
          version_type: 'event',
          slide_ids: [], // Will be populated below
          practice_ids: [],
          challenge_ids: []
        });

        savedLessonVersion = await lessonVersion.save();
        versionedLessons.set(content.lesson_id, savedLessonVersion);

        // 3. Version all slides for this lesson
        const versionedSlideIds = [];
        for (const slideId of oldSlides) {
          const originalSlide = await Slide.findById(slideId).lean();
          if (!originalSlide) {
            console.warn('Slide not found:', slideId);
            continue;
          }

          let newAttachment = (video = "");
          if (originalSlide.attachments[0] != "" && originalSlide.attachments[0] != null && originalSlide.attachments[0] != undefined) {
            let attachment = originalSlide.attachments[0].split("-");
            attachment[0] = Date.now();
            newAttachment = attachment.join("-");

            globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalSlide.attachments[0]}`,`./assets/LearningContent/${newContentDirectory}/${newAttachment}`);
          }

          if (originalSlide.video != "" && originalSlide.video != null && originalSlide.video != undefined) {
            let videoName = originalSlide.video.split("-");
            videoName[0] = Date.now();
            video = videoName.join("-");

            globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalSlide.video}`,`./assets/LearningContent/${newContentDirectory}/${video}`);
          }          

          const slideVersion = new SlideVersion({
            ...originalSlide,
            video_url: originalSlide.video_url,
            video: video,
            attachments: newAttachment,
            content_directory: newContentDirectory,
            _id: undefined, // Let the MySQL ORM generate a new ID
            original_id: originalSlide._id,
            version_type: 'event'
          });
          
          const savedSlide = await slideVersion.save();
          versionedSlideIds.push(savedSlide._id);
        }

        // Update lesson version with versioned slide IDs
        await LessonVersion.findByIdAndUpdate(
          savedLessonVersion._id,
          { $set: { slide_ids: versionedSlideIds } }
        );

        // Add slide info to our versioned content
        versionedContents.push({
          learning_content_id: savedContentVersion._id,
          lesson_id: savedLessonVersion._id,
          is_default: content.is_default,
          is_skipped: content.is_skipped,
          status: content.status,
          slides: versionedSlideIds.map(slideId => ({
            slide_id: slideId.toString(),
            attached_event_id: null,
            mark_as_read: false,
            mark_at: ""
          }))
        });
      } else {
        savedLessonVersion = versionedLessons.get(content.lesson_id);
      }

      // Ensure this lesson is associated with the content version
      if (!savedContentVersion.lesson_ids.includes(savedLessonVersion._id)) {
        await LearningContentVersion.findByIdAndUpdate(
          savedContentVersion._id,
          { $addToSet: { lesson_ids: savedLessonVersion._id } }
        );
      }
    }

    const createdEventCourse = await EventCourse.create({
      event_ids: createdEventIds,
      content: versionedContents,
    });

    return createdEventCourse._id;
  } catch (error) {
    console.error('Error in storeEventCourse:', error);
    return null;
  }
}

/**
 * update event course.
 * @param {*} req
 * @param {*} res
 * @returns
 */
// async function updateEventCourse(req, res, courseId, allEventIds = []) {
//   try {
//     console.log('updateEventCourse Called.');
//     console.log(courseId,"courseId");
//     eventCourse = await EventCourse.findById(courseId);
//     const originalContent = eventCourse.content;
//     console.log(originalContent,"originalContent");
//     const filteredArray = originalContent.map(function (item) {
//       if (item.status !== 'N/A') {
//         return item; // Include the object in the filtered array
//       } else {
//         return null; // Exclude the object (by returning null)
//       }
//     });

//     const usedContents = filteredArray.filter(element => element !== null); // Remove null elements

//     let formContents = JSON.parse(req.body.courses);
//     for (let content of formContents) {
//       let lesson = await LessonVersion.findById(content.lesson_id);
//       if (!lesson) {
//         throw new Error(`Lesson with ID 3 ${content.lesson_id} not found`); // Throw specific error
//       }

//       content.lesson_id = mysqlOrm.Types.ObjectId(content.lesson_id);
//       let slideIds = lesson.slide_ids;
//       const result = slideIds.map((id) => ({
//         slide_id: id.toString(),
//         attached_event_id: null,
//         mark_as_read: false,
//         mark_at: "",
//       }));
//       content.slides = result;
//     }

//     let combinedContents = usedContents.concat(formContents);
//     const finalLessons = new Set(); // Set to store seen lesson_id values
//     combinedContents = combinedContents.filter(obj => {
//       const lessonId = obj.lesson_id.toString();
//       if (finalLessons.has(lessonId)) {
//         return false; // Exclude object with duplicate lesson_id
//       }
//       finalLessons.add(lessonId);
//       return true; // Keep the object (first occurrence)
//     });

//     let courseUpdated;
//     if (allEventIds.length == 0) {
//       courseUpdated = await EventCourse.findByIdAndUpdate(courseId, {
//         content: combinedContents,
//       });
//     } else {
//       courseUpdated = await EventCourse.findByIdAndUpdate(courseId, {
//         event_ids: allEventIds,
//         content: combinedContents,
//       });
//     }
//     return courseUpdated;
//   } catch (error) {
//     console.error(error, 'updateEventCourse Error.');
//     return false;
//   }
// }

function getLastRecurringDate(eventData) {
  // console.log(eventData,"eventData");
  if (!eventData?.start_time || !eventData?.recurring_info?.length) return null;

  const startDate = new Date(eventData.start_time);
  const recurringType = eventData.recurring_info[0].recurring_type;

  const lastDate = new Date(startDate);

  if (recurringType === "weekly") {
    lastDate.setDate(startDate.getDate() - 7);
  } else if (recurringType === "fortnightly") {
    lastDate.setDate(startDate.getDate() - 14);
  }

  return lastDate;
}

// Example usage:
const eventData = {
  start_date: "2025-10-29T18:30:00.000Z",
  recurring_info: [{ recurring_type: "weekly" }]
};

async function generateRecurringDates(startDate, recurring_type, numberOfRecurring) {
  const baseDate = new Date(startDate);
  const lastDate = new Date(baseDate);

  if (recurring_type === "weekly") {
    lastDate.setDate(baseDate.getDate() + (numberOfRecurring - 1) * 7);
  } else if (recurring_type === "fortnightly") {
    lastDate.setDate(baseDate.getDate() + (numberOfRecurring - 1) * 14);
  } else {
    throw new Error("Invalid recurring_type: use 'weekly' or 'fortnightly'");
  }

  return lastDate;
}

async function updateEventCourse(req, res, courseId, allEventIds = []) {
  try {
    // console.log('updateEventCourse Called.');

     // Validate courseId
    if (!courseId || courseId === 'undefined' || courseId === 'null' || courseId.toString() === 'undefined') {
      console.log('Invalid courseId, skipping updateEventCourse');
      return null; // Return null instead of throwing
    }
    
    // Try to convert to ObjectId safely
    let validCourseId;
    try {
      validCourseId = mysqlOrm.Types.ObjectId(courseId);
    } catch (error) {
      console.error('Invalid courseId format:', courseId);
      return null;
    }

    // 1. Fetch EventCourse
    const eventCourse = await EventCourse.findById(validCourseId);
    if (!eventCourse) throw new Error('Event course not found');

    // 2. Extract and filter existing content
    const existingContent = eventCourse.content.filter(item => item.status !== 'N/A');
    const contentIds = eventCourse.content.map(item => item.learning_content_id);

    // 3. Parse new content from request
    const newContent = Array.isArray(req.body.courses)
      ? req.body.courses
      : JSON.parse(req.body.courses);

    const contentToKeep = new Set();
    const lessonsToKeep = new Set();
    const processedNewContent = [];

    // 4. Process new content
    for (const content of newContent) {
      let newContentDirectory = "";
      let oldContentDirectory = "";

      const learningContentObjectId = mysqlOrm.Types.ObjectId.isValid(content.learning_content_id)
        ? new mysqlOrm.Types.ObjectId(content.learning_content_id)
        : null;

      let learningContentVersion = null;

      if (learningContentObjectId) {
        learningContentVersion = await LearningContentVersion.findOne({
          $or: [
            { _id: learningContentObjectId },
            { original_id: learningContentObjectId },
          ],
        });
      }

      
      if(learningContentVersion){
        newContentDirectory = learningContentVersion.content_directory; 
      }else{
        const randomString = randomStr.generate({
          length: 8,
          charset: "alphabetic",
        });
        newContentDirectory = "lc_" + randomString + Date.now();

        if (!fs.existsSync("./assets/LearningContent")) {
          fs.mkdirSync("./assets/LearningContent", { recursive: true });
        }

        const dir = "./assets/LearningContent/" + newContentDirectory;
        await fs.mkdir(dir, (error) => {
          console.log(error);
        });
      }

      // ---- A. Handle Lesson Version ----
      let lessonVersion = await LessonVersion.findById(content.lesson_id);

      if (!lessonVersion) {
        const originalLesson = await Lesson.findById(content.lesson_id)
          .populate('slide_ids')
          .lean();

        if (!originalLesson) {
          throw new Error(`Lesson with ID ${content.lesson_id} not found`);
        }

        const oldSlides = originalLesson.slide_ids || [];

        const newLessonVersion = new LessonVersion({
          ...originalLesson,
          _id: undefined,
          original_id: originalLesson._id,
          version_type: 'event',
          slide_ids: [],
          practice_ids: [],
          challenge_ids: [],
        });

        lessonVersion = await newLessonVersion.save();

        const versionedSlideIds = [];

        for (const slideId of oldSlides) {
          const originalSlide = await Slide.findById(slideId).lean();
          if (!originalSlide) {
            console.warn('Slide not found:', slideId);
            continue;
          }

          oldContentDirectory = originalSlide.content_directory;

          let newAttachment = (video = "");
          if (originalSlide.attachments[0] != "" && originalSlide.attachments[0] != null && originalSlide.attachments[0] != undefined) {
            let attachment = originalSlide.attachments[0].split("-");
            attachment[0] = Date.now();
            newAttachment = attachment.join("-");

            globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalSlide.attachments[0]}`,`./assets/LearningContent/${newContentDirectory}/${newAttachment}`);
          }

          if (originalSlide.video != "" && originalSlide.video != null && originalSlide.video != undefined) {
            let videoName = originalSlide.video.split("-");
            videoName[0] = Date.now();
            video = videoName.join("-");

            globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalSlide.video}`,`./assets/LearningContent/${newContentDirectory}/${video}`);
          }          


          const slideVersion = new SlideVersion({
            ...originalSlide,
            video_url: originalSlide.video_url,
            video: video,
            attachments: newAttachment,
            content_directory: newContentDirectory,
            _id: undefined,
            original_id: originalSlide._id,
            version_type: 'event',
          });

          const savedSlide = await slideVersion.save();
          versionedSlideIds.push(savedSlide._id);
        }

        await LessonVersion.findByIdAndUpdate(lessonVersion._id, {
          $set: { slide_ids: versionedSlideIds },
        });

        content.lesson_id = lessonVersion._id;
      }

      // console.log(content, "content");

      // ---- B. Handle LearningContentVersion ----
      
      if (!learningContentVersion) {
        const originalContent = await LearningContent.findById(content.learning_content_id)
          .populate('lesson_ids')
          .lean();

        if (!originalContent) {
          throw new Error(`Original learning content with ID ${content.learning_content_id} not found`);
        }

        oldContentDirectory = originalContent.content_directory;

        // copy assets for version content
        const randomString = randomStr.generate({
          length: 8,
          charset: "alphabetic",
        });
        newContentDirectory = "lc_" + randomString + Date.now();
        
        if (!fs.existsSync("./assets/LearningContent")) {
          fs.mkdirSync("./assets/LearningContent", { recursive: true });
        }

        const dir = "./assets/LearningContent/" + newContentDirectory;
        await fs.mkdir(dir, (error) => {
          console.log(error);
        });

        let contentThumbnail = "";
        if (originalContent.thumbnail != "" && originalContent.thumbnail != null) {
          let thumbnail = originalContent.thumbnail.split("-");
          thumbnail[0] = Date.now();
          contentThumbnail = thumbnail.join("-");
          
          globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${originalContent.thumbnail}`,`./assets/LearningContent/${newContentDirectory}/${contentThumbnail}`);
        }

        const newContentVersion = new LearningContentVersion({
          ...originalContent,
          _id: undefined,
          content_directory:newContentDirectory,
          thumbnail: contentThumbnail,
          original_id: originalContent._id,
          version_type: 'event',
          lesson_ids: [content.lesson_id],
        });

        learningContentVersion = await newContentVersion.save();
        content.learning_content_id = learningContentVersion._id;

      } else {
        await LearningContentVersion.updateOne(
          { _id: learningContentVersion._id },
          { $addToSet: { lesson_ids: content.lesson_id } }
        );
        content.learning_content_id = learningContentVersion._id;
        
        newContentDirectory = learningContentVersion.content_directory;
      }

      // ---- C. Prepare Slides and Tracking ----
      const slidesData = lessonVersion.slide_ids.map(slideId => ({
        slide_id: slideId.toString(),
        attached_event_id: null,
        mark_as_read: false,
        mark_at: "",
      }));

      contentToKeep.add(content.learning_content_id.toString());
      lessonsToKeep.add(content.lesson_id.toString());

      processedNewContent.push({
        ...content,
        slides: slidesData,
        is_default: content.is_default || false,
        is_skipped: content.is_skipped || false,
        status: content.status || 'N/A',
      });
    }

    // 5. Merge & Deduplicate Final Content
    const combinedContent = [
      ...existingContent.filter(item =>
        contentToKeep.has(item.learning_content_id.toString()) &&
        lessonsToKeep.has(item.lesson_id.toString())
      ),
      ...processedNewContent
    ];

    const uniqueContent = [];
    const seenLessons = new Set();

    for (const item of combinedContent) {
      const lessonId = item.lesson_id.toString();
      if (!seenLessons.has(lessonId)) {
        seenLessons.add(lessonId);
        uniqueContent.push(item);
      }
    }

    // 6. Clean Up Orphaned Content
    await cleanupOrphanedVersions(eventCourse.content, uniqueContent);

    // 7. Final Update
    const updateData = allEventIds.length > 0
      ? { event_ids: allEventIds, content: uniqueContent }
      : { content: uniqueContent };

    const updatedCourse = await EventCourse.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true }
    );

    return updatedCourse;
  } catch (error) {
    console.error('Error in updateEventCourse:', error);
    return null;
  }
}


async function cleanupOrphanedVersions(oldContent, newContent) {
  try {
    // Find content versions no longer referenced
    const oldContentIds = oldContent.map(c => c.learning_content_id.toString());
    const newContentIds = newContent.map(c => c.learning_content_id.toString());
    const orphanedContentIds = oldContentIds.filter(id => !newContentIds.includes(id));

    // Find lesson versions no longer referenced
    const oldLessonIds = oldContent.map(c => c.lesson_id.toString());
    const newLessonIds = newContent.map(c => c.lesson_id.toString());
    const orphanedLessonIds = oldLessonIds.filter(id => !newLessonIds.includes(id));

    // Find slides from orphaned lessons
    const orphanedLessons = await LessonVersion.find({ 
      _id: { $in: orphanedLessonIds.map(id => mysqlOrm.Types.ObjectId(id)) } 
    });
    const orphanedSlideIds = orphanedLessons.flatMap(lesson => lesson.slide_ids);

    // Remove orphaned lesson references from learning content versions
    await LearningContentVersion.updateMany(
      { lesson_ids: { $in: orphanedLessonIds.map(id => mysqlOrm.Types.ObjectId(id)) } },
      { $pull: { lesson_ids: { $in: orphanedLessonIds.map(id => mysqlOrm.Types.ObjectId(id)) } } }
    );

    // Delete orphaned versions
    await Promise.all([
      LearningContentVersion.deleteMany({ _id: { $in: orphanedContentIds } }),
      LessonVersion.deleteMany({ _id: { $in: orphanedLessonIds.map(id => mysqlOrm.Types.ObjectId(id)) } }),
      SlideVersion.deleteMany({ _id: { $in: orphanedSlideIds } })
    ]);

  } catch (error) {
    console.error('Error in cleanupOrphanedVersions:', error);
    throw error;
  }
}
/**
 * events manipulation on update.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function eventsManipulation(req, res, parentEventId, numberOfRecurring, moment) {
  try {
    console.log('eventsManipulation Called.');
    let allEventIds = [];
    for (let i = 0; i < numberOfRecurring; i++) {
      try {
        if (i == 0) {
          updatedParentEvent = await Event.findByIdAndUpdate(parentEventId, req.body);
          allEventIds.push(updatedParentEvent._id);
        }

        if (i != 0) {
          if (req.body.recurring_type == "weekly") {
            req.body.start_date = moment(req.body.start_date).add(7, "days");
            req.body.start_time = moment(req.body.start_time).add(7, "days");
            req.body.end_time = moment(req.body.end_time).add(7, "days");
          } else {
            req.body.start_date = moment(req.body.start_date).add(14, "days");
            req.body.start_time = moment(req.body.start_time).add(14, "days");
            req.body.end_time = moment(req.body.end_time).add(14, "days");
          }
          req.body.parent_event_id = parentEventId;
          let createdEvent = await Event.create(req.body);
          allEventIds.push(createdEvent._id);
        }
      } catch (error) {
        console.error(`Error creating event ${i + 1}:`, error);
        // Consider logging details and notifying the user about partial success (optional)
      }
    }
    return allEventIds;
  } catch (error) {
    console.error(error, 'eventsManipulation Error.');
    return false;
  }
}

/**
 * calculate event date time
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function calculateEventDateTime(moment, loggedUserSpecificTimezone, startDate, startTime, duration = 0) {
  try {
    const combinedDateTime = `${startDate} ${startTime}`;
    // console.log('combinedDateTime:', combinedDateTime);

    const momentObj = moment.tz(combinedDateTime, 'YYYY-MM-DD hh:mm A', loggedUserSpecificTimezone);
    // console.log('momentObj with timezone:', momentObj.format());

    const startDateTimeUTC = momentObj.utc();
    // console.log('UTC startDateTime:', startDateTimeUTC.format())

    const endDateTimeUTC = startDateTimeUTC.clone().add(duration, 'minutes');
    return {
      startDateTimeUTC: startDateTimeUTC,
      endDateTimeUTC: endDateTimeUTC,
    }
  } catch (error) {
    console.error(error, 'calculateEventDateTime Error.');
  }
}

/**
 * scheduled event conflict.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function createEventDatesArray(req, res, numberOfRecurring, moment) {
  try {
    eventDatesArray = [];
    event_start_time = req.body.start_time;
    event_end_time = req.body.end_time;
    for (let i = 0; i < numberOfRecurring; i++) {
      let obj = {};
      if (i == 0) {
        obj.start_time = event_start_time;
        obj.end_time = event_end_time;
        eventDatesArray.push(obj);
      } else {
        if (req.body.recurring_type == "weekly") {
          event_start_time = moment(event_start_time).add(7, "days");
          event_end_time = moment(event_end_time).add(7, "days");
        } else {
          event_start_time = moment(event_start_time).add(14, "days");
          event_end_time = moment(event_end_time).add(14, "days");
        }
        obj.start_time = event_start_time;
        obj.end_time = event_end_time;
        eventDatesArray.push(obj);
      }
    }
    return eventDatesArray;
  } catch (error) {
    console.error(error, 'createEventDatesArray Error.');
  }
}

/**
 * check event conflict.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function checkEventConflict(mainTutorId, substituteTutorId, studentIds, eventDatesArray, loggedUserSpecificTimezone, moment) {
  let conflictedMainTutorEvents = [];
  let conflictedSubstituteTutorEvents = [];
  let conflictedStudentEvents = [];
  let overallEventConflicts = [];

  for (eventDatePair of eventDatesArray) {
    let startTime = eventDatePair.start_time.toDate();
    let endTime = eventDatePair.end_time.toDate();

    // Check for conflicts with Main Tutor.
    const mainTutorOrCondition = [];
    if (mainTutorId && mainTutorId !== 'null' && mainTutorId !== 'undefined') {
      try {
        mainTutorOrCondition.push({ tutor_id: mysqlOrm.Types.ObjectId(mainTutorId) });
        mainTutorOrCondition.push({ substitute_tutor_id: mysqlOrm.Types.ObjectId(mainTutorId) });
      } catch (error) {
        console.error('Invalid mainTutorId in checkEventConflict:', mainTutorId);
      }
    }

    conflictedMainTutorEventData = await Event.find({
      $and: [
        {
          $or: mainTutorOrCondition.length > 0 ? mainTutorOrCondition : [{ _id: null }] // Use dummy condition if empty
        },
        // { start_date: { $lte: endTime } }, // Existing event starts before the new event ends
        // { end_date: { $gte: startTime } }, // Existing event ends after the new event starts
        {
          $or: [ // Check for various time overlap scenarios
            { start_time: { $lt: startTime }, end_time: { $gt: startTime } }, // Existing event wraps around the new event's start
            { start_time: { $lt: endTime }, end_time: { $gt: endTime } }, // Existing event completely overlaps the new event
            { start_time: { $gte: startTime }, end_time: { $lte: endTime } }, // New event is inside the existing event
          ]
        }
      ], isDeleted: false
    }, { _id: 1, tutor_id: 1, substitute_tutor_id: 1, start_time: 1, end_time: 1 }).populate({
      path: "tutor_id",
      model: "users",
      select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
    }).populate({
      path: "substitute_tutor_id",
      model: "users",
      select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
    });
    conflictedMainTutorEvents.push(...conflictedMainTutorEventData);

    if (substituteTutorId != null) {
      // Check for conflicts with Substitute Tutor.
      conflictedSubstituteTutorEventData = await Event.find({
        $and: [
          {
            $or: [ // Check for conflicts with either tutor or students
              { tutor_id: mysqlOrm.Types.ObjectId(substituteTutorId) },
              { substitute_tutor_id: mysqlOrm.Types.ObjectId(substituteTutorId) },
            ]
          },
          // { start_date: { $lte: endTime } }, // Existing event starts before the new event ends
          // { end_date: { $gte: startTime } }, // Existing event ends after the new event starts
          {
            $or: [ // Check for various time overlap scenarios
              { start_time: { $lt: startTime }, end_time: { $gt: startTime } }, // Existing event wraps around the new event's start
              { start_time: { $lt: endTime }, end_time: { $gt: endTime } }, // Existing event completely overlaps the new event
              { start_time: { $gte: startTime }, end_time: { $lte: endTime } }, // New event is inside the existing event
            ]
          }
        ], isDeleted: false
      }, { _id: 1, tutor_id: 1, substitute_tutor_id: 1, start_time: 1, end_time: 1 }).populate({
        path: "tutor_id",
        model: "users",
        select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
      }).populate({
        path: "substitute_tutor_id",
        model: "users",
        select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
      });
      conflictedSubstituteTutorEvents.push(...conflictedSubstituteTutorEventData);
    }

    // Check for conflicts with students.
    conflictedStudentEventData = await Event.find({
      $and: [
        {  // Check for conflicts with either tutor or students
          student_ids: { $in: studentIds.map(id => mysqlOrm.Types.ObjectId(id)) }  // Convert student IDs to ObjectIds
        },
        // { start_date: { $lte: endTime } }, // Existing event starts before the new event ends
        // { end_date: { $gte: startTime } }, // Existing event ends after the new event starts
        {
          $or: [ // Check for various time overlap scenarios
            { start_time: { $lt: startTime }, end_time: { $gt: startTime } }, // Existing event wraps around the new event's start
            { start_time: { $lt: endTime }, end_time: { $gt: endTime } }, // Existing event completely overlaps the new event
            { start_time: { $gte: startTime }, end_time: { $lte: endTime } }, // New event is inside the existing event
          ]
        }
      ], isDeleted: false
    }, { _id: 1, student_ids: 1, start_time: 1, end_time: 1, role: 1 }).populate({
      path: "student_ids",
      model: "users",
      select: { _id: 1, first_name: 1, last_name: 1, role: 1 },
    });
    conflictedStudentEvents.push(...conflictedStudentEventData);
  }

  if (conflictedMainTutorEvents.length > 0) {
    overallEventConflicts.push(...conflictedMainTutorEvents);
  }

  if (conflictedSubstituteTutorEvents.length > 0) {
    overallEventConflicts.push(...conflictedSubstituteTutorEvents);
  }

  if (conflictedStudentEvents.length > 0) {
    overallEventConflicts.push(...conflictedStudentEvents);
  }

  const uniqueResults = await globalHelper.removeIdenticalObjects(overallEventConflicts);

  let conflicts = {
    results: uniqueResults,
    total: 0,
  };

  // console.log("=mainTutorId: ", mainTutorId);
  // console.log("=substituteTutorId: ", substituteTutorId);
  // console.log("=studentIds: ", studentIds);
  // console.log("=uniqueResults Start=", uniqueResults, '=uniqueResults END=');

  if (uniqueResults.length > 0) {
    let totalConflict = 0;
    let conflictBlockHtml = '';
    conflictBlockHtml = `<div class="conflict_block"><div class="conflict_left"><img src="../images/disclaimer_icon.svg" alt="disclaimer-icon"></div><div class="conflict_right"><h4><span id="total-conflict">${conflicts.total}</span> scheduling conflicts were detected:</h4><ul>`;
    for (let eventConflict of uniqueResults) {
      let startDateTime = moment.utc(eventConflict.start_time).tz(loggedUserSpecificTimezone);
      const parsedDate = moment(startDateTime, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
      startDateTime = parsedDate.format('MMM DD YYYY h:mm A');

      let endDateTime = moment.utc(eventConflict.end_time).tz(loggedUserSpecificTimezone);
      const parsedEndDate = moment(endDateTime, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
      endDateTime = parsedEndDate.format('MMM DD YYYY h:mm A');

      if (mainTutorId !== null) {
        if (eventConflict.tutor_id !== undefined && eventConflict.tutor_id._id.toString() === mainTutorId) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.tutor_id.first_name + ' ' + eventConflict.tutor_id.last_name} is already tutoring as the main tutor at this time on ${startDateTime}.</li>`;
        }

        if (eventConflict.substitute_tutor_id !== null && eventConflict.substitute_tutor_id !== undefined && eventConflict.substitute_tutor_id._id.toString() === mainTutorId) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.substitute_tutor_id.first_name + ' ' + eventConflict.substitute_tutor_id.last_name} is already tutoring as the substitute tutor at this time on ${startDateTime}.</li>`;
        }
      }

      if (substituteTutorId !== null) {
        if (eventConflict.tutor_id !== undefined && eventConflict.tutor_id._id.toString() === substituteTutorId) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.tutor_id.first_name + ' ' + eventConflict.tutor_id.last_name} is already tutoring as the main tutor at this time on ${startDateTime}.</li>`;
        }

        if (eventConflict.substitute_tutor_id !== null && eventConflict.substitute_tutor_id !== undefined && eventConflict.substitute_tutor_id._id.toString() === substituteTutorId) {
          totalConflict++;
          conflictBlockHtml += `<li>${eventConflict.substitute_tutor_id.first_name + ' ' + eventConflict.substitute_tutor_id.last_name} is already tutoring as the substitute tutor at this time on ${startDateTime}.</li>`;
        }
      }

      /*
      if (eventConflict.tutor_id !== undefined && eventConflict.tutor_id._id.toString() === mainTutorId) {
          totalConflict++;
          conflictBlockHtml +=`<li>${eventConflict.tutor_id.first_name +' '+ eventConflict.tutor_id.last_name} is already tutoring as the main tutor at this time on ${startDateTime}.</li>`;
      }

      if (eventConflict.substitute_tutor_id !== null && eventConflict.substitute_tutor_id !== undefined){
        if(eventConflict.substitute_tutor_id._id.toString() === mainTutorId){
          totalConflict++;
          conflictBlockHtml +=`<li>${eventConflict.substitute_tutor_id.first_name +' '+ eventConflict.substitute_tutor_id.last_name} is already as the substitute tutor tutoring at this time on ${startDateTime}.</li>`;
        }

        if(eventConflict.tutor_id !== null && eventConflict.tutor_id._id.toString() === substituteTutorId){
          totalConflict++;
          conflictBlockHtml +=`<li>${eventConflict.substitute_tutor_id.first_name +' '+ eventConflict.substitute_tutor_id.last_name} is already as the main tutor tutoring at this time on ${startDateTime}.</li>`;
        }

        if(eventConflict.substitute_tutor_id._id.toString() === substituteTutorId){
          totalConflict++;
          conflictBlockHtml +=`<li>${eventConflict.substitute_tutor_id.first_name +' '+ eventConflict.substitute_tutor_id.last_name} is already as the substitute tutor tutoring at this time on ${startDateTime}.</li>`;
        }
      }
      */

      if (eventConflict.student_ids !== undefined) {
        totalConflict = totalConflict + eventConflict.student_ids.length;
        for (let student of eventConflict.student_ids) {
          let stId = student.id;
          if (studentIds.includes(stId)) {
            conflictBlockHtml += `<li>${student.first_name + ' ' + student.last_name} is already attending another event at this time on ${startDateTime}.</li>`;
          }
        }
      }
    }
    conflictBlockHtml += `</ul><div><div class="form-group mb-0"><div class="form-check"><input type="checkbox" name="ignore_conflict" value="1" class="form-check-input" id="ignore_conflict"><label class="form-check-label" for="ignore_conflict">Ignore conflicts and continue</label></div></div></div></div></div>`;
    conflicts.conflictBlockHtml = conflictBlockHtml;
    conflicts.total = totalConflict;
  }

  return conflicts;
}


/**
* fetch substitute tutors.
* @param {*} req
* @param {*} res
* @returns
*/
async function renderSubstituteTutors(req, res) {
  try {
    const substituteTutors = await User.find(
      { _id: { $ne: req.body.main_tutor_id }, role: 2, isDeleted: false },
      "_id first_name last_name"
    ).sort({
      first_name: 1,
    });
    return res.send(substituteTutors);
  } catch (error) {
    console.error(error, 'renderSubstituteTutors Error.');
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * Sync transaction dates when event date changes
 * Only updates date field, nothing else
 */
async function syncTransactionDatesForEvent(eventId, newStartTime) {
  try {
    const Transaction = require("../../models/Transaction");
    
    const result = await Transaction.updateMany(
      { 
        event_id: mysqlOrm.Types.ObjectId(eventId),
        isDeleted: false 
      },
      { 
        $set: { date: newStartTime } 
      }
    );
    
    return result;
  } catch (error) {
    console.error('syncTransactionDatesForEvent error:', error);
    // Don't throw - we don't want transaction sync failure to break event update
  }
}
