const url = 'https://hwyscirbycojwndyzozn.supabase.co/rest/v1/tpl_catastro_mercado?select=*';
const key = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';

const comunaToRegion = {
    "chillán": "Ñuble", "chillan": "Ñuble", "quillón": "Ñuble", "quillon": "Ñuble",
    "san carlos": "Ñuble", "bulnes": "Ñuble", "san nicolás": "Ñuble", "coelemu": "Ñuble",
    "pemuco": "Ñuble", "ñipas": "Ñuble", "cobquecura": "Ñuble", "quirihue": "Ñuble",
    "coihueco": "Ñuble", "pinto": "Ñuble", "ñiquén": "Ñuble", "chillán viejo": "Ñuble",
    "chillan viejo": "Ñuble", "el carmen": "Ñuble", "san ignacio": "Ñuble", "yungay": "Ñuble",
    "treguaco": "Ñuble", "ninhue": "Ñuble", "san fabián": "Ñuble", "portezuelo": "Ñuble", "ránquil": "Ñuble",
    
    "los ángeles": "Biobío", "los angeles": "Biobío", "yumbel": "Biobío",
    "concepción": "Biobío", "concepcion": "Biobío", "cabrero": "Biobío",
    "nacimiento": "Biobío", "florida": "Biobío", "negrete": "Biobío",
    "mulchén": "Biobío", "laja": "Biobío", "coronel": "Biobío", "chiguayante": "Biobío",
    "san rosendo": "Biobío", "hualqui": "Biobío", "tucapel": "Biobío", "antuco": "Biobío",
    "santa juana": "Biobío", "lota": "Biobío", "tomé": "Biobío", "penco": "Biobío",
    "talcahuano": "Biobío", "san pedro de la paz": "Biobío", "quilleco": "Biobío",
    "quilaco": "Biobío", "santa bárbara": "Biobío", "arauco": "Biobío", "cañete": "Biobío", "hualpén": "Biobío",
    
    "villarrica": "La Araucanía", "pucón": "La Araucanía", "pucon": "La Araucanía",
    "temuco": "La Araucanía", "victoria": "La Araucanía", "lonquimay": "La Araucanía"
};

function capitalize(str) {
    if (!str) return 'Desconocida';
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

fetch(url, {
    method: 'GET',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
})
.then(r => r.json())
.then(data => {
    let regions = {};
    let portals = {};
    
    data.forEach(p => {
        let rawComuna = (p.comuna || "").trim().toLowerCase();
        if(!rawComuna) rawComuna = "desconocida";
        
        let regionName = comunaToRegion[rawComuna] || "Otras Regiones";
        let comunaName = capitalize(rawComuna);
        let portalName = capitalize(p.fuente || p.origen || p.portal || "Desconocida");
        
        portals[portalName] = (portals[portalName] || 0) + 1;
        
        if(!regions[regionName]) regions[regionName] = { count: 0, comunas: {} };
        regions[regionName].count++;
        
        if(!regions[regionName].comunas[comunaName]) {
            regions[regionName].comunas[comunaName] = { count: 0, portals: {}, sumUf: 0, sumM2: 0, validPrices: 0, validUfPerM2: 0, sumUfPerM2: 0 };
        }
        
        let cStats = regions[regionName].comunas[comunaName];
        cStats.count++;
        cStats.portals[portalName] = (cStats.portals[portalName] || 0) + 1;
        
        if(p.precio_uf > 0) {
            cStats.sumUf += p.precio_uf;
            cStats.validPrices++;
        }
        if(p.precio_uf > 0 && p.superficie_m2 > 0) {
            let ufPerM2 = p.precio_uf / p.superficie_m2;
            if(ufPerM2 > 0 && ufPerM2 < 5) {
                cStats.sumUfPerM2 += ufPerM2;
                cStats.validUfPerM2++;
            }
        }
    });
    
    let md = `# Auditoría de Catastro TPL\n\n`;
    md += `**Total Parcelas Catastradas:** ${data.length}\n\n`;
    
    md += `## 🌐 Resumen por Portales\n`;
    for(const [pName, count] of Object.entries(portals).sort((a,b)=>b[1]-a[1])) {
        md += `- **${pName}**: ${count} parcelas\n`;
    }
    
    md += `\n## 📍 Desglose Completo por Región y Comuna\n\n`;
    
    const sortedRegions = Object.entries(regions).sort((a,b)=>b[1].count - a[1].count);
    
    for(const [rName, rData] of sortedRegions) {
        md += `### ${rName} (${rData.count} parcelas)\n`;
        md += `| Comuna | Cantidad | Valor Prom. (UF) | Valor Prom. (UF/m²) | Portales |\n`;
        md += `|---|---|---|---|---|\n`;
        
        const sortedComunas = Object.entries(rData.comunas).sort((a,b)=>b[1].count - a[1].count);
        for(const [cName, cData] of sortedComunas) {
            let avgUf = cData.validPrices > 0 ? (cData.sumUf / cData.validPrices).toFixed(0) : "N/D";
            let avgUfM2 = cData.validUfPerM2 > 0 ? (cData.sumUfPerM2 / cData.validUfPerM2).toFixed(3) : "N/D";
            let pStr = Object.entries(cData.portals).map(x => `${x[0]}: ${x[1]}`).join(", ");
            
            md += `| **${cName}** | ${cData.count} | ${avgUf} | ${avgUfM2} | *${pStr}* |\n`;
        }
        md += `\n`;
    }
    
    const fs = require('fs');
    fs.writeFileSync('C:/Users/yo/.gemini/antigravity/brain/7230aab2-0882-4b56-a052-476094c4cd13/auditoria_catastro.md', md, 'utf8');
});
