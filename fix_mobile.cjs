const fs = require('fs');

const cssPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/css/parcela.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

if (!cssContent.includes('.v3-price { font-size: 2rem; }')) {
    cssContent = cssContent.replace(
        '@media (max-width: 900px) {',
        `@media (max-width: 900px) {
  .v3-price {
    font-size: 1.8rem;
    line-height: 1.2;
    word-break: break-word;
  }
  .v3-crm-map-wrap {
    height: 60vh !important;
    min-height: 350px;
    max-height: 450px;
    pointer-events: auto;
  }
  /* Fix overlapping in valuation section */
  #v3-valuation-section > div {
    display: flex !important;
    flex-direction: column !important;
  }
  .commune-stats-grid .stat-val {
    font-size: 1.5rem !important;
    word-break: break-word;
  }
`
    );
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log('parcela.css media queries updated');
}

// In parcela.html, disable map zoom on mobile to avoid scrolling issues
const htmlPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/parcela.js';
let jsContent = fs.readFileSync(htmlPath, 'utf8');
if (jsContent.includes('const map = L.map')) {
    jsContent = jsContent.replace(
        "const map = L.map('v3-crm-map', { zoomControl: false }).setView([lat, lng], 9);",
        "const map = L.map('v3-crm-map', { zoomControl: false, dragging: !L.Browser.mobile, tap: !L.Browser.mobile, scrollWheelZoom: false }).setView([lat, lng], 9);"
    );
    fs.writeFileSync(htmlPath, jsContent, 'utf8');
    console.log('parcela.js map configuration updated');
}
