const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

const oldBlock = /const ubiRegex = \/Ubicaci\[oó\]n\[\\s:\\-–\]\*\(\[\^,\\n\]\+\)\(\?:\\s\*,\\s\*\(\[\^,\\n\]\+\)\)\?\(\?:\\s\*,\\s\*\(\[\^,\\n\]\+\)\)\?\/i;\nconst ubiMatch = texto_original\.match\(ubiRegex\);\nif \(ubiMatch\) {\nconst part1 = ubiMatch\[1\]\.trim\(\);\nconst part2 = ubiMatch\[2\] \? ubiMatch\[2\]\.trim\(\) : "";\nconst part3 = ubiMatch\[3\] \? ubiMatch\[3\]\.trim\(\) : "";\nconst norm = \(s\) => s\.toLowerCase\(\)\.normalize\("NFD"\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\);\nconst comunasNorm = comunasComunes\.map\(norm\);\nif \(part3\) {\nif \(comunasNorm\.includes\(norm\(part2\)\)\) {\ncomuna = part2;\nlocalidad = part1;\n}else if \(comunasNorm\.includes\(norm\(part1\)\)\) {\ncomuna = part1;\n}\n}else if \(part2\) {\nif \(comunasNorm\.includes\(norm\(part1\)\)\) {\ncomuna = part1;\n}else if \(comunasNorm\.includes\(norm\(part2\)\)\) {\ncomuna = part2;\nlocalidad = part1;\n}\n}else {\nif \(comunasNorm\.includes\(norm\(part1\)\)\) {\ncomuna = part1;\n}\n}\n}/;

const newBlock = `const ubiRegex = /Ubicaci[oó]n[\\s:\\-–]*([^\\n]+)/i;
const ubiMatch = texto_original.match(ubiRegex);
if (ubiMatch) {
    const parts = ubiMatch[1].split(',').map(s => s.trim());
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    const comunasNorm = comunasComunes.map(norm);
    
    // Check parts from right to left
    for (let i = parts.length - 1; i >= 0; i--) {
        // Strip away specific patterns like 'Qj36+3j ' just in case
        let cleanPart = parts[i].replace(/^[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+/g, '').trim();
        if (comunasNorm.includes(norm(cleanPart))) {
            comuna = cleanPart;
            // If there's a part to its left, consider it locality
            if (i > 0) {
                localidad = parts[i-1].replace(/^[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+/g, '').trim();
            }
            break;
        }
        
        // If the part has multiple words separated by space, check each word just in case
        const words = cleanPart.split(' ');
        for (let word of words) {
            if (comunasNorm.includes(norm(word))) {
                comuna = word;
                break;
            }
        }
        if (comuna) break;
    }
}`;

js = js.replace(oldBlock, newBlock);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');

const minified = js.replace(/\n\s*/g, ' ').replace(/;\s+/g, ';').replace(/{\s+/g, '{').replace(/}\s+/g, '}');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');

console.log('Fixed ubiRegex to handle dynamic commas and Arauco bug!');
