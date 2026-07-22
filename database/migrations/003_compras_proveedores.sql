PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  nombre TEXT NOT NULL,
  razon_social TEXT,
  rfc TEXT,
  contacto TEXT,
  telefono TEXT,
  correo TEXT,
  direccion TEXT,
  sitio_web TEXT,
  notas TEXT,
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  folio TEXT NOT NULL UNIQUE,
  proveedor_id INTEGER,
  proveedor_nombre TEXT NOT NULL,
  usuario_id INTEGER,
  fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado TEXT NOT NULL DEFAULT 'recibida',
  estado_pago TEXT NOT NULL DEFAULT 'Pagada',
  documento TEXT,
  subtotal REAL NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  iva REAL NOT NULL DEFAULT 0 CHECK (iva >= 0),
  total REAL NOT NULL DEFAULT 0 CHECK (total >= 0),
  notas TEXT,
  cancelada_at TEXT,
  motivo_cancelacion TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS compra_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL,
  producto_id INTEGER,
  descripcion TEXT NOT NULL,
  cantidad REAL NOT NULL CHECK (cantidad > 0),
  costo_unitario REAL NOT NULL CHECK (costo_unitario >= 0),
  costo_anterior REAL NOT NULL DEFAULT 0,
  stock_anterior REAL NOT NULL DEFAULT 0,
  importe REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id, fecha);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado, fecha);
CREATE INDEX IF NOT EXISTS idx_compra_detalles_compra ON compra_detalles(compra_id);
