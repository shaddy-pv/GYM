const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner.model');
const Member = require('../models/Member.model');
const Subscription = require('../models/Subscription.model');
const { generateTokenPair, generateRefreshToken } = require('../utils/generateToken');
const { sendEmail, passwordResetEmail } = require('../utils/sendEmail');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

// ─── Owner Register ───────────────────────────────────────────────────────────
const registerOwner = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return errorResponse(res, 'Email already registered', null, 409);
    }

    // Create trial subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    const subscription = await Subscription.create({
      plan: 'starter',
      status: 'trial',
      trialEndsAt,
      maxGyms: 1,
      maxMembersPerGym: 100,
      features: { memberApp: false, whatsappAlerts: false, multiGym: false },
      owner: null, // set after owner creation
    });

    // Create owner (password is hashed in pre-save hook)
    const owner = await Owner.create({
      name,
      email,
      password,
      phone,
      subscription: subscription._id,
    });

    // Update subscription with owner ref
    subscription.owner = owner._id;
    await subscription.save();

    const { accessToken, refreshToken } = generateTokenPair({ id: owner._id, role: 'owner' });

    // Store refresh token
    await Owner.findByIdAndUpdate(owner._id, { refreshToken });

    return successResponse(
      res,
      'Owner registered successfully',
      { owner, accessToken, refreshToken },
      201,
    );
  } catch (error) {
    next(error);
  }
};

// ─── Owner Login ─────────────────────────────────────────────────────────────
const loginOwner = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const owner = await Owner.findOne({ email }).select('+password +refreshToken');
    if (!owner) {
      return errorResponse(res, 'Invalid email or password', null, 401);
    }

    if (!owner.isActive) {
      return errorResponse(res, 'Account is deactivated', null, 403);
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', null, 401);
    }

    const { accessToken, refreshToken } = generateTokenPair({ id: owner._id, role: 'owner' });
    owner.refreshToken = refreshToken;
    await owner.save({ validateBeforeSave: false });

    return successResponse(res, 'Login successful', {
      owner: owner.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return errorResponse(res, 'Refresh token required', null, 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return errorResponse(res, 'Invalid or expired refresh token', null, 401);
    }

    // Try owner first, then member
    let user, role;
    if (decoded.role === 'owner') {
      user = await Owner.findById(decoded.id).select('+refreshToken');
      role = 'owner';
    } else if (decoded.role === 'member') {
      user = await Member.findById(decoded.id).select('+refreshToken');
      role = 'member';
    }

    if (!user || user.refreshToken !== token) {
      return errorResponse(res, 'Invalid refresh token', null, 401);
    }

    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokenPair({
      id: user._id,
      role,
    });

    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, 'Tokens refreshed', {
      accessToken: newAccess,
      refreshToken: newRefresh,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    // Clear refresh token from DB (works for both owner and member)
    if (req.owner) {
      await Owner.findByIdAndUpdate(req.owner._id, { refreshToken: null });
    } else if (req.member) {
      await Member.findByIdAndUpdate(req.member._id, { refreshToken: null });
    }

    return successResponse(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const owner = await Owner.findOne({ email });
    // Always return 200 to prevent email enumeration
    if (!owner) {
      return successResponse(res, 'If this email is registered, a reset link has been sent');
    }

    // Generate secure reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15); // 15 minutes

    await Owner.findByIdAndUpdate(owner._id, {
      passwordResetToken: hashedToken,
      passwordResetExpiry: expiry,
    });

    const resetUrl = `${process.env.ADMIN_URL}/reset-password?token=${rawToken}`;
    const { subject, html } = passwordResetEmail({ ownerName: owner.name, resetUrl });

    await sendEmail({ to: owner.email, subject, html });

    return successResponse(res, 'If this email is registered, a reset link has been sent');
  } catch (error) {
    next(error);
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const owner = await Owner.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() },
    }).select('+password');

    if (!owner) {
      return errorResponse(res, 'Invalid or expired reset token', null, 400);
    }

    owner.password = password; // hashed in pre-save
    owner.passwordResetToken = null;
    owner.passwordResetExpiry = null;
    owner.refreshToken = null; // invalidate all sessions
    await owner.save();

    return successResponse(res, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Member Login ─────────────────────────────────────────────────────────────
const memberLogin = async (req, res, next) => {
  try {
    const { memberId, password } = req.body;

    const member = await Member.findOne({ memberId }).select('+password +refreshToken');
    if (!member) {
      return errorResponse(res, 'Invalid Member ID or password', null, 401);
    }

    if (!member.isActive) {
      return errorResponse(res, 'Member account is deactivated', null, 403);
    }

    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid Member ID or password', null, 401);
    }

    const { accessToken, refreshToken: rToken } = generateTokenPair({ id: member._id, role: 'member' });
    member.refreshToken = rToken;
    await member.save({ validateBeforeSave: false });

    return successResponse(res, 'Member login successful', {
      member: member.toJSON(),
      accessToken,
      refreshToken: rToken,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerOwner, loginOwner, refreshToken, logout, forgotPassword, resetPassword, memberLogin };
