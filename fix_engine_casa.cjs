const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let js = fs.readFileSync(path, 'utf8');

const target1 = `let valorFinal = Math.round(valor_terreno * (1 + premios));`;
const replacement1 = `let valorFinal = Math.round(valor_terreno * (1 + premios));
      
      // CALCULO DE CASA / VIVIENDA (Si existe)
      let valor_casa = 0;
      let sup_casa = Number(parcela.superficie_casa_m2 || parcela.superficie_construida_m2 || 0);
      if (sup_casa > 0) {
          // Asumimos un costo de mercado promedio de 650.000 CLP por metro cuadrado construido
          valor_casa = sup_casa * 650000;
          valorFinal += valor_casa;
      }`;
js = js.replace(target1, replacement1);

const target2 = `if (isRio) desglose.push({ nombre: "Río/Lago", valor: "+45%" });`;
const replacement2 = `if (isRio) desglose.push({ nombre: "Río/Lago", valor: "+45%" });
          if (sup_casa > 0) desglose.push({ nombre: "Casa Construida (" + sup_casa + " m2)", valor: "+" + new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(valor_casa) });`;
js = js.replace(target2, replacement2);

fs.writeFileSync(path, js);
console.log('Fixed valuation-engine.js to support houses');
