const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');

// The file was modified with removed lines. We need to restore it.
// Actually, let me just add the missing lines back where they belong.
// The diff shows:
//     // --- REVISIÓN DE CATASTRO (FASE 3: PRUEBA DE TRANSPORTE) ---
//     console.log("[TPL-CATASTRO] CRM Catastro inicializado");
//             }
//             
//             // 2. Validar que provenga exclusivamente del opener (quien abrió esta ventana)

let toRestore = `
    if (!window._tplCatastroListenerAttached) {
        window._tplCatastroListenerAttached = true;
        
        window.addEventListener('message', function(e) {
            const allowedOrigins = [
                'https://www.parcelalista.cl',
                'https://parcelalista.cl',
                'http://localhost:5500',
                'http://127.0.0.1:5500',
                // Adding portals strictly for the READY ping response if needed
                'https://www.portalinmobiliario.com',
                'https://portalinmobiliario.com',
                'https://www.yapo.cl',
                'https://yapo.cl',
                'https://www.portalterreno.cl',
                'https://portalterreno.cl'
            ];
            
            // 1. Validar Origen Permitido
            if (!allowedOrigins.includes(e.origin)) {
                return;
            }
`;

code = code.replace(
    /console\.log\("\[TPL-CATASTRO\] CRM Catastro inicializado"\);\s*\}\s*\/\/\ 2\. Validar que provenga exclusivamente del opener/s,
    `console.log("[TPL-CATASTRO] CRM Catastro inicializado");\n${toRestore}\n            // 2. Validar que provenga exclusivamente del opener`
);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', code);
console.log("Restored and updated!");
