const fs = require('fs');
const path = 'frontend-v2/plataforma/informe-valores/index.html';
let html = fs.readFileSync(path, 'utf8');

if (!html.includes('@supabase/supabase-js')) {
    html = html.replace('<script src="../../js/core/tpl-data-service.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n    <script src="../../js/core/tpl-data-service.js"></script>');
    fs.writeFileSync(path, html);
    console.log('Supabase script added');
} else {
    console.log('Supabase script already exists');
}

// Ensure error displays on screen in app.js
const appPath = 'frontend-v2/plataforma/informe-valores/app.js';
let appJs = fs.readFileSync(appPath, 'utf8');
appJs = appJs.replace('alert(error.message);', "document.getElementById('loading-overlay').innerHTML = '<div style=\"color:red; padding: 20px; background: white; border-radius: 8px;\"><h3>Error</h3><p>' + error.message + '</p></div>';");
fs.writeFileSync(appPath, appJs);
console.log('Error handling improved in app.js');
