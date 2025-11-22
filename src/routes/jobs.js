const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendEmail } = require('../config/email');
const router = express.Router();

// Middleware to protect routes
const authorizeUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Add Job
router.post('/', authorizeUser, async (req, res) => {
  try {
    const { company, position, status, date_applied, notes } = req.body;

    const newJob = await pool.query(
      'INSERT INTO jobs (user_id, company, position, status, date_applied, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, company, position, status, date_applied, notes]
    );

    await pool.query(
      'INSERT INTO activity_logs (job_id, action) VALUES ($1, $2)',
      [newJob.rows[0].id, 'job_added']
    );

    // Send notification email for new job added
    const user = await pool.query('SELECT email, name FROM users WHERE id = $1', [req.user.userId]);
    if (user.rows.length > 0) {
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .job-card { background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 JobTracker Pro</h1>
          </div>
          <div class="content">
            <h2>New Job Added! 🎉</h2>
            <p>Hello <strong>${user.rows[0].name}</strong>,</p>
            <p>You've successfully added a new job to your JobTracker Pro dashboard.</p>
            
            <div class="job-card">
              <h3 style="margin: 0 0 10px 0; color: #2d3748;">${position}</h3>
              <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 16px;">
                <strong>Company:</strong> ${company}
              </p>
              <p style="margin: 0 0 8px 0; color: #4a5568;">
                <strong>Status:</strong> 
                <span class="status-badge" style="background: ${getStatusColor(status)}; color: white;">
                  ${status}
                </span>
              </p>
              <p style="margin: 0 0 8px 0; color: #4a5568;">
                <strong>Date Applied:</strong> ${new Date(date_applied).toLocaleDateString()}
              </p>
              ${notes ? `<p style="margin: 0; color: #4a5568;"><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>

            <p><strong>What's next?</strong></p>
            <ul>
              <li>Track your application progress</li>
              <li>Update the status as you move forward</li>
              <li>Add interview notes and follow-up dates</li>
            </ul>
            
            <p>Good luck with your application! 🚀</p>
          </div>
          <div class="footer">
            <p>Happy job hunting,<br><strong>The JobTracker Pro Team</strong></p>
            <p>📍 Track smarter • Interview better • Land faster</p>
          </div>
        </body>
        </html>
      `;

      const emailText = `New Job Added!\n\nHello ${user.rows[0].name},\n\nYou've added a new job: ${position} at ${company}.\nStatus: ${status}\nDate Applied: ${new Date(date_applied).toLocaleDateString()}\n\nGood luck with your application!\n\nBest regards,\nJobTracker Pro Team`;

      await sendEmail({
        to: user.rows[0].email,
        subject: `New Job Added - ${position} at ${company}`,
        html: emailHTML,
        text: emailText,
      });
    }

    res.status(201).json(newJob.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Jobs
router.get('/', authorizeUser, async (req, res) => {
  try {
    const jobs = await pool.query(
      'SELECT * FROM jobs WHERE user_id = $1',
      [req.user.userId]
    );
    res.json(jobs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Job
router.put('/:id', authorizeUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { company, position, status, date_applied, notes } = req.body;

    const oldJob = await pool.query(
      'SELECT status FROM jobs WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (oldJob.rows.length === 0)
      return res.status(404).json({ error: 'Job not found' });

    const updatedJob = await pool.query(
      'UPDATE jobs SET company = $1, position = $2, status = $3, date_applied = $4, notes = $5 WHERE id = $6 AND user_id = $7 RETURNING *',
      [company, position, status, date_applied, notes, id, req.user.userId]
    );

    if (oldJob.rows[0].status !== status) {
      await pool.query(
        'INSERT INTO activity_logs (job_id, action, old_status, new_status) VALUES ($1, $2, $3, $4)',
        [id, 'status_updated', oldJob.rows[0].status, status]
      );

      // Send notification email for status update
      const user = await pool.query('SELECT email, name FROM users WHERE id = $1', [req.user.userId]);
      if (user.rows.length > 0) {
        const emailHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .update-card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .status-change { display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0; }
              .status-old, .status-new { padding: 8px 16px; border-radius: 20px; font-weight: bold; }
              .arrow { font-size: 20px; color: #667eea; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔄 Status Updated</h1>
            </div>
            <div class="content">
              <h2>Application Progress! 📈</h2>
              <p>Hello <strong>${user.rows[0].name}</strong>,</p>
              <p>Your job application status has been updated. Great progress!</p>
              
              <div class="update-card">
                <h3 style="margin: 0 0 10px 0; color: #2d3748;">${position}</h3>
                <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 16px;">
                  <strong>Company:</strong> ${company}
                </p>
                
                <div class="status-change">
                  <span class="status-old" style="background: ${getStatusColor(oldJob.rows[0].status)}; color: white;">
                    ${oldJob.rows[0].status}
                  </span>
                  <span class="arrow">→</span>
                  <span class="status-new" style="background: ${getStatusColor(status)}; color: white;">
                    ${status}
                  </span>
                </div>

                <p style="text-align: center; color: #4a5568; font-style: italic;">
                  ${getStatusMessage(oldJob.rows[0].status, status)}
                </p>
              </div>

              <p><strong>Keep up the great work!</strong></p>
              <ul>
                <li>Continue preparing for next steps</li>
                <li>Update your notes with any new information</li>
                <li>Stay organized with your job search</li>
              </ul>
            </div>
            <div class="footer">
              <p>Moving forward,<br><strong>The JobTracker Pro Team</strong></p>
              <p>📍 Track smarter • Interview better • Land faster</p>
            </div>
          </body>
          </html>
        `;

        const emailText = `Application Status Updated!\n\nHello ${user.rows[0].name},\n\nYour application for ${position} at ${company} has been updated:\nFrom: ${oldJob.rows[0].status}\nTo: ${status}\n\n${getStatusMessage(oldJob.rows[0].status, status)}\n\nBest regards,\nJobTracker Pro Team`;

        await sendEmail({
          to: user.rows[0].email,
          subject: `Status Updated - ${position} at ${company}`,
          html: emailHTML,
          text: emailText,
        });
      }
    }

    res.json(updatedJob.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Job
router.delete('/:id', authorizeUser, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Job not found' });

    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply for a Job
router.post('/apply/:jobId', authorizeUser, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId;

    // Check if job exists and is open
    const job = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND status = $2',
      [jobId, 'Open']
    );
    if (job.rows.length === 0)
      return res.status(404).json({ error: 'Job not found or not open' });

    // Check if user already applied
    const existingApp = await pool.query(
      'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2',
      [userId, jobId]
    );
    if (existingApp.rows.length > 0)
      return res.status(400).json({ error: 'Already applied for this job' });

    const { cover_letter } = req.body;
    const newApplication = await pool.query(
      'INSERT INTO applications (user_id, job_id, status, cover_letter, applied_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [userId, jobId, 'Pending', cover_letter]
    );

    // Update job status to Applied
    await pool.query(
      'UPDATE jobs SET status = $1 WHERE id = $2',
      ['Applied', jobId]
    );

    // Send beautiful notification email
    const user = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId]);
    const jobDetails = await pool.query('SELECT company, position FROM jobs WHERE id = $1', [jobId]);
    
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .application-card { background: white; padding: 25px; border-radius: 10px; border-left: 4px solid #10b981; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .celebrate { text-align: center; font-size: 48px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Application Submitted!</h1>
        </div>
        <div class="content">
          <div class="celebrate">🎯</div>
          <h2>Congratulations, ${user.rows[0].name}! 🚀</h2>
          <p>Your job application has been successfully submitted. You're one step closer to your dream job!</p>
          
          <div class="application-card">
            <h3 style="margin: 0 0 15px 0; color: #2d3748; text-align: center;">${jobDetails.rows[0].position}</h3>
            <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 18px; text-align: center;">
              <strong>${jobDetails.rows[0].company}</strong>
            </p>
            <p style="margin: 0 0 15px 0; color: #4a5568; text-align: center;">
              Applied on: ${new Date().toLocaleDateString()}
            </p>
            ${cover_letter ? `<p style="margin: 0; color: #4a5568; font-style: italic; text-align: center;">"${cover_letter.substring(0, 100)}${cover_letter.length > 100 ? '...' : ''}"</p>` : ''}
          </div>

          <p><strong>What's next?</strong></p>
          <ul>
            <li>Prepare for potential interviews</li>
            <li>Research the company thoroughly</li>
            <li>Follow up in 1-2 weeks if you don't hear back</li>
            <li>Continue applying to other opportunities</li>
          </ul>

          <div style="background: #e6fffa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46; font-weight: bold;">💡 Pro Tip:</p>
            <p style="margin: 5px 0 0 0; color: #065f46;">Customize your follow-up emails and prepare specific questions about the company culture and role.</p>
          </div>
        </div>
        <div class="footer">
          <p>Best of luck with your application!<br><strong>The JobTracker Pro Team</strong></p>
          <p>📍 Track smarter • Interview better • Land faster</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `Congratulations! Application Submitted!\n\nHello ${user.rows[0].name},\n\nYour application for ${jobDetails.rows[0].position} at ${jobDetails.rows[0].company} has been successfully submitted.\n\nApplied on: ${new Date().toLocaleDateString()}\n\nWhat's next?\n- Prepare for potential interviews\n- Research the company thoroughly\n- Follow up in 1-2 weeks\n- Continue applying to other opportunities\n\nBest of luck!\n\nBest regards,\nJobTracker Pro Team`;

    // Send email notification
    await sendEmail({
      to: user.rows[0].email,
      subject: `Application Submitted - ${jobDetails.rows[0].position} at ${jobDetails.rows[0].company}`,
      html: emailHTML,
      text: emailText,
    });

    // Create notification in database
    await pool.query(
      'INSERT INTO notifications (user_id, application_id, message) VALUES ($1, $2, $3)',
      [userId, newApplication.rows[0].id, `Your application for ${jobDetails.rows[0].position} at ${jobDetails.rows[0].company} has been submitted.`]
    );

    res.status(201).json({ 
      message: 'Application submitted successfully', 
      application: newApplication.rows[0] 
    });
  } catch (err) {
    console.error('Apply error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to get status colors
function getStatusColor(status) {
  const colors = {
    'Open': '#3b82f6',
    'Applied': '#f59e0b',
    'Interview': '#8b5cf6',
    'Offered': '#10b981',
    'Rejected': '#ef4444'
  };
  return colors[status] || '#6b7280';
}

// Helper function to get status update messages
function getStatusMessage(oldStatus, newStatus) {
  const messages = {
    'Open_Applied': 'Great start! Your application is now in the pipeline.',
    'Applied_Interview': 'Excellent! You got an interview. Time to prepare!',
    'Interview_Offered': 'Amazing news! You received a job offer!',
    'Interview_Rejected': 'Keep your head up! Every interview is a learning experience.',
    'Applied_Rejected': 'Don\'t get discouraged. Keep applying!'
  };
  return messages[`${oldStatus}_${newStatus}`] || 'Your application progress has been updated.';
}

module.exports = router;