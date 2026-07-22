PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cajas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  usuario_nombre TEXT NOT NULL DEFAULT 'Administrador',
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
  fondo_inicial REAL NOT NULL DEFAULT 0 CHECK (fondo_inicial >= 0),
  efectivo_esperado REAL,
  efectivo_contado REAL,
  diferencia REAL,
  observaciones_apertura TEXT,
  observaciones_cierre TEXT,
  abierta_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrada_at TEXT
);

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('venta','cancelacion_venta','entrada','retiro','gasto','ajuste')),
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  monto REAL NOT NULL,
  concepto TEXT,
  referencia_tipo TEXT,
  referencia_id INTEGER,
  usuario_id INTEGER,
  fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE RESTRICT
);

ALTER TABLE ventas ADD COLUMN caja_id INTEGER REFERENCES cajas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_caja_abierta_usuario ON cajas(usuario_id) WHERE estado='abierta';
CREATE INDEX IF NOT EXISTS idx_cajas_estado_fecha ON cajas(estado, abierta_at);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_caja_fecha ON caja_movimientos(caja_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_caja ON ventas(caja_id);
