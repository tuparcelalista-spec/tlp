const fs = require('fs');

const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcelas.js';
let content = fs.readFileSync(path, 'utf8');

// The file exposes window.parcelas = [ ... ]
// We can evaluate it in a context or parse it.

// Let's create a sandbox
const vm = require('vm');
const sandbox = { window: {} };
vm.createContext(sandbox);

try {
    vm.runInContext(content, sandbox);
    const parcelas = sandbox.window.parcelas || [];
    let output = '';
    
    parcelas.forEach(p => {
        const id = p.id || p.codigo || 'N/A';
        const nombre = p.nombre || p.titulo || 'Sin nombre';
        const valorTasador = p.valor_tpl_tasador || p.valor_tpl_recomendado || 'No definido';
        const valorComunal = p.valor_comunal || 'No definido';
        const precio = p.precio || 'No definido';
        
        output += `ID: ${id}\nNombre: ${nombre}\nPrecio Publicado: ${precio}\nValor TPL Tasador: ${valorTasador}\nValor Comunal: ${valorComunal}\n-----------------------------------\n`;
    });
    
    fs.writeFileSync('valores_tpl.txt', output, 'utf8');
    console.log('Valores guardados en valores_tpl.txt');
} catch (e) {
    console.error('Error parsing parcelas.js', e);
}
