const express = require('express');
const router = express.Router();
const passport = require('passport');

const gradesController = require('../controllers/Admin/GradesController')

var storeGradeRequest = require('../requests/Grade/StoreGradeRequest');
var updateGradeRequest = require('../requests/Grade/UpdateGradeRequest');

router.get('/',  gradesController.index);
router.post('/dataTable',  gradesController.dataTable);
router.get('/create',  gradesController.create);
router.post('/store',  storeGradeRequest, gradesController.store);
router.get('/edit/:slug',  gradesController.edit);
router.post('/update',  updateGradeRequest, gradesController.update);
router.get('/destroy/:id',  gradesController.destroy);
router.post('/update-status',  gradesController.updateStatus);

module.exports = router;