const fs = require('fs');
const content = fs.readFileSync('frontend-v2/parcelas.js', 'utf8');
let evalContent = content.replace('const parcelas', 'var parcelasParsed');
eval(evalContent);
let total = parcelasParsed.length;
let missingCoords = 0;
let missingPrice = 0;
let comunas = {};

parcelasParsed.forEach(p => {
    if (!p.lat || !p.lng) missingCoords++;
    let price = 0;
    if (typeof p.precio === 'string') {
        price = parseInt(p.precio.replace(/[^\d]/g, ''));
    } else if (typeof p.precio === 'number') {
        price = p.precio;
    }
    if (!price) missingPrice++;
    
    let com = p.comuna || 'Sin Comuna';
    if (!comunas[com]) comunas[com] = { count: 0, sum: 0 };
    comunas[com].count++;
    if (price) comunas[com].sum += price;
});

let md = '# Auditoría del Catastro (parcelas.js)\n\n';
md += '- **Total de parcelas registradas:** ' + total + '\n';
md += '- **Parcelas sin coordenadas válidas:** ' + missingCoords + '\n';
md += '- **Parcelas sin precio válido:** ' + missingPrice + '\n\n';
md += '## Desglose por Comuna y Valorización\n\n';
md += '| Comuna | Cantidad | Valor Promedio |\n';
md += '|---|---|---|\n';

Object.keys(comunas).sort((a,b) => comunas[b].count - comunas[a].count).forEach(c => {
    let avg = comunas[c].sum / comunas[c].count;
    md += '| ' + c + ' | ' + comunas[c].count + ' | $' + Math.round(avg).toLocaleString('es-CL') + ' |\n';
});

fs.writeFileSync('C:\\Users\\yo\\.gemini\\antigravity\\brain\\7230aab2-0882-4b56-a052-476094c4cd13\\auditoria_catastro.md', md);
console.log('Markdown written');
