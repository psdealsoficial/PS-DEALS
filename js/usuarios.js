
const $ = id => document.getElementById(id);
const modal = new bootstrap.Modal($("modalUsuario"));
const MODULOS = [
  ["dashboard","Dashboard"],["ventas","Caja y ventas"],["apartados","Apartados"],
  ["devoluciones","Devoluciones"],["inventario","Inventario"],["compras","Compras"],
  ["gastos","Gastos y caja"],["clientes","Clientes"],["cobrar","Cuentas por cobrar"],
  ["reportes","Reportes"],["configuracion","Configuración"],["usuarios","Usuarios"]
];

let usuarios = PSAuth.asegurarAdministrador();

function fecha(valor) {
  if (!valor) return "Nunca";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "Nunca" : d.toLocaleString("es-MX", {dateStyle:"short", timeStyle:"short"});
}

function permisosMarcados() {
  return [...document.querySelectorAll("[data-permiso]:checked")].map(c => c.dataset.permiso);
}

function cargarPermisos(lista = []) {
  document.querySelectorAll("[data-permiso]").forEach(c => {
    c.checked = lista.includes(c.dataset.permiso);
  });
}

function renderPermisos() {
  $("permisos").innerHTML = MODULOS.map(([clave, nombre]) => `
    <div class="permission-card">
      <input class="form-check-input mt-0" type="checkbox" data-permiso="${clave}" id="permiso-${clave}">
      <label for="permiso-${clave}">${nombre}</label>
    </div>
  `).join("");
}

function renderRoles() {
  $("rol").innerHTML = Object.keys(PSAuth.ROLES).map(rol => `<option>${rol}</option>`).join("");
}

function render() {
  usuarios = PSAuth.asegurarAdministrador();
  const q = $("buscar").value.trim().toLowerCase();
  const filtrados = usuarios.filter(u => !q || [u.nombre,u.usuario,u.rol].join(" ").toLowerCase().includes(q));

  $("tablaUsuarios").innerHTML = filtrados.length ? filtrados.map(u => `
    <tr>
      <td>
        <div class="user-cell">
          <span class="user-avatar">${PSAuth.escapeHTML(u.nombre.charAt(0).toUpperCase())}</span>
          <div><strong>${PSAuth.escapeHTML(u.nombre)}</strong><small>@${PSAuth.escapeHTML(u.usuario)}</small></div>
        </div>
      </td>
      <td><span class="badge-role">${PSAuth.escapeHTML(u.rol)}</span></td>
      <td><span class="badge-status ${u.activo ? "active" : "inactive"}">${u.activo ? "Activo" : "Desactivado"}</span></td>
      <td>${fecha(u.ultimoAcceso)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" onclick="editarUsuario(${u.id})"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-${u.activo ? "warning" : "success"}" onclick="alternarUsuario(${u.id})"><i class="bi bi-${u.activo ? "pause" : "play"}"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${u.id})"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join("") : '<tr><td colspan="5" class="empty-state">No se encontraron usuarios.</td></tr>';

  const activos = usuarios.filter(u => u.activo).length;
  $("heroActivos").textContent = activos;
  $("statTotal").textContent = usuarios.length;
  $("statActivos").textContent = activos;
  $("statAdmins").textContent = usuarios.filter(u => u.rol === "Administrador" && u.activo).length;

  renderBitacora();
}

function renderBitacora() {
  const lista = PSAuth.leer(PSAuth.K_BITACORA, []).slice().sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
  $("statEventos").textContent = lista.length;
  $("listaBitacora").innerHTML = lista.length ? lista.slice(0,60).map(e => `
    <div class="audit-item">
      <span class="audit-icon"><i class="bi bi-clock-history"></i></span>
      <div><strong>${PSAuth.escapeHTML(e.accion)}</strong><p>${PSAuth.escapeHTML(e.usuario)} · ${PSAuth.escapeHTML(e.detalle || "Sin detalle")}</p><small>${fecha(e.fecha)}</small></div>
    </div>
  `).join("") : '<div class="empty-state">La bitácora está vacía.</div>';
}

function limpiarFormulario() {
  $("formUsuario").reset();
  $("usuarioId").value = "";
  $("activo").checked = true;
  $("rol").value = "Vendedor";
  $("tituloModal").textContent = "Nuevo usuario";
  $("mensaje").className = "alert d-none mt-3 mb-0";
  cargarPermisos(PSAuth.ROLES.Vendedor);
}

$("btnNuevo").addEventListener("click", () => {
  limpiarFormulario();
  modal.show();
});

$("btnAplicarRol").addEventListener("click", () => {
  cargarPermisos(PSAuth.ROLES[$("rol").value] || []);
});

$("rol").addEventListener("change", () => {
  cargarPermisos(PSAuth.ROLES[$("rol").value] || []);
});

$("formUsuario").addEventListener("submit", evento => {
  evento.preventDefault();

  const id = Number($("usuarioId").value || 0);
  const nombreUsuario = $("usuario").value.trim().toLowerCase();
  const duplicado = usuarios.some(u => u.usuario.toLowerCase() === nombreUsuario && Number(u.id) !== id);

  if (duplicado) {
    $("mensaje").textContent = "Ese nombre de usuario ya está registrado.";
    $("mensaje").className = "alert alert-danger mt-3 mb-0";
    return;
  }

  const password = $("password").value;
  if (!id && password.length < 4) {
    $("mensaje").textContent = "La contraseña debe tener al menos 4 caracteres.";
    $("mensaje").className = "alert alert-danger mt-3 mb-0";
    return;
  }

  const datos = {
    nombre: $("nombre").value.trim(),
    usuario: nombreUsuario,
    rol: $("rol").value,
    permisos: permisosMarcados(),
    activo: $("activo").checked
  };

  if (id) {
    const indice = usuarios.findIndex(u => Number(u.id) === id);
    if (indice < 0) return;
    usuarios[indice] = {...usuarios[indice], ...datos, actualizado:new Date().toISOString()};
    if (password) usuarios[indice].passwordHash = PSAuth.hashSimple(password);
    PSAuth.registrar("Usuario actualizado", `${datos.nombre} (${datos.rol})`);
  } else {
    usuarios.push({
      id: Date.now() + Math.floor(Math.random()*1000),
      ...datos,
      passwordHash: PSAuth.hashSimple(password),
      creado: new Date().toISOString(),
      ultimoAcceso: null
    });
    PSAuth.registrar("Usuario creado", `${datos.nombre} (${datos.rol})`);
  }

  PSAuth.guardar(PSAuth.K_USUARIOS, usuarios);
  modal.hide();
  render();
});

window.editarUsuario = id => {
  const u = usuarios.find(x => Number(x.id) === Number(id));
  if (!u) return;
  $("usuarioId").value = u.id;
  $("nombre").value = u.nombre;
  $("usuario").value = u.usuario;
  $("rol").value = u.rol;
  $("password").value = "";
  $("activo").checked = u.activo;
  $("tituloModal").textContent = "Editar usuario";
  cargarPermisos(u.permisos || PSAuth.ROLES[u.rol] || []);
  modal.show();
};

window.alternarUsuario = id => {
  const actual = PSAuth.usuarioActual();
  const u = usuarios.find(x => Number(x.id) === Number(id));
  if (!u) return;
  if (Number(actual.id) === Number(u.id) && u.activo) {
    alert("No puedes desactivar el usuario con el que tienes la sesión iniciada.");
    return;
  }
  u.activo = !u.activo;
  PSAuth.guardar(PSAuth.K_USUARIOS, usuarios);
  PSAuth.registrar(u.activo ? "Usuario activado" : "Usuario desactivado", u.nombre);
  render();
};

window.eliminarUsuario = id => {
  const actual = PSAuth.usuarioActual();
  const u = usuarios.find(x => Number(x.id) === Number(id));
  if (!u) return;
  if (Number(actual.id) === Number(u.id)) {
    alert("No puedes eliminar el usuario con el que tienes la sesión iniciada.");
    return;
  }
  if (u.rol === "Administrador" && usuarios.filter(x => x.rol === "Administrador").length <= 1) {
    alert("Debe existir al menos un administrador.");
    return;
  }
  if (!confirm(`¿Eliminar definitivamente a ${u.nombre}?`)) return;
  usuarios = usuarios.filter(x => Number(x.id) !== Number(id));
  PSAuth.guardar(PSAuth.K_USUARIOS, usuarios);
  PSAuth.registrar("Usuario eliminado", u.nombre);
  render();
};

$("btnLimpiarBitacora").addEventListener("click", () => {
  if (!confirm("¿Limpiar toda la bitácora de actividad?")) return;
  PSAuth.guardar(PSAuth.K_BITACORA, []);
  PSAuth.registrar("Bitácora limpiada", "Se eliminaron los eventos anteriores");
  renderBitacora();
});

$("buscar").addEventListener("input", render);
$("btnAbrirSidebar").addEventListener("click", () => {
  $("sidebar").classList.add("open");
  $("sidebarBackdrop").classList.add("show");
});
function cerrarSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebarBackdrop").classList.remove("show");
}
$("btnCerrarSidebar").addEventListener("click", cerrarSidebar);
$("sidebarBackdrop").addEventListener("click", cerrarSidebar);

renderPermisos();
renderRoles();
render();
