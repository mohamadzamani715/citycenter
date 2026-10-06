const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const rateLimit = require('express-rate-limit');
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many requests, please try again later."
});

router.get('/dashboard', authenticate, authorize('shop_owner'), shopController.getDashboard);
router.post('/upload-receipt', uploadLimiter, authenticate, authorize('shop_owner'), shopController.uploadReceipt);
router.get('/charge-status', authenticate, authorize('shop_owner'), shopController.getChargeStatus);

module.exports = router;
