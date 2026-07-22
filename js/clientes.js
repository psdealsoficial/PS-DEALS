const CLAVE_CLIENTES = "psdeals_clientes";
const CLAVE_VENTAS = "psdeals_ventas";

const tablaClientes = document.getElementById("tablaClientes");
const buscadorClientes = document.getElementById("buscadorClientes");
const filtroClientes = document.getElementById("filtroClientes");

const statClientes = document.getElementById("statClientes");
const statConCompras = document.getElementById("statConCompras");
const statValorClientes = document.getElementById("statValorClientes");
const statMejorCliente = document.getElementById("statMejorCliente");
const statMejorClienteTotal = document.getElementById("statMejorClienteTotal");

const btnNuevoCliente = document.getElementById("btnNuevoCliente");
const btnSincronizar = document.getElementById("btnSincronizar");

const formCliente = document.getElementById("formCliente");
const clienteId = document.getElementById("clienteId");
const clienteNombre = document.getElementById("clienteNombre");
const clienteTelefono = document.getElementById("clienteTelefono");
const clienteCorreo = document.getElementById("clienteCorreo");
const clienteDireccion = document.getElementById("clienteDireccion");
const clienteNotas = document.getElementById("clienteNotas");
const mensajeCliente = document.getElementById("mensajeCliente");
const tituloModalCliente = document.getElementById("tituloModalCliente");

const detalleClienteNombre = document.getElementById("detalleClienteNombre");
const detalleTotalGastado = document.getElementById("detalleTotalGastado");
const detalleCompras = document.getElementById("detalleCompras");
const detalleTicketPromedio = document.getElementById("detalleTicketPromedio");
const detalleContacto = document.getElementById("detalleContacto");
const tablaComprasCliente = document.getElementById("tablaComprasCliente");

const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const btnAbrirSidebar = document.getElementById("btnAbrirSidebar");
const btnCerrarSidebar = document.getElementById("btnCerrarSidebar");

const modalCliente = new bootstrap.Modal(
    document.getElementById("modalCliente")
);

const modalDetalleCliente = new bootstrap.Modal(
    document.getElementById("modalDetalleCliente")
);

let clientes = obtenerClientes();
let ventas = obtenerVentas();
let guardandoCliente = false;

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

function guardarCacheClientes() {
    localStorage.setItem(CLAVE_CLIENTES, JSON.stringify(clientes));
}

async function cargarClientesDesdeSQLite(termino = "") {
    try {
        const respuesta = await window.PSApi.clients(termino);
        clientes = Array.isArray(respuesta.clientes) ? respuesta.clientes : [];
        guardarCacheClientes();
        document.documentElement.dataset.clientesSource = "sqlite";
        renderizarTodo();
    } catch (error) {
        document.documentElement.dataset.clientesSource = "cache";
        console.warn("Clientes: usando caché local por error de API:", error.message);
        renderizarTodo();
    }
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

function normalizarTexto(texto) {
    return String(texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizarTelefono(telefono) {
    return String(telefono || "").replace(/\D/g, "");
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

function generarId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

function esPublicoGeneral(nombre) {
    const valor = normalizarTexto(nombre);

    return (
        !valor ||
        valor === "publico general" ||
        valor === "publico en general" ||
        valor === "cliente"
    );
}

function encontrarClientePorVenta(venta) {
    const telefonoVenta = normalizarTelefono(venta.telefono);
    const nombreVenta = normalizarTexto(venta.cliente);

    if (telefonoVenta) {
        const porTelefono = clientes.find(
            cliente =>
                normalizarTelefono(cliente.telefono) === telefonoVenta
        );

        if (porTelefono) {
            return porTelefono;
        }
    }

    if (nombreVenta && !esPublicoGeneral(nombreVenta)) {
        return clientes.find(
            cliente =>
                normalizarTexto(cliente.nombre) === nombreVenta
        );
    }

    return null;
}

function sincronizarClientesDesdeVentas(mostrarAviso = false) {
    ventas = obtenerVentas();

    let creados = 0;
    let actualizados = 0;

    ventas.forEach(venta => {
        if (esPublicoGeneral(venta.cliente)) {
            return;
        }

        const existente = encontrarClientePorVenta(venta);

        if (existente) {
            if (!existente.telefono && venta.telefono) {
                existente.telefono = venta.telefono;
                existente.actualizadoEn = new Date().toISOString();
                actualizados += 1;
            }

            return;
        }

        clientes.push({
            id: generarId(),
            nombre: String(venta.cliente || "").trim(),
            telefono: String(venta.telefono || "").trim(),
            correo: "",
            direccion: "",
            notas: "Cliente detectado automáticamente desde ventas.",
            creadoEn: venta.fecha || new Date().toISOString(),
            actualizadoEn: new Date().toISOString()
        });

        creados += 1;
    });

    guardarCacheClientes();
    if (window.PSApi) { window.PSApi.saveClients(clientes).catch(error => console.warn("No se pudo sincronizar clientes detectados:", error.message)); }
    renderizarTodo();

    if (mostrarAviso) {
        alert(
            `Sincronización terminada.\n` +
            `Clientes nuevos: ${creados}\n` +
            `Actualizados: ${actualizados}`
        );
    }
}

function obtenerVentasCliente(cliente) {
    const telefonoCliente = normalizarTelefono(cliente.telefono);
    const nombreCliente = normalizarTexto(cliente.nombre);

    return ventas.filter(venta => {
        const telefonoVenta = normalizarTelefono(venta.telefono);
        const nombreVenta = normalizarTexto(venta.cliente);

        if (
            telefonoCliente &&
            telefonoVenta &&
            telefonoCliente === telefonoVenta
        ) {
            return true;
        }

        return (
            nombreCliente &&
            nombreVenta &&
            nombreCliente === nombreVenta
        );
    });
}

function obtenerResumenCliente(cliente) {
    const compras = obtenerVentasCliente(cliente);

    const totalGastado = compras.reduce(
        (total, venta) => total + Number(venta.total || 0),
        0
    );

    const ultimaCompra = compras.length
        ? compras
            .map(venta => new Date(venta.fecha))
            .sort((a, b) => b - a)[0]
        : null;

    return {
        compras,
        cantidadCompras: compras.length,
        totalGastado,
        ticketPromedio:
            compras.length > 0
                ? totalGastado / compras.length
                : 0,
        ultimaCompra
    };
}

function obtenerIniciales(nombre) {
    return String(nombre || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0]?.toUpperCase() || "")
        .join("");
}

function renderizarEstadisticas() {
    const resumenes = clientes.map(cliente => ({
        cliente,
        resumen: obtenerResumenCliente(cliente)
    }));

    const conCompras = resumenes.filter(
        item => item.resumen.cantidadCompras > 0
    );

    const valorTotal = conCompras.reduce(
        (total, item) => total + item.resumen.totalGastado,
        0
    );

    const mejor = [...conCompras].sort(
        (a, b) =>
            b.resumen.totalGastado - a.resumen.totalGastado
    )[0];

    statClientes.textContent =
        clientes.length.toLocaleString("es-MX");

    statConCompras.textContent =
        conCompras.length.toLocaleString("es-MX");

    statValorClientes.textContent =
        formatearMoneda(valorTotal);

    statMejorCliente.textContent =
        mejor?.cliente.nombre || "Sin datos";

    statMejorClienteTotal.textContent =
        `${formatearMoneda(mejor?.resumen.totalGastado || 0)} gastados`;
}

function obtenerClientesFiltrados() {
    const termino = normalizarTexto(buscadorClientes.value);
    const filtro = filtroClientes.value;

    return clientes
        .map(cliente => ({
            cliente,
            resumen: obtenerResumenCliente(cliente)
        }))
        .filter(({ cliente, resumen }) => {
            const coincideBusqueda = !termino || [
                cliente.nombre,
                cliente.telefono,
                cliente.correo,
                cliente.direccion
            ].some(valor =>
                normalizarTexto(valor).includes(termino)
            );

            if (!coincideBusqueda) {
                return false;
            }

            if (filtro === "con-compras") {
                return resumen.cantidadCompras > 0;
            }

            if (filtro === "sin-compras") {
                return resumen.cantidadCompras === 0;
            }

            if (filtro === "frecuentes") {
                return resumen.cantidadCompras >= 3;
            }

            return true;
        })
        .sort((a, b) =>
            b.resumen.totalGastado - a.resumen.totalGastado
        );
}

function renderizarClientes() {
    const filtrados = obtenerClientesFiltrados();

    if (!filtrados.length) {
        tablaClientes.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="bi bi-people fs-2 d-block mb-2"></i>
                    No se encontraron clientes.
                </td>
            </tr>
        `;
        return;
    }

    tablaClientes.innerHTML = filtrados.map(({ cliente, resumen }) => `
        <tr>
            <td>
                <div class="cliente-identidad">
                    <div class="avatar-cliente">
                        ${escaparHtml(obtenerIniciales(cliente.nombre))}
                    </div>

                    <div>
                        <strong>${escaparHtml(cliente.nombre)}</strong>
                        <small>
                            Registrado:
                            ${new Date(
                                cliente.creadoEn || Date.now()
                            ).toLocaleDateString("es-MX")}
                        </small>

                        ${
                            resumen.cantidadCompras >= 3
                                ? `
                                    <span class="badge-frecuente">
                                        <i class="bi bi-star-fill"></i>
                                        Cliente frecuente
                                    </span>
                                `
                                : ""
                        }
                    </div>
                </div>
            </td>

            <td>
                <div>
                    ${escaparHtml(cliente.telefono || "Sin teléfono")}
                </div>
                <div class="small text-muted">
                    ${escaparHtml(cliente.correo || "Sin correo")}
                </div>
            </td>

            <td>
                <strong>${resumen.cantidadCompras}</strong>
                <div class="small text-muted">
                    Ticket promedio:
                    ${formatearMoneda(resumen.ticketPromedio)}
                </div>
            </td>

            <td>
                ${
                    resumen.ultimaCompra
                        ? resumen.ultimaCompra.toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        })
                        : "Sin compras"
                }
            </td>

            <td>
                <strong>${formatearMoneda(resumen.totalGastado)}</strong>
            </td>

            <td class="text-end">
                <div class="d-inline-flex gap-1">
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        onclick="verCliente(${cliente.id})"
                        title="Ver historial">

                        <i class="bi bi-eye"></i>
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        onclick="editarCliente(${cliente.id})"
                        title="Editar">

                        <i class="bi bi-pencil"></i>
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        onclick="eliminarCliente(${cliente.id})"
                        title="Eliminar">

                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function renderizarTodo() {
    ventas = obtenerVentas();
    renderizarEstadisticas();
    renderizarClientes();
}

function limpiarFormulario() {
    formCliente.reset();
    clienteId.value = "";
    mensajeCliente.className = "alert d-none mt-3 mb-0";
    mensajeCliente.textContent = "";
}

btnNuevoCliente.addEventListener("click", () => {
    limpiarFormulario();
    tituloModalCliente.textContent = "Nuevo cliente";
    modalCliente.show();
});

formCliente.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (guardandoCliente) return;

    const nombre = clienteNombre.value.trim();
    const telefono = clienteTelefono.value.trim();
    const correo = clienteCorreo.value.trim();
    if (!nombre) { mostrarMensajeCliente("El nombre es obligatorio.", "danger"); return; }

    const idActual = Number(clienteId.value || 0);
    const datos = {
        nombre, telefono, correo,
        direccion: clienteDireccion.value.trim(),
        notas: clienteNotas.value.trim()
    };

    guardandoCliente = true;
    const boton = formCliente.querySelector('button[type="submit"]');
    if (boton) { boton.disabled = true; boton.dataset.texto = boton.innerHTML; boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando…'; }
    try {
        const respuesta = idActual
            ? await window.PSApi.updateClient(idActual, datos)
            : await window.PSApi.createClient(datos);
        const guardado = respuesta.cliente;
        const indice = clientes.findIndex(item => Number(item.id) === Number(guardado.id));
        if (indice >= 0) clientes[indice] = guardado; else clientes.push(guardado);
        guardarCacheClientes();
        modalCliente.hide();
        renderizarTodo();
        window.PSUX?.toast?.(idActual ? "Cliente actualizado correctamente" : "Cliente creado correctamente", "success");
    } catch (error) {
        mostrarMensajeCliente(error.message || "No se pudo guardar el cliente.", "danger");
    } finally {
        guardandoCliente = false;
        if (boton) { boton.disabled = false; boton.innerHTML = boton.dataset.texto || '<i class="bi bi-floppy-fill"></i> Guardar cliente'; }
    }
});

function mostrarMensajeCliente(texto, tipo) {
    mensajeCliente.textContent = texto;
    mensajeCliente.className =
        `alert alert-${tipo} mt-3 mb-0`;
}

function editarCliente(id) {
    const cliente = clientes.find(
        item => Number(item.id) === Number(id)
    );

    if (!cliente) {
        return;
    }

    limpiarFormulario();

    clienteId.value = cliente.id;
    clienteNombre.value = cliente.nombre || "";
    clienteTelefono.value = cliente.telefono || "";
    clienteCorreo.value = cliente.correo || "";
    clienteDireccion.value = cliente.direccion || "";
    clienteNotas.value = cliente.notas || "";

    tituloModalCliente.textContent = "Editar cliente";
    modalCliente.show();
}

async function eliminarCliente(id) {
    const cliente = clientes.find(item => Number(item.id) === Number(id));
    if (!cliente) return;
    const resumen = obtenerResumenCliente(cliente);
    const mensaje = resumen.cantidadCompras > 0
        ? `Este cliente tiene ${resumen.cantidadCompras} compra(s). Sus ventas no se eliminarán. ¿Eliminarlo del directorio?`
        : `¿Eliminar a "${cliente.nombre}" del directorio?`;
    if (!confirm(mensaje)) return;
    try {
        await window.PSApi.deleteClient(id);
        clientes = clientes.filter(item => Number(item.id) !== Number(id));
        guardarCacheClientes();
        renderizarTodo();
        window.PSUX?.toast?.("Cliente eliminado correctamente", "success");
    } catch (error) {
        alert(error.message || "No se pudo eliminar el cliente.");
    }
}

function verCliente(id) {
    const cliente = clientes.find(
        item => Number(item.id) === Number(id)
    );

    if (!cliente) {
        return;
    }

    const resumen = obtenerResumenCliente(cliente);

    detalleClienteNombre.textContent = cliente.nombre;
    detalleTotalGastado.textContent =
        formatearMoneda(resumen.totalGastado);

    detalleCompras.textContent =
        resumen.cantidadCompras.toLocaleString("es-MX");

    detalleTicketPromedio.textContent =
        formatearMoneda(resumen.ticketPromedio);

    detalleContacto.innerHTML = `
        <div class="contact-grid">
            <div class="contact-item">
                <span>Teléfono</span>
                <strong>${escaparHtml(cliente.telefono || "No registrado")}</strong>
            </div>

            <div class="contact-item">
                <span>Correo</span>
                <strong>${escaparHtml(cliente.correo || "No registrado")}</strong>
            </div>

            <div class="contact-item">
                <span>Dirección</span>
                <strong>${escaparHtml(cliente.direccion || "No registrada")}</strong>
            </div>

            <div class="contact-item">
                <span>Notas</span>
                <strong>${escaparHtml(cliente.notas || "Sin notas")}</strong>
            </div>
        </div>
    `;

    if (!resumen.compras.length) {
        tablaComprasCliente.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Este cliente todavía no tiene compras asociadas.
                </td>
            </tr>
        `;
    } else {
        tablaComprasCliente.innerHTML = [...resumen.compras]
            .sort(
                (a, b) =>
                    new Date(b.fecha) - new Date(a.fecha)
            )
            .map(venta => {
                const items = Array.isArray(venta.items)
                    ? venta.items
                    : [{
                        producto: venta.producto || "Producto",
                        cantidad: Number(venta.cantidad || 0)
                    }];

                const resumenProductos = items.length === 1
                    ? items[0].producto
                    : `${items[0].producto} y ${items.length - 1} más`;

                return `
                    <tr>
                        <td>
                            ${new Date(venta.fecha).toLocaleString("es-MX")}
                        </td>

                        <td>${escaparHtml(venta.folio || String(venta.id))}</td>

                        <td>
                            ${escaparHtml(resumenProductos)}
                            <div class="small text-muted">
                                ${items.reduce(
                                    (total, item) =>
                                        total + Number(item.cantidad || 0),
                                    0
                                )} unidades
                            </div>
                        </td>

                        <td>${escaparHtml(venta.metodoPago || "Sin especificar")}</td>

                        <td class="text-end">
                            <strong>${formatearMoneda(venta.total)}</strong>
                        </td>
                    </tr>
                `;
            })
            .join("");
    }

    modalDetalleCliente.show();
}

let temporizadorBusqueda;
buscadorClientes.addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(() => cargarClientesDesdeSQLite(buscadorClientes.value.trim()), 250);
});
filtroClientes.addEventListener("change", renderizarClientes);

btnSincronizar.addEventListener("click", () => {
    sincronizarClientesDesdeVentas(true);
});

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

document.querySelectorAll(".disabled-link").forEach(enlace => {
    enlace.addEventListener("click", evento => {
        evento.preventDefault();
    });
});

cargarClientesDesdeSQLite();
