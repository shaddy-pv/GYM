require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/error.middleware');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const ownerRoutes = require('./routes/owner.routes');
const gymRoutes = require('./routes/gym.routes');
const trainerRoutes = require('./routes/trainer.routes');
const membershipPlanRoutes = require('./routes/membershipPlan.routes');
const memberRoutes = require('./routes/member.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const paymentRoutes = require('./routes/payment.routes');
const exercisePlanRoutes = require('./routes/exercisePlan.routes');
const mealPlanRoutes = require('./routes/mealPlan.routes');
const workoutLogRoutes = require('./routes/workoutLog.routes');
const pointsRoutes = require('./routes/points.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const notificationRoutes = require('./routes/notification.routes');

// ─── Member App Route Imports ─────────────────────────────────────────────────
const memberAuthRoutes = require('./routes/member/memberAuth.routes');
const memberProfileRoutes = require('./routes/member/memberProfile.routes');
const memberWorkoutRoutes = require('./routes/member/memberWorkout.routes');
const memberMealRoutes = require('./routes/member/memberMeal.routes');
const memberAttendanceRoutes = require('./routes/member/memberAttendance.routes');
const memberLeaderboardRoutes = require('./routes/member/memberLeaderboard.routes');
const memberPointsRoutes = require('./routes/member/memberPoints.routes');
const memberNotificationRoutes = require('./routes/member/memberNotification.routes');

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Static allowed origins from env (production aliases)
const allowedOrigins = [
  process.env.ADMIN_URL,
  process.env.MEMBER_URL,
  // Hard-coded production aliases as fallback in case env vars not set on host
  'https://gymos-admin-gilt.vercel.app',
  'https://gymos-member.vercel.app',
].filter(Boolean);

// Allow localhost in development
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:8080');
}

// Pattern to allow all Vercel preview deployments for both apps
const vercelPreviewPattern = /^https:\/\/gymos-(admin|member)-[a-z0-9]+-[\w-]+\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Data Sanitization ────────────────────────────────────────────────────────
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// ─── HTTP Logging ─────────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: (req) => req.url === '/health',
  }),
);

// ─── General API Rate Limiter ────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 5000 : 500,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'GymOS API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/gyms', gymRoutes);

// Nested gym routes
app.use('/api/gyms/:gymId/trainers', trainerRoutes);
app.use('/api/gyms/:gymId/plans', membershipPlanRoutes);
app.use('/api/gyms/:gymId/members', memberRoutes);
app.use('/api/gyms/:gymId/attendance', attendanceRoutes);
app.use('/api/gyms/:gymId/payments', paymentRoutes);
app.use('/api/gyms/:gymId/exercise-plans', exercisePlanRoutes);
app.use('/api/gyms/:gymId/meal-plans', mealPlanRoutes);
app.use('/api/gyms/:gymId/workouts', workoutLogRoutes);
app.use('/api/gyms/:gymId/points', pointsRoutes);
app.use('/api/gyms/:gymId/leaderboard', leaderboardRoutes);
app.use('/api/gyms/:gymId/notifications', notificationRoutes);

// ─── Member App Routes (/api/member/*) ───────────────────────────────────────
app.use('/api/member/auth', memberAuthRoutes);
app.use('/api/member/profile', memberProfileRoutes);
app.use('/api/member/workout', memberWorkoutRoutes);
app.use('/api/member/meals', memberMealRoutes);
app.use('/api/member/attendance', memberAttendanceRoutes);
app.use('/api/member/leaderboard', memberLeaderboardRoutes);
app.use('/api/member/points', memberPointsRoutes);
app.use('/api/member/notifications', memberNotificationRoutes);

// ─── 404 + Global Error Handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
