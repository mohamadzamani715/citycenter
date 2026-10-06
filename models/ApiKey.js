const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const ApiKey = sequelize.define('ApiKey', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  // Only the SHA-256 hash of the key is stored — the plaintext key is shown once
  // at creation time and can never be recovered from the database.
  key_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  // First 10 characters of the key, kept so the admin panel can identify it.
  prefix: { type: DataTypes.STRING(10), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  last_used_at: { type: DataTypes.DATE, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'sc_api_keys',
  timestamps: false
});

module.exports = ApiKey;
