const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");
const middleware = require("../config/middleware");

const slidesController = require("../controllers/Admin/SlidesController");
var storeSlideRequest = require("../requests/Lesson/Slide/StoreSlideRequest");

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
/*--------end multer-------*/

/** slides crud routes. */
router.post(
  "/store", uploadContentMedia.any(), storeSlideRequest, slidesController.storeSlide);
router.post("/edit", slidesController.editSlide);
router.get(
  "/destroy/:slideId/1",
  middleware.isAuthorized(['ADMIN', 'CONTENT_MANAGER']),
  slidesController.destroySlide
);
router.post("/duplicate/", slidesController.duplicateSlide);
router.post("/update-position", slidesController.updateSlidePosition);
/** slides crud routes. */

module.exports = router;