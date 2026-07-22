# PS Deals v3.6.3 — Interfaz estable

## Cambio visible
El menú lateral conserva exactamente el mismo ancho, posición, espaciado y desplazamiento en todos los módulos. Al navegar solo cambia el contenido derecho.

## Prueba rápida
1. Abre Dashboard y observa el borde derecho del menú.
2. Navega a Ventas, Inventario, Gastos, Clientes y Reportes.
3. El borde derecho, logo y enlaces no deben brincar ni cambiar de tamaño.
4. Reduce la ventana a menos de 992 px: el menú debe ocultarse y abrir desde el botón móvil.
5. El menú debe poder desplazarse internamente sin mover la página.

## Archivos principales
- `css/components.css`: cascarón visual común y reglas de estabilidad.
- `js/component-loader.js`: versión 3.6.3 y aplicación automática del cascarón.
- 15 páginas HTML: cargan el CSS común al final y usan `ps-app` / `ps-module-content`.
