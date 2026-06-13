const Payment = require('../models/Payment.model');
const Member = require('../models/Member.model');
const MembershipPlan = require('../models/MembershipPlan.model');
const { generateReceiptNumber } = require('../utils/generateReceiptNumber');
const { generatePdfReceipt } = require('../utils/generatePdfReceipt');
const { sendWhatsApp, paymentReceiptMessage } = require('../utils/sendWhatsApp');
const { auditLog } = require('../utils/auditLogger');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/ApiResponse');

// ─── Create Payment ───────────────────────────────────────────────────────────
const createPayment = async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const { memberId, membershipPlanId, amount, initialPayment = 0, method, notes, paidAt, dueDate } = req.body;

    // Step 1.5: Validate member (below) then resolve plan
    // The invoice total is ALWAYS the plan price when a plan is selected.
    // `amount` is only used for custom invoices with no plan.

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

    // Step 3a: Determine invoice total
    // When a plan is selected, the invoice total ALWAYS = plan.price. Never less, never more.
    // `amount` from request is only used for custom invoices (no plan).
    const invoiceTotal = plan ? plan.price : Number(amount);
    if (!invoiceTotal || invoiceTotal <= 0) {
      return errorResponse(res, 'Invoice amount must be greater than 0', null, 400);
    }

    // Step 3b: Determine how much was paid today (0 = fully pending due)
    const paidNow = Math.min(Number(initialPayment) || 0, invoiceTotal);
    const remainingBalance = invoiceTotal - paidNow;

    // Step 3c: Auto-derive status — the UI no longer needs to guess
    let status;
    if (paidNow >= invoiceTotal) {
      status = 'paid';
    } else if (paidNow > 0) {
      status = 'partially_paid';
    } else {
      status = 'pending';
    }

    // Step 4: Calculate membership period (only extend on full payment)
    const now = new Date();
    let periodStart, periodEnd;
    if (plan && status === 'paid') {
      const baseDate = member.expiryDate > now ? member.expiryDate : now;
      periodStart = new Date(baseDate);
      periodEnd = new Date(baseDate);
      periodEnd.setDate(periodEnd.getDate() + plan.durationDays);
    }

    // Step 5: Create the invoice / payment record
    const payment = await Payment.create({
      member: memberId,
      gym: gymId,
      owner: req.owner._id,
      membershipPlan: membershipPlanId || null,
      amount: invoiceTotal,         // Face value of the invoice — always the plan price
      paidAmount: paidNow,           // Amount collected today
      balanceAmount: remainingBalance, // Amount still owed
      method: paidNow > 0 ? (method || 'cash') : 'system_generated',
      status,
      receiptNumber,
      paidAt: status === 'paid' ? (paidAt ? new Date(paidAt) : now) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      periodStart,
      periodEnd,
      transactions: paidNow > 0 ? [{
        amount: paidNow,
        method: method || 'cash',
        paidAt: paidAt ? new Date(paidAt) : now,
        receiptNumber,
        recordedBy: req.owner._id,
        notes: paidNow >= invoiceTotal
          ? (notes || 'Full payment at creation')
          : `Deposit: ₹${paidNow} of ₹${invoiceTotal} (Balance: ₹${remainingBalance})`,
      }] : [],
    });

    // Step 6: If fully paid + plan, extend member expiry
    if (plan && status === 'paid') {
      await Member.findByIdAndUpdate(memberId, {
        expiryDate: periodEnd,
        membershipPlan: membershipPlanId,
        status: 'active',
        isActive: true,
      });
    }

    // Step 7: Send WhatsApp receipt (non-blocking, only on full payment)
    if (member.notifyWhatsApp && status === 'paid') {
      sendWhatsApp(
        member.phone,
        paymentReceiptMessage({
          gymName: req.gym.name,
          receiptNumber,
          amount: invoiceTotal,
          planName: plan?.name || 'Membership',
          expiryDate: periodEnd || member.expiryDate,
        }),
      ).catch(() => {});
    }

    // Trigger Admin Notification
    const Notification = require('../models/Notification.model');
    const notifMsg = paidNow >= invoiceTotal
      ? `₹${invoiceTotal} received from ${member.name} for ${plan?.name || 'Membership'}.`
      : `Due of ₹${invoiceTotal} created for ${member.name}. Deposit: ₹${paidNow}. Balance: ₹${remainingBalance}.`;
    await Notification.create({
      gym: gymId,
      targetRole: 'admin',
      type: 'payment_received',
      title: status === 'paid' ? 'Payment Received 💰' : 'Invoice Created 📄',
      message: notifMsg,
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('member', 'name memberId phone')
      .populate('membershipPlan', 'name durationDays');

    await auditLog({
      req,
      gymId,
      action: 'CREATE_PAYMENT',
      targetModel: 'Payment',
      targetId: payment._id,
      details: { amount: invoiceTotal, paidAmount: paidNow, status },
    });

    return successResponse(res, 'Payment recorded successfully', populatedPayment, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Record Partial Payment ───────────────────────────────────────────────────
const recordPartialPayment = async (req, res, next) => {
  try {
    const { paymentId, gymId } = req.params;
    const { amount, method, notes } = req.body;

    const payment = await Payment.findOne({ _id: paymentId, gym: gymId }).populate('member').populate('membershipPlan');
    if (!payment) return errorResponse(res, 'Payment/Due not found', null, 404);

    if (payment.status === 'paid' || payment.status === 'waived') {
      return errorResponse(res, `Cannot add payment to a ${payment.status} due`, null, 400);
    }

    if (amount > payment.balanceAmount) {
      return errorResponse(res, `Amount exceeds the remaining balance of ₹${payment.balanceAmount}`, null, 400);
    }

    const receiptNumber = await generateReceiptNumber();
    
    payment.paidAmount += amount;
    payment.balanceAmount -= amount;
    
    payment.transactions.push({
      amount,
      method,
      paidAt: new Date(),
      receiptNumber,
      recordedBy: req.owner._id,
      notes,
    });

    if (payment.balanceAmount <= 0) {
      payment.status = 'paid';
      payment.paidAt = new Date();
      
      // Extend membership if this was tied to a plan
      if (payment.membershipPlan && payment.member) {
        const now = new Date();
        const baseDate = payment.member.expiryDate > now ? payment.member.expiryDate : now;
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + payment.membershipPlan.durationDays);
        
        await Member.findByIdAndUpdate(payment.member._id, {
          expiryDate: newExpiry,
          membershipPlan: payment.membershipPlan._id,
          status: 'active',
          isActive: true,
        });
      }
    } else {
      payment.status = 'partially_paid';
    }

    await payment.save();

    // Trigger Admin Notification
    const Notification = require('../models/Notification.model');
    await Notification.create({
      gym: gymId,
      targetRole: 'admin',
      type: 'payment_received',
      title: 'Partial Payment Received 💰',
      message: `₹${amount} received from ${payment.member.name} for balance. Remaining: ₹${payment.balanceAmount}`,
    });

    return successResponse(res, 'Payment recorded successfully', payment);
  } catch (error) {
    next(error);
  }
};

// ─── Waive Due ────────────────────────────────────────────────────────────────
const waiveDue = async (req, res, next) => {
  try {
    const { paymentId, gymId } = req.params;
    
    const payment = await Payment.findOne({ _id: paymentId, gym: gymId });
    if (!payment) return errorResponse(res, 'Due not found', null, 404);

    if (payment.status === 'paid' || payment.status === 'waived') {
      return errorResponse(res, `Due is already ${payment.status}`, null, 400);
    }

    const previousBalance = payment.balanceAmount;
    payment.status = 'waived';
    payment.balanceAmount = 0;
    payment.notes = payment.notes ? payment.notes + ' | Waived by Admin' : 'Waived by Admin';
    
    await payment.save();

    await auditLog({
      req,
      gymId,
      action: 'WAIVE_PAYMENT',
      targetModel: 'Payment',
      targetId: payment._id,
      details: { amountWaived: previousBalance },
    });

    return successResponse(res, 'Due waived successfully', payment);
  } catch (error) {
    next(error);
  }
};

// ─── Get Payments ─────────────────────────────────────────────────────────────
const getPayments = async (req, res, next) => {
  try {
    const { month, status, memberId, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
    const filter = { gym: req.params.gymId };

    if (status) {
      if (status.includes(',')) {
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = status;
      }
    }
    if (memberId) filter.member = memberId;

    if (month) {
      const [year, m] = month.split('-').map(Number);
      filter.createdAt = {
        $gte: new Date(year, m - 1, 1),
        $lte: new Date(year, m, 0, 23, 59, 59),
      };
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      const members = await Member.find({ gym: req.params.gymId, name: regex }).select('_id');
      const memberIds = members.map(m => m._id);
      filter.member = { $in: memberIds };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let sortOption = {};
    if (sortBy === 'amount') sortOption.amount = sortOrder === 'asc' ? 1 : -1;
    else if (sortBy === 'dueDate') sortOption.dueDate = sortOrder === 'asc' ? 1 : -1;
    else if (sortBy === 'status') sortOption.status = sortOrder === 'asc' ? 1 : -1;
    else sortOption.createdAt = sortOrder === 'asc' ? 1 : -1;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('member', 'name memberId phone')
        .populate('membershipPlan', 'name')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(filter),
    ]);

    // Client-side sort by Member Name if requested (since we can't sort by populated field easily in standard query)
    if (sortBy === 'memberName') {
      payments.sort((a, b) => {
        const nameA = a.member?.name || '';
        const nameB = b.member?.name || '';
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    }

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

    const [monthRevenue, outstanding, overdue, partiallyPaid, membersWithPending] = await Promise.all([
      // 1. Amount Collected This Month (includes transactions)
      Payment.aggregate([
        { $match: { gym: gymId } },
        { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: false } },
        { $match: { 'transactions.paidAt': { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$transactions.amount' }, count: { $sum: 1 } } }
      ]),
      // 2. Total Outstanding Amount (sum of balanceAmount for pending/partially_paid/overdue)
      Payment.aggregate([
        { $match: { gym: gymId, status: { $in: ['pending', 'partially_paid', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$balanceAmount' }, count: { $sum: 1 } } }
      ]),
      // 3. Total Overdue Amount (strict definition: due date has passed and balance is > 0)
      Payment.aggregate([
        { 
          $match: { 
            gym: gymId, 
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            dueDate: { $lt: new Date() }
          } 
        },
        { $group: { _id: null, total: { $sum: '$balanceAmount' }, count: { $sum: 1 } } }
      ]),
      // 4. Total Partially Paid Amount (the sum of paid amounts on partially paid invoices)
      Payment.aggregate([
        { $match: { gym: gymId, status: 'partially_paid' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } }
      ]),
      // 5. Number of Members with Pending Dues
      Payment.aggregate([
        { $match: { gym: gymId, status: { $in: ['pending', 'partially_paid', 'overdue'] } } },
        { $group: { _id: '$member' } },
        { $count: 'uniqueMembers' }
      ])
    ]);

    // If monthRevenue is empty, fallback to check just basic paid amounts created this month
    let collectedThisMonth = monthRevenue[0]?.total || 0;
    if (collectedThisMonth === 0) {
       const basicPaid = await Payment.aggregate([
        { $match: { gym: gymId, status: 'paid', paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      collectedThisMonth = basicPaid[0]?.total || 0;
    }

    return successResponse(res, 'Payment stats fetched', {
      collectedThisMonth,
      totalOutstanding: outstanding[0]?.total || 0,
      totalOverdue: overdue[0]?.total || 0,
      totalPartiallyPaid: partiallyPaid[0]?.total || 0,
      membersWithPendingCount: membersWithPending[0]?.uniqueMembers || 0,
      pendingCount: outstanding[0]?.count || 0
    });
  } catch (error) {
    next(error);
  }
};

// ─── Pending Dues ─────────────────────────────────────────────────────────────
const getPendingDues = async (req, res, next) => {
  try {
    const dues = await Payment.find({ gym: req.params.gymId, status: { $in: ['pending', 'partially_paid', 'overdue'] } })
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

    await auditLog({
      req,
      gymId: req.params.gymId,
      action: 'DELETE_PAYMENT',
      targetModel: 'Payment',
      targetId: payment._id,
      details: { amount: payment.amount, receiptNumber: payment.receiptNumber },
    });

    return successResponse(res, 'Payment deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  recordPartialPayment,
  waiveDue,
  getPayments,
  getPaymentStats,
  getPendingDues,
  getPayment,
  generateReceipt,
  deletePayment,
};
