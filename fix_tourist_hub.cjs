const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let js = fs.readFileSync(path, 'utf8');

const oldDistLogic = `// 1% por km para distancia comunal, 0.3% por km para ciudad grande
      let penalty_local = local_km * 0.01;
      let penalty_hub = hub_km * 0.003;
      
      // Ponderación (80% comunal, 20% ciudad grande)
      let descuento_distancia = (penalty_local * 0.8) + (penalty_hub * 0.2);`;

const newDistLogic = `// Excepción para comunas turísticas que actúan como "Ciudad Grande"
      const comunasTuristicas = ['pucon', 'puerto varas', 'panguipulli', 'vicuña', 'vicuna', 'cobquecura', 'pinto'];
      if (comunasTuristicas.includes(comunaStr)) {
          hub_km = local_km; // La distancia a la ciudad grande es la misma que la distancia local
      }

      // 1% por km para distancia comunal, 0.7% por km para ciudad grande
      let penalty_local = local_km * 0.01;
      let penalty_hub = hub_km * 0.007;
      
      // Ponderación (80% comunal, 20% ciudad grande)
      let descuento_distancia = (penalty_local * 0.8) + (penalty_hub * 0.2);`;

js = js.replace(oldDistLogic, newDistLogic);
fs.writeFileSync(path, js);
console.log('Fixed hub distance weight to 0.7% and added tourist commune logic');
