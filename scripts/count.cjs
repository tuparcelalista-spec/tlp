const fs = require('fs');
const files = [
    'frontend-v2/parcelas.js', 
    'frontend-v2/casas.js',
    'frontend-v2/placemarket.js', 
    'frontend-v2/extradata.js', 
    'frontend-v2/extras.js',
    'frontend-v2/archive/legacy/studio/studio.js'
];

let total = 0;
let byRegion = {};
let byCommune = {};
let byPortal = {};

files.forEach(f => {
    if(!fs.existsSync(f)) return;
    const content = fs.readFileSync(f, 'utf8');
    
    const vm = require('vm');
    const sandbox = { 
        window: {}, 
        document: { 
            addEventListener: ()=>{},
            querySelector: ()=>({content: ''})
        },
        console: console,
        fetch: ()=>Promise.resolve({json: ()=>Promise.resolve({})})
    };
    try {
        vm.runInNewContext(content, sandbox);
        
        let arr = [];
        if(sandbox.parcelas && Array.isArray(sandbox.parcelas)) arr = arr.concat(sandbox.parcelas);
        if(sandbox.casas && Array.isArray(sandbox.casas)) arr = arr.concat(sandbox.casas);
        if(sandbox.placemarket && Array.isArray(sandbox.placemarket)) arr = arr.concat(sandbox.placemarket);
        if(sandbox.extradata && Array.isArray(sandbox.extradata)) arr = arr.concat(sandbox.extradata);
        if(sandbox.extras && Array.isArray(sandbox.extras)) arr = arr.concat(sandbox.extras);
        
        for (let key in sandbox.window) {
            if (Array.isArray(sandbox.window[key])) arr = arr.concat(sandbox.window[key]);
        }

        // Distinct by ID to avoid duplicates if they put the same array multiple times
        let unique = [];
        let seen = new Set();
        arr.forEach(p => {
            let id = p.id || p.codigo || p.nombre || JSON.stringify(p);
            if(!seen.has(id)) {
                seen.add(id);
                unique.push(p);
            }
        });

        console.log(`File ${f}: Found ${unique.length} unique items.`);
        
        unique.forEach(p => {
            total++;
            
            let region = p.region || 'Desconocida';
            byRegion[region] = (byRegion[region] || 0) + 1;
            
            let comuna = p.comuna || p.ciudad || 'Desconocida';
            byCommune[comuna] = (byCommune[comuna] || 0) + 1;
            
            let portal = p.portal || p.fuente || p.origen || p.source || 'TPL (Directo/Local)';
            byPortal[portal] = (byPortal[portal] || 0) + 1;
        });
    } catch(e) {
        console.log(`Failed to parse ${f}: ${e.message}`);
    }
});

console.log('--- RESUMEN CATASTRO ---');
console.log('TOTAL PARCELAS:', total);
console.log('\nPOR REGION:');
console.log(byRegion);
console.log('\nPOR COMUNA (TOP 5):');
let sortedComunas = Object.entries(byCommune).sort((a,b)=>b[1]-a[1]).slice(0, 5);
console.log(sortedComunas);
console.log('\nPOR PORTAL / FUENTE:');
console.log(byPortal);
