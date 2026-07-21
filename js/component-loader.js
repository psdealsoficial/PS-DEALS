(() => {
  "use strict";

  const subtitulos = {
    "dashboard.html": "Panel ejecutivo",
    "notificaciones.html": "Centro de alertas",
    "actividad.html": "Bitácora inteligente",
    "ventas.html": "Punto de venta",
    "apartados.html": "Gestión de apartados",
    "devoluciones.html": "Control de devoluciones",
    "admin.html": "Administración",
    "compras.html": "Control de compras",
    "gastos.html": "Gastos y flujo",
    "clientes.html": "Gestión de clientes",
    "cuentas-cobrar.html": "Cuentas por cobrar",
    "reportes.html": "Análisis y reportes",
    "configuracion.html": "Configuración",
    "diagnostico.html": "Diagnóstico del sistema",
    "usuarios.html": "Usuarios y permisos"
  };

  function paginaActual() {
    return location.pathname.split("/").pop() || "dashboard.html";
  }

  function configurarSidebar(mount) {
    const pagina = paginaActual();
    const enlaceActivo = mount.querySelector(`a[href="${pagina}"]`);
    mount.querySelectorAll(".sidebar-nav .nav-link").forEach(a => a.classList.remove("active"));
    enlaceActivo?.classList.add("active");

    const subtitulo = mount.querySelector("#psSidebarSubtitle");
    if (subtitulo) subtitulo.textContent = subtitulos[pagina] || "Sistema comercial";

    // Auth se carga antes que el componente. Reaplicamos permisos al insertar el menú.
    const usuario = window.PSAuth?.usuarioActual?.();
    if (usuario) {
      mount.querySelectorAll("a[data-module]").forEach(enlace => {
        if (!window.PSAuth.puede(enlace.dataset.module, usuario)) {
          enlace.classList.add("ps-auth-hidden");
        }
      });
    }

    document.dispatchEvent(new CustomEvent("ps:sidebar-ready", { detail: { pagina } }));
  }

  function cargarSincrono(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) return xhr.responseText;
    throw new Error(`No se pudo cargar ${url} (${xhr.status})`);
  }

  function loadSidebar(mountId = "psSidebarMount") {
    const mount = document.getElementById(mountId);
    if (!mount || mount.dataset.loaded === "true") return;
    try {
      mount.innerHTML = cargarSincrono("components/sidebar.html");
      mount.dataset.loaded = "true";
      configurarSidebar(mount);
    } catch (error) {
      console.error("PS Deals: error al cargar el sidebar", error);
      mount.innerHTML = `<div class="alert alert-danger m-3">No fue posible cargar el menú. Abre el proyecto con Live Server.</div>`;
    }
  }

  window.PSComponents = { loadSidebar, paginaActual };
})();
