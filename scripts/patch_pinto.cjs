const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// 1. Fix ubiRegex
js = js.replace(
    /const ubiRegex = \/Ubicaci\[oó\]n\\s\+\(\[\^,\\n\]\+\)\\s\*,\\s\*\(\[\^,\\n\]\+\)\(\?:\\s\*,\\s\*\(\[\^,\\n\]\+\)\)\?\/i;/,
    "const ubiRegex = /Ubicaci[oó]n[\\s:\\-–]*([^,\\n]+)\\s*,\\s*([^,\\n]+)(?:\\s*,\\s*([^,\\n]+))?/i;"
);

// 2. Fix fallback to avoid "pintoresco" matching "Pinto"
js = js.replace(
    /const foundComuna = comunasComunes\.find\(c => new RegExp\(c, 'i'\)\.test\(texto_original\)\);/,
    "const foundComuna = comunasComunes.find(c => new RegExp('(^|[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ])' + c + '([^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]|$)', 'i').test(texto_original));"
);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log('Fixed Pinto bug and ubiRegex!');
