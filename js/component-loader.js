(() => {
  "use strict";

  const VERSION = "4.4.1";
  const subtitulos = {
    "dashboard.html":"Panel ejecutivo","notificaciones.html":"Centro de alertas","actividad.html":"Bitácora inteligente",
    "ventas.html":"Punto de venta","caja.html":"Caja diaria y cortes","apartados.html":"Gestión de apartados","devoluciones.html":"Control de devoluciones",
    "admin.html":"Administración de inventario","compras.html":"Control de compras","kardex.html":"Kardex profesional","gastos.html":"Gastos y flujo",
    "clientes.html":"Gestión de clientes","cuentas-cobrar.html":"Cuentas por cobrar","reportes.html":"Análisis y reportes",
    "configuracion.html":"Configuración","diagnostico.html":"Diagnóstico del sistema","migracion.html":"Migración a SQLite","usuarios.html":"Usuarios y permisos"
  };

  const paginaActual = () => location.pathname.split("/").pop() || "dashboard.html";

  function aplicarPermisos(mount) {
    const usuario = window.PSAuth?.usuarioActual?.();
    if (!usuario) return;
    mount.querySelectorAll("a[data-module]").forEach(enlace => {
      enlace.classList.toggle("ps-auth-hidden", !window.PSAuth.puede(enlace.dataset.module, usuario));
    });
  }

  function enlazarMenuMovil(mount) {
    const sidebar = mount.querySelector("#sidebar");
    const backdrop = mount.querySelector("#sidebarBackdrop");
    const abrir = document.getElementById("btnAbrirSidebar") || document.getElementById("menu") || document.getElementById("psModuleMenu");
    const cerrar = mount.querySelector("#btnCerrarSidebar");
    const close = () => { sidebar?.classList.remove("open"); backdrop?.classList.remove("show"); };
    abrir?.addEventListener("click", () => { sidebar?.classList.add("open"); backdrop?.classList.add("show"); });
    cerrar?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);
    mount.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
  }

  function prepararCascaron() {
    document.body?.classList.add("ps-app");
    const main = document.querySelector("main");
    main?.classList.add("ps-module-content");
  }

  function configurarSidebar(mount) {
    prepararCascaron();
    const pagina = paginaActual();
    mount.querySelectorAll(".sidebar-nav .nav-link").forEach(a => a.classList.toggle("active", a.getAttribute("href") === pagina));
    const subtitulo = mount.querySelector("#psSidebarSubtitle");
    if (subtitulo) subtitulo.textContent = subtitulos[pagina] || "Sistema comercial";
    aplicarPermisos(mount);
    enlazarMenuMovil(mount);
    mount.dataset.loaded = "true";
    mount.dataset.source = "components/sidebar.html";
    mount.dataset.componentVersion = VERSION;
    document.documentElement.dataset.psComponents = VERSION;
    document.dispatchEvent(new CustomEvent("ps:sidebar-ready", { detail: { pagina, version: VERSION, source: "components/sidebar.html" } }));
  }

  function cargarSincrono(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send(null);
    if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText)) return xhr.responseText;
    throw new Error(`No se pudo cargar ${url} (${xhr.status})`);
  }

  function loadSidebar(mountId = "psSidebarMount") {
    const mount = document.getElementById(mountId);
    if (!mount || mount.dataset.loaded === "true") return;
    try {
      mount.innerHTML = cargarSincrono(`components/sidebar.html?v=${VERSION}`);
      configurarSidebar(mount);
    } catch (error) {
      console.error("PS Deals: error al cargar el sidebar", error);
      mount.innerHTML = '<div class="ps-component-error">No fue posible cargar el menú. Abre el proyecto con Live Server.</div>';
      mount.dataset.loaded = "error";
    }
  }

  function detectarDuplicados() {
    return {
      sidebars: document.querySelectorAll("#sidebar").length,
      mounts: document.querySelectorAll("#psSidebarMount").length,
      activeLinks: document.querySelectorAll("#psSidebarMount .nav-link.active").length
    };
  }

  window.PSComponents = { version: VERSION, loadSidebar, paginaActual, detectarDuplicados, aplicarPermisos, prepararCascaron };
})();
