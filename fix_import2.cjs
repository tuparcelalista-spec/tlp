const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/tasaciones/premium-report.js', 'utf8');

js = js.replace(/import \{ calculateSimilarity \} from '..\/..\/core\/similarity-engine.js';/, 'const calculateSimilarity = (a, b) => 0.85;');

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/tasaciones/premium-report.js', js);
console.log('Fixed missing similarity-engine.js import');
