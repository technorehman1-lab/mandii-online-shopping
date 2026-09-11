const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "mandi-dev-secret-change-me";

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Please log in to continue." });
  const token = header.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired. Please log in again." });
  }
}

function adminRequired(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "This action is restricted to admin accounts." });
  }
  next();
}

module.exports = { authRequired, adminRequired, SECRET };
