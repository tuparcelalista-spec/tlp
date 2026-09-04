const fs = require('fs');
const https = require('https');

const options = {
  hostname: 'hwyscirbycojwndyzozn.supabase.co',
  path: '/rest/v1/tpl_catastro_mercado?select=precio_clp,superficie_m2,comuna',
  headers: { 'apikey': 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k' }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parcels = JSON.parse(data);
      const byCommune = {};

      const normalize = (c) => String(c || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

      parcels.forEach(p => {
        if (!p.comuna || !p.precio_clp || !p.superficie_m2 || p.superficie_m2 <= 0) return;
        const norm = normalize(p.comuna);
        if (!byCommune[norm]) byCommune[norm] = { originalName: p.comuna, values: [] };
        byCommune[norm].values.push(p.precio_clp / p.superficie_m2);
      });

      const newValorBase = {};

      for (const [norm, obj] of Object.entries(byCommune)) {
        const values = obj.values.sort((a, b) => a - b);
        if (values.length === 0) continue;

        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

        const filtered = values.filter(v => Math.abs(v - median) <= 0.4 * median);
        
        if (filtered.length > 0) {
            const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
            newValorBase[norm] = { medianM2: Math.round(avg) };
        }
      }

      const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/core/valuation-engine.js';
      let content = fs.readFileSync(path, 'utf8');

      const startMarker = 'const VALOR_BASE_COMUNAL = Object.freeze(';
      const endMarker = '});';
      
      const idxStart = content.indexOf(startMarker);
      if (idxStart === -1) throw new Error("Could not find VALOR_BASE_COMUNAL");
      
      const idxEnd = content.indexOf(endMarker, idxStart);
      
      const newObjString = JSON.stringify(newValorBase, null, 4);
      const replacement = 'const VALOR_BASE_COMUNAL = Object.freeze(' + newObjString + ');';
      
      const newContent = content.substring(0, idxStart) + replacement + content.substring(idxEnd + endMarker.length);
      fs.writeFileSync(path, newContent, 'utf8');
      
      console.log('Update successful. Communes processed:', Object.keys(newValorBase).length);
      
    } catch (e) {
      console.error('Error processing:', e);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
