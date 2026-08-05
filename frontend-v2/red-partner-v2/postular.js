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
  const number = document.createElement('span');
  number.className = 'row-number';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 140;
  input.placeholder = placeholder;
  input.value = value;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.setAttribute('aria-label', 'Eliminar');
  remove.textContent = '×';
  remove.addEventListener('click', () => { row.remove(); renumber(container); updateProfileScore(); });
  row.append(number, input, remove);
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
  const number = document.createElement('span');
  number.className = 'row-number';
  const fields = [
    ['etapa', 140, 'Etapa: visita, cotización, ejecución…'],
    ['duracion', 60, 'Duración'],
    ['evidencia', 180, 'Qué se entregó o verificó']
  ];
  row.appendChild(number);
  for (const [field, maxLength, placeholder] of fields) {
    const input = document.createElement('input');
    input.dataset.field = field;
    input.type = 'text';
    input.maxLength = maxLength;
    input.placeholder = placeholder;
    input.value = value[field] || '';
    row.appendChild(input);
  }
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.setAttribute('aria-label', 'Eliminar');
  remove.textContent = '×';
  remove.addEventListener('click', () => { row.remove(); renumber(container); updateProfileScore(); });
  row.appendChild(remove);
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
const saveDraftButton = document.getElementById('btn-save-draft');
const saveBasicButton = document.getElementById('btn-save-basic');
if (saveBasicButton) saveBasicButton.addEventListener('click', () => saveDraftButton?.click());

let draftToken = new URLSearchParams(location.search).get('continuar') || localStorage.getItem('tpl_partner_draft_token') || '';
let suggestedCases = [];

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
  if (logo) validateFile(logo, 'Logo');
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
      WHATSAPP_INVALIDO: 'Revisa el número de WhatsApp.',
      LIMITE_INTENTOS_PARTNER: 'Se alcanzó el límite de intentos para este correo. Inténtalo nuevamente mañana o contacta a TPL.'
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
    caso_practico: {
      codigo: document.getElementById('caso_escenario')?.value || '',
      titulo: document.getElementById('caso_escenario')?.selectedOptions?.[0]?.textContent || '',
      escenario: document.getElementById('caso_escenario')?.selectedOptions?.[0]?.dataset?.scenario || '',
      respuesta: document.getElementById('caso_respuesta')?.value.trim() || ''
    },
    ultimo_trabajo: {
      nombre: document.getElementById('ultimo_trabajo_nombre')?.value.trim() || '',
      ubicacion: document.getElementById('ultimo_trabajo_ubicacion')?.value.trim() || '',
      duracion: document.getElementById('ultimo_trabajo_duracion')?.value.trim() || '',
      resultado: document.getElementById('ultimo_trabajo_resultado')?.value.trim() || '',
      etapas: structuredStageValues()
    }
  };
}


function pendingFields(payload) {
  const required = [
    ['nombre_comercial','Nombre de empresa'],['nombre_responsable','Responsable'],['correo','Correo'],
    ['whatsapp','WhatsApp'],['descripcion_servicios','Descripción'],['tipo_servicio','Tipo de servicio'],
    ['region','Región'],['comunas_atendidas','Cobertura'],['diferenciacion','Diferenciación']
  ];
  return required.filter(([key]) => {
    const value = payload[key];
    return Array.isArray(value) ? !value.length : !String(value || '').trim();
  }).map(([,label]) => label);
}

function replaceRepeatableRows(containerId, values, placeholder) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  const list = Array.isArray(values) && values.length ? values : [''];
  for (const value of list) addRepeatableRow(containerId, placeholder, value);
}

function replaceStructuredStages(values) {
  const container = document.getElementById('last-job-stages-list');
  if (!container) return;
  container.replaceChildren();
  const list = Array.isArray(values) && values.length ? values : [{}];
  for (const value of list) addStructuredStage(value);
}

function fillSimplePayload(payload = {}) {
  const map = ['nombre_comercial','nombre_responsable','telefono','whatsapp','correo','descripcion_servicios','propuesta_corta','diferenciacion','tipo_servicio','region','anos_experiencia','disponibilidad','porcentaje_anticipo','garantia_servicio','condiciones_pago'];
  for (const id of map) {
    const node = document.getElementById(id);
    if (node && payload[id] !== undefined && payload[id] !== null) node.value = payload[id];
  }
  if (Array.isArray(payload.especialidades)) document.getElementById('especialidades').value = payload.especialidades.join(', ');
  if (Array.isArray(payload.comunas_atendidas)) document.getElementById('comunas_atendidas').value = payload.comunas_atendidas.join(', ');
  for (const id of ['emite_factura','acepta_proyectos_tpl','trabaja_bajo_marca_tpl','acepta_terminos','acepta_privacidad','autoriza_contacto']) {
    const node = document.getElementById(id);
    if (node && payload[id] !== undefined) node.checked = Boolean(payload[id]);
  }
  replaceRepeatableRows('activities-list', payload.actividades, 'Ej: Construcción de radier');
  replaceRepeatableRows('service-stages-list', payload.etapas_servicio, 'Ej: Visita y evaluación inicial');
  replaceStructuredStages(payload.ultimo_trabajo?.etapas);
  for (const input of document.querySelectorAll('#payment-options input')) {
    input.checked = Array.isArray(payload.modalidades_pago) && payload.modalidades_pago.includes(input.value);
  }
  const plan = document.getElementById('plan_solicitado');
  if (plan && payload.plan_solicitado) plan.value = payload.plan_solicitado;
  const nestedMap = {
    ultimo_trabajo_nombre: payload.ultimo_trabajo?.nombre,
    ultimo_trabajo_ubicacion: payload.ultimo_trabajo?.ubicacion,
    ultimo_trabajo_duracion: payload.ultimo_trabajo?.duracion,
    ultimo_trabajo_resultado: payload.ultimo_trabajo?.resultado,
    caso_respuesta: payload.caso_practico?.respuesta
  };
  for (const [id, value] of Object.entries(nestedMap)) {
    const node = document.getElementById(id);
    if (node && value !== undefined && value !== null) node.value = value;
  }
  updateProfileScore();
}

async function loadSuggestedCases() {
  const type = document.getElementById('tipo_servicio')?.value || '';
  const select = document.getElementById('caso_escenario');
  if (!select) return;
  if (!type) { select.innerHTML='<option value="">Selecciona primero tu tipo de servicio…</option>'; return; }
  try {
    suggestedCases = await callRpc('tpl_casos_sugeridos_servicio_v1',{p_tipo_servicio:type});
    select.replaceChildren();
    const initial = document.createElement('option');
    initial.value = '';
    initial.textContent = 'Selecciona un caso…';
    select.appendChild(initial);
    for (const item of Array.isArray(suggestedCases) ? suggestedCases : []) {
      const option = document.createElement('option');
      option.value = String(item.codigo || '');
      option.textContent = String(item.titulo || 'Caso práctico');
      option.dataset.scenario = String(item.escenario || '');
      select.appendChild(option);
    }
  } catch (error) { console.warn('No fue posible cargar casos sugeridos', error); }
}
document.getElementById('tipo_servicio')?.addEventListener('change', loadSuggestedCases);
document.getElementById('caso_escenario')?.addEventListener('change', event => {
  const scenario=event.target.selectedOptions[0]?.dataset?.scenario || '';
  const help=document.getElementById('draft-help'); if(help && scenario) help.textContent=scenario;
});

async function saveDraft() {
  const email = document.getElementById('correo')?.value.trim();
  if (!email) { setStatus('Ingresa tu correo para guardar el avance.', 'error'); return; }
  saveDraftButton.disabled = true;
  saveDraftButton.textContent = 'Guardando…';
  try {
    const payload = buildPayload();
    const result = await callRpc('tpl_guardar_borrador_partner_v1', {
      p_token: draftToken || null,
      p_payload: payload,
      p_paso: 1,
      p_campos_pendientes: pendingFields(payload)
    });
    draftToken = result.token;
    localStorage.setItem('tpl_partner_draft_token', draftToken);
    const resumeUrl = `${location.origin}${location.pathname}?continuar=${encodeURIComponent(draftToken)}`;
    await navigator.clipboard?.writeText(resumeUrl).catch(()=>{});
    await callRpc('tpl_encolar_continuacion_partner_v1',{p_token:draftToken,p_base_url:`${location.origin}${location.pathname}`}).catch(()=>{});
    setStatus(`Avance guardado (${result.porcentaje}%). Copiamos el enlace para continuar después.`, 'success');
  } catch (error) { setStatus(error.message || 'No fue posible guardar el avance.', 'error'); }
  finally { saveDraftButton.disabled=false; saveDraftButton.textContent='Guardar y continuar después'; }
}
saveDraftButton?.addEventListener('click', saveDraft);

async function restoreDraft() {
  if (!draftToken) return;
  try {
    const result = await callRpc('tpl_cargar_borrador_partner_v1',{p_token:draftToken});
    if (!result?.ok) return;
    fillSimplePayload(result.payload || {});
    await loadSuggestedCases();
    if (result.payload?.caso_practico?.codigo) {
      const caseSelect = document.getElementById('caso_escenario');
      caseSelect.value = result.payload.caso_practico.codigo;
      const scenario = caseSelect.selectedOptions[0]?.dataset?.scenario || result.payload.caso_practico.escenario || '';
      const help = document.getElementById('draft-help');
      if (help && scenario) help.textContent = scenario;
    }
    const pending = Array.isArray(result.campos_pendientes) && result.campos_pendientes.length
      ? ` Te faltan: ${result.campos_pendientes.join(', ')}.` : '';
    setStatus(`Recuperamos tu borrador (${result.porcentaje || 0}% completado).${pending} Por seguridad, vuelve a seleccionar fotografías o documentos.`, 'success');
  } catch (error) { console.warn('Borrador no recuperado', error); }
}
restoreDraft();

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
    if (countWords(payload.propuesta_corta) > 5) throw new Error('Resume lo que ofreces en máximo 5 palabras.');
    await callRpc('tpl_validar_envio_partner_publico_v2', { p_correo: payload.correo });
    const result = await callRpc('tpl_postular_partner_v2', { p_payload: payload });
    localStorage.setItem('tpl_partner_pending_submission', JSON.stringify({
      id: result.id, codigo: result.codigo, upload_token: result.upload_token, created_at: new Date().toISOString()
    }));
    const applicationId = result.id;
    const uploadToken = result.upload_token;
    if (payload.caso_practico.respuesta && payload.caso_practico.respuesta.length >= 80) {
      await callRpc('tpl_guardar_caso_postulacion_partner_v1',{p_postulacion_id:applicationId,p_upload_token:uploadToken,p_caso:payload.caso_practico});
    }

    setStatus(`Postulación ${result.codigo} creada. Procesando archivos…`, 'info');
    const logoPath = logo ? await uploadFile(logo, applicationId, uploadToken, `logo.${safeExtension(logo)}`) : null;
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

    localStorage.removeItem('tpl_partner_pending_submission');
    if (draftToken) { await callRpc('tpl_marcar_borrador_partner_enviado_v1',{p_token:draftToken,p_postulacion_id:applicationId}).catch(()=>{}); localStorage.removeItem('tpl_partner_draft_token'); }
    if (await startFlowPayment(result, payload)) return;

    form.style.display = 'none';
    const success = document.getElementById('success-msg');
    success.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = 'Postulación recibida correctamente';
    const message = document.createElement('p');
    message.append('Tu código de seguimiento es ');
    const code = document.createElement('b');
    code.textContent = result.codigo;
    message.append(code, '. Revisaremos tus antecedentes. Recibirás un correo cuando la revisión cambie de estado. Si tu perfil es aprobado, podrás ingresar a TPL Business y completar tu perfil.');
    success.append(title, message);
    success.style.display = 'block';
    window.scrollTo({ top: document.getElementById('postulacion').offsetTop - 30, behavior: 'smooth' });
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Ocurrió un error inesperado.', 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar Postulación';
  }
});
