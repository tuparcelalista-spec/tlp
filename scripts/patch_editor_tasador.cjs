const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js';
let content = fs.readFileSync(path, 'utf8');

const oldSimulateBlock = `
        const { TPLLandEngine } = await import('../../js/core/valuation-engine.js');
        const res = TPLLandEngine.calculate(engineInput);
`;

const newSimulateBlock = `
        const { TPLLandEngine } = await import('../../js/core/valuation-engine.js');
        
        // 1. Consultar el Catastro (Supabase) para precios reales de esta comuna
        import('../../core/supabase.js').then(async ({ getClient }) => {
            const client = getClient();
            try {
                // Buscamos la referencia dinámica (Promedios Reales + Escasez)
                const catastroRef = await TPLLandEngine.fetchDynamicMarket(engineInput, client);
                if (catastroRef) {
                    engineInput.dynamicMarketReference = catastroRef;
                    console.log("[TASADOR] Usando datos reales del Catastro para " + engineInput.comuna, catastroRef);
                } else {
                    console.log("[TASADOR] No hay datos en Catastro para " + engineInput.comuna + ". Usando valores de referencia (Standalone).");
                }
            } catch (e) {
                console.warn("[TASADOR] Falló la conexión al Catastro, usando fallback.", e);
            }
            
            // 2. Calcular el valor final usando la referencia (dinámica o por defecto)
            const res = TPLLandEngine.calculate(engineInput);
            
            if (res && res.valor_recomendado) {
                const fmtMoney = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
                document.getElementById('ei-tasacion-recomendado').textContent = fmtMoney(res.valor_recomendado);
                document.getElementById('ei-tasacion-apuro').textContent = fmtMoney(res.valor_venta_apuro);
                document.getElementById('ei-tasacion-score').textContent = (res.opportunityScore || 0) + '/100';
                
                const precio = engineInput.asking || 0;
                if (precio > 0) {
                    const diff = Math.round(((precio - res.valor_recomendado) / res.valor_recomendado) * 100);
                    const sign = diff > 0 ? '+' : '';
                    document.getElementById('ei-tasacion-brecha').textContent = \`\${sign}\${diff}%\`;
                    document.getElementById('ei-tasacion-brecha').style.color = diff > 0 ? '#e63946' : '#2a9d8f';
                } else {
                    document.getElementById('ei-tasacion-brecha').textContent = '—';
                }
                showToast('Tasación simulada exitosamente' + (catastroRef ? ' (Usando Catastro)' : ' (Valores Referenciales)'), 'success');
            }
        });
`;

content = content.replace(/const \{ TPLLandEngine \} = await import\('\.\.\/\.\.\/js\/core\/valuation-engine\.js'\);\s*const res = TPLLandEngine\.calculate\(engineInput\);\s*if \(res && res\.valor_recomendado\) \{.*?showToast\('Tasación simulada exitosamente', 'success'\);\s*\}/s, newSimulateBlock);

fs.writeFileSync(path, content, 'utf8');
console.log('editor-integral.js updated');
