const { DataTypes } = require('sequelize');
const db = require('../utils/db');

const AuditLog = db.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  charge_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  performed_by: {
    type: DataTypes.ENUM('admin', 'shop_owner'),
    allowNull: false
  },
  performed_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sc_audit_logs',
  timestamps: true,
  updatedAt: false
});

module.exports = AuditLog;
