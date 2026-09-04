const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

const regexUbicacion = `let localidad = "";
const ubiRegex = /Ubicaci[oó]n\\s+([^,\\n]+)\\s*,\\s*([^,\\n]+)(?:\\s*,\\s*([^,\\n]+))?/i;
const ubiMatch = texto_original.match(ubiRegex);
if (ubiMatch) {
    const part1 = ubiMatch[1].trim();
    const part2 = ubiMatch[2].trim();
    const part3 = ubiMatch[3] ? ubiMatch[3].trim() : "";
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    const comunasNorm = comunasComunes.map(norm);
    if (part3) {
        if (comunasNorm.includes(norm(part2))) {
            comuna = part2;
            localidad = part1;
        } else if (comunasNorm.includes(norm(part1))) {
            comuna = part1;
        }
    } else {
        if (comunasNorm.includes(norm(part1))) {
            comuna = part1;
        } else if (comunasNorm.includes(norm(part2))) {
            comuna = part2;
            localidad = part1;
        }
    }
}
if (!comuna) {
    const foundComuna = comunasComunes.find(c => new RegExp(c, 'i').test(texto_original));
    if (foundComuna) comuna = foundComuna;
}
if (!localidad) {
    const locRegex = /(?:sector|localidad|cerca de|cercano a|cercana a|camino a)\\s+([a-zñáéíóúü]+(?:\\s+[a-zñáéíóúü]+){0,2})/i;
    const locMatch = texto_original.match(locRegex);
    if (locMatch && locMatch[1]) {
        localidad = locMatch[1].trim();
        if (['la', 'el', 'los', 'las', 'un', 'una'].includes(localidad.toLowerCase())) localidad = '';
    }
}`;

// Reemplazar todo lo relacionado a comuna y localidad
js = js.replace(/const foundComuna = comunasComunes.*?if \(\['la', 'el', 'los', 'las', 'un', 'una'\]\.includes\(localidad\.toLowerCase\(\)\)\) localidad = '';\n\s*}/s, regexUbicacion);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log('Done!');
