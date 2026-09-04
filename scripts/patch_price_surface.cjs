const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// 1. Fix price logic
const oldPriceLogic = /const clpRegex = \/\\\$\[\\s\]\*\(\[0-9\]\{1,3\}\(\?:\\\.\[0-9\]\{3\}\)\{1,3\}\)\/g;\nconst clpMatches = \[\.\.\.texto_original\.matchAll\(clpRegex\)\];\nif \(clpMatches\.length > 0\) {\nconst sortedCLP = clpMatches\.map\(m => parseInt\(m\[1\]\.replace\(\/\\\.\/g, ''\)\)\)\.sort\(\(a, b\) => b - a\);\nclp = sortedCLP\[0\];\n}/;

const newPriceLogic = `const clpRegex = /\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3}){1,3})/g;
const clpMatches = [...texto_original.matchAll(clpRegex)];
if (clpMatches.length > 0) {
    // Buscar primero si hay un precio con etiqueta explícita
    const explicitClpRegex = /(?:Precio|Valor)[^$0-9]{0,20}\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3}){1,3})/i;
    const explicitMatch = texto_original.match(explicitClpRegex);
    if (explicitMatch) {
        clp = parseInt(explicitMatch[1].replace(/\\./g, ''));
    } else {
        const sortedCLP = clpMatches.map(m => parseInt(m[1].replace(/\\./g, ''))).sort((a, b) => b - a);
        clp = sortedCLP[0];
    }
}`;

js = js.replace(oldPriceLogic, newPriceLogic);

// 2. Fix surface logic
const oldSupLogic = /const supMatches = \[\.\.\.texto_original\.matchAll\(supRegex\)\];\nif \(supMatches\.length > 0\) {\nlet maxS = 0;\nfor\(let m of supMatches\) {\nlet matchText = m\[1\] \|\| m\[2\];\nlet isHa = m\[0\]\.toLowerCase\(\)\.includes\('ha'\) \|\| m\[0\]\.toLowerCase\(\)\.includes\('hect'\);\nlet s;\nif \(matchText\.includes\('\.'\) \|\| matchText\.includes\(','\)\) {\nlet normalized = matchText\.replace\(',', '\.'\);\nif \(!isHa && \/\\\\.\[0-9\]\{3\}\$\/\.test\(normalized\)\) {\ns = parseFloat\(normalized\.replace\('\.', ''\)\);\n}else {\ns = parseFloat\(normalized\);\n}\n}else {\ns = parseFloat\(matchText\);\n}\nif \(isHa\) s = s \* 10000;\nif \(s > maxS\) maxS = s;\n}\nsup = maxS;\n}/;

const newSupLogic = `const supMatches = [...texto_original.matchAll(supRegex)];
if (supMatches.length > 0) {
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
}`;

js = js.replace(oldSupLogic, newSupLogic);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log("Updated price and surface logic in bookmarklet");
