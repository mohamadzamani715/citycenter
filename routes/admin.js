const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests, please try again later."
});

const userValidation = [
  body('first_name').isString().isLength({ min: 2 }).withMessage('نام باید حداقل ۲ کاراکتر باشد'),
  body('last_name').isString().isLength({ min: 2 }).withMessage('نام خانوادگی باید حداقل ۲ کاراکتر باشد'),
  body('national_code').matches(/^\d{10}$/).withMessage('کد ملی باید ۱۰ رقم باشد'),
  body('phone').matches(/^09\d{9}$/).withMessage('شماره تلفن نامعتبر است'),
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('تأیید رمز عبور با رمز عبور مطابقت ندارد');
    }
    return true;
  }),
  body('shop_name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('نام مغازه باید بین ۱ تا ۲۵۵ کاراکتر باشد'),
  body('plaque').optional().trim().isLength({ max: 20 }).withMessage('پلاک نباید بیش از ۲۰ کاراکتر باشد'),
];

router.get('/dashboard', authenticate, authorize('admin'), adminController.getDashboard);
router.get('/users', authenticate, authorize('admin'), adminController.getUsers);
router.put('/users/:id/approve', authenticate, authorize('admin'), adminController.approveUser);
router.delete('/users/:id', adminApiLimiter, authenticate, authorize('admin'), adminController.deleteUser);
router.put('/users/:id', adminApiLimiter, authenticate, authorize('admin'), userValidation, adminController.updateUser);
router.post('/users', adminApiLimiter, authenticate, authorize('admin'), userValidation, adminController.addUser);
router.get('/shop/:id', authenticate, authorize('admin'), adminController.getShopDetails);
router.put('/charges/:id/amount', authenticate, authorize('admin'), adminController.updateChargeAmount);
router.put('/charges/:id/status', authenticate, authorize('admin'), adminController.changeChargeStatus);
router.put('/charges/:id/approve', authenticate, authorize('admin'), adminController.approveReceipt);
router.put('/charges/:id/reject', authenticate, authorize('admin'), adminController.rejectReceipt);
router.get('/receipts/:shopId/:chargeId', authenticate, authorize('admin'), adminController.serveReceipt);
router.get('/accounting', authenticate, authorize('admin'), adminController.renderAccounting);
router.get('/settings', authenticate, authorize('admin'), adminController.renderSettings);
router.get('/api/accounting-data', authenticate, authorize('admin'), adminController.getAccountingData);
router.get('/api/transactions', authenticate, authorize('admin'), adminController.searchTransactions);
router.get('/api/transactions/export-csv', authenticate, authorize('admin'), adminController.exportCSV);
router.get('/api/archived-shops', authenticate, authorize('admin'), adminController.getArchivedShops);
router.put('/api/settings', authenticate, authorize('admin'), adminController.updateSettings);
router.post('/api/api-keys', adminApiLimiter, authenticate, authorize('admin'), adminController.createApiKey);
router.delete('/api/api-keys/:id', adminApiLimiter, authenticate, authorize('admin'), adminController.deleteApiKey);
router.put('/api/account/password', adminApiLimiter, authenticate, authorize('admin'), [
  body('current_password').isString().isLength({ min: 1 }).withMessage('رمز فعلی اجباری است'),
  body('new_password').isLength({ min: 12 }).withMessage('رمز جدید باید حداقل ۱۲ کاراکتر باشد'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error('رمز جدید و تأیید آن مطابقت ندارند');
    }
    return true;
  }),
], adminController.updateAccountPassword);

module.exports = router;
