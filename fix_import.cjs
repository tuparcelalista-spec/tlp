const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/tasaciones/premium-report.js', 'utf8');

js = js.replace(/import \{ generateMarketAnalysis \} from '..\/..\/core\/ai.js';/, 'const generateMarketAnalysis = async () => "Análisis IA simulado (Falta ai.js)";');

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/tasaciones/premium-report.js', js);
console.log('Fixed missing ai.js import');
