const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// The file might be messy now. Let's just restore the file from a clean state and apply everything.
// Wait, I can just replace `clp = sortedCLP[0];` with `clp = sortedCLP[0];` -> actually, just do string replacements.

js = js.replace(
    "const sortedCLP = clpMatches.map(m => parseInt(m[1].replace(/\\./g, ''))).sort((a, b) => b - a);\nclp = sortedCLP[0];",
    `const explicitClpRegex = /(?:Precio|Valor)[^$0-9]{0,20}\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3}){1,3})/i;
    const explicitMatch = texto_original.match(explicitClpRegex);
    if (explicitMatch) {
        clp = parseInt(explicitMatch[1].replace(/\\./g, ''));
    } else {
        const sortedCLP = clpMatches.map(m => parseInt(m[1].replace(/\\./g, ''))).sort((a, b) => b - a);
        clp = sortedCLP[0];
    }`
);

// For surface, replace the entire `if (supMatches.length > 0) { ... }` block
let oldSupBlock = `if (supMatches.length > 0) {
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

// I'll use regex to match the supMatches block
js = js.replace(
    /if \(supMatches\.length > 0\) {[\s\S]*?sup = maxS;\s*}/,
    `if (supMatches.length > 0) {
    let maxS = 0;
    let explicitS = null;
    for(let m of supMatches) {
        let matchText = m[1] || m[2];
        let isHa = m[0].toLowerCase().includes('ha') || m[0].toLowerCase().includes('hect');
        let s;
        if (matchText.includes('.') || matchText.includes(',')) {
            let normalized = matchText.replace(',', '.');
            if (!isHa && /\\.[0-9]{3}$/.test(normalized)) {
                s = parseFloat(normalized.replace('.', ''));
            } else {
                s = parseFloat(normalized);
            }
        } else {
            s = parseFloat(matchText);
        }
        if (isHa) s = s * 10000;
        
        if (m[1]) {
            explicitS = s;
            break;
        }
        if (s > maxS) maxS = s;
    }
    sup = explicitS || maxS;
}`
);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log("Patched price and surface!");
