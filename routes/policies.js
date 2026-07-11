const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require("multer");
const middleware = require('../config/middleware');
const policiesController = require('../controllers/Admin/PoliciesController');

var storePolicyRequest = require('../requests/Policy/StorePolicyRequest');
var updatePolicyRequest = require('../requests/Policy/UpdatePolicyRequest');

const storagePolicyAttachment = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = './assets/Policies/';
        if (!fs.existsSync(dir)) {
            fs.mkdir(dir, err => callback(err, dir));
        }else{
            callback(null, dir);
        }
    },
    filename: (req, file, callback) => {
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        const newFileName = Date.now() + fileName;
        callback(null, newFileName);
    }
});

var uploadPolicyAttachment = multer({
    storage: storagePolicyAttachment,
    fileFilter: (req, file, callback) => {
        if (file.mimetype == "application/pdf") {
            callback(null, true);
        }
        else {
            callback(null, false);
            return callback(new Error('Only .pdf is format allowed!'));
        }
    }
}); 

router.get('/', middleware.isAuthorized(['ADMIN','TUTOR']), policiesController.index);
router.post('/dataTable', middleware.isAuthorized(['ADMIN','TUTOR']), policiesController.dataTable);
router.get('/create', middleware.isAuthorized(['ADMIN']), policiesController.create);
router.post('/store', uploadPolicyAttachment.single('policy_attachment'), storePolicyRequest, policiesController.store);
router.get('/edit/:slug', middleware.isAuthorized(['ADMIN']), policiesController.edit);
router.post('/update', uploadPolicyAttachment.single('policy_attachment'), updatePolicyRequest, policiesController.update);
router.get('/destroy/:id', middleware.isAuthorized(['ADMIN']), policiesController.destroy);

router.get('/mark-as-read/:policyId', middleware.isAuthorized(['TUTOR']), policiesController.markAsRead);

router.get('/policy-readers/:slug', middleware.isAuthorized(['ADMIN']), policiesController.fetchPolicyReaders);
router.post('/policy-readers/dataTable', middleware.isAuthorized(['ADMIN']), policiesController.policyReadersDataTable);


module.exports = router;