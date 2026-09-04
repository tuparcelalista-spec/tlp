const fs = require('fs');
let code = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');

const regexEngine = /\/\/ Premio por regularización[\s\S]*?(?=const UF_VALUE = 38000;)/m;

// Replacing the engine logic for attributes
let newEngineLogic = `// Equipamiento Extra (Desde CRM)
          let hasPiscina = (parcela.metadata?.piscina === 'si') || atr.includes('piscina');
          if (hasPiscina) { 
              let p_m2 = Number(parcela.metadata?.piscina_m2) || 24; // Asume 6x4 = 24m2 por defecto
              let p_mat = parcela.metadata?.piscina_mat === 'hormigon' ? 8 : 4; 
              if (atr.includes('hormigon')) p_mat = 8;
              let uf_piscina = p_m2 * p_mat;
              valor_casa_uf += uf_piscina; 
              houseDetails.push({ nombre: \`Piscina (\${p_m2}m2 \${p_mat === 8 ? 'Hormigón' : 'Fibra'})\`, valor: "+" + uf_piscina + " UF" }); 
          }
          
          let hasQuincho = (parcela.metadata?.quincho === 'si') || atr.includes('quincho');
          if (hasQuincho) { 
              valor_casa_uf += 150; 
              houseDetails.push({ nombre: "Quincho Techado", valor: "+150 UF" }); 
          }
          
          let hasCabana = (parcela.metadata?.cabana === 'si') || atr.includes('cabaña') || atr.includes('visita');
          if (hasCabana) { 
              valor_casa_uf += 300; 
              houseDetails.push({ nombre: "Cabaña/Visitas", valor: "+300 UF" }); 
          }
          
          let hasRiego = (parcela.metadata?.riego === 'si') || atr.includes('riego') || atr.includes('regadores');
          if (hasRiego) { 
              valor_casa_uf += 70; 
              houseDetails.push({ nombre: "Riego Automático", valor: "+70 UF" }); 
          }
          
          // Premio o Castigo por Regularización Legal
          let regStatus = parcela.metadata?.regularizada || '';
          let textReg = atr.includes('regularizada') || atr.includes('recepción');
          
          if (regStatus === 'si' || textReg) {
              let premioReg = Math.round(valor_casa_uf * 0.10); // 10% premio
              valor_casa_uf += premioReg;
              houseDetails.push({ nombre: "Recepción Final (+10%)", valor: "+" + premioReg + " UF" });
          } else if (regStatus === 'no') {
              let castigoReg = Math.round(valor_casa_uf * 0.15); // 15% castigo
              valor_casa_uf -= castigoReg;
              houseDetails.push({ nombre: "Sin Regularizar (-15%)", valor: "-" + castigoReg + " UF" });
          }
          
          `;

// We also need to remove the old hardcoded attributes checking so they don't double count
const codeToReplaceOldAttributesChecking = `if (atr.includes('piscina')) { valor_casa_uf += 250; houseDetails.push({ nombre: "Piscina", valor: "+250 UF" }); }
          if (atr.includes('quincho')) { valor_casa_uf += 150; houseDetails.push({ nombre: "Quincho", valor: "+150 UF" }); }
          if (atr.includes('cabaña') || atr.includes('visita')) { valor_casa_uf += 300; houseDetails.push({ nombre: "Cabaña/Visitas", valor: "+300 UF" }); }
          
          // Premio por regularización
          if (atr.includes('regularizada') || atr.includes('recepción')) { 
              let premioReg = Math.round(valor_casa_uf * 0.10); // 10% premio
              valor_casa_uf += premioReg;
              houseDetails.push({ nombre: "Recepción Final", valor: "+" + premioReg + " UF" });
          }`;
          
if (code.includes('if (atr.includes(\'piscina\'))')) {
    code = code.replace(codeToReplaceOldAttributesChecking, newEngineLogic);
} else {
    // try a more generic replace
    console.log("Could not find the exact old attributes block");
}

fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', code);
console.log('Valuation engine logic updated.');
