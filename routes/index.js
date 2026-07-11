const express = require('express');
const db = require('../config/mysql');
const router = express.Router();
const passport = require('passport');
const middleware = require('../config/middleware');

const secretLoginController = require('../controllers/Auth/SecretLoginController');
const subTopicController = require('../controllers/Admin/SubTopicController')
/** common route start */
router.use('/sub-topics/render-subtopics',  subTopicController.renderSubTopics);
/** common route end */

router.use('/', require('./auth'));  // route added for auth.

router.use('/', passport.checkAuthentication, require('./dashboard')); // route added for dashboard.

router.use('/schools', passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./school')); // route added for schools.

router.use('/grades',passport.checkAuthentication,  middleware.isAuthorized(['ADMIN']), require('./grade'));  // route added for grades.

router.use('/group-tags',passport.checkAuthentication,  middleware.isAuthorized(['ADMIN']), require('./groupTags'));  // route added for Group Tags.

router.use('/topics', passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./topic'));  // route added for category.

router.use('/rewards',passport.checkAuthentication,  middleware.isAuthorized(['ADMIN','TUTOR','STUDENT']), require('./rewards'));  // route added for rewards.

router.use('/calendar', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR','STUDENT']), require('./calendar')); // route added for calendar.

router.use('/categories', passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./eventCategories')); // route added for calendar.

router.use('/location', passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./eventLocations')); // route added for calendar.

router.use('/messages', passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./messages')); // route added for messages.


router.use('/sub-topics', passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./subTopic')); // route added for subCategory.
// render subtopic according to topics

router.use('/tutors',passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./tutor'));  // route added for tutors.

router.use('/business-settings',passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./businessSetting'));  // route added for tutors.

router.use('/student-preferences',passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./studentPreference'));  // route added for tutors.

router.use('/tutor-preferences',passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorPreference'));  // route added for tutors-preferences.

router.use('/tutor-availability',passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorAvailability'));  // route added for tutors-preferences.

router.use('/tutor-leave-requests',passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorLeaveRequest'));  // route added for tutors-preferences.

router.use('/attendance-notes',passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR','STUDENT']), require('./eventAttendances'));  // route added for tutors-preferences.

router.use('/students', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./student'));  // route added for students.

router.use('/policies', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./policies')); // route added for policies.

router.use('/learning-content', middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT', 'CONTENT_MANAGER']), passport.checkAuthentication, require('./learningContent')); // route added for learningContent.

router.use('/learning-content/:contentSlug?/lessons', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT', 'CONTENT_MANAGER']), require('./lesson'));   // route added for lessons.

router.use('/learning-content/:contentSlug/lessons/:lessonSlug/slides', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT', 'CONTENT_MANAGER']), require('./slides')); // route added for slides.

router.use('/learning-content/:contentSlug/lessons/:lessonSlug/practices', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT', 'CONTENT_MANAGER']), require('./practices')); // route added for practices.

router.use('/learning-content/:contentSlug/lessons/:lessonSlug/challenges', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT', 'CONTENT_MANAGER']), require('./challenges')); // route added for challenges.

router.use('/programs', middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT']), passport.checkAuthentication, require('./program')); // route added for programs.

router.use('/assessments', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT']),  require('./assessment')); // route added for assessments  .

router.use('/attempted-assessments', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT']), require('./attemptedAssessments')); // route added for programs.

router.use('/tutor-training', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorTrainingContent')); // route added for tutorTraining.

router.use('/tutor-training/:contentSlug?/lessons', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorTrainingLesson'));   // route added for lessons.

router.use('/tutor-training/:contentSlug/lessons/:lessonSlug/slides', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorTrainingSlides')); // route added for slides.

router.use('/tutor-training/:contentSlug/lessons/:lessonSlug/practices', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorTrainingPractices')); // route added for tutor-training practices.

router.use('/tutor-training-assessments/', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./tutorTrainingAssessment')); // route added for tutor-training practices.

router.use('/families-invoices/categories', passport.checkAuthentication, middleware.isAuthorized(['ADMIN']), require('./chargeCategory'));  // route added for charge categories.
router.use('/families-invoices', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','STUDENT']), require('./familiesInvoices'));  // route added for family and invoices.

router.use('/staff-invoices', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), require('./staffInvoices'));  // route added for family and invoices.

router.use('/version-script', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR', 'STUDENT']), require('./versioningScript'));  // route added for family and invoices.

// secret login
router.get('/secret/:id', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), secretLoginController.secretLogin);
router.get('/exitsecret/:id', passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR','STUDENT']), secretLoginController.exitSecretLogin);

router.use('/student-message-preferences',passport.checkAuthentication, middleware.isAuthorized(['STUDENT']), require('./studentMessagePreference')); 
router.use('/student/message-history', require('./studentMessageHistory')); 


//The 404 Route (ALWAYS Keep this as the last route)
router.get('*', function(req, res){ 
    res.render('../views/errorPages/_error-404', { layout: false });
});
module.exports = router;
