const fs = require('fs');
['frontend-v2/js/index.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let fixed = content
        .replace(/\ufffd'uble/g, 'Ñuble')
        .replace(/\ufffdQu\ufffdill\ufffdn/g, 'Quillón')
        .replace(/\ufffd'ipas/g, 'Ñipas')
        .replace(/\ufffdLa Araucan\ufffda/g, 'La Araucanía')
        .replace(/Chill\ufffdn/g, 'Chillán')
        .replace(/San Nicol\ufffds/g, 'San Nicolás')
        .replace(/Biob\ufffdo/g, 'Biobío')
        .replace(/Puc\ufffdn/g, 'Pucón');
    fs.writeFileSync(f, fixed, 'utf8');
});
