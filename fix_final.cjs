const fs = require('fs');

function fixHtml(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // In HTML we have some remaining 'Â' instead of '¿' 
    content = content.replace(/\u00C2\uFFFD/g, '¿'); // Â No es...
    content = content.replace(/Â/g, '¿');
    content = content.replace(/Â¿/g, '¿');
    
    fs.writeFileSync(file, content, 'utf8');
}

function fixJs(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // JS has double mojibake because of string replacement issue
    const replacements = {
        '\uFFFD\u0192\u00C2\u00B3': 'ó', // encontr...
        '\uFFFD\u0192\uFFFD': 'á', // cat...logo, etc.
        '\uFFFD\u0192\u00C2\u00AD': 'í', // s...
        '\uFFFD\u0192\u00C2\u00A9': 'é', 
        '\uFFFD\u0192\u00C2\u00BA': 'ú',
        '\uFFFD\u0192\u00C2\u0081': 'Á',
        '\uFFFD\u0192\u00C2\u00B1': 'ñ',
        '\u00C3\u201A\u00C2\u00B2': '²', // m...
        '\uFFFD\u0192\u00E2\u20AC\u0153': 'é' // tÃ©cnicas -> t...cnicas maybe?
    };

    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }
    
    // Manual fallback for specific words that might be weird
    content = content.replace(/catÃ¡logo/g, 'catálogo');
    content = content.replace(/t\uFFFD\u0192\uFFFDcnicas/g, 'técnicas');
    content = content.replace(/t\uFFFD\u0192\uFFFDcnica/g, 'técnica');
    content = content.replace(/el\uFFFD\u0192\uFFFDctrica/g, 'eléctrica');
    content = content.replace(/est\uFFFD\u0192\uFFFD/g, 'está');
    content = content.replace(/cr\uFFFD\u0192\uFFFDdito/g, 'crédito');
    content = content.replace(/\u00C3\u201A\u00C2\u00A1/g, '¡');
    content = content.replace(/\uFFFD\u0192\u00C2\u00A0/g, 'á');
    content = content.replace(/m\u00C3\u201A\uFFFD/g, 'm²'); // mÃ‚
    
    fs.writeFileSync(file, content, 'utf8');
}

fixHtml('frontend-v2/parcela.html');
fixJs('frontend-v2/js/parcela.js');

console.log('Fixed successfully');
