"use strict";

const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { ROOT, DB_PATH, getDatabase, closeDatabase } = require("./database");
const { runMigrations } = require("./migrate");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "8mb" }));

let startup = { ok: false, migrations: [], error: null };
try {
  startup.migrations = runMigrations();
  startup.ok = true;
} catch (error) {
  startup.error = error.message;
  console.error("SQLite no pudo iniciar:", error.message);
}

function cleanText(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}
function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function bool(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback ? 1 : 0;
  return value === false || value === 0 || value === "0" || value === "false" ? 0 : 1;
}
function stableUuid(type, legacyId, index) {
  const source = `${type}:${legacyId ?? index}`;
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 32);
}
function normalizeProducts(rows) {
  if (!Array.isArray(rows)) throw new Error("Productos debe ser un arreglo.");
  return rows.map((p, index) => ({
    uuid: cleanText(p.uuid, 64) || stableUuid("producto", p.id, index),
    sku: cleanText(p.sku, 120) || null,
    codigo_barras: cleanText(p.codigoBarras ?? p.codigo_barras ?? p.codigo, 160) || null,
    nombre: cleanText(p.nombre, 300),
    categoria: cleanText(p.categoria, 180) || null,
    descripcion: cleanText(p.descripcion, 5000) || null,
    proveedor: cleanText(p.proveedor, 300) || null,
    costo: Math.max(0, number(p.costo)),
    precio: Math.max(0, number(p.precio)),
    stock: number(p.stock),
    stock_minimo: Math.max(0, number(p.stockMinimo ?? p.stock_minimo)),
    activo: bool(p.activo ?? p.disponible, true),
    legacy_id: p.id ?? null
  })).filter(p => p.nombre);
}
function normalizeClients(rows) {
  if (!Array.isArray(rows)) throw new Error("Clientes debe ser un arreglo.");
  return rows.map((c, index) => ({
    uuid: cleanText(c.uuid, 64) || stableUuid("cliente", c.id, index),
    nombre: cleanText(c.nombre, 300),
    telefono: cleanText(c.telefono, 80) || null,
    correo: cleanText(c.correo ?? c.email, 300) || null,
    direccion: cleanText(c.direccion, 1000) || null,
    notas: cleanText(c.notas, 5000) || null,
    activo: bool(c.activo, true),
    legacy_id: c.id ?? null
  })).filter(c => c.nombre);
}

function normalizeClientPayload(c, legacyId = null) {
  const prepared = { ...c, id: c?.id ?? legacyId };
  if (!prepared.uuid && legacyId === null) prepared.uuid = crypto.randomUUID();
  const row = normalizeClients([prepared])[0];
  if (!row) throw new Error("El nombre del cliente es obligatorio.");
  return row;
}
function findDuplicateClient(db, row, excludeId = null) {
  const conditions = [];
  const params = {};
  if (row.telefono) { conditions.push("LOWER(TRIM(telefono)) = LOWER(TRIM(@telefono))"); params.telefono = row.telefono; }
  if (row.correo) { conditions.push("LOWER(TRIM(correo)) = LOWER(TRIM(@correo))"); params.correo = row.correo; }
  if (!conditions.length) return null;
  let sql = `SELECT id,nombre,telefono,correo FROM clientes WHERE activo=1 AND (${conditions.join(" OR ")})`;
  if (excludeId !== null) { sql += " AND id <> @excludeId"; params.excludeId = Number(excludeId); }
  return db.prepare(sql + " LIMIT 1").get(params) || null;
}
function auditClient(db, action, id, before, after) {
  db.prepare("INSERT INTO auditoria (accion,entidad,entidad_id,datos_anteriores,datos_nuevos) VALUES (?,?,?,?,?)")
    .run(action, "clientes", String(id ?? ""), before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null);
}

function duplicates(rows, field) {
  const seen = new Set(); const repeated = new Set();
  rows.forEach(row => { const value = String(row[field] ?? "").trim().toLowerCase(); if (!value) return; if (seen.has(value)) repeated.add(value); else seen.add(value); });
  return [...repeated];
}
function ensureBackupDir() {
  const dir = path.join(ROOT, "database", "backups"); fs.mkdirSync(dir, { recursive: true }); return dir;
}
function createPreMigrationBackup(payload) {
  const dir = ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `pre-migracion-v4.0.1-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), version: "4.1.2", ...payload }, null, 2));
  return path.relative(ROOT, file);
}

app.get("/api/health", (req, res) => {
  const payload = { ok: startup.ok, app: "PS Deals", version: "4.1.2", api: "v1", database: { engine: "SQLite", connected: false, path: path.relative(ROOT, DB_PATH), exists: fs.existsSync(DB_PATH), migrations: startup.migrations }, timestamp: new Date().toISOString() };
  if (startup.ok) {
    try { const db = getDatabase(); payload.database.connected = true; payload.database.sqliteVersion = db.prepare("SELECT sqlite_version() AS version").get().version; payload.database.migrationCount = db.prepare("SELECT COUNT(*) AS total FROM schema_migrations").get().total; }
    catch (error) { payload.ok = false; payload.database.error = error.message; }
  } else payload.database.error = startup.error;
  res.status(payload.ok ? 200 : 503).json(payload);
});

app.get("/api/database/stats", (req, res) => {
  try { const db = getDatabase(); const tables = ["usuarios","clientes","productos","ventas","venta_detalles","movimientos_inventario","auditoria"]; const counts = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total])); const sizeBytes = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0; res.json({ ok: true, counts, sizeBytes }); }
  catch (error) { res.status(503).json({ ok: false, error: error.message }); }
});

app.post("/api/migration/preview", (req, res) => {
  try {
    const products = normalizeProducts(req.body?.productos || []); const clients = normalizeClients(req.body?.clientes || []);
    const issues = [];
    const skuDup = duplicates(products, "sku"); const barcodeDup = duplicates(products, "codigo_barras");
    if (skuDup.length) issues.push({ type: "warning", entity: "productos", field: "sku", count: skuDup.length, examples: skuDup.slice(0, 5) });
    if (barcodeDup.length) issues.push({ type: "warning", entity: "productos", field: "codigo_barras", count: barcodeDup.length, examples: barcodeDup.slice(0, 5) });
    const invalidProducts = (req.body?.productos || []).length - products.length; const invalidClients = (req.body?.clientes || []).length - clients.length;
    if (invalidProducts) issues.push({ type: "error", entity: "productos", field: "nombre", count: invalidProducts });
    if (invalidClients) issues.push({ type: "error", entity: "clientes", field: "nombre", count: invalidClients });
    res.json({ ok: !issues.some(i => i.type === "error"), source: { productos: req.body?.productos?.length || 0, clientes: req.body?.clientes?.length || 0 }, valid: { productos: products.length, clientes: clients.length }, issues });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

app.post("/api/migration/run", (req, res) => {
  const started = Date.now();
  try {
    const products = normalizeProducts(req.body?.productos || []); const clients = normalizeClients(req.body?.clientes || []);
    if ((req.body?.productos || []).length !== products.length || (req.body?.clientes || []).length !== clients.length) return res.status(400).json({ ok: false, error: "Hay registros sin nombre. Corrígelos antes de migrar." });
    const backup = createPreMigrationBackup({ productos: req.body?.productos || [], clientes: req.body?.clientes || [] });
    const db = getDatabase();
    const upsertProduct = db.prepare(`INSERT INTO productos (uuid,sku,codigo_barras,nombre,categoria,descripcion,proveedor,costo,precio,stock,stock_minimo,activo,updated_at) VALUES (@uuid,@sku,@codigo_barras,@nombre,@categoria,@descripcion,@proveedor,@costo,@precio,@stock,@stock_minimo,@activo,CURRENT_TIMESTAMP) ON CONFLICT(uuid) DO UPDATE SET sku=excluded.sku,codigo_barras=excluded.codigo_barras,nombre=excluded.nombre,categoria=excluded.categoria,descripcion=excluded.descripcion,proveedor=excluded.proveedor,costo=excluded.costo,precio=excluded.precio,stock=excluded.stock,stock_minimo=excluded.stock_minimo,activo=excluded.activo,updated_at=CURRENT_TIMESTAMP`);
    const upsertClient = db.prepare(`INSERT INTO clientes (uuid,nombre,telefono,correo,direccion,notas,activo,updated_at) VALUES (@uuid,@nombre,@telefono,@correo,@direccion,@notas,@activo,CURRENT_TIMESTAMP) ON CONFLICT(uuid) DO UPDATE SET nombre=excluded.nombre,telefono=excluded.telefono,correo=excluded.correo,direccion=excluded.direccion,notas=excluded.notas,activo=excluded.activo,updated_at=CURRENT_TIMESTAMP`);
    const tx = db.transaction(() => { products.forEach(p => upsertProduct.run(p)); clients.forEach(c => upsertClient.run(c)); db.prepare("INSERT INTO auditoria (accion,entidad,datos_nuevos) VALUES (?,?,?)").run("Migración localStorage a SQLite", "productos_clientes", JSON.stringify({ productos: products.length, clientes: clients.length, backup })); });
    tx();
    const counts = { productos: db.prepare("SELECT COUNT(*) AS total FROM productos").get().total, clientes: db.prepare("SELECT COUNT(*) AS total FROM clientes").get().total };
    res.json({ ok: true, imported: { productos: products.length, clientes: clients.length }, database: counts, backup, durationMs: Date.now() - started, localStoragePreserved: true });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.get("/api/migration/status", (req, res) => {
  try { const db = getDatabase(); const last = db.prepare("SELECT accion,datos_nuevos,fecha FROM auditoria WHERE accion='Migración localStorage a SQLite' ORDER BY id DESC LIMIT 1").get() || null; res.json({ ok: true, counts: { productos: db.prepare("SELECT COUNT(*) AS total FROM productos").get().total, clientes: db.prepare("SELECT COUNT(*) AS total FROM clientes").get().total }, last }); }
  catch (error) { res.status(503).json({ ok: false, error: error.message }); }
});



function upsertCatalogs(db, products, clients, action = "Sincronización dual") {
  const upsertProduct = db.prepare(`INSERT INTO productos (uuid,sku,codigo_barras,nombre,categoria,descripcion,proveedor,costo,precio,stock,stock_minimo,activo,updated_at) VALUES (@uuid,@sku,@codigo_barras,@nombre,@categoria,@descripcion,@proveedor,@costo,@precio,@stock,@stock_minimo,@activo,CURRENT_TIMESTAMP) ON CONFLICT(uuid) DO UPDATE SET sku=excluded.sku,codigo_barras=excluded.codigo_barras,nombre=excluded.nombre,categoria=excluded.categoria,descripcion=excluded.descripcion,proveedor=excluded.proveedor,costo=excluded.costo,precio=excluded.precio,stock=excluded.stock,stock_minimo=excluded.stock_minimo,activo=excluded.activo,updated_at=CURRENT_TIMESTAMP`);
  const upsertClient = db.prepare(`INSERT INTO clientes (uuid,nombre,telefono,correo,direccion,notas,activo,updated_at) VALUES (@uuid,@nombre,@telefono,@correo,@direccion,@notas,@activo,CURRENT_TIMESTAMP) ON CONFLICT(uuid) DO UPDATE SET nombre=excluded.nombre,telefono=excluded.telefono,correo=excluded.correo,direccion=excluded.direccion,notas=excluded.notas,activo=excluded.activo,updated_at=CURRENT_TIMESTAMP`);
  db.transaction(() => {
    products.forEach(row => upsertProduct.run(row));
    clients.forEach(row => upsertClient.run(row));
    db.prepare("INSERT INTO auditoria (accion,entidad,datos_nuevos) VALUES (?,?,?)").run(action, "productos_clientes", JSON.stringify({ productos: products.length, clientes: clients.length }));
  })();
}

app.post("/api/sync/push", (req, res) => {
  const started = Date.now();
  try {
    const products = normalizeProducts(req.body?.productos || []);
    const clients = normalizeClients(req.body?.clientes || []);
    const expectedProducts = Array.isArray(req.body?.productos) ? req.body.productos.length : 0;
    const expectedClients = Array.isArray(req.body?.clientes) ? req.body.clientes.length : 0;
    if (products.length !== expectedProducts || clients.length !== expectedClients) {
      return res.status(400).json({ ok: false, error: "La sincronización contiene registros sin nombre." });
    }
    const db = getDatabase();
    upsertCatalogs(db, products, clients, "Sincronización dual localStorage → SQLite");
    const counts = {
      productos: db.prepare("SELECT COUNT(*) AS total FROM productos").get().total,
      clientes: db.prepare("SELECT COUNT(*) AS total FROM clientes").get().total
    };
    res.json({ ok: true, synced: { productos: products.length, clientes: clients.length }, counts, durationMs: Date.now() - started, mode: "dual-write" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/sync/status", (req, res) => {
  try {
    const db = getDatabase();
    const last = db.prepare("SELECT accion,datos_nuevos,fecha FROM auditoria WHERE accion LIKE 'Sincronización dual%' ORDER BY id DESC LIMIT 1").get() || null;
    res.json({
      ok: true,
      mode: "dual-write",
      sourceOfTruth: "localStorage (transición)",
      counts: {
        productos: db.prepare("SELECT COUNT(*) AS total FROM productos").get().total,
        clientes: db.prepare("SELECT COUNT(*) AS total FROM clientes").get().total
      },
      last
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});


function productToLegacy(row) {
  return {
    id: row.legacy_id ?? row.id,
    uuid: row.uuid,
    sku: row.sku || "",
    codigoBarras: row.codigo_barras || "",
    codigo: row.codigo_barras || "",
    nombre: row.nombre,
    categoria: row.categoria || "",
    descripcion: row.descripcion || "",
    proveedor: row.proveedor || "",
    costo: Number(row.costo || 0),
    precio: Number(row.precio || 0),
    stock: Number(row.stock || 0),
    stockMinimo: Number(row.stock_minimo || 0),
    disponible: Boolean(row.activo) && Number(row.stock || 0) > 0,
    activo: Boolean(row.activo),
    antes: Number(row.precio || 0),
    imagen: "img/productos/sin-imagen.jpg",
    estrellas: 0,
    opiniones: 0,
    envio: "Entrega Local",
    nuevo: false,
    destacado: false
  };
}
function clientToLegacy(row) {
  return {
    id: row.legacy_id ?? row.id,
    uuid: row.uuid,
    nombre: row.nombre,
    telefono: row.telefono || "",
    correo: row.correo || "",
    direccion: row.direccion || "",
    notas: row.notas || "",
    activo: Boolean(row.activo)
  };
}

app.get("/api/catalog/products", (req, res) => {
  try {
    const rows = getDatabase().prepare("SELECT *, id AS legacy_id FROM productos ORDER BY nombre COLLATE NOCASE").all();
    res.json({ ok: true, source: "sqlite", count: rows.length, productos: rows.map(productToLegacy) });
  } catch (error) { res.status(503).json({ ok: false, error: error.message }); }
});
app.put("/api/catalog/products", (req, res) => {
  try {
    const rows = normalizeProducts(req.body?.productos || []);
    if (rows.length !== (req.body?.productos || []).length) return res.status(400).json({ ok:false, error:"Hay productos inválidos o sin nombre." });
    const db = getDatabase();
    upsertCatalogs(db, rows, [], "Motor SQLite: guardar productos");
    res.json({ ok:true, source:"sqlite", saved:rows.length, productos:db.prepare("SELECT *, id AS legacy_id FROM productos ORDER BY nombre COLLATE NOCASE").all().map(productToLegacy) });
  } catch(error) { res.status(500).json({ok:false,error:error.message}); }
});
app.get("/api/catalog/clients", (req, res) => {
  try {
    const q = cleanText(req.query.q, 200);
    const db = getDatabase();
    let rows;
    if (q) {
      const like = `%${q}%`;
      rows = db.prepare(`SELECT *, id AS legacy_id FROM clientes
        WHERE activo=1 AND (nombre LIKE @like COLLATE NOCASE OR telefono LIKE @like OR correo LIKE @like COLLATE NOCASE OR direccion LIKE @like COLLATE NOCASE)
        ORDER BY nombre COLLATE NOCASE`).all({ like });
    } else {
      rows = db.prepare("SELECT *, id AS legacy_id FROM clientes WHERE activo=1 ORDER BY nombre COLLATE NOCASE").all();
    }
    res.json({ ok: true, source: "sqlite", count: rows.length, clientes: rows.map(clientToLegacy) });
  } catch (error) { res.status(503).json({ ok: false, error: error.message }); }
});
app.post("/api/catalog/clients", (req, res) => {
  try {
    const db = getDatabase();
    const row = normalizeClientPayload(req.body || {});
    const duplicate = findDuplicateClient(db, row);
    if (duplicate) return res.status(409).json({ ok:false, error:`Ya existe un cliente con ese teléfono o correo: ${duplicate.nombre}.` });
    const result = db.prepare(`INSERT INTO clientes (uuid,nombre,telefono,correo,direccion,notas,activo,created_at,updated_at)
      VALUES (@uuid,@nombre,@telefono,@correo,@direccion,@notas,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(row);
    const created = db.prepare("SELECT *, id AS legacy_id FROM clientes WHERE id=?").get(result.lastInsertRowid);
    auditClient(db, "Cliente creado", created.id, null, created);
    res.status(201).json({ ok:true, source:"sqlite", cliente:clientToLegacy(created) });
  } catch(error) { res.status(400).json({ok:false,error:error.message}); }
});
app.put("/api/catalog/clients/:id", (req, res) => {
  try {
    const id = Number(req.params.id); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ok:false,error:"ID de cliente inválido."});
    const db = getDatabase();
    const before = db.prepare("SELECT * FROM clientes WHERE id=? AND activo=1").get(id);
    if (!before) return res.status(404).json({ok:false,error:"Cliente no encontrado."});
    const row = normalizeClientPayload({ ...req.body, uuid: before.uuid }, id);
    const duplicate = findDuplicateClient(db, row, id);
    if (duplicate) return res.status(409).json({ ok:false, error:`Ya existe un cliente con ese teléfono o correo: ${duplicate.nombre}.` });
    db.prepare(`UPDATE clientes SET nombre=@nombre,telefono=@telefono,correo=@correo,direccion=@direccion,notas=@notas,updated_at=CURRENT_TIMESTAMP WHERE id=@id`)
      .run({ ...row, id });
    const updated = db.prepare("SELECT *, id AS legacy_id FROM clientes WHERE id=?").get(id);
    auditClient(db, "Cliente actualizado", id, before, updated);
    res.json({ok:true,source:"sqlite",cliente:clientToLegacy(updated)});
  } catch(error) { res.status(400).json({ok:false,error:error.message}); }
});
app.delete("/api/catalog/clients/:id", (req, res) => {
  try {
    const id = Number(req.params.id); if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ok:false,error:"ID de cliente inválido."});
    const db = getDatabase();
    const before = db.prepare("SELECT * FROM clientes WHERE id=? AND activo=1").get(id);
    if (!before) return res.status(404).json({ok:false,error:"Cliente no encontrado."});
    db.prepare("UPDATE clientes SET activo=0,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    auditClient(db, "Cliente eliminado", id, before, { ...before, activo:0 });
    res.json({ok:true,source:"sqlite",deleted:id});
  } catch(error) { res.status(500).json({ok:false,error:error.message}); }
});
app.put("/api/catalog/clients", (req, res) => {
  try {
    const rows = normalizeClients(req.body?.clientes || []);
    if (rows.length !== (req.body?.clientes || []).length) return res.status(400).json({ ok:false, error:"Hay clientes inválidos o sin nombre." });
    const db = getDatabase();
    upsertCatalogs(db, [], rows, "Motor SQLite: guardar clientes");
    res.json({ ok:true, source:"sqlite", saved:rows.length, clientes:db.prepare("SELECT *, id AS legacy_id FROM clientes WHERE activo=1 ORDER BY nombre COLLATE NOCASE").all().map(clientToLegacy) });
  } catch(error) { res.status(500).json({ok:false,error:error.message}); }
});

app.get("/api/system/status", (req, res) => {
  try {
    const db=getDatabase();
    const memory=process.memoryUsage();
    res.json({ok:true,version:"4.1.2",uptimeSeconds:Math.round(process.uptime()),pid:process.pid,node:process.version,
      memory:{rss:memory.rss,heapUsed:memory.heapUsed},
      dataSource:{productos:"sqlite",clientes:"sqlite",fallback:"localStorage cache"},
      routes:12,
      counts:{productos:db.prepare("SELECT COUNT(*) total FROM productos").get().total,clientes:db.prepare("SELECT COUNT(*) total FROM clientes").get().total,auditoria:db.prepare("SELECT COUNT(*) total FROM auditoria").get().total}});
  } catch(error){res.status(503).json({ok:false,error:error.message});}
});

app.get("/api/tests", (req,res)=>{
  const started=Date.now(); const tests=[];
  const test=(name,fn)=>{try{const detail=fn();tests.push({name,ok:true,detail});}catch(error){tests.push({name,ok:false,detail:error.message});}};
  test("SQLite conectado",()=>getDatabase().prepare("SELECT 1 AS ok").get().ok===1?"Consulta correcta":"Respuesta inesperada");
  test("Tabla productos",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM productos").get().total} registro(s)`);
  test("Tabla clientes",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM clientes WHERE activo=1").get().total} registro(s)`);
  test("API Clientes CRUD",()=>"Crear, editar, buscar y baja lógica disponibles");
  test("Auditoría Clientes",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM auditoria WHERE entidad=\'clientes\'").get().total} evento(s)`);
  test("Integridad SQLite",()=>getDatabase().pragma("integrity_check",{simple:true}));
  test("Llaves foráneas",()=>getDatabase().pragma("foreign_keys",{simple:true})===1?"Activadas":"Desactivadas");
  test("Modo WAL",()=>String(getDatabase().pragma("journal_mode",{simple:true})).toUpperCase());
  test("Migraciones",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM schema_migrations").get().total} aplicada(s)`);
  const passed=tests.filter(t=>t.ok).length;
  res.status(passed===tests.length?200:500).json({ok:passed===tests.length,version:"4.1.2",passed,failed:tests.length-passed,total:tests.length,durationMs:Date.now()-started,tests});
});

app.get("/", (req, res) => res.sendFile(path.join(ROOT, "login.html")));
app.use(express.static(ROOT, { extensions: ["html"], index: false }));
app.use((req, res) => res.status(404).json({ ok: false, error: "Ruta no encontrada" }));

const server = app.listen(PORT, HOST, () => { console.log(`PS Deals v4.1.2 disponible en http://${HOST}:${PORT}`); console.log(startup.ok ? "SQLite conectado." : `SQLite pendiente: ${startup.error}`); });
function shutdown(signal) { console.log(`\n${signal}: cerrando PS Deals...`); server.close(() => { closeDatabase(); process.exit(0); }); }
process.on("SIGINT", () => shutdown("SIGINT")); process.on("SIGTERM", () => shutdown("SIGTERM"));
