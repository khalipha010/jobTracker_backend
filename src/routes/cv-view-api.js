// routes/cv-view-api.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET CV by application_id
router.get("/applications/:id/cv/view", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT u.cv_url
      FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE a.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "CV not found" });
    }

    const cvUrl = result.rows[0].cv_url;
    return res.redirect(cvUrl); // auto-open CV
  } catch (error) {
    console.error("Error fetching CV:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router; // ✅ this is key
