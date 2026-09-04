const fs = require('fs');
const path = 'frontend-v2/js/parcela.js';
let js = fs.readFileSync(path, 'utf8');

js = js.replace(/const vData = window\.TPLLandEngine\.calculate\(parcel\);/g, `
          // Extraer distancias desde metadatos oficiales para el motor
          if (parcel.metadata && parcel.metadata.tasador_entrada) {
              parcel.distanciaComuna = parcel.metadata.tasador_entrada.commune_distance || 0;
              parcel.distanceKm = parcel.metadata.tasador_entrada.major_city_distance || 0;
          }
          const vData = window.TPLLandEngine.calculate(parcel);
`);

fs.writeFileSync(path, js);
console.log('Fixed parcela.js mapping for engine');
