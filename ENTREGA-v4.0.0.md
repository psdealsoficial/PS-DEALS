# PS Deals v4.0.0 — Fundamentos de persistencia

Esta entrega inicia la transición de `localStorage` a SQLite sin alterar todavía los módulos operativos.

## Incluye

- Servidor local Node.js + Express.
- Base de datos SQLite en `database/psdeals.db`.
- Migraciones versionadas en `database/migrations/`.
- API de salud: `GET /api/health`.
- Estadísticas iniciales: `GET /api/database/stats`.
- Diagnóstico visible de API, SQLite y migraciones.
- Primera estructura para usuarios, clientes, productos, ventas, detalles, movimientos de inventario, configuración y auditoría.

## Instalación

```bash
cd ~/Documentos/PS-DEALS
npm install
npm start
```

Abrir:

```text
http://127.0.0.1:4173
```

A partir de v4.0 no uses Live Server para validar SQLite. El servidor de PS Deals sirve tanto la interfaz como la API.

## Prueba

1. Inicia con `npm start`.
2. Abre Diagnóstico.
3. Ejecuta las pruebas.
4. Deben aparecer como Correcto:
   - API local
   - Base de datos SQLite
   - Migraciones de base de datos
5. Comprueba en terminal:

```bash
curl http://127.0.0.1:4173/api/health
```

## Alcance

Los módulos siguen leyendo y escribiendo en `localStorage`. Esto es intencional. La v4.0.0 crea la infraestructura; la migración de catálogos y operaciones se realizará por etapas para evitar pérdida de datos.
