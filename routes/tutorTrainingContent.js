const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const randomStr = require("randomstring");

const middleware = require('../config/middleware');
const tutorTrainingController = require('../controllers/Admin/TutorTrainingController');
const storeTutorTrainingContentRequest = require('../requests/TutorTrainingContent/StoreTutorTrainingContentRequest');
const updateTutorTrainingContentRequest = require('../requests/TutorTrainingContent/UpdateTutorTrainingContentRequest');

const storageThumbnail = multer.diskStorage({
    destination: (req, file, callback) => {
        const randomString = randomStr.generate({
            length: 8,
            charset: 'alphabetic'
        });
        const lastItem = req.headers.referer.substring(req.headers.referer.lastIndexOf('/') + 1);
        if (lastItem === "create") {
            req.body.content_directory = 'lc_' + randomString + Date.now();
        } 
        const dir = `./assets/TutorTrainingContent/${req.body.content_directory}`;
        if (!fs.existsSync(dir)) {
            fs.mkdir(dir, err => callback(err, dir));
        } else {
            callback(null, dir);
        }
    },
    filename: (req, file, callback) => {
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        const newFileName = Date.now() + '-' + fileName;
        callback(null, newFileName);
    }
});

const uploadThumbnail = multer({
    storage: storageThumbnail,
    fileFilter: (req, file, callback) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            callback(null, true);
        } else {
            callback(null, false);
            return callback(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

router.get('/', middleware.isAuthorized(['ADMIN','TUTOR']), tutorTrainingController.index);
router.post('/listing', middleware.isAuthorized(['ADMIN','TUTOR']), tutorTrainingController.listing);
router.get('/create', middleware.isAuthorized(['ADMIN']), tutorTrainingController.create);
router.post('/store', middleware.isAuthorized(['ADMIN']), uploadThumbnail.single('thumbnail'), storeTutorTrainingContentRequest, tutorTrainingController.store);
router.get('/edit/:slug', middleware.isAuthorized(['ADMIN']), tutorTrainingController.edit);
router.post('/update', middleware.isAuthorized(['ADMIN']), uploadThumbnail.single('thumbnail'), updateTutorTrainingContentRequest, tutorTrainingController.update);
router.post('/update-status', middleware.isAuthorized(['ADMIN']), tutorTrainingController.updateStatus);
router.get('/destroy/:id', middleware.isAuthorized(['ADMIN']), tutorTrainingController.destroy);

module.exports = router;
