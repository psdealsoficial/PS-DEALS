(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const readArray = key => { try { const v=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(v)?v:[]; } catch { return []; } };
  const bytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(2)} MB`;
  function localState(){
    $("localProducts").textContent=`${readArray("psdeals_productos").length} en caché`;
    $("localClients").textContent=`${readArray("psdeals_clientes").length} en caché`;
    try { const x=JSON.parse(localStorage.getItem("psdeals_sync_v410")||"null"); $("localResult").textContent=x ? (x.ok?"Correcto":"Error") : "Sin registro"; if(x?.fecha) $("lastSync").textContent=new Date(x.fecha).toLocaleString("es-MX"); } catch {}
  }
  async function refresh(){
    localState();
    try {
      const [health,stats,status,system]=await Promise.all([PSApi.health(),PSApi.stats(),PSApi.syncStatus(),PSApi.systemStatus()]);
      $("serverState").textContent=health.ok?"Activo":"Con problema"; $("serverDetail").textContent=location.origin;
      $("dbState").textContent=health.database.connected?"Conectado":"Desconectado"; $("dbDetail").textContent=health.database.engine;
      $("dbProducts").textContent=status.counts.productos; $("dbClients").textContent=status.counts.clientes;
      $("syncMode").textContent="SQLite principal + caché"; $("sourceTruth").textContent="SQLite (productos y clientes)";
      $("serverMemory").textContent=bytes(system.memory.rss); $("serverUptime").textContent=`Activo ${Math.floor(system.uptimeSeconds/60)} min`;
      $("dataSource").textContent="SQLite";
      if(status.last?.fecha) $("lastSync").textContent=new Date(status.last.fecha+"Z").toLocaleString("es-MX");
      $("dbPath").textContent=health.database.path; $("sqliteVersion").textContent=health.database.sqliteVersion;
      $("migrationCount").textContent=health.database.migrationCount; $("dbSize").textContent=bytes(stats.sizeBytes);
      $("auditCount").textContent=stats.counts.auditoria ?? "—";
    } catch(error){ $("serverState").textContent="Sin conexión"; $("dbState").textContent="No disponible"; $("syncMessage").className="notice bad mt-3"; $("syncMessage").textContent=`No se pudo consultar el servidor: ${error.message}`; }
  }
  $("btnSync").addEventListener("click", async()=>{ const btn=$("btnSync"); btn.disabled=true; $("syncMessage").textContent="Guardando caché actual en SQLite…"; const result=await PSSQLiteSync.push("panel-servidor"); if(result){$("syncMessage").className="notice ok mt-3";$("syncMessage").textContent=`Guardado correcto: ${result.synced.productos} productos y ${result.synced.clientes} clientes en ${result.durationMs} ms.`;}else{$("syncMessage").className="notice bad mt-3";$("syncMessage").textContent="No se pudo guardar. Revisa que npm start siga activo.";}btn.disabled=false;refresh();});
  $("btnApiTests").addEventListener("click",async()=>{const box=$("apiTests");box.innerHTML="Ejecutando…";try{const r=await PSApi.tests();box.innerHTML=`<div class="notice ${r.ok?'ok':'bad'}">${r.passed}/${r.total} pruebas API correctas en ${r.durationMs} ms.</div>`+r.tests.map(t=>`<div class="line"><span>${t.ok?'✅':'❌'} ${t.name}</span><strong>${t.detail}</strong></div>`).join("");}catch(e){box.innerHTML=`<div class="notice bad">${e.message}</div>`;}});
  window.addEventListener("psdeals:sqlite-sync",refresh); refresh();
})();
