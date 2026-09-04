const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

const oldBlock = /const supRegex = \/\\\(\[0-9\]\+\(\?:\[\.,\]\[0-9\]\+\)\?\\\)\\s\*\(\?:\\\\b\(\?:ha\|has\|hect\[aá\]reas\|metros\)\\\\b\|m2\|m²\|mts2\?\(\?:\\\\b\|\$\)\)\/gi;\nconst supMatches = \[\.\.\.texto_original\.matchAll\(supRegex\)\];\nif \(supMatches\.length > 0\) {\nlet maxS = 0;\nfor\(let m of supMatches\) {\nlet matchText = m\[1\];\nlet isHa = m\[0\]\.toLowerCase\(\)\.includes\('ha'\) \|\| m\[0\]\.toLowerCase\(\)\.includes\('hect'\);\nlet s;\nif \(matchText\.includes\('\.'\) \|\| matchText\.includes\(','\)\) {\nlet normalized = matchText\.replace\(',', '\.'\);\nif \(!isHa && \/\\\\\.\[0-9\]\{3\}\$\/\.test\(normalized\)\) {\ns = parseFloat\(normalized\.replace\('\.', ''\)\);\n\}else {\ns = parseFloat\(normalized\);\n\}\n\}else {\ns = parseFloat\(matchText\);\n\}\nif \(isHa\) s = s \* 10000;\nif \(s > maxS\) maxS = s;\n\}\nsup = maxS;\n\}/;

const newBlock = `const supRegex = /(?:(?:[AÁaá]rea total(?: del terreno)?\\s*\\(m²\\)|\\bSuperficie total\\b)\\s*\\n*\\s*([0-9]+(?:[.,][0-9]+)?))|([0-9]+(?:[.,][0-9]+)?)\\s*(?:\\b(?:ha|has|hect[aá]reas|metros(?!\\s+(?:de|del|al|a\\b)))\\b|m2|m²|mts2?(?:\\b|$))/gi;
const supMatches = [...texto_original.matchAll(supRegex)];
if (supMatches.length > 0) {
let maxS = 0;
for(let m of supMatches) {
let matchText = m[1] || m[2];
let isHa = m[0].toLowerCase().includes('ha') || m[0].toLowerCase().includes('hect');
let s;
if (matchText.includes('.') || matchText.includes(',')) {
let normalized = matchText.replace(',', '.');
if (!isHa && /\\.[0-9]{3}$/.test(normalized)) {
s = parseFloat(normalized.replace('.', ''));
}else {
s = parseFloat(normalized);
}
}else {
s = parseFloat(matchText);
}
if (isHa) s = s * 10000;
if (s > maxS) maxS = s;
}
sup = maxS;
}`;

// I will use regex replace with a simple replace logic
js = js.replace(/const supRegex = \/.*?sup = maxS;\n}/s, newBlock);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log('Fixed 800m bug and updated supRegex block!');
