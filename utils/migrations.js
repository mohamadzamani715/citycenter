const db = require('./db');
const { DataTypes, QueryTypes } = require('sequelize');
const logger = require('./logger');

/**
 * Ensures that critical VARCHAR columns have the correct length in the database.
 * This is idempotent: if a column already has the correct length, it does nothing.
 * This is necessary because Sequelize's `sync()` does NOT alter existing columns
 * unless `alter: true` is used, which is dangerous in production.
 */
async function ensureColumnLengths() {
  const targetTable = 'sc_shop_owners';
  const targetColumn = 'shop_name';
  const targetLength = 255;

  try {
    // Query current column definition from information_schema
    // NOTE: with QueryTypes.SELECT, sequelize returns the rows array directly
    const rows = await db.query(
      `SELECT CHARACTER_MAXIMUM_LENGTH AS len, DATA_TYPE AS type
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      { replacements: [targetTable, targetColumn], type: QueryTypes.SELECT }
    );

    if (!rows || rows.length === 0) {
      logger.warn(`[Migration] Column ${targetTable}.${targetColumn} not found — skipping.`);
      return;
    }

    const currentLength = rows[0].len;
    const currentType = rows[0].type;

    if (currentType === 'varchar' && Number(currentLength) >= targetLength) {
      logger.info(`[Migration] ${targetTable}.${targetColumn} already VARCHAR(${currentLength}). No change needed.`);
      return;
    }

    logger.info(`[Migration] Altering ${targetTable}.${targetColumn} from VARCHAR(${currentLength}) to VARCHAR(${targetLength})...`);

    await db.getQueryInterface().changeColumn(
      targetTable,
      targetColumn,
      {
        type: DataTypes.STRING(targetLength),
        allowNull: false
      }
    );

    logger.info(`[Migration] ✅ ${targetTable}.${targetColumn} successfully altered to VARCHAR(${targetLength}).`);
  } catch (err) {
    // Important: log but DO NOT crash the server. If MySQL is temporarily down,
    // the server should still start and the migration will retry next time.
    logger.error('[Migration] Failed to ensure column lengths:', { error: err.message });
  }
}

/**
 * Drops columns that exist in the database but are no longer used by any model.
 * Idempotent: if the column does not exist, does nothing.
 */
async function dropDeadColumns() {
  const deadColumns = [
    { table: 'sc_shop_owners', column: 'api_key' }
  ];

  for (const { table, column } of deadColumns) {
    try {
      const rows = await db.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        { replacements: [table, column], type: QueryTypes.SELECT }
      );

      if (!rows || rows.length === 0) {
        logger.info(`[Migration] Column ${table}.${column} does not exist — no change needed.`);
        continue;
      }

      logger.info(`[Migration] Dropping dead column ${table}.${column}...`);
      await db.getQueryInterface().removeColumn(table, column);
      logger.info(`[Migration] ✅ ${table}.${column} dropped.`);
    } catch (err) {
      logger.error(`[Migration] Failed to drop ${table}.${column}:`, { error: err.message });
    }
  }
}

/**
 * Drops duplicate UNIQUE indexes on the same column that accumulate from
 * repeated sync({ alter: true }) calls. Keeps the first (canonical) one.
 * Idempotent: if only one index exists, does nothing.
 */
async function dropDuplicateIndexes() {
  const targetTable = 'sc_shop_owners';
  const targetColumn = 'national_code';

  try {
    const rows = await db.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
         AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'
       ORDER BY INDEX_NAME ASC`,
      { replacements: [targetTable, targetColumn], type: QueryTypes.SELECT }
    );

    const uniqueIndexes = rows.map(r => r.INDEX_NAME);

    if (uniqueIndexes.length <= 1) {
      logger.info(`[Migration] Only ${uniqueIndexes.length} unique index on ${targetTable}.${targetColumn} — no duplicates to drop.`);
      return;
    }

    // Keep the first one (canonical), drop the rest
    const [keep, ...drop] = uniqueIndexes;
    logger.info(`[Migration] Keeping index "${keep}", dropping duplicates: ${drop.join(', ')}`);

    for (const idx of drop) {
      try {
        await db.getQueryInterface().removeIndex(targetTable, idx);
        logger.info(`[Migration] ✅ Dropped duplicate index "${idx}".`);
      } catch (err) {
        logger.error(`[Migration] Failed to drop index "${idx}":`, { error: err.message });
      }
    }
  } catch (err) {
    logger.error('[Migration] Failed to check indexes:', { error: err.message });
  }
}

module.exports = { ensureColumnLengths, dropDeadColumns, dropDuplicateIndexes };