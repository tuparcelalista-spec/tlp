const fs = require('fs');
let code = fs.readFileSync('frontend-v2/js/core/valuation-adapter.js', 'utf8');

const regex = /nature: \[\.\.\.\(rawProperty\.atributos_naturales \|\| \[\]\), \.\.\.\(meta\.nature \|\| \[\]\), \.\.\.\(meta\.atributos_naturales \|\| \[\]\)\]\.join\(' '\),/g;
const replacement = `nature: [...(rawProperty.atributos_naturales || []), ...(meta.nature || []), ...(meta.atributos_naturales || [])].join(' '),
              // House fields
              superficie_construida: Number(rawProperty.metadata?.superficie_construida || rawProperty.metadata?.superficie_casa_m2 || 0),
              materialidad: rawProperty.metadata?.material || rawProperty.metadata?.materialidad || '',
              antiguedad_anios: rawProperty.metadata?.antiguedad_anios || 0,
              dormitorios: rawProperty.metadata?.dormitorios || 0,
              metadata: rawProperty.metadata || {},
              atributos: rawProperty.atributos || '',`;

code = code.replace(regex, replacement);

const regex2 = /area: Number\(rawProperty\.superficie_m2 \|\| meta\.area \|\| 5000\),/g;
const replacement2 = `area: Number(rawProperty.superficie_m2 || meta.area || 5000),
              superficie_m2: Number(rawProperty.superficie_m2 || meta.area || 5000),`;
              
code = code.replace(regex2, replacement2);

fs.writeFileSync('frontend-v2/js/core/valuation-adapter.js', code);
console.log('Valuation adapter updated.');
