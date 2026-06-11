const mongoose = require('mongoose');
const slugify = require('slugify');

const gymSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    logo: { type: String, default: null },
    coverPhoto: { type: String, default: null },
    timings: {
      open: { type: String }, // "06:00 AM"
      close: { type: String }, // "10:00 PM"
      daysOpen: [{ type: String }], // ["Mon","Tue",...]
    },
    isActive: { type: Boolean, default: true },
    pointsConfig: {
      perExercise: { type: Number, default: 15 },
      perAttendance: { type: Number, default: 10 },
      fullWorkoutBonus: { type: Number, default: 50 },
      streakBonus: {
        days: { type: Number, default: 7 },
        points: { type: Number, default: 100 },
      },
    },
  },
  { timestamps: true },
);

// Auto-generate slug from name
gymSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) return next();

  const baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let count = 0;

  // Ensure uniqueness
  while (true) {
    const existing = await mongoose.model('Gym').findOne({ slug, _id: { $ne: this._id } });
    if (!existing) break;
    count++;
    slug = `${baseSlug}-${count}`;
  }

  this.slug = slug;
  next();
});

gymSchema.index({ owner: 1 });

const Gym = mongoose.model('Gym', gymSchema);
module.exports = Gym;
