(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let payload = null;
  const readArray = key => { try { const x = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(x) ? x : []; } catch { return []; } };
  const badge = (text, cls) => `<span class="badge-state ${cls}">${text}</span>`;
  function setStep(n) { document.querySelectorAll('.step').forEach((el,i)=>el.classList.toggle('active',i===n-1)); }
  function log(message) { $('migrationLog').textContent += `${new Date().toLocaleTimeString('es-MX')}  ${message}\n`; }
  function collect() {
    payload = { productos: readArray('psdeals_productos'), clientes: readArray('psdeals_clientes') };
    $('localProducts').textContent = payload.productos.length; $('localClients').textContent = payload.clientes.length;
    $('sourceStatus').innerHTML = badge('Datos leídos','ok'); $('btnValidate').disabled = false; setStep(1);
    log(`localStorage: ${payload.productos.length} productos y ${payload.clientes.length} clientes.`);
  }
  async function serverStatus() {
    try { const health = await PSApi.health(); const status = await PSApi.migrationStatus();
      $('serverStatus').innerHTML = badge(health.database.connected ? 'Conectado':'Sin conexión', health.database.connected?'ok':'bad');
      $('dbProducts').textContent=status.counts.productos; $('dbClients').textContent=status.counts.clientes;
      $('dbStatus').innerHTML=badge('SQLite disponible','ok');
      if(status.last) $('lastMigration').textContent=new Date(status.last.fecha+'Z').toLocaleString('es-MX');
    } catch(error){ $('serverStatus').innerHTML=badge('No disponible','bad'); $('dbStatus').innerHTML=badge('Inicia npm start','bad'); log(`ERROR servidor: ${error.message}`); }
  }
  async function validate() {
    if (!payload) collect(); $('btnValidate').disabled=true;
    try { setStep(2); log('Validando registros antes de escribir en SQLite...'); const result=await PSApi.migrationPreview(payload);
      $('validProducts').textContent=result.valid.productos; $('validClients').textContent=result.valid.clientes;
      $('validationStatus').innerHTML=badge(result.ok?'Validación correcta':'Revisión necesaria',result.ok?'ok':'bad');
      $('issues').innerHTML=result.issues.length?result.issues.map(i=>`<div class="status-line"><span>${i.entity}: ${i.field}</span>${badge(`${i.count} ${i.type==='error'?'errores':'avisos'}`,i.type==='error'?'bad':'warn')}</div>`).join(''):'<div class="safety">No se detectaron registros inválidos. La migración puede continuar.</div>';
      $('btnMigrate').disabled=!result.ok; log(`Validación terminada: ${result.valid.productos} productos y ${result.valid.clientes} clientes válidos.`);
    } catch(error){ $('validationStatus').innerHTML=badge('Error','bad'); log(`ERROR validación: ${error.message}`); }
    finally{$('btnValidate').disabled=false;}
  }
  async function migrate() {
    if(!payload || !confirm('Se creará un respaldo automático y se copiarán Productos y Clientes a SQLite. localStorage NO será eliminado. ¿Continuar?')) return;
    $('btnMigrate').disabled=true; setStep(3); log('Creando respaldo y ejecutando transacción SQLite...');
    try { const result=await PSApi.migrationRun(payload); setStep(4);
      $('migrationStatus').innerHTML=badge('Completada','ok'); $('dbProducts').textContent=result.database.productos; $('dbClients').textContent=result.database.clientes;
      $('resultBox').innerHTML=`<div class="safety"><strong>Migración completada.</strong><br>Productos copiados: ${result.imported.productos}<br>Clientes copiados: ${result.imported.clientes}<br>Respaldo: <code>${result.backup}</code><br>Tiempo: ${result.durationMs} ms<br>localStorage conservado: Sí</div>`;
      localStorage.setItem('psdeals_migracion_v401_resultado',JSON.stringify({fecha:new Date().toISOString(),...result}));
      log(`OK: SQLite contiene ${result.database.productos} productos y ${result.database.clientes} clientes.`); log(`Respaldo automático: ${result.backup}`);
    } catch(error){ $('migrationStatus').innerHTML=badge('Falló','bad'); log(`ERROR migración: ${error.message}`); $('btnMigrate').disabled=false; }
  }
  $('btnCollect').addEventListener('click',collect); $('btnValidate').addEventListener('click',validate); $('btnMigrate').addEventListener('click',migrate); $('btnRefresh').addEventListener('click',serverStatus);
  collect(); serverStatus();
})();