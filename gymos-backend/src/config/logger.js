const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const transports = [
  // Console — always on
  new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), logFormat),
  }),
];

if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports,
  exceptionHandlers: process.env.NODE_ENV !== 'production' ? [new winston.transports.File({ filename: path.join('logs', 'exceptions.log') })] : undefined,
  rejectionHandlers: process.env.NODE_ENV !== 'production' ? [new winston.transports.File({ filename: path.join('logs', 'rejections.log') })] : undefined,
});

module.exports = logger;
