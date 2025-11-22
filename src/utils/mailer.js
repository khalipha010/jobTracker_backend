const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async (options) => {
  try {
    await transporter.sendMail(options);
    console.log('Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('Email error:', error.message);
    return false;
  }
};

module.exports = sendMail;