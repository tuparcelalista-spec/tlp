const fs = require('fs');
['frontend-v2/js/index.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let fixed = content
        .replace(/Param.s/g, 'Params')
        .replace(/param.s/g, 'params');
    fs.writeFileSync(f, fixed, 'utf8');
});
