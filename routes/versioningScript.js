const express = require('express');
const router = express.Router();
const passport = require('passport');
const middleware = require('../config/middleware');
const multer = require('multer');

const tutorTrainingScriptController = require('../controllers/VersioningScript/TutorTrainingScriptController');

// ✅ Multer setup (no files allowed, only text fields if multipart/form-data is sent)
const uploadNone = multer().none();

// ✅ Routes
router.get('/',uploadNone,tutorTrainingScriptController.index);

// router.post('/create',uploadNone,tutorTrainingScriptController.create);

module.exports = router;
