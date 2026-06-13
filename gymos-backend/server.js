require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');


const { startStreakResetJob } = require('./src/jobs/streakReset.job');
const { startAttendanceReminderJob } = require('./src/jobs/attendanceReminder.job');
const { startGenerateDuesJob } = require('./src/jobs/generateDues.job');
const { startProcessOverdueJob } = require('./src/jobs/processOverdue.job');

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

      startStreakResetJob();
      startAttendanceReminderJob();
      startGenerateDuesJob();
      startProcessOverdueJob();
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
