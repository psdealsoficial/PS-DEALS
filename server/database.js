"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DB_DIR = path.join(ROOT, "database");
const DB_PATH = process.env.PSDEALS_DB || path.join(DB_DIR, "psdeals.db");

let db;

function getDatabase() {
  if (db) return db;
  fs.mkdirSync(DB_DIR, { recursive: true });

  let Database;
  try {
    Database = require("better-sqlite3");
  } catch (error) {
    const wrapped = new Error(
      "Falta instalar better-sqlite3. Ejecuta: npm install"
    );
    wrapped.cause = error;
    throw wrapped;
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = { ROOT, DB_DIR, DB_PATH, getDatabase, closeDatabase };
