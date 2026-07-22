"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, getDatabase } = require("./database");

const MIGRATIONS_DIR = path.join(ROOT, "database", "migrations");

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function runMigrations() {
  const db = getDatabase();
  ensureMigrationTable(db);
  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map(row => row.version)
  );
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort();

  const result = [];
  for (const file of files) {
    const version = file.split("_")[0];
    if (applied.has(version)) {
      result.push({ version, file, status: "already_applied" });
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare(
        "INSERT INTO schema_migrations (version, name) VALUES (?, ?)"
      ).run(version, file);
    });
    apply();
    result.push({ version, file, status: "applied" });
  }
  return result;
}

module.exports = { runMigrations };
