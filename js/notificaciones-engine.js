(() => {
"use strict";

const STORAGE_LEIDAS = "psdeals_notificaciones_leidas";
const STORAGE_CFG = "psdeals_notificaciones_config";

const leer = (k, respaldo=[]) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? respaldo;
  } catch {
    return respaldo;
  }
};

const num = n => Number(n || 0);
const fecha = v => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const inicioDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const mismoDia = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const mismoMes = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth();

const defaults = {
  stock: true,
  cobranza: true,
  apartados: true,
  flujo: true,
  ventas: true,
  diasSinVenta: 30
};

function configuracion() {
  return { ...defaults, ...leer(STORAGE_CFG, {}) };
}

function guardarConfiguracion(cfg) {
  localStorage.setItem(STORAGE_CFG, JSON.stringify({ ...defaults, ...cfg }));
}

function idsLeidos() {
  return new Set(leer(STORAGE_LEIDAS, []));
}

function marcarLeida(id) {
  const ids = idsLeidos();
  ids.add(String(id));
  localStorage.setItem(STORAGE_LEIDAS, JSON.stringify([...ids]));
}

function marcarTodas(ids) {
  const actuales = idsLeidos();
  ids.forEach(id => actuales.add(String(id)));
  localStorage.setItem(STORAGE_LEIDAS, JSON.stringify([...actuales]));
}

function saldoCuenta(c) {
  return Math.max(0, num(c.saldo ?? c.saldoPendiente ?? (num(c.montoOriginal ?? c.monto) - num(c.pagado ?? c.abonado ?? c.anticipo))));
}

function saldoApartado(a) {
  return Math.max(0, num(a.saldo ?? a.saldoPendiente ?? (num(a.total) - num(a.pagado ?? a.anticipo))));
}

function apartadoActivo(a) {
  const e = String(a.estado || "Activo").toLowerCase();
  return !e.includes("liquid") && !e.includes("cancel");
}

function montoCompra(c) {
  return num(c.total ?? c.monto ?? (Array.isArray(c.items) ? c.items.reduce((s,i)=>s+num(i.cantidad)*num(i.costoUnitario ?? i.costo),0) : 0));
}

function compraPagada(c) {
  return String(c.estadoPago ?? c.estado ?? "").toLowerCase().includes("pag");
}

function itemsVenta(v) {
  if (Array.isArray(v.items) && v.items.length) return v.items;
  return [{ productoId:v.productoId, producto:v.producto || "Producto", cantidad:num(v.cantidad), importe:num(v.total) }];
}

function obtenerNotificaciones() {
  const cfg = configuracion();
  const ahora = new Date();
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate()-1);

  const ventas = leer("psdeals_ventas", []);
  const compras = leer("psdeals_compras", []);
  const gastos = leer("psdeals_gastos", []);
  const cuentas = leer("psdeals_cuentas_cobrar", []);
  const apartados = leer("psdeals_apartados", []);
  const productosLocal = typeof productos !== "undefined" && Array.isArray(productos) ? productos : [];
  const leidas = idsLeidos();
  const avisos = [];

  const agregar = aviso => {
    aviso.id = String(aviso.id);
    aviso.leida = leidas.has(aviso.id);
    aviso.creada = aviso.creada || new Date().toISOString();
    avisos.push(aviso);
  };

  if (cfg.stock) {
    productosLocal
      .filter(p => num(p.stock) <= num(p.stockMinimo ?? 0))
      .forEach(p => {
        const agotado = num(p.stock) <= 0;
        agregar({
          id: `stock-${p.id ?? p.sku ?? p.nombre}-${num(p.stock)}`,
          tipo: agotado ? "critica" : "advertencia",
          categoria: "Inventario",
          titulo: agotado ? "Producto agotado" : "Stock bajo",
          detalle: agotado
            ? `${p.nombre} no tiene unidades disponibles.`
            : `${p.nombre} tiene ${num(p.stock)} unidades; mínimo recomendado: ${num(p.stockMinimo)}.`,
          icono: agotado ? "bi-x-octagon-fill" : "bi-box-seam-fill",
          url: "admin.html",
          entidad: p.nombre
        });
      });
  }

  if (cfg.cobranza) {
    cuentas.forEach(c => {
      const saldo = saldoCuenta(c);
      const venc = fecha(c.fechaVencimiento ?? c.vencimiento);
      if (saldo <= 0 || !venc) return;
      const dias = Math.floor((inicioDia(ahora)-inicioDia(venc))/86400000);
      if (dias >= 0) {
        agregar({
          id: `cobranza-${c.id ?? c.folio ?? c.cliente}-${venc.toISOString().slice(0,10)}`,
          tipo: dias > 7 ? "critica" : "advertencia",
          categoria: "Cobranza",
          titulo: dias === 0 ? "Cuenta vence hoy" : "Cuenta vencida",
          detalle: `${c.cliente || c.nombre || "Cliente"} debe ${saldo.toLocaleString("es-MX",{style:"currency",currency:"MXN"})}${dias ? ` y lleva ${dias} días vencida` : ""}.`,
          icono: "bi-credit-card-2-front-fill",
          url: "cuentas-cobrar.html",
          entidad: c.cliente || c.nombre || ""
        });
      }
    });
  }

  if (cfg.apartados) {
    apartados.filter(apartadoActivo).forEach(a => {
      const f = fecha(a.fechaVencimiento ?? a.vencimiento);
      if (!f) return;
      const dias = Math.ceil((inicioDia(f)-inicioDia(ahora))/86400000);
      if (dias <= 7) {
        const vencido = dias < 0;
        agregar({
          id: `apartado-${a.id ?? a.folio ?? a.cliente}-${f.toISOString().slice(0,10)}`,
          tipo: vencido ? "critica" : "advertencia",
          categoria: "Apartados",
          titulo: vencido ? "Apartado vencido" : dias === 0 ? "Apartado vence hoy" : "Apartado próximo a vencer",
          detalle: `${a.cliente || "Público general"} tiene saldo de ${saldoApartado(a).toLocaleString("es-MX",{style:"currency",currency:"MXN"})}${vencido ? `; venció hace ${Math.abs(dias)} días` : dias === 0 ? "" : `; vence en ${dias} días`}.`,
          icono: "bi-bookmark-star-fill",
          url: "apartados.html",
          entidad: a.cliente || ""
        });
      }
    });
  }

  if (cfg.flujo) {
    const ventasMes = ventas.filter(v => mismoMes(fecha(v.fecha), ahora)).reduce((s,v)=>s+num(v.total),0);
    const gastosMes = gastos.filter(g => mismoMes(fecha(g.fecha ?? g.creado), ahora)).reduce((s,g)=>s+num(g.monto ?? g.total),0);
    const comprasMes = compras.filter(c => mismoMes(fecha(c.fecha ?? c.creado), ahora) && compraPagada(c)).reduce((s,c)=>s+montoCompra(c),0);
    const flujo = ventasMes - gastosMes - comprasMes;
    if (flujo < 0) {
      agregar({
        id: `flujo-${ahora.getFullYear()}-${ahora.getMonth()+1}`,
        tipo: "critica",
        categoria: "Flujo de caja",
        titulo: "Flujo mensual negativo",
        detalle: `Las salidas superan las entradas por ${Math.abs(flujo).toLocaleString("es-MX",{style:"currency",currency:"MXN"})}.`,
        icono: "bi-graph-down-arrow",
        url: "gastos.html"
      });
    }
  }

  if (cfg.ventas) {
    const hoyTotal = ventas.filter(v=>mismoDia(fecha(v.fecha),ahora)).reduce((s,v)=>s+num(v.total),0);
    const ayerTotal = ventas.filter(v=>mismoDia(fecha(v.fecha),ayer)).reduce((s,v)=>s+num(v.total),0);
    if (hoyTotal > ayerTotal && hoyTotal > 0) {
      const mejora = ayerTotal > 0 ? ((hoyTotal-ayerTotal)/ayerTotal*100) : 100;
      agregar({
        id: `ventas-mejora-${ahora.toISOString().slice(0,10)}`,
        tipo: "oportunidad",
        categoria: "Ventas",
        titulo: "Ventas por encima de ayer",
        detalle: `Hoy llevas ${hoyTotal.toLocaleString("es-MX",{style:"currency",currency:"MXN"})}, una mejora de ${mejora.toFixed(1)}%.`,
        icono: "bi-graph-up-arrow",
        url: "ventas.html"
      });
    }

    const ventasPorProducto = new Map();
    ventas.forEach(v => {
      const f = fecha(v.fecha);
      if (!f) return;
      itemsVenta(v).forEach(i => {
        const key = String(i.productoId ?? i.sku ?? i.producto);
        const actual = ventasPorProducto.get(key);
        if (!actual || f > actual) ventasPorProducto.set(key, f);
      });
    });

    productosLocal.forEach(p => {
      const key = String(p.id ?? p.sku ?? p.nombre);
      const ultima = ventasPorProducto.get(key);
      if (!ultima || num(p.stock) <= 0) return;
      const dias = Math.floor((inicioDia(ahora)-inicioDia(ultima))/86400000);
      if (dias >= num(cfg.diasSinVenta)) {
        agregar({
          id: `sinventa-${key}-${num(cfg.diasSinVenta)}`,
          tipo: "informativa",
          categoria: "Ventas",
          titulo: "Producto sin movimiento",
          detalle: `${p.nombre} lleva ${dias} días sin venderse y aún tiene ${num(p.stock)} unidades.`,
          icono: "bi-hourglass-split",
          url: "admin.html",
          entidad: p.nombre
        });
      }
    });
  }

  const orden = { critica:0, advertencia:1, oportunidad:2, informativa:3 };
  return avisos.sort((a,b) => Number(a.leida)-Number(b.leida) || orden[a.tipo]-orden[b.tipo] || a.titulo.localeCompare(b.titulo));
}

window.PSNotificaciones = {
  obtener: obtenerNotificaciones,
  marcarLeida,
  marcarTodas,
  configuracion,
  guardarConfiguracion
};
})();