const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    date: { type: Date, required: true }, // normalized to midnight UTC
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    markedBy: {
      type: String,
      enum: ['owner', 'trainer', 'self'],
      default: 'owner',
    },
    pointsAwarded: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Prevent duplicate attendance on same day
attendanceSchema.index({ member: 1, date: 1 }, { unique: true });
attendanceSchema.index({ gym: 1, date: 1 });
attendanceSchema.index({ owner: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
