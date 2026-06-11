require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');

const { startExpiryReminderJob } = require('./src/jobs/expiryReminder.job');
const { startFeeReminderJob } = require('./src/jobs/feeReminder.job');
const { startStreakResetJob } = require('./src/jobs/streakReset.job');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 GymOS API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`📋 Health check: http://localhost:${PORT}/health`);
    });

    // Start cron jobs (only in production or when explicitly enabled)
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
      startExpiryReminderJob();
      startFeeReminderJob();
      startStreakResetJob();
      logger.info('⏰ All cron jobs registered');
    }

    // Graceful shutdown
    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
