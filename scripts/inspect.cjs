const fs = require('fs');
const content = fs.readFileSync('frontend-v2/parcelas.js', 'utf8');
const vm = require('vm');
const sandbox = { window: {}, document: { addEventListener: ()=>{} } };
vm.runInNewContext(content, sandbox);
let arr = sandbox.window.parcelas || sandbox.parcelas || [];
console.log("Parcelas keys:", Object.keys(arr[0] || {}));
console.log("Sample 1 region:", arr[0].region, arr[0].comuna);

if(fs.existsSync('frontend-v2/placemarket.js')) {
    const content2 = fs.readFileSync('frontend-v2/placemarket.js', 'utf8');
    vm.runInNewContext(content2, sandbox);
    let arr2 = sandbox.window.placemarket || sandbox.placemarket || [];
    console.log("Placemarket items:", arr2.length);
    console.log("Placemarket keys:", Object.keys(arr2[0] || {}));
}
