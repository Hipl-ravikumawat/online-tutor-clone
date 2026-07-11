const express = require('express');
const staffAccountsController = require('../controllers/Admin/StaffAccountsController');
const StaffTransactionController = require('../controllers/Admin/StaffTransactionController');
const storeTransactionRequest = require('../requests/StaffTransaction/StoreTransactionRequest');
const storeInvoicesRequest = require('../requests/StaffInvoices/StoreInvoicesRequest');
const StaffInvoicesController = require('../controllers/Admin/StaffInvoicesController');
const StaffAutoInvoicingController = require('../controllers/Admin/StaffAutoInvoicingController');
const middleware = require('../config/middleware');
const sendEmailInvoicesRequest = require('../requests/StaffInvoices/SendEmailInvoicesRequest');


const router = express.Router();
// ------ Family Accounts CRUD
router.get('/', middleware.isAuthorized(['ADMIN','TUTOR']), staffAccountsController.index);
router.post('/staffs/dataTable',middleware.calculateAssignedContent, staffAccountsController.dataTable);
router.get('/staff/:id',  staffAccountsController.tutorAccountDetails);

// ------ transaction CRUD
router.post('/transactions/dataTable',StaffTransactionController.dataTable);
router.get('/transaction-details/:tutorId?',middleware.isAuthorized(['ADMIN','TUTOR']), StaffTransactionController.create);
router.get('/transaction-details/edit/:id', middleware.isAuthorized(['ADMIN','TUTOR']), StaffTransactionController.edit);
router.post('/transaction/update/:id', middleware.isAuthorized(['ADMIN','TUTOR']), StaffTransactionController.update); 
router.get('/transaction-details/destroy/:id', middleware.isAuthorized(['ADMIN','TUTOR']),  StaffTransactionController.destroy);
router.post('/transaction-details/company/:companyId/students', middleware.isAuthorized(['ADMIN','TUTOR']), StaffTransactionController.studentListByCompany);
router.get('/transaction-details/:id/download-receipt',StaffTransactionController.downloadReceipt);
router.post('/transaction/store',middleware.isAuthorized(['ADMIN','TUTOR']), storeTransactionRequest,StaffTransactionController.store);
router.post('/get-unpaid-invoices', middleware.isAuthorized(['ADMIN','TUTOR']), StaffInvoicesController.getUnpaidInvoices);

router.post('/invoices/:id/approve', middleware.isAuthorized(['ADMIN']), StaffInvoicesController.approveInvoice);
router.post('/invoices/:id/reject', middleware.isAuthorized(['ADMIN']), StaffInvoicesController.rejectInvoice);

// automatic invoicing
router.post('/automatic-invoicing/get',middleware.isAuthorized(['ADMIN','TUTOR']), StaffAutoInvoicingController.getAutomaticInvoicing);
router.post('/automatic-invoicing/store',middleware.isAuthorized(['ADMIN','TUTOR']), StaffAutoInvoicingController.store);
router.post('/automatic-invoicing/disable', middleware.isAuthorized(['ADMIN','TUTOR']), StaffAutoInvoicingController.disabled);
router.post('/automatic-invoicing/resend-summary', middleware.isAuthorized(['ADMIN','TUTOR']), StaffAutoInvoicingController.resendSummary);

// ------ Invoices CRUD
router.get('/add-invoice-details/:tutorId?', middleware.isAuthorized(['ADMIN','TUTOR']), StaffInvoicesController.create);
router.post('/invoices/dataTable',  StaffInvoicesController.dataTable);
router.post('/invoices/store', middleware.isAuthorized(['ADMIN','TUTOR']), storeInvoicesRequest,StaffInvoicesController.store);
router.post('/invoices/check-existing', middleware.isAuthorized(['ADMIN','TUTOR']), storeInvoicesRequest,StaffInvoicesController.checkExistingInvoices);
router.post('/invoices/delete', middleware.isAuthorized(['ADMIN','TUTOR']),StaffInvoicesController.destroy);
router.get('/invoice/pdf/:txnId', middleware.isAuthorized(['ADMIN','TUTOR']), StaffInvoicesController.generatePdf);
router.post('/invoices/get-email',  middleware.isAuthorized(['ADMIN','TUTOR']), StaffInvoicesController.getInvoiceEmailData);
router.post('/invoices/send-email', middleware.isAuthorized(['ADMIN','TUTOR']), sendEmailInvoicesRequest, StaffInvoicesController.sendInvoiceEmail);
router.post("/invoices/:id/mark-paid", middleware.isAuthorized(['ADMIN','TUTOR']), StaffInvoicesController.markAsPaid);
router.post("/invoices/:id/mark-void", middleware.isAuthorized(['ADMIN','TUTOR']), StaffInvoicesController.markAsVoid);
router.post("/invoices/change-archive-status", StaffInvoicesController.changeArchiveStatus);
router.get('/invoice/download-zip',StaffInvoicesController.downloadInvoicesZip);
router.get('/invoice/download-excel',StaffInvoicesController.downloadExcel);


module.exports = router;