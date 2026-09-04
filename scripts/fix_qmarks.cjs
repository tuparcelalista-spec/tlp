const fs = require('fs');
const files = ['frontend-v2/parcela.html', 'frontend-v2/parcela-v2.html', 'frontend-v2/js/parcela.js', 'frontend-v2/js/index.js'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let safeFixed = content
        .replace(/\.\.\.v=/g, '?v=')
        .replace(/aquí\.\.\./g, 'aquí?')
        .replace(/decidir\.\.\./g, 'decidir?')
        .replace(/avanzar\.\.\./g, 'avanzar?')
        .replace(/visita\.\.\./g, 'visita?')
        .replace(/mejora\.\.\./g, 'mejora?')
        .replace(/construir\.\.\./g, 'construir?')
        .replace(/parcela\.\.\./g, 'parcela?')
        .replace(/verificada\.\.\./g, 'verificada?')
        .replace(/casa\.\.\./g, 'casa?')
        .replace(/toggle\.\.\.\./g, 'toggle?.')
        .replace(/window\.TPLSEO\.\.\.\.apply/g, 'window.TPLSEO?.apply')
        .replace(/expanded\.\.\.'Leer/g, "expanded?'Leer")
        .replace(/\[\^\.\!\.\.\.\]\+/g, '[^.!?]+')
        .replace(/\[\.\!\.\.\.\]\+/g, '[.!?]+')
        .replace(/\[\^\.\!\.\.\.\]\+\$/g, '[^.!?]+$')
        .replace(/TPLMarketIntelligence\.\.\.\.analyzeAsync/g, 'TPLMarketIntelligence?.analyzeAsync')
        .replace(/TPLMarketIntelligence\.\.\.\.analyze/g, 'TPLMarketIntelligence?.analyze')
        .replace(/Cmo/g, '¿Cómo')
        .replace(/Te/g, '¿Te')
        .replace(/Qu/g, '¿Qué')
        .replace(/Puedo/g, '¿Puedo')
        .replace(/La/g, '¿La')
        .replace(/QuǸ/g, '¿Qué')
        .replace(/aqu/g, 'aquí');
    fs.writeFileSync(f, safeFixed, 'utf8');
});
console.log('Fixed broken question marks.');
