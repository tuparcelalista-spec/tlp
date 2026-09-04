const fs = require('fs');
let js = fs.readFileSync('chrome-extension-catastro/popup.js', 'utf8');

js = js.replace(/const queryTarget = direccion \? .*?;/, 'const queryTarget = direccion ? `${direccion}, ${comuna}, Chile` : `${comuna}, Chile`;');
js = js.replace(/const geoRes = await fetch\(.*?\);/, 'const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryTarget)}&format=json&limit=1`);');
js = js.replace(/const fallbackRes = await fetch\(.*?\);/, 'const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(comuna + ", Chile")}&format=json&limit=1`);');

fs.writeFileSync('chrome-extension-catastro/popup.js', js, 'utf8');
