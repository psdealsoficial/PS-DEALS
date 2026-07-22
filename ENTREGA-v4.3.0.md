# PS Deals v4.3.0 — Kardex profesional

## Incluye
- Pantalla `kardex.html`.
- API `/api/inventory/products`, `/api/inventory/movements` y `/api/inventory/adjustments`.
- Filtros, saldos, CSV, impresión y ajustes físicos.
- Migración `004_kardex_profesional.sql`.
- Preparación de almacén principal y trazabilidad completa.

## Validación
1. Inicia con `npm start`.
2. Abre Kardex desde el menú.
3. Confirma que aparecen movimientos de ventas, cancelaciones y compras.
4. Exporta CSV.
5. Realiza un ajuste físico de prueba y confirma stock y movimiento.
6. Ejecuta `npm run test:api`.
