const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js';
let js = fs.readFileSync(path, 'utf8');

// 1. Añadir el tab
const targetTab = `<button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-analytics" style="color: #6366f1;">💡 Asesor Espía</button>`;
const replacementTab = `<button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-casa">🏠 Construcciones</button>
        <button type="button" class="ei-tab-btn tab-btn" data-tab="ei-tab-analytics" style="color: #6366f1;">💡 Asesor Espía</button>`;
js = js.replace(targetTab, replacementTab);

// 2. Extraer valor actual de casa (si lo hay) de metadata o de donde esté guardado
const targetExt = `let region = record.region || '';`;
const replacementExt = `let region = record.region || '';
  let meta = {};
  try { meta = typeof record.metadata === 'string' ? JSON.parse(record.metadata) : (record.metadata || {}); } catch(e){}
  let sup_casa = record.superficie_construida_m2 || meta.superficie_casa_m2 || '';
  let dorm_casa = record.dormitorios || meta.dormitorios || '';
  let banos_casa = record.banos || meta.banos || '';`;
js = js.replace(targetExt, replacementExt);

// 3. Insertar panel
const targetPanel = `<div id="ei-tab-analytics" class="ei-panel tab-panel">`;
const replacementPanel = `<div id="ei-tab-casa" class="ei-panel tab-panel">
            <div class="ei-form-grid">
              <div class="ei-form-group full-width">
                <label>Propiedad con construcciones</label>
                <p style="font-size:0.85rem; color:#64748b; margin-top:2px; margin-bottom:8px;">Si la parcela incluye una casa, ingresa los metros cuadrados. El motor TPL tasará la construcción a $650.000 x m2 y lo sumará al valor de la tierra.</p>
              </div>
              <div class="ei-form-group">
                <label>Superficie Construida (m2)</label>
                <input type="number" id="ei-sup-casa" value="\${sup_casa}" placeholder="Ej. 120">
              </div>
              <div class="ei-form-group">
                <label>Dormitorios</label>
                <input type="number" id="ei-dorm-casa" value="\${dorm_casa}" placeholder="Ej. 3">
              </div>
              <div class="ei-form-group">
                <label>Baños</label>
                <input type="number" step="0.5" id="ei-banos-casa" value="\${banos_casa}" placeholder="Ej. 2">
              </div>
            </div>
          </div>
          
          <div id="ei-tab-analytics" class="ei-panel tab-panel">`;
js = js.replace(targetPanel, replacementPanel);

// 4. Leer los campos al guardar
const targetSave1 = `estado: document.getElementById('ei-estado')?.value,`;
const replacementSave1 = `estado: document.getElementById('ei-estado')?.value,
    superficie_construida_m2: Number(document.getElementById('ei-sup-casa')?.value) || null,`;
js = js.replace(targetSave1, replacementSave1);

// Y guardar en metadata
const targetSave2 = `payload.metadata.comuna = payload.comuna;`;
const replacementSave2 = `payload.metadata.comuna = payload.comuna;
    payload.metadata.superficie_casa_m2 = Number(document.getElementById('ei-sup-casa')?.value) || 0;
    payload.metadata.dormitorios = Number(document.getElementById('ei-dorm-casa')?.value) || 0;
    payload.metadata.banos = Number(document.getElementById('ei-banos-casa')?.value) || 0;`;
js = js.replace(targetSave2, replacementSave2);

fs.writeFileSync(path, js);
console.log('Fixed editor-integral.js for casas');
