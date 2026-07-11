const mysqlOrm = require('mysql-orm');
const fs = require("fs");
var slugify = require("slugify");
const path = require("path");
const User = require("../../models/User");
const Transaction = require("../../models/Transaction");
const LearningContent = require("../../models/LearningContent");
const Assessment = require("../../models/Assessment");
const Event = require("../../models/Event");
const EventTemplate = require("../../models/EventTemplate");
const template = require("../../config/template");
const pdf = require("pdf-creator-node");
const globalConstant = require("../../_helper/GlobalConstants");

const PointBalance = require("../../models/PointBalance");
const TutorLeave = require("../../models/TutorLeave");

module.exports = {
  dashboard,
  weekAgenda,
  tutorEvents,
  drag_drop
};

/**
 * dashboard page.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function dashboard(req, res) {
  try {
    const { moment } = res.locals; // Destructure moment from locals
    const user_detail = res.locals.loggedUserInfo;
    const loggedUserId = user_detail._id.toString();
    const currency = globalConstant.currency;

    const startDate = moment().startOf('month').format('YYYY-MM-DD');
    const endDate = moment().endOf('month').format('YYYY-MM-DD');

    if (user_detail.role == 1) {
      // admin..
      const [
        activeTutors,
        activeStudents,
        activeLearningContents,
        activeAssessments,
        totalPayments,
        pendingCancellationRequests,
        pendingLeaveRequests,
        pendingLeaveTutors,
      ] = await Promise.all([
        User.countDocuments({ role: 2, status: 1, isDeleted: false }),
        User.countDocuments({ role: 3, status: 1, isDeleted: false }),
        LearningContent.countDocuments({ status: 1, isDeleted: false }),
        Assessment.countDocuments({ isDeleted: false }),
        Transaction.countDocuments({ type: 'Payment', isDeleted: false, createdAt: { $gte: startDate, $lte: endDate } }),
        Event.countDocuments({
          status: 'Requested_To_Cancel',
          isDeleted: false
        }),

        // Pending leave requests
        TutorLeave.countDocuments({
          isApproved: '1'
        }),
        TutorLeave.find({
          isApproved: '1'
        })
        .populate({
          path: 'tutor_id',
          select: 'first_name last_name'
        })
        .select('tutor_id start_date end_date')
        .lean()
      ]);

      const projectedRevenueData = await Transaction.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            type: { $in: ['Charge', 'Discount'] } // only include these types
          },
        },
        {
          $group: {
            _id: "$type",
            totalAmount: { $sum: "$amount" }
          },
        },
      ]);

      // Initialize totals
      let totalCharge = 0;
      let totalDiscount = 0;

      projectedRevenueData.forEach(item => {
        if (item._id === 'Charge') totalCharge = item.totalAmount;
        if (item._id === 'Discount') totalDiscount = item.totalAmount;
      });

      const revenue = totalCharge - totalDiscount;
      // const revenue = revenueData.length > 0 ? revenueData[0].total : 0;
      const staticesObject = {
        tutors: activeTutors,
        students: activeStudents,
        learningContents: activeLearningContents,
        assessments: activeAssessments,
        attachedTutorTrainingAssessmentIds:
          attachedTutorTrainingAssessmentIds?.length !== undefined
            ? attachedTutorTrainingAssessmentIds?.length
            : 0,
        revenue: revenue,
        totalPayments: totalPayments,
        pendingCancellationRequests: pendingCancellationRequests || 0,
        pendingLeaveRequests: pendingLeaveRequests || 0,
        pendingLeaveTutors: pendingLeaveTutors || [],
      };
      const eventNoteTemplates = [];

      return res.render("../views/admin/dashboard/dashboard", {
        staticesData: staticesObject,
        currency,
        templates: eventNoteTemplates,
      });
    }

    if (user_detail.role == 2) {

      const projectedRevenueData = await Transaction.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            type: { $in: ['Charge', 'Discount'] }, // only include these types
            student_id: { $in: attachedStudentIds.map(id => new mysqlOrm.Types.ObjectId(id)) }
          },
        },
        {
          $group: {
            _id: "$type",
            totalAmount: { $sum: "$amount" }
          },
        },
      ]);

      // Initialize totals
      let totalCharge = 0;
      let totalDiscount = 0;

      projectedRevenueData.forEach(item => {
        if (item._id === 'Charge') totalCharge = item.totalAmount;
        if (item._id === 'Discount') totalDiscount = item.totalAmount;
      });

      const revenue = totalCharge - totalDiscount;
      
      const totalPayments = await Transaction.countDocuments({ type: 'Payment', isDeleted: false, createdAt: { $gte: startDate, $lte: endDate }, student_id: { $in:attachedStudentIds } });

      const activeLearningContents = await LearningContent.countDocuments({ status: 1, isDeleted: false });
      const userTimeZone = user_detail.time_zone || 'UTC';
      const todayStartUTC = moment().utc().startOf('day').toDate();
      const todayEndUTC = moment().utc().endOf('day').toDate();

      const dashboardEvents = await Event.find({
        $or: [
          { tutor_id: mysqlOrm.Types.ObjectId(loggedUserId) },
          { substitute_tutor_id: mysqlOrm.Types.ObjectId(loggedUserId) }
        ],
        start_time: { $gte: todayStartUTC, $lt: todayEndUTC }
      }, "parent_event_id tutor_id is_substitute_tutor substitute_tutor_id student_ids event_category_id event_location_id start_date end_time start_time duration will_repeat public_note private_note status")
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
        })
        .populate('substitute_tutor_id')
        .sort({ start_date: -1 });

      staticesObject = {
        students:
          attachedStudentIds?.length !== undefined
            ? attachedStudentIds?.length
            : 0,
        learningContents: activeLearningContents ?? 0,
        assessments:
          attachedAssessmentIds?.length !== undefined
            ? attachedAssessmentIds?.length
            : 0,
        unreadPolicies:
          unreadPolicies?.length !== undefined ? unreadPolicies?.length : 0,
        attachedTutorTrainingAssessmentIds:
          attachedTutorTrainingAssessmentIds?.length !== undefined
            ? attachedTutorTrainingAssessmentIds?.length
            : 0,
        revenue,
        totalPayments,
      };

      let eventNoteTemplates = await EventTemplate.find({ isDeleted: false }, { name: 1, description: 1 });
      return res.render("../views/admin/dashboard/dashboard", {
        staticesData: staticesObject,
        templates: eventNoteTemplates,
        currency,
        dashboardEvents,
        userTimeZone,
        moment,
      });
    }

    if (user_detail.role == 3) {
      const stdPointBalance = await PointBalance.findOne({ userId: mysqlOrm.Types.ObjectId(loggedUserId) }).lean();

      const studentAssessments = await Assessment.find({
        student_ids: { $in: [mysqlOrm.Types.ObjectId(loggedUserId)] }
      })
        .select('_id, student_ids, student_assessment_ids, date')
        .populate({
          path: "student_assessment_ids",
          model: "student_assessments",
          match: { student_id: mysqlOrm.Types.ObjectId(loggedUserId), status: { $ne: "Completed" } },
          populate: [
            {
              path: "student_id",
              model: "users",
              select: "_id first_name last_name",
              match: { _id: mysqlOrm.Types.ObjectId(loggedUserId) },
            },
          ],
        });

      let stdAssessmentArray = [];
      for (let assessment of studentAssessments) {
        for (let std_assessment of assessment.student_assessment_ids) {
          let assessmentData = std_assessment._doc ? std_assessment._doc : std_assessment;
          let newStdAssessment = { ...assessmentData, assessmentDate: assessment.date };
          stdAssessmentArray.push(newStdAssessment);
        }
      }

      staticesObject = {
        tutors:
          attachedTutorIds?.length !== undefined ? attachedTutorIds?.length : 0,
        learningContents:
          attachedLearningContentIds?.length !== undefined
            ? attachedLearningContentIds?.length
            : 0,
        assessments:
          attachedAssessmentIds?.length !== undefined
            ? attachedAssessmentIds?.length
            : 0,
        pointsBalance:
          stdPointBalance?.balance !== undefined
            ? stdPointBalance?.balance
            : 0,
      };

       const eventNoteTemplates = [];

      return res.render("../views/admin/dashboard/dashboard", {
        staticesData: staticesObject,
        stdAssessmentArray: stdAssessmentArray,
        templates: eventNoteTemplates,
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
 * week agenda.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function weekAgenda(req, res) {
  try {
    let obj = {};
    const { moment } = res.locals; // Destructure moment from locals
    const user_detail = res.locals.loggedUserInfo;
    const userRole = user_detail.role;
    const userTimeZone = user_detail.time_zone;

    // Calculate the start and end of the current day in the user's timezone, then convert to UTC
    const currentDateUTC = moment().utc();
    const startOfDayUTC = currentDateUTC.startOf('day').toDate();
    const endOfDayUTC = currentDateUTC.endOf('day').toDate();

    if (userRole === 2) {
      const tutorId = mysqlOrm.Types.ObjectId(user_detail._id);
      obj['$or'] = [
        { 'tutor_id': tutorId },
        { 'substitute_tutor_id': tutorId }
      ];
    } else if (userRole === 3) {
      obj['student_ids'] = mysqlOrm.Types.ObjectId(user_detail._id);
    }

    // Filter events occurring today in UTC based on start_time
    obj['start_time'] = {
      $gte: startOfDayUTC,
      $lt: endOfDayUTC
    }

    const calenderEvents = await Event.find(obj, "parent_event_id tutor_id is_substitute_tutor substitute_tutor_id student_ids event_category_id event_location_id start_date end_time start_time duration  will_repeat public_note private_note status")
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
      .sort({ start_date: -1 });

    contentHtml = template.render(
      {
        calenderEvents: calenderEvents,
        userRole: userRole,
        moment: moment,
        userTimeZone: userTimeZone,
      }, "/dashboard/weekEvents.ejs");

    return res.status(200).json({
      success: true,
      contentHtml: contentHtml
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

///--------------- tutorEvents function for AJAX

async function tutorEvents(req, res) {
  try {
    const { moment } = res.locals;
    const user_detail = res.locals.loggedUserInfo;
    const loggedUserId = user_detail._id.toString();
    const userTimeZone = user_detail.time_zone || 'UTC';

    // Get date from query, default to today
    const selectedDate = req.query.date ? moment(req.query.date, 'YYYY-MM-DD') : moment();
    const startOfDayUTC = selectedDate.utc().startOf('day').toDate();
    const endOfDayUTC = selectedDate.utc().endOf('day').toDate();

    const dashboardEvents = await Event.find({
      $or: [
        { tutor_id: mysqlOrm.Types.ObjectId(loggedUserId) },
        { substitute_tutor_id: mysqlOrm.Types.ObjectId(loggedUserId) }
      ],
      start_time: { $gte: startOfDayUTC, $lt: endOfDayUTC }
    }, "parent_event_id tutor_id is_substitute_tutor substitute_tutor_id student_ids event_category_id event_location_id start_date end_time start_time duration will_repeat public_note private_note status")
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
        select: { _id: 1, attendees: 1, group_note_id: 1 }, // add this
        populate: {
          path: "group_note_id",
          model: "event_group_notes_and_attachments",
          select: { _id: 1, tutor_note: 1, student_note: 1, parent_note: 1, attachments: 1 }
        }
      })
      .populate('substitute_tutor_id')
      .sort({ start_date: -1 });
      

    const contentHtml = template.render(
      {
        dashboardEvents: dashboardEvents,
        userTimeZone: userTimeZone,
        moment: moment,
      }, "/dashboard/tutorEvents.ejs");

    return res.status(200).json({
      success: true,
      contentHtml: contentHtml
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

///--------------- Other dev functions....

/**
 * drag_drop
 * @param {*} req 
 * @param {*} res 
 * @returns  */

async function drag_drop(req, res) {
  try {
    return res.render("../views/admin/drag_drop");

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * dialog_template
 * @param {*} req 
 * @param {*} res 
 * @returns 

  async function dialog_template(req, res) {
    try {
      return res.render("../views/admin/dialog-template");
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
  }
 */

/**
 * dialog_template
 * @param {*} req 
 * @param {*} res 
 * @returns 
  async function buildSchema(req, res) {
    try {
        const user_detail = res.locals.loggedUserInfo;
        const userId = user_detail._id.toString();
        if(user_detail.role == 1 || user_detail.role == 4){ 
            // admin..
            const [
                activeTutors,
                activeStudents,
                activeLearningContents,
                activeAssessments,
              ] = await Promise.all([
                User.countDocuments({ role: 2, status: 1, isDeleted: false }),
                User.countDocuments({ role: 3, status: 1, isDeleted: false }),
                LearningContent.countDocuments({ status: 1, isDeleted: false }),
                Assessment.countDocuments({ isDeleted: false }),
              ]);
            const staticesObject = {
                tutors: activeTutors,
                students: activeStudents,
                learningContents: activeLearningContents,
                assessments: activeAssessments,
                attachedTutorTrainingAssessmentIds: attachedTutorTrainingAssessmentIds?.length !== undefined ? attachedTutorTrainingAssessmentIds?.length : 0,
            };
           
            return res.render('../views/admin/dashboard', {staticesData : staticesObject});
        }


    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
  }
*/
