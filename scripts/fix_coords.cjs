const url = 'https://hwyscirbycojwndyzozn.supabase.co/rest/v1/tpl_catastro_mercado';
const key = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

// Diccionario base de coordenadas por comuna
const communeCoords = {
    "los ángeles": { lat: -37.4697, lng: -72.3536 },
    "los angeles": { lat: -37.4697, lng: -72.3536 },
    "yumbel": { lat: -37.0863, lng: -72.5630 },
    "quillón": { lat: -36.7433, lng: -72.4646 },
    "quillon": { lat: -36.7433, lng: -72.4646 },
    "florida": { lat: -36.8208, lng: -72.6713 },
    "cabrero": { lat: -37.0347, lng: -72.4042 },
    "coihueco": { lat: -36.6186, lng: -71.8480 },
    "chillán": { lat: -36.6066, lng: -72.1034 },
    "chillan": { lat: -36.6066, lng: -72.1034 },
    "pinto": { lat: -36.7027, lng: -71.8967 },
    "san ignacio": { lat: -36.7933, lng: -72.0305 },
    "hualqui": { lat: -36.9744, lng: -72.9372 },
    "laja": { lat: -37.2796, lng: -72.6800 },
    "antuco": { lat: -37.3333, lng: -71.6833 },
    "cañete": { lat: -37.8016, lng: -73.3963 },
    "pucón": { lat: -39.2743, lng: -71.9758 },
    "pucon": { lat: -39.2743, lng: -71.9758 },
    "santa juana": { lat: -37.1724, lng: -72.9427 },
    "villarrica": { lat: -39.2818, lng: -72.2263 },
    "bulnes": { lat: -36.7410, lng: -72.2982 },
    "mulchén": { lat: -37.7180, lng: -72.2396 },
    "nacimiento": { lat: -37.5028, lng: -72.6738 },
    "san carlos": { lat: -36.4259, lng: -71.9567 },
    "concepción": { lat: -36.8201, lng: -73.0443 },
    "concepcion": { lat: -36.8201, lng: -73.0443 },
    "coronel": { lat: -37.0333, lng: -73.1500 },
    "temuco": { lat: -38.7359, lng: -72.5904 },
    "puerto varas": { lat: -41.3204, lng: -72.9830 },
    "ninhue": { lat: -36.3938, lng: -72.4049 },
    "san nicolás": { lat: -36.5019, lng: -72.2105 },
    "tucapel": { lat: -37.2833, lng: -71.9500 },
    "quilleco": { lat: -37.4667, lng: -71.9667 },
    "arauco": { lat: -37.2464, lng: -73.3175 },
    "cobquecura": { lat: -36.1302, lng: -72.7936 },
    "chillán viejo": { lat: -36.6333, lng: -72.1333 }
};

// Funcin para obtener coordenadas con un poco de aleatoriedad (jitter) 
// para que no queden todas las parcelas exactamente en el mismo punto de la comuna.
function getJitteredCoords(comuna) {
    const base = communeCoords[comuna.toLowerCase()];
    if (!base) return null;
    
    // Rango de variacin: ~ +/- 5 a 10 km (aprox 0.05 grados)
    const latJitter = (Math.random() - 0.5) * 0.08;
    const lngJitter = (Math.random() - 0.5) * 0.08;
    
    return {
        lat: parseFloat((base.lat + latJitter).toFixed(6)),
        lng: parseFloat((base.lng + lngJitter).toFixed(6))
    };
}

async function fixCoordinates() {
    console.log("Obteniendo catastro...");
    const res = await fetch(url + '?select=id,comuna,lat,lng', {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await res.json();
    
    const missing = data.filter(p => !p.lat || !p.lng || p.lat === 0 || p.lng === 0);
    console.log(`Encontradas ${missing.length} parcelas sin coordenadas.`);
    
    let updatedCount = 0;
    let failedCount = 0;
    
    for (const p of missing) {
        if (!p.comuna) continue;
        
        const cName = p.comuna.trim();
        const coords = getJitteredCoords(cName);
        
        if (coords) {
            // Actualizar fila
            const patchRes = await fetch(`${url}?id=eq.${p.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    lat: coords.lat,
                    lng: coords.lng
                })
            });
            
            if (patchRes.ok) {
                updatedCount++;
                console.log(`[OK] Asignadas coords a parcela en ${cName} -> Lat: ${coords.lat}, Lng: ${coords.lng}`);
            } else {
                failedCount++;
                console.error(`[ERROR] Fall parche en ${cName}`);
            }
        } else {
            console.warn(`[OMITIDA] No hay coordenadas base para la comuna: "${cName}"`);
        }
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Parcelas corregidas exitosamente: ${updatedCount}`);
    console.log(`Fallidas: ${failedCount}`);
}

fixCoordinates();
