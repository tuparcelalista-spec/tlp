const fs = require('fs');
const path = require('path');

const dir = 'frontend-v2/plataforma/informe-valores';

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnóstico Comercial TPL</title>
    <!-- Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --c-navy: #0F2744;
            --c-dark: #39424E;
            --c-light: #EEF1F4;
            --c-white: #FFFFFF;
            --c-green: #10b981;
            --c-amber: #f59e0b;
            --c-red: #ef4444;
            --c-border: #e2e8f0;
            --font-main: 'Inter', system-ui, sans-serif;
            --radius: 8px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-main); color: var(--c-dark); background-color: #f8fafc; line-height: 1.6; }

        /* HEADER NAV (Estilo TPL Principal) */
        .header-nav { background: var(--c-navy); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; color: var(--c-white); }
        .header-nav .logo { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px; }
        .header-nav .badge { background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; }

        .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }

        /* PORTADA / CABECERA */
        .report-header { background: var(--c-white); border: 1px solid var(--c-border); border-radius: var(--radius); padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02); display: flex; gap: 2rem; align-items: center; }
        .hero-img-wrap { width: 150px; height: 150px; flex-shrink: 0; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--c-border); }
        .hero-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .report-meta h1 { font-size: 2rem; color: var(--c-navy); margin-bottom: 0.5rem; line-height: 1.2; font-weight: 700; }
        .report-meta p { font-size: 1.1rem; color: #64748b; margin-bottom: 1rem; }
        .doc-info { display: flex; gap: 1.5rem; font-size: 0.85rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }

        /* SECCIONES COMUNES */
        section { background: var(--c-white); border: 1px solid var(--c-border); border-radius: var(--radius); padding: 2.5rem; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .sect-title { font-size: 1.5rem; color: var(--c-navy); margin-bottom: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; border-bottom: 2px solid var(--c-light); padding-bottom: 1rem; }

        /* RESUMEN EJECUTIVO */
        .exec-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .exec-card { background: #f8fafc; border: 1px solid var(--c-border); padding: 1.5rem; border-radius: var(--radius); text-align: left; }
        .exec-card .lbl { display: block; font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
        .exec-card .val { display: block; font-size: 1.5rem; color: var(--c-navy); font-weight: 800; margin-bottom: 0.25rem; }
        .exec-card .sub { font-size: 0.85rem; color: #94a3b8; font-weight: 500; }
        
        .indicator-green { color: var(--c-green) !important; }
        .indicator-amber { color: var(--c-amber) !important; }
        .indicator-red { color: var(--c-red) !important; }

        /* METODOLOGIA DIAGRAM */
        .methodology-flow { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; margin-top: 1.5rem; background: var(--c-navy); padding: 1.5rem; border-radius: var(--radius); color: white; }
        .flow-step { text-align: center; font-size: 0.85rem; font-weight: 500; flex: 1; }
        .flow-arrow { color: rgba(255,255,255,0.3); font-weight: bold; }

        /* CASCADA / TECHNICAL */
        .tech-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .tech-item { border: 1px solid var(--c-border); padding: 1rem; border-radius: var(--radius); display: flex; justify-content: space-between; font-size: 0.95rem; }
        .tech-item span { color: #64748b; }
        .tech-item strong { color: var(--c-navy); }

        .waterfall-chart { border: 1px solid var(--c-border); border-radius: var(--radius); overflow: hidden; }
        .wf-row { display: flex; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--c-border); font-size: 0.95rem; }
        .wf-row:last-child { border-bottom: none; }
        .wf-base, .wf-total { background: #f8fafc; font-weight: 700; color: var(--c-navy); }
        .wf-total { font-size: 1.1rem; }
        
        /* ESCENARIOS / MARKETING MATRIX */
        .scenario-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; margin-bottom: 2rem; }
        .scenario-table th { background: var(--c-light); color: var(--c-navy); font-weight: 600; text-align: left; padding: 1rem; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .scenario-table td { padding: 1rem; border-bottom: 1px solid var(--c-border); color: var(--c-dark); font-size: 0.95rem; }
        .scenario-table tr.active-scenario { background: #f0fdf4; border-left: 4px solid var(--c-green); }
        
        .strategy-checklist { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
        .strategy-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: var(--c-dark); }
        .strategy-item.inactive { color: #cbd5e1; text-decoration: line-through; }
        .icon-check { color: var(--c-green); font-weight: bold; }
        .icon-cross { color: #cbd5e1; font-weight: bold; }

        /* LECTURA TPL (Narrativa) */
        .tpl-reading { background: #f8fafc; border-left: 4px solid var(--c-navy); padding: 1.5rem; border-radius: 0 var(--radius) var(--radius) 0; margin-bottom: 1.5rem; font-size: 1rem; line-height: 1.6; color: var(--c-dark); }

        /* LOADING */
        .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; }
        .spinner { border: 4px solid var(--c-light); border-top: 4px solid var(--c-navy); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* FOOTER */
        .corp-footer { text-align: center; padding: 2rem; font-size: 0.85rem; color: #94a3b8; border-top: 1px solid var(--c-border); margin-top: 4rem; }
    </style>
</head>
<body>

    <nav class="header-nav">
        <div class="logo">TU PARCELA LISTA</div>
        <div class="badge">Inteligencia Inmobiliaria</div>
    </nav>

    <!-- LOADING -->
    <div id="loading-overlay" class="loading-overlay">
        <div class="spinner"></div>
        <p style="color: var(--c-navy); font-weight: 500;">Generando Diagnóstico Comercial...</p>
    </div>

    <main class="container" id="main-content" style="display:none;">
        
        <!-- CABECERA -->
        <header class="report-header">
            <div class="hero-img-wrap">
                <img id="hero-img" src="../../assets/placeholder.png" alt="Propiedad">
            </div>
            <div class="report-meta">
                <h1 id="prop-title">Activo Inmobiliario</h1>
                <p id="prop-subtitle">Ubicación en Evaluación</p>
                <div class="doc-info">
                    <span>FECHA: <strong id="doc-date">--</strong></span>
                    <span>CÓDIGO REF: <strong id="doc-id">--</strong></span>
                </div>
            </div>
        </header>

        <!-- 1. RESUMEN EJECUTIVO -->
        <section>
            <h2 class="sect-title">I. Resumen Ejecutivo (Executive Summary)</h2>
            <div class="exec-summary-grid">
                <div class="exec-card">
                    <span class="lbl">Valor Recomendado TPL</span>
                    <span class="val" id="sum-value">--</span>
                    <span class="sub">Techo de liquidez óptima</span>
                </div>
                <div class="exec-card">
                    <span class="lbl">Riesgo Comercial</span>
                    <span class="val" id="sum-risk">--</span>
                    <span class="sub">Basado en delta de precio</span>
                </div>
                <div class="exec-card">
                    <span class="lbl">Liquidez Esperada</span>
                    <span class="val" id="sum-liquidity">--</span>
                    <span class="sub" id="sum-time">-- días est.</span>
                </div>
                <div class="exec-card">
                    <span class="lbl">Confianza Estadística</span>
                    <span class="val" id="sum-confidence">--</span>
                    <span class="sub">Soporte del modelo</span>
                </div>
            </div>
            
            <div class="tpl-reading">
                <strong>Diagnóstico Comercial:</strong>
                <p id="reading-executive" style="margin-top: 0.5rem;">Cargando diagnóstico...</p>
            </div>
        </section>

        <!-- 2. FUNDAMENTOS DE MERCADO -->
        <section>
            <h2 class="sect-title">II. Fundamentos de Mercado (Catastro)</h2>
            <div class="tpl-reading" style="margin-bottom: 2rem;">
                <p id="reading-market">El modelo TPL analizó propiedades comparables en la zona, ponderando superficie, accesibilidad y atributos naturales para estimar el rango de mayor probabilidad de transacción.</p>
            </div>
            
            <div id="comparables-container">
                <!-- Inyectado por JS -->
            </div>
            <div style="margin-top: 2rem;">
                <canvas id="competitorsChart" width="100%" height="40"></canvas>
            </div>
        </section>

        <!-- 3. AUDITORIA TECNICA & CASCADA -->
        <section>
            <h2 class="sect-title">III. Auditoría Técnica y Modelo TPL</h2>
            <p style="color: #64748b; margin-bottom: 1.5rem; font-size: 0.95rem;">Construcción algorítmica del valor del activo basada en sus atributos de habilitación y topografía.</p>
            
            <div class="tech-grid" id="tech-attributes-container">
                <!-- JS inject -->
            </div>

            <div class="waterfall-chart">
                <div class="wf-row wf-base">
                    <span>Base Territorial (Suelo + Ubicación)</span>
                    <span id="wf-base-val">--</span>
                </div>
                <div id="wf-adjustments-container"></div>
                <div class="wf-row wf-total">
                    <span>Valor Calculado Final</span>
                    <span id="wf-final-val">--</span>
                </div>
            </div>
        </section>

        <!-- 4. ESTRATEGIA COMERCIAL -->
        <section>
            <h2 class="sect-title">IV. Proyección Comercial y Estrategia de Salida</h2>
            
            <table class="scenario-table">
                <thead>
                    <tr>
                        <th>Escenario</th>
                        <th>Posicionamiento</th>
                        <th>Liquidez</th>
                        <th>Estrategia Requerida</th>
                    </tr>
                </thead>
                <tbody id="scenario-tbody">
                    <!-- JS inject -->
                </tbody>
            </table>

            <h3 style="font-size: 1.1rem; color: var(--c-navy); margin-bottom: 1rem; font-weight: 600;">Plan de Marketing Recomendado para su Precio Actual:</h3>
            <div class="strategy-checklist" id="strategy-checklist">
                <!-- JS inject -->
            </div>
        </section>
        
        <!-- 5. TRANSPARENCIA METODOLOGICA -->
        <section style="background: transparent; border: none; box-shadow: none; padding: 0;">
            <h3 style="font-size: 1.1rem; color: #64748b; text-align: center; font-weight: 600;">¿Cómo calcula TPL este diagnóstico?</h3>
            <div class="methodology-flow">
                <div class="flow-step">Datos Catastrales</div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">Filtro de Comparables</div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">Auditoría Técnica</div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">Modelo Algorítmico</div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">Diagnóstico de Liquidez</div>
            </div>
        </section>

        <!-- 6. CIERRE EJECUTIVO -->
        <section style="margin-top: 3rem; background: var(--c-navy); color: white;">
            <h2 class="sect-title" style="color: white; border-bottom-color: rgba(255,255,255,0.1);">Conclusión Ejecutiva</h2>
            <p id="reading-conclusion" style="font-size: 1.05rem; line-height: 1.8; color: #e2e8f0;">
                El análisis realizado por el modelo TPL concluye que el activo presenta un nivel de competitividad comercial alto dentro de su segmento. La estrategia recomendada consiste en iniciar la comercialización dentro del rango sugerido para maximizar la probabilidad de venta en un horizonte de corto a mediano plazo.
            </p>
        </section>

        <footer class="corp-footer">
            <p>Metodología TPL © Centro de Inteligencia Inmobiliaria.</p>
            <p style="margin-top: 0.5rem;">Documento de uso interno y estratégico. Basado en algoritmos propietarios de Tu Parcela Lista.</p>
        </footer>

    </main>

    <script src="../../js/core/tpl-data-service.js"></script>
    <script src="../../js/core/valuation-engine.js"></script>
    <script type="module" src="app.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'index.html'), htmlContent);

const jsContent = `import { TPLValuationAdapter } from '../../js/core/valuation-adapter.js';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        alert("ID de propiedad no especificado.");
        return;
    }

    try {
        const client = await window.TPLDataService.getClient();
        const { data: propertyData, error } = await client.from('tpl_propiedades').select('*').eq('id', id).single();
        if (error || !propertyData) throw new Error('Propiedad no encontrada en la base de datos.');

        const valuationResult = await TPLValuationAdapter.runValuation(propertyData, window.TPLLandEngine);
        
        document.getElementById('loading-overlay').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
        renderCorporateReport(propertyData, valuationResult);
        await renderComparables(propertyData, valuationResult);
    } catch (error) {
        console.error('Error procesando informe:', error);
        alert(error.message);
    }
});

function formatCurrency(num) {
    return '$ ' + Math.round(num).toLocaleString('es-CL');
}

function renderCorporateReport(prop, valuation) {
    // FECHA Y METADATA
    document.getElementById('doc-date').textContent = new Date().toLocaleDateString('es-CL');
    document.getElementById('doc-id').textContent = (prop.codigo || prop.id).substring(0,8).toUpperCase();
    document.getElementById('prop-title').textContent = prop.titulo || 'Activo Inmobiliario TPL';
    document.getElementById('prop-subtitle').textContent = \`\${prop.comuna || 'Zona'}, \${prop.region || 'Región'}\`;
    const imgUrl = prop.url_imagen_principal || (prop.metadata?.imagenes && prop.metadata.imagenes[0]) || '../../assets/placeholder-parcela.jpg';
    document.getElementById('hero-img').src = imgUrl;

    // VALORES BASE
    const tplValue = valuation.valorFinal || 0;
    const ownerPrice = prop.precio_publicado || prop.precio_clp || tplValue;
    const diffRatio = tplValue > 0 ? (ownerPrice / tplValue) : 1;
    const diffPercent = Math.round((diffRatio - 1) * 100);

    document.getElementById('sum-value').textContent = formatCurrency(tplValue);
    document.getElementById('sum-confidence').textContent = \`\${valuation.confianza || 85}%\`;

    // CALCULO DE LIQUIDEZ Y RIESGO COMERCIAL
    let liquidity = "Alta";
    let risk = "Bajo";
    let riskClass = "indicator-green";
    let timeEst = "45–90";
    let scenarioIndex = 0; // 0: Optimo, 1: Competitivo, 2: Diferenciado, 3: Exclusivo

    if (diffPercent <= 5) {
        liquidity = "Alta"; risk = "Bajo"; riskClass = "indicator-green"; timeEst = "45–90"; scenarioIndex = 0;
    } else if (diffPercent <= 15) {
        liquidity = "Media-Alta"; risk = "Moderado"; riskClass = "indicator-amber"; timeEst = "90–120"; scenarioIndex = 1;
    } else if (diffPercent <= 25) {
        liquidity = "Media"; risk = "Moderado"; riskClass = "indicator-amber"; timeEst = "120–180"; scenarioIndex = 2;
    } else {
        liquidity = "Baja"; risk = "Alto"; riskClass = "indicator-red"; timeEst = "+180"; scenarioIndex = 3;
    }

    const sumRisk = document.getElementById('sum-risk');
    sumRisk.textContent = risk;
    sumRisk.className = \`val \${riskClass}\`;
    
    document.getElementById('sum-liquidity').textContent = liquidity;
    document.getElementById('sum-time').textContent = \`\${timeEst} días est.\`;

    // DIAGNOSTICO EJECUTIVO NARRATIVA
    let diagText = "";
    if (scenarioIndex === 0) {
        diagText = \`El precio propuesto se encuentra perfectamente alineado con el rango de mayor liquidez observado en el mercado. Bajo las condiciones actuales, esta estrategia maximiza la probabilidad de recibir consultas calificadas y reducir el tiempo de comercialización (Time-to-market).\`;
    } else if (scenarioIndex === 1 || scenarioIndex === 2) {
        diagText = \`El precio de salida se ubica un \${diffPercent}% por sobre el rango de mayor liquidez identificado por el modelo TPL. Esta estrategia continúa siendo viable; sin embargo, requiere un período de exposición mayor y acciones de marketing orientadas a reforzar la percepción de valor del activo para justificar el diferencial.\`;
    } else {
        diagText = \`El precio solicitado posiciona la propiedad dentro de un segmento de oferta altamente selectivo (+\${diffPercent}% sobre el rango de liquidez). La comercialización requerirá una estrategia de marketing boutique diferenciada, con un horizonte de venta extenso y una inversión superior en posicionamiento comercial.\`;
    }
    document.getElementById('reading-executive').textContent = diagText;

    // CASCADA MATEMATICA
    const wfBase = document.getElementById('wf-base-val');
    const wfFinal = document.getElementById('wf-final-val');
    const wfContainer = document.getElementById('wf-adjustments-container');
    
    wfBase.textContent = formatCurrency(valuation.valorBaseComunal || 0);
    wfFinal.textContent = formatCurrency(tplValue);
    
    let htmlAdj = '';
    const items = valuation.explicacion || valuation.factores || [];
    items.forEach(adj => {
        if(adj.impacto !== 0) {
            const isPos = adj.impacto > 0;
            htmlAdj += \`
                <div class="wf-row" style="padding-left: 2.5rem; font-size: 0.9rem; color: #475569;">
                    <span>\${adj.factor}</span>
                    <span style="color: \${isPos ? 'var(--c-green)' : 'var(--c-amber)'}; font-weight: 500;">
                        \${isPos ? '+' : ''}\${formatCurrency(adj.impacto)}
                    </span>
                </div>
            \`;
        }
    });
    wfContainer.innerHTML = htmlAdj;

    // ATRIBUTOS TECNICOS
    const techContainer = document.getElementById('tech-attributes-container');
    const attr = [
        { label: 'Superficie', val: prop.superficie_m2 ? \`\${prop.superficie_m2} m²\` : 'N/D' },
        { label: 'Topografía', val: prop.topografia || 'N/D' },
        { label: 'Fact. Agua', val: prop.agua || 'N/D' },
        { label: 'Fact. Luz', val: prop.electricidad || prop.luz || 'N/D' },
        { label: 'Situación Rol', val: prop.rol_situacion || 'N/D' }
    ];
    techContainer.innerHTML = attr.map(a => \`
        <div class="tech-item">
            <span>\${a.label}</span>
            <strong>\${a.val}</strong>
        </div>
    \`).join('');

    // MATRIZ DE ESCENARIOS Y MARKETING
    const tbody = document.getElementById('scenario-tbody');
    const scenarios = [
        { name: 'Óptimo', pos: 'Valor TPL', liq: 'Alta', strat: 'Publicación Estándar' },
        { name: 'Competitivo', pos: '+10%', liq: 'Media-Alta', strat: 'Fotografía Profesional' },
        { name: 'Diferenciado', pos: '+20%', liq: 'Media', strat: 'Video Dron + RRSS' },
        { name: 'Exclusivo', pos: '>20%', liq: 'Baja', strat: 'Marketing Boutique Exclusivo' }
    ];
    
    let trs = '';
    scenarios.forEach((sc, i) => {
        const isActive = (i === scenarioIndex) || (i===3 && scenarioIndex>3);
        trs += \`<tr class="\${isActive ? 'active-scenario' : ''}">
            <td><strong>\${sc.name}</strong> \${isActive ? '<span style="font-size:0.75rem; color:var(--c-green); margin-left:8px;">★ SU POSICIÓN</span>' : ''}</td>
            <td>\${sc.pos}</td>
            <td>\${sc.liq}</td>
            <td>\${sc.strat}</td>
        </tr>\`;
    });
    tbody.innerHTML = trs;

    // CHECKLIST DE MARKETING
    const tools = [
        { name: 'Publicación en TPL', req: 0 },
        { name: 'Portales Masivos', req: 0 },
        { name: 'Fotografía Profesional HDR', req: 1 },
        { name: 'Campaña en Meta (RRSS)', req: 1 },
        { name: 'Video con Dron', req: 2 },
        { name: 'Landing Page Dedicada', req: 2 },
        { name: 'Pauta en Segmentos ABC1', req: 3 },
        { name: 'Gestión Red de Inversionistas', req: 3 }
    ];

    const clContainer = document.getElementById('strategy-checklist');
    clContainer.innerHTML = tools.map(t => {
        const active = scenarioIndex >= t.req;
        return \`
            <div class="strategy-item \${active ? '' : 'inactive'}">
                <span class="\${active ? 'icon-check' : 'icon-cross'}">\${active ? '✓' : '×'}</span>
                \${t.name}
            </div>
        \`;
    }).join('');

    // CONCLUSIÓN FINAL
    document.getElementById('reading-conclusion').textContent = \`El modelo TPL concluye que el activo posee fundamentos técnicos sólidos. Su posicionamiento comercial actual sugiere una liquidez \${liquidity.toLowerCase()}, lo que conlleva un riesgo de colocación \${risk.toLowerCase()}. Para cumplir el objetivo de venta manteniendo este nivel de precio, es mandatorio implementar la estrategia de "\${scenarios[Math.min(scenarioIndex,3)].strat}" para sostener la percepción de valor y alcanzar a la audiencia calificada correcta.\`;
}

async function renderComparables(prop, valuation) {
    if (!window.TPLDataService) return;
    try {
        const client = await window.TPLDataService.getClient();
        const comuna = prop.comuna;
        if (!comuna) return;

        const { data, error } = await client.from('tpl_catastro_mercado')
            .select('titulo, comuna, precio_clp, superficie_m2')
            .eq('comuna', comuna)
            .limit(50);

        if (error || !data || data.length === 0) {
            document.getElementById('reading-market').textContent = "El modelo TPL estimó el valor fundamentándose en tendencias macro de la región, al no encontrar liquidez inmediata de comparables directos en la base.";
            return;
        }
        
        const targetPrice = valuation.valorFinal || 0;
        document.getElementById('reading-market').textContent = \`El modelo TPL analizó \${data.length} propiedades publicadas en el mercado abierto de \${comuna}, ponderando superficie, accesibilidad, urbanización y comportamiento histórico de precios para estimar el rango de mayor probabilidad de transacción.\`;

        if (targetPrice > 0) {
            data.sort((a, b) => Math.abs((a.precio_clp||0) - targetPrice) - Math.abs((b.precio_clp||0) - targetPrice));
        }
        const top5 = data.slice(0, 5);
        
        const container = document.getElementById('comparables-container');
        let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">';
        
        top5.forEach((c) => {
            const p = c.precio_clp ? '$' + c.precio_clp.toLocaleString('es-CL') : 'Sin precio';
            const m2 = c.superficie_m2 ? c.superficie_m2.toLocaleString('es-CL') + ' m²' : 'Sup. desc.';
            html += \`<div style="background:var(--c-white); border:1px solid var(--c-border); border-radius:var(--radius); padding:1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-weight:600; color:var(--c-navy); font-size: 0.9rem; margin-bottom: 0.25rem;">\${(c.titulo || 'Propiedad').substring(0,35)}...</div>
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:0.5rem;">\${m2} - \${c.comuna}</div>
                <div style="font-weight:700; color:var(--c-navy); font-size:1rem;">\${p}</div>
            </div>\`;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Chart
        setTimeout(() => {
            const ctx = document.getElementById('competitorsChart');
            if (ctx && window.Chart) {
                const chartData = top5.map(c => ({
                    label: (c.titulo || 'Propiedad').substring(0, 15) + '...',
                    price: c.precio_clp || 0,
                    isTarget: false
                }));
                chartData.push({ label: 'ESTA PROPIEDAD (TPL)', price: targetPrice, isTarget: true });
                chartData.sort((a,b) => a.price - b.price);
                
                new window.Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: chartData.map(d => d.label),
                        datasets: [{
                            label: 'Valor de Mercado (CLP)',
                            data: chartData.map(d => d.price),
                            backgroundColor: chartData.map(d => d.isTarget ? '#0F2744' : '#cbd5e1'),
                            borderRadius: 4
                        }]
                    },
                    options: { responsive: true, plugins: { legend: { display: false } } }
                });
            }
        }, 300);

    } catch(e) {
        console.warn('Error en comparables:', e);
    }
}
`;

fs.writeFileSync(path.join(dir, 'app.js'), jsContent);
console.log('Informe Rediseñado Exitosamente');
