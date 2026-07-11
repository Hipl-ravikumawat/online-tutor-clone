const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // Use multer's memory storage
const categoriesController = require("../controllers/Admin/EventCategoriesController");

var storeEventCategoryRequest = require('../requests/EventCategory/StoreEventCategoryRequest');

router.post("/store", upload.none(), storeEventCategoryRequest, categoriesController.store);
router.post("/edit", upload.none(), categoriesController.edit);

module.exports = router;