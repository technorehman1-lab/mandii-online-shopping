const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database("./data/mandi.sqlite");

const oldEmail = "admin@mandi.pk";
const newEmail = "technorehman1@gmail.com";
const newPassword = "090909";

const hash = bcrypt.hashSync(newPassword, 10);

db.prepare("UPDATE users SET email = ?, password_hash = ? WHERE email = ?")
console.log("Admin update ho gaya! Naya email:", newEmail);