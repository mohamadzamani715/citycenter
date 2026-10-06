const { DataTypes } = require('sequelize');
const db = require('../utils/db');

const Receipt = db.define('Receipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  charge_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  original_path: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  compressed_path: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'sc_receipts',
  timestamps: true,
  updatedAt: false
});

module.exports = Receipt;
