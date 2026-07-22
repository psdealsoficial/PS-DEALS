# PS Deals v4.4.1 — Estabilización de movimientos de caja

Esta versión corrige el error `FOREIGN KEY constraint failed` al registrar entradas o retiros.

## Causa

El identificador del usuario provenía de `localStorage` y podía no existir en la tabla `usuarios` de SQLite. El movimiento se insertaba y después fallaba la auditoría.

## Corrección

- El ID se valida antes de usarlo como clave foránea en auditoría.
- Si no existe en SQLite, la auditoría se registra con usuario nulo sin perder el nombre de la caja.
- Cada operación de caja se ejecuta dentro de una transacción.
- Si falla un paso, se revierte toda la operación.
- Se evita el doble clic al registrar movimientos.

## Nota

Los intentos fallidos de v4.4.0 pudieron haber insertado movimientos antes de mostrar el error. Revisa la tabla después de instalar y elimina o compensa cualquier duplicado mediante un ajuste solo si realmente aparece.
