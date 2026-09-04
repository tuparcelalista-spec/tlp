const fs = require('fs');
let code = fs.readFileSync('frontend-v2/js/core/valuation-adapter.js', 'utf8');

const regex = /ajustesLimpios = rawResult\.ajustesDesglose\.map\(item => \{[\s\S]*?return \{\n\s*name: name,\n\s*desc: 'Ajuste territorial TPL por ' \+ name\.toLowerCase\(\),\n\s*type: pct >= 0 \? 'positive' : 'negative',\n\s*porcentaje: pct,\n\s*value: Math\.round\(base \* pct\)\n\s*\};\n\s*\}\);/m;

const replacement = `ajustesLimpios = rawResult.ajustesDesglose.map(item => {
                  let str = typeof item === 'string' ? item : (item.nombre + ' ' + item.valor);
                  let name = item.nombre || str;
                  let rawVal = String(item.valor || str);
                  
                  let pct = 0;
                  let exactValue = null;
                  
                  // Check for %
                  let pctMatch = rawVal.match(/([+-]?\d+(?:\.\d+)?)%/);
                  if (pctMatch) {
                      pct = parseFloat(pctMatch[1]) / 100;
                  } 
                  // Check for UF
                  else if (rawVal.match(/([+-]?\d+(?:\.\d+)?)\s*UF/i)) {
                      let ufMatch = rawVal.match(/([+-]?\d+(?:\.\d+)?)\s*UF/i);
                      let ufAmount = parseFloat(ufMatch[1]);
                      exactValue = Math.round(ufAmount * 38000);
                  } 
                  // Check for CLP
                  else if (rawVal.match(/([+-]?)\$([\d,.]+)/)) {
                      let valMatch = rawVal.match(/([+-]?)\$([\d,.]+)/);
                      let cleanNumberStr = valMatch[2].replace(/[.,]/g, '');
                      let val = parseInt(cleanNumberStr);
                      exactValue = valMatch[1] === '-' ? -val : val;
                  }
                  
                  let finalValue = exactValue !== null ? exactValue : Math.round(base * pct);
                  
                  return {
                      name: name,
                      desc: 'Ajuste territorial TPL por ' + name.toLowerCase(),
                      type: finalValue >= 0 ? 'positive' : 'negative',
                      porcentaje: pct, // mainly 0 for absolute amounts
                      value: finalValue
                  };
              });`;

code = code.replace(regex, replacement);

fs.writeFileSync('frontend-v2/js/core/valuation-adapter.js', code);
console.log('Adapter formatOutput updated to support UF and absolute CLP');
