const { DataTypes } = require('sequelize');
const db = require('../utils/db');

const Setting = db.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1
  },
  due_day: {
    type: DataTypes.INTEGER,
    defaultValue: 25
  },
  default_fee: {
    type: DataTypes.DECIMAL(15, 0),
    defaultValue: 1200000
  },
  webhook_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  webhook_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  image_retention_months: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  },
  data_retention_months: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  }
}, {
  tableName: 'sc_settings',
  timestamps: false
});

module.exports = Setting;
