const fs = require('fs');
let html = fs.readFileSync('frontend-v2/plataforma/informe-valores/index.html', 'utf8');
if (!html.includes('chart.js')) {
    html = html.replace('</head>', '    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n</head>');
    fs.writeFileSync('frontend-v2/plataforma/informe-valores/index.html', html, 'utf8');
    console.log('Added Chart.js to html');
}

let js = fs.readFileSync('frontend-v2/plataforma/informe-valores/app.js', 'utf8');
const newLogic = `
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
                // Prepare data
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
                
                // Sort by price
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
`;

js = js.replace(/html \+= '<\/div>';\s*container\.innerHTML = html;\s*container\.style\.display = 'block';/, newLogic);

fs.writeFileSync('frontend-v2/plataforma/informe-valores/app.js', js, 'utf8');
console.log('App.js updated');
