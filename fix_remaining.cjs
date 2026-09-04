
const fs = require('fs');

let html = fs.readFileSync('frontend-v2/parcela.html', 'utf8');
html = html.replace(/Â¿/g, '¿');
html = html.replace(/Ã ngeles/g, 'Ángeles');
fs.writeFileSync('frontend-v2/parcela.html', html, 'utf8');

let js = fs.readFileSync('frontend-v2/js/parcela.js', 'utf8');
js = js.replace(/Ã‚Â²/g, '²');
js = js.replace(/mÃ‚Â²/g, 'm²');
js = js.replace(/Ã‚Â©/g, '©');
js = js.replace(/ÃƒÂ/g, 'Á'); // if there is any lone one
fs.writeFileSync('frontend-v2/js/parcela.js', js, 'utf8');

console.log('Fixed remaining');

