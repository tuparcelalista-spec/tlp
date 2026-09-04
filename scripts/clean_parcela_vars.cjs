const fs = require('fs');
let f = 'frontend-v2/js/parcela.js';
let content = fs.readFileSync(f, 'utf8');

let fixed = content
    .replace(/context¿Label/g, 'contextLabel')
    .replace(/tech¿Label/g, 'techLabel')
    .replace(/comm¿Label/g, 'commLabel')
    .replace(/avg¿Label/g, 'avgLabel')
    .replace(/hero¿Label/g, 'heroLabel')
    .replace(/render¿TerritorialProfile/g, 'renderTerritorialProfile')
    .replace(/get¿TerritorialPublicSummary/g, 'getTerritorialPublicSummary')
    .replace(/user¿Lat/g, 'userLat')
    .replace(/write¿Text/g, 'writeText')
    .replace(/¿La /g, 'La ');
    
fs.writeFileSync(f, fixed, 'utf8');
console.log('Fixed variable names in parcela.js');
