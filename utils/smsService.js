/**
 * SMS Service — provider-agnostic interface for sending transactional SMS.
 *
 * Currently supports:
 *   - Kavenegar (https://kavenegar.com) via REST API
 *
 * Configuration is read from environment variables:
 *   - SMS_PROVIDER: "kavenegar" (default) | "mock" (for testing)
 *   - SMS_API_KEY:  API key issued by the provider
 *   - SMS_SENDER:   Sender line number (e.g. "10008663")
 *
 * This module is intentionally standalone and does NOT import any project
 * models. That keeps it easy to test in isolation and prevents circular
 * dependencies with controllers.
 */

const axios = require('axios');
const logger = require('./logger');

const KAVENEGAR_BASE_URL = 'https://api.kavenegar.com/v1';
const DEFAULT_TIMEOUT_MS = 10000;

class SmsService {
  constructor() {
    this.provider = (process.env.SMS_PROVIDER || 'kavenegar').toLowerCase();
    this.apiKey = process.env.SMS_API_KEY;
    this.sender = process.env.SMS_SENDER;

    // In production, missing config is a hard error we log loudly.
    if (this.provider !== 'mock' && (!this.apiKey || !this.sender)) {
      logger.warn('[SMS] Missing SMS_API_KEY or SMS_SENDER — SMS sending will fail.');
    }
  }

  /**
   * Send an OTP / password-reset code to a phone number.
   * @param {string} phone - Recipient phone, expected format "09xxxxxxxxx".
   * @param {string} code  - 6-digit numeric code.
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendOtp(phone, code) {
    if (!phone || !code) {
      return { success: false, error: 'phone and code are required' };
    }

    const message = `کد بازیابی رمز عبور شما: ${code}\nاین کد تا ۱۵ دقیقه اعتبار دارد.\nاگر شما این درخواست را نداده‌اید، آن را نادیده بگیرید.`;

    try {
      if (this.provider === 'mock') {
        logger.info(`[SMS:mock] would send to ${phone}: ${code}`);
        return { success: true, messageId: 'mock-' + Date.now() };
      }

      if (this.provider === 'kavenegar') {
        return await this._sendKavenegar(phone, message);
      }

      return { success: false, error: `Unsupported SMS provider: ${this.provider}` };
    } catch (err) {
      // Never leak the API key or full response in the error log.
      const safeMessage = err.response && err.response.data
        ? JSON.stringify(err.response.data).slice(0, 300)
        : err.message;
      logger.error('[SMS] sendOtp failed', { phone, error: safeMessage });
      return { success: false, error: 'SMS sending failed' };
    }
  }

  /**
   * Internal: send a plain message via Kavenegar REST API.
   * Docs: https://kavenegar.com/rest.html#sms-send
   */
  async _sendKavenegar(receptor, message) {
    const url = `${KAVENEGAR_BASE_URL}/${this.apiKey}/sms/send.json`;

    const response = await axios.get(url, {
      params: {
        receptor,
        message,
        sender: this.sender
      },
      timeout: DEFAULT_TIMEOUT_MS
    });

    // Kavenegar always returns HTTP 200 with a "return.status" field.
    // status === 200 means accepted for delivery.
    const body = response.data || {};
    const status = body.return && body.return.status;

    if (status !== 200) {
      const statusMessage = (body.return && body.return.message) || 'unknown error';
      logger.error('[SMS] Kavenegar rejected the request', { status, statusMessage });
      return { success: false, error: `Kavenegar error ${status}` };
    }

    const entry = Array.isArray(body.entries) ? body.entries[0] : null;
    const messageId = entry ? String(entry.messageid) : undefined;

    logger.info('[SMS] OTP sent', { phone: receptor, messageId });
    return { success: true, messageId };
  }
}

// Export a singleton — the service is stateless, so one instance is enough.
module.exports = new SmsService();