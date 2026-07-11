const express = require("express");
const router = express.Router();
const passport = require("passport");
const fs = require("fs");
var multer = require("multer");

const tutorPreferencesController = require("../controllers/Admin/TutorPreferencesController");

/*-----------multer start-----------*/
const storeAttachments = multer.diskStorage({
  destination: (req, file, callback) => {
    let folder  = req.body.folder !== undefined ? req.body.folder : 'UserAttachments';
    const dir = "./assets/"+folder;
    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, (err) => callback(err, dir));
    }
    callback(null, dir);
  },
  filename: (req, file, callback) => {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    const newFileName = Date.now() + fileName;
    callback(null, newFileName);
  },
});

const uploadAttachments = multer({
  storage: storeAttachments,
  limits: { fileSize: 25 * 1024 * 1024 }, // Set file size limit in bytes (25 MB)
  fileFilter: (req, file, callback) => {
    const allowedExtensions = ["jpg", "png", "mp4", "pdf", "docx", "xlsx"];
    const extension = file.originalname.split(".").pop().toLowerCase();
    const isValid = allowedExtensions.includes(extension);

    if (isValid) {
        callback(null, true); // Allow only specified extensions
    }
    else {
        callback(null, false);
        return callback(new Error('Only .jpg, .png .mp4 .pdf .docx and .xlsx format are allowed!'));
    }
  },
});
/*--------end multer-------*/

router.get("/:id", tutorPreferencesController.index);
router.post("/store-private-note", tutorPreferencesController.storePrivateNote);
router.post("/dropzone-upload-attachments", uploadAttachments.any(), tutorPreferencesController.dropzoneUploadAttachments);
router.post("/dropzone-remove-attachment", tutorPreferencesController.dropzoneRemoveAttachment);
router.post("/store-private-attachments", uploadAttachments.any(), tutorPreferencesController.storePrivateAttachments);
router.post('/edit-relative-attachment-note', tutorPreferencesController.editRelativeAttachmentNote);
router.post('/update-relative-attachment-note', tutorPreferencesController.updateRelativeNote);
router.post('/destroy-attachment',  tutorPreferencesController.destroyAttachment);

router.post('/email-notification-preference', tutorPreferencesController.emailNotificationPreference);

module.exports = router;