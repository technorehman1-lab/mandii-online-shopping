const express = require("express");
const { db } = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// Get customer's saved payment methods + wallet transactions
router.get("/mine", authRequired, (req, res) => {
  const methods = db
    .prepare(`
      SELECT id, type, provider, account_number, account_name, created_at
      FROM payment_methods
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
    .all(req.user.id);

  const transactions = db
    .prepare(`
      SELECT id, type, amount, status, reference, created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
    .all(req.user.id);

  const balance = transactions
    .filter((tx) => tx.status === "confirmed")
    .reduce((total, tx) => {
      return tx.type === "deposit"
        ? total + Number(tx.amount)
        : total - Number(tx.amount);
    }, 0);

  res.json({
    balance,
    methods,
    transactions,
  });
});

// Add JazzCash / Easypaisa payment method
router.post("/methods", authRequired, (req, res) => {
  const { type, provider, account_number, account_name } = req.body || {};

  if (!type || !provider || !account_number) {
    return res.status(400).json({
      error: "Payment account information is required.",
    });
  }

  if (!["wallet", "bank"].includes(type)) {
    return res.status(400).json({
      error: "Invalid payment method type.",
    });
  }

  const result = db
    .prepare(`
      INSERT INTO payment_methods
      (user_id, type, provider, account_number, account_name)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      req.user.id,
      type,
      provider,
      String(account_number).trim(),
      account_name ? String(account_name).trim() : null
    );

  const method = db
    .prepare(`
      SELECT id, type, provider, account_number, account_name, created_at
      FROM payment_methods
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.status(201).json({ method });
});

// Remove customer's saved payment method
router.delete("/methods/:id", authRequired, (req, res) => {
  const result = db
    .prepare(`
      DELETE FROM payment_methods
      WHERE id = ? AND user_id = ?
    `)
    .run(req.params.id, req.user.id);

  if (!result.changes) {
    return res.status(404).json({
      error: "Payment method not found.",
    });
  }

  res.json({ success: true });
});

module.exports = router;