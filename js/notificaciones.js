(() => {
"use strict";
const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
let filtro = "todas";
let texto = "";

function claseIcono(tipo) {
  return { critica:"danger", advertencia:"warning", informativa:"info", oportunidad:"success" }[tipo] || "info";
}

function render() {
  const todas = PSNotificaciones.obtener();
  let lista = todas.filter(n => {
    if (filtro === "no-leidas" && n.leida) return false;
    if (["critica","advertencia","informativa","oportunidad"].includes(filtro) && n.tipo !== filtro) return false;
    if (texto) {
      const contenido = `${n.titulo} ${n.detalle} ${n.categoria} ${n.entidad || ""}`.toLowerCase();
      if (!contenido.includes(texto)) return false;
    }
    return true;
  });

  const pendientes = todas.filter(n=>!n.leida);
  $("totalPendientes").textContent = pendientes.length;
  $("badgeMenu").textContent = pendientes.length;
  $("resumenPendientes").textContent = pendientes.length ? `${pendientes.filter(n=>n.tipo==="critica").length} críticas requieren atención` : "Sin alertas pendientes";
  $("totalCriticas").textContent = todas.filter(n=>n.tipo==="critica"&&!n.leida).length;
  $("totalAdvertencias").textContent = todas.filter(n=>n.tipo==="advertencia"&&!n.leida).length;
  $("totalInformativas").textContent = todas.filter(n=>n.tipo==="informativa"&&!n.leida).length;
  $("totalOportunidades").textContent = todas.filter(n=>n.tipo==="oportunidad"&&!n.leida).length;
  $("contadorLista").textContent = `${lista.length} ${lista.length===1?"resultado":"resultados"}`;

  $("listaNotificaciones").innerHTML = lista.length ? lista.map(n => `
    <article class="notification-item ${n.leida ? "read" : ""}" data-id="${esc(n.id)}">
      <span class="notification-icon ${claseIcono(n.tipo)}"><i class="bi ${esc(n.icono)}"></i></span>
      <div class="notification-body">
        <div class="notification-meta">
          <span class="category">${esc(n.categoria)}</span>
          <span class="status-dot">${n.leida ? "Leída" : "Nueva"}</span>
        </div>
        <h4>${esc(n.titulo)}</h4>
        <p>${esc(n.detalle)}</p>
      </div>
      <div class="notification-actions">
        ${!n.leida ? `<button class="btn-leer" data-action="leer" title="Marcar como leída"><i class="bi bi-check2"></i></button>` : ""}
        <a href="${esc(n.url)}" title="Abrir módulo"><i class="bi bi-arrow-up-right"></i></a>
      </div>
    </article>`).join("") : `
    <div class="empty-state">
      <i class="bi bi-bell-slash"></i>
      <strong>No hay notificaciones con este filtro</strong>
      <small>Prueba otra categoría o actualiza la bandeja.</small>
    </div>`;

  document.querySelectorAll("[data-action='leer']").forEach(btn => {
    btn.onclick = () => {
      const item = btn.closest(".notification-item");
      PSNotificaciones.marcarLeida(item.dataset.id);
      render();
    };
  });
}

const cfg = PSNotificaciones.configuracion();
$("cfgStock").checked = cfg.stock;
$("cfgCobranza").checked = cfg.cobranza;
$("cfgApartados").checked = cfg.apartados;
$("cfgFlujo").checked = cfg.flujo;
$("cfgVentas").checked = cfg.ventas;
$("cfgDiasSinVenta").value = cfg.diasSinVenta;

$("btnGuardarPreferencias").onclick = () => {
  PSNotificaciones.guardarConfiguracion({
    stock:$("cfgStock").checked,
    cobranza:$("cfgCobranza").checked,
    apartados:$("cfgApartados").checked,
    flujo:$("cfgFlujo").checked,
    ventas:$("cfgVentas").checked,
    diasSinVenta:Math.max(3, Number($("cfgDiasSinVenta").value || 30))
  });
  render();
  $("btnGuardarPreferencias").innerHTML = '<i class="bi bi-check-circle-fill"></i> Preferencias guardadas';
  setTimeout(() => $("btnGuardarPreferencias").innerHTML = '<i class="bi bi-save2"></i> Guardar preferencias', 1400);
};

$("btnMarcarTodas").onclick = () => {
  PSNotificaciones.marcarTodas(PSNotificaciones.obtener().map(n=>n.id));
  render();
};

$("btnActualizar").onclick = render;

$("busquedaNotificacion").addEventListener("input", e => {
  texto = e.target.value.trim().toLowerCase();
  render();
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter-btn").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    filtro = btn.dataset.filter;
    render();
  };
});

const sidebar=$("sidebar"), backdrop=$("sidebarBackdrop");
$("btnAbrirSidebar").onclick=()=>{sidebar.classList.add("open");backdrop.classList.add("show")};
const cerrar=()=>{sidebar.classList.remove("open");backdrop.classList.remove("show")};
$("btnCerrarSidebar").onclick=cerrar; backdrop.onclick=cerrar;

render();
})();