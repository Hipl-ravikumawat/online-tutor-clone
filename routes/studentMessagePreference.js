const express = require('express');
const router = express.Router();
const passport = require('passport');

const studentPreferenceController = require('../controllers/Admin/StudentPreferenceController')
router.get('/student-message-history/:studentId',  studentPreferenceController.studentMessageHistory);



module.exports = router;