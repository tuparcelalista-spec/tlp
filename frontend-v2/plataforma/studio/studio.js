(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const service = window.TPLStudioService;
  const state = { current: null, campaigns: [], outputs: [], context: null };
  const params = new URLSearchParams(location.search);
  const initialType = params.get('tipo') || params.get('entity_type') || '';
  const initialId = params.get('id') || params.get('entity_id') || '';

  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const uid = () => `TPL-STUDIO-${Date.now().toString(36).toUpperCase()}`;
  function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }

  function sourceFromForm() {
    return {
      title: $('project-name').value.trim(),
      commune: $('commune').value.trim(),
      price: $('price').value.trim(),
      landSize: $('land-size').value.trim(),
      houseSize: $('house-size').value.trim(),
      value: $('value-proposition').value.trim(),
      features: $('features').value.trim(),
      images: $('images').value.split(/\n+/).map((x) => x.trim()).filter(Boolean),
      videoUrl: $('video-url').value.trim(),
      landingUrl: $('landing-url').value.trim()
    };
  }

  function collect() {
    const sourceData = sourceFromForm();
    const formats = [...document.querySelectorAll('#formats input:checked')].map((x) => x.value);
    const channels = [...document.querySelectorAll('#channels input:checked')].map((x) => x.value);
    const c = {
      id: uid(),
      createdAt: new Date().toISOString(),
      name: sourceData.title,
      subjectType: $('project-type').value,
      subjectId: $('subject-id').value.trim() || null,
      goal: $('campaign-goal').value,
      tone: $('tone').value,
      audience: $('audience').value,
      cta: $('cta').value.trim(),
      sourceData,
      formats,
      channels,
      metadata: { origin: 'tpl_studio_v2', contextLoaded: Boolean(state.context) }
    };
    c.strategy = buildStrategy(c);
    c.storyboard = buildStoryboard(c);
    c.outputs = createOutputs(c);
    return c;
  }

  function buildStrategy(c) {
    const s = c.sourceData;
    const strengths = [s.commune, s.landSize, s.houseSize, s.features].filter(Boolean);
    const focusByGoal = {
      captar_compradores: 'Presentar beneficios concretos, ubicación, precio y una acción inmediata.',
      captar_propietarios: 'Demostrar capacidad de marketing, análisis y seguimiento comercial de TPL.',
      generar_visitas: 'Reducir dudas y llevar al usuario a solicitar una visita.',
      generar_reservas: 'Elevar confianza, explicar el proyecto completo y conducir a reserva.',
      posicionar_marca: 'Construir autoridad, consistencia visual y recordación de marca.',
      captar_clientes_partner: 'Explicar problema, solución, cobertura, evidencia y solicitud de cotización.'
    };
    return {
      headline: s.value || `Una oportunidad destacada${s.commune ? ` en ${s.commune}` : ''}`,
      commercialFocus: focusByGoal[c.goal] || focusByGoal.captar_compradores,
      keyStrengths: strengths,
      recommendation: c.formats.includes('video_30')
        ? 'Abrir con la principal virtud visual y cerrar con una sola acción comercial.'
        : 'Mantener una propuesta clara, verificable y centrada en el beneficio principal.'
    };
  }

  function buildStoryboard(c) {
    const s = c.sourceData;
    const location = s.commune ? ` en ${s.commune}` : '';
    const scenes = [
      { title: 'Apertura de alto impacto', seconds: '0–4 s', visual: `La mejor imagen real disponible${location}, movimiento suave y titular corto.`, purpose: 'Detener el scroll sin exagerar atributos.' },
      { title: 'Propuesta principal', seconds: '4–9 s', visual: `${c.name}. Mostrar ${s.price || 'valor a consultar'} y el beneficio central: ${s.value || 'espacio, ubicación y proyección'}.`, purpose: 'Explicar rápidamente qué se promociona.' },
      { title: 'Datos que generan confianza', seconds: '9–15 s', visual: `Superficie ${s.landSize || 'informada'}, ${s.houseSize || 'solución disponible'} y ubicación.`, purpose: 'Transformar el interés en comprensión.' },
      { title: 'Virtudes y contexto', seconds: '15–21 s', visual: `Destacar: ${s.features || 'conectividad, servicios y posibilidades del proyecto'}.`, purpose: 'Justificar la propuesta con datos reales.' },
      { title: 'Resultado o vida futura', seconds: '21–26 s', visual: c.subjectType === 'partner' ? 'Mostrar proceso, terminación y evidencia del servicio.' : 'Mostrar cómo podría disfrutarse o desarrollarse el proyecto sin representar obras inexistentes como reales.', purpose: 'Ayudar a imaginar el beneficio final.' },
      { title: 'Cierre comercial', seconds: '26–30 s', visual: `Marca TPL, nombre del proyecto y llamado: ${c.cta}.`, purpose: 'Generar una acción medible.' }
    ];
    const narration = `${c.name}${location}. ${s.value || 'Una propuesta pensada para avanzar con mayor claridad'}. ${s.features ? `${s.features}. ` : ''}${s.price ? `Valor informado: ${s.price}. ` : ''}${c.cta}.`;
    return { scenes, narration };
  }

  function createOutputs(c) {
    const labels = {
      landing: 'Landing premium', video_30: 'Video 30 segundos', reel: 'Reel / Short', facebook: 'Publicación Facebook', instagram: 'Publicación Instagram', youtube: 'Publicación YouTube', pdf: 'Ficha PDF', seo: 'Artículo SEO / Blog', whatsapp: 'Mensaje WhatsApp'
    };
    return c.formats.map((type) => ({ id: uid(), type, label: labels[type] || type, channel: c.channels.includes(type) ? type : null, content: { cta: c.cta, storyboard: type.includes('video') || type === 'reel' ? c.storyboard : null }, metadata: { projectName: c.name } }));
  }

  function applyContext(context) {
    if (!context) return;
    state.context = context;
    const prop = context.propiedad || context.publicacion?.datos || {};
    const project = context.proyecto || (context.proyectos || [])[0] || {};
    const actor = context.actor || context.publicador || context.comprador || {};
    const data = Object.keys(prop).length ? prop : (Object.keys(project).length ? project : actor);
    const images = (context.imagenes || data.imagenes || []).map((x) => typeof x === 'string' ? x : (x.url || x.public_url || x.archivo_url)).filter(Boolean);
    const house = project.casa_configuracion || prop.casa_datos || {};
    $('subject-id').value = data.id || initialId || '';
    $('project-type').value = context.tipo || initialType || data.tipo || 'propiedad';
    $('project-name').value = prop.titulo || project.nombre || actor.nombre || data.nombre || data.title || '';
    $('commune').value = prop.comuna || actor.comuna || data.commune || '';
    $('price').value = prop.precio_publicado || project.valor_estimado || data.price || '';
    $('land-size').value = prop.superficie_m2 || data.landSize || '';
    $('house-size').value = house.superficie_m2 || house.m2 || project.casa_m2 || '';
    $('value-proposition').value = prop.descripcion || project.configuracion?.propuesta_valor || data.description || '';
    const features = [prop.rol_situacion, prop.agua, prop.electricidad, prop.acceso, prop.vista_principal, ...(Array.isArray(prop.atributos_naturales) ? prop.atributos_naturales : [])].filter(Boolean);
    $('features').value = features.join(', ');
    $('images').value = images.join('\n');
    $('video-url').value = prop.metadata?.video_url || project.metadata?.video_url || '';
    $('landing-url').value = prop.metadata?.landing_url || project.metadata?.landing_url || '';
    $('context-status').innerHTML = `<strong>Datos recuperados desde TPL</strong><span>${esc($('project-name').value || initialId)}</span>`;
    $('context-status').classList.add('ready');
    const mode = params.get('modo');
    if (mode === 'landing') document.querySelector('#formats input[value="landing"]')?.click();
    if (mode === 'campana') $('campaign-goal').value = 'captar_compradores';
  }

  function renderStoryboard(c) {
    if (!c) { $('storyboard-empty').hidden = false; $('storyboard-list').innerHTML = ''; $('narration-box').hidden = true; return; }
    $('storyboard-empty').hidden = true;
    $('storyboard-summary').textContent = `${c.storyboard.scenes.length} escenas · ${c.formats.length} recursos · ${c.name}`;
    $('storyboard-list').innerHTML = c.storyboard.scenes.map((s, i) => `<article class="scene"><div class="scene-number">${i + 1}</div><div><h3>${esc(s.title)}</h3><p><strong>Visual:</strong> ${esc(s.visual)}<br><strong>Objetivo:</strong> ${esc(s.purpose)}</p></div><span class="scene-time">${esc(s.seconds)}</span></article>`).join('');
    $('narration-text').textContent = c.storyboard.narration;
    $('strategy-box').innerHTML = `<h3>${esc(c.strategy.headline)}</h3><p>${esc(c.strategy.commercialFocus)}</p><small>${esc(c.strategy.recommendation)}</small>`;
    $('narration-box').hidden = false;
  }

  function renderQueue() {
    $('queue-total').textContent = state.outputs.length;
    $('queue-ready').textContent = state.outputs.filter((x) => (x.estado || x.status) === 'preparado').length;
    $('queue-pending').textContent = state.outputs.filter((x) => !['publicado', 'completado'].includes(x.estado || x.status)).length;
    $('queue-list').innerHTML = state.outputs.length ? state.outputs.map((x) => `<article class="queue-item"><div><h3>${esc(x.label || x.tipo)}</h3><p>${esc(x.studio_campaigns?.nombre || x.metadata?.projectName || x.projectName || 'Campaña TPL')} · ${new Date(x.created_at || x.createdAt || Date.now()).toLocaleString('es-CL')}</p></div><span class="badge">${esc(x.estado || x.status || 'preparado')}</span></article>`).join('') : '<div class="empty-state"><h3>La cola está vacía</h3><p>Prepara una campaña para crear los primeros recursos.</p></div>';
  }

  function renderLibrary() {
    $('asset-count').textContent = state.outputs.length;
    $('library-list').innerHTML = state.campaigns.length ? state.campaigns.map((c) => `<article class="library-card"><span class="eyebrow">${esc(c.tipo_objetivo || c.subjectType || 'campaña')}</span><h3>${esc(c.nombre || c.name)}</h3><p>${esc(c.datos_fuente?.commune || c.sourceData?.commune || 'Sin comuna')} · ${new Date(c.created_at || c.createdAt).toLocaleDateString('es-CL')}</p><button class="btn-secondary open-campaign" data-id="${esc(c.id)}">Abrir campaña</button></article>`).join('') : '<div class="empty-state"><h3>Sin campañas guardadas</h3><p>La primera campaña aparecerá aquí.</p></div>';
    document.querySelectorAll('.open-campaign').forEach((btn) => btn.addEventListener('click', () => {
      const raw = state.campaigns.find((c) => String(c.id) === btn.dataset.id);
      if (!raw) return;
      state.current = raw.storyboard ? { ...raw, name: raw.nombre || raw.name, formats: (raw.studio_outputs || []).map((x) => x.tipo), strategy: raw.estrategia || {}, storyboard: raw.storyboard } : raw;
      renderStoryboard(state.current);
      switchView('storyboard');
    }));
  }

  async function renderAnalytics() {
    const a = await service.getAnalytics();
    $('analytics-campaigns').textContent = a.campaigns || 0;
    $('analytics-assets').textContent = a.outputs || 0;
    $('analytics-visits').textContent = a.visits || 0;
    $('analytics-leads').textContent = a.leads || 0;
    $('analytics-conversions').textContent = a.conversions || 0;
    $('analytics-published').textContent = a.published || 0;
  }

  function switchView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    $('view-title').textContent = ({ crear: 'Crear campaña', storyboard: 'Estrategia y storyboard', cola: 'Producción', biblioteca: 'Biblioteca', analitica: 'Resultados' })[name];
    if (name === 'cola') renderQueue();
    if (name === 'biblioteca') renderLibrary();
    if (name === 'analitica') renderAnalytics();
  }

  async function refresh() {
    [state.campaigns, state.outputs] = await Promise.all([service.listCampaigns(), service.listOutputs()]);
    renderQueue(); renderLibrary(); renderAnalytics();
  }

  $('campaign-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const campaign = collect();
    if (!campaign.name || !campaign.formats.length) return toast('Completa el nombre y selecciona al menos un recurso');
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const saved = await service.saveCampaign(campaign);
      state.current = { ...campaign, id: saved.id || campaign.id };
      await refresh();
      renderStoryboard(state.current);
      switchView('storyboard');
      toast('Campaña creada y guardada');
    } catch (error) {
      console.error(error);
      toast('No pudimos guardar la campaña');
    } finally { if (button) button.disabled = false; }
  });

  $('load-context').addEventListener('click', async () => {
    const type = $('project-type').value;
    const id = $('subject-id').value.trim();
    if (!id) return toast('Ingresa el ID del registro que quieres recuperar');
    $('context-status').textContent = 'Recuperando información…';
    try { applyContext(await service.getContext(type, id)); if (!state.context) toast('No encontramos datos para ese registro'); }
    catch (error) { console.error(error); $('context-status').textContent = 'No fue posible recuperar los datos'; }
  });
  $('copy-script').addEventListener('click', async () => { if (!state.current) return toast('Primero prepara una campaña'); await navigator.clipboard.writeText(state.current.storyboard.narration); toast('Narración copiada'); });
  $('export-json').addEventListener('click', () => { if (!state.current) return toast('Primero prepara una campaña'); const blob = new Blob([JSON.stringify(state.current, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${state.current.id}.json`; a.click(); URL.revokeObjectURL(a.href); });
  document.querySelectorAll('.nav-item').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));

  (async () => {
    if (initialType) $('project-type').value = initialType;
    if (initialId) $('subject-id').value = initialId;
    if (initialType && initialId) {
      try { applyContext(await service.getContext(initialType, initialId)); } catch (error) { console.warn('TPL Studio: contexto inicial no disponible.', error); }
    }
    await refresh();
    renderStoryboard(null);
    lucide.createIcons();
  })();
})();
