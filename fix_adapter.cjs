const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-adapter.js';
let js = fs.readFileSync(path, 'utf8');

js = js.replace(/ajustesLimpios = rawResult\.ajustesDesglose\.map\(str => \{[\s\S]*?return \{\s*name: name,\s*impact: impactVal\s*\};\s*\}\);/g, `ajustesLimpios = rawResult.ajustesDesglose.map(item => {
              if (typeof item === 'string') {
                  let pctMatch = item.match(/([+-]?\\d+)%/);
                  let pct = pctMatch ? parseFloat(pctMatch[1]) / 100 : 0;
                  let name = item.replace(/^[+-]?\\d+%\\s*/, '').trim();
                  let valMatch = item.match(/([+-])\\$([\\d,]+)/);
                  if (valMatch && !pctMatch) {
                      name = item.replace(/^[+-]\\$[\\d,]+\\s*/, '').trim();
                      let val = parseInt(valMatch[2].replace(/,/g, ''));
                      pct = valMatch[1] === '-' ? -val/base : val/base;
                  }
                  return { name: name, impact: base * pct };
              } else if (typeof item === 'object' && item.nombre && item.valor) {
                  let pctMatch = String(item.valor).match(/([+-]?\\d+)%/);
                  let pct = pctMatch ? parseFloat(pctMatch[1]) / 100 : 0;
                  return { name: item.nombre, impact: base * pct };
              }
              return { name: 'Ajuste', impact: 0 };
          });`);

fs.writeFileSync(path, js);
console.log('Fixed valuation-adapter.js');
