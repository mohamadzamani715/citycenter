#!/usr/bin/env node
/**
 * Database Backup Script
 * =========================================================
 * Creates a compressed (gzip) SQL dump of the application database.
 * Designed to be run manually OR from a cron job.
 *
 * Usage:
 *   node scripts/backup-db.js
 *
 * Environment variables (from .env):
 *   DB_HOST           - MySQL host (default: localhost)
 *   DB_PORT           - MySQL port (default: 3306)
 *   DB_USER           - MySQL user (default: root)
 *   DB_PASS           - MySQL password (default: empty)
 *   DB_NAME           - Database name (required)
 *   MYSQLDUMP_PATH    - Full path to mysqldump binary
 *                       (default: "mysqldump", assumes it is in PATH)
 *   BACKUP_DIR        - Directory for backup files (default: ./backups)
 *   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 30)
 *
 * Exit codes:
 *   0 - Success
 *   1 - Configuration error
 *   2 - Backup failed
 *   3 - Retention cleanup failed
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

// =========================================================
// Configuration
// =========================================================
const config = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || '3306',
  dbUser: process.env.DB_USER || 'root',
  dbPass: process.env.DB_PASS || '',
  dbName: process.env.DB_NAME,

  mysqldumpPath: process.env.MYSQLDUMP_PATH || 'mysqldump',

  backupDir: path.resolve(
    process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups')
  ),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30,
};

// =========================================================
// Helpers
// =========================================================

/**
 * Ensure the backup directory exists.
 */
function ensureBackupDir() {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    logger.info(`[Backup] Created backup directory: ${config.backupDir}`);
  }
}

/**
 * Create a temporary my.cnf file containing credentials.
 * This prevents the password from appearing in `ps`/`tasklist` output.
 * The file is deleted as soon as the dump finishes.
 */
function createTempCredentialsFile() {
  const tmpFile = path.join(
    os.tmpdir(),
    `citycenter-backup-${Date.now()}-${process.pid}.cnf`
  );

  const content = [
    '[client]',
    `host=${config.dbHost}`,
    `port=${config.dbPort}`,
    `user=${config.dbUser}`,
    `password=${config.dbPass}`,
    '',
  ].join('\n');

  fs.writeFileSync(tmpFile, content, { mode: 0o600 });

  return tmpFile;
}

/**
 * Generate the backup file name (with timestamp).
 */
function buildBackupFileName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');

  return `backup-${ts}.sql.gz`;
}

/**
 * Run mysqldump and pipe output through gzip into the target file.
 * Resolves with the full path to the created file, or rejects on error.
 */
function runMysqldump(credentialsFile, outputFile) {
  return new Promise((resolve, reject) => {
    const args = [
      `--defaults-extra-file=${credentialsFile}`,
      '--single-transaction',
      '--quick',
      '--routines',
      '--triggers',
      '--events',
      config.dbName,
    ];

    logger.info(`[Backup] Starting dump of database "${config.dbName}"...`);

    const dump = spawn(config.mysqldumpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const gzip = zlib.createGzip({ level: 9 });
    const output = fs.createWriteStream(outputFile, { mode: 0o600 });

    let stderrData = '';

    dump.stdout.pipe(gzip).pipe(output);

    dump.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    dump.on('error', (err) => {
      reject(new Error(`Failed to spawn mysqldump: ${err.message}`));
    });

    dump.on('close', (code) => {
      if (code !== 0) {
        try {
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        } catch (_) { /* ignore */ }

        const msg = stderrData.trim() || `mysqldump exited with code ${code}`;
        reject(new Error(msg));
        return;
      }

      output.on('close', () => resolve(outputFile));
      output.on('error', (err) =>
        reject(new Error(`Failed to write output file: ${err.message}`))
      );
    });
  });
}

/**
 * Delete backups older than `retentionDays`.
 */
function cleanupOldBackups() {
  let removed = 0;

  try {
    const entries = fs.readdirSync(config.backupDir);
    const cutoff = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;

    for (const name of entries) {
      if (!/^backup-\d{8}-\d{6}\.sql\.gz$/.test(name)) continue;

      const filePath = path.join(config.backupDir, name);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        removed += 1;
        logger.info(`[Backup] Removed old backup: ${name}`);
      }
    }

    return { removed, kept: entries.length - removed };
  } catch (err) {
    logger.error('[Backup] Cleanup failed', { error: err.message });
    return { removed, error: err.message };
  }
}

// =========================================================
// Main
// =========================================================

async function runBackup() {
  const startedAt = Date.now();

  if (!config.dbName) {
    const err = new Error('DB_NAME is not set in .env — aborting.');
    err.exitCode = 1;
    throw err;
  }

  ensureBackupDir();

  const fileName = buildBackupFileName();
  const filePath = path.join(config.backupDir, fileName);

  let credentialsFile = null;

  try {
    credentialsFile = createTempCredentialsFile();

    await runMysqldump(credentialsFile, filePath);

    const stats = fs.statSync(filePath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
    const durationMs = Date.now() - startedAt;

    const cleanup = cleanupOldBackups();
    if (cleanup.error) {
      const cleanupErr = new Error(`Retention cleanup failed: ${cleanup.error}`);
      cleanupErr.exitCode = 3;
      throw cleanupErr;
    }

    return { filePath, fileName, sizeMb, durationMs, cleanup };
  } catch (err) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) { /* ignore */ }

    err.exitCode = err.exitCode || 2;
    throw err;
  } finally {
    if (credentialsFile && fs.existsSync(credentialsFile)) {
      try {
        fs.unlinkSync(credentialsFile);
      } catch (err) {
        logger.warn('[Backup] Failed to remove temp credentials file', {
          path: credentialsFile,
          error: err.message,
        });
      }
    }
  }
}

// =========================================================
// Standalone execution only
// =========================================================
if (require.main === module) {
  runBackup()
    .then((result) => {
      logger.info(
        `[Backup] Backup created: ${result.fileName} (${result.sizeMb} MB, ${result.durationMs} ms)`
      );
      logger.info(
        `[Backup] Retention: removed ${result.cleanup.removed} old file(s), ${result.cleanup.kept} kept.`
      );
      process.exit(0);
    })
    .catch((err) => {
      logger.error('[Backup] Backup failed', { error: err.message });
      process.exit(err.exitCode || 2);
    });
}

module.exports = { runBackup, config };
