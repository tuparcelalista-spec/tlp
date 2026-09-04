const fs = require('fs');
let str = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/casas/index.js', 'utf8');
str = str.split('\\`').join('`');
str = str.split('\\$').join('$');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/casas/index.js', str);
console.log('Fixed escaped chars 2');
