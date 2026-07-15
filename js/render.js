/* ==========================================
   PS DEALS v1.0
   render.js
========================================== */

const contenedor = document.getElementById("contenedorProductos");
const buscador = document.getElementById("buscador");
const categoria = document.getElementById("categoria");

// ================================
// MOSTRAR PRODUCTOS
// ================================

function mostrarProductos(lista) {

    contenedor.innerHTML = "";

    if (lista.length === 0) {

        contenedor.innerHTML = `

        <div class="col-12">

            <div class="alert alert-warning text-center">

                😕 No se encontraron productos.

            </div>

        </div>

        `;

        return;

    }

    lista.forEach(producto => {

        const ahorro = producto.antes - producto.precio;

        const descuento = Math.round(
            (ahorro / producto.antes) * 100
        );

        const etiquetaNuevo = producto.nuevo
            ? `<span class="badge bg-primary">🆕 NUEVO</span>`
            : "";

        const estado = producto.disponible
            ? `<span class="badge bg-success">Disponible</span>`
            : `<span class="badge bg-secondary">Agotado</span>`;

        const boton = producto.disponible

            ? `
                <button
                    class="btn btn-success w-100 mt-3"
                    onclick="enviarWhatsApp(${producto.id})">

                    <i class="bi bi-whatsapp"></i>

                    Pedir por WhatsApp

                </button>
            `

            : `
                <button
                    class="btn btn-outline-secondary w-100 mt-3"
                    disabled>

                    Agotado

                </button>
            `;

        contenedor.innerHTML += `

        <div class="col-md-6 col-lg-4">

            <div class="card product-card h-100 shadow-sm border-0">

                <img
                    src="${producto.imagen}"
                    class="card-img-top"
                    alt="${producto.nombre}">

                <div class="card-body d-flex flex-column">

                    <div class="d-flex justify-content-between mb-3">

                        <span class="badge bg-danger">

                            -${descuento}% OFF

                        </span>

                        ${estado}

                    </div>

                    ${etiquetaNuevo}

                    <h5 class="fw-bold mt-3">

                        ${producto.nombre}

                    </h5>

                    <small class="text-primary fw-semibold">

                        ${producto.categoria}

                    </small>

                    <p class="text-muted mt-2">

                        ${producto.descripcion}

                    </p>

                    <div class="mb-2">

                        ⭐ ${producto.estrellas}

                        <small class="text-muted">

                            (${producto.opiniones} opiniones)

                        </small>

                    </div>

                    <p class="mb-1 text-muted">

                        Antes:

                        <s>

                            $${producto.antes.toLocaleString()}

                        </s>

                    </p>

                    <h3 class="text-primary fw-bold">

                        $${producto.precio.toLocaleString()}

                    </h3>

                    <p class="text-success">

                        💰 Ahorras
                        <strong>

                            $${ahorro.toLocaleString()}

                        </strong>

                    </p>

                    <p class="text-secondary">

                        🚚 ${producto.envio}

                    </p>

                    <div class="mt-auto">

                        ${boton}

                    </div>

                </div>

            </div>

        </div>

        `;

    });

}

// ================================
// FILTRAR PRODUCTOS
// ================================

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

// ================================
// EVENTOS
// ================================

if (buscador) {

    buscador.addEventListener("keyup", filtrar);

}

if (categoria) {

    categoria.addEventListener("change", filtrar);

}

// ================================
// INICIAR
// ================================

mostrarProductos(productos);

console.log("✅ Catálogo cargado:", productos.length, "productos");