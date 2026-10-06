const crypto = require('crypto');
const { ApiKey } = require('../models');

async function validateApiKey(req, res, next) {
  try {
    // The key is ONLY accepted via the x-api-key header. Accepting it from the query
    // string would leak it into access logs, browser history, the Referer header sent
    // to third parties, and any intermediate proxy/CDN logs.
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({ message: 'کلید API نامعتبر است' });
    }

    // Keys are stored as SHA-256 hashes, so hash the incoming value and compare.
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const record = await ApiKey.findOne({ where: { key_hash: keyHash } });
    if (!record) {
      return res.status(401).json({ message: 'کلید API نامعتبر است' });
    }

    if (record.expires_at && record.expires_at < new Date()) {
      return res.status(401).json({ message: 'کلید API منقضی شده است' });
    }

    record.last_used_at = new Date();
    await record.save();

    req.apiKey = record;
    next();
  } catch (err) {
    // Express 4 does not catch async errors, so forward them explicitly.
    next(err);
  }
}

module.exports = validateApiKey;
