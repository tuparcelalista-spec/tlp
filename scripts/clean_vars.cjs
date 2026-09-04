const fs = require('fs');
['frontend-v2/js/index.js', 'frontend-v2/js/parcela.js', 'frontend-v2/parcela-v2.html'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Fix all the bad '¿' replacements in JS and HTML if any
    let fixed = content
        .replace(/¿Qu¿ill¿n/g, 'Quillón')
        .replace(/¿La Araucan¿a/g, 'La Araucanía')
        .replace(/¿La b/g, 'La b')
        .replace(/each¿Layer/g, 'eachLayer')
        .replace(/remove¿Layer/g, 'removeLayer')
        .replace(/tile¿Layer/g, 'tileLayer')
        .replace(/price¿Text/g, 'priceText')
        .replace(/size¿Text/g, 'sizeText')
        .replace(/difference¿Label/g, 'differenceLabel')
        .replace(/houseRoom¿s/g, 'houseRooms')
        .replace(/¿'uble/g, 'Ñuble')
        .replace(/¿'ipas/g, 'Ñipas')
        .replace(/¿Te quedan/g, 'Te quedan')
        .replace(/d¿Lat/g, 'dLat');
        
    fs.writeFileSync(f, fixed, 'utf8');
});
console.log('Fixed variable names and region names.');
