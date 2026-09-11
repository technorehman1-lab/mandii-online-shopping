const express = require("express");
const { db } = require("../db");
const { authRequired, adminRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json(products);
});

router.get("/:id", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json(product);
});

router.post("/", authRequired, adminRequired, (req, res) => {
  const { name, category, price, image_url, description, stock } = req.body || {};
  if (!name || !category || !price) {
    return res.status(400).json({ error: "Name, category, and price are required." });
  }
  const info = db
    .prepare(
      `INSERT INTO products (name, category, price, image_url, description, stock) VALUES (?,?,?,?,?,?)`
    )
    .run(name, category, Math.round(Number(price)), image_url || "", description || "", stock ?? 50);
  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid));
});

router.put("/:id", authRequired, adminRequired, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });

  const { name, category, price, image_url, description, stock } = req.body || {};
  db.prepare(
    `UPDATE products SET name=?, category=?, price=?, image_url=?, description=?, stock=? WHERE id=?`
  ).run(
    name ?? existing.name,
    category ?? existing.category,
    price != null ? Math.round(Number(price)) : existing.price,
    image_url ?? existing.image_url,
    description ?? existing.description,
    stock ?? existing.stock,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
});

router.delete("/:id", authRequired, adminRequired, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
