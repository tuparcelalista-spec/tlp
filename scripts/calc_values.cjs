const url = 'https://hwyscirbycojwndyzozn.supabase.co/rest/v1/tpl_catastro_mercado?select=*';
const key = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

const comunaToRegion = {
    "chillán": "Ñuble", "chillan": "Ñuble", "quillón": "Ñuble", "quillon": "Ñuble",
    "san carlos": "Ñuble", "bulnes": "Ñuble", "san nicolás": "Ñuble", "coelemu": "Ñuble",
    "pemuco": "Ñuble", "ñipas": "Ñuble", "cobquecura": "Ñuble", "quirihue": "Ñuble",
    
    "los ángeles": "Biobío", "los angeles": "Biobío", "yumbel": "Biobío",
    "concepción": "Biobío", "concepcion": "Biobío", "cabrero": "Biobío",
    "nacimiento": "Biobío", "florida": "Biobío", "negrete": "Biobío",
    "mulchén": "Biobío", "laja": "Biobío", "coronel": "Biobío", "chiguayante": "Biobío",
    "san rosendo": "Biobío", "hualqui": "Biobío", "tucapel": "Biobío", "antaquito": "Biobío",
    
    "villarrica": "La Araucanía", "pucón": "La Araucanía", "pucon": "La Araucanía",
    "temuco": "La Araucanía", "victoria": "La Araucanía", "lonquimay": "La Araucanía",
    "cunco": "La Araucanía", "caburgua": "La Araucanía", "freire": "La Araucanía",
    
    "puerto varas": "Los Lagos", "frutillar": "Los Lagos", "osorno": "Los Lagos",
    "puerto montt": "Los Lagos", "llanquihue": "Los Lagos", "castro": "Los Lagos",
    
    "curacaví": "Metropolitana", "melipilla": "Metropolitana", "colina": "Metropolitana",
    "pirque": "Metropolitana", "lampa": "Metropolitana",
    
    "valdivia": "Los Ríos", "panguipulli": "Los Ríos", "futrono": "Los Ríos",
    "valparaíso": "Valparaíso", "casablanca": "Valparaíso", "limache": "Valparaíso"
};

fetch(url, {
    method: 'GET',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
})
.then(r => r.json())
.then(data => {
    let stats = {};
    let unknownComunas = {};
    
    data.forEach(p => {
        let cName = (p.comuna || "").trim().toLowerCase();
        let region = comunaToRegion[cName];
        
        if (!region) {
            region = "Otras / Por Mapear";
            unknownComunas[cName] = (unknownComunas[cName] || 0) + 1;
        }
        
        if (!stats[region]) {
            stats[region] = { count: 0, sumUf: 0, sumM2: 0, validPrices: 0, sumUfPerM2: 0, validUfPerM2: 0 };
        }
        
        stats[region].count++;
        
        if (p.precio_uf > 0) {
            stats[region].sumUf += p.precio_uf;
            stats[region].validPrices++;
        }
        
        if (p.precio_uf > 0 && p.superficie_m2 > 0) {
            let ufPerM2 = p.precio_uf / p.superficie_m2;
            // Filter out garbage data (like 1000 UF / 1m2 = 1000)
            if (ufPerM2 > 0 && ufPerM2 < 5) { 
                stats[region].sumUfPerM2 += ufPerM2;
                stats[region].validUfPerM2++;
            }
        }
    });
    
    console.log("=== VALORES POR REGIÓN ===");
    for (const [reg, s] of Object.entries(stats)) {
        let avgUf = s.validPrices > 0 ? (s.sumUf / s.validPrices).toFixed(0) : 0;
        let avgUfPerM2 = s.validUfPerM2 > 0 ? (s.sumUfPerM2 / s.validUfPerM2).toFixed(3) : 0;
        console.log(`\nRegión: ${reg}`);
        console.log(` - Cantidad: ${s.count} parcelas`);
        console.log(` - Valor Promedio: ${avgUf} UF`);
        console.log(` - Valor Promedio m²: ${avgUfPerM2} UF/m²`);
    }
    
    console.log("\n=== TOP COMUNAS NO MAPEADAS (Para debug) ===");
    console.log(Object.entries(unknownComunas).sort((a,b)=>b[1]-a[1]).slice(0, 5));
});
