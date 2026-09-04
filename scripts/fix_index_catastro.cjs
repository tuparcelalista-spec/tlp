const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

let startDel = -1;
let endDel = -1;

for (let i = 790; i < lines.length; i++) {
    if (lines[i].includes('<input type="number" id="cat-rev-clp"')) {
        startDel = i;
        break;
    }
}

if (startDel !== -1) {
    for (let i = startDel; i < lines.length; i++) {
        if (lines[i].includes('// 4. Enviar TPL_CATASTRO_READY')) {
            endDel = i - 2; 
            break;
        }
    }
}

if (startDel !== -1 && endDel !== -1) {
    lines.splice(startDel, endDel - startDel + 1);
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Fixed syntax error: Removed duplicate block from', startDel, 'to', endDel);
} else {
    console.log('Could not find boundaries.', startDel, endDel);
}
