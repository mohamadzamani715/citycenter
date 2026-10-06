#!/usr/bin/env node
/**
 * Database Restore Script
 * =========================================================
 * Restores a compressed (.sql.gz) MySQL dump into the application database.
 *
 * WARNING: This is a DESTRUCTIVE operation. The target database
 * will be overwritten by the contents of the dump file.
 *
 * Usage:
 *   node scripts/restore-db.js <path-to-backup.sql.gz>
 *   node scripts/restore-db.js <path> --yes
 *   node scripts/restore-db.js <path> --no-safety-backup
 *
 * Safety features:
 *   - Interactive confirmation (unless --yes is passed).
 *   - Automatic safety backup of the CURRENT database before restoring.
 *   - Uses --defaults-extra-file to keep the password out of process listings.
 *
 * Environment variables (from .env):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME (same as backup script)
 *   MYSQL_PATH              - Full path to mysql binary
 *                             (default: "mysql", assumes it is in PATH)
 *   RESTORE_SKIP_CONFIRM    - Set to "1" to skip interactive confirmation
 *   RESTORE_SAFETY_BACKUP   - Set to "0" to skip the pre-restore safety backup
 *
 * Exit codes:
 *   0 - Success
 *   1 - Configuration error
 *   2 - Input file error
 *   3 - Safety backup failed
 *   4 - Restore failed
 *   5 - Cancelled by user
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const readline = require('readline');
const { spawn } = require('child_process');
const logger = require('../utils/logger');
const { runBackup } = require('./backup-db');

// =========================================================
// Configuration
// =========================================================
const config = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || '3306',
  dbUser: process.env.DB_USER || 'root',
  dbPass: process.env.DB_PASS || '',
  dbName: process.env.DB_NAME,

  mysqlPath: process.env.MYSQL_PATH || 'mysql',
};

// =========================================================
// CLI Arguments
// =========================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    inputFile: null,
    yes: false,
    skipSafetyBackup: false,
  };

  for (const arg of args) {
    if (arg === '--yes' || arg === '-y') {
      opts.yes = true;
    } else if (arg === '--no-safety-backup') {
      opts.skipSafetyBackup = true;
    } else if (!opts.inputFile && !arg.startsWith('--')) {
      opts.inputFile = arg;
    } else {
      logger.warn(`[Restore] Ignoring unknown argument: ${arg}`);
    }
  }

  if (process.env.RESTORE_SKIP_CONFIRM === '1') opts.yes = true;
  if (process.env.RESTORE_SAFETY_BACKUP === '0') opts.skipSafetyBackup = true;

  return opts;
}

// =========================================================
// Helpers
// =========================================================

/**
 * Create a temporary my.cnf file containing credentials.
 * Mirrors the pattern used in backup-db.js.
 */
function createTempCredentialsFile() {
  const tmpFile = path.join(
    os.tmpdir(),
    `citycenter-restore-${Date.now()}-${process.pid}.cnf`
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
 * Ask the user for confirmation on stdin.
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Pipe a gunzipped SQL stream into the `mysql` client.
 */
function runMysqlRestore(credentialsFile, inputFile) {
  return new Promise((resolve, reject) => {
    const args = [
      `--defaults-extra-file=${credentialsFile}`,
      config.dbName,
    ];

    logger.info(`[Restore] Feeding ${inputFile} into mysql...`);

    const mysql = spawn(config.mysqlPath, args, {
      stdio: ['pipe', 'inherit', 'pipe'],
    });

    const gunzip = zlib.createGunzip();
    const input = fs.createReadStream(inputFile);

    let stderrData = '';

    input.on('error', (err) => {
      reject(new Error(`Cannot read input file: ${err.message}`));
    });

    gunzip.on('error', (err) => {
      reject(new Error(`Failed to decompress input (is it a .sql.gz file?): ${err.message}`));
    });

    mysql.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    mysql.on('error', (err) => {
      reject(new Error(`Failed to spawn mysql: ${err.message}`));
    });

    input.pipe(gunzip).pipe(mysql.stdin);

    mysql.on('close', (code) => {
      if (code !== 0) {
        const msg = stderrData.trim() || `mysql exited with code ${code}`;
        reject(new Error(msg));
        return;
      }
      resolve();
    });
  });
}

// =========================================================
// Main
// =========================================================

async function runRestore(cliOpts) {
  const opts = cliOpts || parseArgs();
  const startedAt = Date.now();

  if (!config.dbName) {
    const err = new Error('DB_NAME is not set in .env — aborting.');
    err.exitCode = 1;
    throw err;
  }

  if (!opts.inputFile) {
    const err = new Error('Missing input file. Usage: node scripts/restore-db.js <backup.sql.gz>');
    err.exitCode = 1;
    throw err;
  }

  const inputFile = path.resolve(opts.inputFile);

  if (!fs.existsSync(inputFile)) {
    const err = new Error(`Input file not found: ${inputFile}`);
    err.exitCode = 2;
    throw err;
  }

  if (!/\.sql\.gz$/i.test(inputFile)) {
    logger.warn('[Restore] Input file does not end with .sql.gz — proceeding anyway.');
  }

  logger.info('=====================================================');
  logger.info('  DATABASE RESTORE');
  logger.info('=====================================================');
  logger.info(`  Target database : ${config.dbName} @ ${config.dbHost}:${config.dbPort}`);
  logger.info(`  Source file     : ${inputFile}`);
  logger.info(`  File size       : ${(fs.statSync(inputFile).size / 1024).toFixed(2)} KB`);
  logger.info('  This will OVERWRITE the current database contents.');
  logger.info('=====================================================');

  if (!opts.yes) {
    const answer = await askConfirmation('Type "yes" to proceed: ');
    if (answer !== 'yes' && answer !== 'y') {
      const err = new Error('Cancelled by user.');
      err.exitCode = 5;
      throw err;
    }
  }

  if (!opts.skipSafetyBackup) {
    logger.info('[Restore] Taking a safety backup of the current database...');
    try {
      await runBackup();
      logger.info('[Restore] Safety backup created.');
    } catch (err) {
      const safetyErr = new Error(`Safety backup failed — refusing to continue: ${err.message}`);
      safetyErr.exitCode = 3;
      throw safetyErr;
    }
  } else {
    logger.warn('[Restore] Skipping safety backup (--no-safety-backup).');
  }

  let credentialsFile = null;
  try {
    credentialsFile = createTempCredentialsFile();
    await runMysqlRestore(credentialsFile, inputFile);

    const durationMs = Date.now() - startedAt;
    return { durationMs };
  } catch (err) {
    err.exitCode = err.exitCode || 4;
    throw err;
  } finally {
    if (credentialsFile && fs.existsSync(credentialsFile)) {
      try {
        fs.unlinkSync(credentialsFile);
      } catch (err) {
        logger.warn('[Restore] Failed to remove temp credentials file', {
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
  runRestore(parseArgs())
    .then((result) => {
      logger.info(`[Restore] Restore completed successfully in ${result.durationMs} ms.`);
      process.exit(0);
    })
    .catch((err) => {
      if (err.exitCode === 5) {
        logger.warn('[Restore] Cancelled by user.');
      } else {
        logger.error('[Restore] Restore failed', { error: err.message });
      }
      process.exit(err.exitCode || 4);
    });
}

module.exports = { runRestore, config };
