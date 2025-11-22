// backend/src/routes/notifications.js
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

// Middleware to protect applicant routes
const authorizeUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains { id, email, isAdmin }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// =======================
// GET Notifications for Logged-in User
// =======================
router.get('/', authorizeUser, async (req, res) => {
  try {
    const { id: userId } = req.user;

    const result = await pool.query(
      `SELECT id, application_id, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Notifications fetch error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// =======================
// Mark Notification as Read
// =======================
router.put('/:id/read', authorizeUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark read error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
