const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let js = fs.readFileSync(path, 'utf8');

const target1 = `// CALCULO DE CASA / VIVIENDA (Si existe)
      let valor_casa = 0;
      let sup_casa = Number(parcela.superficie_casa_m2 || parcela.superficie_construida_m2 || 0);
      if (sup_casa > 0) {
          // Asumimos un costo de mercado promedio de 650.000 CLP por metro cuadrado construido
          valor_casa = sup_casa * 650000;
          valorFinal += valor_casa;
      }`;
      
const replacement1 = `// CALCULO DE CASA / VIVIENDA (Basado en Dormitorios, Materialidad y Plusvalía)
      let valor_casa = 0;
      let dorms = Number(parcela.dormitorios || parcela.metadata?.dormitorios || 0);
      let sup_casa = Number(parcela.superficie_casa_m2 || parcela.superficie_construida_m2 || parcela.metadata?.superficie_casa_m2 || 0);
      
      if (dorms > 0 || sup_casa > 0) {
          // 1. Base por Dormitorio (Si no hay dormitorios pero sí m2, usamos una regla de 1 dorm = 30m2)
          let effectiveDorms = dorms > 0 ? dorms : Math.max(1, Math.round(sup_casa / 30));
          
          let baseValue = 0;
          if (effectiveDorms === 1) baseValue = 20000000;
          else if (effectiveDorms === 2) baseValue = 35000000;
          else if (effectiveDorms === 3) baseValue = 50000000;
          else if (effectiveDorms === 4) baseValue = 65000000;
          else baseValue = 80000000; // 5 o más
          
          // 2. Multiplicador de Materialidad
          let mat = (parcela.materialidad || parcela.metadata?.materialidad || 'estandar').toLowerCase();
          let matMult = 1.0;
          if (mat === 'ligera') matMult = 0.8;
          else if (mat === 'solida') matMult = 1.25;
          else if (mat === 'premium') matMult = 1.5;
          
          // 3. Multiplicador de Plusvalía (Basado en si es zona turística/alta plusvalía)
          let plusvaliaMult = comunasTuristicas.includes(comunaStr) ? 1.25 : 1.0;
          
          valor_casa = baseValue * matMult * plusvaliaMult;
          valorFinal += Math.round(valor_casa);
      }`;
js = js.replace(target1, replacement1);

const target2 = `if (sup_casa > 0) desglose.push({ nombre: "Casa Construida (" + sup_casa + " m2)", valor: "+" + new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(valor_casa) });`;
const replacement2 = `if (dorms > 0 || sup_casa > 0) {
            let label = dorms > 0 ? \`Casa Construida (\${dorms} Dormitorios)\` : \`Casa Construida (\${sup_casa} m2)\`;
            desglose.push({ nombre: label, valor: "+" + new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(valor_casa) });
          }`;
js = js.replace(target2, replacement2);

fs.writeFileSync(path, js);
console.log('Fixed valuation-engine.js para logica de casas');
