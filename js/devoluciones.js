const K_DEV="psdeals_devoluciones",K_VENTAS="psdeals_ventas";
const $=id=>document.getElementById(id);
const modal=new bootstrap.Modal($("modalDevolucion"));
let devoluciones=leer(K_DEV),ventas=leer(K_VENTAS),ventaActual=null;

function leer(k){try{const v=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function guardar(){localStorage.setItem(K_DEV,JSON.stringify(devoluciones))}
function moneda(v){return Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"})}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function hoy(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function itemsVenta(v){return Array.isArray(v.items)&&v.items.length?v.items:[{productoId:Number(v.productoId),producto:v.producto||"Producto",sku:v.sku||"",cantidad:Number(v.cantidad||0),precioUnitario:Number(v.precioUnitario||0),costoUnitario:Number(v.costoUnitario||0),importe:Number(v.total||0),ganancia:Number(v.ganancia||0)}]}
function idVenta(v){return String(v.id??v.folio??v.fecha)}
function folioVenta(v){return v.folio||`VTA-${String(v.id||"").slice(-6)}`}
function devueltasAntes(ventaId,productoId){return devoluciones.filter(d=>String(d.ventaId)===String(ventaId)&&Number(d.productoId)===Number(productoId)).reduce((s,d)=>s+Number(d.cantidad||0),0)}
function unitario(item){const c=Number(item.cantidad||0);return c?Number(item.importe??(Number(item.precioUnitario||0)*c))/c:Number(item.precioUnitario||0)}
function costoUnitario(item){return Number(item.costoUnitario||0)}
function gananciaUnit(item){const c=Number(item.cantidad||0);return c?Number(item.ganancia??((unitario(item)-costoUnitario(item))*c))/c:0}

function buscarVentas(){
 const q=$("buscarVenta").value.trim().toLowerCase();
 if(!q){$("resultadosVentas").classList.add("d-none");return}
 const r=ventas.filter(v=>[folioVenta(v),v.cliente,v.telefono].join(" ").toLowerCase().includes(q)).slice(0,10);
 $("resultadosVentas").innerHTML=r.length?r.map(v=>`<button type="button" class="sale-option" onclick="seleccionarVenta('${idVenta(v).replaceAll("'","")}')"><span><strong>${esc(folioVenta(v))}</strong><small class="d-block text-muted">${esc(v.cliente||"Público general")} · ${new Date(v.fecha).toLocaleDateString("es-MX")}</small></span><strong>${moneda(v.total)}</strong></button>`).join(""):'<div class="p-3 text-muted">No se encontraron ventas.</div>';
 $("resultadosVentas").classList.remove("d-none");
}

window.seleccionarVenta=vid=>{
 ventaActual=ventas.find(v=>idVenta(v)===String(vid));
 if(!ventaActual)return;
 $("buscarVenta").value=folioVenta(ventaActual);$("resultadosVentas").classList.add("d-none");
 $("ventaSeleccionada").innerHTML=`<div class="d-flex justify-content-between gap-3"><div><strong>${esc(folioVenta(ventaActual))}</strong><div class="small text-muted">${esc(ventaActual.cliente||"Público general")} · ${esc(ventaActual.telefono||"Sin teléfono")}</div></div><strong>${moneda(ventaActual.total)}</strong></div>`;
 $("ventaSeleccionada").classList.remove("d-none");
 const opciones=itemsVenta(ventaActual).map((i,n)=>{const disponible=Math.max(0,Number(i.cantidad||0)-devueltasAntes(idVenta(ventaActual),i.productoId));return disponible>0?`<option value="${n}">${esc(i.producto)} · disponibles ${disponible}</option>`:""}).join("");
 $("itemVenta").innerHTML='<option value="">Selecciona producto</option>'+opciones;
 $("itemVenta").disabled=false;$("cantidad").disabled=false;actualizarCantidad();
};

function actualizarCantidad(){
 if(!ventaActual||$("itemVenta").value===""){$("cantidadDisponible").textContent="";$("reembolsoEstimado").textContent=moneda(0);return}
 const item=itemsVenta(ventaActual)[Number($("itemVenta").value)];
 const max=Math.max(0,Number(item.cantidad||0)-devueltasAntes(idVenta(ventaActual),item.productoId));
 $("cantidad").max=max;if(Number($("cantidad").value)>max)$("cantidad").value=max||1;
 $("cantidadDisponible").textContent=`Máximo disponible: ${max}`;
 $("reembolsoEstimado").textContent=moneda(unitario(item)*Number($("cantidad").value||0));
}

function render(){
 const q=$("buscar").value.toLowerCase(),motivo=$("filtroMotivo").value;
 const lista=devoluciones.filter(d=>(motivo==="todos"||d.motivo===motivo)&&(!q||[d.folio,d.folioVenta,d.cliente,d.producto].join(" ").toLowerCase().includes(q))).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
 $("tabla").innerHTML=lista.length?lista.map(d=>`<tr><td>${new Date(d.fecha+"T12:00:00").toLocaleDateString("es-MX")}</td><td>${esc(d.folio)}</td><td>${esc(d.folioVenta)}</td><td>${esc(d.cliente)}</td><td><strong>${esc(d.producto)}</strong><div class="small text-muted">${d.cantidad} unidad(es)</div></td><td><span class="badge-reason">${esc(d.motivo)}</span></td><td class="text-end"><strong>${moneda(d.monto)}</strong></td><td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="eliminarDevolucion(${d.id})"><i class="bi bi-trash"></i></button></td></tr>`).join(""):'<tr><td colspan="8" class="empty-state"><i class="bi bi-arrow-counterclockwise fs-2 d-block mb-2"></i>No hay devoluciones registradas.</td></tr>';
 const now=new Date(),mes=devoluciones.filter(d=>{const f=new Date(d.fecha+"T12:00:00");return f.getMonth()===now.getMonth()&&f.getFullYear()===now.getFullYear()});
 const totalMes=mes.reduce((s,d)=>s+Number(d.monto||0),0),total=devoluciones.reduce((s,d)=>s+Number(d.monto||0),0),unidades=devoluciones.reduce((s,d)=>s+Number(d.cantidad||0),0);
 $("heroMes").textContent=$("statMes").textContent=moneda(totalMes);$("statOperaciones").textContent=`${mes.length} operaciones`;$("statUnidades").textContent=unidades;$("statTotal").textContent=moneda(total);
 $("statUltima").textContent=devoluciones.length?new Date([...devoluciones].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))[0].fecha+"T12:00:00").toLocaleDateString("es-MX"):"—";
 const motivos=[...new Set(devoluciones.map(d=>d.motivo))].sort();$("filtroMotivo").innerHTML='<option value="todos">Todos los motivos</option>'+motivos.map(m=>`<option>${esc(m)}</option>`).join("");
}

$("btnNuevaDevolucion").onclick=()=>{ventaActual=null;$("formDevolucion").reset();$("buscarVenta").value="";$("ventaSeleccionada").classList.add("d-none");$("resultadosVentas").classList.add("d-none");$("itemVenta").innerHTML='<option value="">Primero selecciona una venta</option>';$("itemVenta").disabled=true;$("cantidad").disabled=true;$("cantidad").value=1;$("reembolsoEstimado").textContent=moneda(0);modal.show()};
$("buscarVenta").oninput=buscarVentas;$("itemVenta").onchange=actualizarCantidad;$("cantidad").oninput=actualizarCantidad;
$("formDevolucion").onsubmit=e=>{
 e.preventDefault();if(!ventaActual||$("itemVenta").value===""){alert("Selecciona una venta y un producto.");return}
 const item=itemsVenta(ventaActual)[Number($("itemVenta").value)],cantidad=Number($("cantidad").value),max=Math.max(0,Number(item.cantidad||0)-devueltasAntes(idVenta(ventaActual),item.productoId));
 if(cantidad<1||cantidad>max){alert(`La cantidad máxima disponible es ${max}.`);return}
 const monto=unitario(item)*cantidad,costo=costoUnitario(item)*cantidad,ganancia=gananciaUnit(item)*cantidad;
 const p=productos.find(x=>Number(x.id)===Number(item.productoId));if(p){p.stock=Number(p.stock||0)+cantidad;guardarProductos(productos)}
 devoluciones.push({id:Date.now()+Math.floor(Math.random()*1000),folio:`DEV-${Date.now().toString().slice(-8)}`,ventaId:idVenta(ventaActual),folioVenta:folioVenta(ventaActual),cliente:ventaActual.cliente||"Público general",telefono:ventaActual.telefono||"",fecha:hoy(),productoId:Number(item.productoId),producto:item.producto,cantidad,monto,costo,ganancia,motivo:$("motivo").value,metodoReembolso:$("metodoReembolso").value,notas:$("notas").value.trim(),creado:new Date().toISOString()});
 guardar();modal.hide();render();alert("Devolución registrada e inventario actualizado.");
};
window.eliminarDevolucion=did=>{
 const d=devoluciones.find(x=>Number(x.id)===Number(did));if(!d||!confirm("Al eliminarla se descontarán nuevamente las unidades del inventario. ¿Continuar?"))return;
 const p=productos.find(x=>Number(x.id)===Number(d.productoId));if(p){p.stock=Math.max(0,Number(p.stock||0)-Number(d.cantidad||0));guardarProductos(productos)}
 devoluciones=devoluciones.filter(x=>Number(x.id)!==Number(did));guardar();render();
};
$("buscar").oninput=render;$("filtroMotivo").onchange=render;
$("btnAbrirSidebar").onclick=()=>{$("sidebar").classList.add("open");$("sidebarBackdrop").classList.add("show")};
function cerrar(){$("sidebar").classList.remove("open");$("sidebarBackdrop").classList.remove("show")}
$("btnCerrarSidebar").onclick=cerrar;$("sidebarBackdrop").onclick=cerrar;
render();