const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let js = fs.readFileSync(path, 'utf8');

// Replace VALOR_BASE_COMUNAL dictionary and calculate() logic to use dynamic marketMedianM2
js = js.replace(/const VALOR_BASE_COMUNAL = Object\.freeze\(\{[\s\S]*?\}\);/g, 'const VALOR_BASE_COMUNAL = {}; // Base comunal estática eliminada por orden directa (usar Catastro dinámico)');

js = js.replace(/let baseData = VALOR_BASE_COMUNAL\[comunaStr\] \|\| \{ medianM2: 5000 \};/g, 'let baseData = { medianM2: parcela.marketMedianM2 || VALOR_BASE_COMUNAL[comunaStr]?.medianM2 || 5000 };');

fs.writeFileSync(path, js);
console.log('Fixed valuation-engine.js');
