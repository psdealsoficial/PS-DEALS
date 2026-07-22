(() => {
  "use strict";
  if (window.PSSQLiteSync) return;
  const KEYS = new Set(["psdeals_productos", "psdeals_clientes"]);
  const originalSetItem = Storage.prototype.setItem;
  let timer = null;
  let syncing = false;
  const readArray = key => {
    try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  async function push(reason = "manual") {
    if (syncing || !window.PSApi) return null;
    syncing = true;
    try {
      const result = await PSApi.syncPush({ productos: readArray("psdeals_productos"), clientes: readArray("psdeals_clientes"), reason });
      originalSetItem.call(localStorage, "psdeals_sync_v410", JSON.stringify({ ok: true, fecha: new Date().toISOString(), reason, ...result }));
      window.dispatchEvent(new CustomEvent("psdeals:sqlite-sync", { detail: result }));
      return result;
    } catch (error) {
      originalSetItem.call(localStorage, "psdeals_sync_v410", JSON.stringify({ ok: false, fecha: new Date().toISOString(), reason, error: error.message }));
      window.dispatchEvent(new CustomEvent("psdeals:sqlite-sync-error", { detail: { error: error.message } }));
      return null;
    } finally { syncing = false; }
  }
  function schedule(reason) {
    clearTimeout(timer);
    timer = setTimeout(() => push(reason), 450);
  }
  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (this === localStorage && KEYS.has(String(key))) schedule(`cambio:${key}`);
  };
  window.PSSQLiteSync = { push, status: () => window.PSApi?.syncStatus(), mode: "sqlite-primary-cache" };
  window.addEventListener("load", () => setTimeout(() => push("inicio"), 700), { once: true });
})();
