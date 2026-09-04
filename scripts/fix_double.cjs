const fs = require('fs');
const files = ['frontend-v2/parcela.html', 'frontend-v2/parcela-v2.html', 'frontend-v2/js/parcela.js', 'frontend-v2/js/index.js'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let safeFixed = content
        .replace(/aquíí/g, 'aquí')
        .replace(/aquí\?/g, 'aquí?')
        .replace(/aquí\.\.\./g, 'aquí?')
        .replace(/Síí/g, 'Sí')
        .replace(/Sí\?/g, 'Sí?')
        .replace(/¿Te imaginas desarrollando tu proyecto aquí\?/g, '¿Te imaginas desarrollando tu proyecto aquí?')
        .replace(/aquí\?í/g, 'aquí?');
    fs.writeFileSync(f, safeFixed, 'utf8');
});
console.log('Fixed double letters.');
