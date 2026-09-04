const fs = require('fs');
['frontend-v2/js/index.js', 'frontend-v2/js/parcela.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Reverse the bad regex
    let fixed = content
        .replace(/ \.\.\. /g, ' ? ')
        .replace(/\.\.\.\./g, '?.')
        .replace(/\.\.\.\.\.\./g, '??')
        .replace(/\.html\.\.\.\$\{/g, '.html?${')
        .replace(/\.html\.\.\./g, '.html?')
        .replace(/param\ufffds/g, 'params')
        .replace(/params/g, 'params')
        .replace(/difference\ufffdLabel/g, 'differenceLabel')
        .replace(/differenceLabel/g, 'differenceLabel')
        .replace(/price\ufffdText/g, 'priceText')
        .replace(/priceText/g, 'priceText')
        .replace(/size\ufffdText/g, 'sizeText')
        .replace(/sizeText/g, 'sizeText')
        .replace(/houseRoom\ufffds/g, 'houseRooms')
        .replace(/houseRooms/g, 'houseRooms')
        ;
        
    fs.writeFileSync(f, fixed, 'utf8');
});
console.log('Fixed broken JS ternaries and optional chaining.');
