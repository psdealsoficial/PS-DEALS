const CLAVE_CUENTAS = "psdeals_cuentas_cobrar";
const CLAVE_CLIENTES = "psdeals_clientes";

const tablaCuentas = document.getElementById("tablaCuentas");
const buscadorCuentas = document.getElementById("buscadorCuentas");
const filtroEstado = document.getElementById("filtroEstado");

const heroSaldoPendiente = document.getElementById("heroSaldoPendiente");
const statTotalFinanciado = document.getElementById("statTotalFinanciado");
const statSaldoPendiente = document.getElementById("statSaldoPendiente");
const statCuentasAbiertas = document.getElementById("statCuentasAbiertas");
const statTotalRecuperado = document.getElementById("statTotalRecuperado");
const statVencidas = document.getElementById("statVencidas");
const statMontoVencido = document.getElementById("statMontoVencido");

const btnNuevaCuenta = document.getElementById("btnNuevaCuenta");

const formCuenta = document.getElementById("formCuenta");
const cuentaId = document.getElementById("cuentaId");
const cuentaCliente = document.getElementById("cuentaCliente");
const cuentaConcepto = document.getElementById("cuentaConcepto");
const cuentaMonto = document.getElementById("cuentaMonto");
const cuentaAbonoInicial = document.getElementById("cuentaAbonoInicial");
const cuentaFecha = document.getElementById("cuentaFecha");
const cuentaVencimiento = document.getElementById("cuentaVencimiento");
const cuentaNotas = document.getElementById("cuentaNotas");
const mensajeCuenta = document.getElementById("mensajeCuenta");
const tituloModalCuenta = document.getElementById("tituloModalCuenta");
const listaClientes = document.getElementById("listaClientes");

const formAbono = document.getElementById("formAbono");
const abonoCuentaId = document.getElementById("abonoCuentaId");
const abonoMonto = document.getElementById("abonoMonto");
const abonoFecha = document.getElementById("abonoFecha");
const abonoMetodo = document.getElementById("abonoMetodo");
const abonoNotas = document.getElementById("abonoNotas");
const abonoResumenCuenta = document.getElementById("abonoResumenCuenta");
const mensajeAbono = document.getElementById("mensajeAbono");

const detalleCuentaTitulo = document.getElementById("detalleCuentaTitulo");
const detalleMonto = document.getElementById("detalleMonto");
const detalleAbonado = document.getElementById("detalleAbonado");
const detalleSaldo = document.getElementById("detalleSaldo");
const detalleCuentaInfo = document.getElementById("detalleCuentaInfo");
const tablaAbonos = document.getElementById("tablaAbonos");

const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const btnAbrirSidebar = document.getElementById("btnAbrirSidebar");
const btnCerrarSidebar = document.getElementById("btnCerrarSidebar");

const modalCuenta = new bootstrap.Modal(
    document.getElementById("modalCuenta")
);

const modalAbono = new bootstrap.Modal(
    document.getElementById("modalAbono")
);

const modalDetalleCuenta = new bootstrap.Modal(
    document.getElementById("modalDetalleCuenta")
);

let cuentas = obtenerCuentas();
let clientes = obtenerClientes();

function obtenerCuentas() {
    try {
        const guardadas = JSON.parse(
            localStorage.getItem(CLAVE_CUENTAS) || "[]"
        );

        return Array.isArray(guardadas) ? guardadas : [];
    } catch (error) {
        console.error("Error al leer cuentas:", error);
        return [];
    }
}

function guardarCuentas() {
    localStorage.setItem(
        CLAVE_CUENTAS,
        JSON.stringify(cuentas)
    );
}

function obtenerClientes() {
    try {
        const guardados = JSON.parse(
            localStorage.getItem(CLAVE_CLIENTES) || "[]"
        );

        return Array.isArray(guardados) ? guardados : [];
    } catch (error) {
        console.error("Error al leer clientes:", error);
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

function normalizarTexto(texto) {
    return String(texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function formatearMoneda(valor) {
    return Number(valor || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}

function fechaLocalISO(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function generarId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

function totalAbonado(cuenta) {
    return (cuenta.abonos || []).reduce(
        (total, abono) => total + Number(abono.monto || 0),
        0
    );
}

function saldoCuenta(cuenta) {
    return Math.max(
        0,
        Number(cuenta.monto || 0) - totalAbonado(cuenta)
    );
}

function estaVencida(cuenta) {
    if (saldoCuenta(cuenta) <= 0) {
        return false;
    }

    const vencimiento = new Date(`${cuenta.vencimiento}T23:59:59`);

    return vencimiento < new Date();
}

function estadoCuenta(cuenta) {
    if (saldoCuenta(cuenta) <= 0) {
        return "pagada";
    }

    if (estaVencida(cuenta)) {
        return "vencida";
    }

    return "pendiente";
}

function textoEstado(cuenta) {
    const estado = estadoCuenta(cuenta);

    if (estado === "pagada") {
        return "Pagada";
    }

    if (estado === "vencida") {
        return "Vencida";
    }

    return "Pendiente";
}

function renderizarListaClientes() {
    clientes = obtenerClientes();

    listaClientes.innerHTML = clientes
        .sort((a, b) =>
            String(a.nombre).localeCompare(
                String(b.nombre),
                "es"
            )
        )
        .map(cliente => `
            <option value="${escaparHtml(cliente.nombre)}">
                ${escaparHtml(cliente.telefono || "")}
            </option>
        `)
        .join("");
}

function renderizarEstadisticas() {
    const totalFinanciado = cuentas.reduce(
        (total, cuenta) => total + Number(cuenta.monto || 0),
        0
    );

    const recuperado = cuentas.reduce(
        (total, cuenta) => total + totalAbonado(cuenta),
        0
    );

    const saldo = cuentas.reduce(
        (total, cuenta) => total + saldoCuenta(cuenta),
        0
    );

    const abiertas = cuentas.filter(
        cuenta => saldoCuenta(cuenta) > 0
    );

    const vencidas = cuentas.filter(estaVencida);

    const montoVencido = vencidas.reduce(
        (total, cuenta) => total + saldoCuenta(cuenta),
        0
    );

    heroSaldoPendiente.textContent = formatearMoneda(saldo);
    statTotalFinanciado.textContent = formatearMoneda(totalFinanciado);
    statSaldoPendiente.textContent = formatearMoneda(saldo);
    statCuentasAbiertas.textContent =
        `${abiertas.length} ${
            abiertas.length === 1
                ? "cuenta abierta"
                : "cuentas abiertas"
        }`;

    statTotalRecuperado.textContent = formatearMoneda(recuperado);
    statVencidas.textContent = vencidas.length.toLocaleString("es-MX");
    statMontoVencido.textContent =
        `${formatearMoneda(montoVencido)} vencido`;
}

function obtenerCuentasFiltradas() {
    const termino = normalizarTexto(buscadorCuentas.value);
    const filtro = filtroEstado.value;

    return cuentas
        .filter(cuenta => {
            const coincideBusqueda = !termino || [
                cuenta.cliente,
                cuenta.concepto,
                cuenta.folio,
                cuenta.notas
            ].some(valor =>
                normalizarTexto(valor).includes(termino)
            );

            if (!coincideBusqueda) {
                return false;
            }

            const estado = estadoCuenta(cuenta);

            if (filtro === "pendientes") {
                return estado === "pendiente";
            }

            if (filtro === "vencidas") {
                return estado === "vencida";
            }

            if (filtro === "pagadas") {
                return estado === "pagada";
            }

            return true;
        })
        .sort((a, b) => {
            const ordenEstado = {
                vencida: 0,
                pendiente: 1,
                pagada: 2
            };

            const diferencia =
                ordenEstado[estadoCuenta(a)] -
                ordenEstado[estadoCuenta(b)];

            if (diferencia !== 0) {
                return diferencia;
            }

            return new Date(a.vencimiento) - new Date(b.vencimiento);
        });
}

function renderizarCuentas() {
    const filtradas = obtenerCuentasFiltradas();

    if (!filtradas.length) {
        tablaCuentas.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="bi bi-credit-card-2-front fs-2 d-block mb-2"></i>
                    No se encontraron cuentas por cobrar.
                </td>
            </tr>
        `;
        return;
    }

    tablaCuentas.innerHTML = filtradas.map(cuenta => {
        const abonado = totalAbonado(cuenta);
        const saldo = saldoCuenta(cuenta);
        const estado = estadoCuenta(cuenta);

        return `
            <tr>
                <td>
                    <div class="cliente-cell">
                        <strong>${escaparHtml(cuenta.cliente)}</strong>
                        <small>${escaparHtml(cuenta.folio)}</small>
                    </div>
                </td>

                <td>${escaparHtml(cuenta.concepto)}</td>

                <td>
                    ${new Date(
                        `${cuenta.fecha}T00:00:00`
                    ).toLocaleDateString("es-MX")}
                </td>

                <td>
                    ${new Date(
                        `${cuenta.vencimiento}T00:00:00`
                    ).toLocaleDateString("es-MX")}
                </td>

                <td>${formatearMoneda(cuenta.monto)}</td>

                <td>${formatearMoneda(abonado)}</td>

                <td>
                    <span class="saldo-pendiente">
                        ${formatearMoneda(saldo)}
                    </span>
                </td>

                <td>
                    <span class="estado-badge estado-${estado}">
                        ${textoEstado(cuenta)}
                    </span>
                </td>

                <td class="text-end">
                    <div class="d-inline-flex gap-1">

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            onclick="verCuenta(${cuenta.id})"
                            title="Ver estado de cuenta">

                            <i class="bi bi-eye"></i>
                        </button>

                        ${
                            saldo > 0
                                ? `
                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-success"
                                        onclick="abrirAbono(${cuenta.id})"
                                        title="Registrar abono">

                                        <i class="bi bi-cash-coin"></i>
                                    </button>
                                `
                                : ""
                        }

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            onclick="editarCuenta(${cuenta.id})"
                            title="Editar">

                            <i class="bi bi-pencil"></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            onclick="eliminarCuenta(${cuenta.id})"
                            title="Eliminar">

                            <i class="bi bi-trash"></i>
                        </button>

                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function renderizarTodo() {
    renderizarEstadisticas();
    renderizarCuentas();
}

function limpiarFormularioCuenta() {
    formCuenta.reset();
    cuentaId.value = "";
    mensajeCuenta.className = "alert d-none mt-3 mb-0";
    mensajeCuenta.textContent = "";

    const hoy = new Date();
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 30);

    cuentaFecha.value = fechaLocalISO(hoy);
    cuentaVencimiento.value = fechaLocalISO(vencimiento);
    cuentaAbonoInicial.value = 0;
}

btnNuevaCuenta.addEventListener("click", () => {
    limpiarFormularioCuenta();
    tituloModalCuenta.textContent = "Nueva cuenta por cobrar";
    renderizarListaClientes();
    modalCuenta.show();
});

formCuenta.addEventListener("submit", evento => {
    evento.preventDefault();

    const monto = Number(cuentaMonto.value || 0);
    const abonoInicial = Number(cuentaAbonoInicial.value || 0);

    if (monto <= 0) {
        mostrarMensajeCuenta(
            "El monto del crédito debe ser mayor que cero.",
            "danger"
        );
        return;
    }

    if (abonoInicial < 0 || abonoInicial > monto) {
        mostrarMensajeCuenta(
            "El abono inicial no puede ser mayor que el crédito.",
            "warning"
        );
        return;
    }

    if (
        new Date(`${cuentaVencimiento.value}T00:00:00`) <
        new Date(`${cuentaFecha.value}T00:00:00`)
    ) {
        mostrarMensajeCuenta(
            "La fecha de vencimiento no puede ser anterior a la fecha de la cuenta.",
            "warning"
        );
        return;
    }

    const idActual = Number(cuentaId.value || 0);

    const datos = {
        cliente: cuentaCliente.value.trim(),
        concepto: cuentaConcepto.value.trim(),
        monto,
        fecha: cuentaFecha.value,
        vencimiento: cuentaVencimiento.value,
        notas: cuentaNotas.value.trim(),
        actualizadoEn: new Date().toISOString()
    };

    if (idActual) {
        const indice = cuentas.findIndex(
            cuenta => Number(cuenta.id) === idActual
        );

        if (indice >= 0) {
            const abonadoActual = totalAbonado(cuentas[indice]);

            if (monto < abonadoActual) {
                mostrarMensajeCuenta(
                    `El nuevo monto no puede ser menor que lo ya abonado (${formatearMoneda(abonadoActual)}).`,
                    "warning"
                );
                return;
            }

            cuentas[indice] = {
                ...cuentas[indice],
                ...datos
            };
        }
    } else {
        const abonos = [];

        if (abonoInicial > 0) {
            abonos.push({
                id: generarId(),
                fecha: cuentaFecha.value,
                monto: abonoInicial,
                metodo: "Abono inicial",
                notas: "Abono registrado al crear la cuenta."
            });
        }

        cuentas.push({
            id: generarId(),
            folio: `CXC-${Date.now().toString().slice(-8)}`,
            ...datos,
            abonos,
            creadoEn: new Date().toISOString()
        });
    }

    guardarCuentas();
    modalCuenta.hide();
    renderizarTodo();
});

function mostrarMensajeCuenta(texto, tipo) {
    mensajeCuenta.textContent = texto;
    mensajeCuenta.className =
        `alert alert-${tipo} mt-3 mb-0`;
}

function editarCuenta(id) {
    const cuenta = cuentas.find(
        item => Number(item.id) === Number(id)
    );

    if (!cuenta) {
        return;
    }

    limpiarFormularioCuenta();
    renderizarListaClientes();

    cuentaId.value = cuenta.id;
    cuentaCliente.value = cuenta.cliente || "";
    cuentaConcepto.value = cuenta.concepto || "";
    cuentaMonto.value = cuenta.monto || 0;
    cuentaAbonoInicial.value = 0;
    cuentaAbonoInicial.disabled = true;
    cuentaFecha.value = cuenta.fecha;
    cuentaVencimiento.value = cuenta.vencimiento;
    cuentaNotas.value = cuenta.notas || "";

    tituloModalCuenta.textContent = "Editar cuenta por cobrar";

    modalCuenta.show();

    document.getElementById("modalCuenta").addEventListener(
        "hidden.bs.modal",
        () => {
            cuentaAbonoInicial.disabled = false;
        },
        { once: true }
    );
}

function eliminarCuenta(id) {
    const cuenta = cuentas.find(
        item => Number(item.id) === Number(id)
    );

    if (!cuenta) {
        return;
    }

    if (
        !confirm(
            `¿Eliminar la cuenta ${cuenta.folio} de ${cuenta.cliente}?`
        )
    ) {
        return;
    }

    cuentas = cuentas.filter(
        item => Number(item.id) !== Number(id)
    );

    guardarCuentas();
    renderizarTodo();
}

function abrirAbono(id) {
    const cuenta = cuentas.find(
        item => Number(item.id) === Number(id)
    );

    if (!cuenta) {
        return;
    }

    const saldo = saldoCuenta(cuenta);

    abonoCuentaId.value = cuenta.id;
    abonoMonto.value = "";
    abonoMonto.max = saldo;
    abonoFecha.value = fechaLocalISO();
    abonoMetodo.value = "Efectivo";
    abonoNotas.value = "";
    mensajeAbono.className = "alert d-none mt-3 mb-0";
    mensajeAbono.textContent = "";

    abonoResumenCuenta.innerHTML = `
        <strong>${escaparHtml(cuenta.cliente)}</strong>
        <div class="small text-muted">
            ${escaparHtml(cuenta.concepto)}
        </div>
        <div class="mt-2">
            Saldo pendiente:
            <strong class="text-danger">
                ${formatearMoneda(saldo)}
            </strong>
        </div>
    `;

    modalAbono.show();
}

formAbono.addEventListener("submit", evento => {
    evento.preventDefault();

    const cuenta = cuentas.find(
        item =>
            Number(item.id) === Number(abonoCuentaId.value)
    );

    if (!cuenta) {
        return;
    }

    const monto = Number(abonoMonto.value || 0);
    const saldo = saldoCuenta(cuenta);

    if (monto <= 0) {
        mostrarMensajeAbono(
            "El abono debe ser mayor que cero.",
            "danger"
        );
        return;
    }

    if (monto > saldo) {
        mostrarMensajeAbono(
            `El abono no puede exceder el saldo de ${formatearMoneda(saldo)}.`,
            "warning"
        );
        return;
    }

    cuenta.abonos = Array.isArray(cuenta.abonos)
        ? cuenta.abonos
        : [];

    cuenta.abonos.push({
        id: generarId(),
        fecha: abonoFecha.value,
        monto,
        metodo: abonoMetodo.value,
        notas: abonoNotas.value.trim()
    });

    cuenta.actualizadoEn = new Date().toISOString();

    guardarCuentas();
    modalAbono.hide();
    renderizarTodo();
});

function mostrarMensajeAbono(texto, tipo) {
    mensajeAbono.textContent = texto;
    mensajeAbono.className =
        `alert alert-${tipo} mt-3 mb-0`;
}

function verCuenta(id) {
    const cuenta = cuentas.find(
        item => Number(item.id) === Number(id)
    );

    if (!cuenta) {
        return;
    }

    const abonado = totalAbonado(cuenta);
    const saldo = saldoCuenta(cuenta);

    detalleCuentaTitulo.textContent =
        `${cuenta.folio} · ${cuenta.cliente}`;

    detalleMonto.textContent = formatearMoneda(cuenta.monto);
    detalleAbonado.textContent = formatearMoneda(abonado);
    detalleSaldo.textContent = formatearMoneda(saldo);

    detalleCuentaInfo.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <span>Cliente</span>
                <strong>${escaparHtml(cuenta.cliente)}</strong>
            </div>

            <div class="detail-item">
                <span>Concepto</span>
                <strong>${escaparHtml(cuenta.concepto)}</strong>
            </div>

            <div class="detail-item">
                <span>Fecha</span>
                <strong>
                    ${new Date(
                        `${cuenta.fecha}T00:00:00`
                    ).toLocaleDateString("es-MX")}
                </strong>
            </div>

            <div class="detail-item">
                <span>Vencimiento</span>
                <strong>
                    ${new Date(
                        `${cuenta.vencimiento}T00:00:00`
                    ).toLocaleDateString("es-MX")}
                </strong>
            </div>

            <div class="detail-item">
                <span>Estado</span>
                <strong>${textoEstado(cuenta)}</strong>
            </div>

            <div class="detail-item">
                <span>Notas</span>
                <strong>${escaparHtml(cuenta.notas || "Sin notas")}</strong>
            </div>
        </div>
    `;

    const abonos = Array.isArray(cuenta.abonos)
        ? [...cuenta.abonos].sort(
            (a, b) =>
                new Date(b.fecha) - new Date(a.fecha)
        )
        : [];

    tablaAbonos.innerHTML = abonos.length
        ? abonos.map(abono => `
            <tr>
                <td>
                    ${new Date(
                        `${abono.fecha}T00:00:00`
                    ).toLocaleDateString("es-MX")}
                </td>

                <td>${escaparHtml(abono.metodo || "Sin especificar")}</td>

                <td>${escaparHtml(abono.notas || "Sin notas")}</td>

                <td class="text-end">
                    <strong>${formatearMoneda(abono.monto)}</strong>
                </td>
            </tr>
        `).join("")
        : `
            <tr>
                <td colspan="4" class="empty-state">
                    No hay abonos registrados.
                </td>
            </tr>
        `;

    modalDetalleCuenta.show();
}

buscadorCuentas.addEventListener("input", renderizarCuentas);
filtroEstado.addEventListener("change", renderizarCuentas);

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

renderizarListaClientes();
renderizarTodo();
