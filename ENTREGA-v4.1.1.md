# PS Deals v4.1.1 — Corrección de edición de productos

## Problema corregido
Al leer productos desde SQLite, algunos campos visuales que todavía no existen como columnas en la base de datos (imagen, precio anterior, estrellas, envío y destacados) se perdían. Esto provocaba que la validación del formulario impidiera actualizar productos.

## Solución
- Se combinan los datos principales de SQLite con los campos visuales conservados en la caché local.
- Se agregaron valores seguros de compatibilidad para productos leídos desde la API.
- SQLite continúa siendo la fuente principal para nombre, SKU, costo, precio y stock.

## Prueba
1. Iniciar el servidor con `npm start`.
2. Abrir Inventario.
3. Editar precio o stock de un producto.
4. Guardar.
5. Recargar la página y confirmar que el cambio permanece.
6. Revisar Servidor y SQLite para confirmar la sincronización.
