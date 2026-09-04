
const fs = require('fs');
const filePath = 'frontend-v2/parcela.html';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = {
    'CÃ³mo': 'Cómo',
    'NavegaciÃ³n': 'Navegación',
    'MenÃº': 'Menú',
    'mÃ³vil': 'móvil',
    'RegiÃ³n': 'Región',
    'TasaciÃ³n': 'Tasación',
    'ComparaciÃ³n': 'Comparación',
    'justificaciÃ³n': 'justificación',
    'tÃ©cnica': 'técnica',
    'UbicaciÃ³n': 'Ubicación',
    'posiciÃ³n': 'posición',
    'ubicaciÃ³n': 'ubicación',
    'AsesorÃ­a': 'Asesoría',
    'Â¿': '¿',
    'buscarÃ¡': 'buscará',
    'Ã ngeles': 'Ángeles',
    'dÃ©janos': 'déjanos',
    'NÃºmero': 'Número',
    'descripciÃ³n': 'descripción',
    'PlusvalÃ­a': 'Plusvalía',
    'AnÃ¡lisis': 'Análisis',
    'InversiÃ³n': 'Inversión',
    'gustarÃ­a': 'gustaría'
};

for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
}

content = content.replace(
    'const msg = Hola, mi nombre es  + name + . Me interesa agendar una visita para la parcela  + parcelaId + . Mi número es  + phone + . Fecha preferida:  + date + .;',
    'const msg = \Hola, mi nombre es \. Me interesa agendar una visita para la parcela \. Mi número es \. Fecha preferida: \.\;'
);

content = content.replace(
    'window.open(https://wa.me/56988508361?text= + encoded, \'_blank\');',
    'window.open(\'https://wa.me/56988508361?text=\' + encoded, \'_blank\');'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed');

