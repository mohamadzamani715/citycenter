const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { ShopOwner } = require('../models');
const smsService = require('../utils/smsService');

const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'همه فیلدها اجباری هستند' });
    }
    const admin = await ShopOwner.findOne({
      where: { national_code: username, is_admin: true }
    });
    if (!admin) {
      return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({ role: 'admin' });
  } catch (err) {
    next(err);
  }
};

const shopLogin = async (req, res, next) => {
  try {
    const { national_code, password } = req.body;
    if (!national_code || !password) {
      return res.status(400).json({ message: 'همه فیلدها اجباری هستند' });
    }
    const shop = await ShopOwner.findOne({
      where: { national_code, is_admin: false }
    });
    if (!shop) {
      return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
    if (!shop.is_approved) {
      return res.status(403).json({ message: 'حساب شما تأیید نشده است' });
    }
    if (shop.deleted_at !== null) {
      return res.status(403).json({ message: 'حساب شما غیرفعال شده است' });
    }
    const isMatch = await bcrypt.compare(password, shop.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
    const token = jwt.sign(
      { id: shop.id, role: 'shop_owner' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({ role: 'shop_owner', shopName: shop.shop_name });
  } catch (err) {
    next(err);
  }
};

const shopRegister = async (req, res, next) => {
  try {
    const { first_name, last_name, national_code, plaque, phone, password, confirm_password } = req.body;
    if (!first_name || !last_name || !national_code || !plaque || !phone || !password || !confirm_password) {
      return res.status(400).json({ message: 'همه فیلدها اجباری هستند' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'رمز عبور و تأیید آن مطابقت ندارند' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
    }
    const existing = await ShopOwner.findOne({ where: { national_code } });
    if (existing) {
      return res.status(400).json({ message: 'این کد ملی قبلاً ثبت شده است' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    await ShopOwner.create({
      first_name,
      last_name,
      national_code,
      plaque,
      phone,
      password_hash,
      is_approved: false,
      is_admin: false,
      shop_name: first_name + ' ' + last_name
    });
res.status(201).json({ message: 'ثبت‌نام موفق. منتظر تأیید مدیریت باشید.' });
  } catch (err) {
    // Race-safe: concurrent registrations can both pass the pre-check, after which the
    // UNIQUE index on national_code throws. Return a clean 400 instead of a 500.
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'این کد ملی قبلاً ثبت شده است' });
    }
    // Handle "Data too long for column" errors (e.g., shop_name exceeds VARCHAR length)
    if (err.name === 'SequelizeDatabaseError' && /Data too long/i.test(err.message)) {
      return res.status(400).json({
        message: 'طول یکی از فیلدها بیش از حد مجاز است. لطفاً مقادیر را کوتاه‌تر وارد کنید.'
      });
    }
    next(err);
  }
  };

// Step 1: Request password reset - generate reset code
const forgotPasswordRequest = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'شماره تماس اجباری است' });
    }
    
    const shop = await ShopOwner.findOne({ where: { phone, is_admin: false, deleted_at: null } });
    if (!shop) {
      return res.status(200).json({ message: 'اگر این شماره تماس ثبت شده است، کد بازیابی ارسال خواهد شد.' });
    }
    
    // Generate 6-digit reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    shop.reset_code = bcrypt.hashSync(resetCode, 12);
    shop.reset_code_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await shop.save();
    
    // Send the code via SMS. In dev (SMS_PROVIDER=mock) this only logs;
    // in production it actually sends via Kavenegar.
    try {
      const smsResult = await smsService.sendOtp(shop.phone, resetCode);
      if (smsResult.success) {
        logger.info(`[ForgotPassword] OTP sent to ${shop.phone}`, {
          messageId: smsResult.messageId
        });
      } else {
        logger.warn(`[ForgotPassword] SMS delivery failed for ${shop.phone}`, {
          error: smsResult.error
        });
      }
    } catch (smsErr) {
      // sendOtp is designed not to throw, but be defensive.
      logger.error('[ForgotPassword] Unexpected SMS error', { error: smsErr.message });
    }
    
    // Keep the dev-only log so the code is still visible during local testing,
    // even if the mock provider was not used.
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[ForgotPassword][DEV] Reset code for ${shop.phone}: ${resetCode}`);
    }
    
    res.json({ message: 'اگر این شماره تماس ثبت شده است، کد بازیابی ارسال خواهد شد.' });
  } catch (err) {
    next(err);
  }
};

// Step 2: Verify reset code and reset password
const resetPassword = async (req, res, next) => {
  try {
    const { phone, code, newPassword, confirmPassword } = req.body;
    if (!phone || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'اطلاعات ناقص است' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'رمز عبور جدید و تأیید آن مطابقت ندارند' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
    }
    
    // Look the user up strictly by phone — no full-table scan
    const shop = await ShopOwner.findOne({ where: { phone, is_admin: false, deleted_at: null } });
    if (!shop || !shop.reset_code) {
      return res.status(400).json({ message: 'کد بازیابی نامعتبر است' });
    }
    
    if (!bcrypt.compareSync(code, shop.reset_code)) {
      return res.status(400).json({ message: 'کد بازیابی نامعتبر است' });
    }
    
    // Check if code is expired. A missing expiry is treated as expired (fail closed),
    // matching the behaviour of the previous implementation.
    if (!shop.reset_code_expires || shop.reset_code_expires < new Date()) {
      return res.status(400).json({ message: 'کد بازیابی منقضی شده است' });
    }
    
    // Update password
    shop.password_hash = await bcrypt.hash(newPassword, 12);
    shop.reset_code = null;
    shop.reset_code_expires = null;
    await shop.save();
    
    res.json({ message: 'رمز عبور با موفقیت تغییر یافت.' });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  res.json({ message: 'خروج موفقیت‌آمیز' });
};

module.exports = { adminLogin, shopLogin, shopRegister, forgotPasswordRequest, resetPassword, logout };
