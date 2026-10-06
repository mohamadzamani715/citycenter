const { DataTypes } = require('sequelize');
const db = require('../utils/db');

const ShopOwner = db.define('ShopOwner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  national_code: {
    type: DataTypes.STRING(10),
    unique: true,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  shop_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  plaque: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reset_code: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reset_code_expires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'sc_shop_owners',
  timestamps: true,
  paranoid: false
});

module.exports = ShopOwner;
