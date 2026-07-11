const express = require('express');
const router = express.Router();
const middleware = require('../config/middleware');

/** Lesson routes */
const tutorTrainingLessonController = require('../controllers/Admin/TutorTrainingLessonController');

const storeTutorTrainingLessonRequest = require('../requests/TutorTrainingLesson/StoreTutorTrainingLessonRequest');
const updateTutorTrainingLessonRequest = require('../requests/TutorTrainingLesson/UpdateTutorTrainingLessonRequest');

router.get('/', middleware.isAuthorized(['ADMIN','TUTOR']), tutorTrainingLessonController.index);
router.post('/listing/', middleware.isAuthorized(['ADMIN','TUTOR']), tutorTrainingLessonController.listing);
router.post('/store', middleware.isAuthorized(['ADMIN']), storeTutorTrainingLessonRequest, tutorTrainingLessonController.store);
router.post('/update/:id', middleware.isAuthorized(['ADMIN']), updateTutorTrainingLessonRequest, tutorTrainingLessonController.update);
router.get('/destroy/:id', middleware.isAuthorized(['ADMIN']), tutorTrainingLessonController.destroy);
router.post('/update-position/', middleware.isAuthorized(['ADMIN']), tutorTrainingLessonController.updateLessonPosition);
router.post('/duplicate-lesson', middleware.isAuthorized(['ADMIN']), tutorTrainingLessonController.duplicateLesson);
router.get('/:lessonSlug/:lessonId', middleware.isAuthorized(['ADMIN','TUTOR']), tutorTrainingLessonController.viewSingle);
router.post('/content-slider/', middleware.isAuthorized(['ADMIN','TUTOR']), tutorTrainingLessonController.contentSlider);

module.exports = router;