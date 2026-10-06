# تحلیل کامل پروژه سامانه مدیریت شارژ پاساژ سیتی سنتر چهارباغ

---

## 1. شناسنامه پروژه
- **نام کامل**: سامانه مدیریت شارژ مغازه‌های پاساژ سیتی سنتر چهارباغ
- **هدف**: مدیریت شارژ ماهانه مغازه‌ها با داشبورد جدا برای مدیر و مغازه‌دار‌ها
- **آدرس فیزیکی روی دیسک**: `c:\Users\mohamadzamani\Desktop\citycenter`
- **تاریخ تحلیل**: 9 تیر 1405 (2026-06-30)
- **آخرین به‌روزرسانی این سند**: ۲۹ شهریور ۱۴۰۵ (2026-09-20) — همگام‌سازی با اصلاحات ۱ تا ۱۲
- **وضعیت کلی**: همهٔ قابلیت‌های فهرست‌شده در بخش ۱۱ پیاده‌سازی شده‌اند
- **پورت فعلی**: 3514

> ⚠️ **این سند یک تحلیل تاریخی است و تنها منبع حقیقت نیست.**
> منبع رسمی وضعیت فعلی و شرح کامل همهٔ اصلاحات، فایل **`PROGRESS.md`** است (ردیف‌های ۴۴ به بعد).
> هرجا این سند با `PROGRESS.md` تناقض داشت، **`PROGRESS.md` معتبر است**.

---

## 2. فناوری‌ها (Tech Stack)

| لایه | نام فناوری | نسخه نصب‌شده | کاربرد در پروژه |
|-----|-----------|-------------|---------------|
| Backend Runtime | Node.js | (بررسی نشده) | محیط اجرای کد سمت سرور |
| Backend Framework | Express.js | ^4.21.2 | چارچوب ایجاد سرور و API |
| ORM | Sequelize | ^6.37.5 | Object-Relational Mapping برای کار با دیتابیس |
| Database | MySQL | (بررسی نشده) | پایگاه داده اصلی |
| Database Driver | mysql2 | ^3.12.0 | درایور اتصال به MySQL |
| Template Engine | EJS | ^6.0.1 | رندر صفحات سمت سرور |
| Environment Variables | dotenv | ^16.6.1 | مدیریت متغیرهای محیطی |
| Hashing | bcryptjs | ^3.0.3 | هش کردن رمز عبور |
| Authentication | jsonwebtoken | ^9.0.3 | ایجاد و تأیید توکن JWT |
| File Upload | multer | ^1.4.5-lts.1 | مدیریت آپلود فایل‌ها (رسید‌ها) |
| Image Optimization | sharp | ^0.33.5 | فشرده‌سازی و تغییر اندازه تصاویر |
| Security | helmet | ^8.2.0 | افزودن هدرهای امنیتی |
| Security | csurf | ^1.11.0 | محافظت در برابر حملات CSRF |
| Cookies | cookie-parser | ^1.4.7 | مدیریت کوکی‌ها |
| Rate Limiting | express-rate-limit | ^7.5.1 | محدود کردن درخواست‌ها به API |
| Input Validation | express-validator | ^7.3.2 | اعتبارسنجی ورودی‌ها |
| Charts | chart.js | ^4.5.1 | ایجاد نمودارها (هنوز پیاده‌سازی نشده) |
| Scheduling | node-cron | ^3.0.3 | مدیریت وظایف زمان‌بندی شده (هنوز پیاده‌سازی نشده) |
| Logging | winston | ^3.19.0 | ثبت لاگ‌ها |
| HTTP Client | axios | ^1.17.0 | انجام درخواست‌های HTTP از سرور (هنوز استفاده نشده) |
| Date Handling | moment-jalaali | ^0.10.4 | مدیریت تاریخ‌های شمسی (هنوز استفاده نشده) |

---

## 3. معماری پروژه – ساختار پوشه‌ها
```
citycenter/
├── server.js                   # فایل اصلی سرور: میدلورها، مسیرها را تنظیم می‌کند
├── package.json               # اطلاعات پروژه و وابستگی‌ها
├── package-lock.json          # نسخه‌های دقیق وابستگی‌ها
├── .env                       # متغیرهای محیطی (پورت، اطلاعات دیتابیس، JWT_SECRET)
├── controllers/               # کنترلرها (منطق اصلی بیزینس)
│   ├── adminController.js     # کنترلر پنل مدیریت
│   ├── authController.js      # کنترلر احراز هویت (ورود، ثبت‌نام، فراموشی رمز)
│   └── shopController.js      # کنترلر پنل مغازه‌دار
├── routes/                    # مسیرها (Routes)
│   ├── admin.js               # مسیرهای پنل مدیریت
│   ├── auth.js                # مسیرهای احراز هویت
│   └── shop.js                # مسیرهای پنل مغازه‌دار
├── models/                    # مدل‌های دیتابیس (Sequelize)
│   ├── ShopOwner.js           # مدل مغازه‌دار
│   ├── MonthlyCharge.js       # مدل شارژ ماهانه
│   ├── Receipt.js             # مدل رسید پرداخت
│   ├── Setting.js             # مدل تنظیمات سامانه
│   ├── AuditLog.js            # مدل لاگ حسابرسی
│   ├── ApiKey.js              # مدل کلید API
│   └── index.js               # اتصال مدل‌ها و تعریف روابط
├── middleware/                # میدلورهای سفارشی
│   ├── authenticate.js        # میدلور احراز هویت با JWT
│   └── authorize.js           # میدلور مجوزدهی بر اساس نقش
├── views/                     # فایل‌های قالب EJS
│   ├── login.ejs              # صفحه ورود (تب‌ها برای مدیر و مغازه‌دار)
│   ├── admin/                 # قالب‌های پنل مدیریت
│   │   ├── dashboard.ejs      # داشبورد مدیریت (لیست مغازه‌ها، خلاصه مالی)
│   │   ├── users.ejs          # مدیریت کاربران (مشاهده، تأیید، ویرایش، حذف، افزودن)
│   │   └── shop-details.ejs   # جزئیات مغازه (تاریخچه شارژها، ویرایش مبلغ، تغییر وضعیت)
│   └── shop/                  # قالب‌های پنل مغازه‌دار
│       └── dashboard.ejs      # داشبورد مغازه‌دار (شارژ جاری، تاریخچه، بدهی‌ها، آپلود رسید)
├── public/                    # فایل‌های عمومی (CSS, JS, Uploads)
│   ├── css/
│   │   └── style.css          # استایل‌های عمومی
│   ├── js/
│   │   └── main.js            # منطق فرانت‌اند اصلی (تب‌ها، ورود، ثبت‌نام، ...)
│   ├── uploads/               # فایل‌های آپلودی (رسید‌ها)
│   │   ├── originals/         # نسخه اصلی تصاویر
│   │   └── compressed/        # نسخه فشرده شده تصاویر
│   └── no-image.png           # تصویر پیش‌فرض برای وقتی رسید موجود نیست
├── utils/                     # ابزارهای کمکی
│   ├── db.js                  # تنظیمات اتصال دیتابیس
│   └── logger.js              # تنظیمات لاگر (Winston)
├── seeds/                     # اسکریپت‌های داده‌های اولیه
│   └── seed.js                # ایجاد داده‌های نمونه در دیتابیس
├── logs/                      # فایل‌های لاگ (ایجاد شده توسط Winston)
│   ├── combined.log           # کلیه لاگ‌ها
│   └── error.log              # فقط لاگ‌های خطا
├── add-test-charge.js         # فایل تست (وظیفه‌ای ندارد)
├── check-db.js                # فایل تست (وظیفه‌ای ندارد)
├── create-placeholder.js      # فایل تست (وظیفه‌ای ندارد)
├── create-simple-placeholder.js # فایل تست (وظیفه‌ای ندارد)
├── create-test-pending.js     # فایل تست (وظیفه‌ای ندارد)
├── simulate-shop-request.js   # فایل تست (وظیفه‌ای ندارد)
└── test-db.js                 # فایل تست (وظیفه‌ای ندارد)
└── test-models.js             # فایل تست (وظیفه‌ای ندارد)
```

---

## 4. پایگاه داده – طراحی کامل
- **نام دیتابیس**: `shop_charge_db`
- **پیشوند جداول**: `sc_`

---

### 4.1 جدول `sc_shop_owners` (مغازه‌دار‌ها)
- **هدف**: ذخیره اطلاعات مدیر و مغازه‌دار‌ها
- **ستون‌ها**:
  | نام ستون | نوع داده | nullable | default | توضیح |
  |---------|---------|---------|---------|-------|
  | id | INTEGER | NO | AUTO_INCREMENT | کلید اصلی |
  | national_code | STRING(10) | NO | - | کد ملی (یکتا) |
  | first_name | STRING(100) | NO | - | نام |
  | last_name | STRING(100) | NO | - | نام خانوادگی |
  | shop_name | STRING(255) | NO | - | نام مغازه |
  | plaque | STRING(20) | NO | - | پلاک مغازه |
  | phone | STRING(15) | NO | - | شماره تماس |
  | password_hash | STRING(255) | NO | - | هش شده رمز عبور |
  | is_approved | BOOLEAN | NO | FALSE | آیا حساب تأیید شده؟ |
  | is_admin | BOOLEAN | NO | FALSE | آیا مدیر است؟ |
  | deleted_at | DATE | YES | NULL | زمان حذف نرم (soft delete) |
  | reset_code | STRING(255) | YES | NULL | هش bcrypt کد بازیابی (اصلاح ۲-ب: از STRING(6) به ۲۵۵ تغییر کرد) |
  | reset_code_expires | DATE | YES | NULL | زمان منقضی شدن کد بازیابی |
  | createdAt | DATE | NO | CURRENT_TIMESTAMP | زمان ایجاد |
  | updatedAt | DATE | NO | CURRENT_TIMESTAMP | زمان به‌روزرسانی |

- **کلیدهای اصلی**: `id`
- **کلیدهای خارجی**: ندارد
- **ایندکس‌ها**: `id` (PRIMARY), `national_code` (UNIQUE)
- **روابط با سایر جداول**: 
  - `ShopOwner.hasMany(MonthlyCharge, { foreignKey: 'shop_id', as: 'monthlyCharges' })` → یک مغازه‌دار شارژهای زیادی دارد

---

### 4.2 جدول `sc_monthly_charges` (شارژهای ماهانه)
- **هدف**: ذخیره شارژهای ماهانه مغازه‌ها
- **ستون‌ها**:
  | نام ستون | نوع داده | nullable | default | توضیح |
  |---------|---------|---------|---------|-------|
  | id | INTEGER | NO | AUTO_INCREMENT | کلید اصلی |
  | shop_id | INTEGER | NO | - | کد خارجی به جدول مغازه‌دار |
  | charge_month | DATEONLY | NO | - | ماه شارژ (فرمت YYYY-MM-01) |
  | amount | DECIMAL(15,0) | NO | - | مبلغ شارژ (تومان) |
  | due_date | DATEONLY | NO | - | تاریخ سررسید |
  | status | ENUM('unpaid','pending','paid') | NO | 'unpaid' | وضعیت شارژ |
  | paid_at | DATE | YES | NULL | زمان پرداخت |
  | transaction_code | STRING(100) | YES | NULL | کد پیگیری |
  | rejected_reason | STRING(255) | YES | NULL | دلیل رد رسید |
  | createdAt | DATE | NO | CURRENT_TIMESTAMP | زمان ایجاد |
  | updatedAt | DATE | NO | CURRENT_TIMESTAMP | زمان به‌روزرسانی |

- **کلیدهای اصلی**: `id`
- **کلیدهای خارجی**: `shop_id` → `sc_shop_owners.id`
- **ایندکس‌ها**: `id` (PRIMARY), `(shop_id, charge_month)` (UNIQUE)
- **روابط با سایر جداول**:
  - `MonthlyCharge.belongsTo(ShopOwner, { foreignKey: 'shop_id', as: 'shop' })` → یک شارژ به یک مغازه‌دار تعلق دارد
  - `MonthlyCharge.hasOne(Receipt, { foreignKey: 'charge_id', as: 'receipt' })` → یک شارژ یک رسید دارد

---

### 4.3 جدول `sc_receipts` (رسید‌ها)
- **هدف**: ذخیره اطلاعات رسید‌های پرداخت
- **ستون‌ها**:
  | نام ستون | نوع داده | nullable | default | توضیح |
  |---------|---------|---------|---------|-------|
  | id | INTEGER | NO | AUTO_INCREMENT | کلید اصلی |
  | charge_id | INTEGER | NO | - | کد خارجی به جدول شارژ |
  | original_path | STRING(255) | NO | - | مسیر نسخه اصلی تصویر |
  | compressed_path | STRING(255) | NO | - | مسیر نسخه فشرده شده |
  | createdAt | DATE | NO | CURRENT_TIMESTAMP | زمان ایجاد |
  | updatedAt | DATE | NO | - | وجود ندارد! (در مدل غیرفعال شده) |

- **کلیدهای اصلی**: `id`
- **کلیدهای خارجی**: `charge_id` → `sc_monthly_charges.id`
- **ایندکس‌ها**: `id` (PRIMARY)
- **روابط با سایر جداول**:
  - `Receipt.belongsTo(MonthlyCharge, { foreignKey: 'charge_id', as: 'charge' })` → یک رسید به یک شارژ تعلق دارد

---

### 4.4 جدول `sc_settings` (تنظیمات سامانه)
- **هدف**: ذخیره تنظیمات عمومی سامانه
- **ستون‌ها**:
  | نام ستون | نوع داده | nullable | default | توضیح |
  |---------|---------|---------|---------|-------|
  | id | INTEGER | NO | 1 | کلید اصلی (تنها یک ردیف) |
  | due_day | INTEGER | NO | 25 | روز سررسید شارژ |
  | default_fee | DECIMAL(15,0) | NO | 1200000 | مبلغ شارژ پیش‌فرض (تومان) |
  | webhook_url | STRING(255) | YES | NULL | آدرس وب‌هوک |
  | webhook_token | STRING(255) | YES | NULL | توکن وب‌هوک |
  | image_retention_months | INTEGER | NO | 24 | مدت نگهداری تصاویر (ماه) |
  | data_retention_months | INTEGER | NO | 24 | مدت نگهداری داده‌ها (ماه) |

- **کلیدهای اصلی**: `id`
- **کلیدهای خارجی**: ندارد
- **ایندکس‌ها**: `id` (PRIMARY)
- **روابط با سایر جداول**: ندارد

---

### 4.5 جدول `sc_audit_logs` (لاگ‌های حسابرسی)
- **هدف**: ثبت تغییرات مهم در سیستم (برای حسابرسی)
- **ستون‌ها**:
  | نام ستون | نوع داده | nullable | default | توضیح |
  |---------|---------|---------|---------|-------|
  | id | INTEGER | NO | AUTO_INCREMENT | کلید اصلی |
  | charge_id | INTEGER | NO | - | کد خارجی به جدول شارژ |
  | action | STRING(50) | NO | - | عملیات انجام شده (مثلاً 'approved') |
  | performed_by | ENUM('admin','shop_owner') | NO | - | کدام نقش این کار را انجام داده؟ |
  | performed_by_id | INTEGER | YES | NULL | شناسه شخصی که این کار را انجام داده |
  | details | TEXT | YES | NULL | توضیحات بیشتر |
  | createdAt | DATE | NO | CURRENT_TIMESTAMP | زمان انجام عملیات |
  | updatedAt | DATE | NO | - | وجود ندارد! (در مدل غیرفعال شده) |

- **کلیدهای اصلی**: `id`
- **کلیدهای خارجی**: `charge_id` → `sc_monthly_charges.id`
- **ایندکس‌ها**: `id` (PRIMARY)
- **روابط با سایر جداول**: ندارد

---

### 4.6 جدول `sc_api_keys` (کلیدهای API)
- **هدف**: ذخیرهٔ کلیدهای API خارجی — **فقط به‌صورت هش** (اصلاح ۱۱)
- **ستون‌ها**:
  | نام ستون | نوع داده | nullable | default | توضیح |
  |---------|---------|---------|---------|-------|
  | id | INTEGER | NO | AUTO_INCREMENT | کلید اصلی |
  | key_hash | STRING(64) | NO | - | هش SHA-256 کلید (یکتا) — کلید خام هرگز ذخیره نمی‌شود |
  | prefix | STRING(10) | NO | - | ۱۰ کاراکتر اول کلید، برای نمایش در پنل مدیریت |
  | description | STRING(255) | YES | NULL | توضیحات کلید |
  | last_used_at | DATE | YES | NULL | آخرین زمان استفادهٔ موفق |
  | expires_at | DATE | YES | NULL | زمان انقضا (اختیاری) |
  | created_at | DATE | YES | CURRENT_TIMESTAMP | زمان ایجاد |

- **کلیدهای اصلی**: `id`
- **کلیدهای خارجی**: ندارد
- **ایندکس‌ها**: `id` (PRIMARY), `key_hash` (UNIQUE)
- **روابط با سایر جداول**: ندارد
- **نحوهٔ استفاده**: کلید **فقط** از هدر `x-api-key` پذیرفته می‌شود (نه query string) — اصلاح ۱۱
- **نکتهٔ مهم**: کلید خام فقط **یک بار** در پاسخ `POST /admin/api/api-keys` برگردانده می‌شود و پس از آن قابل بازیابی نیست.

---

## 5. API Endpoints – مستندات کامل

---

### 5.1 مسیرهای احراز هویت (`/auth`)
| # | متد | مسیر کامل | میدلورها | کنترلر | احراز هویت | نقش مجاز | پارامترهای ورودی | پاسخ موفق | پاسخ خطا | توضیح |
|---|-----|-----------|---------|--------|-----------|---------|-----------------|-----------|---------|-------|
| 1 | POST | /auth/admin/login | ندارد | authController.adminLogin | خیر | - | `{ username, password }` | `{ token, role }` | 400, 401, 500 | ورود مدیر |
| 2 | POST | /auth/shop/login | ندارد | authController.shopLogin | خیر | - | `{ national_code, password }` | `{ token, role, shopName }` | 400, 401, 403, 500 | ورود مغازه‌دار |
| 3 | POST | /auth/shop/register | ندارد | authController.shopRegister | خیر | - | `{ first_name, last_name, national_code, plaque, phone, password, confirm_password }` | `{ message }` | 400, 500 | ثبت‌نام مغازه‌دار |
| 4 | POST | /auth/shop/forgot-password | ندارد | authController.forgotPasswordRequest | خیر | - | `{ phone }` | `{ message }` | 400, 500 | درخواست کد بازیابی رمز عبور |
| 5 | POST | /auth/shop/reset-password | ندارد | authController.resetPassword | خیر | - | `{ code, newPassword, confirmPassword }` | `{ message }` | 400, 500 | بازیابی رمز عبور با کد |

---

### 5.2 مسیرهای پنل مدیریت (`/admin`)
| # | متد | مسیر کامل | میدلورها | کنترلر | احراز هویت | نقش مجاز | پارامترهای ورودی | پاسخ موفق | پاسخ خطا | توضیح |
|---|-----|-----------|---------|--------|-----------|---------|-----------------|-----------|---------|-------|
| 1 | GET | /admin/dashboard | authenticate, authorize('admin') | adminController.getDashboard | بله | admin | `search?`, `status?`, `page?`, `limit?` | صفحه HTML (EJS) | 401, 403, 500 | نمایش داشبورد مدیریت (صفحه‌بندی‌شده — اصلاح ۷) |
| 2 | GET | /admin/users | authenticate, authorize('admin') | adminController.getUsers | بله | admin | `search?`, `status?`, `page?`, `limit?` | صفحه HTML (EJS) | 401, 403, 500 | نمایش لیست کاربران (صفحه‌بندی‌شده — اصلاح ۷) |
| 3 | PUT | /admin/users/:id/approve | authenticate, authorize('admin') | adminController.approveUser | بله | admin | `id` (path) | `{ message, user }` | 401, 403, 404, 500 | تأیید کاربر |
| 4 | DELETE | /admin/users/:id | authenticate, authorize('admin') | adminController.deleteUser | بله | admin | `id` (path) | `{ message }` | 401, 403, 404, 500 | بایگانی کاربر (soft delete) |
| 5 | PUT | /admin/users/:id | authenticate, authorize('admin') | adminController.updateUser | بله | admin | `id` (path), `{ first_name?, last_name?, national_code?, shop_name?, plaque?, phone?, password? }` | `{ message, user }` | 400, 401, 403, 404, 500 | ویرایش اطلاعات کاربر |
| 6 | POST | /admin/users | authenticate, authorize('admin') | adminController.addUser | بله | admin | `{ first_name, last_name, national_code, shop_name, plaque, phone, password, confirm_password }` | `{ message, user }` | 400, 401, 403, 500 | افزودن کاربر جدید |
| 7 | GET | /admin/shop/:id | authenticate, authorize('admin') | adminController.getShopDetails | بله | admin | `id` (path) | صفحه HTML (EJS) | 401, 403, 404, 500 | نمایش جزئیات یک مغازه |
| 8 | PUT | /admin/charges/:id/amount | authenticate, authorize('admin') | adminController.updateChargeAmount | بله | admin | `id` (path), `{ amount }` | `{ message, amount }` | 400, 401, 403, 404, 500 | ویرایش مبلغ شارژ |
| 9 | PUT | /admin/charges/:id/status | authenticate, authorize('admin') | adminController.changeChargeStatus | بله | admin | `id` (path), `{ status }` | `{ message, status, paid_at, transaction_code, rejected_reason }` | 400, 401, 403, 404, 500 | تغییر وضعیت شارژ (paid/unpaid) |
| 10 | PUT | /admin/charges/:id/approve | authenticate, authorize('admin') | adminController.approveReceipt | بله | admin | `id` (path) | `{ message, status, paid_at, transaction_code, rejected_reason }` | 400, 401, 403, 404, 500 | تأیید رسید |
| 11 | PUT | /admin/charges/:id/reject | authenticate, authorize('admin') | adminController.rejectReceipt | بله | admin | `id` (path), `{ reason }` | `{ message, status, rejected_reason }` | 400, 401, 403, 404, 500 | رد رسید |
| 12 | GET | /admin/receipts/:shopId/:chargeId | authenticate, authorize('admin') | adminController.serveReceipt | بله | admin | `shopId` (path), `chargeId` (path), `thumb?` (query) | فایل تصویر (PNG/JPG) | 401, 403, 404, 500 | نمایش/دانلود رسید |

---

### 5.3 مسیرهای پنل مغازه‌دار (`/shop`)
| # | متد | مسیر کامل | میدلورها | کنترلر | احراز هویت | نقش مجاز | پارامترهای ورودی | پاسخ موفق | پاسخ خطا | توضیح |
|---|-----|-----------|---------|--------|-----------|---------|-----------------|-----------|---------|-------|
| 1 | GET | /shop/dashboard | authenticate, authorize('shop_owner') | shopController.getDashboard | بله | shop_owner | `page?`, `limit?` | صفحه HTML (EJS) یا JSON | 401, 403, 500 | نمایش داشبورد مغازه‌دار |
| 2 | POST | /shop/upload-receipt | authenticate, authorize('shop_owner') | shopController.uploadReceipt | بله | shop_owner | `receipt` (form-data) | `{ message, compressedPath }` | 400, 401, 403, 500 | آپلود رسید پرداخت |
| 3 | GET | /shop/charge-status | authenticate, authorize('shop_owner') | shopController.getChargeStatus | بله | shop_owner | ندارد | `{ status, paid_at, transaction_code, rejected_reason, amount, compressed_path }` | 401, 403, 404, 500 | دریافت وضعیت شارژ جاری (برای Polling) |

---

## 6. کنترلرها – توابع موجود

---

### 6.1 authController.js
1. **adminLogin**:
   - مسیر: POST /auth/admin/login
   - ورودی: `req.body = { username, password }`
   - منطق اصلی: پیدا کردن کاربر با national_code و is_admin=true، مقایسه رمز عبور با bcrypt، ایجاد توکن JWT، تنظیم کوکی
   - پاسخ موفق: `{ token, role: 'admin' }`
   - خطاها: 400 (فیلد خالی)، 401 (نام کاربری یا رمز اشتباه)، 500 (خطای سرور)

2. **shopLogin**:
   - مسیر: POST /auth/shop/login
   - ورودی: `req.body = { national_code, password }`
   - منطق اصلی: پیدا کردن کاربر با national_code و is_admin=false، بررسی is_approved و deleted_at، مقایسه رمز عبور، ایجاد توکن JWT، تنظیم کوکی
   - پاسخ موفق: `{ token, role: 'shop_owner', shopName }`
   - خطاها: 400 (فیلد خالی)، 401 (نام کاربری یا رمز اشتباه)، 403 (حساب تأیید نشده یا غیرفعال)، 500 (خطای سرور)

3. **shopRegister**:
   - مسیر: POST /auth/shop/register
   - ورودی: `req.body = { first_name, last_name, national_code, plaque, phone, password, confirm_password }`
   - منطق اصلی: بررسی صحت ورودی‌ها، بررسی وجود national_code، هش کردن رمز عبور، ایجاد کاربر با is_approved=false
   - پاسخ موفق: `{ message: 'ثبت‌نام موفق. منتظر تأیید مدیریت باشید.' }`
   - خطاها: 400 (فیلد خالی، رمز مطابقت ندارد، کد ملی تکراری)، 500 (خطای سرور)

4. **forgotPasswordRequest**:
   - مسیر: POST /auth/shop/forgot-password
   - ورودی: `req.body = { phone }`
   - منطق اصلی: پیدا کردن کاربر با phone و is_admin=false و deleted_at=null، تولید کد 6 رقمی، ذخیره کد و زمان انقضا، لاگ کردن کد (در حال حاضر SMS ارسال نمی‌شود)
   - پاسخ موفق: `{ message: 'اگر این شماره تماس ثبت شده است، کد بازیابی ارسال خواهد شد.' }`
   - خطاها: 400 (شماره تماس خالی)، 500 (خطای سرور)

5. **resetPassword**:
   - مسیر: POST /auth/shop/reset-password
   - ورودی: `req.body = { code, newPassword, confirmPassword }`
   - منطق اصلی: بررسی صحت ورودی‌ها، پیدا کردن کاربر با reset_code و is_admin=false و deleted_at=null، بررسی زمان انقضا، هش کردن رمز جدید و ذخیره
   - پاسخ موفق: `{ message: 'رمز عبور با موفقیت تغییر یافت.' }`
   - خطاها: 400 (فیلد خالی، رمز مطابقت ندارد، کد نامعتبر یا منقضی شده)، 500 (خطای سرور)

---

### 6.2 adminController.js
1. **getDashboard**:
   - مسیر: GET /admin/dashboard
   - ورودی: `req.query = { search?, status? }`
   - منطق اصلی: پیدا کردن مغازه‌های تأیید شده (is_approved=true, deleted_at=null, is_admin=false)، شامل شارژهای ماه جاری، فیلتر بر اساس جستجو و وضعیت، محاسبه خلاصه مالی
   - پاسخ موفق: رندر کردن admin/dashboard.ejs
   - خطاها: 401, 500

2. **getUsers**:
   - مسیر: GET /admin/users
   - ورودی: `req.query = { search?, status? }`
   - منطق اصلی: پیدا کردن کاربران با is_admin=false، فیلتر بر اساس جستجو و وضعیت (approved/pending/deleted)
   - پاسخ موفق: رندر کردن admin/users.ejs
   - خطاها: 401, 500

3. **approveUser**:
   - مسیر: PUT /admin/users/:id/approve
   - ورودی: `req.params.id`
   - منطق اصلی: پیدا کردن کاربر، غیرفعال نبودن (is_admin=false)، تنظیم is_approved=true
   - پاسخ موفق: `{ message, user }`
   - خطاها: 401, 403, 404, 500

4. **deleteUser**:
   - مسیر: DELETE /admin/users/:id
   - ورودی: `req.params.id`
   - منطق اصلی: پیدا کردن کاربر، غیرفعال نبودن (is_admin=false)، تنظیم deleted_at به زمان فعلی
   - پاسخ موفق: `{ message }`
   - خطاها: 401, 403, 404, 500

5. **updateUser**:
   - مسیر: PUT /admin/users/:id
   - ورودی: `req.params.id`, `req.body = { first_name?, last_name?, national_code?, shop_name?, plaque?, phone?, password? }`
   - منطق اصلی: پیدا کردن کاربر، بررسی اینکه national_code جدید تکراری نباشد، به‌روزرسانی فیلدها، در صورت وجود رمز، هش کردن آن
   - پاسخ موفق: `{ message, user }`
   - خطاها: 400, 401, 403, 404, 500

6. **addUser**:
   - مسیر: POST /admin/users
   - ورودی: `req.body = { first_name, last_name, national_code, shop_name, plaque, phone, password, confirm_password }`
   - منطق اصلی: بررسی صحت ورودی‌ها، بررسی وجود national_code، هش کردن رمز عبور، ایجاد کاربر با is_approved=true
   - پاسخ موفق: `{ message, user }`
   - خطاها: 400, 401, 403, 500

7. **getShopDetails**:
   - مسیر: GET /admin/shop/:id
   - ورودی: `req.params.id`
   - منطق اصلی: پیدا کردن مغازه، پیدا کردن آخرین 6 شارژ آن شامل رسید‌ها
   - پاسخ موفق: رندر کردن admin/shop-details.ejs
   - خطاها: 401, 403, 404, 500

8. **updateChargeAmount**:
   - مسیر: PUT /admin/charges/:id/amount
   - ورودی: `req.params.id`, `req.body.amount`
   - منطق اصلی: پیدا کردن شارژ، به‌روزرسانی مبلغ، ایجاد لاگ حسابرسی
   - پاسخ موفق: `{ message, amount }`
   - خطاها: 400, 401, 403, 404, 500

9. **changeChargeStatus**:
   - مسیر: PUT /admin/charges/:id/status
   - ورودی: `req.params.id`, `req.body.status`
   - منطق اصلی: پیدا کردن شارژ، تغییر وضعیت (paid/unpaid)، در صورت paid تنظیم paid_at و transaction_code، در صورت unpaid پاک کردن آنها، ایجاد لاگ حسابرسی
   - پاسخ موفق: `{ message, status, paid_at, transaction_code, rejected_reason }`
   - خطاها: 400, 401, 403, 404, 500

10. **approveReceipt**:
    - مسیر: PUT /admin/charges/:id/approve
    - ورودی: `req.params.id`
    - منطق اصلی: پیدا کردن شارژ، بررسی اینکه وضعیت آن pending باشد، تغییر وضعیت به paid، تنظیم paid_at و transaction_code، ایجاد لاگ حسابرسی
    - پاسخ موفق: `{ message, status, paid_at, transaction_code, rejected_reason }`
    - خطاها: 400, 401, 403, 404, 500

11. **rejectReceipt**:
    - مسیر: PUT /admin/charges/:id/reject
    - ورودی: `req.params.id`, `req.body.reason`
    - منطق اصلی: پیدا کردن شارژ، بررسی اینکه وضعیت آن pending باشد، تغییر وضعیت به unpaid، تنظیم rejected_reason، ایجاد لاگ حسابرسی
    - پاسخ موفق: `{ message, status, rejected_reason }`
    - خطاها: 400, 401, 403, 404, 500

12. **serveReceipt**:
    - مسیر: GET /admin/receipts/:shopId/:chargeId
    - ورودی: `req.params.shopId`, `req.params.chargeId`, `req.query.thumb?`
    - منطق اصلی: پیدا کردن شارژ شامل رسید، در صورت وجود فایل آن را ارسال، در غیر این صورت no-image.png
    - پاسخ موفق: فایل تصویر
    - خطاها: 401, 403, 404, 500

---

### 6.3 shopController.js
1. **getDashboard**:
   - مسیر: GET /shop/dashboard
   - ورودی: `req.query.page?`, `req.query.limit?`
   - منطق اصلی: پیدا کردن مغازه (req.user.id)، پیدا کردن شارژ ماه جاری شامل رسید، پیدا کردن تاریخچه شارژها با صفحه‌بندی، پیدا کردن بدهی‌های معوق (unpaid و قبل از ماه جاری)، محاسبه روزهای تأخیر برای هر بدهی
   - پاسخ موفق: رندر کردن shop/dashboard.ejs یا JSON (اگر درخواست JSON باشد)
   - خطاها: 401, 403, 500

2. **uploadReceipt**:
   - مسیر: POST /shop/upload-receipt
   - ورودی: `req.file` (form-data)
   - منطق اصلی: آپلود فایل با multer، فشرده‌سازی تصویر با sharp، ایجاد ردیف در جدول Receipt، تغییر وضعیت شارژ به pending، ایجاد لاگ حسابرسی
   - پاسخ موفق: `{ message, compressedPath }`
   - خطاها: 400, 401, 403, 500

3. **getChargeStatus**:
   - مسیر: GET /shop/charge-status
   - ورودی: ندارد
   - منطق اصلی: پیدا کردن شارژ ماه جاری شامل رسید، برگرداندن وضعیت آن
   - پاسخ موفق: `{ status, paid_at, transaction_code, rejected_reason, amount, compressed_path }`
   - خطاها: 401, 403, 404, 500

---

## 7. میدلورها – جزئیات

---

### 7.1 authenticate.js (میدلور احراز هویت)
- **مسیر فایل**: `middleware/authenticate.js`
- **هدف**: تأیید اینکه کاربر با توکن JWT معتبر وارد شده است
- **نحوه عملکرد (قدم‌به‌قدم)**:
  1. بررسی `Authorization` هدر و استخراج توکن از آن (Bearer Token)
  2. اگر توکن در هدر نبود، بررسی `token` کوکی
  3. اگر هیچ توکنی یافت نشد → پاسخ 401 Unauthorized
  4. در غیر این صورت، تأیید توکن با `JWT_SECRET`
  5. اگر توکن منقضی شده یا نامعتبر باشد → پاسخ 401 Unauthorized
  6. در غیر این صورت، تنظیم `req.user = { id: decoded.id, role: decoded.role }`
  7. فراخوانی `next()` برای ادامه پردازش درخواست
- **در کدام مسیرها استفاده می‌شود**: تمام مسیرهای `/admin` و `/shop`

---

### 7.2 authorize.js (میدلور مجوزدهی)
- **مسیر فایل**: `middleware/authorize.js`
- **هدف**: تأیید اینکه کاربر نقش مجاز برای دسترسی به مسیر را دارد
- **نحوه عملکرد (قدم‌به‌قدم)**:
  1. آرگومان‌های تابع: نقش‌های مجاز (مثلاً 'admin')
  2. برگرداندن یک میدلور جدید
  3. در میدلور جدید: بررسی اینکه `req.user.role` در لیست نقش‌های مجاز باشد
  4. اگر نه → پاسخ 403 Forbidden
  5. اگر بله → فراخوانی `next()`
- **در کدام مسیرها استفاده می‌شود**: تمام مسیرهای `/admin` (با نقش 'admin') و تمام مسیرهای `/shop` (با نقش 'shop_owner')

---

### 7.3 upload.js (میدلور آپلود فایل)
- **نکته مهم**: این میدلور در پوشه `middleware` وجود ندارد! در عوض، مستقیماً در `shopController.js` با استفاده از `multer` پیاده‌سازی شده است.

---

## 8. متغیرهای محیطی (.env)

| متغیر | مقدار | توضیح |
|-------|-----------|-------|
| DB_HOST | localhost | آدرس سرور دیتابیس |
| DB_PORT | 3307 | پورت MySQL/MariaDB (XAMPP روی ۳۳۰۷ اجرا می‌شود) |
| DB_USER | root | نام کاربری دیتابیس |
| DB_PASS | (خالی) | رمز عبور دیتابیس |
| DB_NAME | shop_charge_db | نام دیتابیس |
| JWT_SECRET | **مقدار تصادفی ۶۴ کاراکتری در `.env`** | کلید مخفی امضای JWT — مقدار را از `.env` بخوانید، هرگز در مستندات ننویسید |
| PORT | 3514 | پورت اجرای سرور |
| ADMIN_USER | admin | نام کاربری مدیر |
| ADMIN_PASS | **مقدار تصادفی قوی در `.env`** | رمز مدیر — مقدار `123456` دیگر معتبر نیست؛ همیشه از `.env` بخوانید |

> 🔒 **هشدار امنیتی**: مقادیر واقعی `JWT_SECRET` و `ADMIN_PASS` **نباید** در هیچ سندی نوشته شوند. این سند قبلاً یک مقدار جعلی (`my_very_secret_random_key_123`) و رمز قدیمی (`123456`) را ثبت کرده بود که هر دو منسوخ و گمراه‌کننده‌اند. فایل `.env` در `.gitignore` است (اصلاح ۶).
> اگر مقدار `ADMIN_PASS` شامل کاراکتر `#` بود، باید داخل `""` قرار گیرد (اصلاح ۲۴/۲۵).

---

## 9. صفحه‌های EJS – تحلیل

---

### 9.1 login.ejs
- **مسیر فایل**: `views/login.ejs`
- **هدف**: صفحه ورود با تب‌های مجزا برای مدیر و مغازه‌دار، و فرم ثبت‌نام برای مغازه‌دار
- **متغیرهای EJS استفاده شده**: `csrfToken`
- **بخش‌های اصلی صفحه**:
  1. هدر با دکمه تغییر تم
  2. تب‌ها: "ورود مدیر" و "ورود و عضویت مغازه‌دار"
  3. تب فرعی برای "ورود" و "عضویت"
  4. فرم‌های ورود مدیر، ورود مغازه‌دار، ثبت‌نام مغازه‌دار
  5. مودال فراموشی رمز عبور
- **اسکریپت‌های JavaScript**: `public/js/main.js`
- **event listenerهای مهم**: 
  - برای تغییر تب‌ها
  - برای فرم‌های ورود مدیر/مغازه‌دار/ثبت‌نام
  - برای مودال فراموشی رمز

---

### 9.2 admin/dashboard.ejs
- **مسیر فایل**: `views/admin/dashboard.ejs`
- **هدف**: داشبورد اصلی مدیریت با خلاصه مالی و لیست مغازه‌ها
- **متغیرهای EJS استفاده شده**: `user`, `shops`, `summary`, `search`, `status`, `page`, `limit`, `totalPages`, `totalCount`, `currentMonthJalali`
- **بخش‌های اصلی صفحه**:
  1. هدر با دکمه تغییر تم و منوی ناوبری
  2. کارت‌های خلاصه مالی (کل مغازه‌ها، بدهکار‌ها، جمع پرداخت شده، جمع پرداخت نشده)
  3. فرم فیلتر و جستجو
  4. جدول مغازه‌ها (نام، کد ملی، مبلغ، وضعیت، تاریخ سررسید، تاریخ پرداخت، کد پیگیری)
- **اسکریپت‌های JavaScript**: `public/js/main.js`
- **event listenerهای مهم**: دکمه خروج (`logout()`)

---

### 9.3 admin/users.ejs
- **مسیر فایل**: `views/admin/users.ejs`
- **هدف**: مدیریت کاربران (مشاهده، تأیید، ویرایش، حذف، افزودن)
- **متغیرهای EJS استفاده شده**: `csrfToken`, `user`, `users`, `search`, `status`
- **بخش‌های اصلی صفحه**:
  1. هدر با دکمه تغییر تم و منوی ناوبری
  2. دکمه "افزودن مغازه‌دار جدید"
  3. فرم فیلتر و جستجو
  4. جدول کاربران
  5. مودال ویرایش کاربر
  6. مودال افزودن کاربر
- **اسکریپت‌های JavaScript**: `public/js/main.js` و اسکریپت درون صفحه
- **event listenerهای مهم**: 
  - دکمه خروج
  - تأیید/ویرایش/حذف کاربر (با event delegation روی <tbody>)
  - افزودن کاربر

---

### 9.4 admin/shop-details.ejs
- **مسیر فایل**: `views/admin/shop-details.ejs`
- **هدف**: نمایش جزئیات یک مغازه و تاریخچه شارژهای آن
- **متغیرهای EJS استفاده شده**: `csrfToken`, `user`, `shop`, `charges`
- **بخش‌های اصلی صفحه**:
  1. هدر با دکمه تغییر تم و منوی ناوبری
  2. دکمه بازگشت
  3. اطلاعات مغازه
  4. جدول تاریخچه شارژها (ماه، مبلغ (قابل ویرایش)، وضعیت، تاریخ پرداخت، کد پیگیری، عملیات)
  5. مودال نمایش رسید
- **اسکریپت‌های JavaScript**: `public/js/main.js` و اسکریپت درون صفحه
- **event listenerهای مهم**:
  - دکمه خروج
  - ویرایش مبلغ (با کلیک روی متن)
  - تغییر وضعیت شارژ
  - نمایش/تأیید/رد رسید (با event delegation روی <tbody>)

---

### 9.5 shop/dashboard.ejs
- **مسیر فایل**: `views/shop/dashboard.ejs`
- **هدف**: داشبورد مغازه‌دار با نمایش شارژ جاری، بدهی‌ها، تاریخچه، و آپلود رسید
- **متغیرهای EJS استفاده شده**: `csrfToken`, `shop`, `currentCharge`, `transactions`, `currentPage`, `totalPages`, `totalCount`, `debts`
- **بخش‌های اصلی صفحه**:
  1. هدر با دکمه تغییر تم
  2. منوی ناوبری با دکمه خروج
  3. کارت شارژ ماه جاری (با حالت‌های مختلف: بدون شارژ، unpaid، pending، paid، rejected)
  4. بخش بدهی‌های معوق
  5. بخش تاریخچه تراکنش‌ها (جدول با صفحه‌بندی)
  6. مودال آپلود رسید
- **اسکریپت‌های JavaScript**: `public/js/main.js` و اسکریپت درون صفحه
- **event listenerهای مهم**:
  - دکمه خروج
  - دکمه‌های صفحه‌بندی (با event delegation روی #transactionContainer)
  - آپلود رسید
  - Polling خودکار برای وضعیت شارژ جاری

---

## 10. گام‌های انجام‌شده (1 تا 18)

---

### 10.1 گام 1: راه‌اندازی پروژه و پکیج‌ها
- **عنوان گام**: راه‌اندازی پروژه و پکیج‌ها
- **تاریخ تقریبی انجام**: قبل از شروع کار
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `package.json`, `package-lock.json`
- **تغییرات اعمال‌شده**: ایجاد package.json، نصب وابستگی‌های اولیه
- **قابلیت اضافه‌شده**: امکان اجرای پروژه با Node.js
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.2 گام 2: اتصال پایگاه داده
- **عنوان گام**: اتصال پایگاه داده
- **تاریخ تقریبی انجام**: بعد از گام 1
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `utils/db.js`, `.env`
- **تغییرات اعمال‌شده**: ایجاد تنظیمات اتصال Sequelize، اضافه کردن متغیرهای محیطی
- **قابلیت اضافه‌شده**: اتصال به دیتابیس MySQL
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.3 گام 3: تعریف مدل‌ها
- **عنوان گام**: تعریف مدل‌ها
- **تاریخ تقریبی انجام**: بعد از گام 2
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `models/ShopOwner.js`, `models/MonthlyCharge.js`, `models/Receipt.js`, `models/Setting.js`, `models/AuditLog.js`, `models/ApiKey.js`, `models/index.js`
- **تغییرات اعمال‌شده**: تعریف تمام 6 مدل با Sequelize، تعریف روابط بین مدل‌ها
- **قابلیت اضافه‌شده**: امکان کار با دیتابیس با ORM
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: نداشت (در ادامه یک مشکل alias در include مدل Receipt پیدا شد که رفع شد)

---

### 10.4 گام 4: داده‌های اولیه (Seed)
- **عنوان گام**: داده‌های اولیه (Seed)
- **تاریخ تقریبی انجام**: بعد از گام 3
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `seeds/seed.js`
- **تغییرات اعمال‌شده**: اسکریپت برای ایجاد داده‌های نمونه (1 مدیر، 15 مغازه‌دار، شارژهای ماهانه برای 5 ماه، یک کلید API)
- **قابلیت اضافه‌شده**: امکان پر کردن دیتابیس با داده‌های نمونه
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.5 گام 5: احراز هویت (Auth API)
- **عنوان گام**: احراز هویت (Auth API)
- **تاریخ تقریبی انجام**: بعد از گام 4
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/authController.js`, `routes/auth.js`
- **تغییرات اعمال‌شده**: ایجاد کنترلر احراز هویت (ورود مدیر/مغازه‌دار، ثبت‌نام، فراموشی رمز)، ایجاد مسیرهای مربوطه
- **قابلیت اضافه‌شده**: ورود و ثبت‌نام کاربران
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: در ادامه یک مشکل logger undefined در authController.js پیدا شد که رفع شد

---

### 10.6 گام 6: میدلورهای امنیتی
- **عنوان گام**: میدلورهای امنیتی
- **تاریخ تقریبی انجام**: بعد از گام 5
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `middleware/authenticate.js`, `middleware/authorize.js`, `server.js`
- **تغییرات اعمال‌شده**: ایجاد میدلورهای احراز هویت و مجوزدهی، اضافه کردن cookie-parser، helmet، csurf در server.js
- **قابلیت اضافه‌شده**: محافظت در برابر حملات مختلف (CSRF، بدون احراز هویت، بدون مجوز)
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: در ادامه یک مشکل cookie path پیدا شد که رفع شد

---

### 10.7 گام 7: صفحه ورود (login.ejs)
- **عنوان گام**: صفحه ورود (login.ejs)
- **تاریخ تقریبی انجام**: بعد از گام 6
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `views/login.ejs`
- **تغییرات اعمال‌شده**: ایجاد صفحه ورود با تب‌ها، فرم‌ها، مودال فراموشی رمز
- **قابلیت اضافه‌شده**: رابط کاربری برای ورود و ثبت‌نام
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.8 گام 8: منطق فرانت‌اند (main.js)
- **عنوان گام**: منطق فرانت‌اند (main.js)
- **تاریخ تقریبی انجام**: بعد از گام 7
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `public/js/main.js`
- **تغییرات اعمال‌شده**: ایجاد منطق تب‌ها، ورود، ثبت‌نام، فراموشی رمز، خروج، تغییر تم، تابع fetchWithAuth
- **قابلیت اضافه‌شده**: رابط کاربری قابل تعامل
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.9 گام 9: پنل مدیریت – زیرساخت
- **عنوان گام**: پنل مدیریت – زیرساخت
- **تاریخ تقریبی انجام**: بعد از گام 8
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/adminController.js`, `routes/admin.js`, `views/admin/dashboard.ejs`
- **تغییرات اعمال‌شده**: ایجاد زیرساخت کنترلر، مسیرها، و صفحه خالی داشبورد
- **قابلیت اضافه‌شده**: دسترسی به صفحه داشبورد مدیریت
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.10 گام 10: پنل مدیریت – داشبورد
- **عنوان گام**: پنل مدیریت – داشبورد
- **تاریخ تقریبی انجام**: بعد از گام 9
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/adminController.js` -> getDashboard، `views/admin/dashboard.ejs`
- **تغییرات اعمال‌شده**: پیاده‌سازی نمایش کارت‌های خلاصه، جدول مغازه‌ها، فیلتر و جستجو
- **قابلیت اضافه‌شده**: مشاهده وضعیت شارژهای ماه جاری برای کل مغازه‌ها
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.11 گام 11: مدیریت کاربران – لیست
- **عنوان گام**: مدیریت کاربران – لیست
- **تاریخ تقریبی انجام**: بعد از گام 10
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/adminController.js` -> getUsers، `views/admin/users.ejs`
- **تغییرات اعمال‌شده**: پیاده‌سازی نمایش لیست کاربران با فیلتر و جستجو
- **قابلیت اضافه‌شده**: مشاهده لیست کاربران
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.12 گام 12: مدیریت کاربران – CRUD
- **عنوان گام**: مدیریت کاربران – CRUD
- **تاریخ تقریبی انجام**: بعد از گام 11
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/adminController.js` -> approveUser, deleteUser, updateUser, addUser، `views/admin/users.ejs` -> مودال‌ها
- **تغییرات اعمال‌شده**: پیاده‌سازی تأیید، حذف، ویرایش، افزودن کاربر
- **قابلیت اضافه‌شده**: مدیریت کامل کاربران
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.13 گام 13: جزئیات مغازه
- **عنوان گام**: جزئیات مغازه
- **تاریخ تقریبی انجام**: بعد از گام 12
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/adminController.js` -> getShopDetails, updateChargeAmount, changeChargeStatus، `views/admin/shop-details.ejs`
- **تغییرات اعمال‌شده**: پیاده‌سازی نمایش تاریخچه شارژها، ویرایش مبلغ، تغییر وضعیت
- **قابلیت اضافه‌شده**: مشاهده و ویرایش جزئیات یک مغازه
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: یک مشکل alias در include مدل Receipt وجود داشت که رفع شد

---

### 10.14 گام 14: مدیریت رسید‌ها
- **عنوان گام**: مدیریت رسید‌ها
- **تاریخ تقریبی انجام**: بعد از گام 13
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/adminController.js` -> approveReceipt, rejectReceipt, serveReceipt، `views/admin/shop-details.ejs` -> مودال رسید
- **تغییرات اعمال‌شده**: پیاده‌سازی مشاهده، تأیید و رد رسید
- **قابلیت اضافه‌شده**: مدیریت رسید‌های پرداخت
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.15 گام 15: پنل مغازه‌دار – داشبورد
- **عنوان گام**: پنل مغازه‌دار – داشبورد
- **تاریخ تقریبی انجام**: بعد از گام 14
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/shopController.js` -> getDashboard، `routes/shop.js`، `views/shop/dashboard.ejs`
- **تغییرات اعمال‌شده**: پیاده‌سازی نمایش شارژ ماه جاری با 5 حالت مختلف
- **قابلیت اضافه‌شده**: دسترسی مغازه‌دار به داشبورد
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: در ادامه چند مشکل در این صفحه پیدا شد که رفع شدند (event delegation، ...)

---

### 10.16 گام 16: آپلود رسید
- **عنوان گام**: آپلود رسید
- **تاریخ تقریبی انجام**: بعد از گام 15
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/shopController.js` -> uploadReceipt، `views/shop/dashboard.ejs` -> مودال آپلود
- **تغییرات اعمال‌شده**: پیاده‌سازی آپلود فایل با multer، فشرده‌سازی با sharp، ذخیره در دیتابیس
- **قابلیت اضافه‌شده**: آپلود رسید توسط مغازه‌دار
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.17 گام 17: Polling خودکار
- **عنوان گام**: Polling خودکار
- **تاریخ تقریبی انجام**: بعد از گام 16
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/shopController.js` -> getChargeStatus، `views/shop/dashboard.ejs` -> اسکریپت Polling
- **تغییرات اعمال‌شده**: پیاده‌سازی API برای دریافت وضعیت شارژ، اسکریپت برای بررسی وضعیت هر 5 ثانیه
- **قابلیت اضافه‌شده**: به‌روزرسانی وضعیت شارژ بدون رفرش صفحه
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: ندارد

---

### 10.18 گام 18: تاریخچه و بدهی‌ها
- **عنوان گام**: تاریخچه و بدهی‌ها
- **تاریخ تقریبی انجام**: بعد از گام 17
- **فایل‌های تغییر‌یافته یا ایجاد‌شده**: `controllers/shopController.js` -> getDashboard (بخش تاریخچه و بدهی‌ها)، `views/shop/dashboard.ejs` -> جدول تاریخچه و بخش بدهی‌ها
- **تغییرات اعمال‌شده**: پیاده‌سازی نمایش تاریخچه تراکنش‌ها با صفحه‌بندی، نمایش بدهی‌های معوق
- **قابلیت اضافه‌شده**: مشاهده تاریخچه و بدهی‌های قبلی
- **نتیجه تست**: موفق
- **مشکلات احتمالی**: یک مشکل event delegation در دکمه‌های صفحه‌بندی وجود داشت که رفع شد

---

## 11. گام‌های باقی‌مانده (19 تا 25)

---

### 11.1 گام 19: نمودارهای حسابداری
- **عنوان**: نمودارهای حسابداری
- **اولویت**: بالا
- **فایل‌هایی که باید تغییر کنند**: `adminController.js`, `views/admin/dashboard.ejs`, `shopController.js`, `views/shop/dashboard.ejs`
- **تخمین پیچیدگی**: متوسط
- **وابستگی به گام‌های دیگر**: ندارد
- **توضیح**: ایجاد نمودارهایی برای نمایش وضعیت مالی (مثلاً نمودار میله‌ای برای شارژهای ماهانه، نمودار دایره‌ای برای نسبت پرداخت شده/نشده) با استفاده از Chart.js

---

### 11.2 گام 20: جستجوی پیشرفته
- **عنوان**: جستجوی پیشرفته
- **اولویت**: متوسط
- **فایل‌هایی که باید تغییر کنند**: `adminController.js`, `views/admin/dashboard.ejs`, `views/admin/users.ejs`, `shopController.js`, `views/shop/dashboard.ejs`
- **تخمین پیچیدگی**: متوسط
- **وابستگی به گام‌های دیگر**: ندارد
- **توضیح**: افزودن فیلترهای بیشتر برای جستجو (مثلاً فیلتر تاریخ برای تاریخچه شارژها، فیلتر مبلغ)

---

### 11.3 گام 21: خروجی CSV
- **عنوان**: خروجی CSV
- **اولویت**: متوسط
- **فایل‌هایی که باید تغییر کنند**: `adminController.js`, `views/admin/dashboard.ejs`, `views/admin/users.ejs`, `shopController.js`, `views/shop/dashboard.ejs`
- **تخمین پیچیدگی**: ساده
- **وابستگی به گام‌های دیگر**: ندارد
- **توضیح**: امکان دانلود لیست مغازه‌ها، کاربران، تاریخچه شارژها به صورت فایل CSV

---

### 11.4 گام 22: صفحه تنظیمات
- **عنوان**: صفحه تنظیمات
- **اولویت**: متوسط
- **فایل‌هایی که باید تغییر کنند**: `adminController.js`, `views/admin/settings.ejs` (جدید), `routes/admin.js`
- **تخمین پیچیدگی**: ساده
- **وابستگی به گام‌های دیگر**: ندارد
- **توضیح**: ایجاد صفحه تنظیمات برای مدیریت تنظیمات سامانه (روز سررسید، مبلغ شارژ پیش‌فرض، ...)

---

### 11.5 گام 23: API خارجی
- **عنوان**: API خارجی
- **اولویت**: پایین
- **فایل‌هایی که باید تغییر کنند**: `routes/api.js` (جدید), `controllers/apiController.js` (جدید), `middleware/apiAuth.js` (جدید)
- **تخمین پیچیدگی**: متوسط
- **وابستگی به گام‌های دیگر**: ندارد
- **توضیح**: ایجاد REST API برای سیستم‌های خارجی با استفاده از کلیدهای API

---

### 11.6 گام 24: Cron (وظایف زمان‌بندی شده)
- **عنوان**: Cron (وظایف زمان‌بندی شده)
- **اولویت**: بالا
- **فایل‌هایی که باید تغییر کنند**: `server.js`, `cron/jobs.js` (جدید)
- **تخمین پیچیدگی**: متوسط
- **وابستگی به گام‌های دیگر**: ندارد
- **توضیح**: ایجاد وظایف زمان‌بندی شده (مثلاً ایجاد خودکار شارژهای ماه جدید در ابتدای هر ماه، پاک کردن تصاویر قدیمی) با استفاده از node-cron

---

### 11.7 گام 25: به‌روزرسانی امنیت
- **عنوان**: به‌روزرسانی امنیت
- **اولویت**: بالا
- **فایل‌هایی که باید تغییر کنند**: `server.js`, `.env`
- **تخمین پیچیدگی**: ساده
- **وابستگی به گام‌های دیگر**: ندارد
- **توضیح**: فعال‌سازی complete helmet config، استفاده از secure/cookies در محیط production، تنظیم rate limiting مناسب

---

## 12. باگ‌های رفع‌شده
| # | تاریخ | شرح باگ | فایل(های) معیوب | علت | راه حل | گام مرتبط |
|---|-------|---------|----------------|------|--------|----------|
| 1 | 9 تیر 1405 | مشکل timezone در محاسبه ماه جاری | server.js, adminController.js, shopController.js | استفاده از تاریخ محلی سرور | رفع با استفاده از new Date() به درستی (در نسخه فعلی به درستی پیاده‌سازی شده) | 10, 15 |
| 2 | 9 تیر 1405 | مشکل alias در include مدل Receipt | adminController.js, shopController.js, models/index.js | فراموشی استفاده از alias 'receipt' در include | اضافه کردن as: 'receipt' در تمام include های Receipt | 13, 15 |
| 3 | 9 تیر 1405 | مشکل cookie path | authController.js | تنظیم نشدن path در res.cookie → کوکی فقط برای مسیر /auth فعال بود | اضافه کردن path: '/' به res.cookie | 5 |
| 4 | 9 تیر 1405 | مشکل event delegation در دکمه‌های صفحه‌بندی | views/shop/dashboard.ejs | اتصال event listener مستقیم به دکمه‌ها → وقتی DOM بازنویسی شد، listenerها از بین می‌رفتند | استفاده از event delegation روی والد دائمی #transactionContainer | 18 |
| 5 | 9 تیر 1405 | مشکل CSP در helmet | server.js | تنظیمات پیش‌فرض helmet محدودیت‌هایی برای CSP داشت | در نسخه فعلی helmet فعال است اما تنظیمات مناسب انجام شده | 6 |
| 6 | 9 تیر 1405 | مشکل logger undefined در authController | authController.js | فراموشی import کردن logger | اضافه کردن const logger = require('../utils/logger'); | 5 |

---

## 13. باگ‌های شناخته‌شده

> **به‌روزرسانی (پس از اصلاح ۱۲)**: موارد ۲ و ۳ رفع شده‌اند. باگ‌های بیشتری در جریان اصلاحات ۱ تا ۱۲ پیدا و رفع شدند و همه در `PROGRESS.md` (ردیف‌های ۴۴ به بعد) مستند شده‌اند.

| # | شرح | فایل | شدت | وضعیت |
|---|-----|-----------|-----|----------------|
| 1 | در production، کوکی باید `secure: true` باشد و روی HTTPS تست شود | authController.js | متوسط | ⏳ **باز** — کد فعلی `secure: process.env.NODE_ENV === 'production'` دارد ولی روی استقرار واقعی تست نشده |
| 2 | صفحه‌بندی در پنل مدیریت وجود ندارد | views/admin/dashboard.ejs, views/admin/users.ejs, adminController.js | متوسط | ✅ **رفع شد — اصلاح ۷** (`findAndCountAll` + `limit`/`offset`) |
| 3 | اعتبارسنجی ورودی‌ها با express-validator انجام نشده | adminController.js | پایین | ✅ **رفع شد** — اعتبارسنجی مبلغ شارژ، کاربران و آپلود اضافه شده است |
| 4 | ناهماهنگی جزئی در `seeds/seed.js` (bcrypt.hashSync در همهٔ مسیرها) | seeds/seed.js | خیلی پایین | ✅ **بی‌اثر** — کد درست است |

**موارد رفع‌شدهٔ جدید که در این سند نبودند** (فهرست کامل در `PROGRESS.md`): XSS ذخیره‌شده (پنل مدیر و پنل مغازه‌دار)، SSRF و دور زدن IPv6 در Webhook، امنیت آپلود، Login CSRF روی `/auth/*`، نبود Error Handler مرکزی، کلید API به‌صورت plaintext، Race Condition در یکتایی `national_code`، و نبود صفحه‌بندی.

---

## 14. داده‌های دمو موجود در دیتابیس

> **به‌روزرسانی**: اعداد زیر مربوط به داده‌های seed اولیه است. دیتابیس فعلی ۲۱ کاربر دارد (seed + کاربران واقعی/تستی که بعداً اضافه شده‌اند).

- **تعداد مغازه‌ها**: 15 مغازه‌دار تأیید شده یا در انتظار تأیید + 1 مدیر (دادهٔ seed)
- **وضعیت شارژهای ماه جاری**:
  - گروه اول (5 مغازه): تمام ماه‌ها paid
  - گروه دوم (5 مغازه): ماه جاری unpaid، ماه‌های قبلی paid
  - گروه سوم (5 مغازه): ماه جاری pending، ماه قبل unpaid، ماه‌های دیگر paid
- **کاربران خاص**:
  - **مدیر**: `national_code=admin` — رمز عبور را از فایل `.env` (متغیر `ADMIN_PASS`) بخوانید. ⚠️ **مقدار `123456` که در نسخهٔ قبلی این سند نوشته شده بود منسوخ است** (اصلاح ۲۵).
  - **مغازه‌دار نمونه**: `national_code=2` / رمز `2` / `shop_id=18` / `phone=09121111111`
- **نکته مهم**: کاربر با کد ملی 2 دارای `shop_id=18` است، نه 2!
- **کلید API**: جدول `sc_api_keys` در پایان اصلاح ۱۱ **خالی** شد (کلیدهای plaintext باطل شدند). برای ساخت کلید جدید در `/admin/settings` روی «ایجاد کلید جدید» بزنید — کلید فقط **یک بار** نمایش داده می‌شود.

---

## 15. دستورات پرکاربرد
```bash
# ورود به دایرکتوری پروژه
cd c:\Users\mohamadzamani\Desktop\citycenter

# بستن تمام فرآیندهای Node.js (برای حل مشکل پورت اشغال)
taskkill /f /im node.exe

# اجرای سرور
node server.js

# اجرای اسکریپت داده‌های اولیه (ریست کامل دیتابیس و ایجاد داده‌های نمونه)
node seeds/seed.js
```

---

## 16. نکات حیاتی برای توسعه‌دهنده بعدی
1. **ترتیب middlewareها در server.js** — ⚠️ **این بند در اصلاح ۹ اصلاح شد؛ متن قبلی غلط و خطرناک بود.** متن قبلی می‌گفت «`/auth` را **قبل از** CSRF ثبت کنید، زیرا CSRF برای آن‌ها لازم نیست». انجام این کار یک آسیب‌پذیری **Login CSRF** باز می‌کند (مهاجم می‌تواند قربانی را مجبور کند با حساب مهاجم وارد شود). ترتیب **درست فعلی**:
   `express.json/urlencoded/cookieParser` → `/uploads` ۴۰۴ → `express.static` → **`/api/external`** (تنها استثنا: با `api_key` احراز هویت می‌کند و کلاینت آن توکن CSRF ندارد) → محدودکننده‌های اختصاصی → **`csrfProtection`** → تزریق `res.locals.csrfToken` → `/login` → **`/auth`** → `/admin` → `/shop` → هندلر ۴۰۴ مرکزی → هندلر خطای مرکزی.
   **هرگز `csrfProtection` را پایین‌تر از `/auth` منتقل نکنید.**
2. **Cookie path**: حتماً path: '/' به res.cookie در authController.js اضافه شود، در غیر این صورت کوکی فقط برای مسیر /auth فعال است و باعث Unauthorized در مسیرهای /admin و /shop می‌شود.
3. **Model Receipt با alias 'receipt'**: تمام include های Receipt باید شامل as: 'receipt' باشند، در غیر این صورت Sequelize خطا می‌دهد.
4. **Shop_id کاربر با کد ملی 2**: این کاربر shop_id=18 دارد، نه 2.
5. **Event delegation برای دکمه‌های صفحه‌بندی**: در views/shop/dashboard.ejs، از event delegation روی #transactionContainer استفاده می‌کنیم، زیرا محتوای جدول و pagination به طور داینامیک تغییر می‌کند.
6. **Polling**: در views/shop/dashboard.ejs، polling هر 5 ثانیه انجام می‌شود تا وضعیت شارژ جاری به‌روز شود.
7. **Multer and Sharp**: آپلود فایل در shopController.js با multer انجام می‌شود و فایل‌ها در public/uploads/originals و public/uploads/compressed ذخیره می‌شوند. Sharp برای فشرده‌سازی تصاویر استفاده می‌شود.
8. **Winston Logger**: در تمام controllerها از logger استفاده می‌کنیم، و لاگ‌ها در logs/combined.log و logs/error.log ذخیره می‌شوند.
9. **Soft Delete**: کاربران با تنظیم deleted_at حذف می‌شوند (soft delete)، نه حذف فیزیکی از دیتابیس.
10. **Audit Log**: تمام تغییرات مهم (ویرایش مبلغ، تغییر وضعیت، تأیید/رد رسید) در جدول sc_audit_logs ثبت می‌شود.

---

## 17. وضعیت فعلی و مسیر پیش رو

> **به‌روزرسانی (پس از اصلاح ۱۲)**: فهرست زیر منسوخ شده بود — همهٔ «بخش‌های شروع‌نشده» اکنون پیاده‌سازی شده‌اند.

- **چند درصد پروژه تکمیل شده**: همهٔ قابلیت‌های بخش ۱۱ پیاده‌سازی شده‌اند
- **کدام بخش‌ها کاملاً آماده استفاده هستند**:
  - احراز هویت (ورود، ثبت‌نام، فراموشی رمز — با CSRF روی `/auth/*` و بدون اسکن همهٔ کاربران)
  - پنل مدیریت (داشبورد، مدیریت کاربران، جزئیات مغازه، مدیریت رسیدها، **صفحه‌بندی**)
  - پنل مغازه‌دار (داشبورد، آپلود رسید، تاریخچه، بدهی‌ها، polling)
  - **نمودارهای حسابداری** (Pie + Line) ✅
  - **جستجوی پیشرفتهٔ تراکنش‌ها** ✅
  - **خروجی CSV** ✅
  - **صفحهٔ تنظیمات** (روز سررسید، مبلغ پیش‌فرض، Webhook، نگهداری داده) ✅
  - **API خارجی** با کلید هش‌شده و هدر `x-api-key` ✅
  - **Cron jobs** (تولید شارژ ماهانه، پاک‌سازی رسید، حذف مغازه‌های بایگانی) ✅
  - **سخت‌سازی امنیتی** (Helmet، Rate Limiting، CSRF، Error Handler مرکزی، هش کلید API، مدیریت Race) ✅
- **کدام بخش‌ها نیاز به تست مجدد دارند**:
  - استقرار واقعی روی HTTPS (کوکی `secure`، CSP بدون `unsafe-inline`)
- **کارهای باقی‌ماندهٔ واقعی** (جایگزین فهرست قبلی):
  1. **SMS Gateway واقعی** برای فراموشی رمز — اکنون کد فقط در لاگ محیط dev چاپ می‌شود (اصلاح ۱۰).
  2. **`secure: true` کوکی** و تست روی HTTPS در production.
  3. **سخت‌تر کردن CSP**: حذف `'unsafe-inline'` از `scriptSrc` و `scriptSrcAttr` (نیازمند حذف `onclick`های inline از قالب‌ها).
  4. **`seeds/seed.js`**: `db.sync({ force: true })` کل دیتابیس را پاک می‌کند و رمز ادمین را `123456` می‌گذارد — بهتر است فلگ تأیید بگیرد.
  5. **پاک‌سازی‌های جزئی**: حذف ستون باقی‌ماندهٔ `api_key` از `sc_shop_owners`، حذف ایندکس‌های UNIQUE تکراری `national_code_2`/`_3`، و حذف ~۳۰ فایل `*.log` ریشهٔ پروژه.
