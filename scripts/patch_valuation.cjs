const fs = require('fs');
const path = 'frontend-v2/js/core/valuation-engine.js';
let content = fs.readFileSync(path, 'utf8');

const dynamicMarketFn = `
  async function fetchDynamicMarket(input, supabaseClient) {
    if (!supabaseClient || !input.comuna) return null;
    const comuna = normalize(input.comuna);
    
    try {
        const { data, error } = await supabaseClient.from('tpl_propiedades')
            .select('precio_clp, superficie_m2, atributos')
            .ilike('comuna', comuna)
            .eq('tipo_propiedad', 'Parcela');
            
        if (error || !data || data.length === 0) return null;
        
        let totalVal = 0;
        let validCount = 0;
        let hasTourism = false;
        
        data.forEach(p => {
           if (p.precio_clp > 0 && p.superficie_m2 > 0) {
               totalVal += (p.precio_clp / p.superficie_m2);
               validCount++;
           }
           if (p.atributos && (p.atributos.toLowerCase().includes('orilla') || p.atributos.toLowerCase().includes('turístico') || p.atributos.toLowerCase().includes('termas'))) {
               hasTourism = true;
           }
        });
        
        if (validCount === 0) return null;
        
        const medianM2 = Math.round(totalVal / validCount);
        let scarcityFactor = 1.0;
        
        // Lógica de Saturación vs Escasez
        if (validCount > 30) scarcityFactor = 0.95; // Leve Saturación
        if (validCount > 60) scarcityFactor = 0.90; // Alta Saturación
        if (validCount <= 5 && (hasTourism || input.tourismLevel === 'nacional' || input.tourismLevel === 'regional')) {
            scarcityFactor = 1.15; // Escasez en zona demandada
        }
        
        return {
            medianM2,
            scarcityFactor,
            competitorsCount: validCount
        };
    } catch (e) {
        console.warn('Error Catastro:', e);
        return null;
    }
  }

  function calculate(input) {`;

content = content.replace('function calculate(input) {', dynamicMarketFn);

const calcRegex = /const market = MARKET_REFERENCES\[normalize\(input\.comuna\)\] \|\| \{ medianM2: 5000 \};\s*\/\/\s*5000 CLP\/m2 como fallback genr?ico\s*const communaMedianM2 = market\.medianM2;\s*const valor_comunal = Math\.round\(area \* communaMedianM2\);/s;

const fallbackRegex = /const market = MARKET_REFERENCES\[normalize\(input\.comuna\)\] \|\| \{ medianM2: 5000 \};[^\n]*\n\s*const communaMedianM2 = market\.medianM2;\n\s*const valor_comunal = Math\.round\(area \* communaMedianM2\);/g;

const newCalcLogic = `
    let communaMedianM2 = 5000;
    let escasezMultiplier = 1.0;
    
    if (input.dynamicMarketReference) {
        communaMedianM2 = input.dynamicMarketReference.medianM2;
        escasezMultiplier = input.dynamicMarketReference.scarcityFactor || 1.0;
    } else {
        const market = MARKET_REFERENCES[normalize(input.comuna)] || { medianM2: 5000 };
        communaMedianM2 = market.medianM2;
    }

    const valor_comunal = Math.round(area * communaMedianM2 * escasezMultiplier);`;

content = content.replace(fallbackRegex, newCalcLogic);

if (!content.includes('fetchDynamicMarket,')) {
    content = content.replace('return { calculate, calculateSurfaceBase', 'return { calculate, fetchDynamicMarket, calculateSurfaceBase');
}

fs.writeFileSync(path, content, 'utf8');
console.log('valuation-engine.js updated');
