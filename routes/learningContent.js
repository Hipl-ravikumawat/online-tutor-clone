const express = require('express');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const randomStr = require("randomstring");
const middleware = require('../config/middleware');

const learningContentController = require('../controllers/Admin/LearningContentController');

var storeLearningContentRequest = require('../requests/LearningContent/StoreLearningContentRequest');
var updateLearningContentRequest = require('../requests/LearningContent/UpdateLearningContentRequest');

const storageThumbnail = multer.diskStorage({
    destination: (req, file, callback) => {
        let contentDirectory;
        const randomString = randomStr.generate({
            length: 8,
            charset: 'alphabetic'
        });
        const lastItem = req.headers.referer.substring(req.headers.referer.lastIndexOf('/') + 1);
        if (lastItem === "create") {
            contentDirectory = randomString;
            req.body.content_directory = 'lc_' + randomString + Date.now();
            const dir = './assets/LearningContent/' + req.body.content_directory;
            if (!fs.existsSync(dir)) {
                fs.mkdir(dir, err => callback(err, dir));
            }
            callback(null, dir);
        }
        else {
            if (req.body.content_directory != '') {
                const dir = './assets/LearningContent/' + req.body.content_directory;
                if (!fs.existsSync(dir)) {
                    fs.mkdir(dir, err => callback(err, dir));
                }
                callback(null, dir);
                /*
                    if (!fs.existsSync(dir)) {
                        fs.mkdir(dir, { recursive: true }, (err) => callback(err, dir));
                    }
                */
            } else {
                contentDirectory = randomString;
                req.body.content_directory = 'lc_' + randomString + Date.now();
                const dir = './assets/LearningContent/' + req.body.content_directory;
                if (!fs.existsSync(dir)) {
                    fs.mkdir(dir, err => callback(err, dir));
                }
                callback(null, dir);
            }
        }
    },
    filename: (req, file, callback) => {
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        const newFileName = Date.now() + '-' + fileName;
        callback(null, newFileName);
    }
});

var uploadThumbnail = multer({
    storage: storageThumbnail,
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

router.get('/', middleware.isAuthorized(['ADMIN','TUTOR','STUDENT', 'CONTENT_MANAGER']),learningContentController.index);
router.post('/listing',  learningContentController.dataTable);

router.get('/create',  middleware.isAuthorized(['ADMIN', 'CONTENT_MANAGER']) ,learningContentController.create);
router.post('/store',  uploadThumbnail.single('thumbnail'), storeLearningContentRequest, learningContentController.store);
router.get('/edit/:slug',  middleware.isAuthorized(['ADMIN', 'CONTENT_MANAGER']), learningContentController.edit);
router.post('/update',  uploadThumbnail.single('thumbnail'), updateLearningContentRequest, learningContentController.update);
router.get('/destroy/:id', middleware.isAuthorized(['ADMIN', 'CONTENT_MANAGER']),  learningContentController.destroy);
router.post('/update-status',  learningContentController.updateStatus);

router.post('/render-contents',  learningContentController.renderContents);
router.post('/render-content-detail',  learningContentController.getContentDetail);
router.post('/render-lesson-detail',  learningContentController.getLessonDetail);

module.exports = router;