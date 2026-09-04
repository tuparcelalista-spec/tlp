const fs = require('fs');
let content = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/index.js', 'utf-8');

// We will collect missing communes and display them.
const replacement1 = `
            const client = getClient();
            let successCount = 0;
            let errorCount = 0;
            let missingCommunes = new Set();
`;

content = content.replace(`
            const client = getClient();
            let successCount = 0;
            let errorCount = 0;`, replacement1);

const replacement2 = `
                        if (!ctx) {
                            console.warn('Sincronizacion omitida por falta de contexto o coordenadas para', p.id);
                            if (p.comuna) missingCommunes.add(normalize(p.comuna));
                            errorCount++;
                            continue;
                        }
`;

content = content.replace(`
                        if (!ctx) {
                            console.warn('Sincronizacion omitida por falta de contexto o coordenadas para', p.id);
                            errorCount++;
                            continue;
                        }`, replacement2);

content = content.replace(/alert\([^\)]+\);\s*window\.location\.reload\(\);/, `
            let msg = \`Sincronización finalizada. Éxitos: \${successCount}. Errores: \${errorCount}.\`;
            if (missingCommunes.size > 0) {
                msg += \`\\n\\nNo se pudieron tasar \${errorCount} parcelas porque faltan referencias (lat/lng de la ciudad mayor) para las siguientes comunas:\\n\\n\${Array.from(missingCommunes).join(', ')}\\n\\nDebes agregar estas comunas a REFERENCE_POINTS dentro del código de index.js para que el tasador masivo las calcule.\`;
            }
            alert(msg);
            window.location.reload();
`);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/index.js', content, 'utf-8');
console.log('Fixed CRM sync alert.');
