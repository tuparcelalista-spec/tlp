const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const css = [
':root{--blue:#003f7a;--blue-2:#005aa0;--yellow:#f4c542;--ink:#1a202c;--muted:#64748b;--line:#dde3ea;--soft:#f4f7fa;}',
'*,*::before,*::after{box-sizing:border-box;}html{scroll-behavior:smooth;}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:#fff;}button,select{font:inherit;cursor:pointer;}a{color:inherit;}img{display:block;max-width:100%;}',
'.tpl-header{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:24px;padding:8px 32px;background:rgba(255,255,255,.97);border-bottom:1px solid var(--line);backdrop-filter:blur(16px);min-height:76px;}',
'.tpl-brand img{height:60px;width:auto;}.tpl-brand{margin-right:auto;}',
'.tpl-nav{display:flex;align-items:center;gap:20px;}.tpl-nav a{text-decoration:none;font-weight:700;color:#26415d;}.tpl-nav a:hover{color:var(--blue);}',
'.tpl-publish{padding:10px 18px;border-radius:999px;background:var(--yellow);color:#19324a!important;font-weight:800;}',
'.tpl-mobile-actions,.tpl-mobile-menu{display:none;}',
'.tpl-hero{position:relative;min-height:520px;display:flex;align-items:center;overflow:hidden;background:#0c2233;}',
'.tpl-hero__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55;z-index:0;}',
'.tpl-hero__shade{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(5,20,38,.88) 0%,rgba(5,20,38,.6) 45%,rgba(5,20,38,.15) 100%);}',
'.tpl-hero__inner{position:relative;z-index:2;width:min(1240px,100%);margin:0 auto;padding:72px 32px 64px;display:grid;grid-template-columns:1fr 420px;gap:56px;align-items:center;}',
'.tpl-hero__eyebrow{display:inline-flex;align-items:center;gap:10px;color:rgba(255,255,255,.75);font-size:.72rem;font-weight:800;letter-spacing:.18em;margin-bottom:18px;}',
'.tpl-hero__eyebrow::before{content:"";width:28px;height:1px;background:#d2aa55;}',
'.tpl-hero h1{margin:0 0 18px;font-size:clamp(2.8rem,5vw,5rem);line-height:.96;letter-spacing:-.045em;color:#fff;font-weight:500;font-family:Georgia,serif;}',
'.tpl-hero h1 em{font-style:normal;color:#ffe28a;}',
'.tpl-hero__sub{margin:0;color:rgba(255,255,255,.85);font-size:1.05rem;line-height:1.65;}',
'.tpl-search-widget{background:#fff;border-radius:16px;padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,.22);}',
'.tpl-search-widget h3{margin:0 0 16px;font-size:1rem;color:var(--blue);font-weight:800;}',
'.search-methods{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
'.search-method{padding:14px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--soft);text-align:left;font-weight:600;}',
'.search-method strong{display:block;font-size:.95rem;}.search-method.is-active{border-color:var(--blue);background:#eef6ff;}',
'.method-panel{margin-top:14px;}.method-panel p{margin:0 0 12px;color:var(--muted);font-size:.9rem;}',
'.method-panel select{width:100%;padding:10px 13px;border:1.5px solid var(--line);border-radius:10px;background:#fff;font-size:.95rem;margin-bottom:12px;}',
'.primary-button{width:100%;padding:13px;border:0;border-radius:10px;background:var(--blue);color:#fff;font-weight:800;font-size:.95rem;}.primary-button:hover{background:var(--blue-2);}',
'.status-text{display:block;min-height:18px;margin-top:8px;color:var(--muted);font-size:.85rem;}',
'.results-section{max-width:1280px;margin:0 auto;padding:36px 28px 80px;}',
'.results-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:8px;}',
'.results-toolbar h2{margin:4px 0;font-size:clamp(1.6rem,3.5vw,2.6rem);letter-spacing:-.035em;}.results-toolbar p{margin:0;color:var(--muted);font-size:.9rem;}',
'.context-label{display:block;color:var(--blue);font-size:.72rem;font-weight:900;letter-spacing:.14em;}',
'.map-button{min-width:100px;padding:11px 18px;border:1.5px solid var(--blue);border-radius:999px;background:#fff;color:var(--blue);font-weight:800;}.map-button:disabled{opacity:.4;cursor:not-allowed;}',
'.priority-bar{display:flex;gap:8px;margin:18px 0 24px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:thin;}',
'.priority-bar button{flex:0 0 auto;padding:9px 14px;border:1.5px solid var(--line);border-radius:999px;background:#fff;color:#4a5568;font-weight:700;font-size:.85rem;white-space:nowrap;}',
'.priority-bar button.is-active{background:var(--blue);border-color:var(--blue);color:#fff;}',
'.priority-opportunity{border-color:#c9a227!important;color:#715a00!important;background:#fffdf3!important;}',
'.parcel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;}',
'.parcel-card{background:#fff;border:1px solid var(--line);border-radius:0;overflow:hidden;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.04);transition:transform .2s,box-shadow .2s;}',
'.parcel-card:hover{transform:translateY(-4px);box-shadow:0 14px 32px rgba(0,0,0,.10);}.parcel-card.is-opportunity{border-color:#c9a14b;}',
'.parcel-image{position:relative;aspect-ratio:4/3;overflow:hidden;background:#e8eef5;}.parcel-image img{width:100%;height:100%;object-fit:cover;}',
'.parcel-price{position:absolute;bottom:10px;left:10px;padding:5px 12px;border-radius:4px;background:rgba(255,255,255,.96);color:#1a365d;font-weight:900;font-size:.95rem;box-shadow:0 3px 10px rgba(0,0,0,.14);}',
'.parcel-distance{position:absolute;top:10px;left:10px;padding:5px 10px;border-radius:4px;background:rgba(0,63,122,.90);color:#fff;font-size:.78rem;font-weight:800;}',
'.parcel-opportunity{position:absolute;top:10px;right:10px;padding:5px 10px;border-radius:4px;background:#c9a14b;color:#fff;font-size:.75rem;font-weight:800;}',
'.parcel-body{padding:14px 16px 18px;}.parcel-body h3{margin:0 0 10px;font-size:1rem;font-weight:900;color:#1a202c;line-height:1.3;}',
'.parcel-facts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;}.parcel-facts span{padding:7px 9px;font-size:.8rem;background:var(--soft);}',
'.parcel-facts span:nth-child(1){color:#2d3748;font-weight:750;}.parcel-facts span:nth-child(2){color:#4a5568;font-weight:600;}.parcel-facts span:nth-child(3){color:#718096;font-weight:500;}.parcel-facts span:nth-child(4){color:#a0aec0;font-weight:400;}',
'.parcel-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;}.parcel-tags span{padding:4px 9px;border-radius:999px;background:#f0fff4;color:#276749;font-size:.73rem;font-weight:800;}',
'.parcel-value-note{display:block;font-size:.78rem;color:#2b6cb0;font-weight:700;margin-top:4px;}',
'.map-panel{margin-bottom:24px;border:1px solid var(--line);overflow:hidden;background:#fff;}.map-panel-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line);}.map-panel-head button{border:0;background:none;color:var(--blue);font-weight:800;cursor:pointer;}.map-canvas{height:460px;}',
'.empty-state{grid-column:1/-1;padding:52px 24px;text-align:center;border:1px dashed var(--line);background:var(--soft);color:var(--muted);}',
'.load-more{display:block;margin:28px auto 0;padding:12px 28px;border:1.5px solid var(--blue);border-radius:999px;background:#fff;color:var(--blue);font-weight:800;}',
'.commune-ribbon{padding:28px 32px;background:var(--soft);border-top:1px solid var(--line);}.commune-ribbon__shell{max-width:1280px;margin:0 auto;display:flex;gap:32px;align-items:flex-start;}.commune-ribbon__intro span{font-size:.7rem;font-weight:900;letter-spacing:.14em;color:var(--muted);}.commune-ribbon__intro strong{display:block;margin-top:4px;font-size:1rem;color:var(--blue);}.commune-ribbon__groups{display:flex;flex-wrap:wrap;gap:20px;flex:1;}.commune-region strong{display:block;font-size:.78rem;color:var(--muted);margin-bottom:6px;}.commune-chip{padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--blue);font-size:.82rem;font-weight:700;margin:0 4px 4px 0;}.commune-chip:hover{background:var(--blue);color:#fff;}',
'.tpl-valuation-banner{max-width:1280px;margin:0 auto 24px;padding:20px 32px;display:flex;align-items:center;justify-content:space-between;gap:20px;background:#eef4ff;border:1px solid #c3d5f0;}.tpl-valuation-banner__copy span{font-size:.72rem;font-weight:900;letter-spacing:.1em;color:var(--blue);}.tpl-valuation-banner__copy strong{display:block;margin:4px 0 2px;font-size:1rem;color:#1a202c;}.tpl-valuation-banner__copy p{margin:0;color:var(--muted);font-size:.88rem;}.tpl-valuation-banner a{white-space:nowrap;padding:11px 18px;background:var(--blue);color:#fff;text-decoration:none;font-weight:800;font-size:.9rem;}',
'.tpl-footer{display:grid;place-items:center;gap:12px;padding:40px 24px;background:#f2f6fa;border-top:1px solid var(--line);text-align:center;}.tpl-footer img{height:50px;width:auto;}.tpl-footer p{margin:0;color:var(--muted);font-size:.9rem;}.tpl-footer nav{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;}.tpl-footer a{text-decoration:none;color:var(--blue);font-weight:700;}.tpl-internal-access{margin-top:4px;padding:6px 12px;border:1px solid transparent;border-radius:999px;color:#6f7f8d;font-size:.72rem;font-weight:700;opacity:.7;}.tpl-internal-access:hover{opacity:1;color:var(--blue);border-color:rgba(0,63,122,.22);background:#fff;}',
'@media(max-width:980px){.tpl-hero__inner{grid-template-columns:1fr;gap:32px;padding:48px 20px 40px;}.tpl-search-widget{max-width:500px;}.parcel-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.tpl-header{padding:8px 16px;}}',
'@media(max-width:640px){.tpl-hero{min-height:580px;}.tpl-hero__inner{padding:120px 18px 32px;}.tpl-hero h1{font-size:2.6rem;}.parcel-grid{grid-template-columns:1fr;}.results-section{padding:24px 14px 60px;}.tpl-mobile-actions{display:flex;margin-left:auto;gap:8px;}.tpl-mobile-actions>a{padding:8px 10px;font-size:.8rem;font-weight:800;text-decoration:none;}.tpl-nav{display:none;}.tpl-valuation-banner{flex-direction:column;}.commune-ribbon__shell{flex-direction:column;}}'
].join('\n');

fs.writeFileSync(path.join(root, 'frontend-v2/css/index-v3.css'), css, 'utf8');
console.log('CSS OK:', fs.statSync(path.join(root, 'frontend-v2/css/index-v3.css')).size, 'bytes');

const html = `<!doctype html>
<html lang="es-CL">
<head>
  <title>Tu Parcela Lista | Innovaci&oacute;n y Tecnolog&iacute;a en Bienes Ra&iacute;ces Rurales</title>
  <meta name="description" content="Descubre parcelas y campos en Chile con tecnolog&iacute;a de punta. TPL aporta conocimiento e innovaci&oacute;n a la venta de terrenos para tu proyecto de vida rural.">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#003f7a">
  <link rel="canonical" href="https://www.parcelalista.cl/">
  <link rel="icon" type="image/png" href="/image/favicon.png">
  <link rel="apple-touch-icon" href="/image/favicon-512.png">
  <link rel="preload" href="./assets/logo-tu-parcela-lista.png" as="image">
  <link rel="stylesheet" href="./css/index-v3.css">
</head>
<body>

<header class="tpl-header">
  <a class="tpl-brand" href="./index-v3.html" aria-label="Tu Parcela Lista, inicio">
    <img src="./assets/brand/tpl-mark.svg" width="130" height="56" alt="Tu Parcela Lista">
  </a>
  <nav class="tpl-nav" aria-label="Navegaci&oacute;n principal">
    <a href="#buscador">Buscar parcelas</a>
    <a href="./como-comprar.html">C&oacute;mo comprar</a>
    <a href="./red-partner-v2/index.html">Red Partner</a>
    <a href="./plataforma/tpl-business/index.html">TPL Business</a>
    <a class="tpl-publish" href="./plataforma/publicar/index.html">Publicar</a>
  </nav>
  <div class="tpl-mobile-actions">
    <a href="#resultados">Parcelas</a>
    <a class="tpl-publish" href="./plataforma/publicar/index.html">Publicar</a>
  </div>
</header>

<main>
  <!-- HERO + BUSCADOR -->
  <section class="tpl-hero" aria-label="Busca tu parcela ideal">
    <img class="tpl-hero__bg" src="./assets/hero-familia-casa-campo-premium.webp" alt="Familia en el campo" fetchpriority="high" decoding="async">
    <div class="tpl-hero__shade"></div>
    <div class="tpl-hero__inner">
      <div class="tpl-hero__text">
        <span class="tpl-hero__eyebrow">TU NUEVA ETAPA COMIENZA AQU&Iacute;</span>
        <h1>Vive el campo.<br><em>Construye tu vida.</em></h1>
        <p class="tpl-hero__sub">Encuentra parcelas para crear una vida con m&aacute;s espacio, naturaleza y libertad. Define la ubicaci&oacute;n y proyecta tu inversi&oacute;n.</p>
      </div>

      <div class="tpl-search-widget">
        <div id="buscador">
          <h3>1. &iquest;D&oacute;nde buscas tu parcela?</h3>
          <div class="search-methods" role="group">
            <button id="nearby-method" class="search-method is-active" type="button" data-method="nearby">
              <strong>Cerca de ti</strong>
            </button>
            <button id="commune-method" class="search-method" type="button" data-method="commune">
              <strong>Por Comuna</strong>
            </button>
          </div>

          <div id="nearby-panel" class="method-panel">
            <button id="locate-button" class="primary-button" type="button">Mostrar parcelas cercanas</button>
            <small id="location-status" class="status-text" aria-live="polite"></small>
          </div>

          <div id="commune-panel" class="method-panel" hidden>
            <select id="commune-select" aria-label="Seleccionar comuna">
              <option value="">Selecciona una comuna</option>
            </select>
            <button id="commune-search-button" class="primary-button" type="button">Ver parcelas disponibles</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- RESULTADOS -->
  <section id="resultados" class="results-section" aria-labelledby="results-title">
    <div class="results-toolbar" id="scroll-anchor">
      <div>
        <span id="search-context" class="context-label">OPORTUNIDADES DISPONIBLES</span>
        <h2 id="results-title">Parcelas disponibles</h2>
        <p id="results-count">Mostrando primero las parcelas m&aacute;s econ&oacute;micas.</p>
      </div>
      <button id="map-button" class="map-button" type="button" disabled>Mapa</button>
    </div>

    <div id="priority-bar" class="priority-bar" aria-label="Prioridad de resultados">
      <button type="button" data-priority="distance">M&aacute;s cercanas</button>
      <button type="button" data-priority="payment">Facilidad de pago</button>
      <button type="button" data-priority="nature">M&aacute;s naturales</button>
      <button type="button" data-priority="services">Servicios cerca</button>
      <button type="button" data-priority="opportunity" class="priority-opportunity">Oportunidades</button>
      <button type="button" class="is-active" data-priority="economic">M&aacute;s econ&oacute;micas</button>
      <button type="button" data-priority="large">1 hect&aacute;rea o m&aacute;s</button>
    </div>

    <div id="map-panel" class="map-panel" hidden>
      <div class="map-panel-head">
        <strong>Ubicaci&oacute;n de las parcelas encontradas</strong>
        <button id="map-close" type="button">Cerrar</button>
      </div>
      <div id="map" class="map-canvas" aria-label="Mapa de parcelas"></div>
    </div>

    <div id="parcel-grid" class="parcel-grid" aria-live="polite"></div>
    <button id="load-more" class="load-more" type="button" hidden>Ver m&aacute;s parcelas</button>
  </section>
</main>

<!-- SECCIONES SECUNDARIAS -->
<section class="commune-ribbon" aria-label="Explorar parcelas por comuna">
  <div class="commune-ribbon__shell">
    <div class="commune-ribbon__intro">
      <span>EXPLORA POR ZONA</span>
      <strong>Comunas disponibles</strong>
    </div>
    <div id="commune-ribbon-groups" class="commune-ribbon__groups" aria-live="polite">
      <div class="commune-region" style="opacity:0.4;pointer-events:none;">
        <strong>Biob&iacute;o</strong>
        <button type="button" class="commune-chip">Cargando...</button>
        <button type="button" class="commune-chip">...</button>
      </div>
    </div>
  </div>
</section>

<div class="tpl-valuation-banner">
  <div class="tpl-valuation-banner__copy">
    <span>TASADOR TPL</span>
    <strong>&iquest;Quieres conocer un valor recomendado para tu propiedad?</strong>
    <p>Obt&eacute;n una referencia orientativa considerando ubicaci&oacute;n, superficie, servicios, atributos y mercado comunal.</p>
  </div>
  <a href="./plataforma/publicar/tasador.html">Tasar mi propiedad &rarr;</a>
</div>

<footer class="tpl-footer">
  <img src="./assets/logo-tu-parcela-lista.png" width="130" height="56" alt="Tu Parcela Lista">
  <p>Encuentra tu parcela. Despu&eacute;s construimos contigo el proyecto completo.</p>
  <nav aria-label="Enlaces legales">
    <a href="./terminos.html">T&eacute;rminos</a>
    <a href="./politica-privacidad.html">Privacidad</a>
    <a href="./red-partner-v2/index.html">Red Partner</a>
  </nav>
  <a class="tpl-internal-access" href="./plataforma/crm-tpl-v1/index.html" aria-label="Acceso protegido para asesores">Acceso asesores</a>
</footer>

<!-- SCRIPTS -->
<script defer src="./js/app.js?v=20260814"></script>
<script type="module" src="./js/core/auth.js"></script>
<script type="module" src="./js/core/analytics-tracker.js"></script>
<script src="./parcelas.js" defer></script>
<script src="./casas.js" defer></script>
<script src="./js/tpl-public-stats.js?v=20260730-stats-2" defer></script>
<script src="./plataforma/publicar/tpl-land-engine.js?v=20260731-tpl-v2" defer></script>
<script src="./js/tpl-market-intelligence.js?v=20260802-badges-v1" defer></script>
<script src="./js/core/tpl-data-service.js?v=20260803-catalogo-publico-v1" defer></script>
<script src="./js/index.js?v=20260803-catalogo-publico-v1" defer></script>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'frontend-v2/index-v3.html'), html, 'utf8');
console.log('HTML OK:', fs.statSync(path.join(root, 'frontend-v2/index-v3.html')).size, 'bytes');
