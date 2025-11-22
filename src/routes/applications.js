const express = require('express');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/email');
const router = express.Router();

// Apply for a job
router.post('/apply/:jobId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const jobId = parseInt(req.params.jobId);
    const { cover_letter, profile_picture, cv_url } = req.body || '';

    const existingApp = await pool.query(
      'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2',
      [decoded.userId, jobId]
    );
    if (existingApp.rows.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const jobCheck = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (!jobCheck.rows.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Update user with profile_picture and cv_url if provided
    if (profile_picture || cv_url) {
      const updateQuery = `
        UPDATE users 
        SET profile_picture = COALESCE(NULLIF($1, ''), profile_picture),
            cv_url = COALESCE(NULLIF($2, ''), cv_url)
        WHERE id = $3
        RETURNING profile_picture, cv_url
      `;
      const updateResult = await pool.query(updateQuery, [profile_picture, cv_url, decoded.userId]);
      if (updateResult.rows.length === 0) {
        return res.status(500).json({ error: 'Failed to update user profile' });
      }
    }

    // Insert application
    const newApp = await pool.query(
      'INSERT INTO applications (user_id, job_id, cover_letter, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [decoded.userId, jobId, cover_letter || null, 'Pending']
    );

    // Send optional confirmation email
    const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [decoded.userId]);
    const user = userRes.rows[0];
    const jobRes = jobCheck.rows[0];
    if (user && user.email && jobRes) {
      console.log('Sending email to:', user?.email);
      const emailText = `Hi ${user.name},\n\nYour application for ${jobRes.position} at ${jobRes.company} has been submitted successfully. Status: Pending.\n\nBest,\nJobTracker Team`;
      await sendEmail({
        to: user.email,
        subject: 'Application Submitted',
        text: emailText,
        html: `<pre>${emailText}</pre>`,
      });
    } else {
      console.error('User or email not found for sending application confirmation.');
    }

    // Insert notification
    await pool.query(
      'INSERT INTO notifications (user_id, application_id, message) VALUES ($1, $2, $3)',
      [decoded.userId, newApp.rows[0].id, 'Application submitted successfully']
    );

    // Return newly created application with updated user data
    const updatedUser = await pool.query('SELECT profile_picture, cv_url FROM users WHERE id = $1', [decoded.userId]);
    res.status(201).json({
      ...newApp.rows[0],
      profile_picture: updatedUser.rows[0].profile_picture,
      cv_url: updatedUser.rows[0].cv_url,
    });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;