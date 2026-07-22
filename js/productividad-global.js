(() => {
  "use strict";
  if (window.__PSProductividadV39) return;
  window.__PSProductividadV39 = true;

  const VERSION = "3.9.1";
  const KEY_FAVORITOS_LEGACY = "psdeals_favoritos";
  const leer = (k, d = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const guardar = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const pagina = () => location.pathname.split("/").pop() || "dashboard.html";
  const usuarioActual = () => window.PSAuth?.usuarioActual?.() || leer("psdeals_sesion", null);
  const identidadUsuario = () => {
    const u = usuarioActual();
    return String(u?.usuario || u?.username || u?.id || u?.nombre || "local").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  };
  const claveFavoritos = () => `psdeals_favoritos_${identidadUsuario()}`;
  function favoritosGuardados() {
    const key = claveFavoritos();
    let valores = leer(key, null);
    if (!Array.isArray(valores)) {
      const legacy = leer(KEY_FAVORITOS_LEGACY, []);
      valores = Array.isArray(legacy) ? legacy : [];
      guardar(key, valores);
    }
    return [...new Set(valores.filter(v => typeof v === "string"))];
  }
  function guardarFavoritos(valores) { guardar(claveFavoritos(), [...new Set(valores)]); }

  const MODULOS = [
    { nombre:"Dashboard", href:"dashboard.html", icono:"bi-grid-1x2-fill", palabras:"inicio resumen indicadores panel" },
    { nombre:"Notificaciones", href:"notificaciones.html", icono:"bi-bell-fill", palabras:"alertas avisos" },
    { nombre:"Actividad", href:"actividad.html", icono:"bi-clock-history", palabras:"bitácora historial auditoría" },
    { nombre:"Caja y ventas", href:"ventas.html", icono:"bi-cart-check-fill", palabras:"pos cobrar ticket nueva venta" },
    { nombre:"Apartados", href:"apartados.html", icono:"bi-bookmark-check-fill", palabras:"reservas abonos" },
    { nombre:"Devoluciones", href:"devoluciones.html", icono:"bi-arrow-counterclockwise", palabras:"cancelar regresar" },
    { nombre:"Inventario", href:"admin.html", icono:"bi-box-seam-fill", palabras:"productos stock sku código barras" },
    { nombre:"Compras", href:"compras.html", icono:"bi-bag-check-fill", palabras:"proveedores entradas" },
    { nombre:"Gastos y caja", href:"gastos.html", icono:"bi-wallet-fill", palabras:"egresos flujo" },
    { nombre:"Clientes", href:"clientes.html", icono:"bi-people-fill", palabras:"contactos teléfono correo" },
    { nombre:"Cuentas por cobrar", href:"cuentas-cobrar.html", icono:"bi-credit-card-2-front-fill", palabras:"deudas crédito pagos vencidos" },
    { nombre:"Reportes", href:"reportes.html", icono:"bi-bar-chart-fill", palabras:"estadísticas análisis exportar" },
    { nombre:"Configuración", href:"configuracion.html", icono:"bi-gear-fill", palabras:"respaldo importar exportar negocio" },
    { nombre:"Diagnóstico", href:"diagnostico.html", icono:"bi-tools", palabras:"pruebas sistema estado" },
    { nombre:"Usuarios", href:"usuarios.html", icono:"bi-person-lock", palabras:"permisos acceso roles" },
    { nombre:"Tienda", href:"index.html", icono:"bi-shop", palabras:"catálogo público" }
  ];

  const ACCIONES = [
    { nombre:"Nueva venta", detalle:"Abrir caja y comenzar una venta", href:"ventas.html", icono:"bi-cart-plus-fill", palabras:"vender cobrar pos" },
    { nombre:"Nuevo producto", detalle:"Registrar un artículo en inventario", href:"admin.html?accion=nuevo", icono:"bi-box-seam", palabras:"alta inventario sku" },
    { nombre:"Nuevo cliente", detalle:"Registrar un cliente", href:"clientes.html?accion=nuevo", icono:"bi-person-plus-fill", palabras:"alta contacto" },
    { nombre:"Registrar gasto", detalle:"Agregar un egreso de caja", href:"gastos.html?accion=nuevo", icono:"bi-cash-stack", palabras:"egreso caja" },
    { nombre:"Crear respaldo", detalle:"Abrir configuración y respaldos", href:"configuracion.html#respaldos", icono:"bi-cloud-arrow-down-fill", palabras:"backup copia seguridad" },
    { nombre:"Ejecutar diagnóstico", detalle:"Comprobar el estado del sistema", href:"diagnostico.html", icono:"bi-activity", palabras:"probar revisar" }
  ];

  const AYUDA = {
    "dashboard.html": ["Revisa prioridades, ventas, flujo e inventario.", "Ctrl + K abre el centro de comandos.", "Usa Diagnóstico para comprobar el sistema."],
    "ventas.html": ["Busca productos por nombre, SKU o código de barras.", "F2 abre Ventas desde cualquier módulo.", "Verifica el total antes de confirmar el cobro."],
    "admin.html": ["Mantén SKU y código de barras únicos.", "Usa Duplicar para artículos similares.", "Revisa periódicamente el stock mínimo."],
    "clientes.html": ["Registra teléfono o correo para localizar al cliente.", "F4 abre Clientes desde cualquier módulo.", "La búsqueda global también localiza clientes."],
    "configuracion.html": ["Haz un respaldo antes de importar o reemplazar datos.", "Los CSV pueden abrirse en Excel o LibreOffice.", "Conserva una copia JSON fuera del navegador."],
    "diagnostico.html": ["Ejecuta las pruebas después de cada actualización.", "Copia el registro técnico cuando reportes un problema.", "La cobertura modular debe mantenerse al 100 %."],
  };

  function toast(mensaje, tipo="success", titulo="PS Deals") {
    let zona = document.querySelector(".ps-toast-zone");
    if (!zona) { zona = document.createElement("div"); zona.className = "ps-toast-zone"; document.body.appendChild(zona); }
    const iconos = {success:"bi-check-circle-fill", warning:"bi-exclamation-triangle-fill", danger:"bi-x-circle-fill", info:"bi-info-circle-fill"};
    const item = document.createElement("div"); item.className = `ps-toast ${tipo}`;
    item.innerHTML = `<i class="bi ${iconos[tipo] || iconos.info}"></i><div><strong>${esc(titulo)}</strong><small>${esc(mensaje)}</small></div>`;
    zona.appendChild(item);
    setTimeout(() => { item.style.opacity = "0"; item.style.transform = "translateY(-6px)"; setTimeout(() => item.remove(), 220); }, 3500);
  }
  window.PSToast = toast;

  function permitidos() {
    const enlaces = [...document.querySelectorAll('#psSidebarMount a[data-module]')].filter(a => !a.classList.contains("ps-auth-hidden"));
    return new Set(enlaces.map(a => a.getAttribute("href")));
  }

  function buscar(q) {
    const t = q.trim().toLowerCase();
    const disponibles = permitidos();
    const coincide = (...valores) => valores.join(" ").toLowerCase().includes(t);
    const modulos = MODULOS.filter(m => (!disponibles.size || disponibles.has(m.href) || m.href === "index.html") && (!t || coincide(m.nombre, m.href, m.palabras)))
      .map(m => ({ grupo:"Módulos", titulo:m.nombre, detalle:m.href, href:m.href, icono:m.icono, favorito:true }));
    const acciones = ACCIONES.filter(a => !t || coincide(a.nombre, a.detalle, a.palabras))
      .map(a => ({ grupo:"Acciones rápidas", titulo:a.nombre, detalle:a.detalle, href:a.href, icono:a.icono }));
    if (!t) return [...acciones.slice(0, 6), ...modulos.filter(m => leer(KEY_FAVORITOS, []).includes(m.href)).slice(0, 6)];
    const productos = leer("psdeals_productos", []).filter(p => [p.nombre,p.sku,p.codigoBarras,p.codigo,p.categoria,p.proveedor,p.descripcion].some(v => String(v||"").toLowerCase().includes(t))).slice(0,8)
      .map(p => ({ grupo:"Productos", titulo:p.nombre, detalle:`${p.sku || p.codigoBarras || "Sin código"} · Stock ${Number(p.stock || 0)}`, href:`admin.html?buscar=${encodeURIComponent(p.sku || p.codigoBarras || p.nombre)}`, icono:"bi-box-seam" }));
    const clientes = leer("psdeals_clientes", []).filter(c => [c.nombre,c.telefono,c.email,c.direccion].some(v => String(v||"").toLowerCase().includes(t))).slice(0,8)
      .map(c => ({ grupo:"Clientes", titulo:c.nombre, detalle:c.telefono || c.email || "Cliente registrado", href:`clientes.html?buscar=${encodeURIComponent(c.nombre)}`, icono:"bi-person" }));
    return [...acciones, ...modulos, ...productos, ...clientes].slice(0,24);
  }

  function centroComandos() {
    if (pagina() === "login.html") return;
    const boton = document.createElement("button");
    boton.className = "ps-global-trigger"; boton.type = "button"; boton.title = "Centro de comandos (Ctrl+K)";
    boton.innerHTML = '<i class="bi bi-command"></i>';
    document.body.appendChild(boton);

    const capa = document.createElement("div"); capa.className = "ps-search-backdrop";
    capa.innerHTML = `<div class="ps-search-panel" role="dialog" aria-modal="true" aria-label="Centro de comandos">
      <div class="ps-command-title"><div><strong>Centro de comandos</strong><small>PS Deals v${VERSION}</small></div><button class="ps-search-close" type="button">ESC</button></div>
      <div class="ps-search-head"><i class="bi bi-search"></i><input class="ps-search-input" placeholder="Buscar o ejecutar una acción…" autocomplete="off"></div>
      <div class="ps-command-tabs"><button class="active" data-filter="todo">Todo</button><button data-filter="Acciones rápidas">Acciones</button><button data-filter="Módulos">Módulos</button><button data-filter="Productos">Productos</button><button data-filter="Clientes">Clientes</button></div>
      <div class="ps-search-results"></div>
      <div class="ps-shortcuts"><span><kbd>Ctrl</kbd> + <kbd>K</kbd> abrir</span><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>★</kbd> favorito</span></div>
    </div>`;
    document.body.appendChild(capa);
    const input = capa.querySelector("input"), cont = capa.querySelector(".ps-search-results");
    let lista = [], activo = 0, filtro = "todo";

    const cerrar = () => { capa.classList.remove("is-open"); input.value = ""; filtro = "todo"; capa.querySelectorAll(".ps-command-tabs button").forEach((b,i)=>b.classList.toggle("active", i===0)); };
    const abrir = () => { capa.classList.add("is-open"); pintar(); setTimeout(() => input.focus(), 20); };
    function favoritos() { return favoritosGuardados(); }
    function alternarFavorito(href) {
      const f = favoritos(); const i = f.indexOf(href);
      if (i >= 0) f.splice(i,1); else f.push(href);
      guardarFavoritos(f); pintar(); renderFavoritosSidebar();
      toast(i >= 0 ? "Se quitó de favoritos" : "Se agregó a favoritos", "info", "Favoritos");
    }
    function pintar() {
      lista = buscar(input.value).filter(r => filtro === "todo" || r.grupo === filtro); activo = 0;
      if (!lista.length) { cont.innerHTML = '<div class="ps-search-empty">No encontramos coincidencias.</div>'; return; }
      let grupo = ""; const favs = favoritos();
      cont.innerHTML = lista.map((r,i) => {
        const cab = r.grupo !== grupo ? `<div class="ps-search-group">${grupo = r.grupo}</div>` : "";
        const estrella = r.favorito ? `<button class="ps-command-fav ${favs.includes(r.href)?"is-fav":""}" data-fav="${esc(r.href)}" title="Favorito"><i class="bi ${favs.includes(r.href)?"bi-star-fill":"bi-star"}"></i></button>` : "";
        return `${cab}<div class="ps-search-item ${i===0?"is-active":""}" data-i="${i}"><a href="${r.href}"><span class="ps-search-icon"><i class="bi ${r.icono}"></i></span><span class="ps-search-copy"><strong>${esc(r.titulo)}</strong><small>${esc(r.detalle)}</small></span></a>${estrella}<i class="bi bi-arrow-return-left ps-enter-icon"></i></div>`;
      }).join("");
    }
    function marcar() { cont.querySelectorAll(".ps-search-item").forEach((e,i)=>e.classList.toggle("is-active",i===activo)); cont.querySelector(`[data-i="${activo}"]`)?.scrollIntoView({block:"nearest"}); }
    input.addEventListener("input", pintar); boton.addEventListener("click", abrir); capa.querySelector(".ps-search-close").addEventListener("click", cerrar);
    capa.addEventListener("click", e => {
      if (e.target === capa) cerrar();
      const fav = e.target.closest("[data-fav]"); if (fav) { e.preventDefault(); e.stopPropagation(); alternarFavorito(fav.dataset.fav); }
      const item = e.target.closest(".ps-search-item"); if (item && !fav) location.href = lista[Number(item.dataset.i)]?.href;
    });
    capa.querySelectorAll(".ps-command-tabs button").forEach(b => b.addEventListener("click", () => { filtro = b.dataset.filter; capa.querySelectorAll(".ps-command-tabs button").forEach(x=>x.classList.toggle("active",x===b)); pintar(); }));
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrir(); return; }
      if (!capa.classList.contains("is-open")) return;
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowDown") { e.preventDefault(); activo = Math.min(activo+1, lista.length-1); marcar(); }
      if (e.key === "ArrowUp") { e.preventDefault(); activo = Math.max(activo-1, 0); marcar(); }
      if (e.key === "Enter" && lista[activo]) location.href = lista[activo].href;
    });
  }

  function renderFavoritosSidebar() {
    const nav = document.querySelector("#psSidebarMount .sidebar-nav"); if (!nav) return;
    nav.querySelector(".ps-sidebar-favorites")?.remove();
    const favs = favoritosGuardados(); if (!favs.length) return;
    const mods = favs.map(h => MODULOS.find(m => m.href === h)).filter(Boolean);
    if (!mods.length) return;
    const bloque = document.createElement("div"); bloque.className = "ps-sidebar-favorites";
    bloque.innerHTML = `<span class="sidebar-label">Favoritos</span>${mods.map(m=>`<a href="${m.href}" class="nav-link ${pagina()===m.href?"active":""}"><i class="bi ${m.icono}"></i><span>${esc(m.nombre)}</span><i class="bi bi-star-fill ps-fav-mini"></i></a>`).join("")}`;
    nav.prepend(bloque);
  }

  function ayudaContextual() {
    if (pagina() === "login.html") return;
    const boton = document.createElement("button"); boton.className = "ps-help-trigger"; boton.type = "button"; boton.title = "Ayuda de esta pantalla"; boton.innerHTML = '<i class="bi bi-question-lg"></i>'; document.body.appendChild(boton);
    const modal = document.createElement("div"); modal.className = "ps-help-backdrop";
    const modulo = MODULOS.find(m=>m.href===pagina())?.nombre || "PS Deals";
    const tips = AYUDA[pagina()] || ["Usa Ctrl + K para buscar módulos, productos, clientes o ejecutar acciones.", "Marca módulos como favoritos desde el Centro de comandos.", "Antes de operaciones importantes, crea un respaldo JSON."];
    modal.innerHTML = `<section class="ps-help-panel"><header><div><small>Ayuda contextual</small><h2>${esc(modulo)}</h2></div><button type="button" class="ps-help-close"><i class="bi bi-x-lg"></i></button></header><div class="ps-help-body">${tips.map((t,i)=>`<article><span>${i+1}</span><p>${esc(t)}</p></article>`).join("")}<div class="ps-help-shortcuts"><strong>Atajos útiles</strong><p><kbd>Ctrl</kbd> + <kbd>K</kbd> comandos · <kbd>F2</kbd> ventas · <kbd>F4</kbd> clientes · <kbd>F9</kbd> reportes</p></div></div></section>`;
    document.body.appendChild(modal);
    const cerrar=()=>modal.classList.remove("is-open"); boton.addEventListener("click",()=>modal.classList.add("is-open")); modal.querySelector(".ps-help-close").addEventListener("click",cerrar); modal.addEventListener("click",e=>{if(e.target===modal)cerrar()}); document.addEventListener("keydown",e=>{if(e.key==="Escape")cerrar()});
  }

  function atajos() {
    document.addEventListener("keydown", e => {
      if (e.ctrlKey || e.altKey || e.metaKey || ["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
      const mapa = {F2:"ventas.html", F4:"clientes.html", F7:"compras.html", F8:"gastos.html", F9:"reportes.html"};
      if (mapa[e.key]) { e.preventDefault(); location.href = mapa[e.key]; }
      if (e.key === "F3") { e.preventDefault(); document.querySelector("#buscarProducto,#buscarAdmin,#buscarCliente,#buscarClientes,#buscar")?.focus(); }
    });
  }

  function cambiosPendientes() {
    const formularios = [...document.querySelectorAll("form")].filter(f => !f.closest(".ps-search-panel") && f.id !== "formLogin"); if (!formularios.length) return;
    let sucio = false; const badge = document.createElement("div"); badge.className = "ps-dirty-badge"; badge.innerHTML = '<i class="bi bi-pencil-fill"></i> Cambios sin guardar'; document.body.appendChild(badge);
    const marcar = e => { if (e.target.matches('input[type="search"]')) return; sucio = true; badge.classList.add("is-visible"); };
    formularios.forEach(f => { f.addEventListener("input", marcar); f.addEventListener("change", marcar); f.addEventListener("submit",()=>setTimeout(()=>{sucio=false;badge.classList.remove("is-visible")},100)); f.addEventListener("reset",()=>{sucio=false;badge.classList.remove("is-visible")}); });
    window.addEventListener("beforeunload", e => { if (!sucio) return; e.preventDefault(); e.returnValue = ""; });
    window.PSMarcarGuardado = () => { sucio=false; badge.classList.remove("is-visible"); };
  }

  function aplicarBusquedaURL() {
    const p = new URLSearchParams(location.search), q = p.get("buscar"), accion = p.get("accion");
    if (q) { const campo = document.querySelector("#buscarAdmin,#buscarCliente,#buscarClientes,#buscarProducto,#buscar"); if (campo) { campo.value=q; campo.dispatchEvent(new Event("input",{bubbles:true})); setTimeout(()=>campo.focus(),100); } }
    if (accion === "nuevo") setTimeout(() => document.querySelector('[data-action="nuevo"],#btnNuevo,#btnNuevoProducto,#btnNuevoCliente,#btnAgregarGasto')?.click(), 250);
  }

  function iniciar() {
    centroComandos(); atajos(); cambiosPendientes(); aplicarBusquedaURL(); ayudaContextual();
    document.addEventListener("ps:sidebar-ready", renderFavoritosSidebar);
    renderFavoritosSidebar();
    setTimeout(renderFavoritosSidebar, 50);
    setTimeout(renderFavoritosSidebar, 300);
    document.documentElement.dataset.psUx = VERSION;
    window.PSProductividad = Object.freeze({
      version: VERSION,
      claveFavoritos,
      favoritos: favoritosGuardados,
      renderFavoritosSidebar,
      tieneCentroComandos: () => !!document.querySelector(".ps-search-panel"),
      tieneAyuda: () => !!document.querySelector(".ps-help-trigger")
    });
    document.dispatchEvent(new CustomEvent("ps:productividad-ready", { detail: { version: VERSION } }));
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", iniciar) : iniciar();
})();
