const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/informe-valores/app.js', 'utf8');
const lines = js.split('\n');
const startIdx = lines.findIndex(l => l.includes('async function renderComparables'));

if (startIdx !== -1) {
    const cleanLines = lines.slice(0, startIdx);
    const renderComparablesFunc = `
async function renderComparables(prop) {
    if (!window.TPLDataService) return;
    try {
        const client = await window.TPLDataService.getClient();
        const comuna = prop.comuna;
        if (!comuna) return;

        const { data, error } = await client.from('tpl_catastro_mercado')
            .select('*')
            .eq('comuna', comuna)
            .limit(50);

        if (error || !data || data.length === 0) return;
        
        const targetPrice = prop.precio ? (typeof prop.precio === 'string' ? parseInt(prop.precio.replace(/\\D/g, '')) : prop.precio) : 0;
        
        if (targetPrice > 0) {
            data.sort((a, b) => {
                const pa = a.precio_clp || 0;
                const pb = b.precio_clp || 0;
                return Math.abs(pa - targetPrice) - Math.abs(pb - targetPrice);
            });
        }

        const top5 = data.slice(0, 5);
        
        const container = document.getElementById('comparables-container');
        if (!container) return;

        let html = '<h3 class="sect-title">V. Comparativo de Mercado (Catastro)</h3>';
        html += '<p style="color:#64748b; margin-bottom:1rem; font-size:0.95rem;">Mostrando las 5 propiedades más parecidas en valor publicadas en el mercado abierto de ' + comuna + '.</p>';
        html += '<div style="display:flex; flex-direction:column; gap:10px;">';
        
        top5.forEach((c) => {
            const p = c.precio_clp ? '$' + c.precio_clp.toLocaleString('es-CL') : 'Sin precio';
            const m2 = c.superficie_m2 ? c.superficie_m2.toLocaleString('es-CL') + ' m2' : 'Sup. desc.';
            const tipo = c.tipo_inmueble || 'Parcela';
            html += '<div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center;"><div><strong style="color:#0f172a;">' + (c.titulo || tipo) + '</strong><div style="font-size:0.85rem; color:#64748b; margin-top:4px;">' + m2 + ' - ' + c.comuna + '</div></div><div style="font-weight:800; color:#005aa0; font-size:1.1rem;">' + p + '</div></div>';
        });
        
        html += '</div>';
        
        // --- ADD CHART SECTION ---
        html += '<div style="margin-top: 30px; background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">';
        html += '  <h4 style="margin-top:0; color:#0f172a; text-align:center;">Posición de Precio frente a Competidores</h4>';
        html += '  <canvas id="competitorsChart" width="400" height="200"></canvas>';
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'block';
        
        // Render Chart
        setTimeout(() => {
            const ctx = document.getElementById('competitorsChart');
            if (ctx && window.Chart) {
                const chartData = top5.map(c => ({
                    label: (c.titulo || 'Parcela').substring(0, 20) + '...',
                    price: c.precio_clp || 0,
                    isTarget: false
                }));
                
                chartData.push({
                    label: 'ESTA PROPIEDAD (TPL)',
                    price: targetPrice,
                    isTarget: true
                });
                
                chartData.sort((a,b) => a.price - b.price);
                
                new window.Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: chartData.map(d => d.label),
                        datasets: [{
                            label: 'Valor Publicado (CLP)',
                            data: chartData.map(d => d.price),
                            backgroundColor: chartData.map(d => d.isTarget ? '#005aa0' : '#cbd5e1'),
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + (value/1000000) + 'M';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }, 100);

    } catch(e) {
        console.warn('No se pudo cargar el catastro para comparables', e);
    }
}
`;
    
    fs.writeFileSync('frontend-v2/plataforma/informe-valores/app.js', cleanLines.join('\n') + '\n' + renderComparablesFunc);
    console.log('Successfully repaired app.js');
}
