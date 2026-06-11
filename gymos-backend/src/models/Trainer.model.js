const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    profilePhoto: { type: String, default: null },
    specialization: [{ type: String, trim: true }],
    experience: { type: Number, default: 0 }, // years
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

trainerSchema.index({ gym: 1 });
trainerSchema.index({ owner: 1 });
trainerSchema.index({ gym: 1, phone: 1 }, { unique: true });

const Trainer = mongoose.model('Trainer', trainerSchema);
module.exports = Trainer;
