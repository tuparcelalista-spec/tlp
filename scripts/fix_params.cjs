const fs = require('fs');
['frontend-v2/js/index.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let fixed = content
        .replace(/URLSearchParam.s/g, 'URLSearchParams')
        .replace(/param.s/g, 'params')
        .replace(/houseRoom.s/g, 'houseRooms')
        .replace(/¿'uble/g, 'Ñuble')
        .replace(/¿Qu¿ill¿n/g, 'Quillón')
        .replace(/¿'ipas/g, 'Ñipas')
        .replace(/¿La Araucan¿a/g, 'La Araucanía')
        .replace(/¿La b/g, 'La b')
        .replace(/Chillǭn/g, 'Chillán')
        .replace(/San Nicolǭs/g, 'San Nicolás');
    fs.writeFileSync(f, fixed, 'utf8');
});
