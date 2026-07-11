const express = require('express');
const router = express.Router();
const middleware = require('../config/middleware');

/** Lesson routes */
const lessonsController = require('../controllers/Admin/LessonsController');

var storeLessonRequest = require('../requests/Lesson/StoreLessonRequest');
var updateLessonRequest = require('../requests/Lesson/UpdateLessonRequest');

router.get('/',  middleware.isAuthorized(['ADMIN','TUTOR','STUDENT', 'CONTENT_MANAGER']), lessonsController.index);
router.get('/program/:taskId?',  middleware.isAuthorized(['ADMIN','TUTOR','STUDENT', 'CONTENT_MANAGER']), lessonsController.index);
router.post('/listing/',  lessonsController.dataTable);
router.post('/store',  storeLessonRequest, lessonsController.store);
router.post('/update/:id',  updateLessonRequest, lessonsController.update);
router.get('/destroy/:id',  middleware.isAuthorized(['ADMIN', 'CONTENT_MANAGER']), lessonsController.destroy);
router.post('/duplicate-lesson',  lessonsController.duplicateLesson);
router.post('/update-position/',  lessonsController.updateLessonPosition);

router.get('/:lessonSlug/:type?/:lessonType?/:taskId?',  middleware.isAuthorized(['ADMIN','TUTOR','STUDENT', 'CONTENT_MANAGER']), lessonsController.viewSingle);
router.post('/content-slider/',  lessonsController.contentSlider);

module.exports = router;