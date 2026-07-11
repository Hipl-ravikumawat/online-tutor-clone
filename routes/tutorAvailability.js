const express = require('express');
const router = express.Router();
const passport = require('passport');

const tutorAvailability = require('../controllers/Admin/TutorAvailabilityController');
let StoreTutorAvailabilityRequest = require('../requests/Tutor/StoreTutorAvailabilityRequest');

router.get('/', tutorAvailability.index);
router.post('/store', StoreTutorAvailabilityRequest, tutorAvailability.store);
router.post('/edit', tutorAvailability.edit);
router.post('/availability-approval', tutorAvailability.availabilityApproval);
router.get('/destroy/:availabilityId', tutorAvailability.destroy);

module.exports = router;