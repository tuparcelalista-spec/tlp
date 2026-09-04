const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let js = fs.readFileSync(path, 'utf8');

const oldDistLogic = `let dist_km = Number(parcela.distanciaComuna || parcela.communeDistanceKm || 0);
      if (dist_km === 0 && parcela.distanciaConcepcion) {
            dist_km = Number(String(parcela.distanciaConcepcion).replace(/\\D/g, '')) * 0.2; // Approximate local distance from regional distance
        }
      
      let descuento_distancia = dist_km * 0.01;`;

const newDistLogic = `let local_km = Number(parcela.distanciaComuna || parcela.communeDistanceKm || 0);
      let hub_km = Number(parcela.distanceKm || 0); // Distancia a la ciudad grande (Hub)

      if (local_km === 0 && parcela.distanciaConcepcion) {
            local_km = Number(String(parcela.distanciaConcepcion).replace(/\\D/g, '')) * 0.2;
      }
      
      // 1% por km para distancia comunal, 0.3% por km para ciudad grande
      let penalty_local = local_km * 0.01;
      let penalty_hub = hub_km * 0.003;
      
      // Ponderación (80% comunal, 20% ciudad grande)
      let descuento_distancia = (penalty_local * 0.8) + (penalty_hub * 0.2);`;

js = js.replace(oldDistLogic, newDistLogic);

// Ensure the breakdown shows the two distances if possible, or just the combined "Distancia"
js = js.replace(/if \(descuento_distancia > 0\) desglose\.push\(\{ nombre: "Distancia", valor: "-" \+ Math\.round\(descuento_distancia \* 100\) \+ "%" \}\);/g, 
`if (descuento_distancia > 0) desglose.push({ nombre: "Lejanía (Comuna/Ciudad)", valor: "-" + Math.round(descuento_distancia * 100) + "%" });`);

fs.writeFileSync(path, js);
console.log('Fixed distance blending in valuation-engine.js');
