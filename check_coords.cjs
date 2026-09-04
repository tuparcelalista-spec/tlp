const url = 'https://hwyscirbycojwndyzozn.supabase.co/rest/v1/tpl_catastro_mercado?select=*';
const key = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

fetch(url, {
    method: 'GET',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
})
.then(r => r.json())
.then(data => {
    const missing = data.filter(p => !p.lat || !p.lng || p.lat === 0 || p.lng === 0);
    console.log(`Total rows: ${data.length}`);
    console.log(`Rows missing coords: ${missing.length}`);
    
    if(missing.length > 0) {
        console.log("Sample missing row ID column:", Object.keys(missing[0]).find(k => k === 'id' || k.includes('id')));
        
        // Let's see which comunas are most common among the missing
        let missingComunas = {};
        missing.forEach(p => {
            let c = (p.comuna || "Desconocida").trim().toLowerCase();
            missingComunas[c] = (missingComunas[c] || 0) + 1;
        });
        console.log("Missing by comuna:", Object.entries(missingComunas).sort((a,b)=>b[1]-a[1]).slice(0, 15));
    }
});
