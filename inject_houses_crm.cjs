const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');

const targetModal = `<div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Latitud \${getWarning(payload.lat)}</label>`;

const replacementModal = `<div style="display: flex; gap: 1rem; border: 1px dashed #e2e8f0; padding: 10px; border-radius: 6px; margin-bottom: 1rem; background-color: #f8fafc;" id="cat-rev-casas-group">
                        <div class="form-group" style="flex: 1;">
                            <label>Superficie Construida (m2)</label>
                            <input type="number" id="cat-rev-sup-const" value="\${payload.superficie_construida || ''}" style="\${getStyle(payload.superficie_construida)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Dormitorios</label>
                            <input type="number" id="cat-rev-dormitorios" value="\${payload.dormitorios || ''}" style="\${getStyle(payload.dormitorios)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Baños</label>
                            <input type="number" id="cat-rev-banos" value="\${payload.banos || ''}" style="\${getStyle(payload.banos)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Material</label>
                            <input type="text" id="cat-rev-material" value="\${escapeHtml(payload.material || '')}" placeholder="Sólida, madera...">
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Latitud \${getWarning(payload.lat)}</label>`;

if (code.includes('cat-rev-casas-group')) {
    console.log('Modal already updated');
} else {
    code = code.replace(targetModal, replacementModal);
}

const targetVars = `const antiVal = document.getElementById('cat-rev-antiguedad').value.trim();`;

const replacementVars = `const antiVal = document.getElementById('cat-rev-antiguedad').value.trim();
                                    const supConstVal = parseFloat(document.getElementById('cat-rev-sup-const').value) || null;
                                    const dormVal = parseInt(document.getElementById('cat-rev-dormitorios').value) || null;
                                    const banosVal = parseInt(document.getElementById('cat-rev-banos').value) || null;
                                    const matVal = document.getElementById('cat-rev-material').value.trim();`;

if (!code.includes('cat-rev-sup-const')) {
    code = code.replace(targetVars, replacementVars);
}

const targetPayload = `texto_original: payload.texto_original
                                    };`;

const replacementPayload = `texto_original: payload.texto_original,
                                        metadata: {
                                            superficie_construida: supConstVal,
                                            dormitorios: dormVal,
                                            banos: banosVal,
                                            material: matVal,
                                            estado: payload.estado || ''
                                        }
                                    };`;

if (!code.includes('metadata: {')) {
    code = code.replace(targetPayload, replacementPayload);
}

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', code);
console.log('Injected house properties into CRM modal and payload.');
