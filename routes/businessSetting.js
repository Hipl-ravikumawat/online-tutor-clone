const express = require('express');
const router = express.Router();
const passport = require('passport');

const businessSettingController = require('../controllers/Admin/BusinessSettingController');

router.get('/',  businessSettingController.index);
router.post('/modify', businessSettingController.modifySettings);
router.post('/store-notification-template',  businessSettingController.storeNotificationTemplate);
router.post('/store-sales-tax',  businessSettingController.storeSalesTax);
router.post('/update-sales-tax',  businessSettingController.updateSalesTax);
router.post('/destroy-sales-tax/:id',  businessSettingController.destroySalesTax);
router.post('/edit-notification-template',  businessSettingController.editNotificationTemplate);
router.post('/update-notification-template',  businessSettingController.updateNotificationTemplate);
router.get('/destroy-template/:id',  businessSettingController.destroyNotificationTemplate);

module.exports = router;