const express = require('express');
const router = express.Router();
const passport = require('passport');
const middleware = require('../config/middleware');
const programsController = require('../controllers/Admin/ProgramsController');
var storeProgramRequest = require('../requests/Program/StoreProgramRequest');
var updateProgramRequest = require('../requests/Program/UpdateProgramRequest');

router.get('/',  middleware.isAuthorized(['ADMIN','TUTOR','STUDENT']), middleware.calculateAssignedContent, programsController.index);
router.post('/dataTable', middleware.calculateAssignedContent, programsController.dataTable);
router.get('/create', middleware.isAuthorized(['ADMIN']), programsController.create);
router.post('/store', storeProgramRequest, programsController.store);
router.get('/edit/:slug', middleware.isAuthorized(['ADMIN']), programsController.edit);
router.post('/update', updateProgramRequest, programsController.update);
router.get('/destroy/:id', middleware.isAuthorized(['ADMIN']), programsController.destroy);


// router.post("/slide-mark-as-complete/:programId", programsController.markCompleted);
router.post('/program-score', programsController.getProgramScores);
router.post("/skip-lesson", middleware.isAuthorized(['TUTOR']), programsController.skipLesson);
module.exports = router;