const CLAVES={
config:"psdeals_configuracion",
ventas:"psdeals_ventas",
clientes:"psdeals_clientes",
cuentas:"psdeals_cuentas_cobrar",
compras:"psdeals_compras",
proveedores:"psdeals_proveedores",
productos:"psdeals_productos",
gastos:"psdeals_gastos",
devoluciones:"psdeals_devoluciones",
apartados:"psdeals_apartados",
usuarios:"psdeals_usuarios",
bitacora:"psdeals_bitacora",
notificacionesConfig:"psdeals_notificaciones_config",
notificacionesLeidas:"psdeals_notificaciones_leidas"
};

const $=id=>document.getElementById(id);

const defaults={
negocioNombre:"PS Deals",
negocioSlogan:"Las mejores ofertas, cerca de ti",
negocioTelefono:"",
negocioCorreo:"",
negocioDireccion:"",
negocioRFC:"",
negocioWhatsApp:"",
negocioRedes:"",
negocioMoneda:"MXN",
negocioImpuesto:0,
stockMinimoDefault:3,
ticketEncabezado:"PS Deals",
ticketPie:"Gracias por tu compra.",
ticketMostrarTelefono:true,
ticketMostrarDireccion:false,
ticketTamano:"80",
ticketLogo:"img/logo/Logo.png",
ticketMostrarQR:true,
ticketMostrarCodigo:true,
ultimoRespaldo:null
};

function leerJSON(clave, respaldo){
    try{
        const valor=JSON.parse(localStorage.getItem(clave));
        return valor ?? respaldo;
    }catch{
        return respaldo;
    }
}

function guardarJSON(clave, valor){
    localStorage.setItem(clave, JSON.stringify(valor));
}

function configActual(){
    return {...defaults,...leerJSON(CLAVES.config,{})};
}

function cargarFormulario(){
    const c=configActual();

    Object.keys(defaults).forEach(clave=>{
        const elemento=$(clave);
        if(!elemento) return;

        if(elemento.type==="checkbox"){
            elemento.checked=Boolean(c[clave]);
        }else{
            elemento.value=c[clave] ?? "";
        }
    });

    actualizarUltimoRespaldo(c.ultimoRespaldo);
}

function recopilarConfig(){
    return{
        negocioNombre:$("negocioNombre").value.trim() || "PS Deals",
        negocioSlogan:$("negocioSlogan").value.trim(),
        negocioTelefono:$("negocioTelefono").value.trim(),
        negocioCorreo:$("negocioCorreo").value.trim(),
        negocioDireccion:$("negocioDireccion").value.trim(),
        negocioRFC:$("negocioRFC").value.trim().toUpperCase(),
        negocioWhatsApp:$("negocioWhatsApp").value.trim(),
        negocioRedes:$("negocioRedes").value.trim(),
        negocioMoneda:$("negocioMoneda").value,
        negocioImpuesto:Number($("negocioImpuesto").value||0),
        stockMinimoDefault:Number($("stockMinimoDefault").value||0),
        ticketEncabezado:$("ticketEncabezado").value.trim(),
        ticketPie:$("ticketPie").value.trim(),
        ticketMostrarTelefono:$("ticketMostrarTelefono").checked,
        ticketMostrarDireccion:$("ticketMostrarDireccion").checked,
        ticketTamano:$("ticketTamano").value,
        ticketLogo:$("ticketLogo").value.trim(),
        ticketMostrarQR:$("ticketMostrarQR").checked,
        ticketMostrarCodigo:$("ticketMostrarCodigo").checked,
        ultimoRespaldo:configActual().ultimoRespaldo
    };
}

function guardarConfiguracion(mostrar=true){
    guardarJSON(CLAVES.config,recopilarConfig());

    if(mostrar){
        alert("Configuración guardada correctamente.");
    }

    renderDiagnostico();
}

function descargarJSON(nombre, datos){
    const blob=new Blob(
        [JSON.stringify(datos,null,2)],
        {type:"application/json;charset=utf-8"}
    );

    const url=URL.createObjectURL(blob);
    const enlace=document.createElement("a");

    enlace.href=url;
    enlace.download=nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}

function marcaTiempo(){
    const d=new Date();

    return [
        d.getFullYear(),
        String(d.getMonth()+1).padStart(2,"0"),
        String(d.getDate()).padStart(2,"0"),
        "-",
        String(d.getHours()).padStart(2,"0"),
        String(d.getMinutes()).padStart(2,"0")
    ].join("");
}

function obtenerProductosSeguros(){
    if(Array.isArray(window.productos)){
        return window.productos;
    }

    return leerJSON(CLAVES.productos,[]);
}

function crearRespaldoCompleto(){
    guardarConfiguracion(false);

    const respaldo={
        app:"PS Deals",
        version:"2.5",
        exportadoEn:new Date().toISOString(),
        datos:{
            configuracion:configActual(),
            productos:obtenerProductosSeguros(),
            ventas:leerJSON(CLAVES.ventas,[]),
            clientes:leerJSON(CLAVES.clientes,[]),
            cuentasCobrar:leerJSON(CLAVES.cuentas,[]),
            compras:leerJSON(CLAVES.compras,[]),
            proveedores:leerJSON(CLAVES.proveedores,[]),
            gastos:leerJSON(CLAVES.gastos,[]),
            devoluciones:leerJSON(CLAVES.devoluciones,[]),
            apartados:leerJSON(CLAVES.apartados,[]),
            usuarios:leerJSON(CLAVES.usuarios,[]),
            bitacora:leerJSON(CLAVES.bitacora,[])
        }
    };

    descargarJSON(
        `ps-deals-respaldo-${marcaTiempo()}.json`,
        respaldo
    );

    const nuevaConfig={
        ...configActual(),
        ultimoRespaldo:new Date().toISOString()
    };

    guardarJSON(CLAVES.config,nuevaConfig);
    actualizarUltimoRespaldo(nuevaConfig.ultimoRespaldo);
    mostrarMensaje("Respaldo completo creado correctamente.","success");
}

function importarRespaldo(archivo){
    if(!archivo) return;

    const lector=new FileReader();

    lector.onload=evento=>{
        try{
            const respaldo=JSON.parse(evento.target.result);

            if(
                !respaldo ||
                respaldo.app!=="PS Deals" ||
                !respaldo.datos
            ){
                throw new Error("El archivo no corresponde a un respaldo válido de PS Deals.");
            }

            if(!confirm("La importación reemplazará los datos actuales. ¿Deseas continuar?")){
                $("archivoRespaldo").value="";
                return;
            }

            const d=respaldo.datos;

            if(d.configuracion) guardarJSON(CLAVES.config,d.configuracion);
            if(Array.isArray(d.ventas)) guardarJSON(CLAVES.ventas,d.ventas);
            if(Array.isArray(d.clientes)) guardarJSON(CLAVES.clientes,d.clientes);
            if(Array.isArray(d.cuentasCobrar)) guardarJSON(CLAVES.cuentas,d.cuentasCobrar);
            if(Array.isArray(d.compras)) guardarJSON(CLAVES.compras,d.compras);
            if(Array.isArray(d.proveedores)) guardarJSON(CLAVES.proveedores,d.proveedores);
            if(Array.isArray(d.gastos)) guardarJSON(CLAVES.gastos,d.gastos);
            if(Array.isArray(d.devoluciones)) guardarJSON(CLAVES.devoluciones,d.devoluciones);
            if(Array.isArray(d.apartados)) guardarJSON(CLAVES.apartados,d.apartados);
            if(Array.isArray(d.usuarios)) guardarJSON(CLAVES.usuarios,d.usuarios);
            if(Array.isArray(d.bitacora)) guardarJSON(CLAVES.bitacora,d.bitacora);

            if(Array.isArray(d.productos)){
                if(typeof guardarProductos==="function"){
                    guardarProductos(d.productos);
                }else{
                    guardarJSON(CLAVES.productos,d.productos);
                }
            }

            cargarFormulario();
            renderDiagnostico();
            mostrarMensaje("Respaldo importado. Recarga las demás páginas para ver los datos.","success");
        }catch(error){
            mostrarMensaje(error.message || "No fue posible importar el respaldo.","danger");
        }finally{
            $("archivoRespaldo").value="";
        }
    };

    lector.onerror=()=>{
        mostrarMensaje("No fue posible leer el archivo seleccionado.","danger");
    };

    lector.readAsText(archivo);
}

function mostrarMensaje(texto,tipo){
    const mensaje=$("mensajeRespaldo");
    mensaje.textContent=texto;
    mensaje.className=`alert alert-${tipo} mt-3 mb-0`;
}

function actualizarUltimoRespaldo(fecha){
    $("ultimoRespaldo").textContent=fecha
        ? new Date(fecha).toLocaleString("es-MX")
        : "Nunca";
}

function tamanoClave(clave){
    const valor=localStorage.getItem(clave) || "";
    return new Blob([valor]).size;
}

function formatoBytes(bytes){
    if(bytes<1024) return `${bytes} B`;
    if(bytes<1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/(1024*1024)).toFixed(2)} MB`;
}

function renderDiagnostico(){
    const productosActuales=obtenerProductosSeguros();
    const ventas=leerJSON(CLAVES.ventas,[]);
    const clientes=leerJSON(CLAVES.clientes,[]);
    const compras=leerJSON(CLAVES.compras,[]);
    const cuentas=leerJSON(CLAVES.cuentas,[]);
    const proveedores=leerJSON(CLAVES.proveedores,[]);
    const gastos=leerJSON(CLAVES.gastos,[]);
    const devoluciones=leerJSON(CLAVES.devoluciones,[]);
    const apartados=leerJSON(CLAVES.apartados,[]);
    const usuarios=leerJSON(CLAVES.usuarios,[]);
    const bitacora=leerJSON(CLAVES.bitacora,[]);

    const tarjetas=[
        ["Productos",productosActuales.length,formatoBytes(tamanoClave(CLAVES.productos))],
        ["Ventas",ventas.length,formatoBytes(tamanoClave(CLAVES.ventas))],
        ["Clientes",clientes.length,formatoBytes(tamanoClave(CLAVES.clientes))],
        ["Compras",compras.length,formatoBytes(tamanoClave(CLAVES.compras))],
        ["Cuentas por cobrar",cuentas.length,formatoBytes(tamanoClave(CLAVES.cuentas))],
        ["Proveedores",proveedores.length,formatoBytes(tamanoClave(CLAVES.proveedores))],
        ["Gastos",gastos.length,formatoBytes(tamanoClave(CLAVES.gastos))],
        ["Devoluciones",devoluciones.length,formatoBytes(tamanoClave(CLAVES.devoluciones))],
        ["Apartados",apartados.length,formatoBytes(tamanoClave(CLAVES.apartados))],
        ["Usuarios",usuarios.length,formatoBytes(tamanoClave(CLAVES.usuarios))],
        ["Bitácora",bitacora.length,formatoBytes(tamanoClave(CLAVES.bitacora))],
        ["Configuración",1,formatoBytes(tamanoClave(CLAVES.config))],
        ["Uso aproximado",localStorage.length,formatoBytes(
            Object.keys(localStorage).reduce(
                (total,clave)=>total+tamanoClave(clave),
                0
            )
        )]
    ];

    $("diagnosticoDatos").innerHTML=tarjetas.map(([titulo,valor,detalle])=>`
        <div class="diagnostic-card">
            <span>${titulo}</span>
            <strong>${valor}</strong>
            <small>${detalle}</small>
        </div>
    `).join("");
}

$("btnGuardarTodo").addEventListener("click",()=>guardarConfiguracion(true));
$("btnExportarTodo").addEventListener("click",crearRespaldoCompleto);

$("btnExportarVentas").addEventListener("click",()=>{
    descargarJSON(
        `ps-deals-ventas-${marcaTiempo()}.json`,
        {
            app:"PS Deals",
            tipo:"ventas",
            exportadoEn:new Date().toISOString(),
            ventas:leerJSON(CLAVES.ventas,[])
        }
    );
});

$("btnExportarInventario").addEventListener("click",()=>{
    descargarJSON(
        `ps-deals-inventario-${marcaTiempo()}.json`,
        {
            app:"PS Deals",
            tipo:"inventario",
            exportadoEn:new Date().toISOString(),
            productos:obtenerProductosSeguros()
        }
    );
});

$("archivoRespaldo").addEventListener("change",evento=>{
    importarRespaldo(evento.target.files?.[0]);
});

$("btnResetConfig").addEventListener("click",()=>{
    if(!confirm("¿Restablecer la configuración predeterminada?")) return;

    guardarJSON(CLAVES.config,{...defaults});
    cargarFormulario();
    renderDiagnostico();
    mostrarMensaje("Configuración restablecida.","warning");
});

$("btnBorrarMovimientos").addEventListener("click",()=>{
    const texto=prompt('Escribe BORRAR para eliminar ventas, clientes, compras, proveedores y cuentas por cobrar.');

    if(texto!=="BORRAR") return;

    [
        CLAVES.ventas,
        CLAVES.clientes,
        CLAVES.cuentas,
        CLAVES.compras,
        CLAVES.proveedores,
        CLAVES.gastos,
        CLAVES.devoluciones,
        CLAVES.apartados,
        CLAVES.usuarios,
        CLAVES.bitacora
    ].forEach(clave=>localStorage.removeItem(clave));

    renderDiagnostico();
    mostrarMensaje("Movimientos comerciales eliminados. El inventario se conservó.","warning");
});

$("btnBorrarTodo").addEventListener("click",()=>{
    const texto=prompt('Esta acción es irreversible. Escribe BORRAR TODO para continuar.');

    if(texto!=="BORRAR TODO") return;

    Object.values(CLAVES).forEach(clave=>localStorage.removeItem(clave));

    if(typeof guardarProductos==="function"){
        guardarProductos([]);
    }

    cargarFormulario();
    renderDiagnostico();
    mostrarMensaje("Todos los datos locales de PS Deals fueron eliminados.","danger");
});

$("btnActualizarDiagnostico").addEventListener("click",renderDiagnostico);

$("btnAbrirSidebar").addEventListener("click",()=>{
    $("sidebar").classList.add("open");
    $("sidebarBackdrop").classList.add("show");
});

function cerrarSidebar(){
    $("sidebar").classList.remove("open");
    $("sidebarBackdrop").classList.remove("show");
}

$("btnCerrarSidebar").addEventListener("click",cerrarSidebar);
$("sidebarBackdrop").addEventListener("click",cerrarSidebar);

cargarFormulario();
renderDiagnostico();
// ===== PS Deals v3.8: importación y exportación avanzada =====
let importacionCSVTemporal=null;

function escaparCSV(valor){
    if(valor===null || valor===undefined) return "";
    const texto=typeof valor==="object" ? JSON.stringify(valor) : String(valor);
    return /[",\n\r;]/.test(texto) ? `"${texto.replace(/"/g,'""')}"` : texto;
}

function descargarCSV(nombre, filas){
    if(!Array.isArray(filas) || !filas.length){
        mostrarMensaje("No hay registros para exportar.","warning");
        return;
    }
    const columnas=[...new Set(filas.flatMap(f=>Object.keys(f||{})))];
    const lineas=[columnas.map(escaparCSV).join(",")];
    filas.forEach(fila=>lineas.push(columnas.map(c=>escaparCSV(fila?.[c])).join(",")));
    const contenido="\uFEFF"+lineas.join("\r\n");
    const blob=new Blob([contenido],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function datosExportacionCSV(tipo){
    const mapa={
        productos:()=>obtenerProductosSeguros(),
        clientes:()=>leerJSON(CLAVES.clientes,[]),
        ventas:()=>leerJSON(CLAVES.ventas,[]),
        compras:()=>leerJSON(CLAVES.compras,[]),
        gastos:()=>leerJSON(CLAVES.gastos,[]),
        apartados:()=>leerJSON(CLAVES.apartados,[])
    };
    return (mapa[tipo]||(()=>[]))();
}

function detectarSeparador(texto){
    const primera=(texto.split(/\r?\n/).find(l=>l.trim())||"");
    const candidatos=[",",";","\t"];
    return candidatos.sort((a,b)=>(primera.split(b).length-primera.split(a).length))[0];
}

function parsearCSV(texto){
    const sep=detectarSeparador(texto);
    const filas=[];
    let fila=[],campo="",comillas=false;
    for(let i=0;i<texto.length;i++){
        const ch=texto[i],next=texto[i+1];
        if(ch==='"' && comillas && next==='"'){campo+='"';i++;continue;}
        if(ch==='"'){comillas=!comillas;continue;}
        if(ch===sep && !comillas){fila.push(campo);campo="";continue;}
        if((ch==='\n'||ch==='\r')&&!comillas){
            if(ch==='\r'&&next==='\n') i++;
            fila.push(campo);campo="";
            if(fila.some(v=>String(v).trim()!=="")) filas.push(fila);
            fila=[];continue;
        }
        campo+=ch;
    }
    if(campo.length||fila.length){fila.push(campo);if(fila.some(v=>String(v).trim()!=="")) filas.push(fila);}
    if(filas.length<2) throw new Error("El CSV no contiene registros suficientes.");
    const headers=filas[0].map((h,i)=>(h||`campo_${i+1}`).trim());
    return filas.slice(1).map(valores=>Object.fromEntries(headers.map((h,i)=>[h,(valores[i]??"").trim()])));
}

function normalizarNumero(valor,def=0){
    if(valor===null||valor===undefined||valor==="") return def;
    const n=Number(String(valor).replace(/[$,%\s]/g,"").replace(",","."));
    return Number.isFinite(n)?n:def;
}

function primerValor(obj,nombres){
    const entries=Object.entries(obj);
    for(const nombre of nombres){
        const match=entries.find(([k])=>k.trim().toLowerCase()===nombre.toLowerCase());
        if(match && String(match[1]).trim()!=="") return match[1];
    }
    return "";
}

function adaptarImportacion(tipo,filas){
    if(tipo==="productos"){
        return filas.map((r,i)=>({
            id:primerValor(r,["id"]) || `IMP-${Date.now()}-${i+1}`,
            nombre:primerValor(r,["nombre","producto","descripcion"]) || `Producto importado ${i+1}`,
            categoria:primerValor(r,["categoria","categoría"]) || "Sin categoría",
            descripcion:primerValor(r,["descripcion","descripción"]),
            precio:normalizarNumero(primerValor(r,["precio","precio venta","venta"])),
            antes:normalizarNumero(primerValor(r,["antes","precio anterior"])),
            costo:normalizarNumero(primerValor(r,["costo","precio costo"])),
            stock:Math.max(0,Math.trunc(normalizarNumero(primerValor(r,["stock","existencia","existencias"])))),
            stockMinimo:Math.max(0,Math.trunc(normalizarNumero(primerValor(r,["stockMinimo","stock minimo","mínimo"]),3))),
            sku:primerValor(r,["sku","codigo","código"]),
            codigoBarras:primerValor(r,["codigoBarras","codigo barras","código de barras"]),
            proveedor:primerValor(r,["proveedor"]),
            imagen:primerValor(r,["imagen"]) || "img/Productos/sin-imagen.jpg",
            disponible:String(primerValor(r,["disponible","activo"])||"true").toLowerCase()!=="false"
        })).filter(x=>x.nombre);
    }
    return filas.map((r,i)=>({
        id:primerValor(r,["id"]) || `CLI-${Date.now()}-${i+1}`,
        nombre:primerValor(r,["nombre","cliente"]) || `Cliente importado ${i+1}`,
        telefono:primerValor(r,["telefono","teléfono","celular","whatsapp"]),
        correo:primerValor(r,["correo","email"]),
        direccion:primerValor(r,["direccion","dirección","domicilio"]),
        notas:primerValor(r,["notas","observaciones"]),
        fechaRegistro:primerValor(r,["fechaRegistro","fecha registro","fecha"]) || new Date().toISOString()
    })).filter(x=>x.nombre);
}

function claveIdentidad(tipo,item){
    if(tipo==="productos") return String(item.sku||item.codigoBarras||item.id||item.nombre).trim().toLowerCase();
    return String(item.telefono||item.correo||item.id||item.nombre).trim().toLowerCase();
}

function combinarRegistros(tipo,actuales,nuevos){
    const mapa=new Map(actuales.map(x=>[claveIdentidad(tipo,x),x]));
    nuevos.forEach(x=>{
        const k=claveIdentidad(tipo,x);
        mapa.set(k,mapa.has(k)?{...mapa.get(k),...x}:x);
    });
    return [...mapa.values()];
}

function mostrarVistaPreviaImportacion(tipo,modo,datos,nombreArchivo){
    importacionCSVTemporal={tipo,modo,datos,nombreArchivo};
    const preview=$("vistaPreviaImportacion");
    const columnas=tipo==="productos"?["nombre","sku","categoria","precio","costo","stock"]:["nombre","telefono","correo","direccion"];
    $("resumenImportacion").textContent=`${datos.length} registros detectados · ${tipo} · modo ${modo} · ${nombreArchivo}`;
    $("encabezadoVistaPrevia").innerHTML=`<tr>${columnas.map(c=>`<th>${c}</th>`).join("")}</tr>`;
    $("cuerpoVistaPrevia").innerHTML=datos.slice(0,20).map(r=>`<tr>${columnas.map(c=>`<td title="${String(r[c]??"").replace(/"/g,"&quot;")}">${String(r[c]??"")}</td>`).join("")}</tr>`).join("");
    preview.classList.remove("d-none");
    preview.scrollIntoView({behavior:"smooth",block:"nearest"});
}

function cancelarImportacionCSV(){
    importacionCSVTemporal=null;
    $("archivoCSV").value="";
    $("vistaPreviaImportacion").classList.add("d-none");
}

$("btnExportarCSV")?.addEventListener("click",()=>{
    const tipo=$("tipoExportacionCSV").value;
    const filas=datosExportacionCSV(tipo);
    descargarCSV(`ps-deals-${tipo}-${marcaTiempo()}.csv`,filas);
    mostrarMensaje(`${filas.length} registros de ${tipo} exportados en CSV.`,"success");
});

$("archivoCSV")?.addEventListener("change",evento=>{
    const archivo=evento.target.files?.[0];
    if(!archivo) return;
    const tipo=$("tipoImportacionCSV").value;
    const modo=$("modoImportacionCSV").value;
    const lector=new FileReader();
    lector.onload=e=>{
        try{
            const filas=parsearCSV(String(e.target.result||""));
            const adaptadas=adaptarImportacion(tipo,filas);
            if(!adaptadas.length) throw new Error("No se detectaron registros válidos.");
            mostrarVistaPreviaImportacion(tipo,modo,adaptadas,archivo.name);
        }catch(err){
            cancelarImportacionCSV();
            mostrarMensaje(err.message||"No fue posible procesar el CSV.","danger");
        }
    };
    lector.onerror=()=>mostrarMensaje("No fue posible leer el archivo CSV.","danger");
    lector.readAsText(archivo,"utf-8");
});

$("btnCancelarImportacion")?.addEventListener("click",cancelarImportacionCSV);

$("btnAplicarImportacion")?.addEventListener("click",()=>{
    if(!importacionCSVTemporal) return;
    const {tipo,modo,datos}=importacionCSVTemporal;
    const clave=tipo==="productos"?CLAVES.productos:CLAVES.clientes;
    const actuales=tipo==="productos"?obtenerProductosSeguros():leerJSON(clave,[]);
    const finales=modo==="reemplazar"?datos:combinarRegistros(tipo,actuales,datos);
    if(!confirm(`Se guardarán ${finales.length} registros de ${tipo}. ¿Continuar?`)) return;
    if(tipo==="productos"&&typeof guardarProductos==="function") guardarProductos(finales);
    else guardarJSON(clave,finales);
    if(window.PSToast) window.PSToast(`${datos.length} registros importados correctamente.`,"success");
    mostrarMensaje(`${datos.length} registros importados. Total actual: ${finales.length}.`,"success");
    cancelarImportacionCSV();
    renderDiagnostico();
});
