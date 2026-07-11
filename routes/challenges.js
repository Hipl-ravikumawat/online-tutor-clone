const express = require("express");
const router = express.Router();
const multer = require("multer");
const middleware = require("../config/middleware");

const challengesController = require("../controllers/Admin/ChallengesController");
var storeChallengeRequest = require("../requests/Lesson/Challenge/StoreChallengeRequest");
const upload = multer();

/** challenges crud routes started */
router.post("/store", upload.none(), storeChallengeRequest, challengesController.storeChallenge);
router.post("/edit", challengesController.editChallenge);
router.get("/destroy/:challengeId/1", middleware.isAuthorized(['TUTOR']), challengesController.destroyChallenge
);
router.post("/update-position", challengesController.updateChallengePosition);
/** challenges crud routes ended */

// check submitted answer during a challenge.
router.post("/check-answer", challengesController.checkSubmittedAnswer);

module.exports = router;