const formProducto = document.getElementById("formProducto");
const codigoGenerado = document.getElementById("codigoGenerado");
const btnCopiar = document.getElementById("btnCopiar");
const mensaje = document.getElementById("mensaje");
const tablaProductos = document.getElementById("tablaProductos");
const btnRestablecer = document.getElementById("btnRestablecer");
const btnExportar = document.getElementById("btnExportar");
const btnImportar = document.getElementById("btnImportar");
const archivoImportar = document.getElementById("archivoImportar");
const statTotalProductos =
    document.getElementById("statTotalProductos");

const statDisponibles =
    document.getElementById("statDisponibles");

const statAgotados =
    document.getElementById("statAgotados");

const statDestacados =
    document.getElementById("statDestacados");

const statValorCatalogo =
    document.getElementById("statValorCatalogo");
const buscarAdmin =
    document.getElementById("buscarAdmin");

const filtroCategoriaAdmin =
    document.getElementById("filtroCategoriaAdmin");

const ordenAdmin =
    document.getElementById("ordenAdmin");
const previewNombre =
    document.getElementById("previewNombre");

const previewCategoria =
    document.getElementById("previewCategoria");

const previewDescripcion =
    document.getElementById("previewDescripcion");

const previewPrecio =
    document.getElementById("previewPrecio");

const previewPrecioAnterior =
    document.getElementById("previewPrecioAnterior");

const previewImagen =
    document.getElementById("previewImagen");

const previewEstrellas =
    document.getElementById("previewEstrellas");

const previewOpiniones =
    document.getElementById("previewOpiniones");

const previewEnvio =
    document.getElementById("previewEnvio");

const previewEstado =
    document.getElementById("previewEstado");

const previewBadgeNuevo =
    document.getElementById("previewBadgeNuevo");

const previewGanancia =
    document.getElementById("previewGanancia");

const previewMargen =
    document.getElementById("previewMargen");

let productoEditandoId = null;

function obtenerSiguienteId() {
    if (!productos.length) {
        return 1;
    }

    return Math.max(
        ...productos.map(producto => Number(producto.id))
    ) + 1;
}

function normalizarRutaImagen(ruta) {
    let rutaLimpia = ruta
        .trim()
        .replace(/\\/g, "/");

    const indiceImg = rutaLimpia
        .toLowerCase()
        .indexOf("/img/");

    if (indiceImg !== -1) {
        rutaLimpia = rutaLimpia.substring(indiceImg + 1);
    }

    rutaLimpia = rutaLimpia.replace(
        /^img\/Productos\//,
        "img/productos/"
    );

    return rutaLimpia;
}

function obtenerDatosFormulario() {
    return {
        id: productoEditandoId ?? obtenerSiguienteId(),

        nombre: document
            .getElementById("nombre")
            .value
            .trim(),

        categoria: document
            .getElementById("categoria")
            .value,

        descripcion: document
            .getElementById("descripcion")
            .value
            .trim(),
        sku: document
    .getElementById("sku")
    .value
    .trim()
    .toUpperCase(),

proveedor: document
    .getElementById("proveedor")
    .value
    .trim(),

costo: Number(
    document.getElementById("costo").value
),

stock: Number(
    document.getElementById("stock").value
),

stockMinimo: Number(
    document.getElementById("stockMinimo").value
),

        precio: Number(
            document.getElementById("precio").value
        ),

        antes: Number(
            document.getElementById("precioAnterior").value
        ),

        imagen: normalizarRutaImagen(
            document.getElementById("imagen").value
        ),

        estrellas: Number(
            document.getElementById("estrellas").value
        ),

        opiniones: Number(
            document.getElementById("opiniones").value
        ),

        envio: document
            .getElementById("envio")
            .value,

        nuevo: document
            .getElementById("nuevo")
            .checked,

        destacado: document
            .getElementById("destacado")
            .checked,

        disponible: document
            .getElementById("disponible")
            .checked
    };
}

formProducto.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const producto = obtenerDatosFormulario();
    const skuRepetido = productos.some(item =>
    item.sku?.toUpperCase() === producto.sku &&
    Number(item.id) !== Number(productoEditandoId)
);

if (skuRepetido) {
    mostrarMensaje(
        "Ya existe un producto con ese SKU.",
        "danger"
    );

    return;
}

if (producto.costo > producto.precio) {
    mostrarMensaje(
        "El costo de compra no puede ser mayor que el precio de venta.",
        "danger"
    );

    return;
}

if (producto.stock < 0 || producto.stockMinimo < 0) {
    mostrarMensaje(
        "El stock no puede contener valores negativos.",
        "danger"
    );

    return;
}

producto.disponible = producto.stock > 0;

    if (!producto.imagen.startsWith("img/productos/")) {
        mostrarMensaje(
            "La imagen debe usar una ruta como img/productos/play5.jpg",
            "danger"
        );

        return;
    }

    if (producto.antes < producto.precio) {
        mostrarMensaje(
            "El precio anterior debe ser igual o mayor al precio actual.",
            "danger"
        );

        return;
    }

    if (productoEditandoId === null) {
        productos.push(producto);

        mostrarMensaje(
            "Producto guardado correctamente en el catálogo.",
            "success"
        );
    } else {
        const indice = productos.findIndex(
            item => Number(item.id) === Number(productoEditandoId)
        );

        if (indice !== -1) {
            productos[indice] = producto;
        }

        mostrarMensaje(
            "Producto actualizado correctamente.",
            "success"
        );
    }

    guardarProductos(productos);

    codigoGenerado.value = JSON.stringify(
        producto,
        null,
        4
    );

    btnCopiar.disabled = false;

    limpiarFormulario();
    renderizarTabla();
});

function renderizarTabla() {
    actualizarDashboard();
    const productosMostrados =
    obtenerProductosFiltrados();

    if (!tablaProductos) {
        return;
    }

    if (!productosMostrados.length) {
        tablaProductos.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="text-center py-5 text-muted">
                    No hay productos registrados.
                </td>
            </tr>
        `;

        return;
    }

    tablaProductos.innerHTML = productosMostrados
    .map(producto => `
            <tr>

                <td>
                    <div class="d-flex align-items-center gap-3">

                        <img
                            src="${producto.imagen}"
                            alt="${producto.nombre}"
                            class="admin-product-image"
                            onerror="this.onerror=null; this.src='img/productos/sin-imagen.jpg';"
                        >

                        <div>
                            <strong>
                                ${producto.nombre}
                            </strong>

                            <div class="small text-muted">
                                ID: ${producto.id}
                            </div>
                        </div>

                    </div>
                </td>

                <td>
                    ${producto.categoria}
                </td>

                <td>
                    $${Number(producto.precio).toLocaleString("es-MX")}
                </td>

                <td>
                    ${
                        producto.disponible
                            ? `
                                <span class="badge bg-success">
                                    Disponible
                                </span>
                            `
                            : `
                                <span class="badge bg-secondary">
                                    Agotado
                                </span>
                            `
                    }
                </td>

                <td class="text-end">

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary me-1"
                        onclick="editarProducto(${producto.id})">

                        <i class="bi bi-pencil"></i>
                        Editar

                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        onclick="eliminarProducto(${producto.id})">

                        <i class="bi bi-trash"></i>
                        Eliminar

                    </button>

                </td>

            </tr>
        `)
        .join("");
}

function editarProducto(id) {
    const producto = productos.find(
        item => Number(item.id) === Number(id)
    );

    if (!producto) {
        return;
    }

    productoEditandoId = Number(id);

    document.getElementById("nombre").value =
        producto.nombre;

    document.getElementById("categoria").value =
        producto.categoria;

    document.getElementById("descripcion").value =
        producto.descripcion;
    
    document.getElementById("sku").value =
    producto.sku ?? `PS-${String(producto.id).padStart(4, "0")}`;

document.getElementById("proveedor").value =
    producto.proveedor ?? "";

document.getElementById("costo").value =
    Number(producto.costo ?? 0);

document.getElementById("stock").value =
    Number(producto.stock ?? 1);

document.getElementById("stockMinimo").value =
    Number(producto.stockMinimo ?? 2);
    
    document.getElementById("precio").value =
        producto.precio;

    document.getElementById("precioAnterior").value =
        producto.antes;

    document.getElementById("imagen").value =
        producto.imagen;

    document.getElementById("estrellas").value =
        producto.estrellas;

    document.getElementById("opiniones").value =
        producto.opiniones;

    document.getElementById("envio").value =
        producto.envio;

    document.getElementById("nuevo").checked =
        Boolean(producto.nuevo);

    document.getElementById("destacado").checked =
        Boolean(producto.destacado);

    document.getElementById("disponible").checked =
        Boolean(producto.disponible);

    const botonGuardar = formProducto.querySelector(
        'button[type="submit"]'
    );

    botonGuardar.innerHTML = `
        <i class="bi bi-check-circle"></i>
        Actualizar producto
    `;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function eliminarProducto(id) {
    const producto = productos.find(
        item => Number(item.id) === Number(id)
    );

    if (!producto) {
        return;
    }

    const confirmar = confirm(
        `¿Eliminar "${producto.nombre}" del catálogo?`
    );

    if (!confirmar) {
        return;
    }

    productos = productos.filter(
        item => Number(item.id) !== Number(id)
    );

    guardarProductos(productos);
    renderizarTabla();

    mostrarMensaje(
        "Producto eliminado correctamente.",
        "success"
    );
}

function limpiarFormulario() {
    productoEditandoId = null;

    formProducto.reset();
    
    document.getElementById("costo").value = "0";
    document.getElementById("stock").value = "1";
    document.getElementById("stockMinimo").value = "2";
    document.getElementById("estrellas").value = "4.8";
    document.getElementById("opiniones").value = "0";
    document.getElementById("disponible").checked = true;

    const botonGuardar = formProducto.querySelector(
        'button[type="submit"]'
    );

    botonGuardar.innerHTML = `
        <i class="bi bi-save"></i>
        Guardar producto
    `;
}

btnCopiar.addEventListener("click", async function () {
    if (!codigoGenerado.value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            codigoGenerado.value
        );

        mostrarMensaje(
            "Código copiado al portapapeles.",
            "success"
        );
    } catch (error) {
        codigoGenerado.select();
        document.execCommand("copy");

        mostrarMensaje(
            "Código copiado al portapapeles.",
            "success"
        );
    }
});

btnRestablecer.addEventListener("click", function () {
    const confirmar = confirm(
        "¿Restablecer el catálogo? Se eliminarán los cambios guardados en este navegador."
    );

    if (!confirmar) {
        return;
    }

    localStorage.removeItem("psdeals_productos");

    productos = obtenerProductos();

    limpiarFormulario();
    renderizarTabla();

    codigoGenerado.value = "";
    btnCopiar.disabled = true;

    mostrarMensaje(
        "Catálogo restablecido correctamente.",
        "success"
    );
});

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `alert alert-${tipo} mt-3`;
}
function exportarCatalogo() {
    if (!productos.length) {
        mostrarMensaje(
            "No hay productos para exportar.",
            "warning"
        );

        return;
    }

    const contenido = JSON.stringify(productos, null, 4);

    const archivo = new Blob(
        [contenido],
        { type: "application/json" }
    );

    const urlTemporal = URL.createObjectURL(archivo);

    const enlace = document.createElement("a");

    const fecha = new Date()
        .toISOString()
        .slice(0, 10);

    enlace.href = urlTemporal;
    enlace.download = `ps-deals-catalogo-${fecha}.json`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(urlTemporal);

    mostrarMensaje(
        "Catálogo exportado correctamente.",
        "success"
    );
}
function productoImportadoEsValido(producto) {
    return (
        producto &&
        producto.id !== undefined &&
        typeof producto.nombre === "string" &&
        typeof producto.categoria === "string" &&
        typeof producto.descripcion === "string" &&
        producto.precio !== undefined &&
        producto.antes !== undefined &&
        typeof producto.imagen === "string"
    );
}
function importarCatalogo(archivo) {
    if (!archivo) {
        return;
    }

    const lector = new FileReader();

    lector.onload = function (evento) {
        try {
            const catalogoImportado = JSON.parse(
                evento.target.result
            );

            if (!Array.isArray(catalogoImportado)) {
                throw new Error(
                    "El archivo no contiene una lista de productos."
                );
            }

            if (!catalogoImportado.every(productoImportadoEsValido)) {
                throw new Error(
                    "Uno o más productos tienen información inválida."
                );
            }

            const confirmar = confirm(
                `Se encontraron ${catalogoImportado.length} productos. ` +
                "¿Deseas reemplazar el catálogo actual?"
            );

            if (!confirmar) {
                archivoImportar.value = "";
                return;
            }

            productos = catalogoImportado.map(producto => ({
                ...producto,

                id: Number(producto.id),

                precio: Number(producto.precio),

                antes: Number(producto.antes),

                imagen: normalizarRutaImagen(
                    producto.imagen
                ),

                estrellas: Number(
                    producto.estrellas ?? 0
                ),

                opiniones: Number(
                    producto.opiniones ?? 0
                ),

                envio:
                    producto.envio ?? "Entrega Local",

                nuevo: Boolean(producto.nuevo),

                destacado: Boolean(producto.destacado),

                disponible:
                    producto.disponible !== false
            }));

            guardarProductos(productos);

            limpiarFormulario();
            renderizarTabla();

            codigoGenerado.value = "";
            btnCopiar.disabled = true;

            mostrarMensaje(
                `${productos.length} productos importados correctamente.`,
                "success"
            );

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                `No se pudo importar el catálogo: ${error.message}`,
                "danger"
            );
        }

        archivoImportar.value = "";
    };

    lector.onerror = function () {
        mostrarMensaje(
            "No fue posible leer el archivo.",
            "danger"
        );

        archivoImportar.value = "";
    };

    lector.readAsText(archivo);
}
btnExportar.addEventListener("click", function () {
    exportarCatalogo();
});

btnImportar.addEventListener("click", function () {
    archivoImportar.click();
});

archivoImportar.addEventListener("change", function () {
    importarCatalogo(this.files[0]);
});
function actualizarDashboard() {
    const totalProductos = productos.length;

    const disponibles = productos.filter(
        producto => producto.disponible
    ).length;

    const agotados = productos.filter(
        producto => !producto.disponible
    ).length;

    const destacados = productos.filter(
        producto => producto.destacado
    ).length;

    const valorCatalogo = productos.reduce(
        (total, producto) => {
            return total + Number(producto.precio || 0);
        },
        0
    );

    statTotalProductos.textContent =
        totalProductos;

    statDisponibles.textContent =
        disponibles;

    statAgotados.textContent =
        agotados;

    statDestacados.textContent =
        destacados;

    statValorCatalogo.textContent =
        valorCatalogo.toLocaleString(
            "es-MX",
            {
                style: "currency",
                currency: "MXN",
                maximumFractionDigits: 0
            }
        );
}
function obtenerProductosFiltrados() {
    const textoBusqueda = buscarAdmin
        .value
        .trim()
        .toLowerCase();

    const categoriaSeleccionada =
        filtroCategoriaAdmin.value;

    const ordenSeleccionado =
        ordenAdmin.value;

    let resultado = productos.filter(producto => {
        const coincideBusqueda =
            producto.nombre
                .toLowerCase()
                .includes(textoBusqueda) ||

            producto.descripcion
                .toLowerCase()
                .includes(textoBusqueda) ||

            producto.categoria
                .toLowerCase()
                .includes(textoBusqueda);

        const coincideCategoria =
            categoriaSeleccionada === "todas" ||
            producto.categoria === categoriaSeleccionada;

        return coincideBusqueda && coincideCategoria;
    });

    resultado = [...resultado];

    switch (ordenSeleccionado) {
        case "nombre-asc":
            resultado.sort((a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                    "es",
                    { sensitivity: "base" }
                )
            );
            break;

        case "nombre-desc":
            resultado.sort((a, b) =>
                b.nombre.localeCompare(
                    a.nombre,
                    "es",
                    { sensitivity: "base" }
                )
            );
            break;

        case "precio-asc":
            resultado.sort(
                (a, b) =>
                    Number(a.precio) -
                    Number(b.precio)
            );
            break;

        case "precio-desc":
            resultado.sort(
                (a, b) =>
                    Number(b.precio) -
                    Number(a.precio)
            );
            break;

        case "recientes":
        default:
            resultado.sort(
                (a, b) =>
                    Number(b.id) -
                    Number(a.id)
            );
            break;
    }

    return resultado;
}
buscarAdmin.addEventListener(
    "input",
    renderizarTabla
);

filtroCategoriaAdmin.addEventListener(
    "change",
    renderizarTabla
);

ordenAdmin.addEventListener(
    "change",
    renderizarTabla
);
function actualizarVistaPrevia() {
    const nombre =
        document.getElementById("nombre").value.trim();

    const categoria =
        document.getElementById("categoria").value;

    const descripcion =
        document.getElementById("descripcion").value.trim();

    const precio =
        Number(document.getElementById("precio").value || 0);

    const precioAnterior =
        Number(document.getElementById("precioAnterior").value || 0);

    const rutaImagen =
        document.getElementById("imagen").value.trim();

    const estrellas =
        Number(document.getElementById("estrellas").value || 0);

    const opiniones =
        Number(document.getElementById("opiniones").value || 0);

    const envio =
        document.getElementById("envio").value;

    const nuevo =
        document.getElementById("nuevo").checked;

    const costo =
    Number(document.getElementById("costo").value || 0);

const stock =
    Number(document.getElementById("stock").value || 0);

const stockMinimo =
    Number(document.getElementById("stockMinimo").value || 0);

const ganancia =
    precio - costo;

const margen =
    precio > 0
        ? (ganancia / precio) * 100
        : 0;



previewGanancia.textContent =
    ganancia.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });

previewMargen.textContent =
    `${margen.toFixed(1)}%`;

if (stock === 0) {
    previewEstado.textContent = "Agotado";
    previewEstado.className = "badge bg-danger";
} else if (stock <= stockMinimo) {
    previewEstado.textContent = "Stock bajo";
    previewEstado.className = "badge bg-warning text-dark";
} else {
    previewEstado.textContent = "Disponible";
    previewEstado.className = "badge bg-success";
}

    previewNombre.textContent =
        nombre || "Nombre del producto";

    previewCategoria.textContent =
        categoria || "Categoría";

    previewDescripcion.textContent =
        descripcion ||
        "Aquí aparecerá la descripción del producto.";

    previewPrecio.textContent =
        precio.toLocaleString(
            "es-MX",
            {
                style: "currency",
                currency: "MXN"
            }
        );

    previewPrecioAnterior.textContent =
        precioAnterior > 0
            ? precioAnterior.toLocaleString(
                "es-MX",
                {
                    style: "currency",
                    currency: "MXN"
                }
            )
            : "";

    previewEstrellas.textContent =
        estrellas.toFixed(1);

    previewOpiniones.textContent =
        opiniones;

    previewEnvio.textContent =
        envio || "Entrega Local";

    previewBadgeNuevo.classList.toggle(
        "d-none",
        !nuevo
    );

    previewImagen.src =
        rutaImagen || "img/productos/sin-imagen.jpg";

    previewImagen.onerror = function () {
        this.onerror = null;
        this.src = "img/productos/sin-imagen.jpg";
    };
}
const camposVistaPrevia = [
    "nombre",
    "categoria",
    "descripcion",
    "precio",
    "precioAnterior",
    "imagen",
    "estrellas",
    "opiniones",
    "envio",
    "disponible",
    "nuevo",
    "sku",
    "proveedor",
    "costo",
    "stock",
    "stockMinimo",
];

camposVistaPrevia.forEach(idCampo => {
    const campo = document.getElementById(idCampo);

    campo.addEventListener(
        "input",
        actualizarVistaPrevia
    );

    campo.addEventListener(
        "change",
        actualizarVistaPrevia
    );
});
actualizarVistaPrevia();
renderizarTabla();