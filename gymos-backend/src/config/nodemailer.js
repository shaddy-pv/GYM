const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // TLS via STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      transporter.verify((error) => {
        if (error) {
          logger.warn(`Email transporter verify failed: ${error.message}`);
        } else {
          logger.info('Email transporter ready');
        }
      });
    }
  }
  return transporter;
};

module.exports = { getTransporter };
