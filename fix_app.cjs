const fs = require('fs');
const path = 'frontend-v2/plataforma/informe-valores/app.js';
let js = fs.readFileSync(path, 'utf8');

js = js.replace(/const tplValue = valuation\.valorFinal \|\| 0;/g, 'const tplValue = valuation.valores?.recomendado || 0;');
js = js.replace(/valuation\.valorBaseComunal/g, 'valuation.valores?.comunalBruto');
js = js.replace(/const items = valuation\.explicacion \|\| valuation\.factores \|\| \[\];/g, 'const items = valuation.adjustments || [];');

// Also update the loop that renders adjustments because adjustments use {name, value} instead of {factor, impacto}
js = js.replace(/adj\.impacto/g, 'adj.value');
js = js.replace(/adj\.factor/g, 'adj.name');

fs.writeFileSync(path, js);
console.log('Fixed valuation fields in app.js');
