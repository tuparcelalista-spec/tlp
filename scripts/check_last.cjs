const SUPABASE_URL = 'https://hwyscirbycojwndyzozn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

(async () => {
    try {
        const url = `${SUPABASE_URL}/rest/v1/tpl_propiedades?order=id.desc&limit=10&select=id,titulo,lat,lng`;
        
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();
        console.log(data);
    } catch(e) { console.error(e); }
})();
