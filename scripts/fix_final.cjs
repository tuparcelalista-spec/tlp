const fs = require('fs');
const files = ['frontend-v2/parcela.html', 'frontend-v2/parcela-v2.html', 'frontend-v2/js/parcela.js', 'frontend-v2/js/index.js'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let safeFixed = content.replace(/¿Te imaginas desarrollando tu proyecto aquíí?<\/?h2>/g, '¿Te imaginas desarrollando tu proyecto aquí?</h2>');
    fs.writeFileSync(f, safeFixed, 'utf8');
});
