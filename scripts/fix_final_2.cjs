const fs = require('fs');
const files = ['frontend-v2/parcela.html', 'frontend-v2/parcela-v2.html'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/aquíí/g, 'aquí?');
    fs.writeFileSync(f, content, 'utf8');
});
