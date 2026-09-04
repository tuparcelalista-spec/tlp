
const fs = require('fs');
const filePath = 'frontend-v2/js/parcela.js';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = {
    'ÃƒÂ³': 'ó',
    'ÃƒÂ¡': 'á',
    'ÃƒÂ©': 'é',
    'ÃƒÂ­': 'í',
    'ÃƒÂº': 'ú',
    'ÃƒÂ': 'Á',
    'Ã‚Â²': '²',
    'Ã‚Â©': '©',
    'RegiÃƒÂ³n': 'Región',
    'ConcepciÃƒÂ³n': 'Concepción',
    'ChillÃƒÂ¡n': 'Chillán',
    'Los ÃƒÂ ngeles': 'Los Ángeles',
    'pucÃƒÂ³n': 'pucón',
    'quillÃƒÂ³n': 'quillón',
    'TasaciÃƒÂ³n': 'Tasación',
    'tÃƒÂ©cnica': 'técnica',
    'inversiÃƒÂ³n': 'inversión',
    'estÃƒÂ¡': 'está',
    'estarÃƒÂ­as': 'estarías',
    'instantÃƒÂ¡nea': 'instantánea',
    'transacciÃƒÂ³n': 'transacción',
    'caracterÃƒÂ­sticas': 'características',
    'topografÃƒÂ­a': 'topografía',
    'hectÃƒÂ¡rea': 'hectárea',
    'mÃƒÂ¡s': 'más',
    'elÃƒÂ©ctrica': 'eléctrica',
    'crÃƒÂ©dito': 'crédito',
    'rÃƒÂ­o': 'río',
    'ÃƒÂ¡rboles': 'árboles',
    'UbicaciÃƒÂ³n': 'Ubicación',
    'especÃƒÂ­fica': 'específica',
    'polÃƒÂ­gono': 'polígono',
    'GrÃƒÂ¡fico': 'Gráfico',
    'sÃƒÂ­': 'sí',
    'trÃƒÂ¡mite': 'trámite',
    '¡': '¡'
};

for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed js/parcela.js');

