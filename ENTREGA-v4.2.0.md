# PS Deals v4.2.0 — Motor de ventas SQLite

## Incluye

- Registro atómico de ventas en `ventas` y `venta_detalles`.
- Validación de existencias en servidor.
- Descuento de inventario dentro de la misma transacción.
- Kardex automático en `movimientos_inventario`.
- Folios únicos `V-AAAAMMDD-000001`.
- Historial leído desde SQLite.
- Cancelación lógica con devolución de inventario.
- Auditoría de registro y cancelación.
- Protección contra doble cobro.
- Tickets profesionales conservados.

## Prueba principal

1. Ejecuta `npm start`.
2. Abre Ventas y registra una operación.
3. Recarga la página: la venta debe permanecer.
4. Verifica que el stock disminuyó.
5. Cancela la venta: el stock debe regresar y la venta quedar marcada como Cancelada.
6. Ejecuta `npm run test:api`.
