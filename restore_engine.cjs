const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let js = fs.readFileSync(path, 'utf8');

const dict = `const VALOR_BASE_COMUNAL = Object.freeze({
    "pucon": { "medianM2": 13011 },
    "villarrica": { "medianM2": 6950 },
    "coihueco": { "medianM2": 5026 },
    "chillan viejo": { "medianM2": 4611 },
    "yumbel": { "medianM2": 3964 },
    "bulnes": { "medianM2": 5906 },
    "chillan": { "medianM2": 7308 },
    "san ignacio": { "medianM2": 7275 },
    "ninhue": { "medianM2": 2333 },
    "san fabian": { "medianM2": 11414 },
    "niquen": { "medianM2": 4175 },
    "yungay": { "medianM2": 4940 },
    "cobquecura": { "medianM2": 7519 },
    "san carlos": { "medianM2": 5271 },
    "quillon": { "medianM2": 5523 },
    "florida": { "medianM2": 6000 },
    "nacimiento": { "medianM2": 4294 },
    "cauquenes": { "medianM2": 2500 }
  });`;

js = js.replace(/const VALOR_BASE_COMUNAL = \{\}; \/\/ Base comunal estática eliminada por orden directa \(usar Catastro dinámico\)/g, dict);
js = js.replace(/let baseData = \{ medianM2: parcela\.marketMedianM2 \|\| VALOR_BASE_COMUNAL\[comunaStr\]\?\.medianM2 \|\| 5000 \};/g, 'let baseData = VALOR_BASE_COMUNAL[comunaStr] || { medianM2: 5000 };');

fs.writeFileSync(path, js);
console.log('Restored valuation-engine.js dictionary');
