# CityCenter — سامانه مدیریت شارژ پاساژ

> یک سیستم تحت وب برای مدیریت شارژ ماهانه مغازه‌های پاساژ سیتی سنتر چهارباغ

CityCenter یک سامانهٔ کامل برای مدیریت شارژ ماهانه مغازه‌های تجاری است. هر مغازه‌دار دارای پنل اختصاصی است که می‌تواند شارژ ماه جاری خود را مشاهده و پرداخت کند، تاریخچه تراکنش‌ها را ببیند، و رسید پرداخت را بارگذاری کند. مدیر پاساژ نیز از طریق پنل مدیریت می‌تواند کاربران را مدیریت کند، شارژها را تنظیم و تأیید کند، گزارش‌های مالی بگیرد، و کلیدهای API برای سیستم‌های خارجی بسازد.

---

## 📑 فهرست مطالب

- [ویژگی‌های اصلی](#ویژگیهای-اصلی)
- [پیش‌نیازها](#پیشنیازها)
- [نصب و راه‌اندازی سریع](#نصب-و-راهاندازی-سریع)
- [پیکربندی محیطی](#پیکربندی-محیطی)
- [اسکریپت‌های npm](#اسکریپتهای-npm)
- [ساختار پروژه](#ساختار-پروژه)
- [API Reference](#api-reference)
- [پنل مدیریت](#پنل-مدیریت)
- [پنل مغازه‌دار](#پنل-مغازهدار)
- [SMS Gateway](#sms-gateway)
- [امنیت](#امنیت)
- [استقرار در Production](#استقرار-در-production)
- [Cron Jobs](#cron-jobs)
- [Backup و Restore](#backup-و-restore)
- [عیب‌یابی](#عیبیابی)
- [مشارکت‌کنندگان](#مشارکتکنندگان)
- [مجوز](#مجوز)

---

## ✨ ویژگی‌های اصلی

- 🏪 **پنل اختصاصی مغازه‌دار** — مشاهده شارژ جاری، پرداخت آنلاین، تاریخچه تراکنش‌ها، آپلود رسید
- 👨‍💼 **پنل مدیریت جامع** — مدیریت کاربران، تنظیم شارژها، تأیید/رد رسیدها، گزارش‌های مالی
- 📊 **نمودارهای حسابداری** — Pie و Line Chart از وضعیت پرداخت‌ها
- 📱 **SMS Gateway** — ارسال کد بازیابی رمز از طریق کاوه‌نگار (با حالت mock برای توسعه)
- 🔌 **API خارجی** — دسترسی به داده‌ها با کلید API (هش SHA-256)
- ⏰ **Cron Jobs خودکار** — تولید شارژ ماهانه، پاک‌سازی رسیدهای قدیمی، آرشیو مغازه‌ها
- 🔒 **امنیت چندلایه** — CSP بدون `unsafe-inline`، CSRF، Rate Limiter، JWT
- 📤 **خروجی CSV** — از گزارش‌های حسابداری
- 🎨 **رابط کاربری مینیمال** — با پشتیبانی از حالت روشن/تیره

---

## 📋 پیش‌نیازها

| نرم‌افزار | نسخهٔ پیشنهادی | توضیح |
|-----------|---------------|-------|
| **Node.js** | 18+ (LTS 20 توصیه می‌شود) | محیط اجرای سرور |
| **MySQL** | 5.7+ یا MariaDB 10.4+ | پایگاه داده |
| **npm** | 9+ | مدیریت پکیج |
| **Nginx** (اختیاری) | آخرین نسخه | reverse proxy برای production |
| **PM2** (اختیاری) | آخرین نسخه | مدیریت پروسه در production |

---

## 🚀 نصب و راه‌اندازی سریع

### ۱. کلون کردن پروژه

```bash
git clone <repository-url>
cd citycenter
```

### ۲. نصب وابستگی‌ها

```bash
npm install
```

### ۳. پیکربندی محیطی

```bash
cp .env.example .env
```

سپس `.env` را با یک ویرایشگر باز کنید و مقادیر زیر را پر کنید:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `JWT_SECRET` — یک رشتهٔ تصادفی ۶۴ کاراکتری
- `ADMIN_PASS` — یک رمز قوی برای مدیر (حداقل ۱۲ کاراکتر)

### ۴. مقدار‌دهی اولیه دیتابیس

```bash
npm run seed
```

> ⚠️ **توجه:** دستور `npm run seed` داده‌های موجود را پاک نمی‌کند. برای ریست کامل از `npm run seed:force` استفاده کنید (خطرناک!).

### ۵. اجرای سرور

```bash
npm start
```

سرور روی `http://localhost:3514` بالا می‌آید.

### ۶. ورود اولیه

- **مدیر:** `http://localhost:3514/login` → تب «ورود مدیر» → `admin` + `ADMIN_PASS` از `.env`
- **مغازه‌دار دمو:** تب «ورود مغازه‌دار» → کد ملی `2` + رمز `2`

---

## ⚙️ پیکربندی محیطی

| متغیر | مقدار پیش‌فرض | توضیح | اجباری؟ |
|-------|---------------|-------|---------|
| `DB_HOST` | `localhost` | آدرس هاست MySQL | ✅ |
| `DB_PORT` | `3306` | پورت MySQL (XAMPP معمولاً 3306) | ✅ |
| `DB_USER` | `root` | کاربر دیتابیس | ✅ |
| `DB_PASS` | (خالی) | رمز دیتابیس | ❌ |
| `DB_NAME` | `shop_charge_db` | نام دیتابیس | ✅ |
| `PORT` | `3514` | پورت اجرای سرور | ✅ |
| `NODE_ENV` | `development` | محیط اجرا (`development` یا `production`) | ✅ |
| `JWT_SECRET` | (تصادفی ۶۴ کاراکتری) | کلید امضای توکن JWT | ✅ |
| `ADMIN_USER` | `admin` | نام کاربری مدیر | ✅ |
| `ADMIN_PASS` | (رمز قوی) | رمز مدیر | ✅ |
| `TRUST_PROXY` | `1` | تعداد پروکسی‌های جلو سرور | ❌ |
| `SMS_PROVIDER` | `mock` | `mock` یا `kavenegar` | ❌ |
| `SMS_API_KEY` | (خالی) | API Key کاوه‌نگار | ❌ (در mock) |
| `SMS_SENDER` | (خالی) | خط فرستنده SMS | ❌ (در mock) |
| `MYSQLDUMP_PATH` | `mysqldump` (از PATH) | مسیر کامل `mysqldump` | ❌ |
| `MYSQL_PATH` | `mysql` (از PATH) | مسیر کامل `mysql` (برای restore) | ❌ |
| `BACKUP_DIR` | `./backups` | پوشه ذخیره بکاپ | ❌ |
| `BACKUP_RETENTION_DAYS` | `30` | تعداد روزهای نگهداری بکاپ | ❌ |

> ⚠️ **نکته امنیتی:** اگر مقدار `ADMIN_PASS` شامل کاراکتر `#` است، باید داخل `""` قرار گیرد: `ADMIN_PASS="my#pass"`.

### تنظیمات SMS

پروژه از دو حالت برای ارسال SMS پشتیبانی می‌کند:

| حالت | `SMS_PROVIDER` | توضیح |
|------|---------------|-------|
| **Mock** | `mock` | SMS واقعی ارسال نمی‌شود. کد در `logs/combined.log` چاپ می‌شود. **برای development** |
| **Kavenegar** | `kavenegar` | SMS واقعی از طریق API کاوه‌نگار. نیازمند `SMS_API_KEY` و `SMS_SENDER`. **برای production** |

برای جزئیات بیشتر به بخش [SMS Gateway](#sms-gateway) مراجعه کنید.

---

## 📜 اسکریپت‌های npm

| اسکریپت | دستور | توضیح |
|---------|-------|-------|
| `npm start` | `node server.js` | اجرای سرور در حالت production |
| `npm run seed` | `node seeds/seed.js` | ایجاد داده‌های اولیه (ایمن، بدون پاک‌سازی) |
| `npm run seed:force` | `node seeds/seed.js --force` | ریست کامل دیتابیس ⚠️ |
| `npm test` | `echo "Error: no test specified" && exit 1` | (هنوز پیاده‌سازی نشده) |

---

## 📁 ساختار پروژه

```
citycenter/
├── server.js                  # نقطه ورود، میدل‌ورها، mount routeها
├── package.json               # وابستگی‌ها و اسکریپت‌ها
├── .env.example               # نمونهٔ متغیرهای محیطی
│
├── controllers/               # منطق بیزینس
│   ├── authController.js      # ورود، ثبت‌نام، بازیابی رمز
│   ├── adminController.js     # پنل مدیریت
│   └── shopController.js      # پنل مغازه‌دار
│
├── routes/                    # تعریف مسیرها
│   ├── auth.js                # /auth
│   ├── admin.js               # /admin
│   ├── shop.js                # /shop
│   └── external.js            # /api/external
│
├── models/                    # مدل‌های Sequelize
│   ├── index.js               # تعریف روابط
│   ├── ShopOwner.js           # مغازه‌دار/مدیر
│   ├── MonthlyCharge.js       # شارژ ماهانه
│   ├── Receipt.js             # رسید پرداخت
│   ├── Setting.js             # تنظیمات
│   ├── AuditLog.js            # لاگ حسابرسی
│   └── ApiKey.js              # کلید API
│
├── middleware/                # میدل‌ورها
│   ├── authenticate.js        # احراز هویت JWT
│   ├── authorize.js           # مجوزدهی بر اساس نقش
│   ├── validateApiKey.js      # احراز API Key
│   └── forgotPasswordLimiter.js # Rate Limiter اختصاصی
│
├── views/                     # قالب‌های EJS
│   ├── login.ejs              # صفحهٔ ورود
│   ├── admin/                 # صفحات پنل مدیریت
│   └── shop/                  # صفحات پنل مغازه‌دار
│
├── public/                    # فایل‌های استاتیک
│   ├── css/style.css          # تمام استایل‌ها (CSP-compliant)
│   ├── js/main.js             # منطق سمت کلاینت
│   └── uploads/               # رسیدهای آپلود‌شده
│
├── utils/                     # ابزارهای کمکی
│   ├── db.js                  # اتصال Sequelize
│   ├── logger.js              # لاگ Winston
│   ├── smsService.js          # سرویس SMS
│   └── migrations.js          # migrations idempotent
│
├── cron/                      # وظایف زمان‌بندی‌شده
│   └── jobs.js                # ۳ وظیفه
│
├── seeds/                     # داده‌های اولیه
│   └── seed.js                # اسکریپت seed
│
├── scripts/                   # اسکریپت‌های کاربردی
│   └── run-migration.js       # اجرای دستی migration
│
└── logs/                      # فایل‌های لاگ (Winston)
    ├── combined.log
    └── error.log
```

---

## 🔌 API Reference

### احراز هویت (`/auth`)

| متد | مسیر | توضیح | احراز |
|-----|------|-------|-------|
| POST | `/auth/admin/login` | ورود مدیر | ❌ |
| POST | `/auth/shop/login` | ورود مغازه‌دار | ❌ |
| POST | `/auth/shop/register` | ثبت‌نام مغازه‌دار جدید | ❌ |
| POST | `/auth/shop/forgot-password` | درخواست کد بازیابی | ❌ |
| POST | `/auth/shop/reset-password` | تغییر رمز با کد | ❌ |
| POST | `/auth/logout` | خروج | ✅ |

### پنل مدیریت (`/admin`) — نیازمند نقش `admin`

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/admin/dashboard` | داشبورد با خلاصه مالی |
| GET | `/admin/users` | لیست کاربران |
| POST | `/admin/users` | افزودن کاربر |
| PUT | `/admin/users/:id` | ویرایش کاربر |
| DELETE | `/admin/users/:id` | حذف (soft delete) |
| PUT | `/admin/users/:id/approve` | تأیید کاربر |
| GET | `/admin/shop/:id` | جزئیات مغازه |
| PUT | `/admin/charges/:id/amount` | ویرایش مبلغ شارژ |
| PUT | `/admin/charges/:id/status` | تغییر وضعیت |
| PUT | `/admin/charges/:id/approve` | تأیید رسید |
| PUT | `/admin/charges/:id/reject` | رد رسید |
| GET | `/admin/receipts/:shopId/:chargeId` | مشاهده رسید |
| GET | `/admin/accounting` | گزارش‌های مالی |
| GET | `/admin/settings` | صفحهٔ تنظیمات |
| POST | `/admin/api/api-keys` | ساخت API Key |

### پنل مغازه‌دار (`/shop`) — نیازمند نقش `shop_owner`

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/shop/dashboard` | شارژ جاری + تاریخچه |
| POST | `/shop/upload-receipt` | آپلود رسید |
| GET | `/shop/charge-status` | وضعیت شارژ (برای polling) |

### API خارجی (`/api/external`) — نیازمند هدر `x-api-key`

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/api/external/shops` | لیست مغازه‌های فعال |
| GET | `/api/external/charges?shop_id=...` | شارژهای یک مغازه |

> ⚠️ **نکته امنیتی:** API Key **فقط** از هدر `x-api-key` پذیرفته می‌شود. ارسال در query string (مثل `?api_key=...`) رد می‌شود تا کلید در access log یا Referer هدر ثبت نشود.

---

## 👨‍💼 پنل مدیریت

پنل مدیریت از طریق `/admin/*` قابل دسترسی است و نیازمند نقش `admin` است.

| صفحه | مسیر | توضیح |
|------|------|-------|
| **داشبورد** | `/admin/dashboard` | خلاصه مالی، لیست مغازه‌ها، فیلتر و جستجو، صفحه‌بندی |
| **کاربران** | `/admin/users` | مدیریت کاربران: تأیید، ویرایش، حذف (soft delete)، افزودن |
| **حسابداری** | `/admin/accounting` | نمودار Pie + Line، جدول تراکنش‌ها، فیلتر تاریخ، خروجی CSV |
| **تنظیمات** | `/admin/settings` | روز سررسید، مبلغ پیش‌فرض، URL وب‌هوک، مدیریت API Keys |
| **جزئیات مغازه** | `/admin/shop/:id` | تاریخچه شارژها، ویرایش مبلغ، تغییر وضعیت، مشاهده/تأیید/رد رسید |
| **API Keys** | `/admin/settings` | ساخت، لیست، حذف کلیدهای API خارجی |

---

## 🏪 پنل مغازه‌دار

پنل مغازه‌دار از طریق `/shop/*` قابل دسترسی است و نیازمند نقش `shop_owner` است.

| صفحه/عملکرد | مسیر | توضیح |
|--------------|------|-------|
| **داشبورد** | `/shop/dashboard` | شارژ جاری، تاریخچه تراکنش‌ها، بدهی‌های معوق |
| **آپلود رسید** | `/shop/upload-receipt` | آپلود تصویر رسید (فرم multipart/form-data) |
| **وضعیت شارژ** | `/shop/charge-status` | دریافت وضعیت جاری برای polling خودکار |

### جریان کار مغازه‌دار

1. ورود با کد ملی و رمز عبور
2. مشاهده شارژ ماه جاری (وضعیت `unpaid`، `pending`، یا `paid`)
3. اگر `unpaid`: پرداخت آنلاین یا آپلود رسید
4. اگر رسید آپلود شد: وضعیت `pending` تا تأیید مدیر
5. مدیر تأیید یا رد می‌کند
6. مغازه‌دار نتیجه را در پنل خود می‌بیند (با polling خودکار)

---

## 📱 SMS Gateway

سامانه از دو حالت برای ارسال SMS استفاده می‌کند که با `SMS_PROVIDER` در `.env` تعیین می‌شود:

| حالت | `SMS_PROVIDER` | نیازمندی |
|------|---------------|----------|
| **Mock** | `mock` | هیچ (برای development) |
| **Kavenegar** | `kavenegar` | `SMS_API_KEY` + `SMS_SENDER` |

### حالت Mock (Development)

در این حالت SMS واقعی ارسال نمی‌شود. کد بازیابی در `logs/combined.log` چاپ می‌شود:

```
[SMS:mock] would send to 09121111111: 123456
[ForgotPassword][DEV] Reset code for 09121111111: 123456
```

### حالت Kavenegar (Production)

#### ۱. دریافت API Key
- در [kavenegar.com](https://kavenegar.com) ثبت‌نام کنید
- از پنل کاربری، API Key بگیرید

#### ۲. تنظیم `.env`
```env
SMS_PROVIDER=kavenegar
SMS_API_KEY=<your_api_key>
SMS_SENDER=<your_line_number>
```

#### ۳. تست
```bash
node -e "require('dotenv').config(); require('./utils/smsService').sendOtp('09123456789', '123456').then(console.log);"
```

### Rate Limiting
endpoint `/auth/shop/forgot-password` محدود شده است به:
- **۵ درخواست در ۱۵ دقیقه** بر اساس ترکیب `IP::phone`
- درخواست‌های بیشتر: پاسخ **۴۲۹ Too Many Requests**

### امنیت
- API Key هرگز در لاگ چاپ نمی‌شود
- خطاهای SMS به کاربر نمایش داده نمی‌شوند (پاسخ generic)
- خطای SMS باعث شکست پاسخ به کاربر نمی‌شود (fail-safe)

---

## 🔒 امنیت

پروژه از چندین لایه امنیتی استفاده می‌کند:

### احراز هویت و مجوزدهی
- **JWT** برای توکن‌های نشست
- کوکی `token` با ویژگی‌های `HttpOnly`, `SameSite=Strict`, `Secure` (در production)
- میدل‌ور `authenticate` برای تأیید توکن
- میدل‌ور `authorize` برای مجوزدهی بر اساس نقش (`admin` / `shop_owner`)

### CSRF
- محافظت **روی همهٔ مسیرها** از جمله `/auth/*` (برای جلوگیری از Login-CSRF)
- فیلد مخفی `_csrf` در همه فرم‌ها
- هدر `X-CSRF-Token` در همه درخواست‌های AJAX
- توکن از طریق `res.locals.csrfToken` به viewها پاس می‌شود

### Content Security Policy (CSP)
- **بدون `'unsafe-inline'`** در `scriptSrc` و `styleSrc`
- `scriptSrc` با **nonce** برای هر درخواست
- `scriptSrcAttr: 'none'` — هیچ `onclick` inline مجاز نیست
- همه استایل‌ها در `/css/style.css`
- منابع مجاز: `'self'` + `cdn.jsdelivr.net`

### Rate Limiting
| Limiter | محدودیت | اعمال روی |
|---------|---------|----------|
| **Global** | ۲۰۰ درخواست / ۱۵ دقیقه | همه مسیرها |
| **Auth** | ۱۰ درخواست / ۱۵ دقیقه | `/auth/*` |
| **Forgot Password** | ۵ درخواست / ۱۵ دقیقه | `/auth/shop/forgot-password` |
| **Upload** | محدود | `/shop/upload-receipt` |
| **Admin API** | محدود | `/admin/api/*` |

### Helmet
- تنظیم `helmet` با CSP سفارشی
- هدرهای امنیتی استاندارد فعال

### Input Validation
- `express-validator` روی همه ورودی‌ها
- اعتبارسنجی کد ملی، شماره تلفن، طول فیلدها

### SQL Injection
- استفاده از **Sequelize ORM** (بدون raw query)
- پارامترهای Prepared Statement

### XSS
- **Escape کامل** در EJS با `<%= %>` (نه `<%- %>`)
- **Escape دستی** در JS templates با `escapeHtml()` (در `admin/users.ejs` و `admin/accounting.ejs`)

### API Key
- ذخیره‌سازی **فقط هش SHA-256** (کلید خام فقط یک بار نمایش داده می‌شود)
- پذیرش **فقط از هدر `x-api-key`** (نه query string)
- بررسی `last_used_at` و `expires_at`

### Race Conditions
- **`national_code`**: مدیریت `SequelizeUniqueConstraintError` → پاسخ ۴۰۰
- **آپلود رسید**: `Transaction` + `LOCK.UPDATE` + `unique` constraint روی `charge_id`
- **approve/reject**: `Transaction` + `LOCK.UPDATE`

### Migration امن
- تابع `ensureColumnLengths` — همگام‌سازی طول ستون
- تابع `dropDeadColumns` — حذف ستون‌های مرده
- تابع `dropDuplicateIndexes` — حذف ایندکس‌های تکراری
- همه Idempotent و در startup اجرا می‌شوند

---

## 🚢 استقرار در Production

### ۱. پیکربندی محیطی

در `.env`:
```env
NODE_ENV=production
TRUST_PROXY=1
SMS_PROVIDER=kavenegar
SMS_API_KEY=<real_key>
SMS_SENDER=<real_line>
```

### ۲. کوکی امن و HTTPS

- `secure: process.env.NODE_ENV === 'production'` روی کوکی (تأیید شده)
- `app.set('trust proxy', process.env.TRUST_PROXY || 1)` برای تشخیص HTTPS پشت پروکسی
- **حتماً روی HTTPS اجرا شود** (کوکی `Secure` بدون HTTPS کار نمی‌کند)

### ۳. اجرای سرور با PM2

```bash
npm install -g pm2
pm2 start server.js --name citycenter
pm2 save
pm2 startup
```

### ۴. Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3514;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **⚠️ نکته مهم:** هدر `X-Forwarded-Proto` باید توسط Nginx ست شود تا Express بداند اتصال HTTPS است و کوکی `Secure` را ست کند.

### ۵. SSL با Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
```

### ۶. Backup خودکار دیتابیس

```bash
# در crontab سرور
0 3 * * * mysqldump -u root shop_charge_db | gzip > /backup/citycenter-$(date +\%Y\%m\%d).sql.gz
```

### ۷. بررسی‌های پس از استقرار

- [ ] سرور بدون خطا بالا می‌آید
- [ ] migration‌ها اجرا می‌شوند
- [ ] کوکی `Secure` در HTTPS ست می‌شود
- [ ] ورود با `admin` + `ADMIN_PASS` کار می‌کند
- [ ] همه صفحات در مرورگر باز می‌شوند
- [ ] هیچ خطای CSP در Console نیست

---

## ⏰ Cron Jobs

پروژه از `node-cron` برای اجرای وظایف زمان‌بندی‌شده استفاده می‌کند. همه وظایف در `cron/jobs.js` تعریف شده‌اند.

| وظیفه | زمان | توضیح |
|-------|------|-------|
| **تولید شارژهای ماهانه** | روزانه ۰۰:۳۰ | اگر تاریخ امروز با `due_day` (مثلاً ۲۵) برابر باشد، شارژ ماه بعد برای همه مغازه‌ها ساخته می‌شود. Idempotent: از `findOrCreate` استفاده می‌کند. |
| **پاک‌سازی رسیدهای قدیمی** | ماهانه ۰۲:۰۰ | رسیدهایی که قدیمی‌تر از `image_retention_months` (پیش‌فرض ۲۴ ماه) هستند، حذف می‌شوند. |
| **پاک‌سازی مغازه‌های آرشیو** | ماهانه ۰۳:۰۰ | مغازه‌هایی که `deleted_at` آن‌ها قدیمی‌تر از `data_retention_months` (پیش‌فرض ۲۴ ماه) است، با ترتیب صحیح (Receipt → MonthlyCharge → ShopOwner) و در یک Transaction حذف می‌شوند. |
| **بکاپ دیتابیس** | روزانه ۰۴:۰۰ | اجرای `scripts/backup-db.js` در child process جداگانه؛ فشرده‌سازی gzip و retention خودکار. |

### اجرای دستی یک وظیفه (برای تست)

```bash
node -e "require('./cron/jobs').purgeArchivedShops()"
node -e "require('./cron/jobs').runBackupJob()"
```

### راه‌اندازی Cron در startup

سرور در `server.js` با `require('./cron/jobs').init()` وظایف را فعال می‌کند.

---

## 💾 Backup و Restore

سامانه شامل دو اسکریپت برای مدیریت بکاپ دیتابیس است:

| اسکریپت | کاربرد |
|---------|--------|
| `scripts/backup-db.js` | بکاپ فشرده (`.sql.gz`) از دیتابیس |
| `scripts/restore-db.js` | بازیابی دیتابیس از یک بکاپ |

### بکاپ دستی

```bash
# ویندوز (XAMPP):
set MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe
node scripts/backup-db.js

# لینوکس (با MySQL در PATH):
node scripts/backup-db.js
```

فایل بکاپ در `backups/backup-YYYYMMDD-HHMMSS.sql.gz` ذخیره می‌شود.

**امکانات:**
- **رمز در command line نمایش داده نمی‌شود** (استفاده از `--defaults-extra-file`)
- **Compression با gzip** (سطح ۹ — حداکثر فشرده‌سازی)
- **Retention خودکار:** فایل‌های قدیمی‌تر از `BACKUP_RETENTION_DAYS` (پیش‌فرض ۳۰) حذف می‌شوند

### بکاپ خودکار (Cron)

Cron job روزانه **ساعت ۰۴:۰۰** (به وقت تهران) یک بکاپ خودکار می‌گیرد.

برای اجرای دستی cron job بدون انتظار:
```bash
node -e "require('./cron/jobs').runBackupJob()"
```

### بازیابی از بکاپ

```bash
# ویندوز (XAMPP):
set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
node scripts/restore-db.js backups\backup-YYYYMMDD-HHMMSS.sql.gz

# لینوکس:
node scripts/restore-db.js backups/backup-YYYYMMDD-HHMMSS.sql.gz
```

**⚠️ هشدار:** این عملیات **دیتابیس فعلی را بازنویسی می‌کند**.

**محافظت‌های ایمنی:**
- درخواست تأیید تعاملی (`Type "yes" to proceed:`) — برای رد کردن: `--yes`
- **بکاپ ایمنی خودکار** از دیتابیس فعلی قبل از restore — برای رد کردن: `--no-safety-backup`
- رمز در command line نمایش داده نمی‌شود

### تنظیمات محیطی

| متغیر | پیش‌فرض | توضیح |
|-------|---------|-------|
| `MYSQLDUMP_PATH` | `mysqldump` (از PATH) | مسیر کامل `mysqldump` |
| `MYSQL_PATH` | `mysql` (از PATH) | مسیر کامل `mysql` (برای restore) |
| `BACKUP_DIR` | `./backups` | پوشه ذخیره بکاپ |
| `BACKUP_RETENTION_DAYS` | `30` | تعداد روزهای نگهداری بکاپ |

---

## 🐛 عیب‌یابی

### خطاهای رایج

#### ۱. `DB startup check failed` یا `ECONNREFUSED`
**علت:** MySQL روشن نیست یا پورت اشتباه است.
**راه‌حل:**
- MySQL را روشن کنید (`XAMPP Control Panel` یا `net start mysql`)
- با `netstat -ano | findstr 3306` بررسی کنید کدام پورت فعال است
- مقدار `DB_PORT` را در `.env` با پورت واقعی هماهنگ کنید (معمولاً `3306`)

#### ۲. `invalid csrf token`
**علت:** توکن CSRF در فرم یا هدر ارسال نشده.
**راه‌حل:**
- مطمئن شوید مرورگر کوکی `_csrf` را نگه می‌دارد
- `document.cookie` را در F12 چک کنید (نباید `token` باشد، ولی `_csrf` باید باشد)
- اگر از `curl` استفاده می‌کنید، باید ابتدا از `/login` توکن را بگیرید

#### ۳. کوکی در Production ست نمی‌شود
**علت:** `Secure` کوکی نیاز به HTTPS دارد.
**راه‌حل:**
- مطمئن شوید `NODE_ENV=production` است
- هدر `X-Forwarded-Proto: https` توسط Nginx ست می‌شود
- `trust proxy` در `server.js` فعال است

#### ۴. `Data too long for column 'shop_name'`
**علت:** طول نام مغازه از ستون DB بیشتر است.
**راه‌حل:**
- Migration در startup خودکار آن را اصلاح می‌کند
- اگر مشکل ادامه دارد: `node scripts/run-migration.js`

#### ۵. `Refused to apply inline style` (CSP)
**علت:** یک `style="..."` inline در HTML باقی مانده.
**راه‌حل:**
- `grep -rn 'style="' views/ --include="*.ejs"` — باید صفر باشد
- اگر خروجی داشت، کلاس CSS جایگزین کنید

#### ۶. پیامک در Development ارسال نمی‌شود
**علت:** `SMS_PROVIDER=mock` است.
**راه‌حل:**
- این رفتار مورد انتظار است. کد بازیابی در `logs/combined.log` چاپ می‌شود
- برای ارسال واقعی، `SMS_PROVIDER=kavenegar` + `SMS_API_KEY` تنظیم کنید

### بررسی لاگ‌ها
```bash
tail -50 logs/combined.log
tail -50 logs/error.log
```

### بررسی پورت‌های فعال
```bash
netstat -ano | findstr 3514
netstat -ano | findstr 3306
```

---

## 👥 مشارکت‌کنندگان

- **توسعه‌دهنده:** (نام و ایمیل خود را اینجا وارد کنید)
- **مخزن:** (لینک GitHub/GitLab/Bitbucket)

> برای مشارکت، لطفاً یک Issue باز کنید یا Pull Request ارسال کنید.

## 📄 مجوز

این پروژه تحت مجوز **ISC** منتشر شده است. جزئیات را در `package.json` ببینید.
