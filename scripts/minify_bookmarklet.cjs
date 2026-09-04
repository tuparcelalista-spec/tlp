const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

// Remove multiline comments
js = js.replace(/\/\*[\s\S]*?\*\//g, '');
// Remove single line comments (being careful not to remove URLs)
js = js.split('\n').map(line => {
    // Basic comment removal: find // but ignore it if it's inside http:// or https://
    let idx = line.indexOf('//');
    if (idx !== -1) {
        // if it's preceded by : (like http://) ignore
        if (idx > 0 && line[idx-1] === ':') return line.trim();
        return line.substring(0, idx).trim();
    }
    return line.trim();
}).filter(l => l.length > 0).join(' ');

// Fix specific URL comment issue if there was one
js = js.replace(/https:\/\//g, 'https://'); 

// Encode URI
const bookmarklet = encodeURI(js);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', js, 'utf8');
console.log('Done');
