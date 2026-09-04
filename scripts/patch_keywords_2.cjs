const fs = require('fs');
let content = fs.readFileSync('scripts/master_bookmarklet_2.cjs', 'utf8');

const regex = /const keywordMap = \{[^\}]+\};\n/s;
const newMap = `const keywordMap = {
'orilla lago': /orilla(\\s+de)?\\s+lago/i, 
'orilla río': /orilla(\\s+de)?\\s+r[íi]o/i, 
'río': /\\br[íi]o\\b/i, 
'vertiente': /vertiente/i, 
'derechos de agua': /derecho[s]?\\s+de\\s+agua/i, 
'plano': /\\bplano[s]?\\b/i, 
'bosque nativo': /\\bnativo\\b|bosque/i, 
'empalme / luz': /empalme|factibilidad\\s+el[eé]ctrica|luz\\s+(?:el[eé]ctrica|subterr[aá]nea)|energ[ií]a\\s+el[eé]ctrica|postaci[oó]n/i, 
'agua / pozo / apr': /(?:factibilidad\\s+de\\s+)?agua(?: potable)?\\b|\\bapr\\b|pozo\\b/i,
'termas': /termal|termas/i, 
'turístico': /tur[íi]stico/i, 
'cercada': /cerca\\b|cercad[oa]|cerco/i, 
'portón': /port[oó]n/i, 
'condominio': /condominio/i, 
'acceso restringido': /acceso\\s+restringido|solo\\s+residentes|control\\s+de\\s+acceso/i 
};\n`;

content = content.replace(regex, newMap);
fs.writeFileSync('scripts/master_bookmarklet_2.cjs', content, 'utf8');
console.log('Keyword map updated');
