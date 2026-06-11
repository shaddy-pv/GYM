const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner.model');
const Member = require('../models/Member.model');
const { errorResponse } = require('../utils/ApiResponse');

/**
 * Protect owner routes — verifies JWT, attaches req.owner
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access token required', null, 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (decoded.role !== 'owner') {
      return errorResponse(res, 'Unauthorized — owner token required', null, 401);
    }

    const owner = await Owner.findById(decoded.id).select('-password -refreshToken');

    if (!owner) {
      return errorResponse(res, 'Owner not found', null, 401);
    }

    if (!owner.isActive) {
      return errorResponse(res, 'Account is deactivated', null, 403);
    }

    req.owner = owner;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Access token expired', null, 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid access token', null, 401);
    }
    next(error);
  }
};

/**
 * Protect member routes — verifies JWT, attaches req.member
 */
const protectMember = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access token required', null, 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (decoded.role !== 'member') {
      return errorResponse(res, 'Unauthorized — member token required', null, 401);
    }

    const member = await Member.findById(decoded.id).select('-password -refreshToken');

    if (!member) {
      return errorResponse(res, 'Member not found', null, 401);
    }

    if (!member.isActive) {
      return errorResponse(res, 'Member account is deactivated', null, 403);
    }

    req.member = member;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Access token expired', null, 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid access token', null, 401);
    }
    next(error);
  }
};

/**
 * Optional auth — attaches req.owner or req.member if token present
 * Does not reject if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (decoded.role === 'owner') {
      req.owner = await Owner.findById(decoded.id).select('-password -refreshToken');
    } else if (decoded.role === 'member') {
      req.member = await Member.findById(decoded.id).select('-password -refreshToken');
    }
  } catch (_) {
    // Ignore token errors for optional auth
  }
  next();
};

module.exports = { protect, protectMember, optionalAuth };
