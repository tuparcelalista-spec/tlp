const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// The buggy regex
const supRegexOld = /const supRegex = \/\\\(\[0-9\]\+\(\?:\[\.,\]\[0-9\]\+\)\?\\\)\\\s\*\(\?:m2\|m²\|mts2\?\|metros\|hect\[aá\]reas\|has\?\)\/gi;/;
const supRegexNew = `const supRegex = /([0-9]+(?:[.,][0-9]+)?)\\s*(?:\\b(?:ha|has|hect[aá]reas|metros)\\b|m2|m²|mts2?(?:\\b|$))/gi;`;

js = js.replace(supRegexOld, supRegexNew);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log('Fixed supRegex!');
