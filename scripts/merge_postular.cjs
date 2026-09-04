const fs = require('fs');

let indexHtml = fs.readFileSync('frontend-v2/red-partner-v2/index.html', 'utf8');
let postularHtml = fs.readFileSync('frontend-v2/red-partner-v2/postular.html', 'utf8');

// Extract the form from postular.html
let formStartIdx = postularHtml.indexOf('<div class="section-container" id="postulacion">');
let scriptEndIdx = postularHtml.indexOf('</script>', postularHtml.indexOf('postular.js')) + 9;
let formHtml = postularHtml.substring(formStartIdx, scriptEndIdx);

// We want to optimize formHtml!
// 1. Remove "Diferenciación" section
let diffStart = formHtml.indexOf('<div class="input-group">\n<label for="diferenciacion">');
if(diffStart !== -1) {
  let diffEnd = formHtml.indexOf('</div>', diffStart) + 6;
  formHtml = formHtml.substring(0, diffStart) + formHtml.substring(diffEnd);
}

// 2. Remove "Último trabajo, explicado por etapas"
let ultimoTrabajoStart = formHtml.indexOf('<div class="partner-detail-block full-width">\n<h3>Tu último trabajo, explicado por etapas</h3>');
if(ultimoTrabajoStart !== -1) {
  let ultimoTrabajoEnd = formHtml.indexOf('</div>', formHtml.indexOf('add-last-job-stage')) + 6;
  formHtml = formHtml.substring(0, ultimoTrabajoStart) + formHtml.substring(ultimoTrabajoEnd);
}

// 3. Remove "Condiciones de pago" text area but KEEP checkboxes
let condTextAreaStart = formHtml.indexOf('<div class="input-group full-width"><label for="condiciones_pago">');
if(condTextAreaStart !== -1) {
  let condTextAreaEnd = formHtml.indexOf('</div>', condTextAreaStart) + 6;
  formHtml = formHtml.substring(0, condTextAreaStart) + formHtml.substring(condTextAreaEnd);
}

// 4. Remove "Caso Práctico"
let casoStart = formHtml.indexOf('<section class="partner-case-section" aria-labelledby="case-title">');
if(casoStart !== -1) {
  let casoEnd = formHtml.indexOf('</section>', casoStart) + 10;
  formHtml = formHtml.substring(0, casoStart) + formHtml.substring(casoEnd);
}

// 5. Add Progress Bar UI right before <form id="partner-form">
let progressBarHtml = `
<div class="progress-bar-container" style="margin-bottom:30px; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
  <div id="partner-progress-fill" style="width: 0%; height:100%; background:var(--primary); transition: width 0.3s ease;"></div>
</div>
<div style="text-align:right; font-size:0.9rem; font-weight:700; color:var(--primary); margin-top:-25px; margin-bottom:20px;" id="partner-progress-text">0% Completado</div>
`;

formHtml = formHtml.replace('<form id="partner-form">', progressBarHtml + '<form id="partner-form">');

// Now inject formHtml into index.html right before the footer
let footerStartIdx = indexHtml.indexOf('<section aria-labelledby="tpl-partners-title"');
let finalIndexHtml = indexHtml.substring(0, footerStartIdx) + '\n' + formHtml + '\n' + indexHtml.substring(footerStartIdx);

// Remove the href="postular.html" and change it back to href="#postulacion"
finalIndexHtml = finalIndexHtml.replace(/href="postular.html"/g, 'href="#postulacion"');

fs.writeFileSync('frontend-v2/red-partner-v2/index.html', finalIndexHtml, 'utf8');
fs.unlinkSync('frontend-v2/red-partner-v2/postular.html');

console.log("Successfully rebuilt index.html and removed postular.html");
