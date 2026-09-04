const fs = require('fs');
let html = fs.readFileSync('frontend-v2/parcela.html', 'utf8');

// 1. Change CSS
html = html.replace('parcela.css?v=20260803-valores-canonicos-v1', 'parcela-v2.css?v=1');

// 2. Add override script right before video script or </body>
if (!html.includes('parcela-v2-override.js')) {
    html = html.replace('</body>', '<script src=\"./js/parcela-v2-override.js\"></script>\n</body>');
}

fs.writeFileSync('frontend-v2/parcela-v2.html', html);
console.log('Fixed parcela-v2.html');
