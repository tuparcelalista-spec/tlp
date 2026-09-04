const url = 'https://hwyscirbycojwndyzozn.supabase.co/rest/v1/tpl_catastro_mercado?select=*';
const key = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

fetch(url, {
    method: 'GET',
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
    }
})
.then(r => {
    if(!r.ok) throw new Error(r.statusText);
    return r.json();
})
.then(data => {
    console.log(`TOTAL PARCELAS CATASTRADAS (SUPABASE): ${data.length}`);
    
    let byRegion = {};
    let byPortal = {};
    let byComuna = {};
    
    data.forEach(p => {
        let region = p.region || 'Desconocida';
        byRegion[region] = (byRegion[region] || 0) + 1;
        
        let comuna = p.comuna || 'Desconocida';
        byComuna[comuna] = (byComuna[comuna] || 0) + 1;
        
        let portal = p.fuente || p.origen || p.portal || 'Desconocida';
        byPortal[portal] = (byPortal[portal] || 0) + 1;
    });
    
    console.log('--- POR REGION ---');
    console.log(byRegion);
    console.log('--- POR PORTAL ---');
    console.log(byPortal);
    console.log('--- TOP 5 COMUNAS ---');
    console.log(Object.entries(byComuna).sort((a,b)=>b[1]-a[1]).slice(0, 5));
})
.catch(e => {
    console.error('Error fetching from Supabase:', e.message);
});
