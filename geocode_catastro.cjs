const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient('https://hwyscirbycojwndyzozn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocode(localidad, comuna) {
    let query = '';
    if (localidad && localidad.length > 3) {
        query = `${localidad}, ${comuna}, Chile`;
    } else {
        query = `${comuna}, Chile`;
    }
    
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    try {
        let res = await fetch(url, { headers: { 'User-Agent': 'TPL-Valuation-Engine/1.0' }});
        let data = await res.json();
        
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        
        // Fallback to just comuna
        if (localidad && localidad.length > 3) {
            await sleep(1000); // Respect OSM limits
            url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(comuna + ', Chile')}&format=json&limit=1`;
            res = await fetch(url, { headers: { 'User-Agent': 'TPL-Valuation-Engine/1.0' }});
            data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
        }
    } catch(e) {
        console.error('Geocode error', e);
    }
    return null;
}

(async () => {
    console.log('Fetching parcels without coordinates or with default center coordinates...');
    const { data } = await supabase.from('tpl_catastro_mercado').select('id, comuna, localidad, lat, lng');
    
    const toUpdate = [];
    
    for (let p of data) {
        // -35.675148 is the generic center of chile added as default by some system
        let isDefault = (p.lat === null || p.lng === null || Math.abs(p.lat - -35.675148) < 0.001);
        if (isDefault && p.comuna) {
            console.log(`Geocoding: ${p.localidad || ''} ${p.comuna}...`);
            let coords = await geocode(p.localidad, p.comuna);
            if (coords) {
                console.log(`  -> Result: ${coords.lat}, ${coords.lng}`);
                toUpdate.push({ id: p.id, lat: coords.lat, lng: coords.lng });
            } else {
                console.log(`  -> No results.`);
            }
            await sleep(1000); // 1 request per second to respect OSM limits
        }
    }
    
    console.log(`Found ${toUpdate.length} coordinates. Updating Supabase...`);
    
    let success = 0;
    for (let u of toUpdate) {
        let { error } = await supabase.from('tpl_catastro_mercado').update({ lat: u.lat, lng: u.lng }).eq('id', u.id);
        if(!error) success++;
    }
    
    console.log(`Updated ${success} records with localized coordinates.`);
})();
