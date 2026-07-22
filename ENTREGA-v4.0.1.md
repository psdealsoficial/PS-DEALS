# PS Deals v4.0.1 — Asistente de migración

## Objetivo
Copiar productos y clientes desde localStorage hacia SQLite sin borrar los datos originales.

## Uso
1. Ejecuta `npm start`.
2. Abre `http://127.0.0.1:4173/login.html`.
3. Entra a **Migración SQLite**.
4. Pulsa **Validar datos**.
5. Si no hay errores, pulsa **Crear respaldo y migrar**.
6. Comprueba que las cantidades de origen y SQLite coincidan.

## Seguridad
- localStorage permanece intacto.
- El servidor crea un JSON en `database/backups/`.
- La escritura se ejecuta dentro de una transacción SQLite.
- Repetir la migración actualiza por UUID y no duplica los mismos registros.

## No incluido todavía
Inventario y Clientes siguen leyendo localStorage. La conexión funcional con la API llegará en v4.0.2.
