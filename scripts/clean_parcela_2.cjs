const fs = require('fs');
['frontend-v2/js/parcela.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    let fixed = content
        .replace(/\?fallback/g, '...fallback')
        .replace(/\?tags\)/g, '...tags)')
        .replace(/\?new Set/g, '...new Set')
        .replace(/\[\?/g, '[...')
        .replace(/\?remoteImages/g, '...remoteImages')
        .replace(/\?localImages/g, '...localImages')
        .replace(/Math\.max\(\?/g, 'Math.max(...')
        .replace(/Math\.min\(\?/g, 'Math.min(...')
        .replace(/\?,/g, '...,') // this is risky
        ;
        
    fs.writeFileSync(f, fixed, 'utf8');
});
console.log('Fixed parcela.js spreads...');
