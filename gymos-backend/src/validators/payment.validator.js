const { z } = require('zod');

const createPaymentSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  membershipPlanId: z.string().optional(),
  // amount is optional when a plan is selected (plan.price is used as invoice total)
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  // initialPayment: how much was collected today (0 = fully pending due)
  initialPayment: z.coerce.number().min(0).optional().default(0),
  method: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'system_generated', 'mixed']).optional().default('system_generated'),
  paidAt: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

module.exports = { createPaymentSchema };
