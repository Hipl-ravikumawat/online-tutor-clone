const express = require("express");
const router = express.Router();
const messageController = require("../controllers/Admin/MessageController");

router.get("/", messageController.index);
router.get("/custom-message-form", messageController.customMessageForm);

module.exports = router;
