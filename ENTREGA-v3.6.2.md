# PS Deals v3.6.2 — Arquitectura modular, fase 2

## Cambios visibles

- Ventas, Inventario y Gastos ya usan `components/sidebar.html`.
- El menú móvil abre y cierra desde las tres vistas migradas.
- `Diagnóstico` muestra cobertura modular por página y porcentaje total.
- Se detectan menús duplicados y enlaces activos incorrectos.
- La versión se centraliza en `js/system-info.js`.

## Prueba

1. Abrir `ventas.html`, `admin.html` y `gastos.html`.
2. Confirmar que el mismo menú aparece en las tres páginas.
3. Reducir la ventana y probar el botón de menú.
4. Abrir `diagnostico.html` y ejecutar pruebas.
5. La cobertura esperada es 100 % y “Menús duplicados” debe indicar Correcto.
