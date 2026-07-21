const CLAVE_VENTAS = "psdeals_ventas";

const filtroRapido = document.getElementById("filtroRapido");
const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");
const filtroPago = document.getElementById("filtroPago");
const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnExportarCSV = document.getElementById("btnExportarCSV");
const btnImprimirReporte = document.getElementById("btnImprimirReporte");

const textoPeriodo = document.getElementById("textoPeriodo");
const statIngresos = document.getElementById("statIngresos");
const statOperaciones = document.getElementById("statOperaciones");
const statUtilidad = document.getElementById("statUtilidad");
const statMargen = document.getElementById("statMargen");
const statTicketPromedio = document.getElementById("statTicketPromedio");
const statUnidades = document.getElementById("statUnidades");
const statProductoTop = document.getElementById("statProductoTop");
const statProductoTopCantidad = document.getElementById("statProductoTopCantidad");

const rankingProductos = document.getElementById("rankingProductos");
const rankingClientes = document.getElementById("rankingClientes");
const tablaReporte = document.getElementById("tablaReporte");
const contadorResultados = document.getElementById("contadorResultados");

const graficaIngresosCanvas = document.getElementById("graficaIngresos");
const graficaPagosCanvas = document.getElementById("graficaPagos");

const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const btnAbrirSidebar = document.getElementById("btnAbrirSidebar");
const btnCerrarSidebar = document.getElementById("btnCerrarSidebar");

let ventas = aplicarDevolucionesAVentas(obtenerVentas());
let ventasFiltradas = [];
let graficaIngresos = null;
let graficaPagos = null;


function aplicarDevolucionesAVentas(listaVentas){
    let devoluciones=[];
    try{devoluciones=JSON.parse(localStorage.getItem("psdeals_devoluciones")||"[]");}catch{devoluciones=[];}
    return listaVentas.map(venta=>{
        const clave=String(venta.id??venta.folio??venta.fecha);
        const dev=devoluciones.filter(d=>String(d.ventaId)===clave);
        const monto=dev.reduce((s,d)=>s+Number(d.monto||0),0);
        const gananciaDev=dev.reduce((s,d)=>s+Number(d.ganancia||0),0);
        const items=obtenerItemsVenta(venta).map(item=>{
            const cant=dev.filter(d=>Number(d.productoId)===Number(item.productoId)).reduce((s,d)=>s+Number(d.cantidad||0),0);
            const original=Number(item.cantidad||0), nueva=Math.max(0,original-cant);
            return {...item,cantidad:nueva,importe:original?Number(item.importe||0)*(nueva/original):0,ganancia:original?Number(item.ganancia||0)*(nueva/original):0};
        }).filter(i=>Number(i.cantidad)>0);
        return {...venta,total:Math.max(0,Number(venta.total||0)-monto),ganancia:Number(venta.ganancia||0)-gananciaDev,items};
    });
}

function obtenerVentas() {
    try {
        const guardadas = JSON.parse(
            localStorage.getItem(CLAVE_VENTAS) || "[]"
        );

        return Array.isArray(guardadas) ? guardadas : [];
    } catch (error) {
        console.error("Error al leer ventas:", error);
        return [];
    }
}

function escaparHtml(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatearMoneda(valor) {
    return Number(valor || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}

function fechaLocalISO(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function inicioDia(fecha) {
    const resultado = new Date(fecha);
    resultado.setHours(0, 0, 0, 0);
    return resultado;
}

function finDia(fecha) {
    const resultado = new Date(fecha);
    resultado.setHours(23, 59, 59, 999);
    return resultado;
}

function obtenerItemsVenta(venta) {
    if (Array.isArray(venta.items) && venta.items.length) {
        return venta.items;
    }

    return [{
        productoId: Number(venta.productoId),
        producto: venta.producto || "Producto",
        cantidad: Number(venta.cantidad || 0),
        precioUnitario: Number(venta.precioUnitario || 0),
        importe: Number(venta.total || 0),
        ganancia: Number(venta.ganancia || 0)
    }];
}

function establecerPeriodoRapido() {
    const ahora = new Date();
    let desde = null;
    let hasta = finDia(ahora);

    switch (filtroRapido.value) {
        case "hoy":
            desde = inicioDia(ahora);
            break;

        case "7dias":
            desde = inicioDia(ahora);
            desde.setDate(desde.getDate() - 6);
            break;

        case "30dias":
            desde = inicioDia(ahora);
            desde.setDate(desde.getDate() - 29);
            break;

        case "mes":
            desde = new Date(
                ahora.getFullYear(),
                ahora.getMonth(),
                1
            );
            break;

        case "anio":
            desde = new Date(
                ahora.getFullYear(),
                0,
                1
            );
            break;

        case "todo":
            fechaDesde.value = "";
            fechaHasta.value = "";
            return;

        case "personalizado":
            return;
    }

    fechaDesde.value = desde ? fechaLocalISO(desde) : "";
    fechaHasta.value = fechaLocalISO(hasta);
}

function obtenerRangoFechas() {
    const desde = fechaDesde.value
        ? inicioDia(new Date(`${fechaDesde.value}T00:00:00`))
        : null;

    const hasta = fechaHasta.value
        ? finDia(new Date(`${fechaHasta.value}T00:00:00`))
        : null;

    return { desde, hasta };
}

function actualizarTextoPeriodo(desde, hasta) {
    if (!desde && !hasta) {
        textoPeriodo.textContent = "Todas las ventas";
        return;
    }

    const formato = {
        day: "2-digit",
        month: "short",
        year: "numeric"
    };

    if (
        desde &&
        hasta &&
        fechaLocalISO(desde) === fechaLocalISO(hasta)
    ) {
        textoPeriodo.textContent =
            desde.toLocaleDateString("es-MX", formato);
        return;
    }

    const textoDesde = desde
        ? desde.toLocaleDateString("es-MX", formato)
        : "Inicio";

    const textoHasta = hasta
        ? hasta.toLocaleDateString("es-MX", formato)
        : "Hoy";

    textoPeriodo.textContent = `${textoDesde} — ${textoHasta}`;
}

function aplicarFiltros() {
    ventas = aplicarDevolucionesAVentas(obtenerVentas());

    const { desde, hasta } = obtenerRangoFechas();
    const pago = filtroPago.value;

    ventasFiltradas = ventas.filter(venta => {
        const fecha = new Date(venta.fecha);

        if (Number.isNaN(fecha.getTime())) {
            return false;
        }

        if (desde && fecha < desde) {
            return false;
        }

        if (hasta && fecha > hasta) {
            return false;
        }

        if (
            pago !== "todos" &&
            String(venta.metodoPago || "") !== pago
        ) {
            return false;
        }

        return true;
    }).sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    actualizarTextoPeriodo(desde, hasta);
    renderizarReporte();
}

function obtenerRankingProductos() {
    const mapa = {};

    ventasFiltradas.forEach(venta => {
        obtenerItemsVenta(venta).forEach(item => {
            const clave = String(
                item.productoId ?? item.producto
            );

            if (!mapa[clave]) {
                mapa[clave] = {
                    nombre: item.producto || "Producto",
                    cantidad: 0,
                    ingresos: 0
                };
            }

            mapa[clave].cantidad += Number(item.cantidad || 0);
            mapa[clave].ingresos += Number(
                item.importe ??
                (
                    Number(item.precioUnitario || 0) *
                    Number(item.cantidad || 0)
                )
            );
        });
    });

    return Object.values(mapa).sort((a, b) => {
        if (b.cantidad !== a.cantidad) {
            return b.cantidad - a.cantidad;
        }

        return b.ingresos - a.ingresos;
    });
}

function obtenerRankingClientes() {
    const mapa = {};

    ventasFiltradas.forEach(venta => {
        const nombre = String(
            venta.cliente || "Público general"
        ).trim();

        const clave = nombre.toLowerCase();

        if (!mapa[clave]) {
            mapa[clave] = {
                nombre,
                compras: 0,
                total: 0
            };
        }

        mapa[clave].compras += 1;
        mapa[clave].total += Number(venta.total || 0);
    });

    return Object.values(mapa).sort(
        (a, b) => b.total - a.total
    );
}

function renderizarMetricas() {
    const ingresos = ventasFiltradas.reduce(
        (total, venta) => total + Number(venta.total || 0),
        0
    );

    const utilidad = ventasFiltradas.reduce(
        (total, venta) => total + Number(venta.ganancia || 0),
        0
    );

    const unidades = ventasFiltradas.reduce(
        (total, venta) =>
            total + obtenerItemsVenta(venta).reduce(
                (acumulado, item) =>
                    acumulado + Number(item.cantidad || 0),
                0
            ),
        0
    );

    const ticketPromedio = ventasFiltradas.length
        ? ingresos / ventasFiltradas.length
        : 0;

    const margen = ingresos > 0
        ? (utilidad / ingresos) * 100
        : 0;

    const productoTop = obtenerRankingProductos()[0];

    statIngresos.textContent = formatearMoneda(ingresos);
    statOperaciones.textContent =
        `${ventasFiltradas.length} ${
            ventasFiltradas.length === 1
                ? "operación"
                : "operaciones"
        }`;

    statUtilidad.textContent = formatearMoneda(utilidad);
    statMargen.textContent = `Margen ${margen.toFixed(1)}%`;

    statTicketPromedio.textContent =
        formatearMoneda(ticketPromedio);

    statUnidades.textContent =
        `${unidades} ${
            unidades === 1
                ? "unidad vendida"
                : "unidades vendidas"
        }`;

    statProductoTop.textContent =
        productoTop?.nombre || "Sin datos";

    statProductoTopCantidad.textContent =
        `${productoTop?.cantidad || 0} ${
            (productoTop?.cantidad || 0) === 1
                ? "unidad"
                : "unidades"
        }`;
}

function renderizarRankings() {
    const productosTop = obtenerRankingProductos().slice(0, 6);
    const clientesTop = obtenerRankingClientes().slice(0, 6);

    rankingProductos.innerHTML = productosTop.length
        ? productosTop.map((producto, indice) => `
            <div class="ranking-item">
                <div class="ranking-number">${indice + 1}</div>

                <div>
                    <strong title="${escaparHtml(producto.nombre)}">
                        ${escaparHtml(producto.nombre)}
                    </strong>

                    <small>
                        ${formatearMoneda(producto.ingresos)} en ingresos
                    </small>
                </div>

                <span class="ranking-value">
                    ${producto.cantidad} u.
                </span>
            </div>
        `).join("")
        : `
            <div class="empty-state">
                <i class="bi bi-box-seam fs-2 d-block mb-2"></i>
                No hay productos en este periodo.
            </div>
        `;

    rankingClientes.innerHTML = clientesTop.length
        ? clientesTop.map((cliente, indice) => `
            <div class="ranking-item">
                <div class="ranking-number">${indice + 1}</div>

                <div>
                    <strong title="${escaparHtml(cliente.nombre)}">
                        ${escaparHtml(cliente.nombre)}
                    </strong>

                    <small>
                        ${cliente.compras} ${
                            cliente.compras === 1
                                ? "compra"
                                : "compras"
                        }
                    </small>
                </div>

                <span class="ranking-value">
                    ${formatearMoneda(cliente.total)}
                </span>
            </div>
        `).join("")
        : `
            <div class="empty-state">
                <i class="bi bi-people fs-2 d-block mb-2"></i>
                No hay clientes en este periodo.
            </div>
        `;
}

function renderizarTabla() {
    contadorResultados.textContent =
        `${ventasFiltradas.length} ${
            ventasFiltradas.length === 1
                ? "resultado"
                : "resultados"
        }`;

    if (!ventasFiltradas.length) {
        tablaReporte.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="bi bi-search fs-2 d-block mb-2"></i>
                    No existen ventas con los filtros seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    tablaReporte.innerHTML = ventasFiltradas.map(venta => {
        const items = obtenerItemsVenta(venta);
        const resumen = items.length === 1
            ? items[0].producto
            : `${items[0].producto} y ${items.length - 1} más`;

        return `
            <tr>
                <td>
                    ${new Date(venta.fecha).toLocaleDateString("es-MX")}
                    <div class="small text-muted">
                        ${new Date(venta.fecha).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                    </div>
                </td>

                <td>${escaparHtml(venta.folio || String(venta.id))}</td>

                <td>${escaparHtml(venta.cliente || "Público general")}</td>

                <td>
                    ${escaparHtml(resumen)}
                    <div class="small text-muted">
                        ${items.reduce(
                            (total, item) =>
                                total + Number(item.cantidad || 0),
                            0
                        )} unidades
                    </div>
                </td>

                <td>${escaparHtml(venta.metodoPago || "Sin especificar")}</td>

                <td>${formatearMoneda(venta.ganancia || 0)}</td>

                <td class="text-end">
                    <strong>${formatearMoneda(venta.total)}</strong>
                </td>
            </tr>
        `;
    }).join("");
}

function agruparIngresosPorDia() {
    const mapa = {};

    ventasFiltradas.forEach(venta => {
        const fecha = new Date(venta.fecha);

        if (Number.isNaN(fecha.getTime())) {
            return;
        }

        const clave = fechaLocalISO(fecha);
        mapa[clave] = (mapa[clave] || 0) + Number(venta.total || 0);
    });

    return Object.entries(mapa)
        .sort(([fechaA], [fechaB]) =>
            fechaA.localeCompare(fechaB)
        )
        .slice(-31);
}

function renderizarGraficas() {
    if (typeof Chart === "undefined") {
        return;
    }

    const ingresosPorDia = agruparIngresosPorDia();

    if (graficaIngresos) {
        graficaIngresos.destroy();
    }

    graficaIngresos = new Chart(graficaIngresosCanvas, {
        type: "line",

        data: {
            labels: ingresosPorDia.map(([fecha]) =>
                new Date(`${fecha}T00:00:00`).toLocaleDateString(
                    "es-MX",
                    {
                        day: "2-digit",
                        month: "short"
                    }
                )
            ),

            datasets: [{
                label: "Ingresos",
                data: ingresosPorDia.map(([, total]) => total),
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
                mode: "index",
                intersect: false
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
                x: {
                    grid: {
                        display: false
                    }
                },

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

    const pagos = {};

    ventasFiltradas.forEach(venta => {
        const metodo = venta.metodoPago || "Sin especificar";
        pagos[metodo] =
            (pagos[metodo] || 0) + Number(venta.total || 0);
    });

    if (graficaPagos) {
        graficaPagos.destroy();
    }

    graficaPagos = new Chart(graficaPagosCanvas, {
        type: "doughnut",

        data: {
            labels: Object.keys(pagos),

            datasets: [{
                data: Object.values(pagos),
                borderWidth: 0
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        boxWidth: 12,
                        padding: 16
                    }
                },

                tooltip: {
                    callbacks: {
                        label(contexto) {
                            return ` ${contexto.label}: ${formatearMoneda(contexto.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderizarReporte() {
    renderizarMetricas();
    renderizarRankings();
    renderizarTabla();
    renderizarGraficas();
}

function exportarCSV() {
    if (!ventasFiltradas.length) {
        alert("No hay ventas para exportar.");
        return;
    }

    const encabezados = [
        "Fecha",
        "Folio",
        "Cliente",
        "Telefono",
        "Metodo de pago",
        "Productos",
        "Unidades",
        "Subtotal",
        "Descuento",
        "Utilidad",
        "Total"
    ];

    const filas = ventasFiltradas.map(venta => {
        const items = obtenerItemsVenta(venta);

        return [
            new Date(venta.fecha).toLocaleString("es-MX"),
            venta.folio || venta.id,
            venta.cliente || "Público general",
            venta.telefono || "",
            venta.metodoPago || "",
            items
                .map(item => `${item.producto} x${item.cantidad}`)
                .join(" | "),
            items.reduce(
                (total, item) =>
                    total + Number(item.cantidad || 0),
                0
            ),
            Number(venta.subtotal ?? venta.total ?? 0),
            Number(venta.descuento || 0),
            Number(venta.ganancia || 0),
            Number(venta.total || 0)
        ];
    });

    const escaparCSV = valor => {
        const texto = String(valor ?? "");

        return `"${texto.replaceAll('"', '""')}"`;
    };

    const contenido = [
        encabezados.map(escaparCSV).join(","),
        ...filas.map(fila =>
            fila.map(escaparCSV).join(",")
        )
    ].join("\n");

    const blob = new Blob(
        ["\uFEFF" + contenido],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download =
        `ps-deals-reporte-${fechaLocalISO(new Date())}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
}

filtroRapido.addEventListener("change", () => {
    establecerPeriodoRapido();

    if (filtroRapido.value !== "personalizado") {
        aplicarFiltros();
    }
});

fechaDesde.addEventListener("change", () => {
    filtroRapido.value = "personalizado";
});

fechaHasta.addEventListener("change", () => {
    filtroRapido.value = "personalizado";
});

btnAplicarFiltros.addEventListener("click", aplicarFiltros);
btnExportarCSV.addEventListener("click", exportarCSV);
btnImprimirReporte.addEventListener("click", () => window.print());

function abrirSidebar() {
    sidebar.classList.add("open");
    sidebarBackdrop.classList.add("show");
}

function cerrarSidebar() {
    sidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("show");
}

btnAbrirSidebar.addEventListener("click", abrirSidebar);
btnCerrarSidebar.addEventListener("click", cerrarSidebar);
sidebarBackdrop.addEventListener("click", cerrarSidebar);

establecerPeriodoRapido();
aplicarFiltros();
