const express         = require('express');
const router          = express.Router();
const passport        = require('passport');
const middleware = require('../config/middleware');
const dashboardController  = require('../controllers/Admin/DashboardController')

router.get('/dashboard', middleware.calculateAssignedContent, dashboardController.dashboard);
router.get('/dashboard/week-agenda', middleware.calculateAssignedContent, dashboardController.weekAgenda);
router.get('/dashboard/tutor-events', middleware.calculateAssignedContent, dashboardController.tutorEvents);
router.get('/drag-drop',dashboardController.drag_drop);


// router.get('/drag-drop',dashboardController.drag_drop);
// router.get('/dialog-template',dashboardController.dialog_template);
// router.get('/build-schema',dashboardController.buildSchema);

module.exports = router;