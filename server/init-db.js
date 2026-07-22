"use strict";

const { DB_PATH, closeDatabase } = require("./database");
const { runMigrations } = require("./migrate");

try {
  const migrations = runMigrations();
  console.log(`Base de datos lista: ${DB_PATH}`);
  for (const migration of migrations) {
    console.log(`- ${migration.file}: ${migration.status}`);
  }
} catch (error) {
  console.error("No fue posible inicializar SQLite:", error.message);
  process.exitCode = 1;
} finally {
  closeDatabase();
}
