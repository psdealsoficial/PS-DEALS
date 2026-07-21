(() => {
"use strict";
if (!window.PSNotificaciones || location.pathname.endsWith("notificaciones.html")) return;

function crear() {
  const avisos = PSNotificaciones.obtener().filter(n=>!n.leida);
  let boton = document.getElementById("psNotificationBell");
  if (!boton) {
    boton = document.createElement("a");
    boton.id = "psNotificationBell";
    boton.href = "notificaciones.html";
    boton.className = "ps-notification-bell";
    boton.innerHTML = '<i class="bi bi-bell-fill"></i><span>0</span>';
    boton.title = "Centro de notificaciones";
    document.body.appendChild(boton);
  }
  const badge = boton.querySelector("span");
  badge.textContent = avisos.length > 99 ? "99+" : avisos.length;
  boton.classList.toggle("has-alerts", avisos.length > 0);
}
crear();
})();