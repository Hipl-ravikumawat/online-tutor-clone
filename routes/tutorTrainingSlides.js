const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");
const middleware = require("../config/middleware");

const tutorTrainingSlidesController = require("../controllers/Admin/TutorTrainingSlidesController");
var storeSlideRequest = require("../requests/TutorTrainingLesson/Slide/StoreSlideRequest");

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
/*--------end multer-------*/

/** slides crud routes. */
router.post("/store", middleware.isAuthorized(['ADMIN']), uploadContentMedia.any(), storeSlideRequest, tutorTrainingSlidesController.store);
router.post("/edit", middleware.isAuthorized(['ADMIN']), tutorTrainingSlidesController.edit);
router.get("/destroy/:slideId", middleware.isAuthorized(['ADMIN']), tutorTrainingSlidesController.destroy);
router.post("/duplicate/", middleware.isAuthorized(['ADMIN']), tutorTrainingSlidesController.duplicateSlide);
router.post("/update-position", middleware.isAuthorized(['ADMIN']), tutorTrainingSlidesController.updateSlidePosition);
// router.post("/mark-completed", slidesController.markCompleted);
/** slides crud routes. */

module.exports = router;
