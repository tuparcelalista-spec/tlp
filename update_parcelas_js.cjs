const fs = require('fs');
const vm = require('vm');

const parcelasPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcelas.js';
let parcelasContent = fs.readFileSync(parcelasPath, 'utf8');

const enginePath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/core/valuation-engine.js';
let engineContent = fs.readFileSync(enginePath, 'utf8');

const sandbox = { window: {}, console: console, Math: Math, Number: Number, String: String, Boolean: Boolean, Object: Object, Array: Array, isNaN: isNaN };
sandbox.global = sandbox.window;
vm.createContext(sandbox);

try {
    vm.runInContext(engineContent, sandbox);
    vm.runInContext(parcelasContent, sandbox);
    
    const parcelas = sandbox.window.parcelas;
    const TPLLandEngine = sandbox.window.TPLLandEngine;
    
    parcelas.forEach(p => {
        const calc = TPLLandEngine.calculate(p);
        p.valor_tpl_tasador = calc.valorRecomendado;
        p.valor_tpl_recomendado = calc.valorRecomendado;
        p.valor_comunal = calc.valorComunalBase;
        p.valor_tpl_tasador_ajustado = calc.baseDepreciada;
    });
    
    const newParcelasString = 'window.parcelas = ' + JSON.stringify(parcelas, null, 2) + ';';
    fs.writeFileSync(parcelasPath, newParcelasString, 'utf8');
    console.log('Parcelas updated successfully. Count:', parcelas.length);
} catch(e) {
    console.error('Error:', e);
}
