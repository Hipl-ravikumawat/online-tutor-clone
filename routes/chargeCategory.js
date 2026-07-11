const express = require('express');
const chargeCategoryController = require('../controllers/Admin/ChargeCategoryController');
const StoreChargeCategoryRequest = require('../requests/ChargeCategory/StoreChargeCategoryRequest');
const UpdateChargeCategoryRequest = require('../requests/ChargeCategory/UpdateChargeCategoryRequest');
const router = express.Router();

//------ charges CRUD
router.get('/',chargeCategoryController.index);
router.post('/dataTable',  chargeCategoryController.dataTable);
router.post('/store',StoreChargeCategoryRequest,chargeCategoryController.store);
router.get('/edit/:id', chargeCategoryController.edit);
router.post('/update',UpdateChargeCategoryRequest,chargeCategoryController.update);
router.get('/destroy/:id',  chargeCategoryController.destroy);


module.exports = router;