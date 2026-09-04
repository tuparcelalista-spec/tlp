const texto_original = `
Ubicación
Quinchamalí, Chillán, Ñuble
`;

const texto_original_2 = `
Ubicación
San Nicolás, San Nicolás, Ñuble
`;

const texto_original_3 = `
Ubicación
Chillán, Ñuble
`;

const comunasComunes = ['villarrica', 'pucón', 'loncoche', 'temuco', 'valdivia', 'puerto varas', 'frutillar', 'cobquecura', 'coelemu', 'ninhue', 'portezuelo', 'quirihue', 'ránquil', 'treguaco', 'bulnes', 'chillán', 'chillán viejo', 'el carmen', 'pemuco', 'pinto', 'quillón', 'san ignacio', 'yungay', 'coihueco', 'ñiquén', 'san carlos', 'san fabián', 'san nicolás', 'concepción', 'coronel', 'chiguayante', 'florida', 'hualqui', 'lota', 'penco', 'san pedro de la paz', 'santa juana', 'talcahuano', 'tomé', 'hualpén', 'lebu', 'arauco', 'cañete', 'contulmo', 'curanilahue', 'los álamos', 'tirúa', 'los ángeles', 'antuco', 'cabrero', 'laja', 'mulchén', 'nacimiento', 'negrete', 'quilaco', 'quilleco', 'san rosendo', 'santa bárbara', 'tucapel', 'yumbel', 'alto biobío'];

function testUbicacion(text) {
    let localidad = "";
    let comuna = "";
    
    // Buscar el bloque Ubicación
    const ubiRegex = /Ubicaci[oó]n\s+([^,\n]+)\s*,\s*([^,\n]+)(?:\s*,\s*([^,\n]+))?/i;
    const match = text.match(ubiRegex);
    if (match) {
        const part1 = match[1].trim();
        const part2 = match[2].trim();
        const part3 = match[3] ? match[3].trim() : "";
        
        // normalizamos para buscar en el array
        const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const comunasNorm = comunasComunes.map(norm);
        
        // Si hay 3 partes (Localidad, Comuna, Región)
        if (part3) {
            // chequear si part2 es comuna
            if (comunasNorm.includes(norm(part2))) {
                comuna = part2;
                localidad = part1;
            } else if (comunasNorm.includes(norm(part1))) {
                comuna = part1;
            }
        } else {
            // Si hay 2 partes (Comuna, Región) o (Localidad, Comuna)
            if (comunasNorm.includes(norm(part1))) {
                comuna = part1;
            } else if (comunasNorm.includes(norm(part2))) {
                comuna = part2;
                localidad = part1;
            }
        }
    }
    console.log({text: text.trim().replace(/\n/g,' '), localidad, comuna});
}

testUbicacion(texto_original);
testUbicacion(texto_original_2);
testUbicacion(texto_original_3);
