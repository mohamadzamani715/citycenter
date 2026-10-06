const { ShopOwner, MonthlyCharge, Receipt, AuditLog } = require('../models');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const db = require('../utils/db');
const logger = require('../utils/logger');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png'];
    const allowedMimes = ['image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های JPG و PNG مجاز هستند'), false);
    }
  }
}).single('receipt');

const getDashboard = async (req, res, next) => {
  try {
    const shop_id = req.user.id;
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';

    const shop = await ShopOwner.findByPk(shop_id);
    if (!shop) {
      return res.status(404).json({ message: 'مغازه یافت نشد' });
    }

    const charge = await MonthlyCharge.findOne({
      where: { shop_id, charge_month: currentMonth },
      include: [{ model: Receipt, as: 'receipt' }]
    });

    // Handle pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    // Get transactions (all monthly charges with pagination)
    const { count, rows } = await MonthlyCharge.findAndCountAll({
      where: { shop_id },
      include: [{ model: Receipt, as: 'receipt' }],
      order: [['charge_month', 'DESC']],
      limit,
      offset
    });

    const transactions = rows;
    const totalCount = count;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = page;

    // Get overdue debts (unpaid charges before current month)
      let debts = await MonthlyCharge.findAll({
        where: {
          shop_id,
          status: 'unpaid',
          charge_month: {
            [require('sequelize').Op.lt]: currentMonth
          }
        },
        order: [['charge_month', 'ASC']]
      });

      // Add delayDays to each debt
      debts = debts.map(debt => {
        const dueDate = new Date(debt.due_date);
        const now = new Date();
        const diffTime = Math.abs(now - dueDate);
        const delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          ...debt.toJSON(),
          delayDays
        };
      });

    // Check if request is for JSON (for AJAX pagination)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        transactions,
        currentPage,
        totalPages,
        totalCount,
        debts
      });
    }

    res.render('shop/dashboard', {
      shop,
      currentCharge: charge,
      transactions,
      currentPage,
      totalPages,
      totalCount,
      debts
    });
  } catch (err) {
    next(err);
  }
};

const uploadReceipt = async (req, res, next) => {
  if (!req.user || !req.user.id || isNaN(Number(req.user.id))) {
    return res.status(400).json({ message: 'شناسه کاربری نامعتبر است' });
  }
  upload(req, res, async function (err) {
    if (err) {
      logger.error('Upload middleware error', { stack: err.stack, code: err.code, path: req.path, method: req.method });
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'حجم فایل بیش از حد مجاز است' });
      }
      return res.status(400).json({ message: 'فایل نامعتبر است' });
    }
    if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

    let t;
    try {
      const shop_id = req.user.id;
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';

      t = await db.transaction();

      const charge = await MonthlyCharge.findOne({
        where: { shop_id, charge_month: currentMonth },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!charge) {
        await t.rollback();
        return res.status(400).json({ message: 'شارژی یافت نشد' });
      }
      if (charge.status !== 'unpaid') {
        await t.rollback();
        return res.status(400).json({ message: 'امکان آپلود وجود ندارد' });
      }

      const buffer = req.file.buffer;
      let fileType;
      try {
        const { fileTypeFromBuffer } = await import('file-type');
        fileType = await fileTypeFromBuffer(buffer);
      } catch (e) {
        try {
          const FileType = require('file-type');
          if (FileType.fromBuffer) fileType = await FileType.fromBuffer(buffer);
          else if (FileType.fileTypeFromBuffer) fileType = await FileType.fileTypeFromBuffer(buffer);
        } catch (_) {}
      }
      if (!fileType) {
        const header = buffer.slice(0, 4).toString('hex').toLowerCase();
        if (header.startsWith('ffd8ff')) fileType = { ext: 'jpg' };
        else if (header === '89504e47' || buffer.slice(0, 8).toString('hex').toLowerCase() === '89504e470d0a1a0a') fileType = { ext: 'png' };
      }
      if (!fileType || !['jpg', 'png'].includes(fileType.ext)) {
        await t.rollback();
        return res.status(400).json({ message: 'فایل نامعتبر است' });
      }

      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);
      const originalDir = 'public/uploads/originals/';
      if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });
      const originalPath = path.join(originalDir, uniqueName);
      const compressedDir = 'public/uploads/compressed/';
      if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir, { recursive: true });
      const compressedFilename = 'compressed-' + uniqueName;
      const compressedPath = path.join(compressedDir, compressedFilename);

      try {
        fs.writeFileSync(originalPath, req.file.buffer);
      } catch (e) {
        await t.rollback();
        return res.status(500).json({ message: 'خطا در ذخیره فایل' });
      }

      try {
        await sharp(req.file.buffer).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 70 }).toFile(compressedPath);
      } catch (e) {
        try { fs.unlinkSync(originalPath); } catch (_) {}
        await t.rollback();
        return res.status(500).json({ message: 'خطا در پردازش تصویر' });
      }

      await Receipt.create({
        charge_id: charge.id,
        original_path: originalPath.replace(/\\/g, '/'),
        compressed_path: compressedPath.replace(/\\/g, '/')
      }, { transaction: t });

      charge.status = 'pending';
      await charge.save({ transaction: t });

      await AuditLog.create({
        charge_id: charge.id,
        action: 'receipt_uploaded',
        performed_by: 'shop_owner',
        performed_by_id: req.user.id,
        details: ''
      }, { transaction: t });

      await t.commit();

      res.json({ message: 'رسید با موفقیت بارگذاری شد', compressedPath: '/' + compressedPath.replace(/\\/g, '/') });
    } catch (err) {
      if (t) try { await t.rollback(); } catch (_) {}
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'رسید قبلاً بارگذاری شده است' });
      }
      return next(err);
    }
  });
};

const getChargeStatus = async (req, res, next) => {
  try {
    const shop_id = req.user.id;
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';

    const charge = await MonthlyCharge.findOne({
      where: { shop_id, charge_month: currentMonth },
      include: [{ model: Receipt, as: 'receipt', attributes: ['compressed_path'] }],
      attributes: ['status', 'paid_at', 'transaction_code', 'rejected_reason', 'amount']
    });

    if (!charge) {
      return res.status(404).json({ message: 'شارژی یافت نشد' });
    }

    const result = charge.toJSON();
    result.compressed_path = result.receipt ? result.receipt.compressed_path : null;
    delete result.receipt;

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, uploadReceipt, getChargeStatus };
