const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
var multer = require('multer');
const upload = multer();
const middleware = require('../config/middleware');

const studentPreferenceController = require('../controllers/Admin/StudentPreferenceController')
const storeStudentPreferenceRequest = require('../requests/StudentPreference/StoreStudentPreferenceRequest');
const updateStudentPreferenceRequest = require('../requests/StudentPreference/UpdateStudentPreferenceRequest');
const assignTutorStudentPreferenceRequest = require('../requests/StudentPreference/AssignTutorStudentPreferenceRequest');
const forwardMessageStudentPreferenceRequest = require('../requests/StudentPreference/ForwardMessageStudentPrefereceRequest');

const storeUserAttachments = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = './assets/UserAttachments/';
        if (!fs.existsSync(dir)) {
            fs.mkdir(dir, err => callback(err, dir));
        }
        callback(null, dir);
    },
    filename: (req, file, callback) => {
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        const newFileName = Date.now() + fileName;
        callback(null, newFileName);
    }
});

var uploadAttachments = multer({
    storage: storeUserAttachments,
    limits: { fileSize: 25 * 1024 * 1024 }, // Set file size limit in bytes (25 MB)
    fileFilter: (req, file, callback) => {
        // let extension = ["image/png","image/jpg","image/jpeg","application/pdf","text/csv"];
        const allowedExtensions = ["jpg","jpeg","png", "mp4", "pdf", "docx", "xlsx","csv"];
        const extension = file.originalname.split(".").pop().toLowerCase();
        if (allowedExtensions.includes(extension)) {
            callback(null, true);
        }
        else {
            callback(null, false);
            return callback(new Error('Only .png, .mp4, .docx, .xlsx .pdf, .csv, .jpg and .jpeg format allowed!'));
        }
    }
});

router.get('/:id',  studentPreferenceController.index);
router.post('/store',storeStudentPreferenceRequest,studentPreferenceController.store);
router.post('/edit', studentPreferenceController.edit);
router.post('/update',updateStudentPreferenceRequest, studentPreferenceController.update);

router.get('/destroy/:id',  studentPreferenceController.destroy);

//--------------------------------------------------------------------------------------------------------------------------
router.post("/store-private-note", studentPreferenceController.storePrivateNote);
router.post("/dropzone-upload-attachments", uploadAttachments.any(), studentPreferenceController.dropzoneUploadAttachments);
router.post("/dropzone-remove-attachment", studentPreferenceController.dropzoneRemoveAttachment);
router.post("/store-private-attachments", uploadAttachments.any(), studentPreferenceController.storePrivateAttachments);
router.post('/edit-relative-attachment-note',  studentPreferenceController.editRelativeAttachmentNote);
router.post('/update-relative-attachment-note',  studentPreferenceController.updateRelativeNote);
router.post('/destroy-attachment',  studentPreferenceController.destroyAttachment);
router.post("/assigned-tutor",upload.none(), assignTutorStudentPreferenceRequest,studentPreferenceController.assignTutor);
router.post("/get-assigned-tutor-detail", studentPreferenceController.getAssignedTutor);
router.post("/update-assigned-tutor", studentPreferenceController.updateAssignedTutor);
router.get('/assigned-tutors-list/:studentId', studentPreferenceController.getAssignedTutorsList);
router.get('/check-for-legal-guardian/:studentId', studentPreferenceController.checkFamilyContactForLegalGuardian);
router.get('/check-for-prefer-invoice-recipient/:studentId', studentPreferenceController.checkFamilyContactForInvoiceRecipient);

router.post('/students-attendance-notes-datatable',  studentPreferenceController.studentAttendanceNotesDataTable);
router.post('/students-note-attachments',  studentPreferenceController.studentNoteAndAttachments);
router.post('/message-history',  studentPreferenceController.messageHistory);
router.post('/message-history/forward-message',passport.checkAuthentication, middleware.isAuthorized(['ADMIN','TUTOR']), forwardMessageStudentPreferenceRequest, studentPreferenceController.forwardMessage);
router.post('/message-history/get-data',  studentPreferenceController.getMessageHistoryData);



module.exports = router;