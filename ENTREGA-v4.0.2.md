# PS Deals v4.0.2 — Sincronización dual SQLite

## Objetivo
Mantener Productos y Clientes en localStorage durante la transición y reflejar automáticamente cada cambio en SQLite.

## Cambios visibles
- Nuevo módulo **Servidor y SQLite**.
- Estado del servidor, SQLite, tamaño de BD y conteos.
- Botón **Sincronizar ahora**.
- Nueva prueba de Diagnóstico: **Sincronización dual SQLite**.

## Seguridad
- localStorage sigue siendo la fuente principal temporal.
- SQLite recibe una copia actualizada.
- No se eliminan datos del navegador.
- Los cambios se auditan en SQLite.

## Prueba
1. Mantener `npm start` activo.
2. Abrir Inventario y cambiar el stock o precio de un producto.
3. Abrir **Servidor y SQLite**.
4. Confirmar que los conteos coinciden y la última sincronización se actualiza.
5. Ejecutar Diagnóstico.
