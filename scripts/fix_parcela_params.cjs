const fs = require('fs');
['frontend-v2/js/parcela.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let fixed = content
        .replace(/URLSearchParam.s/g, 'URLSearchParams')
        .replace(/param.s/g, 'params')
        .replace(/Param.s/g, 'Params');
    fs.writeFileSync(f, fixed, 'utf8');
});
console.log("Fixed URLSearchParams in parcela.js");
