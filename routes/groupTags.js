const express = require('express');
const router = express.Router();
const passport = require('passport');

const GroupTagsController = require('../controllers/Admin/GroupTagsController')

var storeRequest = require('../requests/GroupTag/StoreRequest');
var updateRequest = require('../requests/GroupTag/UpdateRequest');

router.get('/',  GroupTagsController.index);
router.post('/dataTable',  GroupTagsController.dataTable);
router.get('/create',  GroupTagsController.create);
router.post('/store',  storeRequest, GroupTagsController.store);
router.get('/edit/:slug',  GroupTagsController.edit);
router.post('/update',  updateRequest, GroupTagsController.update);
router.get('/destroy/:id',  GroupTagsController.destroy);

module.exports = router;