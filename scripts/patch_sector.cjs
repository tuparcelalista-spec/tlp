const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// Modificamos el fallback original de locRegex
const locRegexOld = /const locRegex = \/\(\?:sector\|localidad\|cerca de\|cercano a\|cercana a\|camino a\)\\s\+\(\[a-zñáéíóúü\]\+\(\?:\\s\+\[a-zñáéíóúü\]\+\)\{0,2\}\)\/i;/;
const locRegexNew = `const locRegex = /(?:sector|localidad|cerca|cercano|camino)\\s+(?:de\\s+|a\\s+|al\\s+)?([a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+(?:\\s+[a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+){0,2})/i;`;
js = js.replace(locRegexOld, locRegexNew);

// Agregamos una limpieza final para la localidad
const limpieza = `
if (localidad) {
    localidad = localidad.replace(/^(?:sector|localidad|camino|cerca|cercano)\\s+(?:de\\s+|a\\s+|al\\s+)?/i, '').trim();
}
const keywordMap`;
js = js.replace('const keywordMap', limpieza);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log('Sector logic updated!');
