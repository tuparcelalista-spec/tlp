const fs = require('fs');

function fixHtml(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    const fixes = {
        'Navegaci\uFFFDn': 'Navegación',
        'C\uFFFDmo': 'Cómo',
        'men\uFFFD': 'menú',
        'Men\uFFFD': 'Menú',
        'm\uFFFDvil': 'móvil',
        'Regi\uFFFDn': 'Región',
        'descripci\uFFFDn': 'descripción',
        'Tasaci\uFFFDn': 'Tasación',
        'COMPARACI\uFFFDN': 'COMPARACIÓN',
        'Comparaci\uFFFDn': 'Comparación',
        'justificaci\uFFFDn': 'justificación',
        't\uFFFDcnica': 'técnica',
        'Ubicaci\uFFFDn': 'Ubicación',
        'ubicaci\uFFFDn': 'ubicación',
        'posici\uFFFDn': 'posición',
        'Bot\uFFFDn': 'Botón',
        'gustar\uFFFDa': 'gustaría',
        'Inversi\uFFFDn': 'Inversión',
        'An\uFFFDlisis': 'Análisis',
        'm\uFFFD': 'm²',
        'Plusval\uFFFDa': 'Plusvalía',
        'EVALUACI\uFFFDN': 'EVALUACIÓN',
        'Asesor\uFFFDa': 'Asesoría',
        'buscar\uFFFD': 'buscará',
        '\uFFFDngeles': 'Ángeles',
        'Cerrar">\uFFFD<': 'Cerrar">×<',
        'd\uFFFDjanos': 'déjanos',
        'P\uFFFDrez': 'Pérez',
        'N\uFFFDmero': 'Número'
    };

    for (const [bad, good] of Object.entries(fixes)) {
        content = content.split(bad).join(good);
    }
    
    fs.writeFileSync(file, content, 'utf8');
}

function fixJs(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    const fixes = {
        'm\uFFFD\u201A\uFFFD': 'm²', // m‚
        '\uFFFD\u201A\uFFFD OpenStreetMap': '© OpenStreetMap',
        '\uFFFD\u201A\uFFFD CARTO': '© CARTO',
        '\uFFFD\u201A\uFFFDOportunidad!': '¡Oportunidad!'
    };

    for (const [bad, good] of Object.entries(fixes)) {
        content = content.split(bad).join(good);
    }
    
    fs.writeFileSync(file, content, 'utf8');
}

fixHtml('frontend-v2/parcela.html');
fixJs('frontend-v2/js/parcela.js');

console.log('Fixed \uFFFD');
