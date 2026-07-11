const express = require('express');
const router = express.Router();
const passport = require('passport');

const subTopicController = require('../controllers/Admin/SubTopicController')

var storeSubCategoryRequest = require('../requests/SubTopic/StoreSubTopicRequest');
var updateSubCategoryRequest = require('../requests/SubTopic/UpdateSubTopicRequest');


router.get('/',  subTopicController.index);
router.post('/dataTable',  subTopicController.dataTable);
router.get('/create',  subTopicController.create);
router.post('/store',  storeSubCategoryRequest, subTopicController.store);
router.get('/edit/:slug',  subTopicController.edit);
router.post('/update',  updateSubCategoryRequest, subTopicController.update);
router.get('/destroy/:id',  subTopicController.destroy);
router.post('/update-status',  subTopicController.updateStatus);



module.exports = router;