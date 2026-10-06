# راهنمای استقرار CityCenter

این سند سه سناریوی استقرار را توضیح می‌دهد:

| سناریو | مناسب برای | پیچیدگی |
|--------|-----------|---------|
| [۱. Docker + Nginx](#۱-استقرار-با-docker-توصیهشده) | بیشتر پروژه‌های production | متوسط |
| [۲. PM2 (بدون Docker)](#۲-استقرار-با-pm2-بدون-docker) | سرور اختصاصی با دسترسی root | متوسط |
| [۳. Bare-metal](#۳-استقرار-bare-metal-سادهترین) | تست سریع یا سرور کوچک | ساده |

---

## پیش‌نیازهای مشترک

### ۱. سرور
- **سیستم‌عامل:** Ubuntu 22.04 LTS (توصیه‌شده) یا Debian 12
- **CPU:** حداقل ۱ هسته
- **RAM:** حداقل ۱ گیگابایت (۲ گیگ توصیه)
- **دیسک:** حداقل ۱۰ گیگابایت

### ۲. دامنه
- دامنه‌ای که به IP سرور اشاره می‌کند (رکورد `A`)
- برای SSL: دسترسی به پورت‌های ۸۰ و ۴۴۳

### ۳. اطلاعات مورد نیاز
- رمز قوی برای `ADMIN_PASS` (حداقل ۱۲ کاراکتر)
- `JWT_SECRET` تصادفی ۶۴ کاراکتری
- رمز قوی برای MySQL

### ۴. تولید `JWT_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ۵. تولید رمز قوی

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

---

## ۱. استقرار با Docker (توصیه‌شده)

### ۱.۱. نصب Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### ۱.۲. نصب Docker Compose V2

معمولاً همراه با Docker نصب می‌شود. بررسی:

```bash
docker compose version
```

### ۱.۳. دریافت کد پروژه

```bash
cd /opt
sudo git clone <repository-url> citycenter
sudo chown -R $USER:$USER citycenter
cd citycenter
```

### ۱.۴. پیکربندی `.env`

```bash
cp .env.example .env
nano .env
```

مقادیر زیر را پر کنید:

```env
# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=citycenter
DB_PASS=<رمز قوی برای کاربر اپلیکیشن>
DB_NAME=shop_charge_db
DB_ROOT_PASS=<رمز بسیار قوی برای root MySQL>

# Server
PORT=3514
NODE_ENV=production

# Security
JWT_SECRET=<۶۴ کاراکتر تصادفی>
ADMIN_USER=admin
ADMIN_PASS=<رمز قوی حداقل ۱۲ کاراکتر>

# Trust proxy
TRUST_PROXY=1

# SMS (اختیاری — برای production)
SMS_PROVIDER=kavenegar
SMS_API_KEY=<کلید کاوه‌نگار>
SMS_SENDER=<خط فرستنده>
```

> ⚠️ **مهم:** `DB_HOST` را در `.env` روی `mysql` بگذارید (نام سرویس در compose). `docker-compose.yml` این مقدار را override می‌کند، اما برای سازگاری بهتر همین‌جا درست بنویسید.

### ۱.۵. آماده‌سازی پوشه‌های Volume

```bash
mkdir -p public/uploads/originals public/uploads/compressed
mkdir -p logs
mkdir -p certbot/conf certbot/www
chmod 755 public/uploads logs certbot
```

### ۱.۶. ساخت و اجرای سرویس‌ها

```bash
docker compose build
docker compose up -d
```

### ۱.۷. بررسی وضعیت

```bash
docker compose ps
docker compose logs -f app
```

انتظار: هر سه سرویس (`mysql`, `app`, `nginx`) در وضعیت `running` یا `healthy`.

### ۱.۸. مقدار‌دهی اولیه دیتابیس

```bash
docker compose exec app npm run seed
```

> ⚠️ این کار **فقط بار اول** لازم است. برای ریست کامل: `docker compose exec app npm run seed:force` (خطرناک!).

### ۱.۹. تنظیم SSL با Let's Encrypt

**روش ۱: certbot روی هاست (ساده‌تر)**

```bash
sudo apt install certbot
sudo certbot certonly --webroot \
  -w /opt/citycenter/certbot/www \
  -d your-domain.com \
  --email your-email@example.com \
  --agree-tos --non-interactive
```

سپس `nginx.conf` را با مسیرهای واقعی گواهی به‌روزرسانی کنید:

```nginx
ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

و container nginx را ری‌استارت کنید:

```bash
docker compose restart nginx
```

**روش ۲: container certbot (پیشرفته‌تر)**

مثلاً با `certbot/certbot` image در کنار compose. جزئیات در مستندات رسمی certbot.

### ۱.۱۰. تنظیم تمدید خودکار SSL

```bash
# روی هاست
sudo crontab -e
```

خط زیر را اضافه کنید:

```
0 3 * * * certbot renew --quiet && docker compose -f /opt/citycenter/docker-compose.yml restart nginx
```

### ۱.۱۱. Backup خودکار دیتابیس

سامانه **دو مکانیزم** برای بکاپ دارد:

#### روش ۱: Cron داخلی پروژه (پیشنهادی)

پروژه خودش یک Cron job روزانه ساعت ۰۴:۰۰ دارد که با استفاده از `mysqldump` داخل container بکاپ می‌گیرد.

**فقط کافی است `.env` را تنظیم کنی:**

```env
# ویندوز — خارج از Docker:
MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe
MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe

# لینوکس + Docker (داخل container، mysqldump از PATH استفاده می‌شود):
MYSQLDUMP_PATH=
MYSQL_PATH=
BACKUP_RETENTION_DAYS=30
```

**در docker-compose، پوشهٔ `backups/` را به‌عنوان volume اضافه کن** (اگر هنوز نیست):

```yaml
  app:
    # ...
    volumes:
      - ./public/uploads:/app/public/uploads
      - ./logs:/app/logs
      - ./backups:/app/backups   # ← اضافه کن
```

**اجرای دستی برای تست:**

```bash
docker compose exec app node scripts/backup-db.js
```

**مشاهده بکاپ‌ها روی هاست:**

```bash
ls -lh backups/
# backup-20261006-040000.sql.gz
# backup-20261005-040000.sql.gz
```

#### روش ۲: Cron سیستم (جایگزین)

اگر نمی‌خواهی از Cron داخلی پروژه استفاده کنی:

```bash
sudo crontab -e
```

خط زیر را اضافه کن (ساعت ۰۴:۰۰ روزانه):

```
0 4 * * * docker compose -f /opt/citycenter/docker-compose.yml exec -T app node scripts/backup-db.js
```

**⚠️ نکته:** هر دو روش را **همزمان اجرا نکن** — بکاپ‌ها duplicate می‌شوند.

#### بازیابی از بکاپ

```bash
# ۱. کپی فایل بکاپ به داخل container
docker compose cp backups/backup-20261006-040000.sql.gz app:/tmp/

# ۲. اجرای restore
docker compose exec app node scripts/restore-db.js /tmp/backup-20261006-040000.sql.gz
```

اسکریپت به‌طور خودکار:
- تأیید تعاملی می‌گیرد (مگر `--yes`)
- یک بکاپ ایمنی از دیتابیس فعلی می‌گیرد (مگر `--no-safety-backup`)
- دیتابیس را بازیابی می‌کند

#### بهترین شیوه‌ها

- **فایل‌های بکاپ را از سرور خارج کن** (به S3، Backblaze، یا سرور دیگر). اگر سرور خراب شود، بکاپ روی همان سرور از دست می‌رود.
- **بکاپ‌ها را رمزنگاری کن** اگر شامل داده حساس هستند (مثلاً با `gpg` یا `age`).
- **بازیابی را تست کن** (حداقل ماهانه) — بکاپ بدون تست، اطمینان نمی‌دهد.

### ۱.۱۲. بررسی نهایی

- [ ] `https://your-domain.com` در مرورگر باز می‌شود
- [ ] با `admin` + `ADMIN_PASS` وارد می‌شوید
- [ ] کوکی `token` در F12 → Application → Cookies دارای `Secure` است
- [ ] F12 → Console هیچ خطای CSP ندارد
- [ ] نمودارهای `/admin/accounting` بارگذاری می‌شوند
- [ ] پیامک بازیابی رمز ارسال می‌شود (اگر `kavenegar` فعال است)

---

## ۲. استقرار با PM2 (بدون Docker)

### ۲.۱. نصب Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # باید v20.x.x باشد
```

### ۲.۲. نصب MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

ساخت دیتابیس و کاربر:

```sql
CREATE DATABASE shop_charge_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'citycenter'@'localhost' IDENTIFIED BY '<رمز قوی>';
GRANT ALL PRIVILEGES ON shop_charge_db.* TO 'citycenter'@'localhost';
FLUSH PRIVILEGES;
```

### ۲.۳. دریافت کد پروژه

```bash
cd /opt
sudo git clone <repository-url> citycenter
sudo chown -R $USER:$USER citycenter
cd citycenter
```

### ۲.۴. نصب وابستگی‌ها

```bash
npm ci --omit=dev
```

### ۲.۵. پیکربندی `.env`

```bash
cp .env.example .env
nano .env
```

مقادیر زیر را پر کنید:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=citycenter
DB_PASS=<رمز قوی>
DB_NAME=shop_charge_db

PORT=3514
NODE_ENV=production

JWT_SECRET=<۶۴ کاراکتر تصادفی>
ADMIN_USER=admin
ADMIN_PASS=<رمز قوی حداقل ۱۲ کاراکتر>

TRUST_PROXY=1
```

### ۲.۶. مقدار‌دهی اولیه

```bash
npm run seed
```

### ۲.۷. نصب PM2

```bash
sudo npm install -g pm2
```

### ۲.۸. اجرای پروژه با PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

دستور آخر یک خط به شما می‌دهد؛ آن را با `sudo` اجرا کنید.

### ۲.۹. تنظیم Nginx به‌عنوان reverse proxy

**روی هاست (خارج از Docker):**

```bash
sudo apt install -y nginx
sudo cp nginx.conf /etc/nginx/sites-available/citycenter
```

`nginx.conf` را طوری تغییر دهید که `upstream` از `app:3514` به `127.0.0.1:3514` تغییر کند:

```nginx
upstream citycenter_app {
    server 127.0.0.1:3514;
    keepalive 32;
}
```

فعال‌سازی:

```bash
sudo ln -s /etc/nginx/sites-available/citycenter /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### ۲.۱۰. SSL با certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### ۲.۱۱. تمدید خودکار SSL

certbot به‌طور خودکار یک timer systemd اضافه می‌کند. بررسی:

```bash
sudo systemctl status certbot.timer
```

### ۲.۱۲. بررسی نهایی

- [ ] `pm2 status` نشان می‌دهد `citycenter` در وضعیت `online`
- [ ] `https://your-domain.com` باز می‌شود
- [ ] کوکی `Secure` در production فعال است

---

## ۳. استقرار Bare-metal (ساده‌ترین)

برای تست یا سرورهای کوچک. **بدون PM2، بدون Nginx، بدون Docker.**

### ۳.۱. نصب پیش‌نیازها

مثل PM2 (Node.js + MySQL).

### ۳.۲. دریافت کد و نصب وابستگی‌ها

```bash
git clone <repository-url>
cd citycenter
npm ci --omit=dev
cp .env.example .env
# ویرایش .env
npm run seed
```

### ۳.۳. اجرای سرور

```bash
node server.js
```

برای اجرای مداوم در ترمینال بسته، از `screen` یا `tmux` استفاده کنید:

```bash
screen -S citycenter
node server.js
# Ctrl+A then D برای detached
```

**⚠️ برای production، PM2 یا Docker توصیه می‌شود.**

---

## مقایسه سریع سه سناریو

| ویژگی | Docker | PM2 | Bare-metal |
|-------|--------|-----|-----------|
| جداسازی | ✅ کامل | ❌ | ❌ |
| مدیریت پروسه | Docker daemon | PM2 | screen/tmux |
| SSL | nginx container | nginx هاست | (بدون) |
| Backup | volume + cron | mysqldump | mysqldump |
| پیچیدگی | متوسط | متوسط | ساده |
| مناسب برای | production | production | تست |

---

## عیب‌یابی

### ۱. `docker compose up` با خطای پورت
```
Error: port 80 is already in use
```
**راه‌حل:** سرویس دیگری از پورت ۸۰ استفاده می‌کند (Apache، nginx هاست). آن را متوقف کنید.

### ۲. کوکی `Secure` ست نمی‌شود
**علت:** `X-Forwarded-Proto` به Express نرسیده.
**راه‌حل:**
- بررسی کنید `nginx.conf` خط `proxy_set_header X-Forwarded-Proto $scheme;` دارد
- `TRUST_PROXY=1` در `.env` تنظیم باشد
- `NODE_ENV=production` باشد

### ۳. app healthy نمی‌شود
```bash
docker compose logs app
```
معمولاً مشکل اتصال به MySQL. بررسی کنید `DB_HOST=mysql` و `DB_PORT=3306` باشد.

### ۴. `docker compose exec app npm run seed` خطا می‌دهد
**علت:** MySQL هنوز آماده نیست.
**راه‌حل:** `docker compose logs mysql` را ببینید. صبر کنید تا `ready for connections` چاپ شود.

### ۵. SSL errors
- پورت‌های ۸۰ و ۴۴۳ باز باشند (`ufw status`)
- دامنه به IP سرور اشاره کند (`dig your-domain.com`)
- گواهی معتبر باشد (`certbot certificates`)

### ۶. rate limit در nginx (اختیاری)
اگر می‌خواهید rate limit هم در nginx اضافه کنید، به مستندات رسمی nginx مراجعه کنید. برنامه خودش Rate Limiter دارد.

---

## پس از استقرار — چک‌لیست

### امنیت
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` تصادفی و طولانی
- [ ] `ADMIN_PASS` قوی (حداقل ۱۲ کاراکتر)
- [ ] SSL معتبر (بدون warning در مرورگر)
- [ ] کوکی `Secure` + `HttpOnly` + `SameSite=Strict`
- [ ] فایروال فعال (پورت‌های ۲۲، ۸۰، ۴۴۳)
- [ ] MySQL فقط از داخل (نه از بیرون)
- [ ] `SMS_PROVIDER=kavenegar` (نه mock)

### عملکرد
- [ ] Backup خودکار روزانه
- [ ] تمدید خودکار SSL
- [ ] مانیتورینگ (PM2، docker healthcheck)
- [ ] لاگ‌ها در `/opt/citycenter/logs/`

### داده
- [ ] `npm run seed` اجرا شده
- [ ] ورود `admin` کار می‌کند
- [ ] یک کاربر مغازه‌دار تستی ساخته شده
- [ ] یک شارژ تستی پرداخت شده

---

## دریافت کمک

- **مستندات پروژه:** `README.md`
- **سایر مستندات:** `PROGRESS.md` (تاریخچه باگ‌ها و اصلاحات)
- **Issue Tracker:** (لینک مخزن)

---

**آخرین به‌روزرسانی این سند:** ۱ مهر ۱۴۰۵
