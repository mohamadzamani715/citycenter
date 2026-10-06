require('dotenv').config({ override: true });
const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const app = express();
// Trust the first proxy in front of us (nginx, Cloudflare, etc.) so that:
//   1. req.secure correctly reflects the original HTTPS connection
//   2. secure cookies are actually set on HTTPS
//   3. rate limiters see the real client IP instead of the proxy IP
// Value 1 means "trust exactly one hop" — safer than `true` which trusts everything.
app.set('trust proxy', process.env.TRUST_PROXY || 1);
const db = require('./utils/db');
const logger = require('./utils/logger');

// Per-request CSP nonce. Must be set BEFORE helmet evaluates its directives,
// because helmet reads res.locals.cspNonce when it writes the response headers.
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Security middleware: Helmet with custom CSP.
// NOTE: scriptSrc has NO 'unsafe-inline' — every inline <script> must carry the
// per-request nonce. scriptSrcAttr is empty, so inline event handlers (onclick=…)
// are blocked; all handlers are bound via addEventListener instead.
// NOTE: styleSrc has NO 'unsafe-inline' — all styles live in /css/style.css
// (fix 21). styleSrcAttr/styleSrcElem are unset, so styleSrc governs both
// inline style attributes and <style> elements.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

// Rate limiting: Global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(globalLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later."
});
const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests, please try again later."
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many requests, please try again later."
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', (req, res) => res.status(404).end());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// API-key authenticated routes — intentionally exempt from CSRF
const externalRoutes = require('./routes/external');
app.use('/api/external', apiLimiter);
app.use('/api/external', externalRoutes);

// Apply specific limiters before CSRF so they are counted even when CSRF blocks (only for specific methods)
app.use((req, res, next) => {
  if (req.path.startsWith('/admin/users') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return adminApiLimiter(req, res, next);
  }
  if (req.path.startsWith('/admin/api/api-keys') && ['POST', 'DELETE'].includes(req.method)) {
    return adminApiLimiter(req, res, next);
  }
  if (req.path === '/shop/upload-receipt' && req.method === 'POST') {
    return uploadLimiter(req, res, next);
  }
  next();
});

// Strict limiter for forgot-password — mounted BEFORE csrfProtection
// so that even CSRF-less requests count against the limit.
app.use('/auth/shop/forgot-password', require('./middleware/forgotPasswordLimiter'));

// CSRF protection for every route below — including /auth/* (prevents login-CSRF)
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Make CSRF token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.get('/', (req, res) => res.send('Server is running'));
app.get('/login', (req, res) => res.render('login'));

// Routes (all CSRF-protected)
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/shop', shopRoutes);

// Central 404 handler (must be after all routes and before any error handler)
app.use((req, res) => {
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(404).json({ message: 'مسیر یافت نشد' });
  }
  res.status(404).send('مسیر یافت نشد');
});

// Central error handler — MUST be the last middleware, after all routes
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'توکن امنیتی نامعتبر است' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'درخواست نامعتبر' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'حجم فایل بیش از حد مجاز است' });
  }

  res.status(500).json({ message: 'خطای سرور' });
});

const PORT = process.env.PORT || 3514;
const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

// Initialize cron jobs
require('./cron/jobs');
logger.info('Cron jobs initialized');

// Run DB migrations in the background (do not block server startup)
require('./utils/db').authenticate()
  .then(() => require('./utils/migrations').ensureColumnLengths())
  .then(() => require('./utils/migrations').dropDeadColumns())
  .then(() => require('./utils/migrations').dropDuplicateIndexes())
  .catch(err => logger.error('DB startup check failed:', { error: err.message }));
