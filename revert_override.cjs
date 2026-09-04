const fs = require('fs');

const engPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/core/valuation-engine.js';
let engContent = fs.readFileSync(engPath, 'utf8');

const overrideRegex = /if\s*\(\s*parcela\.valor_tpl_recomendado\s*\|\|\s*parcela\.valor_tpl_tasador\s*\)\s*\{[\s\S]*?puntaje:\s*85\s*\};\s*\}/;

if (overrideRegex.test(engContent)) {
    engContent = engContent.replace(overrideRegex, '');
    fs.writeFileSync(engPath, engContent, 'utf8');
    console.log('Valuation engine override removed.');
} else {
    console.log('Override not found in valuation engine.');
}

const propPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/core/property-analyzer.js';
let propContent = fs.readFileSync(propPath, 'utf8');

propContent = propContent.replace('||parcel.valor_tpl_tasador||parcel.valor_tpl_recomendado', '');
propContent = propContent.replace('||parcel.valor_tpl_tasador_ajustado', '');
propContent = propContent.replace('||parcel.valor_tpl_tasador', '');
propContent = propContent.replace('||parcel.valor_comunal', '');
propContent = propContent.replace('||parcel.valor_venta_apuro', '');

fs.writeFileSync(propPath, propContent, 'utf8');
console.log('Property analyzer override removed.');
