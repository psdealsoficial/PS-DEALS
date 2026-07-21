const K_COMPRAS="psdeals_compras",K_PROV="psdeals_proveedores";
const $=id=>document.getElementById(id);
const modalProveedor=new bootstrap.Modal($("modalProveedor")),modalCompra=new bootstrap.Modal($("modalCompra"));
let compras=leer(K_COMPRAS),proveedores=leer(K_PROV),items=[];
function leer(k){try{const x=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(x)?x:[]}catch{return[]}}
function guardar(k,v){localStorage.setItem(k,JSON.stringify(v))}
function moneda(v){return Number(v||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"})}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function hoy(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function id(){return Date.now()+Math.floor(Math.random()*1000)}
function productoId(p){return Number(p.id)}
function poblar(){
 $("compraProveedor").innerHTML='<option value="">Selecciona proveedor</option>'+proveedores.map(p=>`<option value="${p.id}">${esc(p.nombre)}</option>`).join("");
 $("productoCompra").innerHTML='<option value="">Selecciona producto</option>'+productos.map(p=>`<option value="${productoId(p)}">${esc(p.nombre)} · stock ${Number(p.stock||0)}</option>`).join("");
}
function renderProveedores(){
 $("statProveedores").textContent=proveedores.length;
 $("listaProveedores").innerHTML=proveedores.length?proveedores.map(p=>`<div class="supplier-item"><strong>${esc(p.nombre)}</strong><small>${esc(p.contacto||"Sin contacto")} · ${esc(p.telefono||"Sin teléfono")}</small><div class="supplier-actions"><button class="btn btn-sm btn-outline-secondary" onclick="editarProveedor(${p.id})"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" onclick="eliminarProveedor(${p.id})"><i class="bi bi-trash"></i></button></div></div>`).join(""):'<div class="empty-state"><i class="bi bi-buildings fs-2 d-block mb-2"></i>Agrega tu primer proveedor.</div>';
}
function resumen(){
 const now=new Date(),mes=compras.filter(c=>{const f=new Date(c.fecha+"T00:00:00");return f.getMonth()===now.getMonth()&&f.getFullYear()===now.getFullYear()});
 const total=mes.reduce((s,c)=>s+Number(c.total||0),0),unidades=compras.reduce((s,c)=>s+c.items.reduce((a,i)=>a+Number(i.cantidad),0),0),pend=compras.filter(c=>c.estadoPago==="Pendiente").reduce((s,c)=>s+Number(c.total||0),0);
 $("heroComprasMes").textContent=$("statComprasMes").textContent=moneda(total);$("statOperacionesMes").textContent=`${mes.length} operaciones`;$("statUnidades").textContent=unidades;$("statPendiente").textContent=moneda(pend);
}
function renderCompras(){
 const q=$("buscarCompras").value.toLowerCase(),estado=$("filtroPago").value;
 const arr=compras.filter(c=>(estado==="todas"||c.estadoPago===estado)&&(!q||[c.folio,c.proveedor,c.documento,...c.items.map(i=>i.nombre)].join(" ").toLowerCase().includes(q))).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
 $("tablaCompras").innerHTML=arr.length?arr.map(c=>`<tr><td>${new Date(c.fecha+"T00:00:00").toLocaleDateString("es-MX")}</td><td>${esc(c.folio)}</td><td>${esc(c.proveedor)}</td><td>${esc(c.items.length===1?c.items[0].nombre:`${c.items[0].nombre} +${c.items.length-1}`)}<div class="small text-muted">${c.items.reduce((s,i)=>s+Number(i.cantidad),0)} unidades</div></td><td><span class="badge-status ${c.estadoPago==="Pagada"?"status-paid":"status-pending"}">${c.estadoPago}</span></td><td class="text-end"><strong>${moneda(c.total)}</strong></td><td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="eliminarCompra(${c.id})"><i class="bi bi-trash"></i></button></td></tr>`).join(""):'<tr><td colspan="7" class="empty-state">No hay compras registradas.</td></tr>';
}
function renderItems(){
 $("tablaItemsCompra").innerHTML=items.length?items.map((i,n)=>`<tr><td>${esc(i.nombre)}</td><td>${i.cantidad}</td><td>${moneda(i.costo)}</td><td>${moneda(i.cantidad*i.costo)}</td><td><button type="button" class="btn btn-sm btn-outline-danger" onclick="quitarItem(${n})"><i class="bi bi-x"></i></button></td></tr>`).join(""):'<tr><td colspan="5" class="empty-state">Agrega productos a la compra.</td></tr>';
 $("totalCompra").textContent=moneda(items.reduce((s,i)=>s+i.cantidad*i.costo,0));
}
function todo(){poblar();renderProveedores();resumen();renderCompras()}
$("btnNuevoProveedor").onclick=()=>{ $("formProveedor").reset();$("proveedorId").value="";$("tituloProveedor").textContent="Nuevo proveedor";modalProveedor.show()};
$("formProveedor").onsubmit=e=>{e.preventDefault();const pid=Number($("proveedorId").value||0),data={nombre:$("proveedorNombre").value.trim(),telefono:$("proveedorTelefono").value.trim(),correo:$("proveedorCorreo").value.trim(),contacto:$("proveedorContacto").value.trim(),notas:$("proveedorNotas").value.trim(),actualizado:new Date().toISOString()};if(pid){const n=proveedores.findIndex(p=>Number(p.id)===pid);proveedores[n]={...proveedores[n],...data}}else proveedores.push({id:id(),...data,creado:new Date().toISOString()});guardar(K_PROV,proveedores);modalProveedor.hide();todo()};
window.editarProveedor=pid=>{const p=proveedores.find(x=>Number(x.id)===Number(pid));if(!p)return;$("proveedorId").value=p.id;$("proveedorNombre").value=p.nombre;$("proveedorTelefono").value=p.telefono||"";$("proveedorCorreo").value=p.correo||"";$("proveedorContacto").value=p.contacto||"";$("proveedorNotas").value=p.notas||"";$("tituloProveedor").textContent="Editar proveedor";modalProveedor.show()};
window.eliminarProveedor=pid=>{if(!confirm("¿Eliminar este proveedor?"))return;proveedores=proveedores.filter(p=>Number(p.id)!==Number(pid));guardar(K_PROV,proveedores);todo()};
$("btnNuevaCompra").onclick=()=>{if(!proveedores.length){alert("Primero registra un proveedor.");return}items=[];$("formCompra").reset();$("compraFecha").value=hoy();renderItems();poblar();modalCompra.show()};
$("productoCompra").onchange=()=>{const p=productos.find(x=>productoId(x)===Number($("productoCompra").value));$("costoCompra").value=p?Number(p.costo||0):""};
$("btnAgregarItem").onclick=()=>{const p=productos.find(x=>productoId(x)===Number($("productoCompra").value)),cantidad=Number($("cantidadCompra").value),costo=Number($("costoCompra").value);if(!p||cantidad<=0||costo<=0){alert("Selecciona producto, cantidad y costo válidos.");return}const ex=items.find(i=>i.productoId===productoId(p));if(ex){ex.cantidad+=cantidad;ex.costo=costo}else items.push({productoId:productoId(p),nombre:p.nombre,cantidad,costo});renderItems()};
window.quitarItem=n=>{items.splice(n,1);renderItems()};
$("formCompra").onsubmit=e=>{e.preventDefault();if(!items.length){alert("Agrega al menos un producto.");return}const prov=proveedores.find(p=>Number(p.id)===Number($("compraProveedor").value));if(!prov){alert("Selecciona proveedor.");return}
 items.forEach(i=>{const p=productos.find(x=>productoId(x)===i.productoId);if(p){p.stock=Number(p.stock||0)+i.cantidad;p.costo=i.costo;p.proveedor=prov.nombre}});
 guardarProductos(productos);
 const total=items.reduce((s,i)=>s+i.cantidad*i.costo,0);
 compras.push({id:id(),folio:`COM-${Date.now().toString().slice(-8)}`,proveedorId:prov.id,proveedor:prov.nombre,fecha:$("compraFecha").value,estadoPago:$("compraEstadoPago").value,documento:$("compraDocumento").value.trim(),notas:$("compraNotas").value.trim(),items:items.map(i=>({...i})),total,creado:new Date().toISOString()});
 guardar(K_COMPRAS,compras);modalCompra.hide();todo();alert("Compra registrada e inventario actualizado.");
};
window.eliminarCompra=cid=>{const c=compras.find(x=>Number(x.id)===Number(cid));if(!c||!confirm("Al eliminarla se descontarán del inventario las unidades recibidas. ¿Continuar?"))return;c.items.forEach(i=>{const p=productos.find(x=>productoId(x)===Number(i.productoId));if(p)p.stock=Math.max(0,Number(p.stock||0)-Number(i.cantidad||0))});guardarProductos(productos);compras=compras.filter(x=>Number(x.id)!==Number(cid));guardar(K_COMPRAS,compras);todo()};
$("buscarCompras").oninput=renderCompras;$("filtroPago").onchange=renderCompras;
$("btnAbrirSidebar").onclick=()=>{$("sidebar").classList.add("open");$("sidebarBackdrop").classList.add("show")};
function cerrar(){$("sidebar").classList.remove("open");$("sidebarBackdrop").classList.remove("show")}
$("btnCerrarSidebar").onclick=cerrar;$("sidebarBackdrop").onclick=cerrar;
todo();