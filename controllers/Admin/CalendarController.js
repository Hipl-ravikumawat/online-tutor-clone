const User = require("../../models/User");
const moment = require('moment-timezone');
const Event = require("../../models/Event");
const EventCategory = require("../../models/EventCategory");
const EventLocation = require("../../models/EventLocation");
const TutorAvailability = require("../../models/TutorAvailability");
const mysqlOrm = require('mysql-orm');
const { closeSync } = require("fs");
const globalHelper = require("../../_helper/GlobalHelper");
const TutorLeave = require("../../models/TutorLeave");
const BusinessSetting = require("../../models/BusinessSetting");

module.exports = {
  index,
  //---------------------
  calenderPreferences,
  fetchEventLessons,
  cancelledEvents,
  availability,
  fetchAvailability,
  checkTimezoneDifference,
  newAvailability,
  checkTutorLeave,
  fetchAvailabilityNew
};

/**
 * calender index page.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    let students = await User.find({ role: 3, status: 1, isDeleted: false }, "_id role first_name last_name").sort({ role: 1, _id: -1 });
    let tutors = await User.find({ role: 2, status: 1, isDeleted: false }, "_id role first_name last_name").sort({ role: 1, _id: -1 });

    let eventCategories = await EventCategory.find({ isDeleted: false }, "_id name").sort({ _id: -1 });
    let eventLocations = await EventLocation.find({ isDeleted: false }, "_id name").sort({ _id: -1 });

    let groupTags = await globalHelper.getGroupTagsList();
    const businessSetting = await BusinessSetting.findOne();

    const { moment } = res.locals; // Destructure moment from locals.
    return res.render("../views/admin/calendar/index", { students: students, tutors: tutors, eventCategories: eventCategories, eventLocations: eventLocations, moment: moment, groupTags: groupTags,businessSetting: businessSetting });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * cancelledEvents
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function cancelledEvents(req, res) {
  let eventId = req.params.eventId;
  let students = await User.find({ role: 3, status: 1, isDeleted: false }, "_id role first_name last_name").sort({ role: 1, first_name: 1 });
  let tutors = await User.find({ role: 2, status: 1, isDeleted: false }, "_id role first_name last_name").sort({ role: 1, first_name: 1 });
  return res.render("../views/admin/calendar/cancelled_events", { students: students, tutors: tutors, eventId: eventId });
}

/**
 * calender preferences page.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function calenderPreferences(req, res) {
  try {
    const categories = await EventCategory.aggregate([
      {
        // Match to exclude deleted categories
        $match: {
          isDeleted: false,
        },
      },
      {
        // Lookup events where the category matches
        $lookup: {
          from: 'events', // The 'events' collection
          localField: '_id', // Category _id in EventCategory
          foreignField: 'event_category_id', // event_category_id in Event
          as: 'events', // Store the matching events in 'events'
        },
      },
      {
        // Count events by grouping on category _id
        $addFields: {
          eventCount: { $size: '$events' }, // Count the number of related events
        },
      },
      {
        // Optionally, project only the fields you want
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          color: 1,
          sms_reminder: 1,
          isDeleted: 1,
          eventCount: 1, // Include event count
        },
      },
    ]);

    const locations = await EventLocation.aggregate([
      {
        // Match to exclude deleted categories
        $match: {
          isDeleted: false,
        },
      },
      {
        // Lookup events where the category matches
        $lookup: {
          from: 'events', // The 'events' collection
          localField: '_id', // Category _id in EventCategory
          foreignField: 'event_location_id', // event_category_id in Event
          as: 'events', // Store the matching events in 'events'
        },
      },
      {
        // Count events by grouping on category _id
        $addFields: {
          eventCount: { $size: '$events' }, // Count the number of related events
        },
      },
      {
        // Optionally, project only the fields you want
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          color: 1,
          icons: 1,
          location_type: 1,
          specific_address_details: 1,
          eventCount: 1, // Include event count
        },
      },
    ]);

    return res.render("../views/admin/calendar/preferences", {
      categories: categories,
      locations: locations,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * availability crud
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function availability(req, res) {
  try {
    let tutors = await User.find({ role: 2, status: 1, isDeleted: false }, "_id role first_name last_name").sort({ role: 1, first_name: 1 });
    return res.render("../views/admin/calendar/availability", { tutors: tutors });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * newAvailability crud
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function newAvailability(req, res) {
  try {
    let tutors = await User.find({ role: 2, status: 1, isDeleted: false } , "_id role first_name last_name calendar_color").sort({ role: 1, first_name: 1 });

    const formattedTutors = tutors.map(t => ({
      id: t._id,
      role: t.role,
      title: `${t.first_name || ""} ${t.last_name || ""}`.trim(),
      calendar_color: t.calendar_color || ""
    }));
    
    return res.render("../views/admin/calendar/availability2",{tutors:formattedTutors});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function fetchAvailabilityNew(req, res) {
  try {
    let { startDate, endDate, date_range, tutors, time_range } = req.body;
    
    const user_detail = res.locals.loggedUserInfo;
    let timezone = user_detail.time_zone;
    let query = {
      isDeleted: false,
    };

    let html = '';
    let slots = generateTimeSlots();
    
    if (startDate && endDate) {
      // const [startDate, endDate] = date_range.split(' - ').map(date => moment.tz(date, 'DD/MM/YYYY', 'UTC'));
      // const sDate = moment(startDate);
      // const eDate = moment(endDate);

      startDate = moment.parseZone(startDate);
      endDate = moment.parseZone(endDate);

      const startDateInTimezone = moment(startDate)
        .tz(timezone)
        .startOf('day')
        .unix();

      const endDateInTimezone = moment(endDate)
        .tz(timezone)
        .endOf('day')
        .unix();

      // Check for overlapping date ranges
      query.$or = [
        {
          start_date_time: { $lte: endDateInTimezone },
          end_date_time: { $gte: startDateInTimezone },
        },
      ];
    }
    
    if (tutors && tutors.length > 0) {
      if (typeof tutors === 'string') {
        tutors = [tutors];
      }
      const tutorObjectIds = tutors.map(id => mysqlOrm.Types.ObjectId(id));
      query.tutor_id = { $in: tutorObjectIds };
    }
    
    if (time_range) {
      slots = filterTimeSlots(time_range, slots); // Assuming this refines slots as required
      // console.log(slots, 'Filtered Slots');
    }
        
    /** ----------------------events-------------------------- */
    const tutorAvailabilitySlot = await TutorAvailability.find(query)
    .populate('tutor_id', 'calendar_color first_name last_name')
    .where({isApproved: "2"})
    .sort({ start_date_time: 1 });    
    
    let bookedData = await tutorScheduledEvents(req, res, startDate, endDate, timezone);
    
    const result = [];

    const bookingsByTutor = {};
    for (let b of bookedData) {
      const id = b.tutor_id.toString();
      if (!bookingsByTutor[id]) bookingsByTutor[id] = [];
      bookingsByTutor[id].push(b);
    }

    for (let availability of tutorAvailabilitySlot) {
      const tutorId = availability.tutor_id._id.toString();

      const rangeStart = moment.unix(availability.start_date_time).tz(timezone);
      const rangeEnd = moment.unix(availability.end_date_time).tz(timezone);

      const daysSet = new Set(availability.days);

      const loopStart = moment.max(rangeStart, startDate.clone().tz(timezone));
      const loopEnd = moment.min(rangeEnd, endDate.clone().tz(timezone));

      let current = loopStart.clone();

      while (current.isSameOrBefore(loopEnd, 'day')) {

        if (daysSet.has(current.day().toString())) {

          const start = current.clone()
            .hour(rangeStart.hour())
            .minute(rangeStart.minute())
            .second(0)
            .millisecond(0);

          const end = current.clone()
            .hour(rangeEnd.hour())
            .minute(rangeEnd.minute())
            .second(0)
            .millisecond(0);

          const tutorBookings = bookingsByTutor[tutorId] || [];

          const isBooked = tutorBookings.some(data => {
            const bStart = moment.tz(data.start_time, timezone);
            const bEnd = moment.tz(data.end_time, timezone);
            return start.isBefore(bEnd) && end.isAfter(bStart);
          });

          result.push({
            id: `${tutorId}_${start.unix()}_${end.unix()}`,
            resourceId: tutorId,
            tutorName: `${availability.tutor_id.first_name || ''} ${availability.tutor_id.last_name || ''}`.trim(),
            title: isBooked ? "Booked Slot" : "Available Slot",
            start: start.toISOString(),
            end: end.toISOString(),
            isAvailable: true,
            isBooked,
            tutorColor: availability.tutor_id.calendar_color || "#54dc86",
            backgroundColor: availability.tutor_id.calendar_color || "#54dc86",
            borderColor: availability.tutor_id.calendar_color || "#54dc86",
          });
        }

        current.add(1, 'day');
      }
    }
    
    /** create html */
    // html += `<div class="main-section"> <div class="topDiv"></div>`;
    // for (let slot of slots) {
    //   html += `<span >${slot}</span>`;
    // }
    // html += `</div>`;
    // while (sDate.isSameOrBefore(eDate)) {
    //   html += `<div class="main-section"> <div class="topDiv"> ${sDate.format('YYYY-MM-DD')}</div>`;
    //   for (let slot of slots) {
    //     const slotTime = moment.tz(`${sDate.format('YYYY-MM-DD')} ${slot}`, 'YYYY-MM-DD hh:mm A', timezone);

    //     let isAvailable = false;
    //     let isBooked = false;

    //     // Check if this time slot falls within any tutor's availability
    //     for (let availability of tutorAvailabilitySlot) {
    //       const australiaStartDate = moment.unix(availability.start_date_time).tz(timezone);
    //       const australiaEndDate = moment.unix(availability.end_date_time).tz(timezone);

    //       // time 
    //       const slotTimeTime = slotTime.format('HH:mm:ss');
    //       const startTime = australiaStartDate.format('HH:mm:ss');
    //       const endTime = australiaEndDate.format('HH:mm:ss');
    //       const slotDateStr = sDate.format('YYYY-MM-DD');

    //       // Compare time components
    //       const isAfterOrEqualStart = moment(slotTimeTime, 'HH:mm:ss').isSameOrAfter(moment(startTime, 'HH:mm:ss'));
    //       const isBeforeOrEqualEnd = moment(slotTimeTime, 'HH:mm:ss').isSameOrBefore(moment(endTime, 'HH:mm:ss'));

    //       // Compare dates
    //       if (slotTime.isSameOrAfter(australiaStartDate) && slotTime.isSameOrBefore(australiaEndDate)) {
    //         if (isAfterOrEqualStart && isBeforeOrEqualEnd) {
    //           let bookedData = await tutorScheduledEvents(req, res, startDate, endDate, timezone);
    //           if (bookedData.length > 0) {
    //             isBooked = bookedData.some(data => {
    //               const startTimeInTimezone = moment.tz(data.start_time, timezone);
    //               const endTimeInTimezone = moment.tz(data.end_time, timezone);
            
    //               const bookedStartTime = startTimeInTimezone.format('HH:mm:ss');
    //               const bookedEndTime = endTimeInTimezone.format('HH:mm:ss');
    //               const bookedDateStr = startTimeInTimezone.format('YYYY-MM-DD');
            
    //               const isTimeOverlap = moment(slotTimeTime, 'HH:mm:ss').isBetween(
    //                 moment(bookedStartTime, 'HH:mm:ss'),
    //                 moment(bookedEndTime, 'HH:mm:ss'),
    //                 null,
    //                 '[]'
    //               );
            
    //               const isDateSame = moment(slotDateStr, 'YYYY-MM-DD').isSame(bookedDateStr, 'day');
            
    //               return isTimeOverlap && isDateSame;
    //             });
    //           }
    //           isAvailable = true;
    //           break;
    //         }
    //       }
    //     }

    //     if (isAvailable) {
    //       html += `<div class="availability-slots">${isBooked ? '<span class="Book_Btn text-white">Booked</span>' : ''}</div> `;
    //     } else {
    //       html += `<span></span> `;
    //     }
    //   }
    //   html += `</div>`;
    //   sDate.add(1, 'day');
    // }

    return res.send({ html: html, availabilityArr: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * fetchAvailability of a tutor.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function fetchAvailability(req, res) {
  try {
    let { date_range, tutors, time_range } = req.body;
    const user_detail = res.locals.loggedUserInfo;
    let timezone = user_detail.time_zone;
    let query = {
      isDeleted: false,
    };

    const [startDate, endDate] = date_range.split(' - ').map(date => moment.tz(date, 'DD/MM/YYYY', 'UTC'));
    const sDate = moment(startDate);
    const eDate = moment(endDate);
    let html = '';
    let slots = generateTimeSlots();

    if (date_range) {
      const startDateInTimezone = startDate.clone().tz(timezone).startOf('day').utc().valueOf() / 1000; // Convert to seconds
      const endDateInTimezone = endDate.clone().tz(timezone).endOf('day').utc().valueOf() / 1000;     // Convert to seconds

      // Check for overlapping date ranges
      query.$or = [
        {
          start_date_time: { $lte: endDateInTimezone },
          end_date_time: { $gte: startDateInTimezone },
        },
      ];
    }
    if (tutors && tutors.length > 0) {
      if (typeof tutors === 'string') {
        tutors = [tutors];
      }
      const tutorObjectIds = tutors.map(id => mysqlOrm.Types.ObjectId(id));
      query.tutor_id = { $in: tutorObjectIds };
    }
    if (time_range) {
      slots = filterTimeSlots(time_range, slots); // Assuming this refines slots as required
      // console.log(slots, 'Filtered Slots');
    }

    /** ----------------------events-------------------------- */
    const tutorAvailabilitySlot = await TutorAvailability.find(query).sort({ start_date_time: 1 });

    // console.log(tutorAvailabilitySlot.length, 'Tutor Availability Slots');
    /** create html */
    html += `<div class="main-section"> <div class="topDiv"></div>`;
    for (let slot of slots) {
      html += `<span >${slot}</span>`;
    }
    html += `</div>`;
    while (sDate.isSameOrBefore(eDate)) {
      html += `<div class="main-section"> <div class="topDiv"> ${sDate.format('YYYY-MM-DD')}</div>`;
      for (let slot of slots) {
        const slotTime = moment.tz(`${sDate.format('YYYY-MM-DD')} ${slot}`, 'YYYY-MM-DD hh:mm A', timezone);

        let isAvailable = false;
        let isBooked = false;

        // Check if this time slot falls within any tutor's availability
        for (let availability of tutorAvailabilitySlot) {
          const australiaStartDate = moment.unix(availability.start_date_time).tz(timezone);
          const australiaEndDate = moment.unix(availability.end_date_time).tz(timezone);

          // time 
          const slotTimeTime = slotTime.format('HH:mm:ss');
          const startTime = australiaStartDate.format('HH:mm:ss');
          const endTime = australiaEndDate.format('HH:mm:ss');
          const slotDateStr = sDate.format('YYYY-MM-DD');

          // Compare time components
          const isAfterOrEqualStart = moment(slotTimeTime, 'HH:mm:ss').isSameOrAfter(moment(startTime, 'HH:mm:ss'));
          const isBeforeOrEqualEnd = moment(slotTimeTime, 'HH:mm:ss').isSameOrBefore(moment(endTime, 'HH:mm:ss'));

          // Compare dates
          if (slotTime.isSameOrAfter(australiaStartDate) && slotTime.isSameOrBefore(australiaEndDate)) {
            if (isAfterOrEqualStart && isBeforeOrEqualEnd) {
              let bookedData = await tutorScheduledEvents(req, res, startDate, endDate, timezone);
              if (bookedData.length > 0) {
                isBooked = bookedData.some(data => {
                  const startTimeInTimezone = moment.tz(data.start_time, timezone);
                  const endTimeInTimezone = moment.tz(data.end_time, timezone);

                  const bookedStartTime = startTimeInTimezone.format('HH:mm:ss');
                  const bookedEndTime = endTimeInTimezone.format('HH:mm:ss');
                  const bookedDateStr = startTimeInTimezone.format('YYYY-MM-DD');

                  const isTimeOverlap = moment(slotTimeTime, 'HH:mm:ss').isBetween(
                    moment(bookedStartTime, 'HH:mm:ss'),
                    moment(bookedEndTime, 'HH:mm:ss'),
                    null,
                    '[]'
                  );

                  const isDateSame = moment(slotDateStr, 'YYYY-MM-DD').isSame(bookedDateStr, 'day');

                  return isTimeOverlap && isDateSame;
                });
              }
              isAvailable = true;
              break;
            }
          }
        }

        if (isAvailable) {
          html += `<div class="availability-slots">${isBooked ? '<span class="Book_Btn text-white">Booked</span>' : ''}</div> `;
        } else {
          html += `<span></span> `;
        }
      }
      html += `</div>`;
      sDate.add(1, 'day');
    }

    return res.send({ html: html });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
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
      _id: -1,
    });

    return res.send(substituteTutors);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * fetch lessons of an event.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function fetchEventLessons(req, res) {
  try {
    return res.render("../views/admin/calendar/courses");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * create time slots based on availability.
 * @returns 
 */
function generateTimeSlots() {
  const slots = [];
  const start = new Date();
  start.setHours(7, 0, 0, 0); // Start at 7:00 AM

  for (let i = 0; i < 48; i++) { // 48 half-hour intervals in 24 hours
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert to 12-hour format
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    slots.push(`${displayHours}:${displayMinutes} ${ampm}`);
    start.setMinutes(start.getMinutes() + 30); // Add 30 minutes
  }

  return slots;
}


//-------Function to filter time slots based on a given time range

/**
 * filtering timeSlots
 * @param {*} timeRange 
 * @param {*} slots 
 * @returns 
 */
function filterTimeSlots(timeRange, slots) {
  const [startTimeStr, endTimeStr] = timeRange.split(' - ');

  // Helper function to convert a time string to a 24-hour format hour and minute
  function convertTo24Hour(timeStr) {
    let [time, period] = timeStr.split(' ');
    let [hour, minute] = time.split(':').map(Number);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
  }

  const { hour: startHour, minute: startMinute } = convertTo24Hour(startTimeStr);
  const { hour: endHour, minute: endMinute } = convertTo24Hour(endTimeStr);

  const filteredSlots = slots.filter(slot => {
    const { hour: slotHour, minute: slotMinute } = convertTo24Hour(slot);
    const totalSlotMinutes = slotHour * 60 + slotMinute;
    const totalStartMinutes = startHour * 60 + startMinute;
    const totalEndMinutes = endHour * 60 + endMinute;
    return totalSlotMinutes >= totalStartMinutes && totalSlotMinutes <= totalEndMinutes;
  });

  return filteredSlots;
}

/**
 * get scheduled events of a tutor.
 * @param {*} req 
 * @param {*} res 
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} timezone 
 * @returns 
 */
async function tutorScheduledEvents(req, res, startDate, endDate, timezone) {
  let { tutors } = req.body;

  // Convert start and end date from user's timezone to UTC
  const utcStartDate = moment.tz(startDate, timezone).startOf('day').utc().toDate(); // Start of the day in UTC
  const utcEndDate = moment.tz(endDate, timezone).endOf('day').utc().toDate();     // End of the day in UTC

  let query = {};

  // console.log(startDate, 'Form Dates', endDate);
  // console.log(utcStartDate, 'UTC Time ', utcEndDate);
  // console.log("===================")
  // console.log("===================")

  // Check if tutors are provided and filter by tutor IDs or substitute tutors
  if (tutors && tutors.length > 0) {
    if (typeof tutors === 'string') {
      tutors = [tutors];
    }
    const tutorObjectIds = tutors.map(id => mysqlOrm.Types.ObjectId(id));
    query.$or = [
      { tutor_id: { $in: tutorObjectIds } },
      { substitute_tutor_id: { $in: tutorObjectIds } }
    ];
  }

  // Add date range filtering using startDate and endDate
  if (startDate && endDate) {
    query.$and = [
      { start_time: { $gte: utcStartDate } },
      { end_time: { $lte: utcEndDate } }
    ];
  }

  try {
    const tutorEvents = await Event.find(query);
    return tutorEvents;
  } catch (error) {
    console.error('Error finding events:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check timezone differences between tutor and students
 */
async function checkTimezoneDifference(req, res) {
  try {
    const { tutor_id, student_ids, substitute_tutor_id } = req.body;

    // Validate required fields
    if (!tutor_id || !student_ids || student_ids.length === 0) {
      return res.status(200).json({
        success: true,
        hasDifference: false
      });
    }

    const globalHelper = require("../../_helper/GlobalHelper");
    const result = await globalHelper.checkTimezoneDifferences(
      tutor_id,
      student_ids,
      substitute_tutor_id || null
    );

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Error in checkTimezoneDifference:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check timezone differences"
    });
  }
}

const formatDate = (date, formatType = 'YYYY-MM-DD') => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (formatType === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  return `${day}-${month}-${year}`;
};

async function checkTutorLeave(req, res) {
  try {
    const {
      tutor_id,
      substitute_tutor_id,
      start_date,
      is_recurring,
      recurring_type,
      no_of_week,
      no_of_fortnightly,
      repeat_until_date
    } = req.body;

    let datesToCheck = [start_date];

    if (is_recurring === 'true' || is_recurring === true) {
      const startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);

      let endDate = null;
      if (repeat_until_date && repeat_until_date !== 'undefined' && repeat_until_date !== '') {
        if (repeat_until_date.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const parts = repeat_until_date.split('-');
          endDate = new Date(parts[2], parts[1] - 1, parts[0]);
          endDate.setHours(23, 59, 59, 999);
        } else {
          endDate = new Date(repeat_until_date);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      let numberOfOccurrences = 0;
      let intervalDays = 0;

      if (recurring_type === 'weekly' && no_of_week && parseInt(no_of_week) > 0) {
        numberOfOccurrences = parseInt(no_of_week);
        intervalDays = 7; 
      }
      else if (recurring_type === 'fortnightly' && no_of_fortnightly && parseInt(no_of_fortnightly) > 0) {
        numberOfOccurrences = parseInt(no_of_fortnightly);
        intervalDays = 14; 
      }

      if (numberOfOccurrences > 0 && intervalDays > 0) {
        for (let i = 1; i < numberOfOccurrences; i++) {
          let nextDate = new Date(startDate);
          nextDate.setDate(nextDate.getDate() + (i * intervalDays));

          const dateStr = nextDate.toISOString().split('T')[0];

          if (endDate && nextDate > endDate) {
            break;
          }

          datesToCheck.push(dateStr);
        }
      }

    }

    const tutorsToCheck = [];
    if (tutor_id) tutorsToCheck.push({ id: tutor_id, type: 'main', name: 'Main Tutor' });
    if (substitute_tutor_id) tutorsToCheck.push({ id: substitute_tutor_id, type: 'substitute', name: 'Substitute Tutor' });
    
    const conflicts = [];

    for (const tutor of tutorsToCheck) {

      for (const dateToCheck of datesToCheck) {

        const checkStart = moment(dateToCheck)
          .startOf('day')
          .toDate();

        const checkEnd = moment(dateToCheck)
          .endOf('day')
          .toDate();

        const leaves = await TutorLeave.find({
          tutor_id: tutor.id,
          isApproved: '2',
          isDeleted: false,
          start_date: { $lte: checkEnd },
          end_date: { $gte: checkStart }
        });

        if (leaves.length > 0) {

          for (const leave of leaves) {

            conflicts.push({
              tutor_type: tutor.type,
              tutor_name: tutor.name,
              tutor_id: tutor.id,
              date: dateToCheck,
              start_date: moment.utc(leave.start_date).format('YYYY-MM-DD'),
              end_date: moment.utc(leave.end_date).format('YYYY-MM-DD'),
              note: leave.note || 'On Leave'
            });

          }

        }
      }
    }

    const uniqueConflicts = conflicts.filter((conflict, index, self) =>
      index === self.findIndex((c) =>
        c.tutor_id === conflict.tutor_id && c.date === conflict.date
      )
    );

    // if (uniqueConflicts.length > 0) {
    //   console.log('Conflicts:', JSON.stringify(uniqueConflicts, null, 2));
    // }

    return res.json({
      hasConflict: uniqueConflicts.length > 0,
      conflicts: uniqueConflicts
    });

  } catch (error) {
    console.error('Error checking tutor leave:', error);
    return res.status(500).json({
      error: 'Failed to check tutor leave status'
    });
  }
}