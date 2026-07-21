# PS Deals v3.6 — Arquitectura modular (Fase 1)

## Objetivo
Centralizar la navegación lateral para evitar que cada módulo mantenga una copia distinta del menú.

## Cambios
- Nuevo componente único: `components/sidebar.html`.
- Nuevo cargador: `js/component-loader.js`.
- Menú activo determinado automáticamente por la página actual.
- Subtítulo del sistema ajustado automáticamente por módulo.
- Permisos aplicados después de cargar el componente.
- Migradas 11 páginas con la estructura visual estándar del sistema.

## Páginas migradas
- dashboard.html
- notificaciones.html
- actividad.html
- apartados.html
- devoluciones.html
- compras.html
- clientes.html
- cuentas-cobrar.html
- reportes.html
- configuracion.html
- usuarios.html

## Páginas conservadas temporalmente
`admin.html`, `ventas.html` y `gastos.html` utilizan estructuras visuales distintas. Se conservaron sin una migración forzada para no romper sus formularios, POS o estilos. Se integrarán en una fase posterior mediante una barra de navegación compartida compatible con su diseño.

## Uso
Para agregar, retirar o reordenar opciones del menú lateral, modifica únicamente:

`components/sidebar.html`

El proyecto debe abrirse con Live Server, ya que los componentes se cargan mediante HTTP local.
