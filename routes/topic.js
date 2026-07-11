const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
var multer = require('multer');

const topicController = require('../controllers/Admin/TopicController')

var storeTopicRequest = require('../requests/Topic/StoreTopicRequest');
var updateTopicRequest = require('../requests/Topic/UpdateTopicRequest');

const storageTopicImage = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = './assets/TopicImage/';
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

var uploadTopicImage = multer({
    storage: storageTopicImage,
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

router.get('/',  topicController.index);
router.post('/dataTable',  topicController.dataTable);
router.get('/create',  topicController.create);
router.post('/store',  uploadTopicImage.single('topic_image'), storeTopicRequest, topicController.store);
router.get('/edit/:slug',  topicController.edit);
router.post('/update',  uploadTopicImage.single('topic_image'), updateTopicRequest, topicController.update);
router.get('/destroy/:id',  topicController.destroy);
router.post('/update-status',  topicController.updateStatus);

module.exports = router;