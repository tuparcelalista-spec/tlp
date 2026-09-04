const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let js = fs.readFileSync(path, 'utf8');

js = js.replace(/let dist_km = Number\(parcela\.distanciaComuna \|\| 0\);/g, 'let dist_km = Number(parcela.distanciaComuna || parcela.communeDistanceKm || 0);');

fs.writeFileSync(path, js);
console.log('Fixed distance variable map in valuation-engine.js');
