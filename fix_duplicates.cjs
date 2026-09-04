const fs = require('fs');
let html = fs.readFileSync('frontend-v2/parcela.html', 'utf8');

// 1. Remove the top block Tasación TPL
html = html.replace(/<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: none;">\s*<span style="display:block; font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Tasaci[^<]+<\/span>\s*<span id="v3-val-tasacion" [^>]*>-<\/span>\s*<\/div>/g, '');

// 2. Remove the Valor Real (Tasador) line from sidebar
html = html.replace(/<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">\s*<span style="font-size: 0.95rem; color: #0f172a; font-weight: 700;">Valor Real \(Tasador\):<\/span>\s*<strong id="v3-eval-tpl" [^>]*>--<\/strong>\s*<\/div>/g, '');

fs.writeFileSync('frontend-v2/parcela.html', html);

// NOW FIX parcela.js
let js = fs.readFileSync('frontend-v2/js/parcela.js', 'utf8');

// Remove the line that hides v3-price-evaluation
js = js.replace(/if\s*\(document\.getElementById\('v3-price-evaluation'\)\)\s*\{\s*document\.getElementById\('v3-price-evaluation'\)\.style\.display\s*=\s*'none';\s*\}/g, '// Sidebar evaluate is no longer hidden (so we can see the breakdown)');

fs.writeFileSync('frontend-v2/js/parcela.js', js);
console.log('Fixed parcela.html and parcela.js');
