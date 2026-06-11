const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    membershipPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', default: null },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed'],
      default: 'paid',
    },
    paidAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    receiptNumber: { type: String, unique: true },
    notes: { type: String, trim: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ gym: 1, status: 1 });
paymentSchema.index({ member: 1 });
paymentSchema.index({ owner: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
