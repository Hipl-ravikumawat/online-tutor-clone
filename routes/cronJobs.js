const express         = require('express');
const router          = express.Router();
const passport        = require('passport');
const middleware = require('../config/middleware');
const CronJobsController  = require('../controllers/CronJobs/CronJobsController')

router.get('/send-invoice-reminder', CronJobsController.sendInvoiceReminder);

module.exports = router;