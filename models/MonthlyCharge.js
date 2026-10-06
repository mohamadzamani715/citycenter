const { DataTypes } = require('sequelize');
const db = require('../utils/db');

const MonthlyCharge = db.define('MonthlyCharge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  charge_month: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 0),
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('unpaid', 'pending', 'paid'),
    defaultValue: 'unpaid'
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transaction_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rejected_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'sc_monthly_charges',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['shop_id', 'charge_month']
    },
    {
      fields: ['status']
    },
    {
      fields: ['paid_at']
    }
  ]
});

module.exports = MonthlyCharge;
