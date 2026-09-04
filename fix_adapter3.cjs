const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-adapter.js';
let js = fs.readFileSync(path, 'utf8');

js = js.replace(/marketMedianM2: catastroData\.medianM2,/g, 'marketMedianM2: catastroData.marketMedianM2,');

fs.writeFileSync(path, js);
console.log('Fixed valuation-adapter.js to correctly pass marketMedianM2');
