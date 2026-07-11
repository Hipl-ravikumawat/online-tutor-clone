const express = require('express');
const router = express.Router();
const middleware = require('../config/middleware');
const attemptedAssessmentController = require('../controllers/Admin/AttemptedAssessmentsController');

router.get('/detailed-report/:assessment_slug', middleware.isAuthorized(['ADMIN','TUTOR']), middleware.calculateAssignedContent, attemptedAssessmentController.assessmentDetailedReport);
router.post('/detailed-report/dataTable', attemptedAssessmentController.detailedReportDataTable);
router.post('/lessons-for-tutor-comment',  attemptedAssessmentController.loadLessonsForTutorComment);

router.get('/detailed-report/:assessmentId/student/:studentId',  attemptedAssessmentController.assessmentResultOfStudent);
router.get('/detailed-report/:assessmentId/student/:studentId/attempted-assessment-summary',  middleware.assessmentReportSideBar, attemptedAssessmentController.studentAttemptedAssessmentSummary);
router.post('/detailed-report/attempted-assessment-content-slider', attemptedAssessmentController.attemptedAssessmentContentSlider);
router.get('/detailed-report/:assessmentId/student/:studentId/lesson/:lessonId',  middleware.isAuthorized(['TUTOR']), attemptedAssessmentController.viewTextTypeAttemptedAssessment);
router.post('/detailed-report/text-assessment/add-comment',  attemptedAssessmentController.addCommentForTextAssessment);

router.get('/report',  attemptedAssessmentController.allStudentsReport);
router.post('/filter-report',  attemptedAssessmentController.filterAssessmentReport);
router.post('/calculate-result',  attemptedAssessmentController.calculateResult);

module.exports = router;