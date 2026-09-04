const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-adapter.js';
let js = fs.readFileSync(path, 'utf8');

const newMap = `ajustesLimpios = rawResult.ajustesDesglose.map(item => {
                let str = typeof item === 'string' ? item : (item.nombre + ' ' + item.valor);
                let pctMatch = str.match(/([+-]?\\d+)%/);
                let pct = pctMatch ? parseFloat(pctMatch[1]) / 100 : 0;
                let name = str.replace(/^[+-]?\\d+%\\s*/, '').trim();
                
                // Extraer nombre limpio si venía de un objeto (ignorar el "+10%")
                if (typeof item === 'object' && item.nombre) {
                     name = item.nombre;
                     let valMatchObj = String(item.valor).match(/([+-]?\\d+)%/);
                     pct = valMatchObj ? parseFloat(valMatchObj[1]) / 100 : 0;
                } else {
                     let valMatch = str.match(/([+-])\\$([\\d,]+)/);
                     if (valMatch && !pctMatch) {
                         name = str.replace(/^[+-]\\$[\\d,]+\\s*/, '').trim();
                         let val = parseInt(valMatch[2].replace(/,/g, ''));
                         pct = valMatch[1] === '-' ? -val/base : val/base;
                     }
                }
                
                return {
                    name: name,
                    desc: 'Ajuste territorial TPL por ' + name.toLowerCase(),
                    type: pct >= 0 ? 'positive' : 'negative',
                    porcentaje: pct,
                    value: Math.round(base * pct)
                };
            });`;

// Find the block to replace
const startMarker = 'ajustesLimpios = rawResult.ajustesDesglose.map(str => {';
const endMarker = '            });';

const startIndex = js.indexOf(startMarker);
if (startIndex !== -1) {
    const endIndex = js.indexOf(endMarker, startIndex) + endMarker.length;
    const oldBlock = js.substring(startIndex, endIndex);
    js = js.replace(oldBlock, newMap);
    fs.writeFileSync(path, js);
    console.log('Fixed adapter array mapping successfully!');
} else {
    console.log('Could not find the block to replace.');
}
