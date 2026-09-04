const fs = require('fs');
const code = fs.readFileSync('frontend-v2/parcelas.js', 'utf8');
const p1 = code.match(/"id":\s*"caburgua"[^}]*\}/g)[0];
const p2 = code.match(/"id":\s*"el_roble"[^}]*\}/g)[0];
const p3 = code.match(/"id":\s*"venega[^"]*"[^}]*\}/g)[0];
console.log('CABURGUA\n', p1);
console.log('ROBLE\n', p2);
console.log('NIPAS\n', p3);
