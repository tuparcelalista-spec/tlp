const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');

// 1. Add definitions at the top
const regexVars = /let banos_casa = '';/g;
code = code.replace(regexVars, `let banos_casa = '';
  let casa_regularizada = '';
  let casa_antiguedad = '';
  let extras_piscina = '';
  let extras_piscina_mat = '';
  let extras_piscina_m2 = '';
  let extras_quincho = '';
  let extras_cabaña = '';
  let extras_riego = '';
`);

const regexVars2 = /banos_casa = meta\.banos \|\| '';/g;
code = code.replace(regexVars2, `banos_casa = meta.banos || '';
    casa_regularizada = meta.regularizada || '';
    casa_antiguedad = meta.antiguedad_anios || '';
    extras_piscina = meta.piscina || '';
    extras_piscina_mat = meta.piscina_mat || 'fibra';
    extras_piscina_m2 = meta.piscina_m2 || '';
    extras_quincho = meta.quincho || '';
    extras_cabaña = meta.cabana || '';
    extras_riego = meta.riego || '';
`);

// 2. Add the UI fields in ei-tab-casa
const regexUI = /<div class="ei-form-group">\s*<label>Baños<\/label>\s*<input type="number" step="0\.5" id="ei-banos-casa".*?<\/div>/m;
const newUI = `<div class="ei-form-group">
                  <label>Baños</label>
                  <input type="number" step="0.5" id="ei-banos-casa" value="\${banos_casa}" placeholder="Ej. 2">
                </div>
                
                <div class="ei-form-group full-width" style="margin-top:1rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
                  <label>Estado Legal y Antigüedad</label>
                </div>
                <div class="ei-form-group">
                  <label>¿Cuenta con Recepción Final?</label>
                  <select id="ei-casa-reg">
                    <option value="no" \${casa_regularizada === 'no' || !casa_regularizada ? 'selected' : ''}>No regularizada (-15% castigo)</option>
                    <option value="si" \${casa_regularizada === 'si' ? 'selected' : ''}>Sí, Regularizada (+10% premio)</option>
                    <option value="tramite" \${casa_regularizada === 'tramite' ? 'selected' : ''}>En trámite (Neutro)</option>
                  </select>
                </div>
                <div class="ei-form-group">
                  <label>Antigüedad (Años)</label>
                  <input type="number" id="ei-casa-ant" value="\${casa_antiguedad}" placeholder="Ej. 5">
                </div>

                <div class="ei-form-group full-width" style="margin-top:1rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
                  <label>Equipamiento y Extras (Suma Plusvalía)</label>
                </div>
                <div class="ei-form-group">
                  <label>¿Tiene Piscina?</label>
                  <select id="ei-extra-piscina">
                    <option value="no" \${extras_piscina !== 'si' ? 'selected' : ''}>No</option>
                    <option value="si" \${extras_piscina === 'si' ? 'selected' : ''}>Sí</option>
                  </select>
                </div>
                <div class="ei-form-group">
                  <label>Material Piscina</label>
                  <select id="ei-extra-piscmat">
                    <option value="fibra" \${extras_piscina_mat === 'fibra' ? 'selected' : ''}>Fibra de Vidrio (~4 UF/m2)</option>
                    <option value="hormigon" \${extras_piscina_mat === 'hormigon' ? 'selected' : ''}>Hormigón (~8 UF/m2)</option>
                  </select>
                </div>
                <div class="ei-form-group">
                  <label>Tamaño Piscina (m2)</label>
                  <input type="number" id="ei-extra-piscm2" value="\${extras_piscina_m2}" placeholder="Ej. 32 (8x4)">
                </div>

                <div class="ei-form-group">
                  <label>¿Tiene Quincho Techado?</label>
                  <select id="ei-extra-quincho">
                    <option value="no" \${extras_quincho !== 'si' ? 'selected' : ''}>No</option>
                    <option value="si" \${extras_quincho === 'si' ? 'selected' : ''}>Sí (+150 UF)</option>
                  </select>
                </div>
                <div class="ei-form-group">
                  <label>¿Tiene Cabaña / Visitas?</label>
                  <select id="ei-extra-cabana">
                    <option value="no" \${extras_cabaña !== 'si' ? 'selected' : ''}>No</option>
                    <option value="si" \${extras_cabaña === 'si' ? 'selected' : ''}>Sí (+300 UF)</option>
                  </select>
                </div>
                <div class="ei-form-group">
                  <label>Riego Automático</label>
                  <select id="ei-extra-riego">
                    <option value="no" \${extras_riego !== 'si' ? 'selected' : ''}>No</option>
                    <option value="si" \${extras_riego === 'si' ? 'selected' : ''}>Sí (+70 UF)</option>
                  </select>
                </div>`;
code = code.replace(regexUI, newUI);

// 3. Save Payload
const regexPayload = /oldMeta\.banos = Number\(document\.getElementById\('ei-banos-casa'\)\.value\) \|\| null;/g;
code = code.replace(regexPayload, `oldMeta.banos = Number(document.getElementById('ei-banos-casa').value) || null;
        oldMeta.regularizada = document.getElementById('ei-casa-reg').value;
        oldMeta.antiguedad_anios = Number(document.getElementById('ei-casa-ant').value) || 0;
        oldMeta.piscina = document.getElementById('ei-extra-piscina').value;
        oldMeta.piscina_mat = document.getElementById('ei-extra-piscmat').value;
        oldMeta.piscina_m2 = Number(document.getElementById('ei-extra-piscm2').value) || 0;
        oldMeta.quincho = document.getElementById('ei-extra-quincho').value;
        oldMeta.cabana = document.getElementById('ei-extra-cabana').value;
        oldMeta.riego = document.getElementById('ei-extra-riego').value;
`);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', code);
console.log('CRM Editor Integral updated successfully.');
