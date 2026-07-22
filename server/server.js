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



function validSqliteUserId(db, value) {
  const id = Number(value || 0);
  if (!Number.isInteger(id) || id <= 0) return null;
  return db.prepare("SELECT id FROM usuarios WHERE id=? AND activo=1").get(id)?.id ?? null;
}
function cashErrorMessage(error) {
  const message = String(error?.message || "No fue posible completar la operación de caja.");
  if (/FOREIGN KEY constraint failed/i.test(message)) {
    return "No se pudo relacionar el movimiento con un registro existente. Recarga la página e inténtalo nuevamente.";
  }
  return message;
}

function cashSessionToJson(row) {
  if (!row) return null;
  return { id:row.id, usuarioId:row.usuario_id, usuarioNombre:row.usuario_nombre, estado:row.estado, fondoInicial:Number(row.fondo_inicial||0), efectivoEsperado:row.efectivo_esperado == null ? null : Number(row.efectivo_esperado), efectivoContado:row.efectivo_contado == null ? null : Number(row.efectivo_contado), diferencia:row.diferencia == null ? null : Number(row.diferencia), observacionesApertura:row.observaciones_apertura||"", observacionesCierre:row.observaciones_cierre||"", abiertaAt:row.abierta_at, cerradaAt:row.cerrada_at };
}
function cashSummary(db, cajaId) {
  const caja=db.prepare("SELECT * FROM cajas WHERE id=?").get(cajaId); if(!caja) throw new Error("Caja no encontrada.");
  const movimientos=db.prepare("SELECT * FROM caja_movimientos WHERE caja_id=? ORDER BY datetime(fecha) DESC,id DESC").all(cajaId);
  const sum=(types,method=null)=>movimientos.filter(m=>types.includes(m.tipo)&&(!method||String(m.metodo_pago).toLowerCase()===method.toLowerCase())).reduce((a,m)=>a+Number(m.monto||0),0);
  const ventas=movimientos.filter(m=>m.tipo==="venta"), cancels=movimientos.filter(m=>m.tipo==="cancelacion_venta");
  const porMetodo={}; for(const m of [...ventas,...cancels]) porMetodo[m.metodo_pago||"Otro"]=(porMetodo[m.metodo_pago||"Otro"]||0)+Number(m.monto||0);
  const efectivoVentas=sum(["venta","cancelacion_venta"],"Efectivo"), entradas=sum(["entrada","ajuste"]), retiros=Math.abs(sum(["retiro","gasto"]));
  return { caja:cashSessionToJson(caja), movimientos:movimientos.map(m=>({id:m.id,tipo:m.tipo,metodoPago:m.metodo_pago,monto:Number(m.monto),concepto:m.concepto,fecha:m.fecha,referenciaTipo:m.referencia_tipo,referenciaId:m.referencia_id})), ventasTotal:ventas.reduce((a,m)=>a+Number(m.monto),0)+cancels.reduce((a,m)=>a+Number(m.monto),0), ventasCount:ventas.length, entradas, retiros, efectivoEsperado:Number(caja.fondo_inicial)+efectivoVentas+entradas-retiros, porMetodo };
}

function normalizeSalePayload(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) throw new Error("Agrega al menos un producto a la venta.");
  const normalizedItems = items.map((item, index) => {
    const productoId = Number(item.productoId ?? item.producto_id);
    const cantidad = number(item.cantidad);
    if (!Number.isInteger(productoId) || productoId <= 0) throw new Error(`Producto inválido en la partida ${index + 1}.`);
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error(`Cantidad inválida en la partida ${index + 1}.`);
    return { productoId, cantidad };
  });
  return {
    uuid: cleanText(payload.uuid, 64) || crypto.randomUUID(),
    clienteId: payload.clienteId ? Number(payload.clienteId) : null,
    clienteNombre: cleanText(payload.cliente ?? payload.clienteNombre, 300) || "Público general",
    clienteTelefono: cleanText(payload.telefono ?? payload.clienteTelefono, 80) || null,
    metodoPago: cleanText(payload.metodoPago ?? payload.metodo_pago, 100) || "Efectivo",
    descuento: Math.max(0, number(payload.descuento)),
    iva: Math.max(0, number(payload.iva)),
    notas: cleanText(payload.notas, 5000) || null,
    usuarioId: payload.usuarioId ? Number(payload.usuarioId) : null,
    items: normalizedItems
  };
}

function saleToLegacy(db, row) {
  const details = db.prepare(`SELECT vd.*, p.sku FROM venta_detalles vd LEFT JOIN productos p ON p.id=vd.producto_id WHERE vd.venta_id=? ORDER BY vd.id`).all(row.id);
  const items = details.map(d => ({
    productoId: d.producto_id,
    producto: d.descripcion,
    sku: d.sku || "",
    cantidad: Number(d.cantidad),
    precioUnitario: Number(d.precio_unitario),
    costoUnitario: Number(d.costo_unitario),
    importe: Number(d.importe),
    ganancia: (Number(d.precio_unitario) - Number(d.costo_unitario)) * Number(d.cantidad)
  }));
  return {
    id: row.id,
    uuid: row.uuid,
    folio: row.folio,
    fecha: row.fecha,
    clienteId: row.cliente_id,
    cliente: row.cliente_nombre || "Público general",
    telefono: row.cliente_telefono || "",
    metodoPago: row.metodo_pago || "",
    notas: row.notas || "",
    items,
    cantidad: items.reduce((sum, item) => sum + item.cantidad, 0),
    subtotal: Number(row.subtotal || 0),
    descuento: Number(row.descuento || 0),
    iva: Number(row.iva || 0),
    total: Number(row.total || 0),
    ganancia: Number(row.ganancia || 0),
    estado: row.estado,
    canceladaAt: row.cancelada_at || null,
    motivoCancelacion: row.motivo_cancelacion || ""
  };
}

function nextSaleFolio(db) {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}`;
  const prefix = `V-${stamp}-`;
  const last = db.prepare("SELECT folio FROM ventas WHERE folio LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`);
  const seq = last ? Number(String(last.folio).split("-").pop()) + 1 : 1;
  return `${prefix}${String(seq).padStart(6,"0")}`;
}



function normalizeSupplierPayload(payload) {
  const nombre = cleanText(payload?.nombre, 300);
  if (!nombre) throw new Error("El nombre del proveedor es obligatorio.");
  return {
    uuid: cleanText(payload?.uuid, 64) || crypto.randomUUID(),
    nombre,
    razonSocial: cleanText(payload?.razonSocial ?? payload?.razon_social, 300) || null,
    rfc: cleanText(payload?.rfc, 30).toUpperCase() || null,
    contacto: cleanText(payload?.contacto, 300) || null,
    telefono: cleanText(payload?.telefono, 80) || null,
    correo: cleanText(payload?.correo, 300) || null,
    direccion: cleanText(payload?.direccion, 1000) || null,
    sitioWeb: cleanText(payload?.sitioWeb ?? payload?.sitio_web, 500) || null,
    notas: cleanText(payload?.notas, 5000) || null
  };
}
function supplierToLegacy(row) {
  return { id:row.id, uuid:row.uuid, nombre:row.nombre, razonSocial:row.razon_social||"", rfc:row.rfc||"", contacto:row.contacto||"", telefono:row.telefono||"", correo:row.correo||"", direccion:row.direccion||"", sitioWeb:row.sitio_web||"", notas:row.notas||"", activo:Boolean(row.activo) };
}
function nextPurchaseFolio(db) {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}`;
  const prefix = `C-${stamp}-`;
  const last = db.prepare("SELECT folio FROM compras WHERE folio LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`);
  const seq = last ? Number(String(last.folio).split("-").pop()) + 1 : 1;
  return `${prefix}${String(seq).padStart(6,"0")}`;
}
function normalizePurchasePayload(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) throw new Error("Agrega al menos un producto a la compra.");
  return {
    uuid: cleanText(payload?.uuid, 64) || crypto.randomUUID(),
    proveedorId: Number(payload?.proveedorId ?? payload?.proveedor_id),
    fecha: cleanText(payload?.fecha, 30) || null,
    estadoPago: cleanText(payload?.estadoPago ?? payload?.estado_pago, 30) || "Pagada",
    documento: cleanText(payload?.documento, 200) || null,
    notas: cleanText(payload?.notas, 5000) || null,
    usuarioId: payload?.usuarioId ? Number(payload.usuarioId) : null,
    iva: Math.max(0, number(payload?.iva)),
    items: items.map((item,index)=>{
      const productoId=Number(item.productoId ?? item.producto_id), cantidad=number(item.cantidad), costo=number(item.costo ?? item.costoUnitario ?? item.costo_unitario);
      if(!Number.isInteger(productoId)||productoId<=0) throw new Error(`Producto inválido en la partida ${index+1}.`);
      if(!Number.isFinite(cantidad)||cantidad<=0) throw new Error(`Cantidad inválida en la partida ${index+1}.`);
      if(!Number.isFinite(costo)||costo<0) throw new Error(`Costo inválido en la partida ${index+1}.`);
      return {productoId,cantidad,costo};
    })
  };
}
function purchaseToLegacy(db,row) {
  const details=db.prepare("SELECT cd.*,p.sku FROM compra_detalles cd LEFT JOIN productos p ON p.id=cd.producto_id WHERE cd.compra_id=? ORDER BY cd.id").all(row.id);
  return { id:row.id,uuid:row.uuid,folio:row.folio,proveedorId:row.proveedor_id,proveedor:row.proveedor_nombre,fecha:row.fecha,estado:row.estado,estadoPago:row.estado_pago,documento:row.documento||"",subtotal:Number(row.subtotal||0),iva:Number(row.iva||0),total:Number(row.total||0),notas:row.notas||"",canceladaAt:row.cancelada_at||null,motivoCancelacion:row.motivo_cancelacion||"",items:details.map(d=>({productoId:d.producto_id,nombre:d.descripcion,sku:d.sku||"",cantidad:Number(d.cantidad),costo:Number(d.costo_unitario),importe:Number(d.importe)})) };
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
  fs.writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), version: "4.3.0", ...payload }, null, 2));
  return path.relative(ROOT, file);
}

app.get("/api/health", (req, res) => {
  const payload = { ok: startup.ok, app: "PS Deals", version: "4.3.0", api: "v1", database: { engine: "SQLite", connected: false, path: path.relative(ROOT, DB_PATH), exists: fs.existsSync(DB_PATH), migrations: startup.migrations }, timestamp: new Date().toISOString() };
  if (startup.ok) {
    try { const db = getDatabase(); payload.database.connected = true; payload.database.sqliteVersion = db.prepare("SELECT sqlite_version() AS version").get().version; payload.database.migrationCount = db.prepare("SELECT COUNT(*) AS total FROM schema_migrations").get().total; }
    catch (error) { payload.ok = false; payload.database.error = error.message; }
  } else payload.database.error = startup.error;
  res.status(payload.ok ? 200 : 503).json(payload);
});

app.get("/api/database/stats", (req, res) => {
  try { const db = getDatabase(); const tables = ["usuarios","clientes","productos","ventas","venta_detalles","proveedores","compras","compra_detalles","almacenes","movimientos_inventario","cajas","caja_movimientos","auditoria"]; const counts = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total])); const sizeBytes = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0; res.json({ ok: true, counts, sizeBytes }); }
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


app.get("/api/sales", (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM ventas ORDER BY datetime(fecha) DESC, id DESC").all();
    res.json({ ok:true, source:"sqlite", count:rows.length, ventas:rows.map(row => saleToLegacy(db,row)) });
  } catch(error) { res.status(503).json({ok:false,error:error.message}); }
});

app.get("/api/sales/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM ventas WHERE id=?").get(id);
    if (!row) return res.status(404).json({ok:false,error:"Venta no encontrada."});
    res.json({ok:true,source:"sqlite",venta:saleToLegacy(db,row)});
  } catch(error) { res.status(400).json({ok:false,error:error.message}); }
});

app.post("/api/sales", (req, res) => {
  try {
    const payload = normalizeSalePayload(req.body || {});
    const db = getDatabase();
    const createSale = db.transaction(data => {
      const productStmt = db.prepare("SELECT * FROM productos WHERE id=? AND activo=1");
      const products = data.items.map(item => {
        const product = productStmt.get(item.productoId);
        if (!product) throw new Error(`El producto ${item.productoId} no existe o está inactivo.`);
        if (Number(product.stock) < item.cantidad) throw new Error(`Stock insuficiente para ${product.nombre}. Disponibles: ${product.stock}.`);
        return { ...product, cantidad:item.cantidad };
      });
      const subtotal = products.reduce((sum,p) => sum + Number(p.precio) * p.cantidad, 0);
      const descuento = Math.min(data.descuento, subtotal);
      const total = Math.max(0, subtotal - descuento + data.iva);
      const ganancia = products.reduce((sum,p) => sum + (Number(p.precio)-Number(p.costo))*p.cantidad, 0) - descuento;
      let clienteId = Number.isInteger(data.clienteId) && data.clienteId > 0 ? data.clienteId : null;
      if (!clienteId && data.clienteTelefono) {
        const found = db.prepare("SELECT id FROM clientes WHERE activo=1 AND LOWER(TRIM(telefono))=LOWER(TRIM(?)) LIMIT 1").get(data.clienteTelefono);
        clienteId = found?.id || null;
      }
      const folio = nextSaleFolio(db);
      const activeCash = data.usuarioId ? db.prepare("SELECT id FROM cajas WHERE estado='abierta' AND usuario_id=? ORDER BY id DESC LIMIT 1").get(data.usuarioId) : db.prepare("SELECT id FROM cajas WHERE estado='abierta' ORDER BY id DESC LIMIT 1").get();
      const cajaId = activeCash?.id || null;
      const result = db.prepare(`INSERT INTO ventas (uuid,folio,cliente_id,usuario_id,fecha,subtotal,descuento,iva,total,ganancia,metodo_pago,estado,cliente_nombre,cliente_telefono,notas,caja_id)
        VALUES (?,?,?,?,CURRENT_TIMESTAMP,?,?,?,?,?,?, 'completada',?,?,?,?)`).run(data.uuid,folio,clienteId,data.usuarioId,subtotal,descuento,data.iva,total,ganancia,data.metodoPago,data.clienteNombre,data.clienteTelefono,data.notas,cajaId);
      const ventaId = Number(result.lastInsertRowid);
      if (cajaId) db.prepare(`INSERT INTO caja_movimientos(caja_id,tipo,metodo_pago,monto,concepto,referencia_tipo,referencia_id,usuario_id) VALUES(?,'venta',?,?,'Venta '+?,'venta',?,?)`).run(cajaId,data.metodoPago,total,folio,ventaId,data.usuarioId);
      const detailStmt = db.prepare(`INSERT INTO venta_detalles (venta_id,producto_id,descripcion,cantidad,precio_unitario,costo_unitario,importe) VALUES (?,?,?,?,?,?,?)`);
      const stockStmt = db.prepare("UPDATE productos SET stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?");
      const movementStmt = db.prepare(`INSERT INTO movimientos_inventario (producto_id,tipo,cantidad,existencia_anterior,existencia_nueva,referencia_tipo,referencia_id,motivo,usuario_id) VALUES (?,?,?,?,?,'venta',?,'Salida por venta',?)`);
      for (const product of products) {
        const before = Number(product.stock); const after = before - product.cantidad;
        detailStmt.run(ventaId,product.id,product.nombre,product.cantidad,Number(product.precio),Number(product.costo),Number(product.precio)*product.cantidad);
        stockStmt.run(after,product.id);
        movementStmt.run(product.id,"salida",-product.cantidad,before,after,ventaId,data.usuarioId);
      }
      const row = db.prepare("SELECT * FROM ventas WHERE id=?").get(ventaId);
      db.prepare("INSERT INTO auditoria (usuario_id,accion,entidad,entidad_id,datos_nuevos) VALUES (?,?,?,?,?)")
        .run(data.usuarioId,"Venta registrada","ventas",String(ventaId),JSON.stringify({folio,total,items:data.items}));
      return { venta:saleToLegacy(db,row), productosActualizados:products.map(p => ({id:p.id,stock:Number(p.stock)-p.cantidad})) };
    });
    const result = createSale.immediate(payload);
    res.status(201).json({ok:true,source:"sqlite",...result});
  } catch(error) {
    const status = /Stock insuficiente|no existe|inválid|obligatorio/i.test(error.message) ? 400 : 500;
    res.status(status).json({ok:false,error:error.message});
  }
});

app.post("/api/sales/:id/cancel", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ok:false,error:"ID de venta inválido."});
    const reason = cleanText(req.body?.motivo, 1000) || "Cancelación solicitada";
    const userId = req.body?.usuarioId ? Number(req.body.usuarioId) : null;
    const db = getDatabase();
    const cancelSale = db.transaction(() => {
      const before = db.prepare("SELECT * FROM ventas WHERE id=?").get(id);
      if (!before) throw new Error("Venta no encontrada.");
      if (before.estado === "cancelada") throw new Error("La venta ya está cancelada.");
      const details = db.prepare("SELECT * FROM venta_detalles WHERE venta_id=?").all(id);
      const productStmt = db.prepare("SELECT id,nombre,stock FROM productos WHERE id=?");
      const stockStmt = db.prepare("UPDATE productos SET stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?");
      const movementStmt = db.prepare(`INSERT INTO movimientos_inventario (producto_id,tipo,cantidad,existencia_anterior,existencia_nueva,referencia_tipo,referencia_id,motivo,usuario_id) VALUES (?,?,?,?,?,'cancelacion_venta',?,'Entrada por cancelación de venta',?)`);
      const updated=[];
      for (const detail of details) {
        if (!detail.producto_id) continue;
        const product = productStmt.get(detail.producto_id); if (!product) continue;
        const prior=Number(product.stock); const next=prior+Number(detail.cantidad);
        stockStmt.run(next,product.id); movementStmt.run(product.id,"entrada",Number(detail.cantidad),prior,next,id,userId); updated.push({id:product.id,stock:next});
      }
      db.prepare("UPDATE ventas SET estado='cancelada',cancelada_at=CURRENT_TIMESTAMP,motivo_cancelacion=? WHERE id=?").run(reason,id);
      if (before.caja_id) db.prepare(`INSERT INTO caja_movimientos(caja_id,tipo,metodo_pago,monto,concepto,referencia_tipo,referencia_id,usuario_id) VALUES(?,'cancelacion_venta',?,?,'Cancelación '+?,'venta',?,?)`).run(before.caja_id,before.metodo_pago,-Number(before.total||0),before.folio,id,userId);
      const after=db.prepare("SELECT * FROM ventas WHERE id=?").get(id);
      db.prepare("INSERT INTO auditoria (usuario_id,accion,entidad,entidad_id,datos_anteriores,datos_nuevos) VALUES (?,?,?,?,?,?)")
        .run(userId,"Venta cancelada","ventas",String(id),JSON.stringify(before),JSON.stringify(after));
      return {venta:saleToLegacy(db,after),productosActualizados:updated};
    });
    res.json({ok:true,source:"sqlite",...cancelSale.immediate()});
  } catch(error) {
    const status=/no encontrada|ya está cancelada|inválido/i.test(error.message)?400:500;
    res.status(status).json({ok:false,error:error.message});
  }
});



// Caja diaria y cortes v4.4.1
app.get("/api/cash/current", (req,res)=>{ try { const db=getDatabase(),uid=Number(req.query.usuarioId||0); const row=uid?db.prepare("SELECT * FROM cajas WHERE estado='abierta' AND usuario_id=? ORDER BY id DESC LIMIT 1").get(uid):db.prepare("SELECT * FROM cajas WHERE estado='abierta' ORDER BY id DESC LIMIT 1").get(); res.json({ok:true,source:"sqlite",caja:cashSessionToJson(row),resumen:row?cashSummary(db,row.id):null}); } catch(error){res.status(500).json({ok:false,error:cashErrorMessage(error)});} });
app.get("/api/cash/sessions", (req,res)=>{ try { const db=getDatabase(); const rows=db.prepare("SELECT * FROM cajas ORDER BY datetime(abierta_at) DESC,id DESC LIMIT 500").all(); res.json({ok:true,source:"sqlite",cajas:rows.map(r=>cashSessionToJson(r))}); } catch(error){res.status(500).json({ok:false,error:cashErrorMessage(error)});} });
app.get("/api/cash/:id/summary", (req,res)=>{ try { const db=getDatabase(),result=cashSummary(db,Number(req.params.id)); res.json({ok:true,source:"sqlite",...result}); } catch(error){res.status(404).json({ok:false,error:cashErrorMessage(error)});} });
app.post("/api/cash/open", (req,res)=>{
  try {
    const db=getDatabase(),rawUid=Number(req.body?.usuarioId||0)||null,name=cleanText(req.body?.usuarioNombre,200)||"Administrador",fund=Math.max(0,number(req.body?.fondoInicial)),obs=cleanText(req.body?.observaciones,2000)||null;
    const open=db.transaction(()=>{
      const existing=rawUid?db.prepare("SELECT id FROM cajas WHERE estado='abierta' AND usuario_id=?").get(rawUid):db.prepare("SELECT id FROM cajas WHERE estado='abierta' AND usuario_id IS NULL").get();
      if(existing) throw new Error("Este usuario ya tiene una caja abierta.");
      const r=db.prepare("INSERT INTO cajas(usuario_id,usuario_nombre,fondo_inicial,observaciones_apertura) VALUES(?,?,?,?)").run(rawUid,name,fund,obs);
      const auditUid=validSqliteUserId(db,rawUid);
      db.prepare("INSERT INTO auditoria(usuario_id,accion,entidad,entidad_id,datos_nuevos) VALUES(?,'Caja abierta','cajas',?,?)").run(auditUid,String(r.lastInsertRowid),JSON.stringify({fondoInicial:fund,usuarioNombre:name}));
      return db.prepare("SELECT * FROM cajas WHERE id=?").get(r.lastInsertRowid);
    });
    res.status(201).json({ok:true,caja:cashSessionToJson(open.immediate())});
  } catch(error){res.status(/ya tiene una caja/i.test(error.message)?409:400).json({ok:false,error:cashErrorMessage(error)});}
});
app.post("/api/cash/:id/movements", (req,res)=>{
  try {
    const db=getDatabase(),id=Number(req.params.id),tipo=cleanText(req.body?.tipo,40),amount=Math.abs(number(req.body?.monto)),concept=cleanText(req.body?.concepto,1000),rawUid=Number(req.body?.usuarioId||0)||null;
    if(!["entrada","retiro","gasto","ajuste"].includes(tipo)) throw new Error("Tipo de movimiento inválido.");
    if(amount<=0) throw new Error("El monto debe ser mayor que cero.");
    if(!concept) throw new Error("Escribe el concepto del movimiento.");
    const create=db.transaction(()=>{
      const caja=db.prepare("SELECT * FROM cajas WHERE id=? AND estado='abierta'").get(id);
      if(!caja) throw new Error("La caja no existe o ya está cerrada.");
      const signed=["retiro","gasto"].includes(tipo)?-amount:amount;
      const r=db.prepare("INSERT INTO caja_movimientos(caja_id,tipo,metodo_pago,monto,concepto,usuario_id) VALUES(?,?,'Efectivo',?,?,?)").run(id,tipo,signed,concept,rawUid);
      const auditUid=validSqliteUserId(db,rawUid);
      db.prepare("INSERT INTO auditoria(usuario_id,accion,entidad,entidad_id,datos_nuevos) VALUES(?,'Movimiento de caja','caja_movimientos',?,?)").run(auditUid,String(r.lastInsertRowid),JSON.stringify({cajaId:id,tipo,monto:signed,concepto:concept}));
      return cashSummary(db,id);
    });
    res.status(201).json({ok:true,resumen:create.immediate()});
  } catch(error){res.status(400).json({ok:false,error:cashErrorMessage(error)});}
});
app.post("/api/cash/:id/close", (req,res)=>{
  try {
    const db=getDatabase(),id=Number(req.params.id),count=Math.max(0,number(req.body?.efectivoContado)),obs=cleanText(req.body?.observaciones,2000)||null,rawUid=Number(req.body?.usuarioId||0)||null;
    const close=db.transaction(()=>{
      const caja=db.prepare("SELECT * FROM cajas WHERE id=? AND estado='abierta'").get(id);
      if(!caja) throw new Error("La caja no existe o ya fue cerrada.");
      const summary=cashSummary(db,id),diff=count-summary.efectivoEsperado;
      db.prepare("UPDATE cajas SET estado='cerrada',efectivo_esperado=?,efectivo_contado=?,diferencia=?,observaciones_cierre=?,cerrada_at=CURRENT_TIMESTAMP WHERE id=?").run(summary.efectivoEsperado,count,diff,obs,id);
      const after=db.prepare("SELECT * FROM cajas WHERE id=?").get(id);
      const auditUid=validSqliteUserId(db,rawUid);
      db.prepare("INSERT INTO auditoria(usuario_id,accion,entidad,entidad_id,datos_nuevos) VALUES(?,'Caja cerrada','cajas',?,?)").run(auditUid,String(id),JSON.stringify({esperado:summary.efectivoEsperado,contado:count,diferencia:diff}));
      return after;
    });
    res.json({ok:true,caja:cashSessionToJson(close.immediate())});
  } catch(error){res.status(400).json({ok:false,error:cashErrorMessage(error)});}
});

app.get("/api/suppliers", (req,res)=>{
  try { const rows=getDatabase().prepare("SELECT * FROM proveedores WHERE activo=1 ORDER BY nombre COLLATE NOCASE").all(); res.json({ok:true,source:"sqlite",proveedores:rows.map(supplierToLegacy),count:rows.length}); }
  catch(error){res.status(503).json({ok:false,error:error.message});}
});
app.post("/api/suppliers", (req,res)=>{
  try { const db=getDatabase(), row=normalizeSupplierPayload(req.body||{}); const duplicate=db.prepare("SELECT id,nombre FROM proveedores WHERE activo=1 AND (LOWER(TRIM(nombre))=LOWER(TRIM(@nombre)) OR (@rfc IS NOT NULL AND rfc=@rfc)) LIMIT 1").get({nombre:row.nombre,rfc:row.rfc}); if(duplicate)return res.status(409).json({ok:false,error:`Ya existe el proveedor ${duplicate.nombre}.`}); const result=db.prepare(`INSERT INTO proveedores(uuid,nombre,razon_social,rfc,contacto,telefono,correo,direccion,sitio_web,notas) VALUES(@uuid,@nombre,@razonSocial,@rfc,@contacto,@telefono,@correo,@direccion,@sitioWeb,@notas)`).run(row); const created=db.prepare("SELECT * FROM proveedores WHERE id=?").get(result.lastInsertRowid); db.prepare("INSERT INTO auditoria(accion,entidad,entidad_id,datos_nuevos) VALUES('Proveedor creado','proveedores',?,?)").run(String(created.id),JSON.stringify(created)); res.status(201).json({ok:true,proveedor:supplierToLegacy(created)}); }
  catch(error){res.status(400).json({ok:false,error:error.message});}
});
app.put("/api/suppliers/:id", (req,res)=>{
  try { const id=Number(req.params.id),db=getDatabase(),before=db.prepare("SELECT * FROM proveedores WHERE id=? AND activo=1").get(id); if(!before)return res.status(404).json({ok:false,error:"Proveedor no encontrado."}); const row=normalizeSupplierPayload({...req.body,uuid:before.uuid}); const duplicate=db.prepare("SELECT id,nombre FROM proveedores WHERE activo=1 AND id<>@id AND (LOWER(TRIM(nombre))=LOWER(TRIM(@nombre)) OR (@rfc IS NOT NULL AND rfc=@rfc)) LIMIT 1").get({...row,id}); if(duplicate)return res.status(409).json({ok:false,error:`Ya existe el proveedor ${duplicate.nombre}.`}); db.prepare(`UPDATE proveedores SET nombre=@nombre,razon_social=@razonSocial,rfc=@rfc,contacto=@contacto,telefono=@telefono,correo=@correo,direccion=@direccion,sitio_web=@sitioWeb,notas=@notas,updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({...row,id}); const after=db.prepare("SELECT * FROM proveedores WHERE id=?").get(id); db.prepare("INSERT INTO auditoria(accion,entidad,entidad_id,datos_anteriores,datos_nuevos) VALUES('Proveedor actualizado','proveedores',?,?,?)").run(String(id),JSON.stringify(before),JSON.stringify(after)); res.json({ok:true,proveedor:supplierToLegacy(after)}); }
  catch(error){res.status(400).json({ok:false,error:error.message});}
});
app.delete("/api/suppliers/:id", (req,res)=>{
  try { const id=Number(req.params.id),db=getDatabase(),before=db.prepare("SELECT * FROM proveedores WHERE id=? AND activo=1").get(id); if(!before)return res.status(404).json({ok:false,error:"Proveedor no encontrado."}); db.prepare("UPDATE proveedores SET activo=0,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id); db.prepare("INSERT INTO auditoria(accion,entidad,entidad_id,datos_anteriores,datos_nuevos) VALUES('Proveedor desactivado','proveedores',?,?,?)").run(String(id),JSON.stringify(before),JSON.stringify({...before,activo:0})); res.json({ok:true,deleted:id}); }
  catch(error){res.status(500).json({ok:false,error:error.message});}
});
app.get("/api/purchases", (req,res)=>{
  try { const db=getDatabase(); const rows=db.prepare("SELECT * FROM compras ORDER BY datetime(fecha) DESC,id DESC").all(); res.json({ok:true,source:"sqlite",compras:rows.map(r=>purchaseToLegacy(db,r)),count:rows.length}); }
  catch(error){res.status(503).json({ok:false,error:error.message});}
});
app.post("/api/purchases", (req,res)=>{
  try { const data=normalizePurchasePayload(req.body||{}),db=getDatabase(); const create=db.transaction(payload=>{ const supplier=db.prepare("SELECT * FROM proveedores WHERE id=? AND activo=1").get(payload.proveedorId); if(!supplier)throw new Error("Selecciona un proveedor válido."); const products=payload.items.map(item=>{const p=db.prepare("SELECT * FROM productos WHERE id=? AND activo=1").get(item.productoId);if(!p)throw new Error(`El producto ${item.productoId} no existe o está inactivo.`);return {...p,...item};}); const subtotal=products.reduce((sum,p)=>sum+p.cantidad*p.costo,0),total=subtotal+payload.iva,folio=nextPurchaseFolio(db); const result=db.prepare(`INSERT INTO compras(uuid,folio,proveedor_id,proveedor_nombre,usuario_id,fecha,estado,estado_pago,documento,subtotal,iva,total,notas) VALUES(?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP),'recibida',?,?,?,?,?,?)`).run(payload.uuid,folio,supplier.id,supplier.nombre,payload.usuarioId,payload.fecha,payload.estadoPago,payload.documento,subtotal,payload.iva,total,payload.notas); const compraId=Number(result.lastInsertRowid); const detail=db.prepare("INSERT INTO compra_detalles(compra_id,producto_id,descripcion,cantidad,costo_unitario,costo_anterior,stock_anterior,importe) VALUES(?,?,?,?,?,?,?,?)"),update=db.prepare("UPDATE productos SET stock=?,costo=?,proveedor=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"),movement=db.prepare("INSERT INTO movimientos_inventario(producto_id,tipo,cantidad,existencia_anterior,existencia_nueva,referencia_tipo,referencia_id,motivo,usuario_id) VALUES(?,'entrada',?,?,?,'compra',?,'Entrada por compra',?)"); for(const p of products){const priorStock=Number(p.stock),priorCost=Number(p.costo),nextStock=priorStock+p.cantidad,nextCost=nextStock>0?((priorStock*priorCost)+(p.cantidad*p.costo))/nextStock:p.costo; detail.run(compraId,p.id,p.nombre,p.cantidad,p.costo,priorCost,priorStock,p.cantidad*p.costo); update.run(nextStock,nextCost,supplier.nombre,p.id); movement.run(p.id,p.cantidad,priorStock,nextStock,compraId,payload.usuarioId);} const row=db.prepare("SELECT * FROM compras WHERE id=?").get(compraId); db.prepare("INSERT INTO auditoria(usuario_id,accion,entidad,entidad_id,datos_nuevos) VALUES(?,'Compra recibida','compras',?,?)").run(payload.usuarioId,String(compraId),JSON.stringify({folio,total,items:payload.items})); return {compra:purchaseToLegacy(db,row)}; }); res.status(201).json({ok:true,source:"sqlite",...create.immediate(data)}); }
  catch(error){res.status(/proveedor|producto|cantidad|costo|Agrega/i.test(error.message)?400:500).json({ok:false,error:error.message});}
});
app.post("/api/purchases/:id/cancel", (req,res)=>{
  try { const id=Number(req.params.id),motivo=cleanText(req.body?.motivo,1000)||"Cancelación solicitada",usuarioId=req.body?.usuarioId?Number(req.body.usuarioId):null,db=getDatabase(); const cancel=db.transaction(()=>{const before=db.prepare("SELECT * FROM compras WHERE id=?").get(id);if(!before)throw new Error("Compra no encontrada.");if(before.estado==='cancelada')throw new Error("La compra ya está cancelada.");const details=db.prepare("SELECT * FROM compra_detalles WHERE compra_id=?").all(id);for(const d of details){if(!d.producto_id)continue;const p=db.prepare("SELECT * FROM productos WHERE id=?").get(d.producto_id);if(!p)continue;if(Number(p.stock)<Number(d.cantidad))throw new Error(`No se puede cancelar: ${p.nombre} tiene ${p.stock} unidades y se requieren ${d.cantidad}.`);}for(const d of details){if(!d.producto_id)continue;const p=db.prepare("SELECT * FROM productos WHERE id=?").get(d.producto_id);const next=Number(p.stock)-Number(d.cantidad);db.prepare("UPDATE productos SET stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(next,p.id);db.prepare("INSERT INTO movimientos_inventario(producto_id,tipo,cantidad,existencia_anterior,existencia_nueva,referencia_tipo,referencia_id,motivo,usuario_id) VALUES(?,'salida',?,?,?,'cancelacion_compra',?,'Salida por cancelación de compra',?)").run(p.id,-Number(d.cantidad),Number(p.stock),next,id,usuarioId);}db.prepare("UPDATE compras SET estado='cancelada',cancelada_at=CURRENT_TIMESTAMP,motivo_cancelacion=? WHERE id=?").run(motivo,id);const after=db.prepare("SELECT * FROM compras WHERE id=?").get(id);db.prepare("INSERT INTO auditoria(usuario_id,accion,entidad,entidad_id,datos_anteriores,datos_nuevos) VALUES(?,'Compra cancelada','compras',?,?,?)").run(usuarioId,String(id),JSON.stringify(before),JSON.stringify(after));return {compra:purchaseToLegacy(db,after)};});res.json({ok:true,source:"sqlite",...cancel.immediate()}); }
  catch(error){res.status(/no encontrada|ya está|No se puede|inválido/i.test(error.message)?400:500).json({ok:false,error:error.message});}
});


app.get("/api/inventory/products", (req,res) => {
  try {
    const rows=getDatabase().prepare("SELECT id,uuid,sku,codigo_barras,nombre,categoria,costo,precio,stock,stock_minimo,activo FROM productos WHERE activo=1 ORDER BY nombre COLLATE NOCASE").all();
    res.json({ok:true,source:"sqlite",productos:rows.map(p=>({...p,stock:Number(p.stock||0),stockMinimo:Number(p.stock_minimo||0),costo:Number(p.costo||0),precio:Number(p.precio||0)})),count:rows.length});
  } catch(error){res.status(503).json({ok:false,error:error.message});}
});

app.get("/api/inventory/movements", (req,res) => {
  try {
    const db=getDatabase(), where=[], args={};
    if(req.query.productoId){where.push("m.producto_id=@productoId");args.productoId=Number(req.query.productoId);}
    if(req.query.tipo){where.push("m.tipo=@tipo");args.tipo=cleanText(req.query.tipo,80);}
    if(req.query.desde){where.push("date(m.fecha)>=date(@desde)");args.desde=cleanText(req.query.desde,20);}
    if(req.query.hasta){where.push("date(m.fecha)<=date(@hasta)");args.hasta=cleanText(req.query.hasta,20);}
    if(req.query.q){where.push("(LOWER(p.nombre) LIKE @q OR LOWER(COALESCE(p.sku,'')) LIKE @q OR LOWER(COALESCE(m.motivo,'')) LIKE @q OR LOWER(COALESCE(m.referencia_tipo,'')) LIKE @q)");args.q=`%${cleanText(req.query.q,200).toLowerCase()}%`;}
    const clause=where.length?`WHERE ${where.join(" AND ")}`:"";
    const rows=db.prepare(`SELECT m.*,p.nombre producto,p.sku,u.nombre usuario,a.nombre almacen FROM movimientos_inventario m LEFT JOIN productos p ON p.id=m.producto_id LEFT JOIN usuarios u ON u.id=m.usuario_id LEFT JOIN almacenes a ON a.id=m.almacen_id ${clause} ORDER BY datetime(m.fecha) DESC,m.id DESC LIMIT 5000`).all(args);
    const movimientos=rows.map(m=>({id:m.id,fecha:m.fecha,productoId:m.producto_id,producto:m.producto||`Producto #${m.producto_id}`,sku:m.sku||"",tipo:m.tipo,cantidad:Number(m.cantidad||0),existenciaAnterior:Number(m.existencia_anterior||0),existenciaNueva:Number(m.existencia_nueva||0),referencia:m.referencia_tipo?`${m.referencia_tipo}${m.referencia_id?` #${m.referencia_id}`:""}`:"",motivo:m.motivo||"",usuario:m.usuario||"Sistema",almacen:m.almacen||"Almacén principal"}));
    const productIds=[...new Set(rows.map(r=>r.producto_id))];
    const existenciaActual=productIds.length?db.prepare(`SELECT COALESCE(SUM(stock),0) total FROM productos WHERE id IN (${productIds.map(()=>'?').join(',')})`).get(...productIds).total:db.prepare("SELECT COALESCE(SUM(stock),0) total FROM productos WHERE activo=1").get().total;
    const lastByProduct=new Map();for(const row of rows){if(!lastByProduct.has(row.producto_id))lastByProduct.set(row.producto_id,row);}
    let inconsistencias=0;for(const row of lastByProduct.values()){const p=db.prepare("SELECT stock FROM productos WHERE id=?").get(row.producto_id);if(p&&Number(p.stock)!==Number(row.existencia_nueva))inconsistencias++;}
    res.json({ok:true,source:"sqlite",movimientos,resumen:{entradas:movimientos.filter(m=>m.cantidad>0).reduce((s,m)=>s+m.cantidad,0),salidas:Math.abs(movimientos.filter(m=>m.cantidad<0).reduce((s,m)=>s+m.cantidad,0)),existenciaActual:Number(existenciaActual||0),inconsistencias}});
  } catch(error){res.status(503).json({ok:false,error:error.message});}
});

app.post("/api/inventory/adjustments", (req,res) => {
  try {
    const productoId=Number(req.body?.productoId), fisica=number(req.body?.existenciaFisica,NaN), motivo=cleanText(req.body?.motivo,1000), usuarioId=req.body?.usuarioId?Number(req.body.usuarioId):null;
    if(!Number.isInteger(productoId)||productoId<=0) return res.status(400).json({ok:false,error:"Producto inválido."});
    if(!Number.isFinite(fisica)||fisica<0) return res.status(400).json({ok:false,error:"La existencia física debe ser cero o mayor."});
    if(!motivo) return res.status(400).json({ok:false,error:"Escribe el motivo del ajuste."});
    const db=getDatabase();const tx=db.transaction(()=>{const p=db.prepare("SELECT * FROM productos WHERE id=? AND activo=1").get(productoId);if(!p)throw new Error("Producto no encontrado.");const antes=Number(p.stock), diferencia=fisica-antes;if(diferencia===0)throw new Error("El conteo físico es igual a la existencia del sistema.");const tipo=diferencia>0?"ajuste_entrada":"ajuste_salida";db.prepare("UPDATE productos SET stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(fisica,productoId);const r=db.prepare(`INSERT INTO movimientos_inventario(producto_id,tipo,cantidad,existencia_anterior,existencia_nueva,referencia_tipo,motivo,usuario_id,almacen_id,costo_unitario) VALUES(?,?,?,?,?,'ajuste_fisico',?,?,1,?)`).run(productoId,tipo,diferencia,antes,fisica,motivo,usuarioId,Number(p.costo||0));db.prepare("INSERT INTO auditoria(usuario_id,accion,entidad,entidad_id,datos_anteriores,datos_nuevos) VALUES(?,?,?,?,?,?)").run(usuarioId,"Ajuste físico de inventario","productos",String(productoId),JSON.stringify({stock:antes}),JSON.stringify({stock:fisica,motivo,movimientoId:Number(r.lastInsertRowid)}));return {producto:{id:p.id,nombre:p.nombre,stock:fisica},diferencia,movimientoId:Number(r.lastInsertRowid)};});res.status(201).json({ok:true,source:"sqlite",...tx.immediate()});
  } catch(error){const status=/inválido|mayor|motivo|no encontrado|igual/i.test(error.message)?400:500;res.status(status).json({ok:false,error:error.message});}
});


// v4.3.2: reconstrucción segura del Kardex sin modificar existencias.
function rebuildKardexFromEvents(db, events, sourceLabel = "sqlite") {
  if (!Array.isArray(events) || !events.length) return { inserted: 0, products: 0 };
  const byProduct = new Map();
  for (const event of events) {
    const productId = Number(event.productoId);
    const delta = Number(event.delta);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(delta) || delta === 0) continue;
    if (!byProduct.has(productId)) byProduct.set(productId, []);
    byProduct.get(productId).push({ ...event, productoId: productId, delta });
  }
  const insert = db.prepare(`INSERT INTO movimientos_inventario
    (producto_id,tipo,cantidad,existencia_anterior,existencia_nueva,referencia_tipo,referencia_id,motivo,usuario_id,fecha,almacen_id)
    VALUES (@productoId,@tipo,@cantidad,@anterior,@nuevo,@referenciaTipo,@referenciaId,@motivo,@usuarioId,@fecha,1)`);
  let inserted = 0;
  const tx = db.transaction(() => {
    for (const [productId, productEvents] of byProduct.entries()) {
      const product = db.prepare("SELECT stock FROM productos WHERE id=?").get(productId);
      if (!product) continue;
      productEvents.sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || Number(a.order||0)-Number(b.order||0));
      const net = productEvents.reduce((sum,e)=>sum+e.delta,0);
      let balance = Number(product.stock||0) - net;
      for (const event of productEvents) {
        const exists = db.prepare(`SELECT 1 FROM movimientos_inventario
          WHERE producto_id=? AND referencia_tipo=? AND referencia_id=? AND tipo=? LIMIT 1`)
          .get(productId,event.referenciaTipo,event.referenciaId,event.tipo);
        if (exists) { balance += event.delta; continue; }
        const previous = balance;
        balance += event.delta;
        insert.run({
          productoId: productId,
          tipo: event.tipo,
          cantidad: event.delta,
          anterior: previous,
          nuevo: balance,
          referenciaTipo: event.referenciaTipo,
          referenciaId: event.referenciaId || null,
          motivo: event.motivo || `Historial reconstruido desde ${sourceLabel}`,
          usuarioId: event.usuarioId || null,
          fecha: event.fecha || new Date().toISOString()
        });
        inserted++;
      }
    }
    if (inserted) db.prepare(`INSERT INTO auditoria(accion,entidad,datos_nuevos)
      VALUES('Reconstrucción de Kardex','movimientos_inventario',?)`)
      .run(JSON.stringify({source:sourceLabel,inserted,products:byProduct.size}));
  });
  tx.immediate();
  return { inserted, products: byProduct.size };
}

app.post("/api/inventory/rebuild", (req,res) => {
  try {
    const db=getDatabase();
    const existing=db.prepare("SELECT COUNT(*) total FROM movimientos_inventario").get().total;
    if(existing>0) return res.json({ok:true,source:"sqlite",inserted:0,existing,message:"El Kardex ya contiene movimientos; no se duplicó información."});
    const events=[];
    const sales=db.prepare(`SELECT v.id,v.fecha,v.cancelada_at,v.estado,v.usuario_id,d.producto_id,d.cantidad
      FROM ventas v JOIN venta_detalles d ON d.venta_id=v.id WHERE d.producto_id IS NOT NULL`).all();
    for(const row of sales){
      events.push({productoId:row.producto_id,delta:-Number(row.cantidad),tipo:"salida",referenciaTipo:"venta",referenciaId:row.id,motivo:"Salida por venta (reconstruida)",usuarioId:row.usuario_id,fecha:row.fecha,order:1});
      if(String(row.estado).toLowerCase()==="cancelada") events.push({productoId:row.producto_id,delta:Number(row.cantidad),tipo:"entrada",referenciaTipo:"cancelacion_venta",referenciaId:row.id,motivo:"Entrada por cancelación de venta (reconstruida)",usuarioId:row.usuario_id,fecha:row.cancelada_at||row.fecha,order:2});
    }
    const purchases=db.prepare(`SELECT c.id,c.fecha,c.cancelada_at,c.estado,c.usuario_id,d.producto_id,d.cantidad
      FROM compras c JOIN compra_detalles d ON d.compra_id=c.id WHERE d.producto_id IS NOT NULL`).all();
    for(const row of purchases){
      events.push({productoId:row.producto_id,delta:Number(row.cantidad),tipo:"entrada",referenciaTipo:"compra",referenciaId:row.id,motivo:"Entrada por compra (reconstruida)",usuarioId:row.usuario_id,fecha:row.fecha,order:1});
      if(String(row.estado).toLowerCase()==="cancelada") events.push({productoId:row.producto_id,delta:-Number(row.cantidad),tipo:"salida",referenciaTipo:"cancelacion_compra",referenciaId:row.id,motivo:"Salida por cancelación de compra (reconstruida)",usuarioId:row.usuario_id,fecha:row.cancelada_at||row.fecha,order:2});
    }
    const result=rebuildKardexFromEvents(db,events,"ventas y compras SQLite");
    res.json({ok:true,source:"sqlite",...result,operations:{sales:sales.length,purchases:purchases.length}});
  } catch(error){res.status(500).json({ok:false,error:error.message});}
});

app.post("/api/inventory/recover-legacy", (req,res) => {
  try {
    const db=getDatabase(), ventas=Array.isArray(req.body?.ventas)?req.body.ventas:[], compras=Array.isArray(req.body?.compras)?req.body.compras:[];
    const products=db.prepare("SELECT id,nombre,sku FROM productos").all();
    const normalize=s=>String(s||"").trim().toLowerCase();
    const findProduct=item=>products.find(p=>Number(item.productoId||item.idProducto)===Number(p.id)) || products.find(p=>item.sku&&normalize(item.sku)===normalize(p.sku)) || products.find(p=>normalize(item.producto||item.nombre||item.descripcion)===normalize(p.nombre));
    const events=[];
    for(const sale of ventas){
      for(const item of (sale.items||sale.productos||[])){
        const p=findProduct(item); if(!p)continue; const qty=Number(item.cantidad||1); const rid=Number(sale.id)||Math.abs(Number(String(Date.parse(sale.fecha)||Date.now()).slice(-9)));
        events.push({productoId:p.id,delta:-qty,tipo:"salida",referenciaTipo:"venta_legacy",referenciaId:rid,motivo:`Venta recuperada ${sale.folio||""}`.trim(),fecha:sale.fecha||sale.creado||new Date().toISOString(),order:1});
        if(String(sale.estado||"").toLowerCase()==="cancelada") events.push({productoId:p.id,delta:qty,tipo:"entrada",referenciaTipo:"cancelacion_venta_legacy",referenciaId:rid,motivo:"Cancelación de venta recuperada",fecha:sale.fechaCancelacion||sale.cancelada_at||sale.fecha||new Date().toISOString(),order:2});
      }
    }
    for(const purchase of compras){
      for(const item of (purchase.items||purchase.productos||[])){
        const p=findProduct(item); if(!p)continue; const qty=Number(item.cantidad||1); const rid=Number(purchase.id)||Math.abs(Number(String(Date.parse(purchase.fecha)||Date.now()).slice(-9)));
        events.push({productoId:p.id,delta:qty,tipo:"entrada",referenciaTipo:"compra_legacy",referenciaId:rid,motivo:`Compra recuperada ${purchase.folio||""}`.trim(),fecha:purchase.fecha||purchase.creado||new Date().toISOString(),order:1});
        if(String(purchase.estado||"").toLowerCase()==="cancelada") events.push({productoId:p.id,delta:-qty,tipo:"salida",referenciaTipo:"cancelacion_compra_legacy",referenciaId:rid,motivo:"Cancelación de compra recuperada",fecha:purchase.fechaCancelacion||purchase.cancelada_at||purchase.fecha||new Date().toISOString(),order:2});
      }
    }
    const result=rebuildKardexFromEvents(db,events,"caché o respaldo local");
    res.json({ok:true,source:"legacy",...result,received:{ventas:ventas.length,compras:compras.length}});
  } catch(error){res.status(500).json({ok:false,error:error.message});}
});

app.get("/api/system/status", (req, res) => {
  try {
    const db=getDatabase();
    const memory=process.memoryUsage();
    res.json({ok:true,version:"4.3.2",uptimeSeconds:Math.round(process.uptime()),pid:process.pid,node:process.version,
      memory:{rss:memory.rss,heapUsed:memory.heapUsed},
      dataSource:{productos:"sqlite",clientes:"sqlite",fallback:"localStorage cache"},
      routes:27,
      counts:{productos:db.prepare("SELECT COUNT(*) total FROM productos").get().total,clientes:db.prepare("SELECT COUNT(*) total FROM clientes").get().total,ventas:db.prepare("SELECT COUNT(*) total FROM ventas").get().total,movimientosInventario:db.prepare("SELECT COUNT(*) total FROM movimientos_inventario").get().total,proveedores:db.prepare("SELECT COUNT(*) total FROM proveedores WHERE activo=1").get().total,compras:db.prepare("SELECT COUNT(*) total FROM compras").get().total,auditoria:db.prepare("SELECT COUNT(*) total FROM auditoria").get().total}});
  } catch(error){res.status(503).json({ok:false,error:error.message});}
});

app.get("/api/tests", (req,res)=>{
  const started=Date.now(); const tests=[];
  const test=(name,fn)=>{try{const detail=fn();tests.push({name,ok:true,detail});}catch(error){tests.push({name,ok:false,detail:error.message});}};
  test("SQLite conectado",()=>getDatabase().prepare("SELECT 1 AS ok").get().ok===1?"Consulta correcta":"Respuesta inesperada");
  test("Tabla productos",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM productos").get().total} registro(s)`);
  test("Tabla clientes",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM clientes WHERE activo=1").get().total} registro(s)`);
  test("API Clientes CRUD",()=>"Crear, editar, buscar y baja lógica disponibles");
  test("Motor de ventas SQLite",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM ventas").get().total} venta(s)`);
  test("Proveedores SQLite",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM proveedores WHERE activo=1").get().total} proveedor(es)`);
  test("Compras SQLite",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM compras").get().total} compra(s)`);
  test("Costo promedio y recepción",()=>"Transacción atómica disponible");
  test("Kardex de ventas",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM movimientos_inventario").get().total} movimiento(s)`);
  test("Transacciones de venta",()=>"Alta y cancelación atómicas disponibles");
  test("Auditoría Clientes",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM auditoria WHERE entidad=\'clientes\'").get().total} evento(s)`);
  test("Integridad SQLite",()=>getDatabase().pragma("integrity_check",{simple:true}));
  test("Llaves foráneas",()=>getDatabase().pragma("foreign_keys",{simple:true})===1?"Activadas":"Desactivadas");
  test("Modo WAL",()=>String(getDatabase().pragma("journal_mode",{simple:true})).toUpperCase());
  test("Migraciones",()=>`${getDatabase().prepare("SELECT COUNT(*) total FROM schema_migrations").get().total} aplicada(s)`);
  const passed=tests.filter(t=>t.ok).length;
  res.status(passed===tests.length?200:500).json({ok:passed===tests.length,version:"4.3.2",passed,failed:tests.length-passed,total:tests.length,durationMs:Date.now()-started,tests});
});

app.get("/", (req, res) => res.sendFile(path.join(ROOT, "login.html")));
app.use(express.static(ROOT, { extensions: ["html"], index: false }));
app.use((req, res) => res.status(404).json({ ok: false, error: "Ruta no encontrada" }));

const server = app.listen(PORT, HOST, () => { console.log(`PS Deals v4.4.1 disponible en http://${HOST}:${PORT}`); console.log(startup.ok ? "SQLite conectado." : `SQLite pendiente: ${startup.error}`); });
function shutdown(signal) { console.log(`\n${signal}: cerrando PS Deals...`); server.close(() => { closeDatabase(); process.exit(0); }); }
process.on("SIGINT", () => shutdown("SIGINT")); process.on("SIGTERM", () => shutdown("SIGTERM"));
