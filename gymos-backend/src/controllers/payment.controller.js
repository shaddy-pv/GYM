const Payment = require('../models/Payment.model');
const Member = require('../models/Member.model');
const MembershipPlan = require('../models/MembershipPlan.model');
const { generateReceiptNumber } = require('../utils/generateReceiptNumber');
const { generatePdfReceipt } = require('../utils/generatePdfReceipt');
const { sendWhatsApp, paymentReceiptMessage } = require('../utils/sendWhatsApp');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/ApiResponse');

// ─── Create Payment ───────────────────────────────────────────────────────────
const createPayment = async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const { memberId, membershipPlanId, amount, method, status = 'paid', notes, paidAt, dueDate } = req.body;

    // Step 1: Validate member
    const member = await Member.findOne({ _id: memberId, gym: gymId });
    if (!member) return errorResponse(res, 'Member not found', null, 404);

    // Step 2: Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Step 3: Get plan if provided
    let plan = null;
    if (membershipPlanId) {
      plan = await MembershipPlan.findOne({ _id: membershipPlanId, gym: gymId });
    }

    // Step 4: Calculate new expiry
    const now = new Date();
    let periodStart, periodEnd;
    if (plan && status === 'paid') {
      const baseDate = member.expiryDate > now ? member.expiryDate : now;
      periodStart = new Date(baseDate);
      periodEnd = new Date(baseDate);
      periodEnd.setDate(periodEnd.getDate() + plan.durationDays);
    }

    // Step 5: Create payment record
    const payment = await Payment.create({
      member: memberId,
      gym: gymId,
      owner: req.owner._id,
      membershipPlan: membershipPlanId || null,
      amount,
      method,
      status,
      receiptNumber,
      paidAt: status === 'paid' ? (paidAt ? new Date(paidAt) : now) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      periodStart,
      periodEnd,
    });

    // Step 6: If paid + plan, extend member expiry
    if (plan && status === 'paid') {
      await Member.findByIdAndUpdate(memberId, {
        expiryDate: periodEnd,
        membershipPlan: membershipPlanId,
        status: 'active',
        isActive: true,
      });
    }

    // Step 7: Send WhatsApp receipt (non-blocking)
    if (member.notifyWhatsApp && status === 'paid') {
      sendWhatsApp(
        member.phone,
        paymentReceiptMessage({
          gymName: req.gym.name,
          receiptNumber,
          amount,
          planName: plan?.name || 'Membership',
          expiryDate: periodEnd || member.expiryDate,
        }),
      ).catch(() => {});
    }

    // Trigger Admin Notification
    const Notification = require('../models/Notification.model');
    await Notification.create({
      gym: gymId,
      targetRole: 'admin',
      type: 'payment_received',
      title: 'Payment Received 💰',
      message: `₹${amount} received from ${member.name} for ${plan?.name || 'Membership'}.`,
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('member', 'name memberId phone')
      .populate('membershipPlan', 'name durationDays');

    return successResponse(res, 'Payment recorded successfully', populatedPayment, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Get Payments ─────────────────────────────────────────────────────────────
const getPayments = async (req, res, next) => {
  try {
    const { month, status, memberId, page = 1, limit = 20 } = req.query;
    const filter = { gym: req.params.gymId };

    if (status) filter.status = status;
    if (memberId) filter.member = memberId;

    if (month) {
      const [year, m] = month.split('-').map(Number);
      filter.createdAt = {
        $gte: new Date(year, m - 1, 1),
        $lte: new Date(year, m, 0, 23, 59, 59),
      };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('member', 'name memberId phone')
        .populate('membershipPlan', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(filter),
    ]);

    return paginatedResponse(res, 'Payments fetched', payments, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

const mongoose = require('mongoose');

// ─── Revenue Stats ────────────────────────────────────────────────────────────
const getPaymentStats = async (req, res, next) => {
  try {
    const gymId = new mongoose.Types.ObjectId(req.params.gymId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [monthRevenue, yearRevenue, allTimeRevenue, pending] = await Promise.all([
      Payment.aggregate([
        { $match: { gym: gymId, status: 'paid', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { gym: gymId, status: 'paid', createdAt: { $gte: yearStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { gym: gymId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { gym: gymId, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return successResponse(res, 'Payment stats fetched', {
      thisMonth: { revenue: monthRevenue[0]?.total || 0, count: monthRevenue[0]?.count || 0 },
      thisYear: { revenue: yearRevenue[0]?.total || 0 },
      allTime: { revenue: allTimeRevenue[0]?.total || 0 },
      pending: { amount: pending[0]?.total || 0, count: pending[0]?.count || 0 },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Pending Dues ─────────────────────────────────────────────────────────────
const getPendingDues = async (req, res, next) => {
  try {
    const dues = await Payment.find({ gym: req.params.gymId, status: 'pending' })
      .populate('member', 'name memberId phone')
      .populate('membershipPlan', 'name')
      .sort({ dueDate: 1 });

    const totalDue = dues.reduce((sum, p) => sum + p.amount, 0);
    return successResponse(res, 'Pending dues fetched', { totalDue, count: dues.length, dues });
  } catch (error) {
    next(error);
  }
};

// ─── Single Payment ───────────────────────────────────────────────────────────
const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.paymentId, gym: req.params.gymId })
      .populate('member', 'name memberId phone email')
      .populate('membershipPlan', 'name durationDays price');

    if (!payment) return errorResponse(res, 'Payment not found', null, 404);
    return successResponse(res, 'Payment fetched', payment);
  } catch (error) {
    next(error);
  }
};

// ─── Generate PDF Receipt ─────────────────────────────────────────────────────
const generateReceipt = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.paymentId, gym: req.params.gymId })
      .populate('member', 'name memberId phone email')
      .populate('membershipPlan', 'name durationDays price');

    if (!payment) return errorResponse(res, 'Payment not found', null, 404);

    const pdfBuffer = await generatePdfReceipt({ payment, gym: req.gym });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.receiptNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// ─── Delete Payment ───────────────────────────────────────────────────────────
const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.paymentId, gym: req.params.gymId });
    if (!payment) return errorResponse(res, 'Payment not found', null, 404);
    return successResponse(res, 'Payment deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentStats,
  getPendingDues,
  getPayment,
  generateReceipt,
  deletePayment,
};
