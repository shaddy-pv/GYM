const PointsHistory = require('../models/PointsHistory.model');
const Member = require('../models/Member.model');
const { auditLog } = require('../utils/auditLogger');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/ApiResponse');

// ─── Get Points History ───────────────────────────────────────────────────────
const getPointsHistory = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    const filter = { member: memberId, gym: req.params.gymId };
    if (type) filter.type = type;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [history, total] = await Promise.all([
      PointsHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      PointsHistory.countDocuments(filter),
    ]);

    return paginatedResponse(res, 'Points history fetched', history, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

// ─── Award Manual Points ──────────────────────────────────────────────────────
const awardPoints = async (req, res, next) => {
  try {
    const { memberId, points, description } = req.body;

    if (!points || points <= 0) {
      return errorResponse(res, 'Points must be a positive number', null, 400);
    }

    const member = await Member.findOne({ _id: memberId, gym: req.params.gymId });
    if (!member) return errorResponse(res, 'Member not found', null, 404);

    await PointsHistory.create({
      member: memberId,
      gym: req.params.gymId,
      points,
      type: 'manual_award',
      description: description || 'Manual points award',
    });

    const updated = await Member.findByIdAndUpdate(
      memberId,
      { $inc: { totalPoints: points } },
      { new: true },
    );

    await auditLog({
      req,
      gymId: req.params.gymId,
      action: 'AWARD_POINTS',
      targetModel: 'Member',
      targetId: memberId,
      details: { points, description: description || 'Manual points award' },
    });

    return successResponse(res, 'Points awarded', {
      member: { id: updated._id, name: updated.name, totalPoints: updated.totalPoints },
      pointsAwarded: points,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Deduct Points ────────────────────────────────────────────────────────────
const deductPoints = async (req, res, next) => {
  try {
    const { memberId, points, description } = req.body;

    if (!points || points <= 0) {
      return errorResponse(res, 'Points must be a positive number', null, 400);
    }

    const member = await Member.findOne({ _id: memberId, gym: req.params.gymId });
    if (!member) return errorResponse(res, 'Member not found', null, 404);

    if (member.totalPoints < points) {
      return errorResponse(res, `Member only has ${member.totalPoints} points. Cannot deduct ${points}.`, null, 400);
    }

    await PointsHistory.create({
      member: memberId,
      gym: req.params.gymId,
      points: -points,
      type: 'deduction',
      description: description || 'Manual points deduction',
    });

    const updated = await Member.findByIdAndUpdate(
      memberId,
      { $inc: { totalPoints: -points } },
      { new: true },
    );

    await auditLog({
      req,
      gymId: req.params.gymId,
      action: 'DEDUCT_POINTS',
      targetModel: 'Member',
      targetId: memberId,
      details: { points, description: description || 'Manual points deduction' },
    });

    return successResponse(res, 'Points deducted', {
      member: { id: updated._id, name: updated.name, totalPoints: updated.totalPoints },
      pointsDeducted: points,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPointsHistory, awardPoints, deductPoints };
