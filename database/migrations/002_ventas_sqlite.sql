PRAGMA foreign_keys = ON;

ALTER TABLE ventas ADD COLUMN cliente_nombre TEXT;
ALTER TABLE ventas ADD COLUMN cliente_telefono TEXT;
ALTER TABLE ventas ADD COLUMN notas TEXT;
ALTER TABLE ventas ADD COLUMN iva REAL NOT NULL DEFAULT 0;
ALTER TABLE ventas ADD COLUMN ganancia REAL NOT NULL DEFAULT 0;
ALTER TABLE ventas ADD COLUMN cancelada_at TEXT;
ALTER TABLE ventas ADD COLUMN motivo_cancelacion TEXT;

CREATE INDEX IF NOT EXISTS idx_ventas_estado_fecha ON ventas(estado, fecha);
CREATE INDEX IF NOT EXISTS idx_venta_detalles_venta ON venta_detalles(venta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_referencia ON movimientos_inventario(referencia_tipo, referencia_id);
