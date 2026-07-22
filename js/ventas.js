const busquedaProducto = document.getElementById("busquedaProducto");
const resultadosBusqueda = document.getElementById("resultadosBusqueda");
const cantidadAgregar = document.getElementById("cantidadAgregar");
const btnAgregarProducto = document.getElementById("btnAgregarProducto");
const productoSeleccionadoInfo = document.getElementById("productoSeleccionadoInfo");
const btnVaciarCarrito = document.getElementById("btnVaciarCarrito");
const tablaCarrito = document.getElementById("tablaCarrito");

const formVenta = document.getElementById("formVenta");
const cliente = document.getElementById("cliente");
const telefono = document.getElementById("telefono");
const metodoPago = document.getElementById("metodoPago");
const descuentoVenta = document.getElementById("descuentoVenta");
const notasVenta = document.getElementById("notasVenta");
const mensajeVenta = document.getElementById("mensajeVenta");
const btnCobrar = document.getElementById("btnCobrar");

const resumenProductos = document.getElementById("resumenProductos");
const resumenUnidades = document.getElementById("resumenUnidades");
const resumenSubtotal = document.getElementById("resumenSubtotal");
const resumenDescuento = document.getElementById("resumenDescuento");
const resumenTotal = document.getElementById("resumenTotal");

const tablaVentas = document.getElementById("tablaVentas");
const btnExportarVentas = document.getElementById("btnExportarVentas");

const statVentas = document.getElementById("statVentas");
const statUnidadesVendidas = document.getElementById("statUnidadesVendidas");
const statIngresos = document.getElementById("statIngresos");
const statGanancia = document.getElementById("statGanancia");

const dashboardVentasHoy = document.getElementById("dashboardVentasHoy");
const dashboardOperacionesHoy = document.getElementById("dashboardOperacionesHoy");
const dashboardVentasMes = document.getElementById("dashboardVentasMes");
const dashboardOperacionesMes = document.getElementById("dashboardOperacionesMes");
const dashboardGananciaMes = document.getElementById("dashboardGananciaMes");
const dashboardProductoTop = document.getElementById("dashboardProductoTop");
const dashboardProductoTopCantidad = document.getElementById("dashboardProductoTopCantidad");
const rankingProductos = document.getElementById("rankingProductos");
const graficaVentasCanvas = document.getElementById("graficaVentas");

const modalTicketElemento = document.getElementById("modalTicket");
const ticketImpresion = document.getElementById("ticketImpresion");
const ticketFormatoActual = document.getElementById("ticketFormatoActual");
const btnDescargarTicketImagen = document.getElementById("btnDescargarTicketImagen");
const btnCompartirTicketWhatsApp = document.getElementById("btnCompartirTicketWhatsApp");
const btnCopiarResumenTicket = document.getElementById("btnCopiarResumenTicket");
let ventaTicketActual = null;
const btnImprimirTicket = document.getElementById("btnImprimirTicket");
const modalTicket = new bootstrap.Modal(modalTicketElemento);

let ventas = obtenerVentas();
let carrito = [];
let productoSeleccionado = null;
let graficaVentas = null;

function obtenerVentas() {
    const guardadas = localStorage.getItem("psdeals_ventas");

    if (!guardadas) {
        return [];
    }

    try {
        const resultado = JSON.parse(guardadas);
        return Array.isArray(resultado) ? resultado : [];
    } catch (error) {
        console.error("Error al leer ventas:", error);
        return [];
    }
}

function guardarVentas() {
    localStorage.setItem("psdeals_ventas", JSON.stringify(ventas));
}

function formatearMoneda(valor) {
    return Number(valor || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}

function escaparHtml(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function obtenerUnidadesApartadas(productoId) {
    let apartados = [];
    try { apartados = JSON.parse(localStorage.getItem("psdeals_apartados") || "[]"); } catch { apartados = []; }
    const ahora = new Date();
    return apartados
        .filter(a => a.estado === "Activo" || a.estado === "Vencido")
        .flatMap(a => Array.isArray(a.items) ? a.items : [])
        .filter(item => Number(item.productoId) === Number(productoId))
        .reduce((suma, item) => suma + Number(item.cantidad || 0), 0);
}

function obtenerStock(producto) {
    const fisico = Math.max(0, Number(producto?.stock ?? 0));
    return Math.max(0, fisico - obtenerUnidadesApartadas(producto?.id));
}

function obtenerItemsVenta(venta) {
    if (Array.isArray(venta.items) && venta.items.length) {
        return venta.items;
    }

    return [{
        productoId: Number(venta.productoId),
        producto: venta.producto || "Producto",
        sku: venta.sku || "",
        cantidad: Number(venta.cantidad || 0),
        precioUnitario: Number(venta.precioUnitario || 0),
        costoUnitario: Number(venta.costoUnitario || 0),
        importe: Number(venta.total || 0),
        ganancia: Number(venta.ganancia || 0)
    }];
}

function buscarProductos(termino) {
    const texto = termino.trim().toLowerCase();

    if (!texto) {
        return [];
    }

    return productos.filter(producto => {
        const campos = [
            producto.nombre,
            producto.sku,
            producto.codigoBarras,
            producto.codigo,
            producto.categoria
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return campos.includes(texto) && obtenerStock(producto) > 0;
    }).slice(0, 8);
}

function renderizarResultadosBusqueda() {
    const encontrados = buscarProductos(busquedaProducto.value);

    if (!busquedaProducto.value.trim()) {
        resultadosBusqueda.classList.add("d-none");
        resultadosBusqueda.innerHTML = "";
        return;
    }

    if (!encontrados.length) {
        resultadosBusqueda.innerHTML = `
            <div class="p-3 text-muted">
                No se encontraron productos disponibles.
            </div>
        `;
        resultadosBusqueda.classList.remove("d-none");
        return;
    }

    resultadosBusqueda.innerHTML = encontrados.map(producto => `
        <button
            type="button"
            class="resultado-producto"
            data-producto-id="${producto.id}">

            <span>
                <span class="resultado-nombre d-block">
                    ${escaparHtml(producto.nombre)}
                </span>

                <span class="resultado-detalle">
                    ${escaparHtml(producto.sku || "Sin SKU")}
                    · Stock: ${obtenerStock(producto)}
                </span>
            </span>

            <strong>${formatearMoneda(producto.precio)}</strong>
        </button>
    `).join("");

    resultadosBusqueda.classList.remove("d-none");
}

function seleccionarProducto(id) {
    productoSeleccionado = productos.find(
        producto => Number(producto.id) === Number(id)
    ) || null;

    if (!productoSeleccionado) {
        return;
    }

    busquedaProducto.value =
        productoSeleccionado.sku || productoSeleccionado.nombre;

    productoSeleccionadoInfo.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between gap-2">
            <div>
                <strong>${escaparHtml(productoSeleccionado.nombre)}</strong>
                <div class="small text-muted">
                    SKU: ${escaparHtml(productoSeleccionado.sku || "Sin SKU")}
                    · Stock disponible: ${obtenerStock(productoSeleccionado)}
                </div>
            </div>

            <strong class="text-success">
                ${formatearMoneda(productoSeleccionado.precio)}
            </strong>
        </div>
    `;

    productoSeleccionadoInfo.classList.remove("d-none");
    resultadosBusqueda.classList.add("d-none");
    cantidadAgregar.focus();
    cantidadAgregar.select();
}

busquedaProducto.addEventListener("input", () => {
    productoSeleccionado = null;
    productoSeleccionadoInfo.classList.add("d-none");
    renderizarResultadosBusqueda();
});

busquedaProducto.addEventListener("keydown", evento => {
    if (evento.key !== "Enter") {
        return;
    }

    evento.preventDefault();

    const encontrados = buscarProductos(busquedaProducto.value);

    if (encontrados.length === 1) {
        seleccionarProducto(encontrados[0].id);
        agregarProductoAlCarrito();
    } else if (encontrados.length > 1) {
        seleccionarProducto(encontrados[0].id);
    }
});

resultadosBusqueda.addEventListener("click", evento => {
    const boton = evento.target.closest("[data-producto-id]");

    if (!boton) {
        return;
    }

    seleccionarProducto(boton.dataset.productoId);
});

document.addEventListener("click", evento => {
    if (
        !resultadosBusqueda.contains(evento.target)
        && evento.target !== busquedaProducto
    ) {
        resultadosBusqueda.classList.add("d-none");
    }
});

btnAgregarProducto.addEventListener("click", agregarProductoAlCarrito);

function agregarProductoAlCarrito() {
    if (!productoSeleccionado) {
        const encontrados = buscarProductos(busquedaProducto.value);

        if (encontrados.length === 1) {
            productoSeleccionado = encontrados[0];
        }
    }

    if (!productoSeleccionado) {
        mostrarMensaje("Selecciona primero un producto.", "warning");
        return;
    }

    const cantidad = Number(cantidadAgregar.value);
    const stock = obtenerStock(productoSeleccionado);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        mostrarMensaje("La cantidad debe ser un entero mayor que cero.", "danger");
        return;
    }

    const existente = carrito.find(
        item => Number(item.productoId) === Number(productoSeleccionado.id)
    );

    const cantidadActual = existente ? existente.cantidad : 0;

    if (cantidadActual + cantidad > stock) {
        mostrarMensaje(
            `No hay suficiente stock. Disponibles: ${stock}.`,
            "danger"
        );
        return;
    }

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({
            productoId: Number(productoSeleccionado.id),
            producto: productoSeleccionado.nombre,
            sku: productoSeleccionado.sku || "",
            precioUnitario: Number(productoSeleccionado.precio || 0),
            costoUnitario: Number(productoSeleccionado.costo || 0),
            cantidad
        });
    }

    limpiarSeleccionProducto();
    renderizarCarrito();
    mostrarMensaje("Producto agregado al carrito.", "success");
}

function limpiarSeleccionProducto() {
    productoSeleccionado = null;
    busquedaProducto.value = "";
    cantidadAgregar.value = 1;
    productoSeleccionadoInfo.classList.add("d-none");
    resultadosBusqueda.classList.add("d-none");
    busquedaProducto.focus();
}

function cambiarCantidad(productoId, nuevaCantidad) {
    const item = carrito.find(
        producto => Number(producto.productoId) === Number(productoId)
    );

    const producto = productos.find(
        producto => Number(producto.id) === Number(productoId)
    );

    if (!item || !producto) {
        return;
    }

    const cantidad = Number(nuevaCantidad);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        eliminarDelCarrito(productoId);
        return;
    }

    const stock = obtenerStock(producto);

    if (cantidad > stock) {
        mostrarMensaje(
            `Solo hay ${stock} unidad(es) de ${producto.nombre}.`,
            "warning"
        );
        renderizarCarrito();
        return;
    }

    item.cantidad = cantidad;
    renderizarCarrito();
}

function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(
        item => Number(item.productoId) !== Number(productoId)
    );

    renderizarCarrito();
}

function renderizarCarrito() {
    if (!carrito.length) {
        tablaCarrito.innerHTML = `
            <tr>
                <td colspan="5" class="carrito-vacio">
                    <i class="bi bi-cart3 fs-2 d-block mb-2"></i>
                    El carrito está vacío.
                </td>
            </tr>
        `;

        actualizarResumen();
        return;
    }

    tablaCarrito.innerHTML = carrito.map(item => `
        <tr>
            <td>
                <strong>${escaparHtml(item.producto)}</strong>
                <div class="small text-muted">
                    ${escaparHtml(item.sku || "Sin SKU")}
                </div>
            </td>

            <td>${formatearMoneda(item.precioUnitario)}</td>

            <td>
                <div class="cantidad-control">
                    <input
                        type="number"
                        class="form-control form-control-sm"
                        min="1"
                        step="1"
                        value="${item.cantidad}"
                        onchange="cambiarCantidad(${item.productoId}, this.value)">
                </div>
            </td>

            <td>
                <strong>
                    ${formatearMoneda(item.precioUnitario * item.cantidad)}
                </strong>
            </td>

            <td class="text-end">
                <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    onclick="eliminarDelCarrito(${item.productoId})"
                    aria-label="Eliminar">

                    <i class="bi bi-x-lg"></i>
                </button>
            </td>
        </tr>
    `).join("");

    actualizarResumen();
}

btnVaciarCarrito.addEventListener("click", () => {
    if (!carrito.length) {
        return;
    }

    if (!confirm("¿Vaciar todos los productos del carrito?")) {
        return;
    }

    carrito = [];
    renderizarCarrito();
});

descuentoVenta.addEventListener("input", actualizarResumen);

function calcularTotalesCarrito() {
    const subtotal = carrito.reduce(
        (total, item) =>
            total + item.precioUnitario * item.cantidad,
        0
    );

    const descuentoSolicitado = Math.max(
        0,
        Number(descuentoVenta.value || 0)
    );

    const descuento = Math.min(descuentoSolicitado, subtotal);
    const total = Math.max(0, subtotal - descuento);
    const unidades = carrito.reduce(
        (acumulado, item) => acumulado + item.cantidad,
        0
    );

    return {
        subtotal,
        descuento,
        total,
        unidades
    };
}

function actualizarResumen() {
    const totales = calcularTotalesCarrito();

    resumenProductos.textContent = carrito.length;
    resumenUnidades.textContent = totales.unidades;
    resumenSubtotal.textContent = formatearMoneda(totales.subtotal);
    resumenDescuento.textContent = formatearMoneda(totales.descuento);
    resumenTotal.textContent = formatearMoneda(totales.total);

    btnCobrar.disabled = carrito.length === 0;
}

let ventaProcesando = false;
formVenta.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (ventaProcesando) {
        window.PSToast?.("La venta ya se está procesando.", "warning");
        return;
    }
    if (!carrito.length) {
        mostrarMensaje("Agrega al menos un producto al carrito.", "warning");
        return;
    }

    ventaProcesando = true;
    btnCobrar.disabled = true;
    const textoOriginal = btnCobrar.innerHTML;
    btnCobrar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

    try {
        const totales = calcularTotalesCarrito();
        const payload = {
            cliente: cliente.value.trim() || "Público general",
            telefono: telefono.value.trim(),
            metodoPago: metodoPago.value,
            notas: notasVenta.value.trim(),
            descuento: totales.descuento,
            items: carrito.map(item => ({
                productoId: Number(item.productoId),
                cantidad: Number(item.cantidad)
            }))
        };

        if (!window.PSApi?.createSale) {
            throw new Error("El motor SQLite de ventas no está disponible. Abre PS Deals desde npm start.");
        }

        const respuesta = await window.PSApi.createSale(payload);
        const venta = respuesta.venta;
        ventas.unshift(venta);
        guardarVentas();

        for (const actualizado of respuesta.productosActualizados || []) {
            const producto = productos.find(item => Number(item.id) === Number(actualizado.id));
            if (producto) {
                producto.stock = Number(actualizado.stock);
                producto.disponible = producto.stock > 0;
            }
        }
        guardarProductos(productos);

        mostrarTicket(venta);
        carrito = [];
        formVenta.reset();
        cliente.value = "Público general";
        descuentoVenta.value = 0;
        renderizarCarrito();
        renderizarVentas();
        mostrarMensaje(`Venta ${venta.folio} registrada en SQLite correctamente.`, "success");
    } catch (error) {
        console.error("Error al registrar venta:", error);
        mostrarMensaje(error.message || "No se pudo registrar la venta.", "danger");
    } finally {
        ventaProcesando = false;
        btnCobrar.innerHTML = textoOriginal;
        actualizarResumen();
    }
});

function mostrarMensaje(texto, tipo) {
    mensajeVenta.textContent = texto;
    mensajeVenta.className = `alert alert-${tipo} mt-3 mb-0`;
}

async function eliminarVenta(id) {
    const venta = ventas.find(item => Number(item.id) === Number(id));
    if (!venta || venta.estado === "cancelada") return;

    const motivo = prompt(
        `Cancelar la venta ${venta.folio || id}. Escribe el motivo:`,
        "Cancelación solicitada"
    );
    if (motivo === null) return;

    try {
        if (!window.PSApi?.cancelSale) {
            throw new Error("El motor SQLite de ventas no está disponible.");
        }
        const respuesta = await window.PSApi.cancelSale(id, motivo.trim());
        const indice = ventas.findIndex(item => Number(item.id) === Number(id));
        if (indice >= 0) ventas[indice] = respuesta.venta;
        guardarVentas();

        for (const actualizado of respuesta.productosActualizados || []) {
            const producto = productos.find(item => Number(item.id) === Number(actualizado.id));
            if (producto) {
                producto.stock = Number(actualizado.stock);
                producto.disponible = producto.stock > 0;
            }
        }
        guardarProductos(productos);
        renderizarVentas();
        mostrarMensaje("Venta cancelada y existencias devueltas mediante SQLite.", "success");
    } catch (error) {
        console.error("Error al cancelar venta:", error);
        mostrarMensaje(error.message || "No se pudo cancelar la venta.", "danger");
    }
}

function renderizarVentas() {
    actualizarEstadisticas();

    if (!ventas.length) {
        tablaVentas.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    No hay ventas registradas.
                </td>
            </tr>
        `;
        return;
    }

    tablaVentas.innerHTML = ventas.map(venta => {
        const fecha = new Date(venta.fecha);
        const items = obtenerItemsVenta(venta);
        const unidades = items.reduce(
            (total, item) => total + Number(item.cantidad || 0),
            0
        );

        const resumen = items.length === 1
            ? items[0].producto
            : `${items[0].producto} y ${items.length - 1} más`;

        return `
            <tr>
                <td>
                    ${fecha.toLocaleDateString("es-MX")}
                    <div class="small text-muted">
                        ${fecha.toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                    </div>
                </td>

                <td>
                    <strong>${escaparHtml(venta.cliente || "Público general")}</strong>
                    <div class="small text-muted">
                        ${escaparHtml(venta.telefono || venta.folio || "Sin teléfono")}
                    </div>
                </td>

                <td>
                    ${escaparHtml(resumen)}
                    <div class="small text-muted">
                        ${items.length} producto(s)
                    </div>
                </td>

                <td>${unidades}</td>

                <td>
                    <strong>${formatearMoneda(venta.total)}</strong>
                    ${venta.estado === "cancelada" ? '<div><span class="badge text-bg-secondary">Cancelada</span></div>' : ""}
                </td>

                <td>${escaparHtml(venta.metodoPago || "Sin especificar")}</td>

                <td class="text-end">
                    <div class="d-inline-flex gap-1">
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            onclick="abrirTicket(${venta.id})">

                            <i class="bi bi-receipt"></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            onclick="eliminarVenta(${venta.id})"
                            ${venta.estado === "cancelada" ? "disabled" : ""}
                            title="${venta.estado === "cancelada" ? "Venta cancelada" : "Cancelar venta"}">

                            <i class="bi bi-x-circle"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function actualizarEstadisticas() {
    const ventasActivas = ventas.filter(venta => venta.estado !== "cancelada");
    const unidades = ventasActivas.reduce(
        (total, venta) =>
            total + obtenerItemsVenta(venta).reduce(
                (acumulado, item) =>
                    acumulado + Number(item.cantidad || 0),
                0
            ),
        0
    );

    const ingresos = ventasActivas.reduce(
        (total, venta) => total + Number(venta.total || 0),
        0
    );

    const ganancia = ventasActivas.reduce(
        (total, venta) => total + Number(venta.ganancia || 0),
        0
    );

    statVentas.textContent = ventasActivas.length.toLocaleString("es-MX");
    statUnidadesVendidas.textContent = unidades.toLocaleString("es-MX");
    statIngresos.textContent = formatearMoneda(ingresos);
    statGanancia.textContent = formatearMoneda(ganancia);

    actualizarDashboard();
}

function esMismoDia(fechaA, fechaB) {
    return fechaA.getFullYear() === fechaB.getFullYear()
        && fechaA.getMonth() === fechaB.getMonth()
        && fechaA.getDate() === fechaB.getDate();
}

function esMismoMes(fechaA, fechaB) {
    return fechaA.getFullYear() === fechaB.getFullYear()
        && fechaA.getMonth() === fechaB.getMonth();
}

function obtenerRankingProductos() {
    const acumulado = {};

    ventas.forEach(venta => {
        obtenerItemsVenta(venta).forEach(item => {
            const clave = String(
                item.productoId ?? item.sku ?? item.producto
            );

            if (!acumulado[clave]) {
                acumulado[clave] = {
                    nombre: item.producto || "Producto",
                    cantidad: 0,
                    ingresos: 0
                };
            }

            acumulado[clave].cantidad += Number(item.cantidad || 0);
            acumulado[clave].ingresos += Number(
                item.importe ??
                item.precioUnitario * item.cantidad ??
                0
            );
        });
    });

    return Object.values(acumulado).sort((a, b) => {
        if (b.cantidad !== a.cantidad) {
            return b.cantidad - a.cantidad;
        }

        return b.ingresos - a.ingresos;
    });
}

function actualizarDashboard() {
    const ahora = new Date();

    const ventasHoy = ventas.filter(
        venta => esMismoDia(new Date(venta.fecha), ahora)
    );

    const ventasMes = ventas.filter(
        venta => esMismoMes(new Date(venta.fecha), ahora)
    );

    const ingresoHoy = ventasHoy.reduce(
        (total, venta) => total + Number(venta.total || 0),
        0
    );

    const ingresoMes = ventasMes.reduce(
        (total, venta) => total + Number(venta.total || 0),
        0
    );

    const gananciaMes = ventasMes.reduce(
        (total, venta) => total + Number(venta.ganancia || 0),
        0
    );

    const ranking = obtenerRankingProductos();
    const productoTop = ranking[0];

    dashboardVentasHoy.textContent = formatearMoneda(ingresoHoy);
    dashboardOperacionesHoy.textContent =
        `${ventasHoy.length} ${ventasHoy.length === 1 ? "operación" : "operaciones"}`;

    dashboardVentasMes.textContent = formatearMoneda(ingresoMes);
    dashboardOperacionesMes.textContent =
        `${ventasMes.length} ${ventasMes.length === 1 ? "operación" : "operaciones"}`;

    dashboardGananciaMes.textContent = formatearMoneda(gananciaMes);
    dashboardProductoTop.textContent = productoTop?.nombre || "Sin ventas";
    dashboardProductoTopCantidad.textContent =
        `${productoTop?.cantidad || 0} ${(productoTop?.cantidad || 0) === 1 ? "unidad" : "unidades"}`;

    renderizarRanking(ranking);
    renderizarGraficaVentas();
}

function renderizarRanking(ranking) {
    const primeros = ranking.slice(0, 5);

    if (!primeros.length) {
        rankingProductos.innerHTML = `
            <div class="ranking-vacio">
                <i class="bi bi-bar-chart fs-2 d-block mb-2"></i>
                Aún no hay datos suficientes.
            </div>
        `;
        return;
    }

    rankingProductos.innerHTML = primeros.map(
        (producto, indice) => `
            <div class="ranking-item">
                <div class="ranking-posicion">${indice + 1}</div>

                <div
                    class="ranking-nombre"
                    title="${escaparHtml(producto.nombre)}">

                    ${escaparHtml(producto.nombre)}
                </div>

                <div class="ranking-unidades">
                    ${producto.cantidad} u.
                </div>
            </div>
        `
    ).join("");
}

function obtenerUltimosSieteDias() {
    const dias = [];

    for (let indice = 6; indice >= 0; indice -= 1) {
        const fecha = new Date();

        fecha.setHours(0, 0, 0, 0);
        fecha.setDate(fecha.getDate() - indice);

        dias.push(fecha);
    }

    return dias;
}

function renderizarGraficaVentas() {
    if (!graficaVentasCanvas || typeof Chart === "undefined") {
        return;
    }

    const dias = obtenerUltimosSieteDias();

    const etiquetas = dias.map(fecha =>
        fecha.toLocaleDateString("es-MX", {
            weekday: "short",
            day: "2-digit"
        })
    );

    const totales = dias.map(dia =>
        ventas
            .filter(venta =>
                esMismoDia(new Date(venta.fecha), dia)
            )
            .reduce(
                (total, venta) =>
                    total + Number(venta.total || 0),
                0
            )
    );

    if (graficaVentas) {
        graficaVentas.destroy();
    }

    graficaVentas = new Chart(graficaVentasCanvas, {
        type: "line",

        data: {
            labels: etiquetas,

            datasets: [{
                label: "Ingresos",
                data: totales,
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label(contexto) {
                            return ` ${formatearMoneda(contexto.raw)}`;
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    ticks: {
                        callback(valor) {
                            return Number(valor).toLocaleString("es-MX", {
                                style: "currency",
                                currency: "MXN",
                                maximumFractionDigits: 0
                            });
                        }
                    }
                }
            }
        }
    });
}

function abrirTicket(id) {
    const venta = ventas.find(
        item => Number(item.id) === Number(id)
    );

    if (!venta) {
        return;
    }

    mostrarTicket(venta);
}

function obtenerConfiguracionTicket() {
    const base={negocioNombre:"PS Deals",negocioSlogan:"Las mejores ofertas, cerca de ti.",negocioTelefono:"",negocioWhatsApp:"",negocioCorreo:"",negocioDireccion:"",negocioRFC:"",negocioRedes:"",ticketEncabezado:"PS Deals",ticketPie:"Gracias por tu compra.",ticketMostrarTelefono:true,ticketMostrarDireccion:false,ticketTamano:"80",ticketLogo:"img/logo/Logo.png",ticketMostrarQR:true,ticketMostrarCodigo:true};
    try{return {...base,...(JSON.parse(localStorage.getItem("psdeals_configuracion"))||{})};}catch{return base;}
}

function resumenTicket(venta){
    const c=obtenerConfiguracionTicket(), items=obtenerItemsVenta(venta), f=new Date(venta.fecha);
    return [`🧾 *${c.negocioNombre||"PS Deals"}*`,c.negocioSlogan||"","",`Folio: ${venta.folio||venta.id}`,`Fecha: ${f.toLocaleString("es-MX")}`,`Cliente: ${venta.cliente||"Público general"}`,"",...items.map(i=>`${Number(i.cantidad||0)} x ${i.producto} — ${formatearMoneda(i.importe??i.precioUnitario*i.cantidad)}`),"",`Subtotal: ${formatearMoneda(venta.subtotal??venta.total)}`,`Descuento: ${formatearMoneda(venta.descuento||0)}`,`*TOTAL: ${formatearMoneda(venta.total)}*`,`Pago: ${venta.metodoPago||"Sin especificar"}`,venta.recibido!=null?`Recibido: ${formatearMoneda(venta.recibido)}`:"",venta.cambio!=null?`Cambio: ${formatearMoneda(venta.cambio)}`:"","",c.ticketPie||"Gracias por tu compra."].filter(Boolean).join("\n");
}

function aplicarTamanoTicket(t){
    const v=String(t)==="58"?"58":"80";
    ticketImpresion.classList.toggle("ticket-58",v==="58");
    ticketImpresion.classList.toggle("ticket-80",v==="80");
    const r=document.querySelector(`input[name="ticketTamano"][value="${v}"]`); if(r)r.checked=true;
    if(ticketFormatoActual)ticketFormatoActual.textContent=`Papel térmico de ${v} mm`;
    document.documentElement.style.setProperty("--ticket-print-width",`${v}mm`);
}

function mostrarTicket(venta) {
    ventaTicketActual=venta;
    const c=obtenerConfiguracionTicket(), fecha=new Date(venta.fecha), items=obtenerItemsVenta(venta), logo=String(c.ticketLogo||"").trim();
    ticketImpresion.innerHTML=`
    <div class="ticket-cabecera">
    ${logo?`<img class="ticket-logo" src="${escaparHtml(logo)}" alt="Logo" onerror="this.style.display='none'">`:""}
    <h2>${escaparHtml(c.ticketEncabezado||c.negocioNombre||"PS Deals")}</h2>
    ${c.negocioSlogan?`<p>${escaparHtml(c.negocioSlogan)}</p>`:""}
    ${c.negocioRFC?`<p><strong>RFC:</strong> ${escaparHtml(c.negocioRFC)}</p>`:""}
    ${c.ticketMostrarDireccion&&c.negocioDireccion?`<p>${escaparHtml(c.negocioDireccion)}</p>`:""}
    ${c.ticketMostrarTelefono&&c.negocioTelefono?`<p>Tel. ${escaparHtml(c.negocioTelefono)}</p>`:""}
    ${c.negocioCorreo?`<p>${escaparHtml(c.negocioCorreo)}</p>`:""}
    </div>
    <div class="ticket-separador"></div>
    <div class="ticket-datos"><p><strong>Folio:</strong> ${escaparHtml(venta.folio||String(venta.id))}</p><p><strong>Fecha:</strong> ${fecha.toLocaleString("es-MX")}</p><p><strong>Cliente:</strong> ${escaparHtml(venta.cliente||"Público general")}</p><p><strong>Pago:</strong> ${escaparHtml(venta.metodoPago||"Sin especificar")}</p></div>
    <div class="ticket-separador"></div>
    ${items.map(i=>`<div class="ticket-producto"><strong>${escaparHtml(i.producto)}</strong><div class="ticket-linea"><span>${Number(i.cantidad||0)} × ${formatearMoneda(i.precioUnitario)}</span><span>${formatearMoneda(i.importe??i.precioUnitario*i.cantidad)}</span></div></div>`).join("")}
    <div class="ticket-separador"></div>
    <div class="ticket-linea"><span>Subtotal</span><span>${formatearMoneda(venta.subtotal??venta.total)}</span></div>
    <div class="ticket-linea"><span>Descuento</span><span>${formatearMoneda(venta.descuento||0)}</span></div>
    <div class="ticket-linea ticket-total"><span>Total</span><span>${formatearMoneda(venta.total)}</span></div>
    ${venta.recibido!=null?`<div class="ticket-linea"><span>Recibido</span><span>${formatearMoneda(venta.recibido)}</span></div>`:""}
    ${venta.cambio!=null?`<div class="ticket-linea"><span>Cambio</span><span>${formatearMoneda(venta.cambio)}</span></div>`:""}
    ${venta.notas?`<div class="ticket-separador"></div><p><strong>Notas:</strong> ${escaparHtml(venta.notas)}</p>`:""}
    ${c.ticketMostrarQR?`<div class="ticket-separador"></div><div class="ticket-qr-area"><div id="ticketQr"></div><small>Escanea para identificar esta venta</small></div>`:""}
    ${c.ticketMostrarCodigo?`<div class="ticket-barcode-area"><svg id="ticketCodigoBarras"></svg></div>`:""}
    <div class="ticket-separador"></div><div class="ticket-pie"><p>${escaparHtml(c.ticketPie||"Gracias por su compra.")}</p>${c.negocioRedes?`<small>${escaparHtml(c.negocioRedes)}</small>`:""}</div>`;

    aplicarTamanoTicket(c.ticketTamano);
    if(c.ticketMostrarQR&&window.QRCode){new QRCode(document.getElementById("ticketQr"),{text:JSON.stringify({folio:venta.folio||venta.id,fecha:venta.fecha,cliente:venta.cliente||"Público general",total:Number(venta.total||0)}),width:92,height:92,correctLevel:QRCode.CorrectLevel.M});}
    if(c.ticketMostrarCodigo&&window.JsBarcode){try{JsBarcode("#ticketCodigoBarras",String(venta.folio||venta.id),{format:"CODE128",width:1.3,height:42,displayValue:true,fontSize:10,margin:0});}catch(e){console.warn(e);}}
    modalTicket.show();
}

document.querySelectorAll('input[name="ticketTamano"]').forEach(r=>r.addEventListener("change",()=>aplicarTamanoTicket(r.value)));
btnImprimirTicket.addEventListener("click",()=>window.print());

btnDescargarTicketImagen?.addEventListener("click",async()=>{
    if(!ventaTicketActual||!window.html2canvas)return;
    const original=btnDescargarTicketImagen.innerHTML;
    try{
        btnDescargarTicketImagen.disabled=true;
        btnDescargarTicketImagen.innerHTML='<i class="bi bi-hourglass-split"></i><span><strong>Generando imagen…</strong><small>Espera un momento</small></span>';
        const canvas=await html2canvas(ticketImpresion,{scale:2,backgroundColor:"#fff",useCORS:true});
        const a=document.createElement("a"); a.download=`ticket-${ventaTicketActual.folio||ventaTicketActual.id}.png`; a.href=canvas.toDataURL("image/png"); a.click();
    }catch(e){console.error(e);mostrarMensaje("No se pudo generar la imagen del ticket.","danger");}
    finally{btnDescargarTicketImagen.disabled=false;btnDescargarTicketImagen.innerHTML=original;}
});

btnCompartirTicketWhatsApp?.addEventListener("click",()=>{
    if(!ventaTicketActual)return;
    let tel=String(ventaTicketActual.telefono||ventaTicketActual.clienteTelefono||"").replace(/\D/g,""); if(tel.length===10)tel=`52${tel}`;
    const url=tel?`https://wa.me/${tel}?text=${encodeURIComponent(resumenTicket(ventaTicketActual))}`:`https://wa.me/?text=${encodeURIComponent(resumenTicket(ventaTicketActual))}`;
    window.open(url,"_blank","noopener");
});

btnCopiarResumenTicket?.addEventListener("click",async()=>{
    if(!ventaTicketActual)return;
    const texto=resumenTicket(ventaTicketActual);
    try{await navigator.clipboard.writeText(texto);}catch{const a=document.createElement("textarea");a.value=texto;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();}
    mostrarMensaje("Resumen del ticket copiado.","success");
});

function exportarVentas() {
    if (!ventas.length) {
        mostrarMensaje("No hay ventas para exportar.", "warning");
        return;
    }

    const archivo = new Blob(
        [JSON.stringify(ventas, null, 4)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download =
        `ps-deals-ventas-${new Date().toISOString().slice(0, 10)}.json`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);

    mostrarMensaje(
        "Ventas exportadas correctamente.",
        "success"
    );
}

btnExportarVentas.addEventListener("click", exportarVentas);

async function cargarVentasDesdeSQLite() {
    try {
        if (!window.PSApi?.sales) throw new Error("API no disponible");
        const respuesta = await window.PSApi.sales();
        ventas = Array.isArray(respuesta.ventas) ? respuesta.ventas : [];
        guardarVentas();
    } catch (error) {
        console.warn("Ventas: usando caché local temporal.", error.message);
        mostrarMensaje("No se pudo consultar SQLite; se muestra la caché local.", "warning");
    }
    renderizarVentas();
}

renderizarCarrito();
cargarVentasDesdeSQLite();
busquedaProducto.focus();
