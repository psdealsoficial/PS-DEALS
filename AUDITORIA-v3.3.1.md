# PS Deals v3.3.1 — Auditoría y estabilización

## Resultado

La base funcional es válida. No se detectaron referencias locales rotas, identificadores HTML duplicados ni errores de sintaxis JavaScript.

## Correcciones aplicadas

1. Se registró `notificaciones.html` en el sistema de autenticación y permisos.
2. Se añadió el permiso `notificaciones` a los cinco roles existentes.
3. Se incorporó Notificaciones al menú lateral de todos los módulos administrativos.
4. Se conectó la campana flotante y su contador en todos los módulos.
5. Se añadió acceso «Ver todas» desde el centro de alertas del Dashboard.
6. El respaldo ahora incluye preferencias y estados leídos de notificaciones.
7. Se eliminaron carpetas vacías sin uso: `assets`, `components`, `pages` e `img/banners`.
8. Se comprobó que todos los archivos CSS, JS, imágenes y enlaces HTML locales referenciados existan.
9. Se comprobó que no existan IDs HTML duplicados.
10. Se validó la sintaxis de todos los archivos JavaScript con Node.js.

## Hallazgos que no bloquean el funcionamiento

- El sistema depende de CDN para Bootstrap, iconos, fuentes, Chart.js, QRCode, JsBarcode y html2canvas. Sin Internet algunas funciones visuales no cargarán.
- La autenticación y los datos permanecen en `localStorage`; es adecuado para uso local en un solo navegador, pero no constituye seguridad multiusuario real.
- Las contraseñas usan un hash sencillo local. No debe considerarse protección para una versión publicada en Internet.
- El menú aún está repetido dentro de cada HTML. En una futura versión conviene convertirlo en un componente único, pero no es necesario rehacer el sistema ahora.

## Pruebas recomendadas

1. Entrar como Administrador y abrir todos los módulos.
2. Crear un usuario de cada rol y confirmar que Notificaciones sea visible.
3. Generar una alerta de stock bajo.
4. Marcarla como leída y recargar la página.
5. Crear un respaldo y verificar que incluya las dos claves de notificaciones.
6. Realizar una venta, imprimir ticket y comprobar el descuento de inventario.
