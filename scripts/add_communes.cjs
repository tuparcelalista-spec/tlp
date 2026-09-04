const fs = require('fs');
let js = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');

const newReferences = `    quillon: Object.freeze({ medianM2: 4800 }),
    florida: Object.freeze({ medianM2: 6000 }),
    nacimiento: Object.freeze({ medianM2: 4294 }),
    yumbel: Object.freeze({ medianM2: 4800 }),
    negrete: Object.freeze({ medianM2: 6750 }),
    ranquil: Object.freeze({ medianM2: 5000 }),
    nipas: Object.freeze({ medianM2: 5000, aliasOf: 'ranquil' }),
    pucon: Object.freeze({ medianM2: 10300 }),
    caburgua: Object.freeze({ medianM2: 10300, aliasOf: 'pucon' }),
    
    // Nuble
    cobquecura: Object.freeze({ medianM2: 6500 }),
    coelemu: Object.freeze({ medianM2: 5200 }),
    ninhue: Object.freeze({ medianM2: 4000 }),
    portezuelo: Object.freeze({ medianM2: 4500 }),
    quirihue: Object.freeze({ medianM2: 4500 }),
    treguaco: Object.freeze({ medianM2: 4200 }),
    bulnes: Object.freeze({ medianM2: 5000 }),
    chillan: Object.freeze({ medianM2: 8000 }),
    'chillan viejo': Object.freeze({ medianM2: 7000 }),
    'el carmen': Object.freeze({ medianM2: 4500 }),
    pemuco: Object.freeze({ medianM2: 4200 }),
    pinto: Object.freeze({ medianM2: 8500 }),
    'san ignacio': Object.freeze({ medianM2: 4500 }),
    yungay: Object.freeze({ medianM2: 4800 }),
    coihueco: Object.freeze({ medianM2: 5500 }),
    niquen: Object.freeze({ medianM2: 4000 }),
    'san carlos': Object.freeze({ medianM2: 5000 }),
    'san fabian': Object.freeze({ medianM2: 5500 }),
    'san nicolas': Object.freeze({ medianM2: 4800 }),
    
    // Biobio
    concepcion: Object.freeze({ medianM2: 12000 }),
    coronel: Object.freeze({ medianM2: 7000 }),
    chiguayante: Object.freeze({ medianM2: 11000 }),
    hualqui: Object.freeze({ medianM2: 6500 }),
    lota: Object.freeze({ medianM2: 5000 }),
    penco: Object.freeze({ medianM2: 6500 }),
    'san pedro de la paz': Object.freeze({ medianM2: 11000 }),
    'santa juana': Object.freeze({ medianM2: 5500 }),
    talcahuano: Object.freeze({ medianM2: 9000 }),
    tome: Object.freeze({ medianM2: 6500 }),
    hualpen: Object.freeze({ medianM2: 9000 }),
    lebu: Object.freeze({ medianM2: 4500 }),
    arauco: Object.freeze({ medianM2: 5000 }),
    canete: Object.freeze({ medianM2: 4500 }),
    contulmo: Object.freeze({ medianM2: 4800 }),
    curanilahue: Object.freeze({ medianM2: 4000 }),
    'los alamos': Object.freeze({ medianM2: 4000 }),
    tirua: Object.freeze({ medianM2: 3800 }),
    'los angeles': Object.freeze({ medianM2: 8500 }),
    antuco: Object.freeze({ medianM2: 5000 }),
    cabrero: Object.freeze({ medianM2: 6000 }),
    laja: Object.freeze({ medianM2: 5000 }),
    mulchen: Object.freeze({ medianM2: 4500 }),
    quilaco: Object.freeze({ medianM2: 4500 }),
    quilleco: Object.freeze({ medianM2: 4500 }),
    'san rosendo': Object.freeze({ medianM2: 4200 }),
    'santa barbara': Object.freeze({ medianM2: 5500 }),
    tucapel: Object.freeze({ medianM2: 4800 }),
    'alto biobio': Object.freeze({ medianM2: 4000 })`;

const target = /quillon: Object\.freeze\(\{ medianM2: 4800 \}\),[\s\S]*?caburgua: Object\.freeze\(\{ medianM2: 10300, aliasOf: 'pucon' \}\)/;

js = js.replace(target, newReferences);

// I should also make sure it has a fallback just in case:
const fallbackTarget = /const market = MARKET_REFERENCES\[normalize\(input\.comuna\)\] \|\| \{ medianM2: 0 \};/;
const fallbackReplacement = `const market = MARKET_REFERENCES[normalize(input.comuna)] || { medianM2: 5000 }; // 5000 CLP/m2 como fallback genrico`;
js = js.replace(fallbackTarget, fallbackReplacement);

fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', js, 'utf8');
console.log('Valuation engine updated with all communes');
