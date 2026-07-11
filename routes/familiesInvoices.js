const express = require('express');
const familyAccountsController = require('../controllers/Admin/FamilyAccountsController');
const transactionController = require('../controllers/Admin/TransactionController');
const storeTransactionRequest = require('../requests/Transaction/StoreTransactionRequest');
const storeInvoicesRequest = require('../requests/Invoices/StoreInvoicesRequest');
const invoicesController = require('../controllers/Admin/InvoicesController');
const StudentAutoInvoicingController = require('../controllers/Admin/StudentAutoInvoicingController');
const middleware = require('../config/middleware');
const sendEmailInvoicesRequest = require('../requests/Invoices/SendEmailInvoicesRequest');


const router = express.Router();
// ------ Family Accounts CRUD
router.get('/', middleware.isAuthorized(['ADMIN','TUTOR']), familyAccountsController.index);
router.post('/families/dataTable',middleware.calculateAssignedContent, familyAccountsController.dataTable);
// router.get('/family/:id',  familyAccountsController.familyDetails);
router.get('/family/:id',  familyAccountsController.studentDetails);

// ------ transaction CRUD
// router.get('/',transactionController.index);
router.post('/transactions/dataTable',transactionController.dataTable);
router.get('/transaction-details/:studentId?',middleware.isAuthorized(['ADMIN','TUTOR']), transactionController.create);
router.get('/transaction-details/edit/:id', middleware.isAuthorized(['ADMIN','TUTOR']), transactionController.edit);
router.post('/transaction/update/:id', middleware.isAuthorized(['ADMIN','TUTOR']), transactionController.update); 
router.get('/transaction-details/destroy/:id', middleware.isAuthorized(['ADMIN','TUTOR']),  transactionController.destroy);
router.post('/transaction-details/company/:companyId/students', middleware.isAuthorized(['ADMIN','TUTOR']), transactionController.studentListByCompany);
router.get('/transaction-details/:id/download-receipt',transactionController.downloadReceipt);
router.post('/transaction/store',middleware.isAuthorized(['ADMIN','TUTOR']), storeTransactionRequest,transactionController.store);
router.post('/get-unpaid-invoices', middleware.isAuthorized(['ADMIN','TUTOR']), invoicesController.getUnpaidInvoices);

// automatic invoicing
router.post('/automatic-invoicing/get',middleware.isAuthorized(['ADMIN','TUTOR']), StudentAutoInvoicingController.getAutomaticInvoicing);
router.post('/automatic-invoicing/store',middleware.isAuthorized(['ADMIN','TUTOR']), StudentAutoInvoicingController.store);
router.post('/automatic-invoicing/disable', middleware.isAuthorized(['ADMIN','TUTOR']), StudentAutoInvoicingController.disabled);
router.post('/automatic-invoicing/resend-summary', middleware.isAuthorized(['ADMIN','TUTOR']), StudentAutoInvoicingController.resendSummary);

// ------ Invoices CRUD
router.get('/add-invoice-details/:studentId?', middleware.isAuthorized(['ADMIN','TUTOR']), invoicesController.create);
router.post('/invoices/dataTable',  invoicesController.dataTable);
router.post('/invoices/store', middleware.isAuthorized(['ADMIN','TUTOR']), storeInvoicesRequest,invoicesController.store);
router.post('/invoices/check-existing', middleware.isAuthorized(['ADMIN','TUTOR']), storeInvoicesRequest,invoicesController.checkExistingInvoices);
router.post('/invoices/delete', middleware.isAuthorized(['ADMIN','TUTOR']),invoicesController.destroy);
router.get('/invoice/pdf/:txnId', middleware.isAuthorized(['ADMIN','TUTOR']), invoicesController.generatePdf);
// router.get('/family/:id',  invoicesController.invoiceDetails);
router.post('/invoices/get-email',  middleware.isAuthorized(['ADMIN','TUTOR']), invoicesController.getInvoiceEmailData);
router.post('/invoices/send-email', middleware.isAuthorized(['ADMIN','TUTOR']), sendEmailInvoicesRequest, invoicesController.sendInvoiceEmail);
router.post("/invoices/:id/mark-paid", middleware.isAuthorized(['ADMIN','TUTOR']), invoicesController.markAsPaid);
router.post("/invoices/:id/mark-void", middleware.isAuthorized(['ADMIN','TUTOR']), invoicesController.markAsVoid);
router.post("/invoices/change-archive-status", invoicesController.changeArchiveStatus);
router.get('/invoice/download-zip',invoicesController.downloadInvoicesZip);
router.get('/invoice/download-excel',invoicesController.downloadExcel);


module.exports = router;