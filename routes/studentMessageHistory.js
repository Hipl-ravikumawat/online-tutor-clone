const express = require('express');
const router = express.Router();
const passport = require('passport');

const studentPreferenceController = require('../controllers/Admin/StudentPreferenceController')
router.get('/',  studentPreferenceController.studentMessageHistory);
router.post('/dataTable',  studentPreferenceController.studentMessageHistoryTable);
router.get('/generate/pdf/:invoiceId', studentPreferenceController.generatePdf);
router.get('/download-transaction/pdf/:txnId', studentPreferenceController.downloadTransactionReceipt);




module.exports = router;