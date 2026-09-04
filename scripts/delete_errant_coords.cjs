const SUPABASE_URL = 'https://hwyscirbycojwndyzozn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';
const lat = -35.675148;
const lng = -71.54297;

(async () => {
    try {
        const url = `${SUPABASE_URL}/rest/v1/tpl_propiedades?lat=eq.${lat}&lng=eq.${lng}`;
        
        // 1. Fetch to count
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();
        console.log('Encontradas para borrar:', data.length);
        
        // 2. Delete
        if (data.length > 0) {
            const delRes = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            console.log('Borradas. Status:', delRes.status);
        }
    } catch(e) { console.error(e); }
})();
