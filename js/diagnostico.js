(() => {
  "use strict";
  const info = window.PSSystemInfo || { version: "desconocida", build: "—" };
  const archivos = [
    ["Dashboard", "dashboard.html"], ["Ventas", "ventas.html"], ["Inventario", "admin.html"],
    ["Clientes", "clientes.html"], ["Compras", "compras.html"], ["Gastos", "gastos.html"],
    ["Reportes", "reportes.html"], ["Actividad", "actividad.html"], ["Notificaciones", "notificaciones.html"],
    ["Configuración", "configuracion.html"]
  ];
  const $ = id => document.getElementById(id);
  let resultados = [];
  let lineasLog = [];

  function log(texto) { lineasLog.push(`[${new Date().toLocaleTimeString()}] ${texto}`); $("logTecnico").textContent = lineasLog.join("\n"); }
  function estadoClase(estado) { return estado === "ok" ? "ok" : estado === "warn" ? "warn" : estado === "bad" ? "bad" : "pending"; }
  function estadoTexto(estado) { return estado === "ok" ? "Correcto" : estado === "warn" ? "Revisar" : estado === "bad" ? "Error" : "Pendiente"; }
  function renderPruebas() {
    $("listaPruebas").innerHTML = resultados.map(r => `<div class="test-row"><span class="test-icon"><i class="bi ${r.icono || "bi-check2-circle"}"></i></span><div><strong>${r.nombre}</strong><small>${r.detalle}</small></div><span class="status ${estadoClase(r.estado)}">${estadoTexto(r.estado)}</span></div>`).join("");
    const ok = resultados.filter(r => r.estado === "ok").length, warn = resultados.filter(r => r.estado === "warn").length, bad = resultados.filter(r => r.estado === "bad").length;
    $("totalOk").textContent = ok; $("totalWarn").textContent = warn; $("totalBad").textContent = bad;
    const total = resultados.length || 1; $("progreso").style.width = `${Math.round(((ok + warn + bad) / total) * 100)}%`;
    $("estadoGeneral").className = `status ${bad ? "bad" : warn ? "warn" : "ok"}`;
    $("estadoGeneral").textContent = bad ? "Requiere corrección" : warn ? "Funciona con avisos" : "Sistema correcto";
    $("recomendacion").textContent = bad ? "Hay errores que deben corregirse antes del commit. Revisa el registro técnico." : warn ? "La instalación funciona, pero hay avisos. Normalmente se resuelven abriendo con Live Server o revisando permisos." : "Todo correcto. La arquitectura modular y los servicios principales están funcionando.";
  }
  function agregar(nombre, estado, detalle, icono) { resultados.push({ nombre, estado, detalle, icono }); log(`${estado.toUpperCase()}: ${nombre} — ${detalle}`); renderPruebas(); }
  async function existe(url) {
    try { const r = await fetch(`${url}?diag=${Date.now()}`, { cache: "no-store" }); return r.ok; } catch { return false; }
  }
  async function ejecutar() {
    resultados = []; lineasLog = []; $("btnEjecutar").disabled = true; $("btnEjecutar").innerHTML = '<i class="bi bi-hourglass-split"></i> Revisando…';
    const inicio = performance.now(); log(`Iniciando diagnóstico PS Deals v${info.version}`);
    const servidor = location.protocol === "http:" || location.protocol === "https:";
    agregar("Servidor local", servidor ? "ok" : "bad", servidor ? `Ejecutando desde ${location.origin}` : "Abre el proyecto con Live Server; file:// no permite cargar componentes.", "bi-hdd-network");
    const mount = $("psSidebarMount");
    agregar("Sidebar modular", mount?.dataset.loaded === "true" && !!document.querySelector("#sidebar") ? "ok" : "bad", mount?.dataset.loaded === "true" ? "components/sidebar.html fue cargado correctamente." : "El componente sidebar no reportó carga.", "bi-layout-sidebar-inset");
    agregar("Motor de componentes", window.PSComponents?.loadSidebar ? "ok" : "bad", window.PSComponents?.loadSidebar ? "PSComponents está disponible." : "No se encontró js/component-loader.js.", "bi-boxes");
    const usuario = window.PSAuth?.usuarioActual?.();
    agregar("Autenticación", usuario ? "ok" : "bad", usuario ? `Sesión activa: ${usuario.nombre} (${usuario.rol}).` : "No existe una sesión válida.", "bi-shield-lock");
    agregar("Permiso de diagnóstico", window.PSAuth?.puede?.("diagnostico", usuario) ? "ok" : "warn", window.PSAuth?.puede?.("diagnostico", usuario) ? "El usuario puede abrir Developer Center." : "El permiso no está asignado al usuario actual.", "bi-person-check");
    let storageOk = false;
    try { const k = "psdeals_test_diagnostico"; localStorage.setItem(k, "ok"); storageOk = localStorage.getItem(k) === "ok"; localStorage.removeItem(k); } catch {}
    agregar("Almacenamiento local", storageOk ? "ok" : "bad", storageOk ? `${localStorage.length} claves disponibles actualmente.` : "El navegador bloqueó localStorage.", "bi-database-check");
    agregar("Buscador y productividad", window.PSProductividad || document.querySelector('script[src="js/productividad-global.js"]') ? "ok" : "warn", "El paquete global de productividad está enlazado en esta página.", "bi-command");
    agregar("Versión del sistema", info.version === "3.6.1" ? "ok" : "warn", `Versión detectada: ${info.version}; build ${info.build}.`, "bi-tag");
    let componentesOk = await existe("components/sidebar.html");
    agregar("Archivo del componente", componentesOk ? "ok" : "bad", componentesOk ? "components/sidebar.html responde correctamente." : "No fue posible leer components/sidebar.html.", "bi-file-earmark-code");
    const estadosModulos = [];
    for (const [nombre, archivo] of archivos) { const ok = await existe(archivo); estadosModulos.push({ nombre, archivo, ok }); }
    const fallos = estadosModulos.filter(x => !x.ok);
    agregar("Páginas principales", fallos.length ? "bad" : "ok", fallos.length ? `No respondieron: ${fallos.map(x => x.archivo).join(", ")}` : `${estadosModulos.length} módulos respondieron correctamente.`, "bi-window-stack");
    $("modulosGrid").innerHTML = estadosModulos.map(x => `<div class="module-item"><span>${x.nombre}</span><span class="status ${x.ok ? "ok" : "bad"}">${x.ok ? "Disponible" : "Error"}</span></div>`).join("");
    const ms = Math.round(performance.now() - inicio); $("tiempoPrueba").textContent = `${ms} ms`; log(`Diagnóstico terminado en ${ms} ms.`);
    $("btnEjecutar").disabled = false; $("btnEjecutar").innerHTML = '<i class="bi bi-arrow-repeat"></i> Ejecutar de nuevo';
  }
  function cargarMeta() {
    $("versionSistema").textContent = `v${info.version}`; $("buildSistema").textContent = `Build ${info.build}`;
    const usuario = window.PSAuth?.usuarioActual?.();
    const datos = [["Aplicación", `${info.name} — ${info.release}`],["Navegador", navigator.userAgent.split(")")[0] + ")"],["URL", location.href],["Protocolo", location.protocol],["Usuario", usuario ? `${usuario.nombre} / ${usuario.rol}` : "Sin sesión"],["Almacenamiento", `${localStorage.length} claves`],["Resolución", `${innerWidth} × ${innerHeight}`],["Fecha", new Date().toLocaleString()]];
    $("metaSistema").innerHTML = datos.map(([a,b]) => `<div class="meta-item"><span>${a}</span><strong>${b}</strong></div>`).join("");
  }
  async function copiar() {
    const reporte = [`PS Deals v${info.version} — Diagnóstico`, `Build: ${info.build}`, `URL: ${location.href}`, "", ...lineasLog].join("\n");
    try { await navigator.clipboard.writeText(reporte); window.PSToast?.success?.("Reporte copiado") || alert("Reporte copiado."); } catch { alert(reporte); }
  }
  document.addEventListener("DOMContentLoaded", () => { cargarMeta(); $("btnEjecutar").addEventListener("click", ejecutar); $("btnCopiar").addEventListener("click", copiar); setTimeout(ejecutar, 250); });
})();
