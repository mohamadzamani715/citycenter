const cron = require('node-cron');
const { Op } = require('sequelize');
const { ShopOwner, MonthlyCharge, Receipt, Setting } = require('../models');
const db = require('../utils/db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Job 1: Generate monthly charges - every day at 00:30
cron.schedule('30 0 * * *', async () => {
  logger.info('[Cron] Running monthly charge generation job...');
  try {
    const settings = await Setting.findOne({ where: { id: 1 } });
    if (!settings) {
      logger.warn('[Cron] Settings not found, skipping monthly charge generation');
      return;
    }

    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const chargeMonth = nextMonthDate.toISOString().slice(0, 7) + '-01';
    const nextMonthISO = nextMonthDate.toISOString().slice(0, 7);
    const lastDayOfNextMonth = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).getDate();
    const dueDay = Math.min(settings.due_day, lastDayOfNextMonth);

    // Get all approved, non-deleted shops
    const shops = await ShopOwner.findAll({
      where: {
        is_approved: true,
        deleted_at: null,
        is_admin: false
      }
    });

    // Create charges for each shop
    for (const shop of shops) {
      try {
        const [charge, created] = await MonthlyCharge.findOrCreate({
          where: {
            shop_id: shop.id,
            charge_month: chargeMonth
          },
          defaults: {
            amount: settings.default_fee,
            due_date: `${nextMonthISO}-${String(dueDay).padStart(2, '0')}`,
            status: 'unpaid'
          }
        });
        if (created) {
          logger.info(`[Cron] Created charge for shop ${shop.id} for month ${chargeMonth}`);
        } else {
          logger.info(`[Cron] Charge already exists for shop ${shop.id} for month ${chargeMonth}`);
        }
      } catch (err) {
        logger.error(`[Cron] Failed to create charge for shop ${shop.id}:`, err.message);
      }
    }

    logger.info('[Cron] Monthly charge generation job completed');
  } catch (err) {
    logger.error('[Cron] Error in monthly charge generation job:', err.message);
  }
});

// Job 2: Cleanup old receipts - first day of every month at 02:00
cron.schedule('0 2 1 * *', async () => {
  logger.info('[Cron] Running old receipt cleanup job...');
  try {
    const settings = await Setting.findOne({ where: { id: 1 } });
    if (!settings) {
      logger.warn('[Cron] Settings not found, skipping receipt cleanup');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - settings.image_retention_months);

    // Find all charges with receipts older than cutoff date
    const chargesToClean = await MonthlyCharge.findAll({
      where: {
        paid_at: {
          [Op.lt]: cutoffDate
        }
      },
      include: [{ model: Receipt, as: 'receipt' }]
    });

    for (const charge of chargesToClean) {
      if (charge.receipt) {
        try {
          // Delete files from disk
          const originalPath = path.join(__dirname, '../public', charge.receipt.original_path.replace(/^\//, ''));
          const compressedPath = path.join(__dirname, '../public', charge.receipt.compressed_path.replace(/^\//, ''));
          
          if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
          }
          if (fs.existsSync(compressedPath)) {
            fs.unlinkSync(compressedPath);
          }

          // Delete receipt from database
          await charge.receipt.destroy();
          logger.info(`[Cron] Deleted receipt for charge ${charge.id}`);
        } catch (err) {
          logger.error(`[Cron] Failed to delete receipt for charge ${charge.id}:`, err.message);
        }
      }
    }

    logger.info('[Cron] Old receipt cleanup job completed');
  } catch (err) {
    logger.error('[Cron] Error in receipt cleanup job:', err.message);
  }
});

// Job 3: Delete archived shops - first day of every month at 03:00
// Extracted into a named function so it can also be invoked manually for testing:
//   node -e "require('./cron/jobs').purgeArchivedShops()"
async function purgeArchivedShops() {
  logger.info('[Cron] Running archived shop deletion job...');
  try {
    const settings = await Setting.findOne({ where: { id: 1 } });
    if (!settings) {
      logger.warn('[Cron] Settings not found, skipping archived shop deletion');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - settings.data_retention_months);

    // Find all archived shops older than cutoff date
    const shopsToDelete = await ShopOwner.findAll({
      where: {
        deleted_at: {
          [Op.lt]: cutoffDate
        },
        is_admin: false
      }
    });

    let purged = 0;
    for (const shop of shopsToDelete) {
      // Each shop is purged in ONE transaction, children first. There are real FK
      // constraints (sc_receipts.charge_id -> sc_monthly_charges -> sc_shop_owners),
      // so deleting the shop alone would fail and leave the data behind forever.
      const t = await db.transaction();
      try {
        const charges = await MonthlyCharge.findAll({
          where: { shop_id: shop.id },
          attributes: ['id'],
          transaction: t
        });
        const chargeIds = charges.map((c) => c.id);

        if (chargeIds.length) {
          // 1) receipts (leaf)
          await Receipt.destroy({
            where: { charge_id: { [Op.in]: chargeIds } },
            transaction: t
          });
        }
        // 2) charges
        await MonthlyCharge.destroy({ where: { shop_id: shop.id }, transaction: t });
        // 3) the shop itself
        await ShopOwner.destroy({ where: { id: shop.id }, transaction: t });

        await t.commit();
        purged++;
        logger.info(`[Cron] Purged archived shop ${shop.id} (${chargeIds.length} charges + their receipts)`);
      } catch (err) {
        try { await t.rollback(); } catch (_) {}
        logger.error('[Cron] Failed to purge archived shop', { shopId: shop.id, error: err.message });
      }
    }

    logger.info(`[Cron] Archived shop deletion job completed (${purged}/${shopsToDelete.length} purged)`);
  } catch (err) {
    logger.error('[Cron] Error in archived shop deletion job', { error: err.message });
  }
}

cron.schedule('0 3 1 * *', purgeArchivedShops);

// =========================================================
// Job 4: Daily database backup - every day at 04:00
// =========================================================
// Rationale for 04:00:
//   - Job 1 (charge generation) runs at 00:30.
//   - Job 2 and 3 (cleanup) run at 02:00 and 03:00 on the 1st of the month.
//   - 04:00 is after all of them, so the backup captures the
//     most up-to-date state of the database.
cron.schedule(
  '0 4 * * *',
  async () => {
    const startTime = Date.now();
    logger.info('[Cron] Running database backup job...');

    try {
      // Lazy-require to avoid loading dotenv and mysqldump logic at startup.
      const { spawn } = require('child_process');
      const path = require('path');

      // runBackup() calls process.exit() on completion, which would kill
      // the server if called directly. We therefore spawn a child process
      // to isolate the backup and its exit code.
      await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [path.join(__dirname, '..', 'scripts', 'backup-db.js')],
          {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: process.env,
          }
        );

        let stderrData = '';
        child.stderr.on('data', (chunk) => {
          stderrData += chunk.toString();
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to spawn backup-db: ${err.message}`));
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            const msg = stderrData.trim() || `backup-db exited with code ${code}`;
            reject(new Error(msg));
          }
        });
      });

      const durationMs = Date.now() - startTime;
      logger.info(`[Cron] Database backup job completed (${durationMs} ms)`);
    } catch (err) {
      logger.error('[Cron] Database backup job failed', { error: err.message });
    }
  },
  { timezone: 'Asia/Tehran' }
);

/**
 * Manually trigger the database backup job.
 * Usage: node -e "require('./cron/jobs').runBackupJob()"
 */
async function runBackupJob() {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(__dirname, '..', 'scripts', 'backup-db.js'),
    ], { stdio: 'inherit' });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`backup-db exited with code ${code}`));
    });
  });
}

logger.info('[Cron] All cron jobs initialized');
module.exports = cron;
module.exports.purgeArchivedShops = purgeArchivedShops;
module.exports.runBackupJob = runBackupJob;
