const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/email');
const pool = require('../config/db');
const cloudinary = require('../config/Cloudinary');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

/**
 * Middleware: validate user input
 */
const validateInput = (req, res, next) => {
  const { name, email, password } = req.body || {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !password || !emailRegex.test(email) || password.length < 6) {
    return res.status(400).json({ error: 'Invalid name, email, or password (min 6 chars)' });
  }
  next();
};

/**
 * Middleware: authorize user
 */
const authorizeUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains { userId, email, isAdmin }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware: authorize admin
 */
const authorizeAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Register new user
 */
router.post('/register', validateInput, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    await pool.query(
      'INSERT INTO users (name, email, password, verification_token, is_verified, is_admin) VALUES ($1, $2, $3, $4, FALSE, FALSE)',
      [name, email, hashedPassword, verificationToken]
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${verificationToken}`;
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
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎯 JobTracker Pro</h1>
        </div>
        <div class="content">
          <h2>Welcome to JobTracker Pro, ${name}! 👋</h2>
          <p>We're excited to have you on board. To get started with managing your job applications, please verify your email address.</p>
          
          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Your Email Address</a>
          </div>
          
          <p>This link will expire in 24 hours for security reasons.</p>
          
          <p><strong>What's next?</strong></p>
          <ul>
            <li>Track all your job applications in one place</li>
            <li>Get status updates and reminders</li>
            <li>Analyze your job search progress</li>
          </ul>
          
          <p>If you didn't create an account with us, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>The JobTracker Pro Team</strong></p>
          <p>📍 Track smarter • Interview better • Land faster</p>
    );
    console.log(`Login successful for ${ email }, isAdmin: ${ user.rows[0].is_admin }, token: ${ token } `);

    res.json({ token, isAdmin: user.rows[0].is_admin });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Verify email
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'No token provided' });

    const result = await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id, email',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Forgot password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await pool.query('UPDATE users SET reset_token = $1 WHERE email = $2', [resetToken, email]);

    const resetLink = `${ process.env.FRONTEND_URL }/reset-password?token=${resetToken}`;
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
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.rows[0].name || 'there'}!</h2>
          <p>We received a request to reset your password for your JobTracker Pro account.</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Your Password</a>
          </div>
          
          <div class="warning">
            <p><strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
          </div>
          
          <p>If you didn't request a password reset, please ignore this email. Your account remains secure.</p>
          
          <p>For security tips:</p>
          <ul>
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication if available</li>
            <li>Never share your password with anyone</li>
          </ul>
        </div>
        <div class="footer">
          <p>Stay secure,<br><strong>The JobTracker Pro Team</strong></p>
          <p>📍 Track smarter • Interview better • Land faster</p>
        </div>
      </body>
      </html>
    `;
    const emailText = `Password Reset Request\n\nHello ${user.rows[0].name || 'there'}!\n\nWe received a request to reset your password. Click the link below to reset it:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe JobTracker Pro Team`;

    const emailSent = await sendEmail({
      to: email,
      subject: 'Reset Your Password - JobTracker Pro',
      html: emailHTML,
      text: emailText,
    });
    if (!emailSent) return res.status(500).json({ error: 'Failed to send reset email' });

    res.json({ message: 'Password reset link sent. Check your email.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Reset password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await pool.query('SELECT * FROM users WHERE email = $1 AND reset_token = $2', [
      decoded.email,
      token,
    ]);
    if (user.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await pool.query('UPDATE users SET password = $1, reset_token = NULL WHERE email = $2', [
      hashedPassword,
      decoded.email,
    ]);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get profile
 */
router.get('/profile', authorizeUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT id, name, email, phone, bio, location, profile_picture, skills, education_level, education_grade, age, experience, cv_url FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update profile
 */
router.put('/profile', authorizeUser, upload.fields([{ name: 'profile_picture', maxCount: 1 }, { name: 'cv', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, bio, location, education_level, education_grade, age, experience, skills } = req.body;
    let profile_picture = req.body.profile_picture || '';
    let cv_url = req.body.cv_url || '';

    // Handle profile picture upload to Cloudinary
    if (req.files['profile_picture'] && req.files['profile_picture'][0]) {
      const result = await cloudinary.uploader.upload(req.files['profile_picture'][0].path, {
        folder: 'job_tracker_profiles',
      });
      profile_picture = result.secure_url;
      fs.unlinkSync(req.files['profile_picture'][0].path);
    }

    // Handle CV upload to Cloudinary
    if (req.files['cv'] && req.files['cv'][0]) {
      const result = await cloudinary.uploader.upload(req.files['cv'][0].path, {
        folder: 'job_tracker_cvs',
      });
      cv_url = result.secure_url;
      fs.unlinkSync(req.files['cv'][0].path);
    }

    // Parse skills
    let parsedSkills = [];
    if (skills && typeof skills === 'string' && skills.trim()) {
      try {
        parsedSkills = JSON.parse(skills.replace(/'/g, '"'));
      } catch (e) {
        parsedSkills = skills.split(',').map((skill) => skill.trim()).filter((skill) => skill);
      }
    }

    // Update user in database
    const updateQuery = `
      UPDATE users
      SET name = COALESCE($1, name), phone = COALESCE($2, phone), bio = COALESCE($3, bio),
          location = COALESCE($4, location), education_level = COALESCE($5, education_level),
          education_grade = COALESCE($6, education_grade), age = COALESCE($7, age),
          experience = COALESCE($8, experience), profile_picture = COALESCE($9, profile_picture),
          cv_url = COALESCE($10, cv_url), skills = COALESCE($11, skills)
      WHERE id = $12
      RETURNING id, name, email, phone, bio, location, profile_picture, skills,
                education_level, education_grade, age, experience, cv_url
    `;
    const values = [
      name || null,
      phone || null,
      bio || null,
      location || null,
      education_level || null,
      education_grade || null,
      age ? parseInt(age, 10) : null,
      experience || null,
      profile_picture || null,
      cv_url || null,
      parsedSkills.length > 0 ? parsedSkills : null,
      userId,
    ];

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * Admin dashboard stats
 */
router.get('/admin/stats', authorizeAdmin, async (req, res) => {
  try {
    const totalApplications = await pool.query('SELECT COUNT(*) FROM jobs');
    const statusCounts = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `);

    const stats = {
      totalApplications: totalApplications.rows[0].count,
      statusBreakdown: statusCounts.rows.reduce(
        (acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        },
        { applied: 0, interview: 0, rejected: 0, offer: 0 }
      ),
    };

    res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.authorizeAdmin = authorizeAdmin;