const fs = require('fs');
['frontend-v2/js/parcela.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    let fixed = content
        .replace(/parcelas\.\.\.parcelas:/g, 'parcelas ? parcelas :')
        .replace(/\.\.\./g, '?');
        
    fs.writeFileSync(f, fixed, 'utf8');
});
console.log('Fixed parcela.js ...');
