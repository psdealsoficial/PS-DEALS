
(() => {
  "use strict";

  const K_USUARIOS = "psdeals_usuarios";
  const K_SESION = "psdeals_sesion";
  const K_BITACORA = "psdeals_bitacora";

  const MODULOS = {
    "dashboard.html": "dashboard",
    "notificaciones.html": "notificaciones",
    "actividad.html": "actividad",
    "ventas.html": "ventas",
    "apartados.html": "apartados",
    "devoluciones.html": "devoluciones",
    "admin.html": "inventario",
    "compras.html": "compras",
    "gastos.html": "gastos",
    "clientes.html": "clientes",
    "cuentas-cobrar.html": "cobrar",
    "reportes.html": "reportes",
    "configuracion.html": "configuracion",
    "diagnostico.html": "diagnostico",
    "usuarios.html": "usuarios"
  };

  const ROLES = {
    Administrador: [
      "dashboard","notificaciones","actividad","ventas","apartados","devoluciones","inventario","compras",
      "gastos","clientes","cobrar","reportes","configuracion","diagnostico","usuarios"
    ],
    Supervisor: [
      "dashboard","notificaciones","actividad","ventas","apartados","devoluciones","inventario","compras",
      "gastos","clientes","cobrar","reportes"
    ],
    Cajero: ["dashboard","notificaciones","actividad","ventas","apartados","devoluciones","clientes","cobrar"],
    Vendedor: ["dashboard","notificaciones","actividad","ventas","apartados","clientes"],
    Almacen: ["dashboard","notificaciones","actividad","inventario","compras"]
  };

  function leer(clave, respaldo) {
    try {
      const valor = JSON.parse(localStorage.getItem(clave));
      return valor ?? respaldo;
    } catch {
      return respaldo;
    }
  }

  function guardar(clave, valor) {
    localStorage.setItem(clave, JSON.stringify(valor));
  }

  function hashSimple(texto) {
    let hash = 2166136261;
    const entrada = String(texto ?? "");
    for (let i = 0; i < entrada.length; i++) {
      hash ^= entrada.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function asegurarAdministrador() {
    const usuarios = leer(K_USUARIOS, []);
    if (usuarios.length) return usuarios;

    const inicial = [{
      id: Date.now(),
      nombre: "Administrador",
      usuario: "admin",
      passwordHash: hashSimple("1234"),
      rol: "Administrador",
      permisos: [...ROLES.Administrador],
      activo: true,
      creado: new Date().toISOString(),
      ultimoAcceso: null
    }];

    guardar(K_USUARIOS, inicial);
    return inicial;
  }

  function sesion() {
    return leer(K_SESION, null);
  }

  function usuarioActual() {
    const actual = sesion();
    if (!actual) return null;
    return asegurarAdministrador().find(u => Number(u.id) === Number(actual.usuarioId) && u.activo) || null;
  }

  function permisosUsuario(usuario) {
    if (!usuario) return [];
    if (Array.isArray(usuario.permisos) && usuario.permisos.length) return usuario.permisos;
    return ROLES[usuario.rol] || [];
  }

  function puede(modulo, usuario = usuarioActual()) {
    return permisosUsuario(usuario).includes(modulo);
  }

  function registrar(accion, detalle = "") {
    const usuario = usuarioActual();
    const bitacora = leer(K_BITACORA, []);
    bitacora.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      fecha: new Date().toISOString(),
      usuarioId: usuario?.id || null,
      usuario: usuario?.nombre || "Sistema",
      accion,
      detalle
    });
    guardar(K_BITACORA, bitacora.slice(-2500));
  }

  function iniciarSesion(nombreUsuario, password) {
    const usuarios = asegurarAdministrador();
    const normalizado = String(nombreUsuario || "").trim().toLowerCase();
    const encontrado = usuarios.find(u =>
      String(u.usuario || "").toLowerCase() === normalizado &&
      u.passwordHash === hashSimple(password)
    );

    if (!encontrado) {
      const bitacora = leer(K_BITACORA, []);
      bitacora.push({
        id: Date.now(),
        fecha: new Date().toISOString(),
        usuarioId: null,
        usuario: normalizado || "Desconocido",
        accion: "Inicio de sesión fallido",
        detalle: "Credenciales incorrectas"
      });
      guardar(K_BITACORA, bitacora.slice(-2500));
      return { ok: false, mensaje: "Usuario o contraseña incorrectos." };
    }

    if (!encontrado.activo) {
      return { ok: false, mensaje: "Este usuario está desactivado." };
    }

    guardar(K_SESION, {
      usuarioId: encontrado.id,
      inicio: new Date().toISOString()
    });

    encontrado.ultimoAcceso = new Date().toISOString();
    guardar(K_USUARIOS, usuarios);
    registrar("Inicio de sesión", "Acceso al sistema");
    return { ok: true, usuario: encontrado };
  }

  function cerrarSesion() {
    registrar("Cierre de sesión", "Salida del sistema");
    localStorage.removeItem(K_SESION);
    location.href = "login.html";
  }

  function paginaActual() {
    return location.pathname.split("/").pop() || "dashboard.html";
  }

  function filtrarNavegacion(usuario) {
    document.querySelectorAll('a[href]').forEach(enlace => {
      const href = enlace.getAttribute("href")?.split("?")[0];
      const modulo = MODULOS[href];
      if (modulo && !puede(modulo, usuario)) {
        enlace.classList.add("ps-auth-hidden");
      }
    });
  }

  function agregarSesionUI(usuario) {
    if (document.getElementById("psAuthSession")) return;

    const contenedor = document.createElement("div");
    contenedor.id = "psAuthSession";
    contenedor.innerHTML = `
      <button type="button" class="ps-auth-user" aria-label="Opciones de sesión">
        <span class="ps-auth-avatar">${String(usuario.nombre || "U").trim().charAt(0).toUpperCase()}</span>
        <span class="ps-auth-info">
          <strong>${escapeHTML(usuario.nombre)}</strong>
          <small>${escapeHTML(usuario.rol)}</small>
        </span>
        <i class="bi bi-box-arrow-right"></i>
      </button>
    `;
    document.body.appendChild(contenedor);
    contenedor.querySelector("button").addEventListener("click", () => {
      if (confirm(`¿Cerrar la sesión de ${usuario.nombre}?`)) cerrarSesion();
    });

    const estilo = document.createElement("style");
    estilo.textContent = `
      .ps-auth-hidden{display:none!important}
      #psAuthSession{position:fixed;right:18px;bottom:18px;z-index:1080}
      .ps-auth-user{display:flex;align-items:center;gap:10px;min-width:190px;padding:10px 13px;border:1px solid #e5e7eb;border-radius:15px;background:#fff;box-shadow:0 14px 35px rgba(15,23,42,.14);color:#111827;text-align:left}
      .ps-auth-avatar{display:grid;width:36px;height:36px;place-items:center;border-radius:12px;background:#111827;color:#fff;font-weight:700}
      .ps-auth-info{flex:1}
      .ps-auth-info strong,.ps-auth-info small{display:block}
      .ps-auth-info strong{font-size:11px}
      .ps-auth-info small{font-size:9px;color:#6b7280}
      .ps-auth-user i{color:#dc2626}
      @media(max-width:700px){.ps-auth-info{display:none}.ps-auth-user{min-width:0}}
    `;
    document.head.appendChild(estilo);
  }

  function escapeHTML(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  function migrarPermisosV34() {
    const clave = "psdeals_migracion_v34";
    if (localStorage.getItem(clave) === "ok") return;
    const usuarios = asegurarAdministrador();
    let cambio = false;
    usuarios.forEach(usuario => {
      const predeterminados = ROLES[usuario.rol] || [];
      if (predeterminados.includes("actividad")) {
        if (!Array.isArray(usuario.permisos)) usuario.permisos = [];
        if (!usuario.permisos.includes("actividad")) {
          usuario.permisos.push("actividad");
          cambio = true;
        }
      }
    });
    if (cambio) guardar(K_USUARIOS, usuarios);
    localStorage.setItem(clave, "ok");
  }

  function migrarPermisosV361() {
    const clave = "psdeals_migracion_v361";
    if (localStorage.getItem(clave) === "ok") return;
    const usuarios = asegurarAdministrador();
    let cambio = false;
    usuarios.forEach(usuario => {
      if (usuario.rol === "Administrador") {
        if (!Array.isArray(usuario.permisos)) usuario.permisos = [];
        if (!usuario.permisos.includes("diagnostico")) { usuario.permisos.push("diagnostico"); cambio = true; }
      }
    });
    if (cambio) guardar(K_USUARIOS, usuarios);
    localStorage.setItem(clave, "ok");
  }

  function activarRegistroAutomatico() {
    if (window.__psRegistroStorageActivo) return;
    window.__psRegistroStorageActivo = true;
    const original = Storage.prototype.setItem;
    const ignorar = new Set([K_BITACORA, K_SESION, "psdeals_notificaciones_leidas", "psdeals_migracion_v34"]);
    const etiquetas = {
      psdeals_productos: "Inventario actualizado",
      psdeals_ventas: "Ventas actualizadas",
      psdeals_clientes: "Clientes actualizados",
      psdeals_compras: "Compras actualizadas",
      psdeals_gastos: "Gastos actualizados",
      psdeals_cuentas_cobrar: "Cobranza actualizada",
      psdeals_apartados: "Apartados actualizados",
      psdeals_devoluciones: "Devoluciones actualizadas",
      psdeals_configuracion: "Configuración actualizada"
    };
    Storage.prototype.setItem = function(clave, valor) {
      const anterior = this.getItem(clave);
      original.call(this, clave, valor);
      if (this !== localStorage || ignorar.has(clave) || anterior === valor || !etiquetas[clave]) return;
      let detalle = "Datos guardados";
      try {
        const antes = JSON.parse(anterior || "null");
        const despues = JSON.parse(valor || "null");
        if (Array.isArray(despues)) {
          const prev = Array.isArray(antes) ? antes.length : 0;
          detalle = `${despues.length} registros (${despues.length - prev >= 0 ? "+" : ""}${despues.length - prev})`;
        }
      } catch {}
      const usuario = usuarioActual();
      const bitacora = leer(K_BITACORA, []);
      bitacora.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        fecha: new Date().toISOString(),
        usuarioId: usuario?.id || null,
        usuario: usuario?.nombre || "Sistema",
        accion: etiquetas[clave],
        detalle
      });
      original.call(localStorage, K_BITACORA, JSON.stringify(bitacora.slice(-2500)));
    };
  }

  function protegerPagina() {
    asegurarAdministrador();
    const pagina = paginaActual();

    if (pagina === "login.html" || pagina === "index.html" || pagina === "") return;

    const usuario = usuarioActual();
    if (!usuario) {
      sessionStorage.setItem("psdeals_destino", pagina);
      location.href = "login.html";
      return;
    }

    const modulo = MODULOS[pagina];
    if (modulo && !puede(modulo, usuario)) {
      document.documentElement.innerHTML = `
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Acceso restringido | PS Deals</title>
          <style>
            body{font-family:Arial,sans-serif;background:#f3f4f6;display:grid;min-height:100vh;place-items:center;margin:0;color:#111827}
            .card{max-width:480px;padding:36px;border-radius:20px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.12);text-align:center}
            a,button{display:inline-block;margin:8px;padding:12px 18px;border:0;border-radius:10px;background:#111827;color:#fff;text-decoration:none;cursor:pointer}
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Acceso restringido</h1>
            <p>Tu usuario no tiene permiso para abrir este módulo.</p>
            <a href="dashboard.html">Regresar al dashboard</a>
            <button id="salir">Cerrar sesión</button>
          </div>
        </body>`;
      document.getElementById("salir").onclick = cerrarSesion;
      return;
    }

    document.addEventListener("DOMContentLoaded", () => {
      filtrarNavegacion(usuario);
      agregarSesionUI(usuario);
    });
  }

  window.PSAuth = {
    K_USUARIOS, K_SESION, K_BITACORA, MODULOS, ROLES,
    leer, guardar, hashSimple, asegurarAdministrador, sesion,
    usuarioActual, permisosUsuario, puede, registrar,
    iniciarSesion, cerrarSesion, escapeHTML
  };

  migrarPermisosV34();
  migrarPermisosV361();
  activarRegistroAutomatico();
  protegerPagina();
})();
