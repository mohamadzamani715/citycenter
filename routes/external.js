const express = require('express');
const router = express.Router();
const validateApiKey = require('../middleware/validateApiKey');
const { ShopOwner, MonthlyCharge } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-jalaali');
const logger = require('../utils/logger');

// Apply API key validation to all routes.
// The key MUST be sent in the `x-api-key` header; query-string keys (?api_key=...)
// are intentionally rejected so the key never ends up in access logs or Referer headers.
router.use(validateApiKey);

// GET /api/external/shops - List all active shops with last charge
router.get('/shops', async (req, res) => {
  logger.debug('External /shops called');
  try {
    logger.debug('Fetching shops...');
    const shops = await ShopOwner.findAll({
      where: {
        is_approved: true,
        deleted_at: null
      },
      order: [['shop_name', 'ASC']]
    });
    logger.debug('Fetched shops', { count: shops.length });

    const shopIds = shops.map(s => s.id);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const charges = shopIds.length ? await MonthlyCharge.findAll({
      where: {
        shop_id: { [Op.in]: shopIds },
        charge_month: { [Op.gte]: twelveMonthsAgo }
      },
      order: [['charge_month', 'DESC']]
    }) : [];
    logger.debug('Fetched charges for shops (last 12 months)', { count: charges.length });
    const lastChargeMap = {};
    charges.forEach(charge => {
      if (!lastChargeMap[charge.shop_id]) {
        lastChargeMap[charge.shop_id] = charge;
      }
    });

    const shopsWithLastCharge = shops.map((shop) => {
      const lastCharge = lastChargeMap[shop.id] || null;
      return {
        id: shop.id,
        shop_name: shop.shop_name,
        national_code: shop.national_code,
        phone: shop.phone,
        plaque: shop.plaque,
        lastCharge: lastCharge ? {
          charge_month: moment(lastCharge.charge_month).format('jYYYY/jMM/jDD'),
          amount: lastCharge.amount,
          status: lastCharge.status,
          paid_at: lastCharge.paid_at ? moment(lastCharge.paid_at).format('jYYYY/jMM/jDD') : null,
          transaction_code: lastCharge.transaction_code
        } : null
      };
    });

    res.json(shopsWithLastCharge);
  } catch (err) {
    logger.error('Error in /shops', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطای داخلی سرور' });
  }
});

// GET /api/external/charges?shop_id=... - List charges for a shop in last 12 months
router.get('/charges', async (req, res) => {
  logger.debug('External /charges called');
  try {
    const { shop_id } = req.query;
    if (!shop_id) {
      return res.status(400).json({ message: 'shop_id الزامی است' });
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const charges = await MonthlyCharge.findAll({
      where: {
        shop_id: shop_id,
        charge_month: { [Op.gte]: twelveMonthsAgo }
      },
      order: [['charge_month', 'DESC']]
    });

    const formattedCharges = charges.map((charge) => ({
      charge_month: moment(charge.charge_month).format('jYYYY/jMM/jDD'),
      amount: charge.amount,
      status: charge.status,
      paid_at: charge.paid_at ? moment(charge.paid_at).format('jYYYY/jMM/jDD') : null,
      transaction_code: charge.transaction_code
    }));

    res.json(formattedCharges);
  } catch (err) {
    logger.error('Error in /charges', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطای داخلی سرور' });
  }
});

module.exports = router;
