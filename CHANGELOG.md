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
