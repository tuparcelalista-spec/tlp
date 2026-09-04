const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');

const regex = /function renderEditorHTML\(record\) \{\s*return `/;

const replacement = `function renderEditorHTML(record) {
  let materialidad_casa = '';
  let sup_casa = '';
  let dorm_casa = '';
  let banos_casa = '';
  
  if (record.metadata) {
    let meta = record.metadata;
    if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
    }
    materialidad_casa = meta.materialidad || '';
    sup_casa = meta.superficie_construida || '';
    dorm_casa = meta.dormitorios || '';
    banos_casa = meta.banos || '';
  }

  return \``;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', code);
console.log('Fixed renderEditorHTML variables');
