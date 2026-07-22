"use strict";
const { getDatabase, closeDatabase } = require("./database");
const { runMigrations } = require("./migrate");
let failed=0;
function test(name,fn){try{const detail=fn();console.log(`✔ ${name}: ${detail}`);}catch(e){failed++;console.error(`✘ ${name}: ${e.message}`);}}
try{runMigrations();test("SQLite",()=>getDatabase().prepare("SELECT sqlite_version() version").get().version);test("Integridad",()=>getDatabase().pragma("integrity_check",{simple:true}));test("Productos",()=>getDatabase().prepare("SELECT COUNT(*) total FROM productos").get().total);test("Clientes",()=>getDatabase().prepare("SELECT COUNT(*) total FROM clientes").get().total);}finally{closeDatabase();}
process.exitCode=failed?1:0;
