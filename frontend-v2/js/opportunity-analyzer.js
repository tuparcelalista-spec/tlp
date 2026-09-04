/**
 * opportunity-analyzer.js
 * MVP: URL -> Fallback manual -> Valoración -> Diagnóstico Comercial
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnExtract = document.getElementById('btn-analyze-url');
    const urlInput = document.getElementById('opp-url-input');
    const manualForm = document.getElementById('opp-manual-form');
    const btnManualAnalyze = document.getElementById('btn-analyze-manual');
    const resultCard = document.getElementById('opp-result-card');
    
    if(!btnExtract) return;

    btnExtract.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if(!url) {
            alert('Por favor ingresa un enlace válido.');
            return;
        }

        const btnText = btnExtract.innerHTML;
        btnExtract.innerHTML = 'Analizando...';
        btnExtract.disabled = true;

        // Simular intento de extracción fallido
        setTimeout(() => {
            btnExtract.innerHTML = btnText;
            btnExtract.disabled = false;
            
            document.getElementById('opp-extract-error').style.display = 'block';
            manualForm.style.display = 'grid';
            urlInput.disabled = true;
        }, 1200);
    });

    btnManualAnalyze.addEventListener('click', async () => {
        const comuna = document.getElementById('opp-comuna').value;
        const superficie = parseInt(document.getElementById('opp-superficie').value) || 0;
        const precio = parseInt(document.getElementById('opp-precio').value) || 0;

        if(!comuna || superficie < 1000 || precio < 1000000) {
            alert('Por favor completa todos los campos con valores reales.');
            return;
        }

        btnManualAnalyze.innerHTML = 'Procesando...';
        btnManualAnalyze.disabled = true;

        const tempProperty = {
            comuna: comuna,
            superficie: superficie,
            precio: precio,
            metadata: { isOpportunityDetector: true }
        };

        try {
            const valResult = await window.TPLValuationAdapter.runValuation(tempProperty, window.TPLLandEngine);
            
            const precioPublicado = precio;
            const valorObservado = valResult.valores.comunalBruto;
            
            const diffPct = ((precioPublicado - valorObservado) / valorObservado) * 100;
            
            renderDiagnosis(precioPublicado, valorObservado, diffPct);
            
            manualForm.style.display = 'none';
            document.getElementById('opp-extract-error').style.display = 'none';
            resultCard.style.display = 'block';

        } catch(e) {
            console.error("Error en valoración:", e);
            alert("Hubo un error al calcular. Intenta nuevamente.");
        } finally {
            btnManualAnalyze.innerHTML = 'Analizar igualmente';
            btnManualAnalyze.disabled = false;
        }
    });

    function renderDiagnosis(precio, valorTpl, diffPct) {
        const tagEl = document.getElementById('opp-res-tag');
        const pubEl = document.getElementById('opp-res-pub');
        const estEl = document.getElementById('opp-res-est');
        const diffEl = document.getElementById('opp-res-diff');
        const diagEl = document.getElementById('opp-res-diag');

        const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
        
        pubEl.textContent = formatter.format(precio);
        estEl.textContent = formatter.format(valorTpl);

        let toneClass = '';
        let icon = '';
        let tagText = '';
        let diagnosticText = '';

        if (diffPct < -10) {
            toneClass = 'is-opportunity'; icon = '🟢'; tagText = 'OPORTUNIDAD TPL';
            diagnosticText = 'El precio publicado está por debajo del valor observado por nuestra metodología.';
            diffEl.textContent = `${Math.abs(diffPct).toFixed(1)}% bajo el valor observado`;
            diffEl.style.color = '#10b981';
        } else if (diffPct > 15) {
            toneClass = 'is-overpriced'; icon = '🔴'; tagText = 'SOBRE EL RANGO';
            diagnosticText = 'El precio publicado supera significativamente el rango observado por TPL.';
            diffEl.textContent = `+${Math.abs(diffPct).toFixed(1)}% sobre el valor observado`;
            diffEl.style.color = '#ef4444';
        } else {
            toneClass = 'is-aligned'; icon = '🔵'; tagText = 'PRECIO ALINEADO';
            diagnosticText = 'El precio publicado se encuentra dentro del rango observado por TPL.';
            diffEl.textContent = 'Alineado al mercado';
            diffEl.style.color = '#3b82f6';
        }

        resultCard.className = `opp-result-card ${toneClass}`;
        tagEl.textContent = `${icon} ${tagText}`;
        diagEl.textContent = diagnosticText;

        // Inyectar los nuevos botones comerciales estratégicos
        let ctaHtml = '';
        
        if (diffPct > 10) {
            // Si está sobre el precio (Sobrevalorada)
            ctaHtml = `
                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; display:flex; gap:12px; flex-wrap:wrap;">
                    <button class="btn-unlock" style="background:#073a5a; flex:1;" onclick="alert('Captura Lead: Delegar Negociación')">
                        🤝 <strong>Delega la negociación</strong><br><span style="font-size:0.8rem; font-weight:normal;">Dejamos que TPL negocie la bajada de precio por ti.</span>
                    </button>
                    <button class="btn-unlock" style="background:white; color:#073a5a; border:1px solid #073a5a; flex:1;" onclick="window.location.href='./plataforma/informe-valores/index.html?express=true'">
                        📄 <strong>Negocia tú mismo</strong><br><span style="font-size:0.8rem; font-weight:normal;">Compra el informe como argumento para el dueño.</span>
                    </button>
                </div>
            `;
        } else {
            // Si es oportunidad o alineado
            ctaHtml = `
                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; display:flex; gap:12px; flex-wrap:wrap;">
                    <button class="btn-unlock" style="background:#10b981; flex:1;" onclick="alert('Captura Lead: Asesoría de Compra')">
                        🚀 <strong>Quiero esta oportunidad</strong><br><span style="font-size:0.8rem; font-weight:normal;">TPL te asesora para asegurar la compra segura.</span>
                    </button>
                    <button class="btn-unlock" style="background:white; color:#073a5a; border:1px solid #073a5a; flex:1;" onclick="window.location.href='./plataforma/informe-valores/index.html?express=true'">
                        📄 <strong>Ver análisis completo</strong><br><span style="font-size:0.8rem; font-weight:normal;">Obtén el informe técnico antes de invertir.</span>
                    </button>
                </div>
            `;
        }

        // Remover botones viejos si existen y agregar los nuevos
        const oldCtas = resultCard.querySelector('.dynamic-ctas');
        if(oldCtas) oldCtas.remove();
        
        const ctaContainer = document.createElement('div');
        ctaContainer.className = 'dynamic-ctas';
        ctaContainer.innerHTML = ctaHtml;
        resultCard.appendChild(ctaContainer);
        
        // Esconder el botón genérico antiguo
        const genericBtn = resultCard.querySelector('.btn-unlock:not(.dynamic-ctas button)');
        if(genericBtn) genericBtn.style.display = 'none';
    }
});
