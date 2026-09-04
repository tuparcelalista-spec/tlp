const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data } = await supabase.from('tpl_catastro_mercado').select('comuna, precio_clp, precio_uf, superficie_m2, titulo');
    const UF_VAL = 40800;
    const grouped = {};
    const newBasesObj = {};
    
    data.forEach(p => {
        let c = String(p.comuna || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if(!c) return;
        
        let precio = parseFloat(p.precio_clp);
        if (isNaN(precio) || precio <= 0) {
            let uf = parseFloat(p.precio_uf);
            if (!isNaN(uf) && uf > 0) precio = uf * UF_VAL;
        }
        
        let m2 = parseFloat(p.superficie_m2);
        
        // REGLAS ESTRICTAS PARA BASE DE PARCELAS (Para evitar basura como "Villarrica 7 millones"):
        if (!precio || isNaN(precio) || precio < 8000000) return; // Ignorar menores a 8M (son cesión de derechos o basura)
        if (!m2 || isNaN(m2) || m2 < 4000 || m2 > 15000) return; // Filtrar mega-campos (que tiran el m2 al piso)
        
        let m2_price = precio / m2;
        
        if(!grouped[c]) grouped[c] = [];
        grouped[c].push({ titulo: p.titulo, precio, m2, m2_price });
    });
    
    const report = [];
    for (const c in grouped) {
        let arr = grouped[c].sort((a,b) => a.m2_price - b.m2_price);
        let cheapest = arr.slice(0, 5);
        if (cheapest.length === 0) continue;
        let avg_m2 = cheapest.reduce((acc, val) => acc + val.m2_price, 0) / cheapest.length;
        
        newBasesObj[c] = { medianM2: Math.round(avg_m2) };
        
        report.push({
            comuna: c.charAt(0).toUpperCase() + c.slice(1),
            muestras_usadas: cheapest.length,
            avg_m2_clp: Math.round(avg_m2),
            avg_m2_uf: (avg_m2 / UF_VAL).toFixed(3)
        });
    }
    
    report.sort((a,b) => a.comuna.localeCompare(b.comuna));
    
    let md = '# Propuesta Revisada de Bases Comunales (Las 5 más económicas reales)\n\n';
    md += '> Tienes toda la razón. El problema con tomar "lo más barato" sin filtrar es que se cuelan *Mega-campos* (ej. 50.000 m² a 14 millones que tiran el valor x m² al piso), ventas de *Cesiones de Derecho* o errores de tipeo de los corredores en los portales.\n\n';
    md += 'Para solucionar esto, apliqué un **Filtro Estricto de Limpieza Inmobiliaria** antes de sacar el promedio de las 5 más baratas:\n';
    md += '1. Sólo se evaluaron **Parcelas de Agrado** (entre 4.000 m² y 15.000 m²). ¡Adiós a los mega-campos que distorsionan el precio!\n';
    md += '2. Se descartaron propiedades con precio total menor a **$8.000.000**. (Si alguien vende en Villarrica a 5 millones, es una estafa, un derecho, o venta en verde ilegal).\n';
    md += '3. Se estandarizaron las UF a pesos ($40.800).\n\n';
    md += 'Aquí está la lista limpia. Dime si ahora los valores (Ref. 5.000m²) te hacen sentido geográficamente:\n\n';
    
    md += '| Comuna | Muestras Tomadas | Base x m² (CLP) | Base x m² (UF) | Ref. 5.000m² |\n';
    md += '|---|---|---|---|---|\n';
    
    report.forEach(r => {
        let ref5k = r.avg_m2_clp * 5000;
        md += `| ${r.comuna} | ${r.muestras_usadas} | $${r.avg_m2_clp.toLocaleString('es-CL')} | ${r.avg_m2_uf} UF | $${ref5k.toLocaleString('es-CL')} |\n`;
    });
    
    fs.writeFileSync('C:/Users/yo/.gemini/antigravity/brain/fb6b13b7-084c-4447-a45b-9c2a2e81035e/propuesta_bases_comunales.md', md, 'utf8');
    fs.writeFileSync('C:/Users/yo/.gemini/antigravity/brain/fb6b13b7-084c-4447-a45b-9c2a2e81035e/scratch/nuevas_bases.json', JSON.stringify(newBasesObj, null, 2), 'utf8');
    console.log('Artifact generated.');
})();
