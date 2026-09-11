const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "mandi.sqlite"));
db.pragma("journal_mode = WAL");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      image_url TEXT,
      rating REAL DEFAULT 4.5,
      reviews INTEGER DEFAULT 0,
      description TEXT,
      stock INTEGER DEFAULT 50,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      payment_method TEXT NOT NULL,
      payment_reference TEXT,
      shipping_name TEXT,
      shipping_phone TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      subtotal INTEGER,
      shipping_fee INTEGER,
      total INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const productCount = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (productCount === 0) {
    const insert = db.prepare(
      `INSERT INTO products (name, category, price, image_url, rating, reviews, description, stock) VALUES (?,?,?,?,?,?,?,?)`
    );
    const seedProducts = [
      ["Wireless Earbuds Pro", "Electronics", 4500, "https://picsum.photos/seed/earbuds-mandi/600/600", 4.4, 312, "Crisp sound, 24-hour battery with the case, and a snug fit for daily commutes.", 40],
      ["Smart Fitness Watch", "Electronics", 8900, "https://picsum.photos/seed/smartwatch-mandi/600/600", 4.2, 187, "Tracks steps, heart rate, and sleep, with a week-long battery life.", 25],
      ["Portable Power Bank 20000mAh", "Electronics", 3200, "https://picsum.photos/seed/powerbank-mandi/600/600", 4.6, 540, "Charges two devices at once and refills a phone from empty about four times.", 60],
      ["Bluetooth Speaker Mini", "Electronics", 2800, "https://picsum.photos/seed/speaker-mandi/600/600", 4.1, 98, "Pocket-sized speaker with surprisingly full bass and a water-resistant shell.", 35],
      ["Embroidered Cotton Kurta", "Fashion", 3100, "https://picsum.photos/seed/kurta-mandi/600/600", 4.7, 221, "Breathable cotton kurta with hand-finished embroidery detail.", 50],
      ["Running Sneakers", "Fashion", 5600, "https://picsum.photos/seed/sneakers-mandi/600/600", 4.3, 164, "Lightweight cushioning built for daily runs and everyday wear.", 30],
      ["Leather Handbag", "Fashion", 4200, "https://picsum.photos/seed/handbag-mandi/600/600", 4.5, 87, "Genuine leather handbag with a structured shape and interior pockets.", 20],
      ["Classic Sunglasses", "Fashion", 1800, "https://picsum.photos/seed/sunglasses-mandi/600/600", 4.0, 56, "UV-protective lenses in a frame that suits most face shapes.", 45],
      ["Non-Stick Cooking Pan", "Home", 2600, "https://picsum.photos/seed/pan-mandi/600/600", 4.4, 143, "Even heat distribution with a scratch-resistant non-stick coating.", 40],
      ["Cotton Bedsheet Set", "Home", 3400, "https://picsum.photos/seed/bedsheet-mandi/600/600", 4.6, 276, "Soft 100% cotton sheet set with two matching pillow covers.", 55],
      ["Ceramic Table Lamp", "Home", 2200, "https://picsum.photos/seed/lamp-mandi/600/600", 4.2, 64, "Warm ambient lighting with a handcrafted ceramic base.", 25],
      ["Personal Blender", "Home", 3900, "https://picsum.photos/seed/blender-mandi/600/600", 4.3, 118, "Compact blender for smoothies and shakes, with a dishwasher-safe cup.", 30],
      ["Vitamin C Face Serum", "Beauty", 1600, "https://picsum.photos/seed/serum-mandi/600/600", 4.5, 402, "Brightening daily serum with vitamin C and hyaluronic acid.", 70],
      ["Signature Eau de Parfum", "Beauty", 5200, "https://picsum.photos/seed/perfume-mandi/600/600", 4.6, 199, "A long-lasting scent with warm amber and citrus notes.", 20],
      ["Compact Hair Dryer", "Beauty", 2900, "https://picsum.photos/seed/dryer-mandi/600/600", 4.1, 77, "Fast-drying with a cool-shot button and a travel-friendly size.", 25],
      ["The Silent Orchard - Novel", "Books", 950, "https://picsum.photos/seed/novel-mandi/600/600", 4.8, 331, "A quiet, character-driven story about a family orchard through the seasons.", 60],
      ["Everyday Desi Cookbook", "Books", 1200, "https://picsum.photos/seed/cookbook-mandi/600/600", 4.7, 145, "Home-style recipes with step-by-step photos and pantry swaps.", 40],
      ["Desk Organizer Set", "Home", 1500, "https://picsum.photos/seed/organizer-mandi/600/600", 4.0, 41, "Modular trays to keep stationery and small desk items in place.", 35],
    ];
    const insertMany = db.transaction((rows) => {
      for (const r of rows) insert.run(...r);
    });
    insertMany(seedProducts);
  }

  const adminExists = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = ?").get("admin").c;
  if (adminExists === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)").run(
      "Admin",
      "admin@mandi.pk",
      hash,
      "admin"
    );
    console.log("Seeded admin account -> email: admin@mandi.pk / password: admin123 (change this!)");
  }
}

module.exports = { db, initDb };
