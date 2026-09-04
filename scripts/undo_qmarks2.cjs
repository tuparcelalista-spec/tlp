const fs = require('fs');
['frontend-v2/js/index.js', 'frontend-v2/js/parcela.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    let fixed = content
        .replace(/10000\.\.\.'Campo'/g, "10000 ? 'Campo'")
        .replace(/\?\.\.\./g, '??')
        .replace(/\^\(https\.\.\.:\)\.\.\.\\\//g, '^(https?:)?\\/')
        .replace(/CLP\.format\(difference\)\}\`/g, 'CLP.format(difference)}`') // sanity
        .replace(/size \.\.\. \`/g, 'size ? `')
        .replace(/difference >= 0 \.\.\. "is-under"/g, 'difference >= 0 ? "is-under"')
        .replace(/value \.\.\. value/g, 'value ? value')
        .replace(/list\.length === 1 \.\.\. /g, 'list.length === 1 ? ')
        .replace(/visible\.length \.\.\. visible\.map/g, 'visible.length ? visible.map')
        .replace(/state\.active \.\.\. \`/g, 'state.active ? `')
        .replace(/size >= 10000 \.\.\. /g, 'size >= 10000 ? ')
        .replace(/opp \.\.\. /g, 'opp ? ')
        .replace(/index === 0 \.\.\. /g, 'index === 0 ? ')
        .replace(/p\.precio \.\.\. /g, 'p.precio ? ')
        .replace(/sizeStr \.\.\. sizeStr/g, 'sizeStr ? sizeStr')
        .replace(/results\.length \.\.\. results/g, 'results.length ? results')
        .replace(/results\.length \.\.\. \`/g, 'results.length ? `')
        .replace(/houseSize\(house\) \.\.\. /g, 'houseSize(house) ? ')
        ;
        
    fs.writeFileSync(f, fixed, 'utf8');
});
console.log('Fixed more ternaries and regex.');
