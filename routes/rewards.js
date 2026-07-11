const express = require('express');
const router = express.Router();
const middleware = require('../config/middleware');

const rewardController = require('../controllers/Admin/RewardController');

const storeVoucherRequest = require('../requests/Reward/StoreVoucherRequest');
const storePointSystemRequest = require('../requests/Reward/StorePointSystemRequest');
const StorePointAssignmentRequest = require('../requests/Reward/StorePointAssignmentRequest');
const UpdateVoucherRequestStatus = require('../requests/Reward/UpdateVoucherRequestStatus');

//------ Vouchers CRUD
router.get('/vouchers', middleware.isAuthorized(['ADMIN']), rewardController.vouchers);
router.post('/vouchers-dataTable', middleware.isAuthorized(['ADMIN']), rewardController.voucherDataTable);
router.post('/store-voucher', middleware.isAuthorized(['ADMIN']), storeVoucherRequest, rewardController.storeVoucher);
router.get('/edit-voucher/:slug', middleware.isAuthorized(['ADMIN']), rewardController.editVoucher);
router.post('/update-voucher', middleware.isAuthorized(['ADMIN']), storeVoucherRequest, rewardController.updateVoucher);
router.get('/delete-voucher/:voucherId', middleware.isAuthorized(['ADMIN']), rewardController.destroyVoucher);
//------ Vouchers CRUD

//------ PointSystem Configuration
router.get('/point-system', middleware.isAuthorized(['ADMIN']), rewardController.pointSystem);
router.post('/update-point-system-values', middleware.isAuthorized(['ADMIN']), storePointSystemRequest, rewardController.updatePointSystemValues);
//------ PointSystem Configuration

//------ Assign/Manipulation Points
router.get('/assign-points/:eventId', middleware.isAuthorized(['ADMIN', 'TUTOR']), rewardController.assignPoints);
router.post('/store-assigned-points', middleware.isAuthorized(['ADMIN', 'TUTOR']), StorePointAssignmentRequest, rewardController.storeAssignedPoints);
//------ Assign/Manipulation Points

//------ Points History
router.get('/points-history', rewardController.pointsHistory);
router.post('/points-history-dataTable', rewardController.pointHistoryTable);
router.get('/fetch-assigned-points/:pointHistoryId', rewardController.fetchAssignedPoints);
//------ Points History

//------ Voucher Request
router.get('/request-voucher-form', middleware.isAuthorized(['STUDENT']), rewardController.requestVoucherForm);
router.post('/store-redemption-request', middleware.isAuthorized(['STUDENT']), rewardController.storeRedemptionRequest);
router.get('/redemption-requests', middleware.isAuthorized(['ADMIN', 'STUDENT']), rewardController.redemptionRequests);
router.post('/redemption-requests-dataTable', middleware.isAuthorized(['ADMIN', 'STUDENT']), rewardController.voucherHistoryTable);
router.get('/fetch-voucher-rejection-detail/:voucherHistoryId', middleware.isAuthorized(['ADMIN', 'STUDENT']), rewardController.fetchVoucherRejectionDetail);
router.post('/update-voucher-request-status', middleware.isAuthorized(['ADMIN', 'TUTOR']), UpdateVoucherRequestStatus, rewardController.updateVoucherRequestStatus);

//------ Voucher Request
module.exports = router;