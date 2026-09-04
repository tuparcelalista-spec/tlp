const fs = require('fs');

let js = fs.readFileSync('frontend-v2/js/cotizador.js', 'utf8');

const renderTarget = `function renderPrefabCatalog() {
        const grid = $('prefab-grid');
        if(!grid) return;
        grid.innerHTML = '';
        houses.forEach(h => {`;

const renderReplacement = `function renderPrefabCatalog() {
        const grid = $('prefab-grid');
        if(!grid) return;
        
        const roomFilter = $('prefab-rooms') ? $('prefab-rooms').value : 'all';
        const sizeFilter = $('prefab-size') ? $('prefab-size').value : 'all';
        
        grid.innerHTML = '';
        
        let filteredHouses = houses.filter(h => {
            let matchRooms = true;
            if (roomFilter !== 'all') {
                const rooms = Number(h.habitaciones) || 0;
                if (roomFilter === '4') {
                    if (rooms < 4) matchRooms = false;
                } else {
                    if (rooms !== Number(roomFilter)) matchRooms = false;
                }
            }
            
            let matchSize = true;
            if (sizeFilter !== 'all') {
                const size = Number(h.metros) || 0;
                if (sizeFilter === 'small' && size > 59) matchSize = false;
                if (sizeFilter === 'medium' && (size < 60 || size > 109)) matchSize = false;
                if (sizeFilter === 'large' && size < 110) matchSize = false;
            }
            
            return matchRooms && matchSize;
        });
        
        if (filteredHouses.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">No se encontraron modelos con estas características. Intenta ampliar tu búsqueda.</p>';
            return;
        }

        filteredHouses.forEach(h => {`;

js = js.replace(renderTarget, renderReplacement);

const initTarget = `function init() {
        if(params.get('reset')==='true') {`;

const initReplacement = `function init() {
        const prefabRoomsSelect = $('prefab-rooms');
        if(prefabRoomsSelect) prefabRoomsSelect.addEventListener('change', renderPrefabCatalog);
        const prefabSizeSelect = $('prefab-size');
        if(prefabSizeSelect) prefabSizeSelect.addEventListener('change', renderPrefabCatalog);

        if(params.get('reset')==='true') {`;

js = js.replace(initTarget, initReplacement);

fs.writeFileSync('frontend-v2/js/cotizador.js', js, 'utf8');
console.log('Modified cotizador.js to add filters');
