const Payment = require('../models/Payment.model');

/**
 * Generate a unique receipt number
 * Format: RCP-YYYY-NNNN (e.g., "RCP-2025-0042")
 * @returns {Promise<string>}
 */
const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;

  // Count payments this year
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const count = await Payment.countDocuments({ createdAt: { $gte: startOfYear } });
  const nextNumber = (count + 1).toString().padStart(4, '0');

  const candidate = `${prefix}${nextNumber}`;

  // Uniqueness guard
  const existing = await Payment.findOne({ receiptNumber: candidate });
  if (existing) {
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }

  return candidate;
};

module.exports = { generateReceiptNumber };
