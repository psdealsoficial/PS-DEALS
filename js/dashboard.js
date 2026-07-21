(() => {
"use strict";
const $ = id => document.getElementById(id);
const leer = (k, respaldo=[]) => { try { const v=JSON.parse(localStorage.getItem(k)); return v ?? respaldo; } catch { return respaldo; } };
const dinero = n => Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const num = n => Number(n||0);
const esc = v => String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const fechaValida = v => { const d=new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
const inicioDia = d => new Date(d.getFullYear(),d.getMonth(),d.getDate());
const mismoDia = (a,b) => a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const mismoMes = (a,b) => a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth();
const fechaCorta = v => { const d=fechaValida(v); return d ? d.toLocaleDateString("es-MX",{day:"2-digit",month:"short"}) : "Sin fecha"; };

function itemsVenta(v){
  if(Array.isArray(v.items)&&v.items.length) return v.items;
  return [{productoId:v.productoId,producto:v.producto||"Producto",cantidad:num(v.cantidad),importe:num(v.total),ganancia:num(v.ganancia)}];
}
function ventasNetas(){
  const ventas=leer("psdeals_ventas",[]);
  const dev=leer("psdeals_devoluciones",[]);
  return ventas.map(v=>{
    const id=String(v.id??v.folio??v.fecha);
    const relacionadas=dev.filter(d=>String(d.ventaId)===id);
    const monto=relacionadas.reduce((s,d)=>s+num(d.monto),0);
    const ganancia=relacionadas.reduce((s,d)=>s+num(d.ganancia),0);
    const items=itemsVenta(v).map(i=>{
      const retornada=relacionadas.filter(d=>String(d.productoId)===String(i.productoId)).reduce((s,d)=>s+num(d.cantidad),0);
      const original=num(i.cantidad), nueva=Math.max(0,original-retornada);
      return {...i,cantidad:nueva,importe:original?num(i.importe)*(nueva/original):0,ganancia:original?num(i.ganancia)*(nueva/original):0};
    }).filter(i=>i.cantidad>0);
    return {...v,total:Math.max(0,num(v.total)-monto),ganancia:num(v.ganancia)-ganancia,items};
  }).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
}
function montoCompra(c){ return num(c.total ?? c.monto ?? (Array.isArray(c.items)?c.items.reduce((s,i)=>s+num(i.cantidad)*num(i.costoUnitario??i.costo),0):0)); }
function estaPagada(c){ return String(c.estadoPago??c.estado??"").toLowerCase().includes("pag"); }
function montoGasto(g){ return num(g.monto??g.total); }
function saldoCuenta(c){ return Math.max(0,num(c.saldo ?? c.saldoPendiente ?? (num(c.montoOriginal??c.monto)-num(c.pagado??c.abonado??c.anticipo)))); }
function saldoApartado(a){ return Math.max(0,num(a.saldo ?? a.saldoPendiente ?? (num(a.total)-num(a.pagado??a.anticipo)))); }
function activoApartado(a){ const e=String(a.estado||"Activo").toLowerCase(); return !e.includes("liquid")&&!e.includes("cancel"); }

const ahora=new Date(), ayer=new Date(ahora); ayer.setDate(ayer.getDate()-1);
const mesAnterior=new Date(ahora.getFullYear(),ahora.getMonth()-1,1);
const ventas=ventasNetas();
const compras=leer("psdeals_compras",[]);
const gastos=leer("psdeals_gastos",[]);
const cuentas=leer("psdeals_cuentas_cobrar",[]);
const apartados=leer("psdeals_apartados",[]);
const clientes=leer("psdeals_clientes",[]);
const devoluciones=leer("psdeals_devoluciones",[]);
const listaProductos=typeof productos!=="undefined"&&Array.isArray(productos)?productos:[];

const ventasHoy=ventas.filter(v=>mismoDia(fechaValida(v.fecha),ahora));
const ventasAyer=ventas.filter(v=>mismoDia(fechaValida(v.fecha),ayer));
const ventasMes=ventas.filter(v=>mismoMes(fechaValida(v.fecha),ahora));
const ventasMesAnterior=ventas.filter(v=>mismoMes(fechaValida(v.fecha),mesAnterior));
const ingresoHoy=ventasHoy.reduce((s,v)=>s+num(v.total),0);
const ingresoAyer=ventasAyer.reduce((s,v)=>s+num(v.total),0);
const ingresoMes=ventasMes.reduce((s,v)=>s+num(v.total),0);
const ingresoMesAnterior=ventasMesAnterior.reduce((s,v)=>s+num(v.total),0);
const utilidadMes=ventasMes.reduce((s,v)=>s+num(v.ganancia),0);
const comprasPagadasMes=compras.filter(c=>mismoMes(fechaValida(c.fecha??c.creado),ahora)&&estaPagada(c)).reduce((s,c)=>s+montoCompra(c),0);
const gastosMes=gastos.filter(g=>mismoMes(fechaValida(g.fecha??g.creado),ahora)).reduce((s,g)=>s+montoGasto(g),0);
const devolucionesMes=devoluciones.filter(d=>mismoMes(fechaValida(d.fecha??d.creado),ahora)).reduce((s,d)=>s+num(d.monto),0);
const pagosApartadosMes=apartados.reduce((s,a)=>{
  const pagos=Array.isArray(a.pagos)?a.pagos:[];
  return s+pagos.filter(p=>mismoMes(fechaValida(p.fecha),ahora)).reduce((x,p)=>x+num(p.monto),0);
},0);
const flujoMes=ingresoMes+pagosApartadosMes-comprasPagadasMes-gastosMes-devolucionesMes;
const margen=ingresoMes?utilidadMes/ingresoMes*100:0;

function tendencia(actual, previo, id){
  const el=$(id); if(!el) return;
  if(previo<=0){ el.textContent=actual>0?"Nuevo":"—"; el.className="trend neutral"; return; }
  const p=(actual-previo)/previo*100;
  el.textContent=`${p>=0?"↑":"↓"} ${Math.abs(p).toFixed(1)}%`;
  el.className=`trend ${p>=0?"up":"down"}`;
}
function set(id,val){ if($(id)) $(id).textContent=val; }

const hora=ahora.getHours();
set("saludo",hora<12?"Buenos días":hora<19?"Buenas tardes":"Buenas noches");
set("fechaActual",ahora.toLocaleDateString("es-MX",{weekday:"long",day:"2-digit",month:"long"}));
set("ventasHoy",dinero(ingresoHoy)); set("ventasHoyDetalle",`${ventasHoy.length} ${ventasHoy.length===1?"operación":"operaciones"}`);
set("ventasMes",dinero(ingresoMes)); set("ventasMesDetalle",`${ventasMes.length} ${ventasMes.length===1?"operación":"operaciones"}`);
set("utilidadMes",dinero(utilidadMes)); set("margenMes",`${margen.toFixed(1)}%`);
set("flujoMes",dinero(flujoMes)); set("centroFlujo",dinero(flujoMes)); set("resultadoMes",dinero(flujoMes));
set("flujoEstado",flujoMes>0?"Positivo":flujoMes<0?"Negativo":"Sin cambio");
$("flujoEstado").className=`trend ${flujoMes>0?"up":flujoMes<0?"down":"neutral"}`;
tendencia(ingresoHoy,ingresoAyer,"tendenciaHoy");
tendencia(ingresoMes,ingresoMesAnterior,"tendenciaMes");

const stockTotal=listaProductos.reduce((s,p)=>s+Math.max(0,num(p.stock)),0);
const activos=listaProductos.filter(p=>num(p.stock)>0).length;
set("unidadesStock",stockTotal.toLocaleString("es-MX")); set("productosActivos",`${activos} productos activos`);

const vencidas=cuentas.filter(c=>{
  const saldo=saldoCuenta(c), venc=fechaValida(c.fechaVencimiento??c.vencimiento);
  return saldo>0&&venc&&inicioDia(venc)<inicioDia(ahora);
});
set("carteraVencida",dinero(vencidas.reduce((s,c)=>s+saldoCuenta(c),0)));
set("cuentasVencidas",`${vencidas.length} cuentas vencidas`);

const apartadosActivos=apartados.filter(activoApartado);
set("saldoApartados",dinero(apartadosActivos.reduce((s,a)=>s+saldoApartado(a),0)));
set("apartadosActivos",`${apartadosActivos.length} apartados activos`);
set("clientesTotal",clientes.length.toLocaleString("es-MX"));
set("clientesNuevos",`${clientes.filter(c=>mismoMes(fechaValida(c.creado??c.fechaRegistro),ahora)).length} nuevos este mes`);

const tabla=$("tablaUltimasVentas");
tabla.innerHTML=ventas.length?ventas.slice(0,7).map(v=>`
<tr><td><span class="folio">${esc(v.folio??v.id??"Venta")}</span><small class="d-block text-muted">${fechaCorta(v.fecha)}</small></td>
<td>${esc(v.cliente||"Público general")}</td>
<td>${itemsVenta(v).reduce((s,i)=>s+num(i.cantidad),0)} unidades</td>
<td>${esc(v.metodoPago||v.pago||"Sin especificar")}</td>
<td class="text-end amount">${dinero(v.total)}</td></tr>`).join(""):'<tr><td colspan="5" class="empty-state">Aún no hay ventas registradas.</td></tr>';

const ranking={};
ventasMes.forEach(v=>itemsVenta(v).forEach(i=>{
  const k=String(i.productoId??i.sku??i.producto);
  ranking[k]??={nombre:i.producto||"Producto",cantidad:0,ingresos:0};
  ranking[k].cantidad+=num(i.cantidad); ranking[k].ingresos+=num(i.importe);
}));
const top=Object.values(ranking).sort((a,b)=>b.cantidad-a.cantidad).slice(0,5);
$("listaMasVendidos").innerHTML=top.length?top.map((r,i)=>`<div class="rank-item"><span class="rank-number">${i+1}</span><div class="rank-info"><strong>${esc(r.nombre)}</strong><small>${r.cantidad} unidades vendidas</small></div><div class="rank-value"><strong>${dinero(r.ingresos)}</strong></div></div>`).join(""):'<div class="empty-state">Sin ventas este mes.</div>';

const criticos=listaProductos.filter(p=>num(p.stock)<=num(p.stockMinimo??0)).sort((a,b)=>num(a.stock)-num(b.stock)).slice(0,6);
$("listaStockBajo").innerHTML=criticos.length?criticos.map((p,i)=>`<div class="rank-item"><span class="rank-number">${num(p.stock)}</span><div class="rank-info"><strong>${esc(p.nombre)}</strong><small>${num(p.stock)===0?"Agotado":`Mínimo recomendado: ${num(p.stockMinimo)}`}</small></div><div class="rank-value"><strong>${esc(p.sku||"")}</strong></div></div>`).join(""):'<div class="empty-state">Inventario sin productos críticos.</div>';

const eventos=[];
cuentas.filter(c=>saldoCuenta(c)>0).forEach(c=>eventos.push({tipo:"Cobranza",nombre:c.cliente||c.nombre||"Cliente",fecha:fechaValida(c.fechaVencimiento??c.vencimiento),monto:saldoCuenta(c),url:"cuentas-cobrar.html"}));
apartadosActivos.forEach(a=>eventos.push({tipo:"Apartado",nombre:a.cliente||"Público general",fecha:fechaValida(a.fechaVencimiento??a.vencimiento),monto:saldoApartado(a),url:"apartados.html"}));
eventos.sort((a,b)=>(a.fecha?.getTime()??Infinity)-(b.fecha?.getTime()??Infinity));
$("listaVencimientos").innerHTML=eventos.length?eventos.slice(0,6).map((e,i)=>{
  const dias=e.fecha?Math.ceil((inicioDia(e.fecha)-inicioDia(ahora))/86400000):null;
  const texto=dias===null?"Sin fecha":dias<0?`${Math.abs(dias)} días vencido`:dias===0?"Vence hoy":dias===1?"Vence mañana":`Vence en ${dias} días`;
  return `<a href="${e.url}" class="rank-item"><span class="rank-number">${i+1}</span><div class="rank-info"><strong>${esc(e.tipo)} · ${esc(e.nombre)}</strong><small>${texto}</small></div><div class="rank-value"><strong>${dinero(e.monto)}</strong></div></a>`;
}).join(""):'<div class="empty-state">No hay vencimientos pendientes.</div>';

const alertas=[];
if(criticos.some(p=>num(p.stock)===0)) alertas.push({icon:"bi-x-octagon-fill",color:"red",titulo:"Productos agotados",detalle:`${criticos.filter(p=>num(p.stock)===0).length} productos requieren reposición`,url:"admin.html"});
if(vencidas.length) alertas.push({icon:"bi-credit-card-2-front-fill",color:"red",titulo:"Cuentas vencidas",detalle:`${vencidas.length} cuentas suman ${dinero(vencidas.reduce((s,c)=>s+saldoCuenta(c),0))}`,url:"cuentas-cobrar.html"});
const proximos=apartadosActivos.filter(a=>{const f=fechaValida(a.fechaVencimiento??a.vencimiento); if(!f)return false; const d=Math.ceil((inicioDia(f)-inicioDia(ahora))/86400000); return d>=0&&d<=7;});
if(proximos.length) alertas.push({icon:"bi-bookmark-star-fill",color:"amber",titulo:"Apartados por vencer",detalle:`${proximos.length} vencen en los próximos 7 días`,url:"apartados.html"});
const pendientesCompras=compras.filter(c=>!estaPagada(c));
if(pendientesCompras.length) alertas.push({icon:"bi-bag-exclamation-fill",color:"amber",titulo:"Compras pendientes",detalle:`Saldo estimado ${dinero(pendientesCompras.reduce((s,c)=>s+montoCompra(c),0))}`,url:"compras.html"});
if(flujoMes<0) alertas.push({icon:"bi-graph-down-arrow",color:"red",titulo:"Flujo mensual negativo",detalle:`El resultado actual es ${dinero(flujoMes)}`,url:"gastos.html"});
if(!alertas.length) alertas.push({icon:"bi-check-circle-fill",color:"green",titulo:"Todo bajo control",detalle:"No hay alertas críticas en este momento",url:"dashboard.html"});
set("alertasTotal",alertas.filter(a=>a.color!=="green").length);
$("listaAlertas").innerHTML=alertas.map(a=>`<div class="alert-item"><span class="alert-icon ${a.color}"><i class="bi ${a.icon}"></i></span><div><strong>${a.titulo}</strong><small>${a.detalle}</small></div><a href="${a.url}"><i class="bi bi-chevron-right"></i></a></div>`).join("");

const dias=[];
for(let i=13;i>=0;i--){const d=new Date(ahora);d.setDate(d.getDate()-i);dias.push(d);}
new Chart($("graficaVentas"),{
  type:"line",
  data:{labels:dias.map(d=>d.toLocaleDateString("es-MX",{day:"2-digit",month:"short"})),datasets:[{label:"Ventas",data:dias.map(d=>ventas.filter(v=>mismoDia(fechaValida(v.fecha),d)).reduce((s,v)=>s+num(v.total),0)),borderWidth:3,tension:.35,fill:true,pointRadius:3}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>dinero(c.raw)}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>dinero(v)},grid:{color:"rgba(148,163,184,.12)"}},x:{grid:{display:false}}}}
});
const flujoDatos=[ingresoMes+pagosApartadosMes,comprasPagadasMes,gastosMes,devolucionesMes];
new Chart($("graficaFlujo"),{
  type:"doughnut",
  data:{labels:["Ingresos","Compras","Gastos","Devoluciones"],datasets:[{data:flujoDatos,borderWidth:0}]},
  options:{responsive:true,maintainAspectRatio:false,cutout:"72%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${dinero(c.raw)}`}}}}
});
$("leyendaFlujo").innerHTML=["Ingresos","Compras pagadas","Gastos","Devoluciones"].map((n,i)=>`<div class="flow-row"><span class="flow-label"><span class="flow-dot"></span>${n}</span><strong>${dinero(flujoDatos[i])}</strong></div>`).join("");

const sidebar=$("sidebar"), backdrop=$("sidebarBackdrop");
$("btnAbrirSidebar").onclick=()=>{sidebar.classList.add("open");backdrop.classList.add("show")};
const cerrar=()=>{sidebar.classList.remove("open");backdrop.classList.remove("show")};
$("btnCerrarSidebar").onclick=cerrar; backdrop.onclick=cerrar;
})();