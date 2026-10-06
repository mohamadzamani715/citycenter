const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Auth limiter: More strict for login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many login attempts from this IP, please try again later."
});

const shopRegisterValidation = [
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
];

router.post('/admin/login', authLimiter, authController.adminLogin);
router.post('/shop/login', authLimiter, authController.shopLogin);
router.post('/shop/register', authLimiter, shopRegisterValidation, authController.shopRegister);
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'تعداد درخواست‌های مجاز بیش از حد است'
});

router.post('/shop/forgot-password', resetLimiter, authController.forgotPasswordRequest);
router.post('/shop/reset-password', resetLimiter, authController.resetPassword);
router.post('/logout', authLimiter, authController.logout);

module.exports = router;
