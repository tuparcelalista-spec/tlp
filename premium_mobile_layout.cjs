const fs = require('fs');

const cssPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/css/parcela.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

cssContent = cssContent.replace(
    '#v3-valuation-section > div {\n    display: flex !important;\n    flex-direction: column !important;\n  }',
    '#v3-valuation-section > div.grid-mobile-premium {\n    display: grid !important;\n    grid-template-columns: 1fr 1fr !important;\n    gap: 12px;\n  }'
);

cssContent = cssContent.replace(
    '@media (max-width: 900px) { .commune-stats-grid { grid-template-columns: 1fr; } }',
    '@media (max-width: 900px) { .commune-stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; } }'
);

fs.writeFileSync(cssPath, cssContent, 'utf8');

const htmlPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcela.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Add class to the valuation section grid so the CSS can target it
htmlContent = htmlContent.replace(
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">',
    '<div class="grid-mobile-premium" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">'
);

// Reduce padding in those boxes for mobile so side-by-side fits nicely
htmlContent = htmlContent.replace(
    '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">',
    '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">'
);
htmlContent = htmlContent.replace(
    '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display:flex; justify-content:space-between; align-items:center;">',
    '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; display:flex; justify-content:space-between; align-items:center; flex-direction:column; text-align:center; gap:8px;">'
);

// Remove the inline style in head that we just replaced
htmlContent = htmlContent.replace(
    '@media (max-width: 900px) { .commune-stats-grid { grid-template-columns: 1fr; } }',
    '@media (max-width: 900px) { .commune-stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; } }'
);

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Mobile layout updated to side-by-side premium design');
