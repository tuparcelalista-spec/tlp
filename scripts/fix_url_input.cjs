const fs = require('fs');
const file = 'frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js';
let code = fs.readFileSync(file, 'utf8');
code = code.replace('<input type="url" id="ei-video-url"', '<input type="text" id="ei-video-url"');
fs.writeFileSync(file, code, 'utf8');
