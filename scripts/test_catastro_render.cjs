const fs = require('fs');
const content = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');
const vm = require('vm');
let scriptCode = content.replace(/export\s+/g, '');
scriptCode = scriptCode.replace(/import\s+.*?from\s+['\"].*?['\"];?/g, '');
scriptCode += `
catastroData = [{ id:1, titulo:'Test', comuna:'Test', url:'http://test', atributos: 'test' }];
isLoading=false;
viewMode='grid';
comunaFilter='';
portalFilter='';
tipoFilter='Todas';
textFilter='';
escapeHtml = function(str) { return str; };
getUniqueComunas = function() { return []; };
getUniquePortals = function() { return []; };
console.log(render());
`;

try {
  new vm.Script(scriptCode).runInThisContext();
} catch (e) {
  console.log('Error executing render:', e);
}
