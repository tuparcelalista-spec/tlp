const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');

const regex = /oldMeta\.contacto_telefono = document\.getElementById\('ei-dueno-telefono'\)\.value;/;

const replacement = `oldMeta.contacto_telefono = document.getElementById('ei-dueno-telefono').value;
        oldMeta.materialidad = document.getElementById('ei-mat-casa').value || '';
        oldMeta.superficie_construida = Number(document.getElementById('ei-sup-casa').value) || null;
        oldMeta.dormitorios = Number(document.getElementById('ei-dorm-casa').value) || null;
        oldMeta.banos = Number(document.getElementById('ei-banos-casa').value) || null;`;

if (!code.includes("oldMeta.materialidad =")) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', code);
    console.log('Injected house properties to payload');
} else {
    console.log('Already injected');
}
