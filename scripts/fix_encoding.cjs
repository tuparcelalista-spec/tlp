const fs = require('fs');

const files = ['frontend-v2/parcela.html', 'frontend-v2/parcela-v2.html', 'frontend-v2/js/parcela.js', 'frontend-v2/js/index.js'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Known mojibake replacements using global replace
    let safeFixed = content
        .replace(/Â¿Te imaginas/g, '¿Te imaginas')
        .replace(/Te imaginas/g, '¿Te imaginas')
        .replace(/Te imaginas/g, '¿Te imaginas')
        .replace(/¿¿Te imaginas/g, '¿Te imaginas')
        .replace(/aquÃ­/g, 'aquí')
        .replace(/aqu/g, 'aquí')
        .replace(/condicin/g, 'condición')
        .replace(/continǧa/g, 'continúa')
        .replace(/contina/g, 'continúa')
        .replace(/Dnde estǭ/g, 'Dónde está')
        .replace(/Dnde est/g, 'Dónde está')
        .replace(/quǸ hay/g, 'qué hay')
        .replace(/qu hay/g, 'qué hay')
        .replace(/UBICACI\?oN/g, 'UBICACIÓN')
        .replace(/UBICACI"N/g, 'UBICACIÓN')
        .replace(/UBICACIN/g, 'UBICACIÓN')
        .replace(/Ubicacin/g, 'Ubicación')
        .replace(/ubicacin/g, 'ubicación')
        .replace(/VALORACI\?oN/g, 'VALORACIÓN')
        .replace(/VALORACIN/g, 'VALORACIÓN')
        .replace(/Cmo se proyecta/g, 'Cómo se proyecta')
        .replace(/cǭlculos/g, 'cálculos')
        .replace(/clculos/g, 'cálculos')
        .replace(/Ttulos/g, 'Títulos')
        .replace(/tǸcnica/g, 'técnica')
        .replace(/tcnica/g, 'técnica')
        .replace(/ttulos/g, 'títulos')
        .replace(/informacin/g, 'información')
        .replace(/Informacin/g, 'Información')
        .replace(/decisin/g, 'decisión')
        .replace(/visin/g, 'visión')
        .replace(/ ndice/g, 'Índice')
        .replace(/ndice/g, 'Índice')
        .replace(/Tasacin/g, 'Tasación')
        .replace(/posicin/g, 'posición')
        .replace(/Posicin/g, 'Posición')
        .replace(/Rǭpida/g, 'Rápida')
        .replace(/rǭpida/g, 'rápida')
        .replace(/Rpida/g, 'Rápida')
        .replace(/rpida/g, 'rápida')
        .replace(/estadstica/g, 'estadística')
        .replace(/dueo/g, 'dueño')
        .replace(/negociacin/g, 'negociación')
        .replace(/ASESOR\?A/g, 'ASESORÍA')
        .replace(/ASESORA/g, 'ASESORÍA')
        .replace(/Asesora/g, 'Asesoría')
        .replace(/PR\?oXIMO/g, 'PRÓXIMO')
        .replace(/PR"XIMO/g, 'PRÓXIMO')
        .replace(/PRXIMO/g, 'PRÓXIMO')
        .replace(/Quieres/g, '¿Quieres')
        .replace(/fotografa/g, 'fotografía')
        .replace(/Mǭx:/g, 'Máx:')
        .replace(/Mx:/g, 'Máx:')
        .replace(/Mn:/g, 'Mín:')
        .replace(/mǭs/g, 'más')
        .replace(/ms/g, 'más')
        .replace(/ǽ'\?\?/g, '...') // Fix for "Cargando..."
        .replace(/ǽ'/g, '...')
        .replace(/ǽ'\?\?/g, '...')
        .replace(/ǽ'/g, '...')
        .replace(/\?/g, '...')
        ;
        
    fs.writeFileSync(f, safeFixed, 'utf8');
});
console.log('Fixed encodings in files.');
