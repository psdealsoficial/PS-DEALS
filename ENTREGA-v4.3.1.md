# PS Deals v4.3.1 — Estabilización del Kardex

## Correcciones

- El menú modular carga `components/sidebar.html` sin reutilizar una copia antigua del navegador.
- Kardex incluido en el subtítulo y permisos de Administrador, Supervisor y Almacén/Almacen.
- La migración de permisos se vuelve a ejecutar con una clave nueva.
- El historial conserva movimientos aunque un producto haya sido desactivado o eliminado.
- Mensaje visible de conexión cuando la API no está disponible.
- Peticiones del Kardex con `cache: no-store`.
- Versión del servidor y paquete actualizada a 4.3.1.
- Autotest ampliado con `Movimientos visibles`.

## Validación

1. Iniciar con `npm start`.
2. Abrir `http://localhost:3000/kardex.html`.
3. Confirmar que el menú muestre Kardex y que el historial liste movimientos.
4. Ejecutar `npm run test:api`.
