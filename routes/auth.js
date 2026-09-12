const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../db");
const { SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)")
    .run(name, normalizedEmail, hash, "customer");

  const user = { id: info.lastInsertRowid, name, email: normalizedEmail, role: "customer" };
  const token = jwt.sign(user, SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);

  if (!row || !bcrypt.compareSync(password || "", row.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = jwt.sign(user, SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});
router.get("/me", (req, res) => {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not logged in." });
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, SECRET);

    const user = db
      .prepare("SELECT id, name, email FROM users WHERE id = ?")
      .get(payload.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired login." });
  }
});
module.exports = router;
