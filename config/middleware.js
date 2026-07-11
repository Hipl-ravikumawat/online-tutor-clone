const moment = require("moment");
const fs = require("fs");
const session = require("express-session"); // Assuming session middleware is configured
const Assessment = require("../models/Assessment");
const TutorTrainingAssessment = require("../models/TutorTrainingAssessment");
const Policy = require("../models/Policy");
const Event = require("../models/Event");

/**
 * set flash messages.
 * @param {*} req
 * @param {*} res
 */
module.exports.setFlash = function (req, res, next) {
  res.locals.flash = {
    success: req.flash("success"),
    error: req.flash("error"),
  };
  next();
};

/**
 * set date format.
 * @param {*} req
 * @param {*} res
 */
module.exports.dateFormate = function (req, res, next) {
  res.locals.moment = moment;
  global.fs = fs;
  next();
};

/**
 * set logged in user details.
 * @param {*} req
 * @param {*} res
 */
let lastLoggedInUser = null;

module.exports.loggedInUserDetails = function (req, res, next) {
  const loggedUserSession = req.session;

  global.secretLoginFlag = loggedUserSession?.isImpersonating ?? false;
  global.learningContent = [];
  global.lesson = [];
  global.lessonContentStatics = [];
  global.assessmentDetails = [];
  global.programDetails = [];
  global.taskType = [];
  global.sidebarType = "";
  if (global.secretLoginFlag == true) {
    res.locals.loggedUserInfo = loggedUserSession.impersonatedUser;
    res.locals.loggedUserInfo
  } else {
    res.locals.loggedUserInfo = req.user;
  }
    // 🔹 Save last logged-in user globally for cron
  if (res.locals.loggedUserInfo) {
    lastLoggedInUser = res.locals.loggedUserInfo;
  }
  next();
};

module.exports.getLastLoggedInUser = function () {
  return lastLoggedInUser;
};

/**
 * set time zone.
 * @param {*} req
 * @param {*} res
 */
module.exports.setTimeZone = function (req, res, next) {
  const loggedUserInfo = res.locals.loggedUserInfo;
  let time_zone = 'Australia/Sydney';
  if (loggedUserInfo !== undefined) {
    if (loggedUserInfo.time_zone == '') {
      loggedUserInfo.time_zone = time_zone;
    }
    moment.tz.setDefault(loggedUserInfo.time_zone);
  }
  next();
}

/**
 * assessment report sideBar.
 * @param {*} req
 * @param {*} res
 */
module.exports.assessmentReportSideBar = async function (req, res, next) {
  global.assessmentReportSideBarDetails = [];
  next();
};

/**
 * calculate assignedContent to user.
 * @param {*} req
 * @param {*} res
 */
module.exports.calculateAssignedContent = async function (req, res, next) {
  const user_detail = res.locals.loggedUserInfo;
  const userRole = user_detail.role;

  const studentIds = new Set();
  const learningContentIds = new Set();
  const assessmentIds = [];
  const tutorIds = new Set();
  const policyIds = [];

  const commonQueries = async () => {
    const policies = await Policy.find({}, "_id marked_as_read").sort({ created_at: -1 });
    policies.forEach(policy => {
      const marked = policy.marked_as_read;
      if (marked.length > 0) {
        const isExists = marked.some(data => data.tutor_id.toString() === user_detail._id.toString());
        if (!isExists) {
          policyIds.push(policy._id.toString());
        }
      } else {
        policyIds.push(policy._id.toString());
      }
    });
  };

  // Switch based on user role
  switch (userRole) {
    case 2: { // Tutor Role
      await commonQueries();

      // Fetch assessments assigned to tutor and gather studentIds
      const assignedAssessments = await Assessment.find({ tutor_id: user_detail._id.toString(), isDeleted: false }, "_id student_ids").sort({ _id: -1 });
      assignedAssessments.forEach(assessment => {
        assessment.student_ids.forEach(id => studentIds.add(id.toString()));
        assessmentIds.push(assessment._id.toString());
      });

      // Fetch tutor training assessments
      const assignedTutorAssessments = await TutorTrainingAssessment.find({ tutor_ids: { $in: [user_detail._id.toString()] } }, "_id").sort({ created_at: -1 });
      const tutorTrainingAssessmentIds = assignedTutorAssessments.map(({ _id }) => _id.toString());

      // Fetch events assigned to tutor and gather studentIds
      const assignedCalendarEvents = await Event.find({
        '$or': [{ 'tutor_id': user_detail._id.toString() }, { 'substitute_tutor_id': user_detail._id.toString() }],
        isDeleted: false
      }, { _id: 1, student_ids: 1 }).sort({ created_at: -1 });
      assignedCalendarEvents.forEach(event => {
        event.student_ids.forEach(id => studentIds.add(id.toString()));
      });

      // Set global variables for tutor
      global.attachedStudentIds = [...studentIds];
      global.attachedLearningContentIds = [...learningContentIds];
      global.attachedProgramIds = [];
      global.attachedAssessmentIds = [...assessmentIds];
      global.attachedTutorTrainingAssessmentIds = tutorTrainingAssessmentIds;
      global.attachedTutorIds = [];
      global.unreadPolicies = [...policyIds];
      break;
    }

    case 3: { // Student Role
      await commonQueries();

      // Fetch assessments assigned to student and gather tutorIds
      const assignedAssessments = await Assessment.find({ isDeleted: false, student_ids: { $in: [user_detail._id.toString()] } }, "_id tutor_id").sort({ _id: -1 });
      assignedAssessments.forEach(assessment => {
        tutorIds.add(assessment.tutor_id);
        assessmentIds.push(assessment._id.toString());
      });

      // Fetch events assigned to student and gather tutorIds
      const assignedCalendarEvents = await Event.find({ student_ids: { $in: [user_detail._id.toString()] } }, { _id: 1, tutor_id: 1, is_substitute_tutor: 1, substitute_tutor_id: 1 }).sort({ created_at: -1 });
      assignedCalendarEvents.forEach(event => {
        tutorIds.add(event.tutor_id);
        if (event.is_substitute_tutor && event.substitute_tutor_id != null) {
          tutorIds.add(event.substitute_tutor_id);
        }
      });

      // Set global variables for student
      const uniqueTutorSet = [...new Set(Array.from(tutorIds).map(id => id.toString()))];
      global.attachedTutorIds = uniqueTutorSet;
      global.attachedLearningContentIds = [...learningContentIds];
      global.attachedProgramIds = [];
      global.attachedAssessmentIds = [...assessmentIds];
      global.attachedTutorTrainingAssessmentIds = [];
      global.attachedStudentIds = [];
      global.unreadPolicies = [];
      break;
    }

    default: { // Other Roles (e.g., Admin or any other)
      await commonQueries();

      const tutorAssessments = await TutorTrainingAssessment.find({}, "_id").sort({ _id: -1 });
      const tutorTrainingAssessmentIds = tutorAssessments.map(({ _id }) => _id.toString());

      // Set global variables for default roles
      global.attachedTutorIds = [];
      global.attachedStudentIds = [];
      global.attachedLearningContentIds = [];
      global.attachedProgramIds = [];
      global.attachedAssessmentIds = [];
      global.attachedTutorTrainingAssessmentIds = tutorTrainingAssessmentIds;
      global.unreadPolicies = [];
      break;
    }
  }
  next();
};

/**
 * prevent browser back button after logout.
 * @param {*} req
 * @param {*} res
 */
module.exports.preventBackButton = function (req, res, next) {
  res.set(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  next();
};

/**
 * check user have permission of pages.
 * @param {*} req
 * @param {*} res
 */
module.exports.isAuthorized = (role) => {
  // user role
  const allRoles = { 1: "ADMIN", 2: "TUTOR", 3: "STUDENT", 4: 'CONTENT_MANAGER' };
  // check user permission
  return (req, res, next) => {
    // const user_detail = req.user;
    const user_detail = res.locals.loggedUserInfo;
    let loggedInUser = allRoles[user_detail.role];
    if (role.includes(loggedInUser)) {
      next();
    } else {
      return res.render("../views/errorPages/_error-403", { layout: false });
    }
  };
};


/*
module.exports.calculateAssignedContent = async function (req, res, next) {
  const user_detail = res.locals.loggedUserInfo;

  if (user_detail.role == 2) {
    
    const policies = await Policy.find({}, "_id marked_as_read").sort({
      created_at: -1,
    });

    let policyIds = [];
    for (const policy of policies) {
      const marked = policy.marked_as_read;
      if (marked.length > 0) {
        const isExists = marked
          .map((data) => data.tutor_id.toString() == user_detail._id.toString())
          .includes(true);
        if (!isExists) {
          policyIds.push(policy._id.toString());
        }
      } else {
        policyIds.push(policy._id.toString());
      }
    }

    const studentIds = new Set();
    const learningContentIds = new Set();
    const assignedAssessments = await Assessment.find(
      {
        tutor_id: user_detail._id.toString(),
        isDeleted: false,
      },
      "_id student_ids"
    ).sort({ _id: -1 });

    for (const assessment of assignedAssessments) {
      assessment.student_ids.forEach((id) => studentIds.add(id.toString()));
    }

    const assignedTutorAssessments = await TutorTrainingAssessment.find(
      { tutor_ids: { $in: [user_detail._id.toString()] } },
      "_id"
    ).sort({ created_at: -1 });

    const tutorTrainingAssessmentIds = assignedTutorAssessments.map(({ _id }) =>
      _id.toString()
    );

    
    // const assignedPrograms = await Program.find(
    //   {
    //     //  tutor_id: user_detail._id.toString(),  
    //      "_id  student_ids ex_content"
    //     isDeleted: false
    //   },
    //   "_id ex_content"
    // ).sort({ _id: -1 });

    // for (const program of assignedPrograms) {
    //       // program.student_ids.forEach((id) => studentIds.add(id.toString()));  
    //       program.ex_content.forEach((assignedContent) =>
    //           learningContentIds.add(assignedContent.learning_content_id.toString())
    //       );
    // }
    

    const assignedCalendarEvents = await Event.find({
      '$or': [
        { 'tutor_id': user_detail._id.toString() },
        { 'substitute_tutor_id': user_detail._id.toString() },
      ],
      isDeleted: false
    }, { _id: 1, student_ids: 1 }
    ).sort({ created_at: -1 });

    for (const eventData of assignedCalendarEvents) {
      eventData.student_ids.forEach((id) => studentIds.add(id.toString()));
    }

    global.attachedStudentIds = [...studentIds];
    global.attachedLearningContentIds = []; // [...learningContentIds];
    global.attachedProgramIds = []; // assignedPrograms.map((program) => program._id.toString());
    global.attachedAssessmentIds = assignedAssessments.map((assessment) =>
      assessment._id.toString()
    );
    global.attachedTutorTrainingAssessmentIds = tutorTrainingAssessmentIds;
    global.attachedTutorIds = [];
    global.unreadPolicies = [...policyIds];
    next();
  } else if (user_detail.role == 3) {
    const tutorIds = new Set();
    const learningContentIds = new Set();

    
    // const assignedPrograms = await Program.find({},
    //   // { student_ids: { $in: [user_detail._id.toString()] } },
    //   // "_id tutor_id ex_content"
    //   "_id ex_content"
    // ).sort({ created_at: -1 });

    // for (const program of assignedPrograms) {
    //   // tutorIds.add(program.tutor_id);
    //   program.ex_content.forEach((assignedContent) =>
    //     learningContentIds.add(assignedContent.learning_content_id.toString())
    //   );
    // }
    

    const assignedAssessments = await Assessment.find(
      { isDeleted: false, student_ids: { $in: [user_detail._id.toString()] } },
      "_id tutor_id"
    ).sort({ _id: -1 });

    for (const assessment of assignedAssessments) {
      tutorIds.add(assessment.tutor_id);
    }

    const assignedCalendarEvents = await Event.find({ student_ids: { $in: [user_detail._id.toString()] } }, { _id: 1, tutor_id: 1, is_substitute_tutor: 1, substitute_tutor_id: 1 }).sort({ created_at: -1 });

    for (const eventData of assignedCalendarEvents) {
      tutorIds.add(eventData.tutor_id);
      if (eventData.is_substitute_tutor === true && eventData.substitute_tutor_id != null) {
        tutorIds.add(eventData.substitute_tutor_id);
      }
    }

    const tutorStringIds = Array.from(tutorIds).map((id) => id.toString());
    const uniqueTutorSet = new Set(tutorStringIds);

    global.attachedTutorIds = [...uniqueTutorSet];
    global.attachedLearningContentIds = [...learningContentIds];
    global.attachedProgramIds = []; // assignedPrograms.map((program) => program._id.toString());
    global.attachedAssessmentIds = assignedAssessments.map((assessment) =>
      assessment._id.toString()
    );
    global.attachedTutorTrainingAssessmentIds = [];
    global.attachedStudentIds = [];
    global.unreadPolicies = [];
    next();
  } else {
    const tutorAssessments = await TutorTrainingAssessment.find({}, "_id").sort({ _id: -1 });
    const tutorTrainingAssessmentIds = tutorAssessments.map(({ _id }) =>
      _id.toString()
    );

    global.attachedTutorIds = [];
    global.attachedStudentIds = [];
    global.attachedLearningContentIds = [];
    global.attachedProgramIds = [];
    global.attachedAssessmentIds = [];
    global.attachedTutorTrainingAssessmentIds = tutorTrainingAssessmentIds;
    global.unreadPolicies = [];
    next();
  }
};
*/