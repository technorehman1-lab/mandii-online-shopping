const express = require("express");
const { db } = require("../db");
const { authRequired, adminRequired } = require("../middleware/auth");

const router = express.Router();

const VALID_METHODS = ["card", "jazzcash", "easypaisa", "sadapay"];
const VALID_STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"];

function generateOrderCode() {
  return "MND-" + Math.floor(100000 + Math.random() * 900000);
}

function attachItems(order) {
  return { ...order, items: db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) };
}

// Place an order (checkout)
router.post("/", authRequired, (req, res) => {
  const { items, shipping, payment_method, payment_reference } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Your basket is empty." });
  }
  if (!shipping?.name || !shipping?.phone || !shipping?.address || !shipping?.city) {
    return res.status(400).json({ error: "Complete delivery details are required." });
  }
  if (!VALID_METHODS.includes(payment_method)) {
    return res.status(400).json({ error: "Choose a valid payment method." });
  }
  if (payment_method !== "card" && !String(payment_reference || "").trim()) {
    return res.status(400).json({ error: "Enter the transaction ID from your payment app." });
  }

  let subtotal = 0;
  const resolvedItems = [];
  for (const item of items) {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.id);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    subtotal += product.price * qty;
    resolvedItems.push({ product_id: product.id, product_name: product.name, price: product.price, qty });
  }
  if (resolvedItems.length === 0) {
    return res.status(400).json({ error: "No valid items found in your basket." });
  }

  const shipping_fee = subtotal > 5000 ? 0 : 250;
  const total = subtotal + shipping_fee;
  // Card is treated as an instant demo payment. Wallet methods (JazzCash/Easypaisa/SadaPay)
  // are manual transfers that need to be confirmed against the reference number by an admin.
  const status = payment_method === "card" ? "paid" : "pending_payment";
  const order_code = generateOrderCode();

  const insertOrder = db.prepare(`
    INSERT INTO orders
      (order_code, user_id, status, payment_method, payment_reference, shipping_name, shipping_phone, shipping_address, shipping_city, subtotal, shipping_fee, total)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, price, qty) VALUES (?,?,?,?,?)`
  );

  const orderId = db.transaction(() => {
    const info = insertOrder.run(
      order_code,
      req.user.id,
      status,
      payment_method,
      payment_reference || null,
      shipping.name,
      shipping.phone,
      shipping.address,
      shipping.city,
      subtotal,
      shipping_fee,
      total
    );
    for (const item of resolvedItems) {
      insertItem.run(info.lastInsertRowid, item.product_id, item.product_name, item.price, item.qty);
    }
    return info.lastInsertRowid;
  })();

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  res.json(attachItems(order));
});

// Logged-in customer's own orders
router.get("/mine", authRequired, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json(orders.map(attachItems));
});

// Admin: all orders
router.get("/", authRequired, adminRequired, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json(orders.map(attachItems));
});

// Admin: update order status (e.g. mark a wallet payment as verified/paid)
router.put("/:id/status", authRequired, adminRequired, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status." });
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found." });
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json(attachItems(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id)));
});

module.exports = router;
