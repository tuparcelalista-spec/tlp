(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const token = new URLSearchParams(location.search).get('t') || '';
  let current = null;
  const money = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const pct = (v) => Number.isFinite(Number(v)) ? `${Math.round(Number(v))}%` : '—';
  const date = (v) => v ? new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const text = (v, fallback = 'Sin información') => String(v || fallback);

  function showError(message) { $('#loading').hidden = true; $('#error').hidden = false; $('#errorText').textContent = message || 'El enlace es inválido, fue revocado o ya venció.'; }
  function eventLabel(evento = '') {
    const labels = {
      'ecosistema.propiedad_integrada': 'Propiedad conectada al ecosistema TPL',
      'propiedad.publicada': 'Propiedad publicada',
      'tasacion.creada': 'Nueva tasación generada',
      'tasacion.recalculada': 'Tasación actualizada',
      'precio.cambiado': 'Precio actualizado',
      'propiedad.actualizada': 'Información actualizada',
      'landing.activada': 'Landing activada',
      'servicio.solicitado': 'Servicio solicitado'
    };
    return labels[evento] || evento.replace(/[._]/g, ' ').replace(/^./, (x) => x.toUpperCase());
  }
  function empty(container, message) { container.innerHTML = ''; const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = message; container.appendChild(p); }

  function renderTasks(items = []) {
    const box = $('#tasksList'); box.innerHTML = '';
    if (!items.length) return empty(box, 'No tienes acciones pendientes. Tu ficha está al día.');
    items.slice(0, 6).forEach((item) => {
      const row = document.createElement('article'); row.className = `stack-item priority-${item.prioridad || 'media'}`;
      const title = document.createElement('strong'); title.textContent = item.titulo || 'Acción pendiente';
      const detail = document.createElement('span'); detail.textContent = item.detalle || (item.vence_at ? `Resolver antes del ${date(item.vence_at)}` : 'Revisa esta recomendación.');
      row.append(title, detail); box.appendChild(row);
    });
  }
  function renderTimeline(items = []) {
    const box = $('#timeline'); box.innerHTML = '';
    if (!items.length) return empty(box, 'El historial comenzará cuando tu propiedad registre nuevas acciones.');
    items.slice(0, 12).forEach((item) => {
      const row = document.createElement('article'); row.className = 'timeline-item';
      const dot = document.createElement('span'); dot.className = 'timeline-dot';
      const content = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = eventLabel(item.evento);
      const detail = document.createElement('p'); detail.textContent = item.descripcion || text(item.categoria, 'Actividad registrada en TPL');
      const when = document.createElement('time'); when.textContent = date(item.created_at);
      content.append(title, detail, when); row.append(dot, content); box.appendChild(row);
    });
  }
  function renderNeeds(items = []) {
    const box = $('#needsList'); box.innerHTML = '';
    if (!items.length) return empty(box, 'No detectamos servicios indispensables pendientes.');
    items.slice(0, 6).forEach((item) => {
      const row = document.createElement('article'); row.className = `stack-item priority-${item.prioridad || 'media'}`;
      const title = document.createElement('strong'); title.textContent = item.servicio || 'Servicio recomendado';
      const detail = document.createElement('span'); detail.textContent = item.detalle || 'Puede complementar o mejorar el proyecto de esta propiedad.';
      row.append(title, detail); box.appendChild(row);
    });
  }

  function fill(data) {
    const p = data.propiedad || {}; const t = data.tasacion || {}; const s = data.scores || {};
    current = p; $('#loading').hidden = true; $('#app').hidden = false;
    $('#title').textContent = p.titulo || 'Tu propiedad';
    $('#location').textContent = [p.sector, p.comuna, p.region].filter(Boolean).join(' · ');
    $('#price').textContent = money(p.precio_publicado); $('#updated').textContent = `Actualizada ${date(p.updated_at)}`;
    $('#publicLink').href = `parcela.html?id=${encodeURIComponent(p.codigo || p.id)}`;
    $('#propertyStatus').textContent = text(p.estado, 'En gestión').replace(/_/g, ' ');
    $('#planStatus').textContent = `Plan ${text(p.plan_codigo, 'gratis')}`;
    $('#informationScore').textContent = pct(s.nivel_informacion ?? p.completitud_pct);
    $('#listingScore').textContent = pct(s.calidad_anuncio ?? p.salud_anuncio_pct);
    $('#confidenceScore').textContent = pct(s.confianza_tasacion);
    $('#pendingCount').textContent = String(data.resumen?.pendientes || 0);

    const total = Number(t.valor_tpl_total || t.resultado?.valor_tpl_total || 0);
    const m2 = Number(t.valor_tpl_m2 || t.resultado?.valor_tpl_m2 || 0);
    if (total) {
      $('#tplValue').textContent = money(total); $('#tplM2').textContent = m2 ? `${money(m2)} por m²` : '';
      $('#valuationText').textContent = t.clasificacion ? `Diagnóstico actual: ${t.clasificacion}.` : 'Esta referencia usa la información más reciente disponible.';
      const diff = Number(t.diferencia_publicado_vs_tpl_pct || 0);
      $('#valuationGap').textContent = Math.abs(diff) < 5 ? 'Tu precio publicado está cercano a la referencia TPL.' : diff > 0 ? `Tu precio está aproximadamente ${Math.abs(Math.round(diff))}% sobre la referencia TPL.` : `Tu precio está aproximadamente ${Math.abs(Math.round(diff))}% bajo la referencia TPL.`;
    } else $('#valuationGap').textContent = 'Completa ubicación, superficie y servicios para aumentar la precisión del diagnóstico.';

    renderTasks(data.tareas); renderTimeline(data.timeline); renderNeeds(data.necesidades);
    [...$('#ownerForm').elements].forEach((el) => { if (el.name && p[el.name] != null && el.type !== 'file') el.value = p[el.name]; });
    const c = p.metadata?.propietario_contacto || {};
    ['nombre', 'email', 'whatsapp', 'tipo'].forEach((k) => { const el = $(`[name="contacto_${k}"]`); if (el && c[k]) el.value = c[k]; });
  }

  async function load() { if (!token) return showError(); try { const data = await TPLDataService.getOwnerProperty(token); if (!data?.ok) return showError(data?.error); fill(data); } catch (e) { console.error(e); showError(e.message); } }
  $('#scrollUpdate')?.addEventListener('click', () => $('#update').scrollIntoView({ behavior: 'smooth' }));
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-plan]'); if (!b) return; const msg = `Hola, quiero posicionar mi propiedad ${current?.codigo || ''} con una inversión inicial de $${Number(b.dataset.plan).toLocaleString('es-CL')}.`; location.href = `https://wa.me/56988508361?text=${encodeURIComponent(msg)}`; });
  $('#ownerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.currentTarget; const status = $('#formStatus'); status.textContent = 'Guardando…';
    const fd = new FormData(f); const photos = [...f.fotos.files].map((x) => ({ name: x.name, type: x.type, size: x.size, status: 'pendiente_revision' }));
    const payload = {}; ['titulo', 'descripcion', 'precio_publicado', 'superficie_m2', 'agua', 'electricidad', 'acceso', 'topografia', 'rol_situacion', 'cierre_perimetral', 'porton'].forEach((k) => payload[k] = fd.get(k));
    payload.contacto = { nombre: fd.get('contacto_nombre'), email: fd.get('contacto_email'), whatsapp: fd.get('contacto_whatsapp'), tipo: fd.get('contacto_tipo') }; payload.fotos = photos;
    try { const result = await TPLDataService.updateOwnerProperty(token, payload); status.textContent = result.fotos_pendientes_revision ? 'Datos actualizados. Fotografías pendientes de revisión.' : 'Datos actualizados correctamente.'; setTimeout(load, 700); }
    catch (err) { console.error(err); status.textContent = err.message || 'No fue posible guardar.'; }
  });
  load();
})();
