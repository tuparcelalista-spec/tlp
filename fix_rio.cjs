const fs = require('fs');
let js = fs.readFileSync('frontend-v2/js/core/valuation-engine.js', 'utf8');

js = js.replace(/nat\.includes\('rio'\) \|\| nat\.includes\('río'\)/g, "(nat.match(/\\brio\\b/) || nat.match(/\\brío\\b/))");
js = js.replace(/nat\.includes\('lago'\)/g, "nat.match(/\\blago\\b/)");
js = js.replace(/nat\.includes\('terma'\)/g, "nat.match(/\\btermas?\\b/)");
js = js.replace(/nat\.includes\('estero'\)/g, "nat.match(/\\besteros?\\b/)");
js = js.replace(/nat\.includes\('vertiente'\)/g, "nat.match(/\\bvertientes?\\b/)");

fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', js);
console.log('Fixed regex word boundaries in valuation-engine');
