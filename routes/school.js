const express = require('express');
const router = express.Router();
const passport = require('passport');
const schoolsController = require('../controllers/Admin/SchoolsController')

var storeSchoolRequest = require('../requests/School/StoreSchoolRequest');
var updateSchoolRequest = require('../requests/School/UpdateSchoolRequest');


router.get('/',  schoolsController.index);
router.post('/dataTable',  schoolsController.dataTable);
router.get('/create',  schoolsController.create);
router.post('/store',  storeSchoolRequest, schoolsController.store);
router.get('/edit/:slug',  schoolsController.edit);
router.post('/update',  updateSchoolRequest, schoolsController.update);
router.get('/destroy/:id',  schoolsController.destroy);
router.post('/update-status',  schoolsController.updateStatus);

module.exports = router;