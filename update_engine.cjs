const fs = require('fs');
let code = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');

const regex = /\/\/ CALCULO DE CASA \/ VIVIENDA[\s\S]*?valorFinal \+= Math\.round\(valor_casa\);\n\s*\}/m;

const replacement = `// CALCULO DE CASA / VIVIENDA (Basado en UF/m2 real de catastro)
      let valor_casa = 0;
      let dorms = Number(parcela.dormitorios || parcela.metadata?.dormitorios || 0);
      let sup_casa = Number(parcela.superficie_casa_m2 || parcela.superficie_construida_m2 || parcela.superficie_construida || parcela.metadata?.superficie_construida_m2 || parcela.metadata?.superficie_construida || 0);
      let houseDetails = [];
      
      if (dorms > 0 || sup_casa > 0) {
          // Si no hay sup_casa, aproximamos a 25m2 por dormitorio
          let effectiveSup = sup_casa > 0 ? sup_casa : (dorms * 25);
          
          // UF por m2 de construccion estandar sin extras (11.1 descontando piscina/quincho, base conservadora 10 UF)
          let uf_base = 10; 
          let mat = (parcela.materialidad || parcela.metadata?.materialidad || 'estandar').toLowerCase();
          
          if (mat === 'ligera' || mat === 'madera') uf_base = 6.5;
          else if (mat === 'solida' || mat === 'albañileria' || mat === 'hormigon') uf_base = 15.0;
          else if (mat === 'premium') uf_base = 18.0;
          
          let valor_casa_uf = effectiveSup * uf_base;
          houseDetails.push({ nombre: "Construcción (" + mat + " " + effectiveSup + "m2)", valor: "+" + (effectiveSup * uf_base) + " UF" });
          
          // Depreciacion por antiguedad (1% anual hasta max 40%)
          let anti = String(parcela.antiguedad || parcela.metadata?.antiguedad || parcela.metadata?.estado || '').toLowerCase();
          let antiMatch = anti.match(/(?:hace|antiguedad)\s+(\d+)\s+a[ñn]os?/);
          let antiguedad_anios = antiMatch ? Number(antiMatch[1]) : 0; 
          
          // Si no tenemos años exactos pero dice "usada"
          if (antiguedad_anios === 0 && anti.includes('usada')) antiguedad_anios = 5;
          
          if (parcela.antiguedad_anios) antiguedad_anios = Number(parcela.antiguedad_anios);
          
          if (antiguedad_anios > 0) {
              let descuento = Math.min(0.40, antiguedad_anios * 0.015); // 1.5% por año, max 40%
              let dec = Math.round(valor_casa_uf * descuento);
              valor_casa_uf = valor_casa_uf - dec;
              houseDetails.push({ nombre: "Depreciación (" + antiguedad_anios + " años)", valor: "-" + dec + " UF" });
          }

          // Atributos Extras
          let atr = (parcela.atributos_naturales || parcela.metadata?.atributos_texto || parcela.atributos || '').toLowerCase();
          
          if (atr.includes('piscina')) { valor_casa_uf += 250; houseDetails.push({ nombre: "Piscina", valor: "+250 UF" }); }
          if (atr.includes('quincho')) { valor_casa_uf += 150; houseDetails.push({ nombre: "Quincho", valor: "+150 UF" }); }
          if (atr.includes('cabaña') || atr.includes('visita')) { valor_casa_uf += 300; houseDetails.push({ nombre: "Cabaña/Visitas", valor: "+300 UF" }); }
          
          // Premio por regularización
          if (atr.includes('regularizada') || atr.includes('recepción')) { 
              let premioReg = Math.round(valor_casa_uf * 0.10); // 10% premio
              valor_casa_uf += premioReg;
              houseDetails.push({ nombre: "Recepción Final", valor: "+" + premioReg + " UF" });
          }
          
          const UF_VALUE = 38000;
          valor_casa = Math.round(valor_casa_uf * UF_VALUE);
          
          valorFinal += valor_casa;
      }`;

code = code.replace(regex, replacement);

const regex2 = /if \(dorms > 0 \|\| sup_casa > 0\) \{\s*let label = dorms > 0 \? \`Casa Construida.*?\}\n/gs;
const replacement2 = `if (dorms > 0 || sup_casa > 0) {
            let label = dorms > 0 ? \`Casa Construida (\${dorms} Dormitorios)\` : \`Casa Construida (\${sup_casa} m2)\`;
            desglose.push({ nombre: label, valor: "+" + new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(valor_casa) });
            // Add sub details for the house
            for (let d of houseDetails) {
                desglose.push({ nombre: " ↳ " + d.nombre, valor: d.valor });
            }
          }\n`;

code = code.replace(regex2, replacement2);
fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', code);
console.log('Valuation engine updated with implicit values and extras');
