# PS Deals v4.2.1 — Abastecimiento SQLite

## Incluye
- Proveedores CRUD en SQLite.
- Compras y detalle de compra en SQLite.
- Recepción atómica de mercancía.
- Incremento de stock y costo promedio ponderado.
- Kardex de entradas.
- Cancelación con reversión de stock y validación de existencias.
- Auditoría y caché local de compatibilidad.

## Prueba
1. Crear proveedor.
2. Registrar compra con un producto.
3. Confirmar aumento de stock y nuevo costo promedio.
4. Recargar Compras.
5. Cancelar la compra y confirmar reversión del stock.
6. Ejecutar `npm run test:api`.
