const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
var multer = require('multer');
const middleware = require('../config/middleware');
const studentsController = require('../controllers/Admin/StudentsController')
const storeStudentRequest = require('../requests/Student/StoreStudentsRequest');
const updateStudentsRequest = require('../requests/Student/UpdateStudentsRequest');

const storageProfileImg = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = './assets/ProfileImage/';
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

var uploadProfileImgImage = multer({
    storage: storageProfileImg,
    fileFilter: (req, file, callback) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            callback(null, true);
        }
        else {
            callback(null, false);
            return callback(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

router.get('/',  middleware.isAuthorized(['ADMIN','TUTOR']), middleware.calculateAssignedContent, studentsController.index);
router.post('/dataTable',  middleware.calculateAssignedContent, studentsController.dataTable);
router.get('/create',   middleware.isAuthorized(['ADMIN']), studentsController.create);
router.post('/store',  uploadProfileImgImage.single('profile_image'), storeStudentRequest, studentsController.store);
router.get('/edit/:id',   middleware.isAuthorized(['ADMIN']), studentsController.edit);
router.post('/update-status',  studentsController.updateStatus);
router.post('/update',  uploadProfileImgImage.single('profile_image'), updateStudentsRequest, studentsController.update);
router.get('/destroy/:id',   middleware.isAuthorized(['ADMIN']), studentsController.destroy);
router.get('/render-students/:gradeId',  studentsController.renderStudents);
router.post('/update-auto-invoice',  studentsController.updateAutoInvoiceStatus);
router.get('/:studentId/view-session', studentsController.viewSession);
router.post('/student-events', studentsController.getStudentEvents);


module.exports = router;