# PS Deals v4.3.2 — Recuperación del Kardex

- Corrige la causa real del Kardex vacío: ausencia de movimientos en la base de datos.
- Reconstruye movimientos desde ventas y compras SQLite sin modificar existencias.
- Puede recuperar historial desde localStorage o un respaldo JSON.
- Los paquetes de actualización ya no incluyen `psdeals.db`, `-wal` ni `-shm`, para no sobrescribir datos del usuario.
- La reconstrucción es idempotente y evita duplicados.
