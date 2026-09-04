const fs = require('fs');

let js = fs.readFileSync('scripts/master_bookmarklet_4.cjs', 'utf8');

// Find the lat/lng extraction logic
const searchString = "if (lngMatch && lngMatch[1]) lng = parseFloat(lngMatch[1]);";
const replacement = searchString + `
// Filtrar coordenadas genéricas por defecto de portales
const bannedCoords = [
    {lat: -35.675148, lng: -71.54297}, // Centro Maule
    {lat: -33.4489, lng: -70.6693}, // Centro Santiago
    {lat: -36.8201, lng: -73.0444} // Centro Concepción
];
if (lat && lng) {
    for (let c of bannedCoords) {
        if (Math.abs(lat - c.lat) < 0.001 && Math.abs(lng - c.lng) < 0.001) {
            lat = null;
            lng = null;
            break;
        }
    }
}
`;

js = js.replace(searchString, replacement);
fs.writeFileSync('scripts/master_bookmarklet_5.cjs', js, 'utf8');

// Also minify it
const jsContent = js.match(/`([^`]*)`/);
if (jsContent && jsContent[1]) {
    const minified = "javascript:" + jsContent[1].replace(/\n/g, '');
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min_v5.txt', minified, 'utf8');
    console.log(minified);
}
