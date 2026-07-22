(() => {
  "use strict";
  async function request(url, options = {}) {
    const response = await fetch(url, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
    let data; try { data = await response.json(); } catch { data = { ok: false, error: "Respuesta inválida del servidor" }; }
    if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
    return data;
  }
  window.PSApi = {
    get: url => request(url),
    post: (url, body) => request(url, { method: "POST", body: JSON.stringify(body) }),
    health: () => request("/api/health"),
    stats: () => request("/api/database/stats"),
    migrationPreview: payload => request("/api/migration/preview", { method: "POST", body: JSON.stringify(payload) }),
    migrationRun: payload => request("/api/migration/run", { method: "POST", body: JSON.stringify(payload) }),
    migrationStatus: () => request("/api/migration/status"),
    syncPush: payload => request("/api/sync/push", { method: "POST", body: JSON.stringify(payload) }),
    syncStatus: () => request("/api/sync/status"),
    products: () => request("/api/catalog/products"),
    saveProducts: productos => request("/api/catalog/products", { method: "PUT", body: JSON.stringify({ productos }) }),
    clients: (query = "") => request(`/api/catalog/clients${query ? `?q=${encodeURIComponent(query)}` : ""}`),
    createClient: cliente => request("/api/catalog/clients", { method: "POST", body: JSON.stringify(cliente) }),
    updateClient: (id, cliente) => request(`/api/catalog/clients/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(cliente) }),
    deleteClient: id => request(`/api/catalog/clients/${encodeURIComponent(id)}`, { method: "DELETE" }),
    saveClients: clientes => request("/api/catalog/clients", { method: "PUT", body: JSON.stringify({ clientes }) }),
    sales: () => request("/api/sales"),
    sale: id => request(`/api/sales/${encodeURIComponent(id)}`),
    createSale: venta => request("/api/sales", { method: "POST", body: JSON.stringify(venta) }),
    cancelSale: (id, motivo = "") => request(`/api/sales/${encodeURIComponent(id)}/cancel`, { method: "POST", body: JSON.stringify({ motivo }) }),
    systemStatus: () => request("/api/system/status"),
    tests: () => request("/api/tests")
  };
})();
