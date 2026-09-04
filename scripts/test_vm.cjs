const fs = require('fs');
const code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');
const vm = require('vm');
try {
  let scriptCode = code.replace(/import\s+.*?from\s+['\"].*?['\"];?/g, '');
  scriptCode = scriptCode.replace(/export\s+function/g, 'function');
  new vm.Script(scriptCode);
  console.log('Script parses successfully in vm!');
} catch (e) {
  console.log('VM Parse error:', e.message);
  console.log(e.stack.split('\n').slice(0, 5).join('\n'));
}
