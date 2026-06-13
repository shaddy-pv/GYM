const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');

/**
 * Utility to record sensitive actions to the AuditLog collection.
 * This is fully asynchronous and non-blocking — failures are logged, not thrown.
 *
 * @param {Object} options
 * @param {Object}  [options.req]         - Express request object (to extract IP, userAgent, actor)
 * @param {String}  [options.gymId]       - Gym ID (may be null for global auth events)
 * @param {String}   options.action       - Action name (e.g., 'OWNER_LOGIN', 'DELETE_MEMBER')
 * @param {String}   options.targetModel  - Model being affected (e.g., 'Member', 'Payment', 'Owner')
 * @param {*}       [options.targetId]    - ID or identifier of the affected document
 * @param {Object}  [options.details]     - Any additional context (reason, old state, email, etc.)
 * @param {Object}  [options.actorOverride] - Manually set performer (for non-req contexts like cron jobs)
 */
const auditLog = async ({ req, gymId, action, targetModel, targetId, details = {}, actorOverride } = {}) => {
  try {
    let performedBy = {
      userId: null,
      role: 'anonymous',
      name: 'Unknown',
    };

    // Use manual override first (e.g., for cron jobs)
    if (actorOverride) {
      performedBy = actorOverride;
    } else if (req?.owner) {
      performedBy = {
        userId: req.owner._id,
        role: 'owner',
        name: req.owner.name,
      };
    } else if (req?.trainer) {
      performedBy = {
        userId: req.trainer._id,
        role: 'trainer',
        name: req.trainer.name,
      };
    } else if (req?.member) {
      performedBy = {
        userId: req.member._id,
        role: 'member',
        name: req.member.name,
      };
    }

    // Extract IP — trust X-Forwarded-For when behind a proxy (Render, Vercel)
    const ipAddress =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      null;

    const userAgent = req?.headers?.['user-agent'] || null;

    await AuditLog.create({
      gym: gymId || null,
      action,
      performedBy,
      targetModel,
      targetId: targetId || null,
      details,
      ipAddress,
      userAgent,
    });

  } catch (error) {
    // Never crash the main request because of a logging failure
    logger.error(`[AuditLogger] Failed to record audit log for action "${action}": ${error.message}`);
  }
};

module.exports = { auditLog };
