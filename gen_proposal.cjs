const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data } = await supabase.from('tpl_catastro_mercado').select('comuna, precio_clp, precio_uf, superficie_m2, titulo');
    
    const UF_VAL = 40800;
    const grouped = {};
    
    data.forEach(p => {
        let c = String(p.comuna || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if(!c) return;
        
        let precio = parseFloat(p.precio_clp);
        if (isNaN(precio) || precio <= 0) {
            let uf = parseFloat(p.precio_uf);
            if (!isNaN(uf) && uf > 0) {
                precio = uf * UF_VAL;
            }
        }
        
        let m2 = parseFloat(p.superficie_m2);
        // Filtros estrictos de calidad de datos
        if (!precio || isNaN(precio) || precio < 1000000) return; // Ignorar menores a 1 millón
        if (!m2 || isNaN(m2) || m2 < 50 || m2 > 1000000) return; // Ignorar muy chicas o irracionalmente grandes
        
        let m2_price = precio / m2;
        // Filtro de ruido extremo por m2
        if (m2_price < 200 || m2_price > 500000) return; 
        
        if(!grouped[c]) grouped[c] = [];
        grouped[c].push({ titulo: p.titulo, precio, m2, m2_price });
    });
    
    const report = [];
    for (const c in grouped) {
        let arr = grouped[c].sort((a,b) => a.m2_price - b.m2_price);
        let cheapest = arr.slice(0, 5);
        let avg_m2 = cheapest.reduce((acc, val) => acc + val.m2_price, 0) / cheapest.length;
        
        report.push({
            comuna: c.charAt(0).toUpperCase() + c.slice(1),
            muestras: arr.length,
            muestras_usadas: cheapest.length,
            avg_m2_clp: Math.round(avg_m2),
            avg_m2_uf: (avg_m2 / UF_VAL).toFixed(3)
        });
    }
    
    report.sort((a,b) => a.comuna.localeCompare(b.comuna));
    
    let md = '# Propuesta de Bases Comunales (Las 5 más económicas)\n\n';
    md += 'Esta tabla se construyó filtrando datos corruptos (mezclas de UF y Pesos), estandarizando todo a Pesos y luego obteniendo el promedio de las 5 parcelas de menor valor x m² en cada comuna.\n\n';
    md += '| Comuna | Muestras Totales | Top 5 M² (CLP) | Top 5 M² (UF) | Referencia 5.000m² |\n';
    md += '|---|---|---|---|---|\n';
    
    report.forEach(r => {
        let ref5k = r.avg_m2_clp * 5000;
        md += `| ${r.comuna} | ${r.muestras_usadas} de ${r.muestras} | $${r.avg_m2_clp.toLocaleString('es-CL')} | ${r.avg_m2_uf} UF | $${ref5k.toLocaleString('es-CL')} |\n`;
    });
    
    fs.writeFileSync('C:/Users/yo/.gemini/antigravity/brain/fb6b13b7-084c-4447-a45b-9c2a2e81035e/propuesta_bases_comunales.md', md, 'utf8');
    console.log('Artifact generated.');
})();
