const contenedor = document.getElementById("contenedorProductos");
const buscador = document.getElementById("buscador");
const categoria = document.getElementById("categoria");

function mostrarProductos(lista) {

    contenedor.innerHTML = "";

    lista.forEach(producto => {

        const ahorro = producto.antes - producto.precio;

        const descuento = Math.round(
        (ahorro / producto.antes) * 100
    );

        contenedor.innerHTML += `

<div class="col-lg-4 mb-4">

<div class="card product-card h-100">

<img
    src="${producto.imagen}"
    class="card-img-top"
    alt="${producto.nombre}">

<div class="card-body d-flex flex-column">

    <div class="d-flex justify-content-between align-items-center mb-3">

        <span class="badge bg-danger">
            -${descuento}% OFF
        </span>

        <span class="badge ${producto.disponible ? 'bg-success' : 'bg-secondary'}">
    ${producto.disponible ? 'Disponible' : 'Agotado'}
        </span>

    </div>

    <h5 class="fw-bold">
        ${producto.nombre}
    </h5>

    <p class="text-secondary mb-2">
        ${producto.categoria}
    </p>

    <p class="text-muted mb-1">
        Antes:
        <s>$${producto.antes.toLocaleString()}</s>
    </p>

    <h3 class="text-primary fw-bold">
        $${producto.precio.toLocaleString()}
    </h3>

    <p class="text-success fw-semibold mb-3">
        💰 Ahorras $${ahorro.toLocaleString()}
    </p>

    <button
        class="btn btn-success mt-auto"
        onclick="enviarWhatsApp(${producto.id})">

        📲 Pedir por WhatsApp

    </button>

    </div>
</div>

</div>

`;

    });

}

mostrarProductos(productos);

// ========================
// BUSCADOR
// ========================

function filtrar() {

    const texto = buscador.value.toLowerCase();

    const cat = categoria.value;

    const resultado = productos.filter(producto => {

        const coincideNombre =
            producto.nombre.toLowerCase().includes(texto);

        const coincideCategoria =
            cat === "Todos" ||
            producto.categoria === cat;

        return coincideNombre && coincideCategoria;

    });

    mostrarProductos(resultado);

}

buscador.addEventListener("keyup", filtrar);

categoria.addEventListener("change", filtrar);