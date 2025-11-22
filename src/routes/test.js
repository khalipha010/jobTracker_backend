const express = require('express');
     const router = express.Router();
     const sendMail = require('../utils/mailer');

     router.get('/test-email', async (req, res) => {
       try {
         await sendMail({
           to: 'test@example.com', // Any dummy address
           subject: 'Mailtrap Test',
           text: 'This is a plain text test email.',
           html: '<p><b>Hello!</b> This is a test email from Job Tracker 🚀</p>',
         });
         res.json({ status: 'success', message: 'Email sent to Mailtrap' });
       } catch (error) {
         console.error(error);
         res.status(500).json({ status: 'error', error: error.message });
       }
     });

     module.exports = router; 
