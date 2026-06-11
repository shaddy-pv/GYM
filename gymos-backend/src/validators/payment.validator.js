const { z } = require('zod');

const createPaymentSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  membershipPlanId: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'upi', 'card', 'bank_transfer'], {
    errorMap: () => ({ message: 'Invalid payment method. Use: cash, upi, card, bank_transfer' }),
  }),
  status: z.enum(['paid', 'pending', 'failed']).optional().default('paid'),
  paidAt: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

module.exports = { createPaymentSchema };
