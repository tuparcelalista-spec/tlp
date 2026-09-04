const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data } = await supabase.from('tpl_catastro_mercado').select('comuna, lat, lng, precio_clp, precio_uf, superficie_m2, titulo, localidad');
    const UF_VAL = 40800;
    const blockList = ['curarrehue', 'rinconada', '1 hora', 'una hora', 'hora de', 'derechos', 'acciones'];
    
    let spatial = [];
    
    data.forEach(p => {
        if (!p.lat || !p.lng || Math.abs(p.lat - -35.675148) < 0.001) return;
        
        let titulo = String(p.titulo || '').toLowerCase();
        let localidad = String(p.localidad || '').toLowerCase();
        if (blockList.some(word => titulo.includes(word) || localidad.includes(word))) return;
        
        let precio = parseFloat(p.precio_clp);
        if (isNaN(precio) || precio <= 0) {
            let uf = parseFloat(p.precio_uf);
            if (!isNaN(uf) && uf > 0) precio = uf * UF_VAL;
        }
        
        let m2 = parseFloat(p.superficie_m2);
        if (!precio || isNaN(precio) || precio < 8000000) return;
        if (!m2 || isNaN(m2) || m2 < 4000 || m2 > 15000) return;
        
        let m2_price = Math.round(precio / m2);
        
        spatial.push({ lat: p.lat, lng: p.lng, m2_price: m2_price });
    });
    
    console.log(`Exporting ${spatial.length} valid spatial records...`);
    
    let js = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');
    // Inject the spatial data array into the engine
    const newBlock = 'const SPATIAL_CATASTRO = ' + JSON.stringify(spatial) + ';';
    
    // Check if SPATIAL_CATASTRO already exists to replace, otherwise append below MARKET_REFERENCES
    if (js.includes('const SPATIAL_CATASTRO =')) {
        js = js.replace(/const SPATIAL_CATASTRO = \[.*?\];/s, newBlock);
    } else {
        js = js.replace('const MARKET_REFERENCES =', newBlock + '\n  const MARKET_REFERENCES =');
    }
    
    fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', js, 'utf8');
    console.log('Engine updated with SPATIAL_CATASTRO.');
})();
