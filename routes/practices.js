const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");
const middleware = require("../config/middleware");

const practiceController = require("../controllers/Admin/PracticesController");
var storePracticeRequest = require("../requests/Lesson/Practice/StorePracticeRequest");

/*-----------multer start-----------*/
const storeContentMedia = multer.diskStorage({
  destination: (req, file, callback) => {
    const dir = `./assets/LearningContent/${req.body.content_directory}/`;
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

const storeAssessmentMedia = multer.diskStorage({
  destination: (req, file, callback) => {
    const dir = `./assets/Assessment/`;
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

var uploadAssessmentMedia = multer({
  storage: storeAssessmentMedia,
  fileFilter: (req, file, callback) => {
    callback(null, true);
  },
});
/*--------end multer-------*/

/** practices crud routes. */
router.post(
  "/store",
  uploadContentMedia.any(),
  storePracticeRequest,
  practiceController.storePractice
);
router.post(
  "/update",
  uploadContentMedia.any(),
  storePracticeRequest,
  practiceController.updatePractice
);
router.post("/duplicate/", practiceController.duplicatePractice);
router.get(
  "/destroy/:practiceId/1",
  middleware.isAuthorized(['ADMIN', 'CONTENT_MANAGER']),
  practiceController.destroyPractices
);
router.post("/edit", practiceController.editPractice);
router.post("/update-position", practiceController.updatePracticePosition);
/** practices crud routes. */

/** practices submission on a assessment. */
router.post("/checkPracticeAnswer",uploadAssessmentMedia.any(),practiceController.checkPracticeAnswer);
router.post("/checkDragAndDropAnswer",practiceController.checkDragAndDropAnswer);
/** practices submission on a assessment. */

module.exports = router;