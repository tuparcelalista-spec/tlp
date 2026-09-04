const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/comparables/index.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\${/g, '${');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed escaped backticks in comparables/index.js');
