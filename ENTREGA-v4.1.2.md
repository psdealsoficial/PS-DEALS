# PS Deals v4.1.2 — Clientes completamente en SQLite

## Validación
1. Inicia con `npm start`.
2. Abre Clientes y crea un registro.
3. Edítalo y recarga la página: el cambio debe permanecer.
4. Busca por nombre, teléfono o correo.
5. Intenta repetir teléfono/correo: debe bloquearlo.
6. Elimina el cliente: sus ventas históricas no se borran.
7. Ejecuta Diagnóstico y `npm run test:api`.

SQLite es la fuente principal de Clientes. `localStorage` queda como caché.
