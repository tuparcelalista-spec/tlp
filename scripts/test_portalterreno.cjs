const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const htmlContent = fs.readFileSync('C:/Users/yo/.gemini/antigravity/brain/ee88b2dd-e95d-450c-bad0-5d1f13e2b656/.system_generated/steps/1154/content.md', 'utf8');

const htmlMatches = htmlContent.match(/<!DOCTYPE html>.*<\/html>/si);
const rawHtml = htmlMatches ? htmlMatches[0] : htmlContent;

const dom = new JSDOM(rawHtml);
const texto_original = dom.window.document.body.textContent || dom.window.document.body.innerText;

console.log("TEXT EXTRACTED:\n", texto_original.substring(0, 1000));

// Let's test the regexes
const clpRegex = /\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3}){1,3})/g;
const clpMatches = [...texto_original.matchAll(clpRegex)];
console.log("CLP:", clpMatches.map(m => m[0]));

const ufRegex = /UF\\s*([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]+)?)/gi;
const ufMatches = [...texto_original.matchAll(ufRegex)];
console.log("UF:", ufMatches.map(m => m[0]));

const supRegex = /(?:(?:[AÁaá]rea total(?: del terreno)?\\s*\\(m²\\)|\\bSuperficie total\\b)\\s*\\n*\\s*([0-9]+(?:[.,][0-9]+)?))|([0-9]+(?:[.,][0-9]+)?)\\s*(?:\\b(?:ha|has|hect[aá]reas|metros(?!\\s+(?:de|del|al|a\\b)))\\b|m2|m²|mts2?(?:\\b|$))/gi;
const supMatches = [...texto_original.matchAll(supRegex)];
console.log("SUP:", supMatches.map(m => m[0]));

// Test if it has some custom surface label
const supLabelRegex = /(superficie|área|area|terreno|metros|m2|hectáreas|ha)[^0-9]*([0-9.,]+)/gi;
const supLabels = [...texto_original.matchAll(supLabelRegex)];
console.log("All potential areas:", supLabels.map(m => m[0]).slice(0, 10));

const ubiRegex = /Ubicaci[oó]n[\\s:\\-–]*([^,\\n]+)\\s*,\\s*([^,\\n]+)(?:\\s*,\\s*([^,\\n]+))?/i;
console.log("UBI:", texto_original.match(ubiRegex));

const keywordMap = {'orilla lago': /orilla(\\s+de)?\\s+lago/i, 'orilla río': /orilla(\\s+de)?\\s+r[íi]o/i, 'río': /\\br[íi]o\\b/i, 'vertiente': /vertiente/i, 'derechos de agua': /derecho[s]?\\s+de\\s+agua/i, 'plano': /\\bplano[s]?\\b/i, 'bosque nativo': /\\bnativo\\b|bosque/i, 'empalme / luz': /empalme/i, 'termas': /termal|termas/i, 'turístico': /tur[íi]stico/i, 'cercada': /cerca\\b|cercad[oa]|cerco/i, 'portón': /port[oó]n/i, 'condominio': /condominio/i, 'acceso restringido': /acceso\\s+restringido|solo\\s+residentes|control\\s+de\\s+acceso/i };
const atributosDetectados = [];
for (const [attr, regex] of Object.entries(keywordMap)) {if (regex.test(texto_original)) atributosDetectados.push(attr);}
console.log("Atributos:", atributosDetectados);

