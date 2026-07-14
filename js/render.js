const contenedor = document.getElementById("contenedorProductos");
const buscador = document.getElementById("buscador");
const categoria = document.getElementById("categoria");

function mostrarProductos(lista) {

    contenedor.innerHTML = "";

    lista.forEach(producto => {

        const ahorro = producto.antes - producto.precio;

        contenedor.innerHTML += `

<div class="col-lg-4 mb-4">

<div class="card product-card h-100">

<img src="${producto.imagen}" class="card-img-top">

<div class="card-body d-flex flex-column">

<span class="badge bg-primary mb-2">
${producto.categoria}
</span>

<h5>${producto.nombre}</h5>

<p>

<s>$${producto.antes.toLocaleString()}</s>

</p>

<h3 class="text-primary">

$${producto.precio.toLocaleString()}

</h3>

<p class="text-success">

Ahorras $${ahorro.toLocaleString()}

</p>

<button
class="btn btn-primary mt-auto">

Ver oferta

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