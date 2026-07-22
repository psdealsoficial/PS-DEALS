# Arquitectura v4.0.0

La interfaz existente se sirve desde Express. El navegador consume `/api/*`; solo el servidor accede al archivo SQLite.

```text
Navegador -> Express (/api) -> better-sqlite3 -> database/psdeals.db
         \-> archivos HTML/CSS/JS estáticos
```

La fase actual conserva localStorage como fuente operativa. SQLite está listo para recibir migraciones progresivas en los siguientes sprints.
