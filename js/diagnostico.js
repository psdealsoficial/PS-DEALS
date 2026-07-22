(() => {
  "use strict";
  const info = window.PSSystemInfo || { version: "desconocida", build: "—" };
  const archivos = [
    ["Dashboard", "dashboard.html"], ["Ventas", "ventas.html"], ["Inventario", "admin.html"],
    ["Clientes", "clientes.html"], ["Compras", "compras.html"], ["Gastos", "gastos.html"],
    ["Reportes", "reportes.html"], ["Actividad", "actividad.html"], ["Notificaciones", "notificaciones.html"],
    ["Configuración", "configuracion.html"]
  ];
  const paginasArquitectura = [
    ["Dashboard","dashboard.html"],["Notificaciones","notificaciones.html"],["Actividad","actividad.html"],
    ["Ventas","ventas.html"],["Apartados","apartados.html"],["Devoluciones","devoluciones.html"],
    ["Inventario","admin.html"],["Compras","compras.html"],["Gastos","gastos.html"],["Clientes","clientes.html"],
    ["Cuentas por cobrar","cuentas-cobrar.html"],["Reportes","reportes.html"],["Configuración","configuracion.html"],
    ["Diagnóstico","diagnostico.html"],["Usuarios","usuarios.html"]
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
  async function analizarArquitectura(nombre, archivo) {
    try {
      const r = await fetch(`${archivo}?diag=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return { nombre, archivo, ok: false, motivo: "No disponible" };
      const html = await r.text();
      const mounts = (html.match(/id=["']psSidebarMount["']/g) || []).length;
      const loaders = (html.match(/js\/component-loader\.js/g) || []).length;
      const legacy = /<aside[^>]+id=["']sidebar["']/.test(html) && mounts === 0;
      return { nombre, archivo, ok: mounts === 1 && loaders === 1 && !legacy, mounts, loaders, legacy,
        motivo: mounts !== 1 ? `Montajes: ${mounts}` : loaders !== 1 ? `Cargadores: ${loaders}` : legacy ? "Sidebar antiguo" : "Modular" };
    } catch { return { nombre, archivo, ok: false, motivo: "Error de lectura" }; }
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
    const perf = window.PSPerformance?.report?.();
    if (perf) {
      const carga = perf.navigation.load;
      agregar("Rendimiento de carga", carga > 0 && carga <= 2500 ? "ok" : carga <= 5000 ? "warn" : "bad", carga ? `Carga completa aproximada: ${carga} ms.` : "El navegador no expuso métricas de navegación.", "bi-speedometer2");
      agregar("Uso de almacenamiento", perf.storage.percentEstimate < 70 ? "ok" : perf.storage.percentEstimate < 90 ? "warn" : "bad", `${perf.storage.kb} KB en ${perf.storage.keys} claves; uso estimado ${perf.storage.percentEstimate}% del límite local.`, "bi-device-ssd");
      agregar("Integridad de datos", perf.integrity.malformed.length === 0 ? "ok" : "bad", perf.integrity.malformed.length === 0 ? `${perf.integrity.available} colecciones válidas; no se detectó JSON dañado.` : `Colecciones dañadas: ${perf.integrity.malformed.map(x => x.key).join(", ")}.`, "bi-shield-check");
    } else {
      agregar("Monitor de rendimiento", "bad", "No se encontró js/performance-monitor.js.", "bi-speedometer2");
    }
    const productividad = window.PSProductividad;
    agregar("Centro de comandos", productividad?.tieneCentroComandos?.() ? "ok" : "bad", productividad?.tieneCentroComandos?.() ? "Ctrl + K y el panel global están disponibles." : "No se encontró el Centro de comandos.", "bi-command");
    const favoritos = productividad?.favoritos?.() || [];
    const favKey = productividad?.claveFavoritos?.() || "no disponible";
    agregar("Favoritos por usuario", productividad?.renderFavoritosSidebar && Array.isArray(favoritos) ? "ok" : "bad", productividad ? `${favoritos.length} favorito(s) guardado(s) en ${favKey}.` : "El servicio de favoritos no está disponible.", "bi-star-fill");
    agregar("Ayuda contextual", productividad?.tieneAyuda?.() ? "ok" : "bad", productividad?.tieneAyuda?.() ? "El botón de ayuda contextual está visible." : "No se encontró el botón de ayuda.", "bi-question-circle");
    agregar("Atajos de teclado", document.documentElement.dataset.psUx === "3.9.1" ? "ok" : "warn", document.documentElement.dataset.psUx ? `UX activa: v${document.documentElement.dataset.psUx}.` : "No se confirmó la inicialización de UX.", "bi-keyboard");
    agregar("Versión del sistema", info.version === "4.2.0" ? "ok" : "warn", `Versión detectada: ${info.version}; build ${info.build}.`, "bi-tag");
    if (window.PSApi?.health) {
      try {
        const health = await window.PSApi.health();
        agregar("API local", health.ok ? "ok" : "bad", health.ok ? `API ${health.api} disponible en ${location.origin}.` : "La API respondió con error.", "bi-hdd-network");
        agregar("Base de datos SQLite", health.database?.connected ? "ok" : "bad", health.database?.connected ? `SQLite ${health.database.sqliteVersion}; ${health.database.migrationCount} migración(es) aplicada(s).` : (health.database?.error || "SQLite no está conectado."), "bi-database-check");
        agregar("Migraciones de base de datos", health.database?.migrationCount >= 1 ? "ok" : "warn", `${health.database?.migrationCount || 0} migración(es) registrada(s).`, "bi-arrow-up-circle");
        try { const sync = await PSApi.syncStatus(); agregar("Sincronización SQLite", sync.counts ? "ok" : "warn", `${sync.counts.productos} productos y ${sync.counts.clientes} clientes en SQLite.`, "bi-arrow-repeat"); } catch (error) { agregar("Sincronización SQLite", "bad", error.message, "bi-arrow-repeat"); }
        try { const system = await PSApi.systemStatus(); agregar("Motor de datos SQLite", system.dataSource?.productos === "sqlite" && system.dataSource?.clientes === "sqlite" ? "ok" : "warn", `Productos: ${system.dataSource?.productos}; clientes: ${system.dataSource?.clientes}; caché: ${system.dataSource?.fallback}.`, "bi-database-gear"); } catch(error) { agregar("Motor de datos SQLite", "bad", error.message, "bi-database-gear"); }
        try { const apiTests = await PSApi.tests(); agregar("Pruebas automáticas API", apiTests.ok ? "ok" : "bad", `${apiTests.passed}/${apiTests.total} correctas en ${apiTests.durationMs} ms.`, "bi-clipboard2-check"); } catch(error) { agregar("Pruebas automáticas API", "bad", error.message, "bi-clipboard2-x"); }
      } catch (error) {
        agregar("API local", "bad", `No responde /api/health: ${error.message}. Ejecuta npm install y npm start.`, "bi-hdd-network");
        agregar("Base de datos SQLite", "bad", "No se puede validar SQLite mientras la API esté desconectada.", "bi-database-x");
      }
    } else {
      agregar("Cliente API", "bad", "No se encontró js/api-client.js.", "bi-plug");
    }
    let componentesOk = await existe("components/sidebar.html");
    agregar("Archivo del componente", componentesOk ? "ok" : "bad", componentesOk ? "components/sidebar.html responde correctamente." : "No fue posible leer components/sidebar.html.", "bi-file-earmark-code");
    const estadosModulos = [];
    for (const [nombre, archivo] of archivos) { const ok = await existe(archivo); estadosModulos.push({ nombre, archivo, ok }); }
    const fallos = estadosModulos.filter(x => !x.ok);
    agregar("Páginas principales", fallos.length ? "bad" : "ok", fallos.length ? `No respondieron: ${fallos.map(x => x.archivo).join(", ")}` : `${estadosModulos.length} módulos respondieron correctamente.`, "bi-window-stack");
    $("modulosGrid").innerHTML = estadosModulos.map(x => `<div class="module-item"><span>${x.nombre}</span><span class="status ${x.ok ? "ok" : "bad"}">${x.ok ? "Disponible" : "Error"}</span></div>`).join("");
    const arquitectura = [];
    for (const [nombre, archivo] of paginasArquitectura) arquitectura.push(await analizarArquitectura(nombre, archivo));
    const modulares = arquitectura.filter(x => x.ok).length;
    const cobertura = Math.round((modulares / arquitectura.length) * 100);
    const duplicadosRuntime = window.PSComponents?.detectarDuplicados?.() || { sidebars: 0, mounts: 0, activeLinks: 0 };
    agregar("Cobertura modular", cobertura === 100 ? "ok" : "warn", `${modulares} de ${arquitectura.length} páginas usan el componente central (${cobertura}%).`, "bi-diagram-3");
    agregar("Menús duplicados", duplicadosRuntime.sidebars === 1 && duplicadosRuntime.mounts === 1 ? "ok" : "bad", `Página actual: ${duplicadosRuntime.sidebars} sidebar(s), ${duplicadosRuntime.mounts} montaje(s).`, "bi-copy");
    agregar("Enlace activo", duplicadosRuntime.activeLinks === 1 ? "ok" : "warn", `Se detectaron ${duplicadosRuntime.activeLinks} opciones activas en el menú actual.`, "bi-cursor-fill");
    $("modulosGrid").innerHTML = arquitectura.map(x => `<div class="module-item"><span>${x.nombre}</span><span class="status ${x.ok ? "ok" : "bad"}">${x.ok ? "Modular" : x.motivo}</span></div>`).join("") + `<div class="module-item module-coverage"><strong>Cobertura total</strong><span class="status ${cobertura === 100 ? "ok" : "warn"}">${cobertura}%</span></div>`;
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
