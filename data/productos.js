const productosIniciales = [
    {
        id: 1,
        nombre: "JBL Flip 6",
        categoria: "Audio",
        descripcion: "Bocina Bluetooth portátil, resistente al agua y con sonido potente.",
        precio: 1899,
        antes: 2499,
        imagen: "img/productos/jbl-flip-6.jpg",
        estrellas: 4.8,
        opiniones: 284,
        envio: "Entrega Local",
        nuevo: true,
        destacado: true,
        disponible: true
    },
    {
        id: 2,
        nombre: "SSD Kingston NV2 1TB",
        categoria: "Tecnología",
        descripcion: "Unidad de estado sólido NVMe de alta velocidad para computadora o laptop.",
        precio: 1099,
        antes: 1399,
        imagen: "img/productos/ssd-kingston-1tb.jpg",
        estrellas: 4.7,
        opiniones: 198,
        envio: "Entrega Local",
        nuevo: false,
        destacado: true,
        disponible: true
    },
    {
        id: 3,
        nombre: "Freidora de Aire Ninja",
        categoria: "Hogar",
        descripcion: "Freidora de aire de gran capacidad para preparar alimentos con menos aceite.",
        precio: 2299,
        antes: 2999,
        imagen: "img/productos/freidora-ninja.jpg",
        estrellas: 4.9,
        opiniones: 326,
        envio: "Bajo pedido",
        nuevo: true,
        destacado: false,
        disponible: true
    },
    {
        id: 4,
        nombre: "Taladro Bosch",
        categoria: "Herramientas",
        descripcion: "Taladro compacto y potente, ideal para trabajos domésticos y profesionales.",
        precio: 1499,
        antes: 1899,
        imagen: "img/productos/taladro-bosch.jpg",
        estrellas: 4.6,
        opiniones: 142,
        envio: "Entrega Local",
        nuevo: false,
        destacado: false,
        disponible: true
    },
    {
        id: 5,
        nombre: "PlayStation 5 Slim",
        categoria: "Gaming",
        descripcion: "Consola PlayStation 5 Slim con lector de discos.",
        precio: 10999,
        antes: 12999,
        imagen: "img/productos/play5.jpg",
        estrellas: 4.8,
        opiniones: 0,
        envio: "Entrega Local",
        nuevo: true,
        destacado: false,
        disponible: true
    }
];

function obtenerProductos() {
    const productosGuardados = localStorage.getItem("psdeals_productos");

    if (productosGuardados) {
        try {
            return JSON.parse(productosGuardados);
        } catch (error) {
            console.error("Error al leer productos:", error);
        }
    }

    localStorage.setItem(
        "psdeals_productos",
        JSON.stringify(productosIniciales)
    );

    return [...productosIniciales];
}

function guardarProductos(productos) {
    localStorage.setItem(
        "psdeals_productos",
        JSON.stringify(productos)
    );
}

let productos = obtenerProductos();