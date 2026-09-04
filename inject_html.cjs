const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');

const regexModal = /<div style="display: flex; gap: 1rem;">\s*<div class="form-group" style="flex: 1;">\s*<label>Latitud/;

const replacementModal = `<div style="display: flex; gap: 1rem; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 1rem; background-color: #f8fafc;" id="cat-rev-casas-group">
                        <div class="form-group" style="flex: 1;">
                            <label>Superficie Const. (m2)</label>
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
                            <label>Materialidad</label>
                            <input type="text" id="cat-rev-material" value="\${escapeHtml(payload.material || '')}" placeholder="Sólida...">
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Latitud`;

if (!code.includes('cat-rev-casas-group')) {
    code = code.replace(regexModal, replacementModal);
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', code);
    console.log('Injected HTML fields');
} else {
    console.log('Already injected HTML fields');
}
