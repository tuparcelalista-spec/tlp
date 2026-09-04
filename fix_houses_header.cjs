const fs = require('fs');
const path = 'frontend-v2/index.html';
let html = fs.readFileSync(path, 'utf8');

const targetStr = `<h2 class="section-title">Parcelas con casa</h2>
        <p style="text-align:center; color:var(--c-text-muted); margin-bottom: 32px;">Propiedades listas para llegar y habitar.</p>`;
const replacementStr = `<div class="results-toolbar">
          <div>
            <span class="context-label">PROYECTOS COMPLETOS</span>
            <h2>Parcelas con casa</h2>
            <p>Propiedades listas para llegar y habitar.</p>
          </div>
        </div>`;

html = html.replace(targetStr, replacementStr);
fs.writeFileSync(path, html);
console.log('Fixed houses-section header in index.html');
