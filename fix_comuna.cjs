const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');
code = code.replace('let sup = null;', 'let sup = null;\n        let comuna = "";');

// Minify again
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
console.log('Fixed let comuna and generated minified string');
