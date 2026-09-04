
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('tpl_catastro_mercado').select('*');
    if (error) { console.error(error); return; }

    const comunas = {};
    for (let c of data) {
        if (!c.comuna || !c.superficie_m2 || !c.precio_clp) continue;
        let cName = String(c.comuna).normalize('NFD').replace(/\\\u0300-\\\u036f/g, '').toLowerCase().trim();
        if (!comunas[cName]) comunas[cName] = [];
        let p_m2 = c.precio_clp / c.superficie_m2;
        comunas[cName].push(p_m2);
    }

    const marketRefs = {};

    for (const [cName, prices] of Object.entries(comunas)) {
        if (prices.length === 0) continue;
        prices.sort((a, b) => a - b);
        let median = prices[Math.floor(prices.length / 2)];
        
        // Filter out those with > 40% difference from median
        let filtered = prices.filter(p => {
            let diff = Math.abs(p - median) / median;
            return diff <= 0.40;
        });

        if (filtered.length === 0) filtered = [median];
        
        let avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
        marketRefs[cName] = { 
            avgM2: Math.round(avg), 
            sample: filtered.length, 
            totalSample: prices.length 
        };
    }
    
    fs.writeFileSync('scratch/new_bases.json', JSON.stringify(marketRefs, null, 2));
    console.log('Bases generated');
}
run();

