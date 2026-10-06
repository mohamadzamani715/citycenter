require('dotenv').config();
const { ensureColumnLengths, dropDeadColumns, dropDuplicateIndexes } = require('../utils/migrations');
const db = require('../utils/db');

(async () => {
  try {
    await db.authenticate();
    await ensureColumnLengths();
    await dropDeadColumns();
    await dropDuplicateIndexes();
    console.log('✅ All migrations completed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();