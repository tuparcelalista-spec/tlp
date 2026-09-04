
const fs = require('fs');

const replacements = {
    '\u00C3\u00B3': 'ó',
    '\u00C3\u00A1': 'á',
    '\u00C3\u00A9': 'é',
    '\u00C3\u00AD': 'í',
    '\u00C3\u00BA': 'ú',
    '\u00C3\u0081': 'Á',
    '\u00C3\u00B1': 'ñ',
    '\u00C2\u00B2': '²',
    '\u00C2\u00BF': '¿',
    '\u00C3\u2014': '×',
    '\u00C3\u201C': 'Ó',
    '\u00C3\u201A\u00C2\u00B2': '²',
    '\u00C3\u201A\u00C2\u00A9': '©',
    '\u00C3\u201A\u00C2\u00A1': '¡'
};

const replacementsJS = {
    '\u00C3\u0192\u00C2\u00B3': 'ó',  // ÃƒÂ³
    '\u00C3\u0192\u00C2\u00A1': 'á',  // ÃƒÂ¡
    '\u00C3\u0192\u00C2\u00A9': 'é',  // ÃƒÂ©
    '\u00C3\u0192\u00C2\u00AD': 'í',  // ÃƒÂ­
    '\u00C3\u0192\u00C2\u00BA': 'ú',  // ÃƒÂº
    '\u00C3\u0192\u00E2\u20AC\u0153': 'é', // Ãƒctrica... wait, let's just do replace all 
    'ÃƒÂ³': 'ó',
    'ÃƒÂ¡': 'á',
    'ÃƒÂ©': 'é',
    'ÃƒÂ­': 'í',
    'ÃƒÂº': 'ú',
    'ÃƒÂ': 'Á',
    'Ã‚Â²': '²',
    'Ã‚Â©': '©',
    'Ã‚Â¡': '¡',
    'Ãƒ': 'é',
    'mÃ‚': 'm²'
};

function fixFile(file, isJS) {
    let content = fs.readFileSync(file, 'utf8');
    
    // First apply specific JS replacements if needed (these might be corrupted by powershell write)
    if (isJS) {
        let buf = Buffer.from(content, 'utf8');
        let str = buf.toString('utf8');
        str = str.replace(/ÃƒÂ³/g, 'ó').replace(/ÃƒÂ¡/g, 'á').replace(/ÃƒÂ©/g, 'é').replace(/ÃƒÂ­/g, 'í').replace(/ÃƒÂº/g, 'ú');
        str = str.replace(/ÃƒÂ/g, 'Á').replace(/Ã‚Â²/g, '²').replace(/Ã‚Â©/g, '©').replace(/Ã‚Â¡/g, '¡');
        str = str.replace(/Ãƒ/g, 'é').replace(/mÃ‚/g, 'm²');
        content = str;
    }
    
    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }
    fs.writeFileSync(file, content, 'utf8');
}

fixFile('frontend-v2/parcela.html', false);
fixFile('frontend-v2/js/parcela.js', true);
console.log('Fixed files securely.');

