(() => {
"use strict";

const btnAbrir = document.getElementById("btnAbrirEscaner");
const modalElemento = document.getElementById("modalEscaner");

if (!btnAbrir || !modalElemento) return;

const modal = new bootstrap.Modal(modalElemento);
const video = document.getElementById("scannerVideo");
const placeholder = document.getElementById("scannerPlaceholder");
const estado = document.getElementById("scannerEstado");
const mensaje = document.getElementById("scannerMensaje");
const btnCambiarCamara = document.getElementById("btnCambiarCamara");
const btnReintentar = document.getElementById("btnReintentarCamara");
const archivoCodigo = document.getElementById("archivoCodigo");
const codigoManual = document.getElementById("codigoManual");
const btnBuscarManual = document.getElementById("btnBuscarCodigoManual");

let stream = null;
let detector = null;
let cicloId = null;
let camaras = [];
let indiceCamara = 0;
let ultimoCodigo = "";
let ultimoMomento = 0;
let procesando = false;

function mostrarEstado(tipo, titulo, detalle, icono) {
    estado.className = `scanner-status ${tipo || ""}`;
    estado.innerHTML = `
        <span class="scanner-status-icon"><i class="bi ${icono}"></i></span>
        <div><strong>${titulo}</strong><small>${detalle}</small></div>
    `;
}

function mostrarMensaje(texto, tipo = "danger") {
    mensaje.textContent = texto;
    mensaje.className = `alert alert-${tipo} mt-3 mb-0`;
}

function ocultarMensaje() {
    mensaje.className = "alert d-none mt-3 mb-0";
}

function detenerCamara() {
    if (cicloId) cancelAnimationFrame(cicloId);
    cicloId = null;

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    video.srcObject = null;
    placeholder.classList.remove("d-none");
}

async function crearDetector() {
    if (!("BarcodeDetector" in window)) return null;

    try {
        const soportados = await BarcodeDetector.getSupportedFormats();
        const preferidos = [
            "ean_13", "ean_8", "upc_a", "upc_e",
            "code_128", "code_39", "code_93", "itf",
            "qr_code", "data_matrix"
        ].filter(formato => soportados.includes(formato));

        return new BarcodeDetector(preferidos.length ? { formats: preferidos } : undefined);
    } catch (error) {
        console.warn("No se pudo crear BarcodeDetector:", error);
        return null;
    }
}

async function listarCamaras() {
    try {
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        camaras = dispositivos.filter(d => d.kind === "videoinput");
        if (indiceCamara >= camaras.length) indiceCamara = 0;
    } catch {
        camaras = [];
    }
}

async function iniciarCamara() {
    ocultarMensaje();
    detenerCamara();

    if (!navigator.mediaDevices?.getUserMedia) {
        mostrarEstado(
            "error",
            "Cámara no disponible",
            "Este navegador no permite usar la cámara. Usa el código manual o un lector USB.",
            "bi-camera-video-off"
        );
        mostrarMensaje("Abre PS Deals con Live Server y usa Chrome, Edge o Brave actualizado.");
        return;
    }

    detector = detector || await crearDetector();

    if (!detector) {
        mostrarEstado(
            "warning",
            "Lectura automática no compatible",
            "La cámara puede abrirse, pero este navegador no reconoce códigos automáticamente.",
            "bi-exclamation-triangle"
        );
        mostrarMensaje("Puedes usar un lector USB o escribir el código manualmente.", "warning");
        return;
    }

    mostrarEstado(
        "",
        "Solicitando acceso",
        "Autoriza la cámara cuando el navegador muestre el permiso.",
        "bi-camera-video"
    );

    try {
        await listarCamaras();

        const seleccionada = camaras[indiceCamara];
        const videoConstraint = seleccionada?.deviceId
            ? { deviceId: { exact: seleccionada.deviceId } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } };

        stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false
        });

        video.srcObject = stream;
        await video.play();
        placeholder.classList.add("d-none");
        await listarCamaras();

        mostrarEstado(
            "success",
            "Cámara activa",
            "Centra el código dentro del recuadro azul.",
            "bi-camera-video-fill"
        );

        detectarContinuamente();
    } catch (error) {
        console.error("Error de cámara:", error);
        const denegado = error?.name === "NotAllowedError";
        mostrarEstado(
            "error",
            denegado ? "Permiso rechazado" : "No fue posible abrir la cámara",
            denegado
                ? "Permite el acceso desde el icono de cámara de la barra de direcciones."
                : "Prueba cambiar de cámara o utiliza captura manual.",
            "bi-camera-video-off"
        );
        mostrarMensaje(
            denegado
                ? "El navegador tiene bloqueado el permiso de cámara."
                : `Error de cámara: ${error?.message || "desconocido"}`
        );
    }
}

async function detectarContinuamente() {
    if (!stream || !detector) return;

    try {
        if (video.readyState >= 2 && !procesando) {
            procesando = true;
            const codigos = await detector.detect(video);
            procesando = false;

            if (codigos.length) {
                const codigo = String(codigos[0].rawValue || "").trim();
                const ahora = Date.now();

                if (codigo && (codigo !== ultimoCodigo || ahora - ultimoMomento > 2500)) {
                    ultimoCodigo = codigo;
                    ultimoMomento = ahora;
                    procesarCodigo(codigo);
                    return;
                }
            }
        }
    } catch (error) {
        procesando = false;
        console.warn("Lectura de código:", error);
    }

    cicloId = requestAnimationFrame(detectarContinuamente);
}

function buscarExacto(codigo) {
    const normalizado = String(codigo).trim().toLowerCase();

    return productos.find(producto => [
        producto.codigoBarras,
        producto.codigo,
        producto.sku
    ].some(valor => String(valor || "").trim().toLowerCase() === normalizado));
}

function procesarCodigo(codigo) {
    ocultarMensaje();
    const producto = buscarExacto(codigo);

    if (!producto) {
        mostrarEstado(
            "warning",
            "Código no registrado",
            `No existe un producto con el código ${codigo}.`,
            "bi-question-circle"
        );
        mostrarMensaje(`Código leído: ${codigo}. Asígnalo al producto desde Inventario.`, "warning");
        codigoManual.value = codigo;
        return;
    }

    if (typeof obtenerStock === "function" && obtenerStock(producto) <= 0) {
        mostrarEstado(
            "warning",
            "Producto sin disponibilidad",
            `${producto.nombre} no tiene stock disponible para vender.`,
            "bi-box-seam"
        );
        mostrarMensaje("El producto existe, pero está agotado o sus unidades están apartadas.", "warning");
        return;
    }

    detenerCamara();
    busquedaProducto.value = producto.codigoBarras || producto.codigo || producto.sku || producto.nombre;

    if (typeof seleccionarProducto === "function") {
        seleccionarProducto(producto.id);
    }

    if (typeof agregarProductoAlCarrito === "function") {
        agregarProductoAlCarrito();
    }

    if (window.PSAuth?.registrar) {
        PSAuth.registrar("Código escaneado", `${producto.nombre} · ${codigo}`);
    }

    mostrarEstado(
        "success",
        "Producto agregado",
        `${producto.nombre} se añadió al carrito.`,
        "bi-check-circle-fill"
    );

    setTimeout(() => {
        modal.hide();
        busquedaProducto.focus();
    }, 650);
}

async function leerImagen(archivo) {
    ocultarMensaje();
    detector = detector || await crearDetector();

    if (!detector) {
        mostrarMensaje("Este navegador no puede reconocer códigos desde imágenes.", "warning");
        return;
    }

    try {
        mostrarEstado("", "Analizando imagen", "Buscando códigos visibles.", "bi-image");
        const bitmap = await createImageBitmap(archivo);
        const codigos = await detector.detect(bitmap);
        bitmap.close();

        if (!codigos.length) {
            mostrarEstado("warning", "Código no encontrado", "Intenta con una imagen más clara y cercana.", "bi-search");
            mostrarMensaje("No se detectó ningún código en la imagen.", "warning");
            return;
        }

        procesarCodigo(codigos[0].rawValue);
    } catch (error) {
        console.error(error);
        mostrarMensaje("No fue posible analizar la imagen seleccionada.");
    } finally {
        archivoCodigo.value = "";
    }
}

btnAbrir.addEventListener("click", () => modal.show());

modalElemento.addEventListener("shown.bs.modal", iniciarCamara);
modalElemento.addEventListener("hidden.bs.modal", () => {
    detenerCamara();
    ocultarMensaje();
    codigoManual.value = "";
    ultimoCodigo = "";
});

btnReintentar.addEventListener("click", iniciarCamara);

btnCambiarCamara.addEventListener("click", async () => {
    await listarCamaras();

    if (camaras.length < 2) {
        mostrarMensaje("Solo se detectó una cámara en este equipo.", "info");
        return;
    }

    indiceCamara = (indiceCamara + 1) % camaras.length;
    iniciarCamara();
});

archivoCodigo.addEventListener("change", () => {
    const archivo = archivoCodigo.files?.[0];
    if (archivo) leerImagen(archivo);
});

btnBuscarManual.addEventListener("click", () => {
    const codigo = codigoManual.value.trim();

    if (!codigo) {
        mostrarMensaje("Escribe un código para buscar.", "warning");
        codigoManual.focus();
        return;
    }

    procesarCodigo(codigo);
});

codigoManual.addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
        evento.preventDefault();
        btnBuscarManual.click();
    }
});

/* Lectores USB suelen escribir muy rápido y terminar con Enter.
   El buscador existente ya procesa ese Enter y agrega el producto. */
})();