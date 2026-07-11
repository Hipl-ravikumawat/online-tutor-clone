
const express = require('express');
const router = express.Router();
const middleware = require('../config/middleware');
const fs = require('fs');
var multer = require('multer');

const tutorTrainingAssessmentsController = require('../controllers/Admin/TutorTrainingAssessmentsController');
const TutorTrainingAssessmentsReportController = require('../controllers/Admin/TutorTrainingAssessmentsReportController');

/*-----------multer start-----------*/
const storeAssessmentMedia = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = `./assets/TutorTrainingAssessment/`;
        if (!fs.existsSync(dir)) {
            fs.mkdir(dir, { recursive: true }, (err) => callback(err, dir));
        }
        callback(null, dir);
    },
    filename: (req, file, callback) => {
        const fileName = file.originalname.toLowerCase().split(" ").join("-");
        const newFileName = Date.now() + "-" + fileName;
        req.attachment = newFileName;
        callback(null, newFileName);
    },
});

var uploadAssessmentMedia = multer({
    storage: storeAssessmentMedia,
    fileFilter: (req, file, callback) => {
        callback(null, true);
    },
});

const storeTrainingAssessmentRequest = require('../requests/TutorTrainingAssessment/StoreTrainingAssessmentRequest');
const updateTrainingAssessmentRequest = require('../requests/TutorTrainingAssessment/UpdateTrainingAssessmentRequest');

router.get('/', middleware.calculateAssignedContent, tutorTrainingAssessmentsController.index);
router.post('/dataTable', tutorTrainingAssessmentsController.dataTable);
router.get('/create', tutorTrainingAssessmentsController.create);
router.post('/store', storeTrainingAssessmentRequest, tutorTrainingAssessmentsController.store);
router.get('/edit/:slug', tutorTrainingAssessmentsController.edit);
router.post('/update', updateTrainingAssessmentRequest, tutorTrainingAssessmentsController.update);
router.get('/destroy/:id', middleware.isAuthorized(['ADMIN']), tutorTrainingAssessmentsController.destroy);

router.post("/upload-attachment", uploadAssessmentMedia.any(), tutorTrainingAssessmentsController.uploadAttachment);
router.post('/submit-tutor-assessment-slides', tutorTrainingAssessmentsController.submitTutorAssessmentSlides);
router.post('/render-training-contents', tutorTrainingAssessmentsController.renderTrainingContents);
router.post('/render-training-contents/lessons', tutorTrainingAssessmentsController.renderTrainingContentLessons);

// attempt training assessment.
router.post('/render-assigned-lesson', tutorTrainingAssessmentsController.loadAssignedLessons);
router.post('/render-assessment-sidebar', tutorTrainingAssessmentsController.viewSingle);
router.post('/attached-lesson-tasks', tutorTrainingAssessmentsController.loadAssessmentLessonTasks);
router.get('/:contentSlug/lessons/:lessonSlug/assessment/:assessmentId/:type', middleware.isAuthorized(['ADMIN', 'TUTOR']), tutorTrainingAssessmentsController.viewSingle);
router.post('/submit-tutor-assessment-practices', tutorTrainingAssessmentsController.submitTutorAssessmentPractices);

//reporting assessment
router.get('/detailed-report/:assessmentSlug', middleware.isAuthorized(['ADMIN']), TutorTrainingAssessmentsReportController.assessmentDetailedReport);
router.post('/detailed-report/dataTable', middleware.isAuthorized(['ADMIN']), TutorTrainingAssessmentsReportController.detailedReportDataTable);
router.post('/lessons-for-admin-comment', middleware.isAuthorized(['ADMIN']), TutorTrainingAssessmentsReportController.lessonForAdminComment);
router.get('/detailed-report/:assessmentId/tutor/:tutorId/lesson/:lessonId', TutorTrainingAssessmentsReportController.viewTextTypeAttemptedAssessment);
router.post('/detailed-report/text-assessment/add-comment', TutorTrainingAssessmentsReportController.addCommentForTextAssessment);

router.get('/detailed-report/:assessmentId/tutor/:tutorId', TutorTrainingAssessmentsReportController.assessmentResultOfTutor);

router.get('/detailed-report/:assessmentId/tutor/:tutorId/attempted-assessment-summary', middleware.assessmentReportSideBar, TutorTrainingAssessmentsReportController.attemptedAssessmentSummary);
router.post('/detailed-report/attempted-assessment-content-slider', TutorTrainingAssessmentsReportController.attemptedAssessmentContentSlider);

module.exports = router;
