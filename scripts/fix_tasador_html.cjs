const fs = require('fs');

let html = fs.readFileSync('frontend-v2/plataforma/publicar/tasador.html', 'utf8');

// The file was mangled starting at <section class="mode-picker" aria-label="Tipo de tasación">
// It replaced mode-picker buttons, the form tag, the crmSmartCompletion, and the first 3 inputs of the grid.
// Let's replace from `<section class="mode-picker"` to `<label><span>Distancia al centro`

const startTag = '<section class="mode-picker" aria-label="Tipo de tasación">';
const endTag = '<label><span>Distancia al centro de la comuna</span>';

let startIndex = html.indexOf(startTag);
let endIndex = html.indexOf(endTag);

const newContent = `<section class="mode-picker" aria-label="Tipo de tasación">
<button type="button" class="mode-card is-active" data-mode="rapida"><span>Rápida</span><strong>Quiero una referencia ahora</strong><small>Ubicación, superficie y factores esenciales.</small></button>
<button type="button" class="mode-card" data-mode="precisa"><span>Precisa</span><strong>Quiero un análisis más completo</strong><small>Más atributos, coordenadas, vivienda y mejor Informe Premium.</small></button>
</section>

<div class="layout">
<form id="tasadorForm" class="card form-card">
<section id="crmSmartCompletion" class="crm-smart-completion" hidden aria-live="polite">
  <div class="crm-ai-header">
    <div class="ai-avatar">🤖</div>
    <div>
      <span>Agente IA TPL</span>
      <strong id="crmCompletionTitle">Revisando mercado local...</strong>
    </div>
  </div>
  <div id="crmAiLoading" class="crm-ai-loading">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <small>Buscando parcelas similares en la zona...</small>
  </div>
  <p id="crmCompletionText" hidden>El Agente IA de TPL está analizando tu propiedad frente al mercado.</p>
  <div class="crm-completion-meter" hidden><span id="crmCompletionBar"></span></div>
  <div id="crmKnownData" class="crm-known-data" hidden></div>
  <div id="crmMissingData" class="crm-missing-data" hidden></div>
</section>
<div class="section-heading"><span class="step-pill">1</span><div><h2>Ubicación y terreno</h2><p>Estos datos siempre son necesarios.</p></div></div>
<div class="grid">
<label><span>Región</span><select id="region" required><option value="">Cargando regiones...</option></select></label>
<label><span>Comuna</span><select id="comuna" required disabled><option value="">Primero selecciona región</option></select></label>
<label><span>Superficie terreno (m²)</span><input id="superficie" type="number" min="100" step="100" value="5000" required></label>
`;

let fixedHtml = html.substring(0, startIndex) + newContent + html.substring(endIndex);

fs.writeFileSync('frontend-v2/plataforma/publicar/tasador.html', fixedHtml, 'utf8');
