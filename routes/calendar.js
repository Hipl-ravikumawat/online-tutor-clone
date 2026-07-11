const express         = require('express');
const router          = express.Router();
const multer = require("multer");
const upload = multer();

const calendarController  = require('../controllers/Admin/CalendarController');
const eventsController  = require('../controllers/Admin/EventsController');
const eventCourseController  = require('../controllers/Admin/EventCourseController');

router.get('/', calendarController.index);
router.get('/cancelled-events/:eventId?', calendarController.cancelledEvents);
router.get('/preferences', calendarController.calenderPreferences);
router.get('/availability-old', calendarController.availability);
router.get('/availability', calendarController.newAvailability);
router.post('/fetch-availability',upload.none(), calendarController.fetchAvailability);
router.post('/fetch-availability-new',upload.none(), calendarController.fetchAvailabilityNew);

//---------- event crud ----------------------------------------------------------------------------
var storeEventRequest  = require('../requests/CalendarEvent/StoreEventRequest');
var cloneEventRequest  = require('../requests/CalendarEvent/CloneEventRequest');

router.post('/fetch-events', eventsController.fetchEvents);

router.get('/add-new-event', eventsController.addAnEvent);
router.post('/store-new-event', upload.none(), storeEventRequest, eventsController.storeAnEvent);
router.post('/store-cloned-event', upload.none(), cloneEventRequest, eventsController.cloneAnEvent);

router.get('/edit-an-event/:eventId', eventsController.editAnEvent);
router.post('/update-event', upload.none(), storeEventRequest, eventsController.updateAnEvent);

router.post('/cancel-this-event', upload.none(), eventsController.cancelThisEvent);
router.post('/cancel-event-listing', upload.none(), eventsController.cancelEventListing);

router.post('/destroy-an-event', upload.none(), eventsController.destroyAnEvent);

router.post('/check-recurring-events', upload.none(), eventsController.checkRecurringEvents);

router.post('/fetch-student-pricing', upload.none(), eventsController.fetchStudentPricing);

//- related functions

router.post('/render-substitute-tutors', eventsController.renderSubstituteTutors);
//---------- event crud ----------------------------------------------------------------------------

//---------- event lessons  ----------------------------------------------------------------------------
router.get('/:eventId/lesson/:lessonId/course-details', eventCourseController.courseDetails);
router.post('/course-details/listing', eventCourseController.courseDetailsListing);

router.get('/:eventId/event-lessons', calendarController.fetchEventLessons);
router.post('/courses-dataTable', eventCourseController.coursesDataTable);
router.post("/slide-mark-as-complete/:eventId", eventCourseController.markCompleted);

router.post('/check-timezone-difference', calendarController.checkTimezoneDifference);
router.post('/check-tutor-leave', calendarController.checkTutorLeave);


//---------- event lessons ----------------------------------------------------------------------------

module.exports = router; 