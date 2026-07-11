const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");
const middleware = require("../config/middleware");

const trainingPracticesController = require("../controllers/Admin/TutorTrainingPracticesController");
const storeTrainingPracticeRequest = require("../requests/TutorTrainingLesson/Practice/StoreTutorTrainingPracticeRequest");

/*-----------multer start-----------*/
const storeContentMedia = multer.diskStorage({
  destination: (req, file, callback) => {
    const dir = `./assets/TutorTrainingContent/${req.body.content_directory}/`;
    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, { recursive: true }, (err) => callback(err, dir));
    }
    callback(null, dir);
  },
  filename: (req, file, callback) => {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    const newFileName = Date.now() + "-" + fileName;
    callback(null, newFileName);
  },
});

var uploadContentMedia = multer({
  storage: storeContentMedia,
  limits: { fieldSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, true);
  },
});

const storeTutorAssessmentMedia = multer.diskStorage({
  destination: (req, file, callback) => {
    const dir = `./assets/TutorAssessment/`;
    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, { recursive: true }, (err) => callback(err, dir));
    }
    callback(null, dir);
  },
  filename: (req, file, callback) => {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    const newFileName = Date.now() + "-" + fileName;
    callback(null, newFileName);
  },
});

var uploadTutorAssessmentMedia = multer({
  storage: storeTutorAssessmentMedia,
  fileFilter: (req, file, callback) => {
    callback(null, true);
  },
});
/*--------end multer-------*/

/** training-practices crud routes. */
router.post(
  "/store", middleware.isAuthorized(['ADMIN']),
  uploadContentMedia.any(),
  storeTrainingPracticeRequest,
  trainingPracticesController.storePractice
);

router.post(
  "/update", middleware.isAuthorized(['ADMIN']),
  uploadContentMedia.any(),
  storeTrainingPracticeRequest,
  trainingPracticesController.updatePractice
);

router.post("/duplicate/", middleware.isAuthorized(['ADMIN']), trainingPracticesController.duplicatePractice);

router.get(
  "/destroy/:practiceId/1",
  middleware.isAuthorized(["ADMIN"]),
  trainingPracticesController.destroyPractices
);

router.post("/edit", middleware.isAuthorized(['ADMIN']), trainingPracticesController.editPractice);
router.post("/update-position", middleware.isAuthorized(['ADMIN']), trainingPracticesController.updatePracticePosition);
/** training-practices crud routes. */

/** training-practices submission on a assessment. */
router.post("/check-practice-answer", middleware.isAuthorized(['ADMIN', 'TUTOR']), uploadTutorAssessmentMedia.any(),trainingPracticesController.checkPracticeAnswer);
router.post("/check-drag-and-drop-answer", middleware.isAuthorized(['ADMIN', 'TUTOR']), trainingPracticesController.checkDragAndDropAnswer);
/** training-practices submission on a assessment. */

module.exports = router;