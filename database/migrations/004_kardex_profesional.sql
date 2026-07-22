PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS almacenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT UNIQUE,
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO almacenes (id,nombre,codigo,activo) VALUES (1,'Almacén principal','PRINCIPAL',1);

ALTER TABLE movimientos_inventario ADD COLUMN almacen_id INTEGER DEFAULT 1 REFERENCES almacenes(id) ON DELETE SET NULL;
ALTER TABLE movimientos_inventario ADD COLUMN costo_unitario REAL DEFAULT 0;

UPDATE movimientos_inventario SET almacen_id=1 WHERE almacen_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo_fecha ON movimientos_inventario(tipo, fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen_fecha ON movimientos_inventario(almacen_id, fecha);
