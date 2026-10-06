const ShopOwner = require('./ShopOwner');
const MonthlyCharge = require('./MonthlyCharge');
const Receipt = require('./Receipt');
const Setting = require('./Setting');
const AuditLog = require('./AuditLog');
const ApiKey = require('./ApiKey');

// Associations
ShopOwner.hasMany(MonthlyCharge, { foreignKey: 'shop_id', as: 'monthlyCharges' });
MonthlyCharge.belongsTo(ShopOwner, { foreignKey: 'shop_id', as: 'shop' });
MonthlyCharge.hasOne(Receipt, { foreignKey: 'charge_id', as: 'receipt' });
Receipt.belongsTo(MonthlyCharge, { foreignKey: 'charge_id', as: 'charge' });

module.exports = {
  ShopOwner,
  MonthlyCharge,
  Receipt,
  Setting,
  AuditLog,
  ApiKey
};
