const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for the forgot-password endpoint, mounted globally in
 * server.js BEFORE csrfProtection so that even CSRF-less requests count.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'تعداد درخواست‌های بازیابی رمز بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.'
  },
  keyGenerator: (req) => {
    const ip = req.ip || 'unknown';
    const phone = (req.body && (req.body.phone || req.body.mobile)) || 'no-phone';
    return `${ip}::${phone}`;
  }
});

module.exports = forgotPasswordLimiter;