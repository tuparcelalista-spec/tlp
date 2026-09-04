const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js';
let js = fs.readFileSync(path, 'utf8');

// 1. Agregar el campo materialidad a la extracción de datos
const targetExt = `let dorm_casa = record.dormitorios || meta.dormitorios || '';`;
const replacementExt = `let dorm_casa = record.dormitorios || meta.dormitorios || '';
  let materialidad_casa = record.materialidad || meta.materialidad || 'estandar';`;
js = js.replace(targetExt, replacementExt);

// 2. Modificar el panel de la casa para incluir Materialidad (y ya no darle tanta importancia a la superficie si se tasan por dormitorios)
const targetPanel = `<div class="ei-form-group">
                <label>Superficie Construida (m2)</label>
                <input type="number" id="ei-sup-casa" value="\${sup_casa}" placeholder="Ej. 120">
              </div>`;
const replacementPanel = `<div class="ei-form-group">
                <label>Materialidad / Calidad</label>
                <select id="ei-mat-casa">
                  <option value="ligera" \${materialidad_casa === 'ligera' ? 'selected' : ''}>Ligera / Básica (Madera simple)</option>
                  <option value="estandar" \${materialidad_casa === 'estandar' || !materialidad_casa ? 'selected' : ''}>Estándar / Mixta</option>
                  <option value="solida" \${materialidad_casa === 'solida' ? 'selected' : ''}>Sólida (Albañilería / Hormigón)</option>
                  <option value="premium" \${materialidad_casa === 'premium' ? 'selected' : ''}>Premium (Terminaciones Lujo)</option>
                </select>
              </div>
              <div class="ei-form-group">
                <label>Superficie Construida (m2) - Opcional</label>
                <input type="number" id="ei-sup-casa" value="\${sup_casa}" placeholder="Ej. 120">
              </div>`;
js = js.replace(targetPanel, replacementPanel);

// 3. Modificar la descripción del tab
const targetDesc = `Si la parcela incluye una casa, ingresa los metros cuadrados. El motor TPL tasará la construcción a $650.000 x m2 y lo sumará al valor de la tierra.`;
const replacementDesc = `Si la parcela incluye una casa, ingresa la cantidad de dormitorios y su materialidad. El motor TPL sumará el valor de la construcción basado en la plusvalía de la zona.`;
js = js.replace(targetDesc, replacementDesc);

// 4. Guardar materialidad en metadata
const targetSave2 = `payload.metadata.dormitorios = Number(document.getElementById('ei-dorm-casa')?.value) || 0;`;
const replacementSave2 = `payload.metadata.dormitorios = Number(document.getElementById('ei-dorm-casa')?.value) || 0;
    payload.metadata.materialidad = document.getElementById('ei-mat-casa')?.value || 'estandar';`;
js = js.replace(targetSave2, replacementSave2);

fs.writeFileSync(path, js);
console.log('Fixed editor-integral.js para tasacion por dormitorios y materialidad');
