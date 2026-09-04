const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// Strip single line comments that start with //
// but preserve URLs like http://
js = js.split('\n').map(line => {
    let idx = line.indexOf('//');
    if (idx !== -1) {
        if (idx > 0 && line[idx-1] === ':') {
            return line; // it's likely a URL like https://
        }
        return line.substring(0, idx).trim();
    }
    return line;
}).join('\n');

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');
console.log('Comments removed from bookmarklet.js');
