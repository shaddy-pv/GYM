const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    membershipPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', default: null },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number }, // Usually amount - paidAmount
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'system_generated', 'mixed'],
      default: 'system_generated',
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'partially_paid', 'pending', 'overdue', 'waived', 'failed'],
      default: 'pending',
    },
    paidAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    receiptNumber: { type: String, unique: true },
    notes: { type: String, trim: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    billingPeriodKey: { type: String, default: null }, // e.g., memberId_YYYY_MM
    transactions: [
      {
        amount: { type: Number, required: true },
        method: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer'], required: true },
        paidAt: { type: Date, default: Date.now },
        receiptNumber: { type: String },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
        notes: { type: String, trim: true },
      }
    ],
  },
  { timestamps: true },
);

paymentSchema.index({ gym: 1, status: 1 });
paymentSchema.index({ member: 1 });
paymentSchema.index({ owner: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
