# PS Deals v4.4.0 — Caja diaria y cortes de caja

## Incluye
- Apertura de caja con fondo inicial.
- Turno activo por usuario.
- Ventas enlazadas automáticamente al turno activo.
- Entradas, retiros, gastos y ajustes de efectivo.
- Resumen por método de pago.
- Efectivo esperado, conteo físico y diferencia.
- Cierre irreversible y auditable.
- Historial de turnos.
- Impresión del corte.
- Persistencia SQLite mediante migración 005.

## Validación
1. Abre caja con fondo inicial.
2. Registra una venta en efectivo.
3. Comprueba que aparezca en Caja diaria.
4. Registra una entrada y un retiro.
5. Cierra la caja y valida la diferencia.
6. Ejecuta `npm run test:api`.
