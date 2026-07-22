"use strict";
const $=id=>document.getElementById(id);let movimientos=[],productos=[],resumen={};const modal=new bootstrap.Modal($("modalAjuste"));
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
async function api(url,opt={}){const r=await fetch(url,{cache:"no-store",headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d;}
function params(){const p=new URLSearchParams();if($("fProducto").value)p.set("productoId",$("fProducto").value);if($("fTipo").value)p.set("tipo",$("fTipo").value);if($("fDesde").value)p.set("desde",$("fDesde").value);if($("fHasta").value)p.set("hasta",$("fHasta").value);if($("fBuscar").value.trim())p.set("q",$("fBuscar").value.trim());return p.toString();}
function tipoInfo(t){if(t==="entrada")return ["Entrada","badge-in","bi-arrow-down-circle"];if(t==="salida")return ["Salida","badge-out","bi-arrow-up-circle"];return [t.includes("entrada")?"Ajuste +":"Ajuste −","badge-adjust","bi-sliders"];}
function setText(id,value){const el=$(id);if(el)el.textContent=value;else console.warn(`[Kardex] Elemento opcional no encontrado: #${id}`);}
function render(){
  const r=resumen||{};
  setText("heroMovimientos",movimientos.length);
  setText("statEntradas",Number(r.entradas||0).toLocaleString("es-MX"));
  setText("statSalidas",Number(r.salidas||0).toLocaleString("es-MX"));
  setText("statExistencia",Number(r.existenciaActual||0).toLocaleString("es-MX"));
  setText("statInconsistencias",Number(r.inconsistencias||0));
  setText("rangoInfo",params()?"Filtros activos":"Todos los movimientos");
  const aviso=$("avisoKardexVacio");
  if(aviso)aviso.classList.toggle("d-none",movimientos.length>0);

  const tabla=$("tablaKardex");
  if(!tabla)throw new Error("No se encontró la tabla del Kardex (#tablaKardex).");
  tabla.innerHTML=movimientos.length?movimientos.map(m=>{const [label,cls,icon]=tipoInfo(String(m.tipo||""));const q=Number(m.cantidad||0);return `<tr><td>${new Date(m.fecha).toLocaleString("es-MX")}</td><td><strong>${esc(m.producto)}</strong><div class="small text-muted">${esc(m.sku||"Sin SKU")}</div></td><td><span class="badge-move ${cls}"><i class="bi ${icon} me-1"></i>${label}</span></td><td class="text-end ${q>=0?"qty-in":"qty-out"}">${q>0?"+":""}${q}</td><td class="text-end">${Number(m.existenciaAnterior||0)}</td><td class="text-end"><strong>${Number(m.existenciaNueva||0)}</strong></td><td>${esc(m.referencia||"—")}</td><td>${esc(m.motivo||"—")}</td><td>${esc(m.usuario||"Sistema")}</td></tr>`}).join(""):'<tr><td colspan="9" class="empty-state"><i class="bi bi-journal-x fs-2 d-block mb-2"></i>No hay movimientos para estos filtros.</td></tr>';
}
async function cargarCatalogo(){const d=await api("/api/inventory/products");productos=d.productos;const opts=productos.map(p=>`<option value="${p.id}">${esc(p.nombre)} · ${Number(p.stock)} uds.</option>`).join("");$("fProducto").innerHTML='<option value="">Todos</option>'+opts;$("ajProducto").innerHTML='<option value="">Selecciona producto</option>'+opts;}
async function cargar(){
  const tbody=$("tablaKardex");
  tbody.innerHTML='<tr><td colspan="9" class="empty-state"><span class="spinner-border spinner-border-sm me-2"></span>Cargando movimientos desde SQLite...</td></tr>';
  try{
    const d=await api(`/api/inventory/movements?${params()}`);
    movimientos=Array.isArray(d.movimientos)?d.movimientos:[];
    resumen=d.resumen||{};
    render();
    document.documentElement.dataset.kardexSource=d.source||"desconocido";
  }catch(e){
    console.error(e);
    tbody.innerHTML=`<tr><td colspan="9" class="empty-state text-danger"><i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>No se pudo cargar el Kardex.<div class="small mt-2">${esc(e.message)}</div><div class="small mt-1">Abre esta página desde npm start, no con Live Server.</div></td></tr>`;
    setText("rangoInfo","Error de interfaz o conexión");
  }
}
let timer;["fProducto","fTipo","fDesde","fHasta"].forEach(id=>$(id).addEventListener("change",cargar));$("fBuscar").addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(cargar,250)});$("btnLimpiar").onclick=()=>{["fProducto","fTipo","fDesde","fHasta","fBuscar"].forEach(id=>$(id).value="");cargar();};
async function reconstruirDesdeSQLite(){const r=await api("/api/inventory/rebuild",{method:"POST",body:"{}"});if(r.inserted>0){alert(`Se reconstruyeron ${r.inserted} movimientos desde SQLite.`);await cargar();return true;}return false;}
function leerLocal(k){try{const v=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
async function recuperarLocal(ventas,compras){const r=await api("/api/inventory/recover-legacy",{method:"POST",body:JSON.stringify({ventas,compras})});if(r.inserted>0){alert(`Se recuperaron ${r.inserted} movimientos del historial local.`);await cargar();return true;}return false;}
$("btnReconstruir").onclick=async()=>{const btn=$("btnReconstruir");btn.disabled=true;try{if(await reconstruirDesdeSQLite())return;const ventas=leerLocal("psdeals_ventas"),compras=leerLocal("psdeals_compras");if((ventas.length||compras.length)&&await recuperarLocal(ventas,compras))return;if(confirm("No se encontraron operaciones en SQLite ni en la caché local. ¿Seleccionar un respaldo JSON de PS Deals?"))$("archivoRespaldo").click();else alert("No hay una fuente disponible para reconstruir el historial. Las nuevas ventas y compras sí se registrarán normalmente.");}catch(e){alert(`No se pudo reconstruir el Kardex: ${e.message}`)}finally{btn.disabled=false;}};
$("archivoRespaldo").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text()),d=data.datos||data;const ventas=Array.isArray(d.ventas)?d.ventas:[],compras=Array.isArray(d.compras)?d.compras:[];if(!ventas.length&&!compras.length)throw new Error("El respaldo no contiene ventas ni compras.");await recuperarLocal(ventas,compras);}catch(err){alert(`Respaldo inválido: ${err.message}`)}finally{e.target.value="";}};
$("btnExportar").onclick=()=>{if(!movimientos.length)return alert("No hay movimientos para exportar.");const rows=[["Fecha","Producto","SKU","Tipo","Cantidad","Anterior","Nuevo","Referencia","Motivo","Usuario"],...movimientos.map(m=>[m.fecha,m.producto,m.sku,m.tipo,m.cantidad,m.existenciaAnterior,m.existenciaNueva,m.referencia,m.motivo,m.usuario])];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"}));a.download=`kardex-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);};$("btnImprimir").onclick=()=>window.print();
$("btnAjuste").onclick=()=>{$("formAjuste").reset();$("ajSistema").value="";$("ajPreview").textContent="Selecciona un producto.";$("ajPreview").className="adjust-preview mt-3";$("ajMensaje").className="alert d-none mt-3 mb-0";modal.show();};
function preview(){const p=productos.find(x=>Number(x.id)===Number($("ajProducto").value));if(!p){$("ajSistema").value="";return;}$("ajSistema").value=p.stock;const f=Number($("ajFisico").value);if(!Number.isFinite(f))return;const dif=f-Number(p.stock);$("ajPreview").textContent=dif===0?"No existe diferencia.":`El ajuste será de ${dif>0?"+":""}${dif} unidades.`;$("ajPreview").className=`adjust-preview mt-3 ${dif>0?"positive":dif<0?"negative":""}`;}
$("ajProducto").onchange=preview;$("ajFisico").oninput=preview;$("formAjuste").onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{const ses=window.PSAuth?.usuarioActual?.();await api("/api/inventory/adjustments",{method:"POST",body:JSON.stringify({productoId:Number($("ajProducto").value),existenciaFisica:Number($("ajFisico").value),motivo:$("ajMotivo").value.trim(),usuarioId:ses?.id||null})});modal.hide();await cargarCatalogo();await cargar();alert("Ajuste registrado correctamente en el Kardex.");}catch(err){$("ajMensaje").className="alert alert-danger mt-3 mb-0";$("ajMensaje").textContent=err.message;}finally{btn.disabled=false;}};
const abrirSidebar=$("btnAbrirSidebar"), sidebar=$("sidebar"), backdrop=$("sidebarBackdrop"), cerrarSidebar=$("btnCerrarSidebar");
if(abrirSidebar&&sidebar&&backdrop){abrirSidebar.onclick=()=>{sidebar.classList.add("open");backdrop.classList.add("show")};const cerrar=()=>{sidebar.classList.remove("open");backdrop.classList.remove("show")};if(cerrarSidebar)cerrarSidebar.onclick=cerrar;backdrop.onclick=cerrar;}
(async()=>{await cargarCatalogo();await cargar();})();