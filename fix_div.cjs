const fs = require('fs');
const p = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/plataforma/publicar/index.html';
let html = fs.readFileSync(p, 'utf8');

if (!html.includes('</div>\n        <div class="form-grid">\n          <label><span>Nombre completo</span>')) {
    html = html.replace('</label>\n        <div class="form-grid">\n          <label><span>Nombre completo</span>', '</label>\n        </div>\n        <div class="form-grid">\n          <label><span>Nombre completo</span>');
    fs.writeFileSync(p, html);
    console.log("Fixed div closure!");
} else {
    console.log("Already has div closure.");
}
