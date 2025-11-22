const nodemailer = require('nodemailer');
require('dotenv').config();

const getTransporters = () => {
  if (process.env.NODE_ENV === 'development') {
    // Dev: send to Mailtrap + Gmail SMTP
    return [
      nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS,
        },
      }),
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    ];
  } else {
    // Prod: only Gmail/real SMTP
    return [
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    ];
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporters = getTransporters();

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    html, // HTML clickable link
    text, // plain-text fallback
  };

  try {
    await Promise.all(transporters.map(transporter => transporter.sendMail(mailOptions)));
    console.log('Email sent successfully to:', to);
    return true;
  } catch (err) {
    console.error('Email error:', err.message);
    return false;
  }
};

module.exports = { sendEmail };