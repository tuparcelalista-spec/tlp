const fs = require('fs');

let html = fs.readFileSync('frontend-v2/parcela.html', 'utf8');

// Replace the large dossier block with a compact button
const oldDossierBlock = /<!-- Dossier Premium CTA -->[\s\S]*?<\/section>/;

const newDossierButton = `
<!-- Botón Compacto Dossier -->
<div style="margin: 24px 0;">
  <button onclick="window.open('https://wa.me/56988508361?text=' + encodeURIComponent('Hola, me gustaría solicitar el Dossier de Inversión de la propiedad que estoy viendo.'), '_blank')" 
    style="background: #f8fafc; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px 20px; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; gap: 8px;">
    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
    Solicitar Dossier TPL
  </button>
</div>
`;

html = html.replace(oldDossierBlock, newDossierButton);

// Remove the modal and script (just in case they are still there)
const modalRegex = /<!-- Dossier Modal -->[\s\S]*?<\/script>\s*(?=<\/body>)/;
html = html.replace(modalRegex, '');

fs.writeFileSync('frontend-v2/parcela.html', html);
console.log('Dossier updated successfully!');
