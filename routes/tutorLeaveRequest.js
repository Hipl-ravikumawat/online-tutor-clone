const express = require('express');
const router = express.Router();
const passport = require('passport');

const TutorLeaveRequest = require('../controllers/Admin/TutorLeaveRequestController');
let StoreTutorLeaveRequest = require('../requests/Tutor/StoreTutorLeaveRequest');

router.get('/', TutorLeaveRequest.index);
router.post('/store', StoreTutorLeaveRequest, TutorLeaveRequest.store);
router.post('/edit', TutorLeaveRequest.edit);
router.post('/leave-approval', TutorLeaveRequest.leaveApproval);
router.get('/destroy/:leaveRequestId', TutorLeaveRequest.destroy);

module.exports = router;