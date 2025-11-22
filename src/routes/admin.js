const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendEmail } = require('../config/email');

const router = express.Router();

// Middleware to protect admin routes
const authorizeAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const isAdmin = decoded.isAdmin || decoded.is_admin;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET Admin Stats
router.get('/stats', authorizeAdmin, async (req, res) => {
  try {
    const totalApplications = await pool.query('SELECT COUNT(*) as count FROM applications');
    const statusCounts = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM applications
      GROUP BY status
    `);

    const stats = {
      totalApplications: parseInt(totalApplications.rows[0].count, 10),
      statusBreakdown: statusCounts.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, { Pending: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 }),
    };

    res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET All Applications with Filters
router.get('/applications', authorizeAdmin, async (req, res) => {
  try {
    const { status, ageMin, ageMax, degreeClass } = req.query;

    let query = `
      SELECT a.id, a.status, a.applied_at, a.cover_letter,
             u.name, u.email, u.age, u.education_grade as degree_class,
             u.profile_picture, u.cv_url,
             j.company, j.position, a.user_id, a.job_id
      FROM applications a
      JOIN users u ON a.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    if (ageMin) {
      params.push(parseInt(ageMin, 10));
      query += ` AND u.age >= $${params.length}`;
    }
    if (ageMax) {
      params.push(parseInt(ageMax, 10));
      query += ` AND u.age <= $${params.length}`;
    }
    if (degreeClass) {
      params.push(degreeClass);
      query += ` AND u.education_grade = $${params.length}`;
    }

    query += ' ORDER BY a.applied_at DESC';
    const applications = await pool.query(query, params);

    res.json(applications.rows.map(app => ({
      id: app.id,
      status: app.status,
      applied_at: app.applied_at,
      cover_letter: app.cover_letter,
      name: app.name,
      email: app.email,
      age: app.age,
      degree_class: app.degree_class,
      profile_picture: app.profile_picture,
      cv_url: app.cv_url,
      company: app.company,
      position: app.position,
      user_id: app.user_id,
      job_id: app.job_id,
    })));
  } catch (err) {
    console.error('Admin applications error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE Application Status (Individual)
router.put('/applications/:id/status', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending', 'Shortlisted', 'Accepted', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedApp = await pool.query(
      'UPDATE applications SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (updatedApp.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = updatedApp.rows[0];
    const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [application.user_id]);
    const jobRes = await pool.query('SELECT company, position FROM jobs WHERE id = $1', [application.job_id]);
    const user = userRes.rows[0];
    const job = jobRes.rows[0];

    await pool.query(
      'INSERT INTO notifications (user_id, application_id, message) VALUES ($1, $2, $3)',
      [
        application.user_id,
        application.id,
        `Your application for ${job.position} at ${job.company} has been updated to: ${status}`
      ]
    );

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
          .status-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; }
          .status-badge { display: inline-block; padding: 10px 20px; border-radius: 25px; font-size: 16px; font-weight: bold; color: white; margin: 10px 0; }
          .job-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .next-steps { background: #e6fffa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${getStatusIcon(status)} Application Update</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name},</h2>
          <p>We have an important update regarding your job application.</p>
          
          <div class="status-card">
            <h3 style="margin: 0 0 15px 0; color: #2d3748;">Application Status Updated</h3>
            <div className="job-info">
              <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #4a5568;">${job.position}</p>
              <p style="margin: 5px 0; color: #6b7280;">${job.company}</p>
              <p style="margin: 5px 0; color: #6b7280;">Applied: ${new Date(application.applied_at).toLocaleDateString()}</p>
            </div>
            
            <div class="status-badge" style="background: ${getApplicationStatusColor(status)};">
              ${status}
            </div>
            
            <p style="color: #4a5568; margin: 15px 0 0 0; font-style: italic;">
              ${getStatusMessage(status)}
            </p>
          </div>

          ${getNextStepsHTML(status)}
          
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #4a5568;">You can view your application details in your JobTracker Pro dashboard.</p>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0;">
              View Dashboard
            </a>
          </div>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>The JobTracker Pro Team</strong></p>
          <p>📍 Track smarter • Interview better • Land faster</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `Application Status Update\n\nHello ${user.name},\n\nYour application for ${job.position} at ${job.company} has been updated.\n\nNew Status: ${status}\n\n${getStatusMessage(status)}\n\n${getNextStepsText(status)}\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nJobTracker Pro Team`;

    await sendEmail({ 
      to: user.email, 
      subject: `Application Update - ${job.position} at ${job.company}`,
      html: emailHTML,
      text: emailText 
    });

    res.json(application);
  } catch (err) {
    console.error('Update status error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// BATCH UPDATE Application Status
router.post('/applications/batch-status', authorizeAdmin, async (req, res) => {
  try {
    const { ids, status } = req.body;
    const validStatuses = ['Pending', 'Shortlisted', 'Accepted', 'Rejected'];

    if (!ids || !Array.isArray(ids) || !status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid input: Provide valid IDs and status' });
    }

    const query = `
      UPDATE applications
      SET status = $1
      WHERE id = ANY($2::int[])
      RETURNING id, user_id, job_id, status, applied_at
    `;
    const updatedApps = await pool.query(query, [status, ids]);

    if (updatedApps.rows.length === 0) {
      return res.status(404).json({ error: 'No applications found to update' });
    }

    const emailData = await Promise.all(updatedApps.rows.map(async (app) => {
      const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [app.user_id]);
      const jobRes = await pool.query('SELECT company, position FROM jobs WHERE id = $1', [app.job_id]);
      return { 
        user: userRes.rows[0], 
        job: jobRes.rows[0], 
        app 
      };
    }));

    await Promise.all(updatedApps.rows.map(async (app) => {
      const data = emailData.find(e => e.app.id === app.id);
      await pool.query(
        'INSERT INTO notifications (user_id, application_id, message) VALUES ($1, $2, $3)',
        [
          app.user_id,
          app.id,
          `Your application for ${data.job.position} at ${data.job.company} has been updated to: ${status}`
        ]
      );
    }));

    const emailPromises = emailData.map(({ user, job, app }) => {
      if (!user || !user.email) return Promise.resolve(false);
      
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
            .status-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; }
            .status-badge { display: inline-block; padding: 10px 20px; border-radius: 25px; font-size: 16px; font-weight: bold; color: white; margin: 10px 0; }
            .job-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .next-steps { background: #e6fffa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${getStatusIcon(status)} Application Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>We have an important update regarding your job application.</p>
            
            <div class="status-card">
              <h3 style="margin: 0 0 15px 0; color: #2d3748;">Application Status Updated</h3>
              <div class="job-info">
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #4a5568;">${job.position}</p>
                <p style="margin: 5px 0; color: #6b7280;">${job.company}</p>
                <p style="margin: 5px 0; color: #6b7280;">Applied: ${new Date(app.applied_at).toLocaleDateString()}</p>
              </div>
              
              <div class="status-badge" style="background: ${getApplicationStatusColor(status)};">
                ${status}
              </div>
              
              <p style="color: #4a5568; margin: 15px 0 0 0; font-style: italic;">
                ${getStatusMessage(status)}
              </p>
            </div>

            ${getNextStepsHTML(status)}
            
            <div style="text-align: center; margin: 25px 0;">
              <p style="color: #4a5568;">You can view your application details in your JobTracker Pro dashboard.</p>
              <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0;">
                View Dashboard
              </a>
            </div>
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>The JobTracker Pro Team</strong></p>
            <p>📍 Track smarter • Interview better • Land faster</p>
          </div>
        </body>
        </html>
      `;

      const emailText = `Application Status Update\n\nHello ${user.name},\n\nYour application for ${job.position} at ${job.company} has been updated.\n\nNew Status: ${status}\n\n${getStatusMessage(status)}\n\n${getNextStepsText(status)}\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nJobTracker Pro Team`;

      return sendEmail({ 
        to: user.email, 
        subject: `Application Update - ${job.position} at ${job.company}`,
        html: emailHTML,
        text: emailText 
      });
    });

    const emailResults = await Promise.all(emailPromises);
    console.log('Batch email results:', emailResults.filter(Boolean).length, 'emails sent successfully');

    res.json({ 
      message: `Updated ${updatedApps.rows.length} applications`, 
      updatedIds: updatedApps.rows.map(row => row.id) 
    });
  } catch (err) {
    console.error('Batch update error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper Functions
function getApplicationStatusColor(status) {
  const colors = {
    'Pending': '#f59e0b',
    'Shortlisted': '#8b5cf6',
    'Accepted': '#10b981',
    'Rejected': '#ef4444'
  };
  return colors[status] || '#6b7280';
}

function getStatusIcon(status) {
  const icons = {
    'Pending': '⏳',
    'Shortlisted': '📋',
    'Accepted': '🎉',
    'Rejected': '💼'
  };
  return icons[status] || '📧';
}

function getStatusMessage(status) {
  const messages = {
    'Pending': 'Your application is being reviewed by our team.',
    'Shortlisted': 'Congratulations! Your application has been shortlisted for further consideration.',
    'Accepted': 'Fantastic news! Your application has been accepted. Welcome to the team!',
    'Rejected': 'Thank you for your application. While you were not selected for this position, we encourage you to apply for future opportunities.'
  };
  return messages[status] || 'Your application status has been updated.';
}

function getNextStepsHTML(status) {
  const steps = {
    'Pending': `
      <div class="next-steps">
        <h4 style="margin: 0 0 10px 0; color: #065f46;">📋 What's Next?</h4>
        <ul style="margin: 0; color: #065f46; padding-left: 20px;">
          <li>Our team is reviewing your application</li>
          <li>You'll hear from us within 1-2 weeks</li>
          <li>Keep an eye on your email for updates</li>
        </ul>
      </div>
    `,
    'Shortlisted': `
      <div class="next-steps">
        <h4 style="margin: 0 0 10px 0; color: #065f46;">🎯 Next Steps</h4>
        <ul style="margin: 0; color: #065f46; padding-left: 20px;">
          <li>Prepare for potential interviews</li>
          <li>Review the job description thoroughly</li>
          <li>Research our company and values</li>
          <li>We'll contact you soon with next steps</li>
        </ul>
      </div>
    `,
    'Accepted': `
      <div class="next-steps">
        <h4 style="margin: 0 0 10px 0; color: #065f46;">🚀 Welcome Aboard!</h4>
        <ul style="margin: 0; color: #065f46; padding-left: 20px;">
          <li>Our HR team will contact you with onboarding details</li>
          <li>Prepare your required documents</li>
          <li>Review your employment contract carefully</li>
          <li>Get ready for an exciting journey with us!</li>
        </ul>
      </div>
    `,
    'Rejected': `
      <div class="next-steps">
        <h4 style="margin: 0 0 10px 0; color: #065f46;">💪 Keep Going!</h4>
        <ul style="margin: 0; color: #065f46; padding-left: 20px;">
          <li>Don't get discouraged - every application is valuable experience</li>
          <li>Consider applying for other positions that match your skills</li>
          <li>Continue developing your skills and portfolio</li>
          <li>We'll keep your profile for future opportunities</li>
        </ul>
      </div>
    `
  };
  return steps[status] || '';
}

function getNextStepsText(status) {
  const steps = {
    'Pending': "What's Next?\n- Our team is reviewing your application\n- You'll hear from us within 1-2 weeks\n- Keep an eye on your email for updates",
    'Shortlisted': "Next Steps:\n- Prepare for potential interviews\n- Review the job description thoroughly\n- Research our company and values\n- We'll contact you soon with next steps",
    'Accepted': "Welcome Aboard!\n- Our HR team will contact you with onboarding details\n- Prepare your required documents\n- Review your employment contract carefully\n- Get ready for an exciting journey with us!",
    'Rejected': "Keep Going!\n- Don't get discouraged - every application is valuable experience\n- Consider applying for other positions\n- Continue developing your skills\n- We'll keep your profile for future opportunities"
  };
  return steps[status] || 'Check your dashboard for more details.';
}

module.exports = router;