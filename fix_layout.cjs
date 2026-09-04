const fs = require('fs');

const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcela.html';
let content = fs.readFileSync(path, 'utf8');

// Fix Map Height
content = content.replace(
    'style="height: 550px; position: relative; width: 100%;"',
    'style="height: 50vh; min-height: 350px; max-height: 500px; position: relative; width: 100%;"'
);

// Fix overlapping values in Valuation Section by making them wrap
content = content.replace(
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">\n              <span style="font-size: 0.9rem; color: #475569;">Valor Terreno Comunal:</span>\n              <strong id="v3-eval-zona" style="color: #0f172a; font-size: 0.95rem;">--</strong>\n            </div>',
    '<div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 4px;">\n              <span style="font-size: 0.9rem; color: #475569;">Valor Terreno Comunal:</span>\n              <strong id="v3-eval-zona" style="color: #0f172a; font-size: 0.95rem;">--</strong>\n            </div>'
);

// Let's also check if there are other similar blocks in the right sidebar.
content = content.replace(
    '<div id="v3-eval-breakdown" style="padding: 8px 0; margin: 8px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; font-size: 0.85rem; color: #64748b; display: flex; flex-direction: column; gap: 4px;">',
    '<div id="v3-eval-breakdown" style="padding: 8px 0; margin: 8px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; font-size: 0.85rem; color: #64748b; display: flex; flex-direction: column; gap: 6px;">'
);

fs.writeFileSync(path, content, 'utf8');
console.log('parcela.html layout updated');
