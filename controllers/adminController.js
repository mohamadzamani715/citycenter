const { ShopOwner, MonthlyCharge, Receipt, AuditLog, Setting, ApiKey } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../utils/db');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment-jalaali');
const axios = require('axios');
const { body, validationResult } = require('express-validator');

const INVALID_WEBHOOK_REASON = 'آدرس Webhook نامعتبر است';

// Returns true when a hostname resolves to loopback, private, link-local or
// unspecified address space (IPv4 and IPv6, including IPv4-mapped IPv6).
function isPrivateHost(hostname) {
  // Normalise: strip IPv6 brackets and a trailing root dot, lowercase.
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');

  if (host === '') return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '::') return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  if (host.includes(':')) {
    // IPv4-mapped IPv6 in hex form, e.g. ::ffff:7f00:1
    const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const high = parseInt(mappedHex[1], 16);
      const low = parseInt(mappedHex[2], 16);
      return isPrivateHost([high >> 8, high & 255, low >> 8, low & 255].join('.'));
    }
    // IPv4-mapped IPv6 in dotted form, e.g. ::ffff:127.0.0.1
    const mappedDot = host.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mappedDot) return isPrivateHost(mappedDot[1]);
    if (/^fe[89ab]/.test(host)) return true; // fe80::/10 link-local
    if (/^f[cd]/.test(host)) return true; // fc00::/7 unique local
    return false;
  }

  return false;
}

function isValidWebhookUrl(urlString) {
  if (!urlString || urlString.trim() === '') return { valid: true };
  if (!urlString.startsWith('https://')) {
    return { valid: false, reason: 'آدرس Webhook باید با https:// شروع شود' };
  }
  let url;
  try {
    url = new URL(urlString);
  } catch (e) {
    return { valid: false, reason: INVALID_WEBHOOK_REASON };
  }
  if (isPrivateHost(url.hostname)) {
    return { valid: false, reason: INVALID_WEBHOOK_REASON };
  }
  return { valid: true };
}

const getDashboard = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { search = '', status = 'all' } = req.query;
    const now = new Date(); 
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthJalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(currentMonthDate);

    // Build where condition
    const whereCondition = {
      is_approved: true,
      deleted_at: null,
      is_admin: false,
    };

    if (search) {
      whereCondition[Op.or] = [
        { shop_name: { [Op.like]: `%${search}%` } },
        { national_code: { [Op.like]: `%${search}%` } },
      ];
    }

    // Pagination params
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(50, Math.max(5, parseInt(req.query.limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // The charge-status filter (paid/pending/unpaid) is applied at the SQL level
    // so the paged rows and the total count stay consistent.
    const validChargeStatuses = ['paid', 'pending', 'unpaid'];
    const statusFilter = validChargeStatuses.includes(status) ? status : null;

    const chargeWhere = { charge_month: currentMonth };
    if (statusFilter) {
      chargeWhere.status = statusFilter;
    }

    // Paged shops. The current-month charge is unique per shop, so the join cannot
    // fan out and subQuery: false keeps LIMIT/OFFSET correct.
    const { count, rows: shops } = await ShopOwner.findAndCountAll({
      where: whereCondition,
      include: [{
        model: MonthlyCharge,
        as: 'monthlyCharges',
        where: chargeWhere,
        required: !!statusFilter,
      }],
      limit: limitNum,
      offset: offset,
      order: [['id', 'ASC']],
      distinct: true,
      subQuery: false,
    });

    const totalCount = count;
    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));

    // Summary must cover ALL approved shops (not just the current page)
    const summaryShops = await ShopOwner.findAll({
      where: whereCondition,
      include: {
        model: MonthlyCharge,
        as: 'monthlyCharges',
        where: { charge_month: currentMonth },
        required: false,
      },
    });

    // Calculate summary
    let totalShops = summaryShops.length;
    let debtorsCount = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    summaryShops.forEach(shop => {
      const charge = shop.monthlyCharges[0];
      if (!charge || charge.status === 'unpaid' || charge.status === 'pending') {
        debtorsCount++;
        if (charge?.amount) {
          totalUnpaid += Number(charge.amount);
        }
      } else if (charge.status === 'paid') {
        totalPaid += Number(charge.amount);
      }
    });

    const summary = {
      totalShops,
      debtorsCount,
      totalPaid,
      totalUnpaid,
    };

    res.render('admin/dashboard', {
      user: req.user,
      shops,
      summary,
      search,
      status,
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalCount,
      currentMonthJalali
    });
  } catch (err) {
    next(err);
  }
  };

const getUsers = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { search = '', status = 'all' } = req.query;

    const whereCondition = {
      is_admin: false,
    };

    // Filter by status
    if (status === 'approved') {
      whereCondition.is_approved = true;
      whereCondition.deleted_at = null;
    } else if (status === 'pending') {
      whereCondition.is_approved = false;
      whereCondition.deleted_at = null;
    } else if (status === 'deleted') {
      whereCondition.deleted_at = { [Op.ne]: null };
    }

    // Search
    if (search) {
      whereCondition[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { shop_name: { [Op.like]: `%${search}%` } },
        { national_code: { [Op.like]: `%${search}%` } },
      ];
    }

    // Pagination params
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(50, Math.max(5, parseInt(req.query.limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Paged users
    const { count, rows: users } = await ShopOwner.findAndCountAll({
      where: whereCondition,
      limit: limitNum,
      offset: offset,
      order: [['id', 'ASC']],
    });

    const totalCount = count;
    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));

    res.render('admin/users', {
      user: req.user,
      users,
      search,
      status,
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
  };

const approveUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await ShopOwner.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.is_admin) {
      return res.status(403).json({ message: 'Cannot modify admin' });
    }

    user.is_approved = true;
    await user.save();
    res.json({ message: 'User approved', user });
  } catch (err) {
    next(err);
  }
  };

const deleteUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await ShopOwner.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.is_admin) {
      return res.status(403).json({ message: 'Cannot modify admin' });
    }

    user.deleted_at = new Date();
    await user.save();
    res.json({ message: 'User archived' });
  } catch (err) {
    next(err);
  }
  };

const updateUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await body('national_code').optional().matches(/^\d{10}$/).withMessage('کد ملی باید ۱۰ رقم باشد').run(req);
    await body('phone').optional().matches(/^09\d{9}$/).withMessage('شماره تلفن نامعتبر است').run(req);
    await body('password').optional().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد').run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, national_code, shop_name, plaque, phone, password } = req.body;

    const user = await ShopOwner.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.is_admin) {
      return res.status(403).json({ message: 'Cannot modify admin' });
    }

    // Check if national code is already used by another user
    if (national_code && national_code !== user.national_code) {
      const existing = await ShopOwner.findOne({ where: { national_code } });
      if (existing) {
        return res.status(400).json({ message: 'این کد ملی قبلاً ثبت شده است' });
      }
      user.national_code = national_code;
    }

    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (shop_name) user.shop_name = shop_name;
    if (plaque) user.plaque = plaque;
    if (phone) user.phone = phone;
    if (password) {
      user.password_hash = await bcrypt.hash(password, 12);
    }

    await user.save();
    res.json({ message: 'User updated', user });
  } catch (err) {
    // Race-safe: a concurrent request can take the national_code between our pre-check
    // and the save, so the UNIQUE index throws. Report it as a clean 400.
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'این کد ملی قبلاً ثبت شده است' });
    }
    next(err);
  }
  };

const addUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await body('first_name').isString().isLength({ min: 2 }).withMessage('نام باید حداقل ۲ کاراکتر باشد').run(req);
    await body('last_name').isString().isLength({ min: 2 }).withMessage('نام خانوادگی باید حداقل ۲ کاراکتر باشد').run(req);
    await body('national_code').matches(/^\d{10}$/).withMessage('کد ملی باید ۱۰ رقم باشد').run(req);
    await body('phone').matches(/^09\d{9}$/).withMessage('شماره تلفن نامعتبر است').run(req);
    await body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد').run(req);
    await body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('تأیید رمز عبور با رمز عبور مطابقت ندارد');
      }
      return true;
    }).run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, national_code, shop_name, plaque, phone, password, confirm_password } = req.body;
    if (!first_name || !last_name || !national_code || !shop_name || !plaque || !phone || !password || !confirm_password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await ShopOwner.findOne({ where: { national_code } });
    if (existing) {
      return res.status(400).json({ message: 'این کد ملی قبلاً ثبت شده است' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const newUser = await ShopOwner.create({
      first_name,
      last_name,
      national_code,
      shop_name,
      plaque,
      phone,
      password_hash,
      is_approved: true,
      is_admin: false,
    });

    res.status(201).json({ message: 'User created', user: newUser });
  } catch (err) {
    // The uniqueness pre-check above is race-prone: two concurrent requests can both
    // pass it, and the loser then violates the UNIQUE index on national_code.
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

const getShopDetails = async (req, res, next) => {
  try {
    const shop = await ShopOwner.findByPk(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'مغازه یافت نشد' });
    }
    
    const charges = await MonthlyCharge.findAll({
      where: { shop_id: req.params.id },
      include: [
        { model: Receipt, as: 'receipt' }
      ],
      order: [['charge_month', 'DESC']],
      limit: 6
    });
    
    res.render('admin/shop-details', {
      shop,
      charges,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    next(err);
  }
};

const updateChargeAmount = async (req, res, next) => {
  let t;
  try {
    await body('amount').isNumeric().withMessage('مبلغ نامعتبر است').isInt({ min: 1000, max: 100000000 }).withMessage('مبلغ نامعتبر است').run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'مبلغ نامعتبر است', errors: errors.array() });
    }

    // Row-level lock so two concurrent edits cannot silently overwrite each other.
    t = await sequelize.transaction();
    const charge = await MonthlyCharge.findByPk(req.params.id, {
      lock: t.LOCK.UPDATE,
      transaction: t
    });
    if (!charge) {
      await t.rollback();
      t = null;
      return res.status(404).json({ message: 'شارژ یافت نشد' });
    }
    
    charge.amount = Number(req.body.amount);
    await charge.save({ transaction: t });
    await t.commit();
    t = null;
    
    // Log the action
    try {
      await AuditLog.create({
        charge_id: charge.id,
        action: 'amount_edited',
        performed_by: 'admin',
        performed_by_id: req.user.id,
        details: ''
      });
    } catch (logErr) {
      logger.error('Error creating audit log', { stack: logErr && logErr.stack });
      // Don't fail the main operation
    }
    
    res.json({ message: 'مبلغ به‌روزرسانی شد', amount: charge.amount });
  } catch (err) {
    if (t) { try { await t.rollback(); } catch (_) {} }
    next(err);
  }
};

const changeChargeStatus = async (req, res, next) => {
  let t;
  try {
    const newStatus = req.body.status;
    if (!['paid', 'unpaid'].includes(newStatus)) {
      return res.status(400).json({ message: 'وضعیت نامعتبر' });
    }

    // Row-level lock so a concurrent approve/reject/status-change cannot interleave.
    t = await sequelize.transaction();
    const charge = await MonthlyCharge.findByPk(req.params.id, {
      lock: t.LOCK.UPDATE,
      transaction: t
    });
    if (!charge) {
      await t.rollback();
      t = null;
      return res.status(404).json({ message: 'شارژ یافت نشد' });
    }

    charge.status = newStatus;
    if (newStatus === 'paid') {
      charge.paid_at = new Date();
      charge.transaction_code = 'ADMIN-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
      charge.rejected_reason = null;
    } else {
      charge.paid_at = null;
      charge.transaction_code = null;
      charge.rejected_reason = null;
    }

    await charge.save({ transaction: t });
    await t.commit();
    t = null;
    
    // Log the action
    try {
      await AuditLog.create({
        charge_id: charge.id,
        action: 'status_changed',
        performed_by: 'admin',
        performed_by_id: req.user.id,
        details: ''
      });
    } catch (logErr) {
      logger.error('Error creating audit log', { stack: logErr && logErr.stack });
      // Don't fail the main operation
    }
    
    res.json({
      message: 'وضعیت تغییر کرد',
      status: charge.status,
      paid_at: charge.paid_at,
      transaction_code: charge.transaction_code,
      rejected_reason: charge.rejected_reason
    });
  } catch (err) {
    if (t) { try { await t.rollback(); } catch (_) {} }
    next(err);
  }
};

const approveReceipt = async (req, res, next) => {
  let t;
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Row-level lock: a concurrent approve/reject on the same charge must not interleave,
    // otherwise both would pass the `status === 'pending'` check and the last write wins.
    t = await sequelize.transaction();
    const charge = await MonthlyCharge.findByPk(req.params.id, {
      lock: t.LOCK.UPDATE,
      transaction: t
    });
    if (!charge) {
      await t.rollback();
      t = null;
      return res.status(404).json({ message: 'شارژ یافت نشد' });
    }
    
    if (charge.status !== 'pending') {
      await t.rollback();
      t = null;
      return res.status(400).json({ message: 'فقط شارژهای در انتظار قابل تأیید هستند' });
    }
    
    charge.status = 'paid';
    charge.paid_at = new Date();
    charge.transaction_code = 'APPROVED-' + Date.now().toString(36);
    charge.rejected_reason = null;
    
    await charge.save({ transaction: t });
    await t.commit();
    t = null;
    
    try {
      await AuditLog.create({
        charge_id: charge.id,
        action: 'approved',
        performed_by: 'admin',
        performed_by_id: req.user.id,
        details: ''
      });
    } catch (logErr) {
      logger.error('Error creating audit log', { stack: logErr && logErr.stack });
    }

    // Send webhook if configured
    try {
      const settings = await Setting.findOne({ where: { id: 1 } });
      if (settings && settings.webhook_url) {
        const urlValidation = isValidWebhookUrl(settings.webhook_url);
        if (!urlValidation.valid) {
          logger.warn('Invalid webhook_url, skipping webhook', { reason: urlValidation.reason });
        } else if (!settings.webhook_token || settings.webhook_token.trim() === '') {
          logger.warn('Missing webhook_token, skipping webhook');
        } else {
          const shop = await ShopOwner.findByPk(charge.shop_id);
          
          const webhookData = {
            shop_name: shop ? shop.shop_name : null,
            charge_month: moment(charge.charge_month).format('jYYYY/jMM/jDD'),
            amount: charge.amount,
            transaction_code: charge.transaction_code,
            paid_at: moment(charge.paid_at).format('jYYYY/jMM/jDD HH:mm:ss')
          };
          
          const headers = {
            'Authorization': `Bearer ${settings.webhook_token}`,
            'Content-Type': 'application/json',
            'X-Signature': crypto.createHmac('sha256', settings.webhook_token).update(JSON.stringify(webhookData)).digest('hex')
          };
          
          await axios.post(settings.webhook_url, webhookData, { headers, timeout: 5000, maxRedirects: 0 });
          logger.info('Webhook sent successfully');
        }
      }
    } catch (webhookErr) {
      logger.error('Error sending webhook', { stack: webhookErr && webhookErr.stack });
      // Don't fail the request because webhook failed
    }
    
    res.json({
      message: 'رسید تأیید شد',
      status: charge.status,
      paid_at: charge.paid_at,
      transaction_code: charge.transaction_code,
      rejected_reason: charge.rejected_reason
    });
  } catch (err) {
    if (t) { try { await t.rollback(); } catch (_) {} }
    next(err);
  }
};

const rejectReceipt = async (req, res, next) => {
  let t;
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Same row-level lock as approveReceipt — see the comment there.
    t = await sequelize.transaction();
    const charge = await MonthlyCharge.findByPk(req.params.id, {
      lock: t.LOCK.UPDATE,
      transaction: t
    });
    if (!charge) {
      await t.rollback();
      t = null;
      return res.status(404).json({ message: 'شارژ یافت نشد' });
    }
    
    if (charge.status !== 'pending') {
      await t.rollback();
      t = null;
      return res.status(400).json({ message: 'فقط شارژهای در انتظار قابل رد هستند' });
    }
    
    charge.status = 'unpaid';
    charge.rejected_reason = req.body.reason || 'بدون دلیل';
    charge.paid_at = null;
    charge.transaction_code = null;
    
    await charge.save({ transaction: t });
    await t.commit();
    t = null;
    
    try {
      await AuditLog.create({
        charge_id: charge.id,
        action: 'rejected',
        performed_by: 'admin',
        performed_by_id: req.user.id,
        details: charge.rejected_reason
      });
    } catch (logErr) {
      logger.error('Error creating audit log', { stack: logErr && logErr.stack });
    }
    
    res.json({
      message: 'رسید رد شد',
      status: charge.status,
      rejected_reason: charge.rejected_reason
    });
  } catch (err) {
    if (t) { try { await t.rollback(); } catch (_) {} }
    next(err);
  }
};

const serveReceipt = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { shopId, chargeId } = req.params;
    const { thumb } = req.query;

    const charge = await MonthlyCharge.findByPk(chargeId, {
      include: [{ model: Receipt, as: 'receipt' }]
    });

    if (!charge) {
      return res.status(404).json({ message: 'رسید یافت نشد' });
    }

    if (charge.shop_id !== Number(req.params.shopId)) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    if (!charge.receipt) {
      const noImagePath = path.join(__dirname, '../public/no-image.png');
      return res.sendFile(noImagePath);
    }

    const storedPath = thumb 
      ? charge.receipt.compressed_path 
      : charge.receipt.original_path;

    const absolutePath = path.join(__dirname, '..', storedPath.replace(/^\//, ''));

    if (fs.existsSync(absolutePath)) {
      res.sendFile(absolutePath);
    } else {
      const noImagePath = path.join(__dirname, '../public/no-image.png');
      res.sendFile(noImagePath);
    }
  } catch (err) {
    // Receipt files are optional: fall back to the placeholder image instead of
    // failing the request. The real error is still recorded by winston.
    logger.error('serveReceipt error', { stack: err.stack, path: req.path, method: req.method });
    const noImagePath = path.join(__dirname, '../public/no-image.png');
    res.sendFile(noImagePath);
  }
};

const renderAccounting = async (req, res, next) => {
  try {
    res.render('admin/accounting', { user: req.user });
  } catch (err) {
    next(err);
  }
};

const searchTransactions = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { startDate, endDate, shopId, status, minAmount, maxAmount, trackingCode, includeDeleted } = req.query;

    // Build where conditions for MonthlyCharge
    let chargeWhere = {};
    let shopWhere = { is_admin: false };

    if (startDate) chargeWhere.charge_month = { [Op.gte]: startDate };
    if (endDate) chargeWhere.charge_month = { ...chargeWhere.charge_month, [Op.lte]: endDate };
    if (status) chargeWhere.status = status;
    if (minAmount) chargeWhere.amount = { [Op.gte]: Number(minAmount) };
    if (maxAmount) chargeWhere.amount = { ...chargeWhere.amount, [Op.lte]: Number(maxAmount) };
    if (trackingCode) chargeWhere.transaction_code = { [Op.like]: `%${trackingCode}%` };
    if (shopId) shopWhere.id = shopId;
    if (includeDeleted !== 'true') shopWhere.deleted_at = null;

    const transactions = await MonthlyCharge.findAll({
      where: chargeWhere,
      include: [{ model: ShopOwner, as: 'shop', where: shopWhere }],
      order: [['charge_month', 'DESC']]
    });

    // Convert dates to Jalali in the response
    const formattedTransactions = transactions.map(t => {
      const tData = t.toJSON();
      // Ensure we're correctly parsing DATEONLY fields
      const cmDate = moment(tData.charge_month, 'YYYY-MM-DD');
      const chargeMonthJalali = cmDate.isValid() ? cmDate.format('jYYYY/jMM/jDD') : '';
      
      let paidAtJalali = null;
      if (tData.paid_at) {
        const paDate = moment(tData.paid_at);
        paidAtJalali = paDate.isValid() ? paDate.format('jYYYY/jMM/jDD') : '';
      }
      
      return {
        ...tData,
        charge_month_jalali: chargeMonthJalali,
        paid_at_jalali: paidAtJalali
      };
    });

    res.json(formattedTransactions);
  } catch (err) {
    next(err);
  }
};

const exportCSV = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { startDate, endDate, shopId, status, minAmount, maxAmount, trackingCode, includeDeleted } = req.query;

    // Build where conditions for MonthlyCharge
    let chargeWhere = {};
    let shopWhere = { is_admin: false };

    if (startDate) chargeWhere.charge_month = { [Op.gte]: startDate };
    if (endDate) chargeWhere.charge_month = { ...chargeWhere.charge_month, [Op.lte]: endDate };
    if (status) chargeWhere.status = status;
    if (minAmount) chargeWhere.amount = { [Op.gte]: Number(minAmount) };
    if (maxAmount) chargeWhere.amount = { ...chargeWhere.amount, [Op.lte]: Number(maxAmount) };
    if (trackingCode) chargeWhere.transaction_code = { [Op.like]: `%${trackingCode}%` };
    if (shopId) shopWhere.id = shopId;
    if (includeDeleted !== 'true') shopWhere.deleted_at = null;

    const transactions = await MonthlyCharge.findAll({
      where: chargeWhere,
      include: [{ model: ShopOwner, as: 'shop', where: shopWhere }],
      order: [['charge_month', 'DESC']]
    });

    // Build CSV
    const statusLabels = {
      paid: 'پرداخت‌شده',
      pending: 'در انتظار',
      unpaid: 'پرداخت‌نشده'
    };

    let csv = '\uFEFFنام مغازه,ماه شارژ,مبلغ,وضعیت,تاریخ پرداخت,کد پیگیری,وضعیت مغازه\n';

    transactions.forEach(transaction => {
      const shop = transaction.shop;
      const monthLabel = moment(transaction.charge_month).format('jYYYY/jMM/jDD');
      const paidDate = transaction.paid_at ? moment(transaction.paid_at).format('jYYYY/jMM/jDD') : '';
      const shopStatus = shop.deleted_at ? 'حذف‌شده' : 'فعال';

      csv += `"${shop.shop_name}","${monthLabel}","${Number(transaction.amount).toLocaleString('fa-IR')}","${statusLabels[transaction.status] || transaction.status}","${paidDate}","${transaction.transaction_code || ''}","${shopStatus}"\n`;
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

const getArchivedShops = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const archivedShops = await ShopOwner.findAll({
      where: {
        deleted_at: { [Op.ne]: null },
        is_admin: false
      },
      attributes: ['id', 'shop_name', 'national_code', 'deleted_at']
    });

    // Convert deleted_at to Jalali
    const formattedShops = archivedShops.map(shop => {
      const shopData = shop.toJSON();
      const dDate = moment(shopData.deleted_at);
      const deletedAtJalali = dDate.isValid() ? dDate.format('jYYYY/jMM/jDD') : '';
      
      return {
        ...shopData,
        deleted_at_jalali: deletedAtJalali
      };
    });

    res.json(formattedShops);
  } catch (err) {
    next(err);
  }
};

const getAccountingData = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';

    // Calculate pie chart data for current month
    const currentMonthCharges = await MonthlyCharge.findAll({
      where: { charge_month: currentMonth },
      attributes: ['status', 'amount']
    });

    let pieData = { paid: 0, pending: 0, unpaid: 0 };
    currentMonthCharges.forEach(charge => {
      if (charge.status === 'paid') {
        pieData.paid++;
      } else if (charge.status === 'pending') {
        pieData.pending++;
      } else {
        pieData.unpaid++;
      }
    });

    // Calculate line chart data for past 12 months - optimized single query (without DATE_FORMAT for index usage)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const paidCharges = await MonthlyCharge.findAll({
      where: {
        status: 'paid',
        paid_at: { [Op.gte]: twelveMonthsAgo }
      },
      attributes: [
        'charge_month',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['charge_month'],
      raw: true
    });
    const monthMap = {};
    paidCharges.forEach(row => {
      const monthKey = row.charge_month.slice(0, 7);
      monthMap[monthKey] = Number(row.total);
    });
    let lineData = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const total = monthMap[monthKey] || 0;
      const monthLabel = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        month: 'long',
        year: 'numeric'
      }).format(date);
      lineData.unshift({ month: monthLabel, total: total });
    }

    // Calculate summary
    const shops = await ShopOwner.findAll({
      where: {
        is_approved: true,
        deleted_at: null,
        is_admin: false,
      },
      include: {
        model: MonthlyCharge,
        as: 'monthlyCharges',
        where: { charge_month: currentMonth },
        required: false,
      },
    });

    let totalShops = shops.length;
    let debtorsCount = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    shops.forEach(shop => {
      const charge = shop.monthlyCharges[0];
      if (!charge || charge.status === 'unpaid' || charge.status === 'pending') {
        debtorsCount++;
        if (charge?.amount) {
          totalUnpaid += Number(charge.amount);
        }
      } else if (charge.status === 'paid') {
        totalPaid += Number(charge.amount);
      }
    });

    const summary = { totalShops, debtorsCount, totalPaid, totalUnpaid };

    res.json({ pieData, lineData, summary });
  } catch (err) {
    next(err);
  }
};

const renderSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findOne({ where: { id: 1 } });
    const apiKeys = await ApiKey.findAll({ order: [['created_at', 'DESC']] });
    
    res.render('admin/settings', { 
      settings, 
      apiKeys, 
      moment,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { due_day, default_fee, webhook_url, webhook_token, image_retention_months, data_retention_months } = req.body;

    if (webhook_url && webhook_url.trim() !== '') {
      const validation = isValidWebhookUrl(webhook_url);
      if (!validation.valid) {
        return res.status(400).json({ message: 'آدرس Webhook نامعتبر است' });
      }
      if (!webhook_token || webhook_token.trim() === '') {
        return res.status(400).json({ message: 'برای Webhook، توکن الزامی است' });
      }
    }
    
    let settings = await Setting.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = await Setting.create({
        id: 1,
        due_day: due_day || 10,
        default_fee: default_fee || 150000,
        webhook_url: webhook_url || '',
        webhook_token: webhook_token || '',
        image_retention_months: image_retention_months || 24,
        data_retention_months: data_retention_months || 60
      });
    } else {
      await settings.update({
        due_day: due_day || 10,
        default_fee: default_fee || 150000,
        webhook_url: webhook_url || '',
        webhook_token: webhook_token || '',
        image_retention_months: image_retention_months || 24,
        data_retention_months: data_retention_months || 60
      });
    }

    res.json({ message: 'تنظیمات ذخیره شد' });
  } catch (err) {
    next(err);
  }
};

const createApiKey = async (req, res, next) => {
  try {
    const { description } = req.body;
    const apiKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const prefix = apiKey.substring(0, 10);

    await ApiKey.create({
      key_hash: keyHash,
      prefix,
      description,
      last_used_at: null,
      expires_at: null
    });

    // The plaintext key is returned exactly once — only its hash is stored, so it
    // can never be shown again.
    res.status(201).json({
      message: 'کلید جدید ایجاد شد',
      key: apiKey,
      prefix,
      description
    });
  } catch (err) {
    next(err);
  }
};

const deleteApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ApiKey.destroy({ where: { id } });
    res.json({ message: 'کلید حذف شد' });
  } catch (err) {
    next(err);
  }
};

// Change the currently authenticated admin's own password.
// The current password is never displayed — it is only verified with bcrypt.
const updateAccountPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { current_password, new_password, confirm_password } = req.body;
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'همه فیلدها اجباری هستند' });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'رمز جدید و تأیید آن مطابقت ندارند' });
    }
    if (new_password.length < 12) {
      return res.status(400).json({ message: 'رمز جدید باید حداقل ۱۲ کاراکتر باشد' });
    }

    const admin = await ShopOwner.findOne({
      where: { id: req.user.id, is_admin: true }
    });
    if (!admin) {
      return res.status(404).json({ message: 'حساب مدیر یافت نشد' });
    }

    const isMatch = await bcrypt.compare(current_password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'رمز فعلی اشتباه است' });
    }

    admin.password_hash = await bcrypt.hash(new_password, 12);
    await admin.save();

    logger.info('Admin account password changed', { adminId: admin.id });
    res.json({ message: 'رمز مدیر با موفقیت تغییر یافت' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getUsers, approveUser, deleteUser, updateUser, addUser, getShopDetails, updateChargeAmount, changeChargeStatus, approveReceipt, rejectReceipt, serveReceipt, renderAccounting, getAccountingData, searchTransactions, exportCSV, getArchivedShops, renderSettings, updateSettings, createApiKey, deleteApiKey, updateAccountPassword, isValidWebhookUrl, isPrivateHost };
