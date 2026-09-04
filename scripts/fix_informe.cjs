const fs = require('fs');
const p = 'frontend-v2/js/informe-tasacion.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\\`/g, '`').replace(/\\\${/g, '${');
fs.writeFileSync(p, c);
