function enviarWhatsApp(id){

    const producto = productos.find(p => p.id === id);

    if(!producto) return;

    const mensaje =
`Hola 👋

Vi este producto en PS Deals.

📦 Producto:
${producto.nombre}

💲 Precio:
$${producto.precio.toLocaleString()} MXN

¿Sigue disponible?

Gracias.`;

    const url =
`https://wa.me/${CONFIG.telefono}?text=${encodeURIComponent(mensaje)}`;

    window.open(url,"_blank");

}
