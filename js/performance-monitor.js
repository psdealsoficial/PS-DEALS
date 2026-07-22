(() => {
  "use strict";

  const KB = 1024;
  const STORAGE_LIMIT_ESTIMATE = 5 * 1024 * 1024;

  function bytesLocalStorage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      const value = localStorage.getItem(key) || "";
      total += (key.length + value.length) * 2;
    }
    return total;
  }

  function navigationMetrics() {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (!nav) return { domReady: 0, load: 0, transfer: 0 };
    return {
      domReady: Math.max(0, Math.round(nav.domContentLoadedEventEnd)),
      load: Math.max(0, Math.round(nav.loadEventEnd || performance.now())),
      transfer: Number(nav.transferSize || 0)
    };
  }

  function storageReport() {
    const bytes = bytesLocalStorage();
    return {
      keys: localStorage.length,
      bytes,
      kb: Math.round((bytes / KB) * 10) / 10,
      percentEstimate: Math.min(100, Math.round((bytes / STORAGE_LIMIT_ESTIMATE) * 1000) / 10)
    };
  }

  function dataIntegrity() {
    const keys = [
      "psdeals_productos", "psdeals_ventas", "psdeals_clientes", "psdeals_compras",
      "psdeals_gastos", "psdeals_apartados", "psdeals_devoluciones", "psdeals_usuarios"
    ];
    const results = keys.map(key => {
      const raw = localStorage.getItem(key);
      if (raw === null) return { key, status: "missing", count: 0 };
      try {
        const parsed = JSON.parse(raw);
        return { key, status: Array.isArray(parsed) || (parsed && typeof parsed === "object") ? "ok" : "warn", count: Array.isArray(parsed) ? parsed.length : 1 };
      } catch {
        return { key, status: "bad", count: 0 };
      }
    });
    return {
      results,
      malformed: results.filter(item => item.status === "bad"),
      available: results.filter(item => item.status === "ok").length
    };
  }

  function updateVersionLabels() {
    const info = window.PSSystemInfo;
    if (!info) return;
    document.querySelectorAll(".hero-badge").forEach(el => {
      if (/PS Deals v/i.test(el.textContent || "")) {
        const icon = el.querySelector("i")?.outerHTML || "";
        el.innerHTML = `${icon}${icon ? " " : ""}PS Deals v${info.version}`;
      }
    });
  }

  const api = {
    version: "3.7.0",
    navigationMetrics,
    storageReport,
    dataIntegrity,
    report() {
      return {
        navigation: navigationMetrics(),
        storage: storageReport(),
        integrity: dataIntegrity(),
        page: location.pathname.split("/").pop() || "index.html",
        timestamp: new Date().toISOString()
      };
    }
  };

  window.PSPerformance = Object.freeze(api);
  document.addEventListener("DOMContentLoaded", updateVersionLabels, { once: true });
})();
