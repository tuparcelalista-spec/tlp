const fs = require('fs');
let js = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');

const logicBlock = `
    let valorLocalidadBase = fullArea * marketBase; // Fallback
    if (p.lat && p.lng && typeof SPATIAL_CATASTRO !== 'undefined' && SPATIAL_CATASTRO.length > 0) {
        let distances = SPATIAL_CATASTRO.map(s => {
            let d = getDistance(p.lat, p.lng, s.lat, s.lng);
            return { lat: s.lat, lng: s.lng, m2_price: s.m2_price, d };
        });
        
        // Excluir parcelas a distancia 0 (puede ser la misma parcela duplicada)
        distances = distances.filter(x => x.d > 0.05); 
        distances.sort((a,b) => a.d - b.d);
        
        // Tomar las 5 más cercanas (radio máximo de 15km)
        let closest = distances.filter(x => x.d <= 15).slice(0, 5);
        if (closest.length >= 3) { // Si hay al menos 3 cercanas
            let avgM2 = closest.reduce((acc, val) => acc + val.m2_price, 0) / closest.length;
            valorLocalidadBase = fullArea * avgM2;
        }
    }
`;

// Insert the logic block right after `const base = 2000;` inside the calculate function
js = js.replace(/const base = 2000;[\s\S]*?const fullArea = area;/, match => match + '\n' + logicBlock);

// We also need to return valorLocalidadBase in the return object of calculate()
js = js.replace(/valorComunalBase: fullArea \* marketBase,/, 'valorComunalBase: fullArea * marketBase,\n      valorLocalidadBase: valorLocalidadBase,');

fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', js, 'utf8');
console.log('Injected nearest-neighbors logic');
