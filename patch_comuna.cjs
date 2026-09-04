const fs = require('fs');

const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcelas.js';
let content = fs.readFileSync(path, 'utf8');

// Replace "Ñipas" with "Ránquil" where it's set as a comuna
content = content.replace(/comuna:\s*["']ñipas["']/gi, 'comuna: "Ránquil"');
content = content.replace(/comuna:\s*["']Ñipas["']/g, 'comuna: "Ránquil"');

fs.writeFileSync(path, content, 'utf8');
console.log('Comuna updated in parcelas.js');
