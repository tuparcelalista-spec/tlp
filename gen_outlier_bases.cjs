const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data } = await supabase.from('tpl_catastro_mercado').select('comuna, precio_clp, precio_uf, superficie_m2, titulo, localidad');
    const UF_VAL = 40800;
    const grouped = {};
    const newBasesObj = {};
    const blockList = ['curarrehue', 'rinconada', '1 hora', 'una hora', 'hora de', 'derechos', 'acciones'];
    
    data.forEach(p => {
        let c = String(p.comuna || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if(!c) return;
        
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
        
        let m2_price = precio / m2;
        
        if(!grouped[c]) grouped[c] = [];
        grouped[c].push({ titulo: p.titulo, precio, m2, m2_price });
    });
    
    const report = [];
    for (const c in grouped) {
        let arr = grouped[c].sort((a,b) => a.m2_price - b.m2_price);
        if (arr.length === 0) continue;
        
        let accepted = [arr[0]];
        for (let i = 1; i < Math.min(10, arr.length); i++) {
            let current_avg = accepted.reduce((acc, val) => acc + val.m2_price, 0) / accepted.length;
            // REGLA DEL SALTO DEL 40%: Si la parcela salta más de un 40% del promedio de las anteriores, cortamos aquí.
            if (arr[i].m2_price > current_avg * 1.40) {
                break; // Stop taking more parcels, the "floor" has ended.
            }
            accepted.push(arr[i]);
        }
        
        let final_avg = accepted.reduce((acc, val) => acc + val.m2_price, 0) / accepted.length;
        
        newBasesObj[c] = { medianM2: Math.round(final_avg) };
        
        report.push({
            comuna: c.charAt(0).toUpperCase() + c.slice(1),
            muestras_usadas: accepted.length,
            avg_m2_clp: Math.round(final_avg),
            avg_m2_uf: (final_avg / UF_VAL).toFixed(3)
        });
    }
    
    // GUARDAR EN EL MOTOR
    let js = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');
    const newBlock = 'const MARKET_REFERENCES = ' + JSON.stringify(newBasesObj, null, 2) + ';';
    js = js.replace(/const MARKET_REFERENCES = \{[\s\S]*?\};\n/, newBlock + '\\n');
    fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', js, 'utf8');
    
    // Generar reporte
    report.sort((a,b) => a.comuna.localeCompare(b.comuna));
    let md = '# Bases Comunales Definitivas (Con Filtro Anti-Saltos del 40%)\n\n';
    md += '| Comuna | Muestras Aceptadas | Base x m² (CLP) | Base x m² (UF) | Ref. 5.000m² |\n';
    md += '|---|---|---|---|---|\n';
    
    report.forEach(r => {
        let ref5k = r.avg_m2_clp * 5000;
        md += `| ${r.comuna} | ${r.muestras_usadas} | $${r.avg_m2_clp.toLocaleString('es-CL')} | ${r.avg_m2_uf} UF | $${ref5k.toLocaleString('es-CL')} |\n`;
    });
    
    fs.writeFileSync('C:/Users/yo/.gemini/antigravity/brain/fb6b13b7-084c-4447-a45b-9c2a2e81035e/bases_outliers.md', md, 'utf8');
    console.log('Bases actualizadas exitosamente con corte del 40%.');
})();
