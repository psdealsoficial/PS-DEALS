## v4.4.1 — Estabilización de movimientos de caja

- Corrige `FOREIGN KEY constraint failed` al registrar entradas, retiros, gastos y ajustes.
- Valida el usuario local antes de escribirlo en la auditoría SQLite.
- Apertura, movimientos y cierre de caja ahora son transacciones atómicas.
- Evita movimientos guardados parcialmente cuando falla la auditoría.
- Protege el formulario contra doble envío.
- Agrega comprobación de claves foráneas al autotest.


## v4.3.3 — Corrección de renderizado del Kardex

- Corrige el error `Cannot read properties of null (reading 'classList')`.
- El aviso vacío ahora es opcional y no bloquea la tabla.
- Los KPIs y la tabla se renderizan de forma más resistente.
- Se diferencian mejor los errores de interfaz y conexión.
- Se actualiza la caché de `kardex.js` a la versión 4.3.3.

## [4.3.0] - 2026-07-22

### Añadido
- Kardex profesional consultado directamente desde SQLite.
- Filtros por producto, tipo, fechas y búsqueda libre.
- Saldos anterior/nuevo, referencias, motivos y usuario.
- Exportación CSV e impresión/PDF.
- Ajustes por conteo físico dentro de una transacción.
- Preparación inicial para múltiples almacenes.
- Nuevas pruebas de almacenes y saldos del Kardex.

## v4.2.1 — Abastecimiento SQLite
- Proveedores, compras, costo promedio y Kardex en SQLite.
- Cancelación transaccional de compras.

## v4.1.2 — Clientes completamente en SQLite

- Alta, edición, búsqueda y baja lógica de clientes mediante API.
- SQLite es la fuente principal del módulo Clientes.
- Validación de teléfono/correo duplicados en servidor.
- Auditoría de creación, actualización y eliminación.
- Caché local conservada solo para compatibilidad y recuperación.
- Pruebas API ampliadas.

## v4.1.0 — Motor de datos SQLite
- Catálogos leídos desde SQLite con caché local.
- API de productos y clientes.
- Panel técnico y pruebas automáticas.


## v3.9.1 — Estabilización UX
- Favoritos persistentes por usuario y migración desde la clave anterior.
- Renderizado confiable de Favoritos con sidebar modular.
- Diagnóstico ampliado para Centro de comandos, Favoritos, Ayuda y Atajos.
- Corrección de versión esperada y orden de carga de scripts.
# PS Deals v3.9.0

- Centro de comandos mejorado con Ctrl + K.
- Acciones rápidas para ventas, productos, clientes, gastos, respaldo y diagnóstico.
- Favoritos por usuario/equipo visibles en el menú lateral.
- Búsqueda universal por SKU, código de barras, proveedor, teléfono y correo.
- Ayuda contextual en cada módulo.
- Pestañas de filtrado y navegación con teclado.

# PS Deals v3.7.0 — Optimización y estabilidad

- Monitor global de rendimiento.
- Métricas de carga visibles en Diagnóstico.
- Medición del uso aproximado de localStorage.
- Verificación automática de JSON dañado.
- Versión visual centralizada en el Dashboard.
- Diagnóstico ampliado con rendimiento, almacenamiento e integridad.

# PS Deals v3.4 — Centro de Actividad Inteligente

- Nueva pantalla `actividad.html`.
- Línea de tiempo con filtros por usuario, tipo y fechas.
- Búsqueda textual y paginación.
- Exportación CSV compatible con Excel.
- Impresión y guardado PDF desde el navegador.
- Registro automático de cambios importantes en localStorage.
- Migración automática de permisos para usuarios existentes.
- Acceso a Actividad integrado en los menús.

# v3.3.1 — Auditoría y estabilización

- Permisos de Notificaciones corregidos.
- Navegación y campana unificadas en módulos administrativos.
- Respaldo ampliado para alertas.
- Carpetas vacías eliminadas.
- Validación de referencias, IDs y sintaxis JavaScript.



## v3.5.0 — Dashboard Inteligente
- Comparativos diarios, semanales y mensuales.
- Panel “¿Qué debería hacer hoy?” con prioridades accionables.
- Semáforo de salud del negocio para flujo, rentabilidad, inventario y cobranza.
- Recomendaciones automáticas sobre categorías, clientes e inventario detenido.
- Detección de clientes inactivos, productos sin movimiento y riesgo de agotamiento.

## v3.5.1 — Pulido y productividad
- Búsqueda global de módulos, productos y clientes (`Ctrl + K`).
- Atajos: F2 Ventas, F3 búsqueda local, F4 Clientes, F7 Compras, F8 Gastos y F9 Reportes.
- Sistema global de mensajes toast disponible mediante `PSToast()`.
- Aviso de cambios sin guardar en formularios.
- Apertura directa de productos y clientes desde la búsqueda global.
- Botón para duplicar productos conservando datos comerciales y solicitando SKU nuevo.
- Protección contra doble envío al registrar ventas.
- Ajustes adaptables para móvil.

## v3.6 — Arquitectura modular (Fase 1)
- Se creó un componente central para el menú lateral.
- Se añadió carga modular y selección automática del módulo activo.
- Se centralizó la navegación de once páginas administrativas.
- Se mantuvieron sin cambios los módulos con estructura especializada para evitar regresiones.

## v3.6.1 — Developer Center
- Nueva pantalla de diagnóstico visible.
- Pruebas automáticas de sidebar, componentes, sesión, permisos, almacenamiento y páginas principales.
- Reporte técnico copiable.

## v3.6.2 — Arquitectura modular, fase 2
- Migración de Ventas, Inventario y Gastos al sidebar central.
- CSS compartido de componentes.
- Diagnóstico de cobertura, duplicados y enlace activo.
- Versión centralizada en system-info.js.

## v3.6.3 — Interfaz estable
- Menú lateral con ancho y posición uniformes en todos los módulos.
- Contenido alineado mediante un cascarón visual común.
- Scroll interno del menú y comportamiento móvil unificados.
- Eliminados los saltos visuales causados por estilos antiguos de cada módulo.


## v3.8.0 — Importación y exportación avanzada
- Exportación CSV compatible con Excel por módulo.
- Importación controlada de productos y clientes.
- Vista previa antes de guardar.
- Modos combinar y reemplazar.
- Detección automática de separador y normalización de columnas.

## v4.0.0 — Fundamentos de persistencia

- Se agregó servidor local Node.js + Express.
- Se incorporó SQLite con migraciones versionadas.
- Se creó la primera migración del modelo de datos.
- Se agregaron endpoints de salud y estadísticas.
- Diagnóstico ahora valida API, conexión SQLite y migraciones.
- Los módulos continúan en localStorage durante la transición controlada.


## v4.0.1
- Asistente visual de migración de productos y clientes.
- Validación previa y conteo comparativo.
- Respaldo JSON automático del origen.
- API de vista previa, migración y estado.
- Migración idempotente mediante UUID estable.
- localStorage se conserva como fuente activa durante la transición.

## [4.0.2] - 2026-07-21
### Added
- Sincronización dual automática de Productos y Clientes hacia SQLite.
- Panel Servidor y SQLite.
- Endpoints `/api/sync/push` y `/api/sync/status`.
- Prueba de sincronización dual en Diagnóstico.

## v4.2.0 — Motor de ventas SQLite
- Ventas y detalles almacenados directamente en SQLite.
- Transacciones atómicas con validación de stock.
- Folios automáticos y kardex de salidas.
- Cancelación lógica con devolución de inventario.
- Historial y tickets conectados a la API.

## v4.4.0 — Caja diaria y cortes
- Motor SQLite de turnos de caja.
- Ventas vinculadas a caja activa.
- Entradas, retiros, gastos, ajustes y corte auditable.
