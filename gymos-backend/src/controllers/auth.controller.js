const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner.model');
const Member = require('../models/Member.model');
const Subscription = require('../models/Subscription.model');
const { generateTokenPair, generateRefreshToken } = require('../utils/generateToken');
const { sendEmail, passwordResetEmail, ownerWelcomeEmail, ownerLoginAlertEmail } = require('../utils/sendEmail');
const { sendWhatsApp, ownerWelcomeWhatsApp, ownerLoginAlertWhatsApp } = require('../utils/sendWhatsApp');
const { auditLog } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

// Helper: format a Date to readable date and time strings (IST-friendly)
const formatLoginDateTime = (date) => ({
  loginDate: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }),
  loginTime: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' }),
});

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

    // Send welcome email + WhatsApp (non-blocking — failures are logged, not thrown)
    const { subject: wSubject, html: wHtml } = ownerWelcomeEmail({ ownerName: owner.name, email: owner.email });
    sendEmail({ to: owner.email, subject: wSubject, html: wHtml }).catch(() => {});
    sendWhatsApp(owner.phone, ownerWelcomeWhatsApp({ ownerName: owner.name, email: owner.email })).catch(() => {});

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
      await auditLog({ req, action: 'OWNER_LOGIN_FAILED', targetModel: 'Owner', targetId: email, details: { reason: 'User not found' }, actorOverride: { userId: null, role: 'anonymous', name: 'Anonymous' } });
      return errorResponse(res, 'Invalid email or password', null, 401);
    }

    if (!owner.isActive) {
      await auditLog({ req, action: 'OWNER_LOGIN_FAILED', targetModel: 'Owner', targetId: owner._id, details: { reason: 'Deactivated' }, actorOverride: { userId: owner._id, role: 'owner', name: owner.name } });
      return errorResponse(res, 'Account is deactivated', null, 403);
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      await auditLog({ req, action: 'OWNER_LOGIN_FAILED', targetModel: 'Owner', targetId: owner._id, details: { reason: 'Invalid password' }, actorOverride: { userId: owner._id, role: 'owner', name: owner.name } });
      return errorResponse(res, 'Invalid email or password', null, 401);
    }

    const { accessToken, refreshToken } = generateTokenPair({ id: owner._id, role: 'owner' });
    owner.refreshToken = refreshToken;
    await owner.save({ validateBeforeSave: false });

    // Send login alert email + WhatsApp (non-blocking)
    const { loginDate, loginTime } = formatLoginDateTime(new Date());
    const { subject: lSubject, html: lHtml } = ownerLoginAlertEmail({ ownerName: owner.name, loginDate, loginTime });
    sendEmail({ to: owner.email, subject: lSubject, html: lHtml }).catch(() => {});

    if (owner.phone) {
      const waMessage = `*GymOS Security Alert* 🛡️\n\nHi ${owner.name.split(' ')[0]},\nA new login was detected on your account.\n\n*Date:* ${loginDate}\n*Time:* ${loginTime}\n\n_If this wasn't you, please change your password immediately._`;
      sendWhatsApp(owner.phone, waMessage).catch(() => {});
    }

    // Temporarily attach owner to req so auditLogger can extract the actor
    req.owner = owner;
    await auditLog({ req, action: 'OWNER_LOGIN_SUCCESS', targetModel: 'Owner', targetId: owner._id });

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
      await auditLog({ req, action: 'OWNER_LOGOUT', targetModel: 'Owner', targetId: req.owner._id });
    } else if (req.member) {
      await Member.findByIdAndUpdate(req.member._id, { refreshToken: null });
      await auditLog({ req, action: 'MEMBER_LOGOUT', targetModel: 'Member', targetId: req.member._id, gymId: req.member.gym });
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

    if (!process.env.ADMIN_URL) {
      logger.warn('[Auth] ADMIN_URL is not set in environment variables. Password reset link will be broken.');
    }
    const resetUrl = `${process.env.ADMIN_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    const { subject, html } = passwordResetEmail({ ownerName: owner.name, resetUrl });

    await sendEmail({ to: owner.email, subject, html });

    await auditLog({ req, action: 'OWNER_FORGOT_PASSWORD', targetModel: 'Owner', targetId: owner._id, actorOverride: { userId: owner._id, role: 'owner', name: owner.name } });

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

    await auditLog({ req, action: 'OWNER_RESET_PASSWORD', targetModel: 'Owner', targetId: owner._id, actorOverride: { userId: owner._id, role: 'owner', name: owner.name } });

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
      await auditLog({ req, action: 'MEMBER_LOGIN_FAILED', targetModel: 'Member', targetId: memberId, details: { reason: 'User not found' }, actorOverride: { userId: null, role: 'anonymous', name: 'Anonymous' } });
      return errorResponse(res, 'Invalid Member ID or password', null, 401);
    }

    if (!member.isActive) {
      await auditLog({ req, action: 'MEMBER_LOGIN_FAILED', targetModel: 'Member', targetId: member._id, gymId: member.gym, details: { reason: 'Deactivated' }, actorOverride: { userId: member._id, role: 'member', name: member.name } });
      return errorResponse(res, 'Member account is deactivated', null, 403);
    }

    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      await auditLog({ req, action: 'MEMBER_LOGIN_FAILED', targetModel: 'Member', targetId: member._id, gymId: member.gym, details: { reason: 'Invalid password' }, actorOverride: { userId: member._id, role: 'member', name: member.name } });
      return errorResponse(res, 'Invalid Member ID or password', null, 401);
    }

    const { accessToken, refreshToken: rToken } = generateTokenPair({ id: member._id, role: 'member' });
    member.refreshToken = rToken;
    await member.save({ validateBeforeSave: false });

    req.member = member;
    await auditLog({ req, action: 'MEMBER_LOGIN_SUCCESS', targetModel: 'Member', targetId: member._id, gymId: member.gym });

    return successResponse(res, 'Member login successful', {
      member: member.toJSON(),
      accessToken,
      refreshToken: rToken,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Member Forgot Password ───────────────────────────────────────────────────
const memberForgotPassword = async (req, res, next) => {
  try {
    const { phoneOrEmail } = req.body;

    // Try to find member by phone or email
    const member = await Member.findOne({
      $or: [{ phone: phoneOrEmail }, { email: phoneOrEmail }],
    });

    // Always return 200 to prevent enumeration
    if (!member) {
      return successResponse(res, 'If this account exists, a reset link has been sent');
    }

    // Generate secure reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15); // 15 minutes

    member.passwordResetToken = hashedToken;
    member.passwordResetExpiry = expiry;
    await member.save({ validateBeforeSave: false });

    if (!process.env.MEMBER_URL) {
      logger.warn('[Auth] MEMBER_URL is not set in environment variables. Member password reset link may be broken.');
    }

    // The frontend URL for members
    const resetUrl = `${process.env.MEMBER_URL || 'https://gymos-member.vercel.app'}/reset-password?token=${rawToken}`;
    
    // Send via WhatsApp
    const message = `*GymOS Password Reset* 🔐\n\nHi ${member.name.split(' ')[0]},\nWe received a request to reset your password.\n\nClick the link below to set a new password:\n${resetUrl}\n\n_This link is valid for 15 minutes. If you didn't request this, please ignore this message._`;
    sendWhatsApp(member.phone, message).catch(() => {});

    // Send via Email if available
    if (member.email) {
      const { subject, html } = passwordResetEmail({ ownerName: member.name, resetUrl });
      sendEmail({ to: member.email, subject, html }).catch(() => {});
    }

    await auditLog({ req, action: 'MEMBER_FORGOT_PASSWORD', targetModel: 'Member', targetId: member._id, gymId: member.gym, actorOverride: { userId: member._id, role: 'member', name: member.name } });

    return successResponse(res, 'If this account exists, a reset link has been sent');
  } catch (error) {
    next(error);
  }
};

// ─── Member Reset Password ────────────────────────────────────────────────────
const memberResetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const member = await Member.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() },
    }).select('+password');

    if (!member) {
      return errorResponse(res, 'Invalid or expired reset token', null, 400);
    }

    member.password = password; // hashed in pre-save
    member.passwordResetToken = undefined;
    member.passwordResetExpiry = undefined;
    member.refreshToken = null; // invalidate all sessions
    await member.save();

    await auditLog({ req, action: 'MEMBER_RESET_PASSWORD', targetModel: 'Member', targetId: member._id, gymId: member.gym, actorOverride: { userId: member._id, role: 'member', name: member.name } });

    return successResponse(res, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerOwner,
  loginOwner,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  memberLogin,
  memberForgotPassword,
  memberResetPassword,
};
