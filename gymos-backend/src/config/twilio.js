const twilio = require('twilio');

let twilioClient = null;

const getTwilioClient = () => {
  if (!twilioClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    if (!sid || !token) {
      return null; // WhatsApp disabled
    }

    twilioClient = twilio(sid, token);
  }
  return twilioClient;
};

module.exports = { getTwilioClient };
