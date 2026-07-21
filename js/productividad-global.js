(() => {
  "use strict";
  if (window.__PSProductividad) return;
  window.__PSProductividad = true;

  const leer = (k, d=[]) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const escapeHTML = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const MODULOS = [
    ["Dashboard","dashboard.html","bi-grid-1x2-fill"],["Notificaciones","notificaciones.html","bi-bell-fill"],["Actividad","actividad.html","bi-clock-history"],
    ["Caja y ventas","ventas.html","bi-cart-check-fill"],["Apartados","apartados.html","bi-bookmark-check-fill"],["Devoluciones","devoluciones.html","bi-arrow-counterclockwise"],
    ["Inventario","admin.html","bi-box-seam-fill"],["Compras","compras.html","bi-bag-check-fill"],["Gastos y caja","gastos.html","bi-wallet-fill"],
    ["Clientes","clientes.html","bi-people-fill"],["Cuentas por cobrar","cuentas-cobrar.html","bi-credit-card-2-front-fill"],["Reportes","reportes.html","bi-bar-chart-fill"],
    ["Configuración","configuracion.html","bi-gear-fill"],["Usuarios","usuarios.html","bi-person-lock"],["Tienda","index.html","bi-shop"]
  ];

  function toast(mensaje, tipo="success", titulo="PS Deals") {
    let zona = document.querySelector(".ps-toast-zone");
    if (!zona) { zona=document.createElement("div"); zona.className="ps-toast-zone"; document.body.appendChild(zona); }
    const iconos={success:"bi-check-circle-fill",warning:"bi-exclamation-triangle-fill",danger:"bi-x-circle-fill",info:"bi-info-circle-fill"};
    const item=document.createElement("div"); item.className=`ps-toast ${tipo}`;
    item.innerHTML=`<i class="bi ${iconos[tipo]||iconos.info}"></i><div><strong>${escapeHTML(titulo)}</strong><small>${escapeHTML(mensaje)}</small></div>`;
    zona.appendChild(item); setTimeout(()=>{item.style.opacity="0";item.style.transform="translateY(-6px)";setTimeout(()=>item.remove(),220)},3500);
  }
  window.PSToast = toast;

  function resultados(q) {
    const t=q.trim().toLowerCase(); if (!t) return [];
    const permitidos = new Set([...document.querySelectorAll('a[href$=".html"]')].filter(a=>!a.classList.contains("ps-auth-hidden")).map(a=>a.getAttribute("href")));
    const mods=MODULOS.filter(([n,h])=>(n.toLowerCase().includes(t)||h.includes(t)) && (!permitidos.size || permitidos.has(h))).map(([n,h,i])=>({grupo:"Módulos",titulo:n,detalle:h,href:h,icono:i}));
    const productos=leer("psdeals_productos",[]).filter(p=>[p.nombre,p.sku,p.categoria,p.proveedor].some(v=>String(v||"").toLowerCase().includes(t))).slice(0,8).map(p=>({grupo:"Productos",titulo:p.nombre,detalle:`${p.sku||"Sin SKU"} · Stock ${Number(p.stock||0)}`,href:`admin.html?buscar=${encodeURIComponent(p.sku||p.nombre)}`,icono:"bi-box-seam"}));
    const clientes=leer("psdeals_clientes",[]).filter(c=>[c.nombre,c.telefono,c.email].some(v=>String(v||"").toLowerCase().includes(t))).slice(0,8).map(c=>({grupo:"Clientes",titulo:c.nombre,detalle:c.telefono||c.email||"Cliente registrado",href:`clientes.html?buscar=${encodeURIComponent(c.nombre)}`,icono:"bi-person"}));
    return [...mods,...productos,...clientes].slice(0,18);
  }

  function crearBuscador() {
    if (["login.html"].includes(location.pathname.split("/").pop())) return;
    const boton=document.createElement("button"); boton.className="ps-global-trigger"; boton.type="button"; boton.title="Búsqueda global (Ctrl+K)"; boton.innerHTML='<i class="bi bi-search"></i>'; document.body.appendChild(boton);
    const capa=document.createElement("div"); capa.className="ps-search-backdrop"; capa.innerHTML=`<div class="ps-search-panel" role="dialog" aria-modal="true"><div class="ps-search-head"><i class="bi bi-search"></i><input class="ps-search-input" placeholder="Buscar módulos, productos o clientes…" autocomplete="off"><button class="ps-search-close" type="button">ESC</button></div><div class="ps-search-results"><div class="ps-search-empty">Escribe para comenzar la búsqueda.</div></div><div class="ps-shortcuts"><span><kbd>Ctrl</kbd> + <kbd>K</kbd> buscar</span><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span></div></div>`; document.body.appendChild(capa);
    const input=capa.querySelector("input"), cont=capa.querySelector(".ps-search-results"); let lista=[],activo=0;
    const cerrar=()=>{capa.classList.remove("is-open");input.value="";cont.innerHTML='<div class="ps-search-empty">Escribe para comenzar la búsqueda.</div>';};
    const abrir=()=>{capa.classList.add("is-open");setTimeout(()=>input.focus(),20)};
    function pintar(){lista=resultados(input.value);activo=0;if(!lista.length){cont.innerHTML='<div class="ps-search-empty">No encontramos coincidencias.</div>';return;}let grupo="";cont.innerHTML=lista.map((r,i)=>{const cab=r.grupo!==grupo?`<div class="ps-search-group">${grupo=r.grupo}</div>`:"";return `${cab}<a class="ps-search-item ${i===0?"is-active":""}" data-i="${i}" href="${r.href}"><span class="ps-search-icon"><i class="bi ${r.icono}"></i></span><span class="ps-search-copy"><strong>${escapeHTML(r.titulo)}</strong><small>${escapeHTML(r.detalle)}</small></span><i class="bi bi-arrow-return-left"></i></a>`}).join("");}
    function marcar(){cont.querySelectorAll(".ps-search-item").forEach((e,i)=>e.classList.toggle("is-active",i===activo));cont.querySelector(`[data-i="${activo}"]`)?.scrollIntoView({block:"nearest"});}
    input.addEventListener("input",pintar); boton.addEventListener("click",abrir); capa.querySelector(".ps-search-close").addEventListener("click",cerrar); capa.addEventListener("click",e=>{if(e.target===capa)cerrar()});
    document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();abrir();return;}if(!capa.classList.contains("is-open"))return;if(e.key==="Escape")cerrar();if(e.key==="ArrowDown"){e.preventDefault();activo=Math.min(activo+1,lista.length-1);marcar()}if(e.key==="ArrowUp"){e.preventDefault();activo=Math.max(activo-1,0);marcar()}if(e.key==="Enter"&&lista[activo])location.href=lista[activo].href;});
  }

  function atajos() {
    document.addEventListener("keydown",e=>{
      if(e.ctrlKey||e.altKey||e.metaKey||["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
      const mapa={F2:"ventas.html",F4:"clientes.html",F7:"compras.html",F8:"gastos.html",F9:"reportes.html"};
      if(mapa[e.key]){e.preventDefault();location.href=mapa[e.key]}
      if(e.key==="F3"){e.preventDefault();document.querySelector("#buscarProducto,#buscarAdmin,#buscar")?.focus()}
    });
  }

  function cambiosPendientes() {
    const formularios=[...document.querySelectorAll("form")].filter(f=>!f.closest(".ps-search-panel") && !["formLogin"].includes(f.id));
    if(!formularios.length)return;
    let sucio=false; const badge=document.createElement("div");badge.className="ps-dirty-badge";badge.innerHTML='<i class="bi bi-pencil-fill"></i> Cambios sin guardar';document.body.appendChild(badge);
    const marcar=e=>{if(e.target.matches('input[type="search"]'))return;sucio=true;badge.classList.add("is-visible")};
    formularios.forEach(f=>{f.addEventListener("input",marcar);f.addEventListener("change",marcar);f.addEventListener("submit",()=>setTimeout(()=>{sucio=false;badge.classList.remove("is-visible")},100));f.addEventListener("reset",()=>{sucio=false;badge.classList.remove("is-visible")})});
    window.addEventListener("beforeunload",e=>{if(!sucio)return;e.preventDefault();e.returnValue=""});
    window.PSMarcarGuardado=()=>{sucio=false;badge.classList.remove("is-visible")};
  }

  function aplicarBusquedaURL(){const q=new URLSearchParams(location.search).get("buscar");if(!q)return;const campo=document.querySelector("#buscarAdmin,#buscarCliente,#buscarClientes,#buscarProducto,#buscar");if(campo){campo.value=q;campo.dispatchEvent(new Event("input",{bubbles:true}));setTimeout(()=>campo.focus(),100)}}

  document.addEventListener("DOMContentLoaded",()=>{crearBuscador();atajos();cambiosPendientes();aplicarBusquedaURL()});
})();
