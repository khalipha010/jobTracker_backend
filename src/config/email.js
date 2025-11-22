const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Use SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER || 'noreply@jobtracker.com',
        subject,
        text,
        html,
      };

      await sgMail.send(msg);
      console.log('Email sent successfully via SendGrid to:', to);
      return true;
    } else {
      console.warn('SendGrid API key not configured, email not sent');
      return false;
    }
  } catch (err) {
    console.error('SendGrid email error:', err.message);
    if (err.response) {
      console.error('SendGrid error details:', err.response.body);
    }
    return false;
  }
};

module.exports = { sendEmail };