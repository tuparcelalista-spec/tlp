const fs = require('fs');
let js = fs.readFileSync('frontend-v2/red-partner-v2/postular.js', 'utf8');

// 1. Update buildPayload safely
js = js.replace(/document\.getElementById\('diferenciacion'\)\.value/g, "document.getElementById('diferenciacion')?.value || ''");
js = js.replace(/document\.getElementById\('ultimo_trabajo_nombre'\)\.value/g, "document.getElementById('ultimo_trabajo_nombre')?.value || ''");
js = js.replace(/document\.getElementById\('ultimo_trabajo_resultado'\)\.value/g, "document.getElementById('ultimo_trabajo_resultado')?.value || ''");

// 2. Rewrite updateProfileScore function
let scoreStart = js.indexOf('function updateProfileScore() {');
let scoreEnd = js.indexOf('}', js.indexOf('return score;', scoreStart)) + 1;

let newScoreFunc = `function updateProfileScore() {
  const checks = [
    ['nombre_comercial', 8], ['nombre_responsable', 6], ['correo', 6], ['whatsapp', 6],
    ['descripcion_servicios', 14], ['propuesta_corta', 10],
    ['tipo_servicio', 7], ['especialidades', 6], ['region', 4], ['comunas_atendidas', 4],
    ['anos_experiencia', 4], ['garantia_servicio', 4]
  ];
  let score = 0;
  for (const [id, points] of checks) {
    const node = document.getElementById(id);
    const value = node?.type === 'checkbox' ? node.checked : String(node?.value || '').trim();
    if (value) score += points;
  }
  if (repeatableValues('activities-list').length >= 2) score += 5;
  if (repeatableValues('service-stages-list').length >= 3) score += 5;
  if (paymentValues().length) score += 3;
  if (document.getElementById('logo_file')?.files?.length) score += 4;
  if (document.getElementById('gallery_files')?.files?.length >= 3) score += 4;
  
  score = Math.min(100, score);
  
  const bar = document.getElementById('profile-score-bar');
  const label = document.getElementById('profile-score-label');
  if (bar) bar.style.width = \`\${score}%\`;
  if (label) label.textContent = \`\${score}%\`;
  
  // Update new dynamic progress bar on top of the form
  const progressFill = document.getElementById('partner-progress-fill');
  const progressText = document.getElementById('partner-progress-text');
  if (progressFill) progressFill.style.width = \`\${score}%\`;
  if (progressText) progressText.textContent = \`\${score}% Completado\`;
  
  return score;
}`;

js = js.substring(0, scoreStart) + newScoreFunc + js.substring(scoreEnd);

// Also remove the call to addStructuredStage logic because we deleted ultimo trabajo html
js = js.replace(/addStructuredStage\(\{ etapa: 'Reunión o visita con el cliente'[^\)]+\}\);/g, '');
js = js.replace(/addStructuredStage\(\{ etapa: 'Cotización y planificación'[^\)]+\}\);/g, '');
js = js.replace(/addStructuredStage\(\{ etapa: 'Ejecución del trabajo'[^\)]+\}\);/g, '');
js = js.replace(/addStructuredStage\(\{ etapa: 'Entrega y conformidad'[^\)]+\}\);/g, '');


fs.writeFileSync('frontend-v2/red-partner-v2/postular.js', js, 'utf8');
console.log('Successfully updated postular.js');
