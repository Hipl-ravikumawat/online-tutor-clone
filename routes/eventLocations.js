const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // Use multer's memory storage
const locationController = require("../controllers/Admin/EventLocationsController");

var storeEventLocationRequest = require('../requests/EventLocation/StoreEventLocationRequest');

router.post("/store", upload.none(), storeEventLocationRequest, locationController.store);
router.post("/edit", upload.none(), locationController.edit);
router.get("/destroy/:id", upload.none(), locationController.destroy);

module.exports = router;