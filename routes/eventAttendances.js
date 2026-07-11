const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const upload = multer(); // Use multer's memory storage

const storeEventMedia = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = path.join(__dirname, '../assets/EventAttachments/');
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                return callback(err);
            }
            callback(null, dir);
        });
    },
    filename: (req, file, callback) => {
        const fileName = file.originalname.toLowerCase().split(" ").join("-");
        // console.log(fileName,'fileName');
        const newFileName = Date.now() + "-" + fileName;
        req.attachment = newFileName;
        callback(null, newFileName);
    },
});

const uploadEventMedia = multer({
    storage: storeEventMedia,
    fileFilter: (req, file, callback) => {
        callback(null, true);
    },
});

const AttendanceAndNotesController = require('../controllers/Admin/AttendanceAndNotesController');
const storeEventGroupNotesRequest = require('../requests/CalendarEvent/StoreEventGroupNotesRequest');
const markAttendanceRequest = require('../requests/CalendarEvent/MarkAttendanceRequest');

router.get('/',  AttendanceAndNotesController.index); 
router.get('/take-attendance/:eventId',  AttendanceAndNotesController.takeAttendancePage);
router.post('/mark-attendance', markAttendanceRequest, AttendanceAndNotesController.markAttendance);
router.get('/note-templates',  AttendanceAndNotesController.noteTemplate);
router.post('/render-shared-template',  AttendanceAndNotesController.renderSharedTemplate);
router.post('/store-note-templates',  upload.none(), AttendanceAndNotesController.storeNoteTemplate);
router.post('/edit-note-templates',  upload.none(), AttendanceAndNotesController.editNoteTemplate);
router.get('/delete-note-templates/:id',  AttendanceAndNotesController.destroyNoteTemplate);

router.post('/update-event-note-according-to-preference',  AttendanceAndNotesController.updateEventNoteAccordingToPreference);
router.post('/edit-note-and-attachments',  AttendanceAndNotesController.editNoteAndAttachment);
router.post('/delete-note-attachments',  AttendanceAndNotesController.destroyNoteAttachment);
router.get('/attendance-details',  AttendanceAndNotesController.attendanceDetails);
router.post('/store-event-group-note', uploadEventMedia.any(), storeEventGroupNotesRequest, AttendanceAndNotesController.storeEventGroupNoteAndAttachments);

router.post('/students-notes-listing',  AttendanceAndNotesController.studentNotesListing);
router.post('/students-note-attachments',  AttendanceAndNotesController.studentNotesAttachments);

router.post('/create-report',  AttendanceAndNotesController.createReport);

module.exports = router;