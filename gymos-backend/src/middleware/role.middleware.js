const { errorResponse } = require('../utils/ApiResponse');

/**
 * Role-based access control middleware
 * @param {'owner' | 'member'} ...roles
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    // Determine the current user's role
    const isOwner = !!req.owner;
    const isMember = !!req.member;

    if (roles.includes('owner') && isOwner) return next();
    if (roles.includes('member') && isMember) return next();

    return errorResponse(
      res,
      `Access denied. Required role: ${roles.join(' or ')}`,
      null,
      403,
    );
  };
};

module.exports = { checkRole };
