(() => {
  "use strict";
  if (window.PSSQLitePrimary) return;

  const originalSetItem = Storage.prototype.setItem;

  function readSync(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) return JSON.parse(xhr.responseText);
    } catch (error) {
      console.warn("SQLite primary fallback:", error.message);
    }
    return null;
  }

  function readCache(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function sameRecord(a, b) {
    if (a?.uuid && b?.uuid) return String(a.uuid) === String(b.uuid);
    return Number(a?.id) === Number(b?.id);
  }

  // SQLite almacena los datos comerciales principales. Durante la transición,
  // se conservan desde la caché los campos visuales que todavía no tienen
  // columnas propias (imagen, precio anterior, estrellas, etc.).
  function mergeProducts(sqliteRows, cachedRows) {
    return sqliteRows.map(row => {
      const cached = cachedRows.find(item => sameRecord(item, row)) || {};
      return {
        ...cached,
        ...row,
        antes: Number(cached.antes ?? row.antes ?? row.precio ?? 0),
        imagen: cached.imagen || row.imagen || "img/productos/sin-imagen.jpg",
        estrellas: Number(cached.estrellas ?? row.estrellas ?? 0),
        opiniones: Number(cached.opiniones ?? row.opiniones ?? 0),
        envio: cached.envio || row.envio || "Entrega Local",
        nuevo: Boolean(cached.nuevo ?? row.nuevo ?? false),
        destacado: Boolean(cached.destacado ?? row.destacado ?? false),
        disponible: Number(row.stock ?? cached.stock ?? 0) > 0 && row.activo !== false
      };
    });
  }

  const cachedProducts = readCache("psdeals_productos");
  const cachedClients = readCache("psdeals_clientes");
  const products = readSync("/api/catalog/products");
  const clients = readSync("/api/catalog/clients");

  if (products?.ok) {
    const merged = mergeProducts(products.productos || [], cachedProducts);
    originalSetItem.call(localStorage, "psdeals_productos", JSON.stringify(merged));
  }
  if (clients?.ok) {
    const merged = (clients.clientes || []).map(row => ({
      ...(cachedClients.find(item => sameRecord(item, row)) || {}),
      ...row
    }));
    originalSetItem.call(localStorage, "psdeals_clientes", JSON.stringify(merged));
  }

  const state = {
    active: Boolean(products?.ok && clients?.ok),
    source: products?.ok && clients?.ok ? "sqlite" : "localStorage-fallback",
    productos: products?.count ?? null,
    clientes: clients?.count ?? null,
    loadedAt: new Date().toISOString()
  };

  originalSetItem.call(localStorage, "psdeals_sqlite_primary_v412", JSON.stringify(state));
  document.documentElement.dataset.psDataSource = state.source;
  window.PSSQLitePrimary = Object.freeze(state);
})();
