const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

const replacementMap = `const keywordMap = {
            'orilla lago': /orilla(\\s+de)?\\s+lago/i,
            'orilla río': /orilla(\\s+de)?\\s+r[íi]o/i,
            'río': /\\br[íi]o\\b/i,
            'vertiente': /vertiente/i,
            'derechos de agua': /derecho[s]?\\s+de\\s+agua/i,
            'plano': /\\bplano[s]?\\b/i,
            'bosque nativo': /\\bnativo\\b|bosque/i,
            'empalme / luz': /empalme/i,
            'termas': /termal|termas/i,
            'turístico': /tur[íi]stico/i,
            'cercada': /cerca\\b|cercad[oa]|cerco/i,
            'portón': /port[oó]n/i,
            'condominio': /condominio/i,
            'acceso restringido': /acceso\\s+restringido|solo\\s+residentes|control\\s+de\\s+acceso/i,
            'piscina': /piscina/i,
            'quincho': /quincho/i,
            'invernadero': /invernadero/i,
            'huerta': /huert[oa]/i,
            'radier': /radier/i,
            'cerámico': /cer[aá]mico/i,
            'piso madera': /piso\\s+(de\\s+)?madera|piso\\s+flotante/i
        };`;

code = code.replace(/const keywordMap = \{[\s\S]*?control\\s\+de\\s\+acceso\/i\n\s*\};\n?/m, replacementMap + '\n');

// Minify
let lines = code.split('\n');
let clean = lines.map(l => {
  let line = l.trim();
  if (line.startsWith('//')) return '';
  let idx = line.indexOf(' //');
  if (idx > -1) line = line.substring(0, idx);
  return line;
}).filter(l => l.length > 0).join(' ');

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', code);
fs.writeFileSync('bookmarklet_minified.txt', 'javascript:' + clean);
console.log('Updated keywords and minified bookmarklet');
