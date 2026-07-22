# PS Deals v4.3.3 — Corrección de renderizado del Kardex

Esta entrega corrige el fallo de interfaz causado por intentar acceder a `classList` de un elemento inexistente. Los movimientos ya recuperados en SQLite no se modifican.

## Validación

1. Inicia con `npm start`.
2. Abre `http://localhost:3000/kardex.html`.
3. Haz `Ctrl + Shift + R`.
4. Confirma que se muestran las filas del historial.
5. Ejecuta `npm run test:api`.
