// Red Partner TPL - postulación pública segura
const SUPABASE_URL = 'https://hwyscirbycojwndyzozn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k';
const BUCKET = 'partner-postulaciones-v2';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY = 5;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const form = document.getElementById('partner-form');
const PLAN_PRICES = { partner: 0, ideal: 29990, empresa: 69990, premium: 120000 };

function addRepeatableRow(containerId, placeholder, value = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'repeatable-row';
  row.innerHTML = `<span class="row-number"></span><input type="text" maxlength="140" placeholder="${placeholder}"><button type="button" aria-label="Eliminar">×</button>`;
  row.querySelector('input').value = value;
  row.querySelector('button').addEventListener('click', () => { row.remove(); renumber(container); });
  container.appendChild(row);
  renumber(container);
}
function renumber(container) { [...container.querySelectorAll('.row-number')].forEach((node, i) => node.textContent = i + 1); }
function repeatableValues(id) { return [...document.querySelectorAll(`#${id} input`)].map(input => input.value.trim()).filter(Boolean); }
function addStructuredStage(value = {}) {
  const container = document.getElementById('last-job-stages-list');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'repeatable-row structured';
  row.innerHTML = `<span class="row-number"></span><input data-field="etapa" type="text" maxlength="140" placeholder="Etapa: visita, cotización, ejecución…"><input data-field="duracion" type="text" maxlength="60" placeholder="Duración"><input data-field="evidencia" type="text" maxlength="180" placeholder="Qué se entregó o verificó"><button type="button" aria-label="Eliminar">×</button>`;
  for (const input of row.querySelectorAll('input')) input.value = value[input.dataset.field] || '';
  row.querySelector('button').addEventListener('click', () => { row.remove(); renumber(container); updateProfileScore(); });
  container.appendChild(row); renumber(container);
}
function structuredStageValues() {
  return [...document.querySelectorAll('#last-job-stages-list .repeatable-row')].map(row => ({
    etapa: row.querySelector('[data-field="etapa"]')?.value.trim() || '',
    duracion: row.querySelector('[data-field="duracion"]')?.value.trim() || '',
    evidencia: row.querySelector('[data-field="evidencia"]')?.value.trim() || ''
  })).filter(item => item.etapa);
}
function countWords(value) { return String(value || '').trim().split(/\s+/).filter(Boolean).length; }
function paymentValues() { return [...document.querySelectorAll('#payment-options input:checked')].map(input => input.value); }
document.getElementById('add-activity')?.addEventListener('click', () => addRepeatableRow('activities-list','Ej: Construcción de radier'));
document.getElementById('add-service-stage')?.addEventListener('click', () => addRepeatableRow('service-stages-list','Ej: Visita y evaluación inicial'));
addRepeatableRow('activities-list','Ej: Construcción de radier');
addRepeatableRow('service-stages-list','Ej: Visita y evaluación inicial');
addRepeatableRow('service-stages-list','Ej: Presupuesto y planificación');
addRepeatableRow('service-stages-list','Ej: Ejecución y entrega final');
document.getElementById('add-last-job-stage')?.addEventListener('click', () => addStructuredStage());
addStructuredStage({ etapa: 'Reunión o visita con el cliente', duracion: '1 día', evidencia: 'Necesidades y alcance confirmados' });
addStructuredStage({ etapa: 'Cotización y planificación', duracion: '1 a 3 días', evidencia: 'Propuesta económica entregada' });
addStructuredStage({ etapa: 'Ejecución del trabajo', duracion: '', evidencia: 'Avances registrados' });
addStructuredStage({ etapa: 'Entrega y conformidad', duracion: '1 día', evidencia: 'Trabajo revisado con el cliente' });

const proposalInput = document.getElementById('propuesta_corta');
proposalInput?.addEventListener('input', () => {
  const words = String(proposalInput.value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 5) proposalInput.value = words.slice(0, 5).join(' ');
  document.getElementById('propuesta-word-count').textContent = String(Math.min(words.length, 5));
  updateProfileScore();
});

const submitButton = document.getElementById('btn-submit');
const statusBox = document.getElementById('form-status');

function setStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.className = `form-status is-${type}`;
}

function splitValues(value) {
  return [...new Set(String(value || '').split(',').map(v => v.trim()).filter(Boolean))].slice(0, 20);
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').slice(0, 16);
}

function safeExtension(file) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  return map[file.type] || '';
}

function validateFile(file, label) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${label}: formato no permitido.`);
  if (file.size > MAX_FILE_SIZE) throw new Error(`${label}: supera el máximo de 5 MB.`);
}

function validateFormFiles() {
  const logo = document.getElementById('logo_file').files[0];
  const gallery = [...document.getElementById('gallery_files').files];
  if (!logo) throw new Error('Debes seleccionar un logo o fotografía principal.');
  validateFile(logo, 'Logo');
  if (gallery.length > MAX_GALLERY) throw new Error(`Puedes subir como máximo ${MAX_GALLERY} imágenes de trabajos.`);
  gallery.forEach((file, index) => validateFile(file, `Imagen ${index + 1}`));
  return { logo, gallery };
}

async function callRpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const raw = data?.message || data?.error || text || 'No fue posible completar la solicitud.';
    const messages = {
      POSTULACION_RECIENTE_EXISTENTE: 'Ya existe una postulación reciente con este correo. TPL la revisará antes de recibir una nueva.',
      CONSENTIMIENTOS_REQUERIDOS: 'Debes aceptar los consentimientos obligatorios.',
      DESCRIPCION_MUY_CORTA: 'Describe tus servicios con al menos 40 caracteres.',
      CORREO_INVALIDO: 'Revisa el correo electrónico.',
      WHATSAPP_INVALIDO: 'Revisa el número de WhatsApp.'
    };
    const friendly = Object.entries(messages).find(([key]) => raw.includes(key))?.[1] || 'No fue posible enviar la postulación. Revisa los datos e inténtalo nuevamente.';
    throw new Error(friendly);
  }
  return data;
}

async function uploadFile(file, applicationId, uploadToken, filename) {
  const objectPath = `${applicationId}/${uploadToken}/${filename}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'false'
    },
    body: file
  });
  if (!response.ok) throw new Error('La postulación fue creada, pero falló la carga de una imagen. Conserva el código y contacta a soporte.');
  return objectPath;
}

function updateProfileScore() {
  const checks = [
    ['nombre_comercial', 6], ['nombre_responsable', 4], ['correo', 4], ['whatsapp', 4],
    ['descripcion_servicios', 10], ['propuesta_corta', 8], ['diferenciacion', 10],
    ['tipo_servicio', 5], ['especialidades', 6], ['region', 4], ['comunas_atendidas', 5],
    ['anos_experiencia', 4], ['ultimo_trabajo_nombre', 5], ['ultimo_trabajo_resultado', 5],
    ['condiciones_pago', 4], ['garantia_servicio', 3]
  ];
  let score = 0;
  for (const [id, points] of checks) {
    const node = document.getElementById(id);
    const value = node?.type === 'checkbox' ? node.checked : String(node?.value || '').trim();
    if (value) score += points;
  }
  if (repeatableValues('activities-list').length >= 2) score += 5;
  if (repeatableValues('service-stages-list').length >= 3) score += 5;
  if (structuredStageValues().length >= 4) score += 7;
  if (paymentValues().length) score += 3;
  if (document.getElementById('logo_file')?.files?.length) score += 4;
  if (document.getElementById('gallery_files')?.files?.length >= 3) score += 4;
  score = Math.min(100, score);
  const bar = document.getElementById('profile-score-bar');
  const label = document.getElementById('profile-score-label');
  if (bar) bar.style.width = `${score}%`;
  if (label) label.textContent = `${score}%`;
  return score;
}
for (const node of document.querySelectorAll('#partner-form input, #partner-form select, #partner-form textarea')) {
  node.addEventListener('input', updateProfileScore);
  node.addEventListener('change', updateProfileScore);
}
updateProfileScore();

function buildPayload() {
  return {
    nombre_comercial: document.getElementById('nombre_comercial').value.trim(),
    nombre_responsable: document.getElementById('nombre_responsable').value.trim(),
    telefono: normalizePhone(document.getElementById('telefono').value),
    whatsapp: normalizePhone(document.getElementById('whatsapp').value),
    correo: document.getElementById('correo').value.trim().toLowerCase(),
    descripcion_servicios: document.getElementById('descripcion_servicios').value.trim(),
    propuesta_corta: document.getElementById('propuesta_corta').value.trim(),
    diferenciacion: document.getElementById('diferenciacion').value.trim(),
    puntaje_completitud_inicial: updateProfileScore(),
    tipo_servicio: document.getElementById('tipo_servicio').value,
    especialidades: splitValues(document.getElementById('especialidades').value),
    region: document.getElementById('region').value,
    comunas_atendidas: splitValues(document.getElementById('comunas_atendidas').value),
    anos_experiencia: Number(document.getElementById('anos_experiencia').value || 0),
    disponibilidad: document.getElementById('disponibilidad').value,
    emite_factura: document.getElementById('emite_factura').checked,
    acepta_proyectos_tpl: document.getElementById('acepta_proyectos_tpl').checked,
    trabaja_bajo_marca_tpl: document.getElementById('trabaja_bajo_marca_tpl').checked,
    plan_solicitado: document.getElementById('plan_solicitado')?.value || 'bienvenida',
    acepta_terminos: document.getElementById('acepta_terminos').checked,
    acepta_privacidad: document.getElementById('acepta_privacidad').checked,
    autoriza_contacto: document.getElementById('autoriza_contacto').checked,
    actividades: repeatableValues('activities-list'),
    etapas_servicio: repeatableValues('service-stages-list'),
    modalidades_pago: paymentValues(),
    porcentaje_anticipo: Number(document.getElementById('porcentaje_anticipo')?.value || 0),
    garantia_servicio: document.getElementById('garantia_servicio')?.value.trim() || 'No informada',
    condiciones_pago: document.getElementById('condiciones_pago')?.value.trim() || '',
    ultimo_trabajo: {
      nombre: document.getElementById('ultimo_trabajo_nombre')?.value.trim() || '',
      ubicacion: document.getElementById('ultimo_trabajo_ubicacion')?.value.trim() || '',
      duracion: document.getElementById('ultimo_trabajo_duracion')?.value.trim() || '',
      resultado: document.getElementById('ultimo_trabajo_resultado')?.value.trim() || '',
      etapas: structuredStageValues()
    }
  };
}

for (const card of document.querySelectorAll('.plan-card')) {
  card.addEventListener('click', () => {
    document.querySelectorAll('.plan-card').forEach(item => item.classList.remove('active'));
    card.classList.add('active');
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    document.querySelectorAll('.plan-card').forEach(item => item.classList.toggle('is-paying', Number(PLAN_PRICES[item.querySelector('input')?.value] || 0) > 0 && item.classList.contains('active')));
  });
}

async function startFlowPayment() { return false; }

form?.addEventListener('submit', async event => {
  event.preventDefault();
  statusBox.className = 'form-status';
  if (!form.reportValidity()) return;

  submitButton.disabled = true;
  submitButton.textContent = 'Creando postulación segura…';

  try {
    const { logo, gallery } = validateFormFiles();
    const payload = buildPayload();
    if (!payload.actividades.length) throw new Error('Agrega al menos una actividad que puedas realizar.');
    if (!payload.etapas_servicio.length) throw new Error('Agrega al menos una etapa de tu servicio.');
    if (!payload.modalidades_pago.length) throw new Error('Selecciona al menos una modalidad de pago.');
    if (countWords(payload.propuesta_corta) > 5) throw new Error('Resume lo que ofreces en máximo 5 palabras.');
    if (payload.ultimo_trabajo.etapas.length < 3) throw new Error('Explica al menos 3 etapas de tu último trabajo.');
    const result = await callRpc('tpl_postular_partner_v2', { p_payload: payload });
    const applicationId = result.id;
    const uploadToken = result.upload_token;

    setStatus(`Postulación ${result.codigo} creada. Subiendo imágenes…`, 'info');
    const logoPath = await uploadFile(logo, applicationId, uploadToken, `logo.${safeExtension(logo)}`);
    const galleryPaths = [];
    for (let index = 0; index < gallery.length; index += 1) {
      galleryPaths.push(await uploadFile(gallery[index], applicationId, uploadToken, `galeria-${index + 1}.${safeExtension(gallery[index])}`));
    }

    await callRpc('tpl_confirmar_archivos_partner_v2', {
      p_id: applicationId,
      p_token: uploadToken,
      p_logo_path: logoPath,
      p_galeria_paths: galleryPaths
    });

    if (await startFlowPayment(result, payload)) return;

    form.style.display = 'none';
    const success = document.getElementById('success-msg');
    success.innerHTML = `<strong>Postulación recibida correctamente</strong>Tu código de seguimiento es <b>${result.codigo}</b>. Revisaremos tus antecedentes. Recibirás un correo cuando la revisión cambie de estado. Si tu perfil es aprobado, podrás ingresar a TPL Business, completar tu perfil y activar herramientas de TPL Studio.`;
    success.style.display = 'block';
    window.scrollTo({ top: document.getElementById('postulacion').offsetTop - 30, behavior: 'smooth' });
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Ocurrió un error inesperado.', 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar Postulación';
  }
});
