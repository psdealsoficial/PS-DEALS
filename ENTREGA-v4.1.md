# PS Deals v4.1.0 — Motor de datos SQLite

## Cambios
- SQLite es la fuente de lectura para Productos y Clientes.
- localStorage queda como caché de compatibilidad y respaldo temporal.
- API de catálogos: GET/PUT de productos y clientes.
- Panel Servidor ampliado con memoria, uptime, fuente de datos y pruebas API.
- Endpoint `/api/tests` y comando `npm run test:api`.
- Diagnóstico valida Motor SQLite y pruebas automáticas.

## Prueba
1. Ejecuta `npm install` y `npm start`.
2. Abre Inventario y verifica los 5 productos.
3. Modifica un precio y guarda.
4. Recarga la página: el cambio debe conservarse desde SQLite.
5. Abre Servidor y SQLite y pulsa Ejecutar pruebas API.
6. Abre Diagnóstico: debe mostrar versión 4.1.0, Motor de datos SQLite Correcto y Pruebas automáticas API Correcto.

## Seguridad
No borra localStorage. Mantén el respaldo JSON de v3.9.1.
