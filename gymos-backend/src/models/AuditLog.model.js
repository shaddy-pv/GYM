const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // gym may be null for global auth events (e.g., login, forgot-password)
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', default: null },
    action: { type: String, required: true, index: true },
    performedBy: {
      // userId may be null for unauthenticated events (e.g., failed login attempt)
      userId: { type: mongoose.Schema.Types.ObjectId, default: null },
      role: { type: String, enum: ['owner', 'trainer', 'member', 'system', 'anonymous'], default: 'system' },
      name: { type: String, default: 'System' },
    },
    targetModel: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.Mixed }, // Mixed to allow string (email/memberId) for auth events
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String }, // Added for security forensics
  },
  { timestamps: true }
);

auditLogSchema.index({ gym: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'performedBy.userId': 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
