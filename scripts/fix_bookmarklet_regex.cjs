const fs = require('fs');
let content = fs.readFileSync('scripts/master_bookmarklet_2.cjs', 'utf8');

// Fix supRegex
const oldSupRegexStr = "/(?:(?:[AÁaá]rea total(?: del terreno)?\\s*\\(m²\\)|\\bSuperficie total\\b)\\s*\\n*\\s*([0-9]+(?:[.,][0-9]+)?))|([0-9]+(?:[.,][0-9]+)?)\\s*(?:\\b(?:ha|has|hect[aá]reas|metros(?!\\s+(?:de|del|al|a\\b)))\\b|m2|m²|mts2?(?:\\b|$))/gi";
const newSupRegexStr = "/(?:(?:[AÁaá]rea total(?: del terreno)?\\s*\\(m²\\)|\\bSuperficie total\\b)\\s*\\n*\\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?))|([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?)\\s*(?:\\b(?:ha|has|hect[aá]reas|metros(?!\\s+(?:de|del|al|a\\b)))\\b|m2|m²|mts2?(?:\\b|\\s|$))/gi";

content = content.replace(oldSupRegexStr, newSupRegexStr);

// Fix isHa
const oldIsHa = "let isHa = m[0].toLowerCase().includes('ha') || m[0].toLowerCase().includes('hect');";
const newIsHa = "let isHa = /\\b(?:ha|has|hect[aá]reas)\\b/i.test(m[0]);";
content = content.replace(oldIsHa, newIsHa);

fs.writeFileSync('scripts/master_bookmarklet_3.cjs', content, 'utf8');
console.log('Fixed script generated!');
