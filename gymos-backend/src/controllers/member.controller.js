const Member = require('../models/Member.model');
const MembershipPlan = require('../models/MembershipPlan.model');
const Payment = require('../models/Payment.model');
const Attendance = require('../models/Attendance.model');
const PointsHistory = require('../models/PointsHistory.model');
const WorkoutLog = require('../models/WorkoutLog.model');
const Subscription = require('../models/Subscription.model');
const { generateMemberId } = require('../utils/generateMemberId');
const { generatePassword } = require('../utils/generatePassword');
const { generateReceiptNumber } = require('../utils/generateReceiptNumber');
const { uploadToCloudinary } = require('../config/cloudinary');
const { sendWhatsApp, welcomeMessage } = require('../utils/sendWhatsApp');
const { sendEmail, memberWelcomeEmail } = require('../utils/sendEmail');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/ApiResponse');

// ─── Create Member ────────────────────────────────────────────────────────────
const createMember = async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const gym = req.gym;

    // Check subscription member limit
    const subscription = await Subscription.findOne({ owner: req.owner._id });
    if (subscription?.maxMembersPerGym) {
      const memberCount = await Member.countDocuments({ gym: gymId });
      if (memberCount >= subscription.maxMembersPerGym) {
        return errorResponse(
          res,
          `Your plan allows a maximum of ${subscription.maxMembersPerGym} members per gym.`,
          null,
          403,
        );
      }
    }

    // Step 1: Validate plan exists
    const plan = await MembershipPlan.findOne({ _id: req.body.membershipPlanId, gym: gymId, isActive: true });
    if (!plan) {
      return errorResponse(res, 'Membership plan not found or inactive', null, 404);
    }

    // Step 2: Check phone uniqueness in this gym
    const existingPhone = await Member.findOne({ gym: gymId, phone: req.body.phone });
    if (existingPhone) {
      return errorResponse(res, 'A member with this phone number already exists in this gym', null, 409);
    }

    // Step 3: Generate memberId
    const memberId = await generateMemberId(gym.slug);

    // Step 4: Generate password
    const rawPassword = generatePassword();

    // Step 5: Calculate expiry date
    const joinDate = new Date();
    const expiryDate = new Date(joinDate);
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    // Step 6: Build member data
    const memberData = {
      gym: gymId,
      owner: req.owner._id,
      memberId,
      password: rawPassword, // hashed in pre-save
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      membershipPlan: plan._id,
      trainer: req.body.trainerId || null,
      joinDate,
      expiryDate,
      status: 'active',
      dateOfBirth: req.body.dateOfBirth || null,
      gender: req.body.gender || null,
      height: req.body.height || null,
      weight: req.body.weight || null,
      goals: req.body.goals || [],
      healthNotes: req.body.healthNotes || null,
      emergencyContact: req.body.emergencyContact || {},
      notifyWhatsApp: req.body.notifyWhatsApp !== undefined ? req.body.notifyWhatsApp : true,
      notifyEmail: req.body.notifyEmail || false,
    };

    if (req.file) {
      const { url } = await uploadToCloudinary(req.file.buffer, 'gymos/members');
      memberData.profilePhoto = url;
    }

    // Step 7: Create member
    const member = await Member.create(memberData);

    // Step 8: Create initial payment record
    const receiptNumber = await generateReceiptNumber();
    await Payment.create({
      member: member._id,
      gym: gymId,
      owner: req.owner._id,
      membershipPlan: plan._id,
      amount: plan.price,
      method: req.body.paymentMethod || 'cash',
      status: 'paid',
      paidAt: new Date(),
      receiptNumber,
      periodStart: joinDate,
      periodEnd: expiryDate,
    });

    // Step 9: Send WhatsApp welcome (non-blocking)
    if (member.notifyWhatsApp) {
      sendWhatsApp(
        member.phone,
        welcomeMessage({
          gymName: gym.name,
          memberId,
          password: rawPassword,
          planName: plan.name,
          expiryDate,
        }),
      ).catch(() => {}); // silently handle failures
    }

    // Send email if opted in
    if (member.notifyEmail && member.email) {
      const { subject, html } = memberWelcomeEmail({
        memberName: member.name,
        gymName: gym.name,
        memberId,
        password: rawPassword,
        expiryDate,
      });
      sendEmail({ to: member.email, subject, html }).catch(() => {});
    }

    // Trigger Admin Notification
    const Notification = require('../models/Notification.model');
    await Notification.create({
      gym: gymId,
      targetRole: 'admin',
      type: 'new_member',
      title: 'New Member Joined 🎉',
      message: `${member.name} just signed up for the ${plan.name} plan.`,
    });

    // Return member without password
    const safeResponse = {
      ...member.toJSON(),
      temporaryPassword: rawPassword, // Only shown once in API response
    };

    return successResponse(res, 'Member created successfully', safeResponse, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Get Members (Paginated + Filtered) ──────────────────────────────────────
const getMembers = async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const { status, search, trainer, page = 1, limit = 20 } = req.query;

    const filter = { gym: gymId };

    if (status === 'expiring') {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      filter.status = 'active';
      filter.expiryDate = { $lte: weekFromNow, $gte: new Date() };
    } else if (status) {
      filter.status = status;
    }

    if (trainer) filter.trainer = trainer;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [members, total] = await Promise.all([
      Member.find(filter)
        .populate('membershipPlan', 'name durationDays price')
        .populate('trainer', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Member.countDocuments(filter),
    ]);

    return paginatedResponse(res, 'Members fetched', members, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

// ─── Get Single Member ────────────────────────────────────────────────────────
const getMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({ _id: req.params.memberId, gym: req.params.gymId })
      .populate('membershipPlan')
      .populate('trainer', 'name phone specialization')
      .populate('exercisePlan')
      .populate('mealPlan');

    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, 'Member fetched', member);
  } catch (error) {
    next(error);
  }
};

// ─── Update Member ────────────────────────────────────────────────────────────
const updateMember = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      const { url } = await uploadToCloudinary(req.file.buffer, 'gymos/members');
      updateData.profilePhoto = url;
    }

    const member = await Member.findOneAndUpdate(
      { _id: req.params.memberId, gym: req.params.gymId },
      updateData,
      { new: true, runValidators: true },
    );
    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, 'Member updated', member);
  } catch (error) {
    next(error);
  }
};

// ─── Delete Member ────────────────────────────────────────────────────────────
const deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findOneAndDelete({ _id: req.params.memberId, gym: req.params.gymId });
    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, 'Member removed');
  } catch (error) {
    next(error);
  }
};

// ─── Assign Trainer ───────────────────────────────────────────────────────────
const assignTrainer = async (req, res, next) => {
  try {
    const { trainerId } = req.body;
    const member = await Member.findOneAndUpdate(
      { _id: req.params.memberId, gym: req.params.gymId },
      { trainer: trainerId || null },
      { new: true },
    );
    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, trainerId ? 'Trainer assigned' : 'Trainer removed', member);
  } catch (error) {
    next(error);
  }
};

// ─── Assign Exercise Plan ─────────────────────────────────────────────────────
const assignExercisePlan = async (req, res, next) => {
  try {
    const { exercisePlanId } = req.body;
    const member = await Member.findOneAndUpdate(
      { _id: req.params.memberId, gym: req.params.gymId },
      { exercisePlan: exercisePlanId || null },
      { new: true },
    );
    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, 'Exercise plan assigned', member);
  } catch (error) {
    next(error);
  }
};

// ─── Assign Meal Plan ─────────────────────────────────────────────────────────
const assignMealPlan = async (req, res, next) => {
  try {
    const { mealPlanId } = req.body;
    const member = await Member.findOneAndUpdate(
      { _id: req.params.memberId, gym: req.params.gymId },
      { mealPlan: mealPlanId || null },
      { new: true },
    );
    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, 'Meal plan assigned', member);
  } catch (error) {
    next(error);
  }
};

// ─── Suspend / Activate ───────────────────────────────────────────────────────
const suspendMember = async (req, res, next) => {
  try {
    const member = await Member.findOneAndUpdate(
      { _id: req.params.memberId, gym: req.params.gymId },
      { status: 'suspended', isActive: false },
      { new: true },
    );
    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, 'Member suspended', member);
  } catch (error) {
    next(error);
  }
};

const activateMember = async (req, res, next) => {
  try {
    const member = await Member.findOneAndUpdate(
      { _id: req.params.memberId, gym: req.params.gymId },
      { status: 'active', isActive: true },
      { new: true },
    );
    if (!member) return errorResponse(res, 'Member not found', null, 404);
    return successResponse(res, 'Member activated', member);
  } catch (error) {
    next(error);
  }
};

// ─── Reset Password ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const member = await Member.findOne({ _id: req.params.memberId, gym: req.params.gymId });
    if (!member) return errorResponse(res, 'Member not found', null, 404);

    const newPassword = generatePassword();
    member.password = newPassword;
    await member.save();

    // Re-send WhatsApp/Email if configured
    if (member.notifyWhatsApp) {
      sendWhatsApp(
        member.phone,
        `🔑 *Password Reset*\n\nHi ${member.name},\nYour new password for GymOS is:\n*${newPassword}*\n\nLogin at: ${process.env.MEMBER_URL || 'app.gymOS.com'}`
      ).catch(() => {});
    }

    return successResponse(res, 'Password reset successfully', { newPassword });
  } catch (error) {
    next(error);
  }
};

// ─── Member Stats ─────────────────────────────────────────────────────────────
const getMemberStats = async (req, res, next) => {
  try {
    const memberId = req.params.memberId;
    const gymId = req.params.gymId;

    const member = await Member.findOne({ _id: memberId, gym: gymId })
      .populate('membershipPlan', 'name durationDays price')
      .populate('trainer', 'name phone')
      .populate('exercisePlan', 'name goal')
      .populate('mealPlan', 'name goal');

    if (!member) return errorResponse(res, 'Member not found', null, 404);

    const [attendanceCount, recentPayments, pointsHistory, recentWorkouts] = await Promise.all([
      Attendance.countDocuments({ member: memberId }),
      Payment.find({ member: memberId }).sort({ createdAt: -1 }).limit(5),
      PointsHistory.find({ member: memberId }).sort({ createdAt: -1 }).limit(10),
      WorkoutLog.find({ member: memberId }).sort({ date: -1 }).limit(7),
    ]);

    return successResponse(res, 'Member stats fetched', {
      member,
      stats: {
        totalAttendance: attendanceCount,
        totalPoints: member.totalPoints,
        currentStreak: member.currentStreak,
        longestStreak: member.longestStreak,
        badges: member.badges,
      },
      recentPayments,
      pointsHistory,
      recentWorkouts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMember,
  getMembers,
  getMember,
  updateMember,
  deleteMember,
  assignTrainer,
  assignExercisePlan,
  assignMealPlan,
  suspendMember,
  activateMember,
  getMemberStats,
  resetPassword,
};
