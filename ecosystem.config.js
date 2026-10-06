// =========================================================
// CityCenter — PM2 Configuration
// =========================================================
// Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//   pm2 startup   (then run the suggested command as root)
//
// Notes:
//   - This config is for running the app DIRECTLY on a server (no Docker).
//   - For Docker-based deployment, use docker-compose.yml instead.
//   - Logs are written by PM2 to ./logs/pm2-*.log in addition to
//     the app's own winston logs in ./logs/combined.log.
// =========================================================

module.exports = {
  apps: [
    {
      // ---------------------------------------------------------
      // Application
      // ---------------------------------------------------------
      name: 'citycenter',
      script: 'server.js',

      // Run a single instance. The app uses cron jobs internally,
      // so running multiple instances would duplicate cron schedules.
      // If you need to scale horizontally, move cron to a separate process first.
      instances: 1,
      exec_mode: 'fork',

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown: give the app 5 seconds to finish in-flight requests.
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,

      // ---------------------------------------------------------
      // Environment variables
      // ---------------------------------------------------------
      // NOTE: This config does NOT hardcode secrets. The .env file is loaded
      // by the app itself via dotenv. The values below are only non-sensitive
      // defaults that PM2 sets directly.
      env: {
        NODE_ENV: 'development',
        PORT: 3514,
        TZ: 'Asia/Tehran'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3514,
        TZ: 'Asia/Tehran',
        TRUST_PROXY: 1
      },

      // ---------------------------------------------------------
      // Logging
      // ---------------------------------------------------------
      // PM2 writes its own logs (startup, restarts) here.
      // The app's own winston logs go to ./logs/combined.log and ./logs/error.log.
      output: './logs/pm2-out.log',
      error: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
