const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// Agregar portalterreno a fuente
js = js.replace(
    "if (url_actual.includes('yapo.cl')) fuente = 'yapo';",
    "if (url_actual.includes('yapo.cl')) fuente = 'yapo';\nif (url_actual.includes('portalterreno.cl')) fuente = 'portalterreno';"
);

// Modificar ubiRegex para soportar saltos de linea despues de ubicacion y no obligar a la coma
// En PortalTerreno sale:
// Ubicación
// Cobquecura
// Descripción
const ubiRegexOld = /const ubiRegex = \/Ubicaci\[oó\]n\[\\s:\\-–\]\*\(\[\^,\\n\]\+\)\\s\*,\\s\*\(\[\^,\\n\]\+\)\(\?:\\s\*,\\s\*\(\[\^,\\n\]\+\)\)\?\/i;/;
const ubiRegexNew = `const ubiRegex = /Ubicaci[oó]n[\\s:\\-–]*([^,\\n]+)(?:\\s*,\\s*([^,\\n]+))?(?:\\s*,\\s*([^,\\n]+))?/i;`;
js = js.replace(ubiRegexOld, ubiRegexNew);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log('Added portalterreno!');
