require('dotenv').config();

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../utils/db');
const { ShopOwner, MonthlyCharge, Receipt, Setting, ApiKey } = require('../models');

// Destructive reset (drop + recreate every table) only when explicitly requested.
const FORCE_RESET = process.argv.includes('--force');

// Demo data (shops, charges, receipts, default API key) is seeded by default
// for development. Set SEED_DEMO_DATA=false for a dry production install
// (only Setting + admin account are created/kept).
const SEED_DEMO_DATA = process.env.SEED_DEMO_DATA !== 'false';

const shopOwnersData = [
  {
    national_code: '2', first_name: 'علی', last_name: 'احمدی', shop_name: 'فروشگاه پارچه احمدی', plaque: '۱', phone: '09121111111', is_approved: true, password: '2'
  },
  {
    national_code: '3', first_name: 'مریم', last_name: 'حسنی', shop_name: 'لوازم خانگی مدرن', plaque: '۲', phone: '09122222222', is_approved: true, password: '3'
  },
  {
    national_code: '4', first_name: 'حسین', last_name: 'رضایی', shop_name: 'کیف و کفش تهران', plaque: '۳', phone: '09123333333', is_approved: true, password: '4'
  },
  {
    national_code: '5', first_name: 'زهرا', last_name: 'محمدی', shop_name: 'عطر و ادکلن بهار', plaque: '۴', phone: '09124444444', is_approved: true, password: '5'
  },
  {
    national_code: '6', first_name: 'محمد', last_name: 'کریمی', shop_name: 'لوازم آرایشی زیبایی', plaque: '۵', phone: '09125555555', is_approved: true, password: '6'
  },
  {
    national_code: '7', first_name: 'فاطمه', last_name: 'موسوی', shop_name: 'ساعت‌فروشی زمان', plaque: '۶', phone: '09126666666', is_approved: true, password: '7'
  },
  {
    national_code: '8', first_name: 'امیر', last_name: 'جعفری', shop_name: 'اسباب‌بازی شادی', plaque: '۷', phone: '09127777777', is_approved: true, password: '8'
  },
  {
    national_code: '9', first_name: 'نرگس', last_name: 'قاسمی', shop_name: 'فرش و موکت ایرانی', plaque: '۸', phone: '09128888888', is_approved: false, password: '9'
  },
  {
    national_code: '10', first_name: 'رضا', last_name: 'نوروزی', shop_name: 'لوازم صوتی-تصویری صدا', plaque: '۹', phone: '09129999999', is_approved: false, password: '10'
  },
  {
    national_code: '11', first_name: 'سارا', last_name: 'اکبری', shop_name: 'موبایل و لوازم جانبی', plaque: '۱۰', phone: '09130000001', is_approved: false, password: '11'
  },
  {
    national_code: '12', first_name: 'علی', last_name: 'صادقی', shop_name: 'کتاب‌فروشی دانش', plaque: '۱۱', phone: '09130000002', is_approved: true, password: '12'
  },
  {
    national_code: '13', first_name: 'مینا', last_name: 'حیدری', shop_name: 'خرازی مهر', plaque: '۱۲', phone: '09130000003', is_approved: false, password: '13'
  },
  {
    national_code: '14', first_name: 'بهروز', last_name: 'طاهری', shop_name: 'بلور و کریستال', plaque: '۱۳', phone: '09130000004', is_approved: true, password: '14'
  },
  {
    national_code: '15', first_name: 'لیلا', last_name: 'رحیمی', shop_name: 'مانتو و پوشاک', plaque: '۱۴', phone: '09130000005', is_approved: false, password: '15'
  },
  {
    national_code: '16', first_name: 'احمد', last_name: 'شریفی', shop_name: 'شیرینی‌فروشی شیرین', plaque: '۱۵', phone: '09130000006', is_approved: true, password: '16'
  }
];

const monthsData = [
  { date: '2026-07-01', amount: 1200000 },
  { date: '2026-06-01', amount: 1150000 },
  { date: '2026-05-01', amount: 1150000 },
  { date: '2026-04-01', amount: 1150000 },
  { date: '2026-03-01', amount: 1150000 }
];

async function seed() {
  try {
    console.log('========================================');
    console.log('  Seeding database...');
    console.log('  FORCE_RESET:', FORCE_RESET ? 'YES (DESTRUCTIVE)' : 'NO (safe)');
    console.log('========================================');

    // The admin password is NEVER hardcoded — it comes from .env.
    const adminPassword = process.env.ADMIN_PASS;
    if (!adminPassword || adminPassword.length < 12) {
      console.error('❌ ADMIN_PASS در .env موجود نیست یا کمتر از ۱۲ کاراکتر است.');
      process.exit(1);
    }

    // Demo shop passwords are for development only.
    const demoShopPassword = process.env.DEMO_SHOP_PASSWORD;
    console.warn('⚠️  رمز مغازه‌داران دمو فقط برای محیط توسعه است.');
    if (demoShopPassword) {
      console.warn(`⚠️  DEMO_SHOP_PASSWORD تنظیم شده — همهٔ مغازه‌داران جدید این رمز را می‌گیرند.`);
    }

    if (FORCE_RESET) {
      console.log('⚠️  حالت force فعال است — تمام جداول حذف و بازسازی می‌شوند.');
      await db.query('SET FOREIGN_KEY_CHECKS = 0');
      await db.sync({ force: true });
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
    } else {
      console.log('ℹ️  حالت ایمن — فقط جداول جدید ساخته می‌شوند (بدون حذف داده‌ها).');
      await db.sync();
    }
    console.log('Database tables ready!');

    // 1. Setting (idempotent)
    let setting = await Setting.findOne({ where: { id: 1 } });
    if (!setting) {
      await Setting.create({
        id: 1,
        due_day: 25,
        default_fee: 1200000,
        webhook_url: null,
        webhook_token: null,
        image_retention_months: 24,
        data_retention_months: 24
      });
      console.log('Setting created.');
    } else {
      console.log('Setting already exists — skipped.');
    }

    // 2. Admin (idempotent, and kept in sync with .env)
    const adminHash = bcrypt.hashSync(adminPassword, 12);
    let admin = await ShopOwner.findOne({ where: { national_code: 'admin' } });
    if (!admin) {
      admin = await ShopOwner.create({
        national_code: 'admin',
        first_name: 'مدیر',
        last_name: 'سیستم',
        shop_name: 'مدیریت پاساژ',
        plaque: '۰',
        phone: '09120000000',
        password_hash: adminHash,
        is_approved: true,
        is_admin: true
      });
      console.log('Admin created.');
    } else if (!bcrypt.compareSync(adminPassword, admin.password_hash)) {
      admin.password_hash = adminHash;
      await admin.save();
      console.log('Admin already existed — password_hash synced with ADMIN_PASS from .env.');
    } else {
      console.log('Admin already exists — skipped.');
    }

    let shopsCreated = 0;
    let chargesCreated = 0;
    let receiptsCreated = 0;
    let apiKeyStatus = 'skipped (demo data disabled)';
    let shopOwners = [];

    if (SEED_DEMO_DATA) {
    // 3. Shop Owners (idempotent; hashing is done only when a row is actually created)
    console.log('Creating shop owners...');
    for (const data of shopOwnersData) {
      let shop = await ShopOwner.findOne({ where: { national_code: data.national_code } });
      if (!shop) {
        shop = await ShopOwner.create({
          national_code: data.national_code,
          first_name: data.first_name,
          last_name: data.last_name,
          shop_name: data.shop_name,
          plaque: data.plaque,
          phone: data.phone,
          password_hash: bcrypt.hashSync(demoShopPassword || data.password, 12),
          is_approved: data.is_approved,
          is_admin: false
        });
        shopsCreated++;
      }
      shopOwners.push(shop);
    }
    console.log(`Shop owners: ${shopsCreated} created, ${shopOwners.length - shopsCreated} already existed.`);

    // 4. Create Monthly Charges and Receipts (idempotent)
    console.log('Creating monthly charges...');
    for (let i = 0; i < shopOwners.length; i++) {
      const shop = shopOwners[i];
      const group = Math.floor(i / 5); // 0, 1, 2

      for (let j = 0; j < monthsData.length; j++) {
        const month = monthsData[j];
        const chargeMonth = month.date;
        const amount = month.amount;
        const dueDate = chargeMonth.substring(0, 8) + '25';
        let status = 'paid';
        let paidAt = null;
        let transactionCode = null;

        // Determine status based on group
        if (group === 0) {
          // All months paid
          status = 'paid';
          paidAt = new Date(dueDate);
          paidAt.setDate(paidAt.getDate() + Math.floor(Math.random() * 5) + 1);
          transactionCode = `PAY-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
        } else if (group === 1) {
          if (j === 0) { // Current month
            status = 'unpaid';
          } else {
            status = 'paid';
            paidAt = new Date(dueDate);
            paidAt.setDate(paidAt.getDate() + Math.floor(Math.random() * 5) + 1);
            transactionCode = `PAY-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
          }
        } else if (group === 2) {
          if (j === 0) {
            status = 'pending';
          } else if (j === 1) {
            status = 'unpaid';
          } else {
            status = 'paid';
            paidAt = new Date(dueDate);
            paidAt.setDate(paidAt.getDate() + Math.floor(Math.random() * 5) + 1);
            transactionCode = `PAY-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
          }
        }

        // Skip if this (shop, month) charge already exists — keeps re-runs non-destructive
        let charge = await MonthlyCharge.findOne({
          where: { shop_id: shop.id, charge_month: chargeMonth }
        });
        if (charge) continue;

        charge = await MonthlyCharge.create({
          shop_id: shop.id,
          charge_month: chargeMonth,
          amount: amount,
          due_date: dueDate,
          status: status,
          paid_at: paidAt,
          transaction_code: transactionCode
        });
        chargesCreated++;

        // If status is pending, create receipt
        if (status === 'pending') {
          const existingReceipt = await Receipt.findOne({ where: { charge_id: charge.id } });
          if (!existingReceipt) {
            await Receipt.create({
              charge_id: charge.id,
              original_path: `/uploads/${shop.id}/${chargeMonth}-original.jpg`,
              compressed_path: `/uploads/${shop.id}/${chargeMonth}-compressed.jpg`
            });
            receiptsCreated++;
          }
        }
      }
    }
    console.log(`Charges: ${chargesCreated} created. Receipts: ${receiptsCreated} created.`);

    // 5. Create API Key — only when the table is empty, so re-runs don't pile up keys
    apiKeyStatus = 'skipped (a key already exists — rotate it from /admin/settings)';
    const existingKeys = await ApiKey.count();
    if (existingKeys === 0) {
      const apiKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const prefix = apiKey.substring(0, 10);
      await ApiKey.create({
        key_hash: keyHash,
        prefix: prefix,
        description: 'کلید پیش‌فرض',
        last_used_at: null,
        expires_at: null
      });
      apiKeyStatus = 'created';
      console.log('Generated API Key (فقط یک بار نمایش داده می‌شود — در دیتابیس تنها هش SHA-256 ذخیره شده است):', apiKey);
      console.log('Prefix:', prefix);
    } else {
      console.log('API key already exists — skipped.');
    }
    } else {
      console.log('ℹ️  SEED_DEMO_DATA=false — demo shops, charges, receipts and API key skipped (dry install).');
    }

    console.log('\nDatabase seeding completed successfully!');
    console.log('✅ Seed completed. Admin: admin / (password from .env ADMIN_PASS)');
    console.log(`✅ Shops created: ${shopsCreated} (seed table size: ${shopOwners.length})`);
    console.log(`   Charges created: ${chargesCreated} | Receipts created: ${receiptsCreated} | API key: ${apiKeyStatus}`);
    console.log(`   Mode: ${FORCE_RESET ? 'FORCE (destructive)' : 'SAFE (non-destructive)'}`);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seed();
