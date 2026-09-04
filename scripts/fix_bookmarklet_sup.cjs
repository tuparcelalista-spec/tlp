const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

const oldRegexLogic = /\/\/ 2\. Extraer Superficie.*?\n\s*const supRegex = \/.*?gi;\n\s*const supMatches = \[\.\.\.texto_original\.matchAll\(supRegex\)\];\n\s*if \(supMatches\.length > 0\) \{.*?\n\s*\}/s;

const newRegexLogic = `// 2. Extraer Superficie
        const supRegex = /([0-9]+(?:[.,][0-9]+)?)\\s*(?:m2|m²|mts2?|metros|hect[aá]reas|has?)\\b/gi;
        const supMatches = [...texto_original.matchAll(supRegex)];
        if (supMatches.length > 0) {
            let maxS = 0;
            for(let m of supMatches) {
                let matchText = m[1];
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
                if (s > maxS) maxS = s;
            }
            sup = maxS;
        }`;

if (js.match(oldRegexLogic)) {
    js = js.replace(oldRegexLogic, newRegexLogic);
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');
    console.log('Fixed supRegex in bookmarklet.js');
} else {
    console.log('Could not find old Regex Logic in bookmarklet.js');
}
