(() => {
  'use strict';

  const state = {
    snapshot: null,
    current: 'inicio',
    loading: false,
    uf: null,
    command: null,
    universalQuery: ''
  };

  const groups = [
    ['Centro de Operaciones', [
      ['inicio', 'Resumen ejecutivo'],
      ['operaciones', 'Proyectos y operaciones'],
      ['revision', 'Bandeja de revisión'],
      ['tareas', 'Tareas y prioridades']
    ]],
    ['Personas', [
      ['compradores', 'Compradores'],
      ['duenos', 'Propietarios'],
      ['partners', 'Partners y empresas']
    ]],
    ['Catálogo', [
      ['parcelas', 'Parcelas'],
      ['parcelas-casas', 'Proyectos parcela + casa'],
      ['casas', 'Casas y modelos']
    ]],
    ['Información y documentos', [
      ['tasaciones', 'Tasaciones e informes'],
      ['studio', 'TPL Studio'],
      ['mensajes', 'Comunicaciones']
    ]],
    ['Inteligencia', [
      ['analytics', 'Analytics'],
      ['eventos', 'Actividad y trazabilidad']
    ]]
  ];

  const nav = document.querySelector('#nav');
  const content = document.querySelector('#content');
  const title = document.querySelector('#viewTitle');
  const topbar = document.querySelector('.topbar');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const fmtMoney = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n
      ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
      : '—';
  };

  const fmtDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? esc(value)
      : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  };

  const arr = (key) => Array.isArray(state.snapshot?.[key]) ? state.snapshot[key] : [];

  const publicAsset = (value) => {
    const path = String(value || '').trim();
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    return `../../${path.replace(/^\.\//, '').replace(/^\.\.\//, '')}`;
  };

  function previewImage(record, kind = 'parcela') {
    const raw = record?.imagen_principal || record?.imagen || record?.imagenes?.[0] || '';
    const src = publicAsset(raw);
    if (!src) return `<div class="catalog-preview-empty">${kind === 'casa' ? 'CASA' : 'PARCELA'}</div>`;
    return `<img src="${esc(src)}" alt="${esc(record?.nombre || record?.titulo || kind)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'catalog-preview-empty',textContent:'SIN FOTO'}))">`;
  }

  function pill(value) {
    const text = String(value || 'Sin definir');
    const cls =
      /publicada|activo|confirmado|complet|acept|bajo|oportun/i.test(text) ? 'ok' :
      /error|rechaz|urgente|venc|bloque|crit/i.test(text) ? 'danger' :
      /pendiente|revision|revisión|esperando|medio|cotizando|buscando/i.test(text) ? 'warn' : '';
    return `<span class="pill ${cls}">${esc(text)}</span>`;
  }

  function setNav() {
    if (!nav) return;
    nav.innerHTML = groups.map(([group, items]) => `
      <div class="nav-group">
        <div class="nav-label">${esc(group)}</div>
        ${items.map(([id, label]) =>
          `<button class="nav-btn" data-view="${esc(id)}">${esc(label)}</button>`
        ).join('')}
      </div>
    `).join('');
  }

  function statusBadge(text, kind = '') {
    let badge = document.querySelector('#tplCanonicalStatus');
    if (!badge && topbar) {
      badge = document.createElement('div');
      badge.id = 'tplCanonicalStatus';
      badge.className = 'canonical-status';
      topbar.appendChild(badge);
    }
    if (badge) {
      badge.className = `canonical-status ${kind}`.trim();
      badge.textContent = text;
    }
  }

  function renderLogin(message = '') {
    if (title) title.textContent = 'Acceso CRM';
    if (nav) nav.innerHTML = '';
    if (!content) return;

    content.innerHTML = `
      <div class="card" style="max-width:520px;margin:48px auto">
        <small>ACCESO INTERNO TPL</small>
        <h2>CRM Tu Parcela Lista</h2>
        <p class="muted">Ingresa con una cuenta autorizada en el nuevo Supabase.</p>
        ${message ? `<p class="pill danger" style="display:block;margin:12px 0">${esc(message)}</p>` : ''}
        <form id="crmLoginForm" class="list" autocomplete="on">
          <label>Correo<input id="crmLoginEmail" type="email" autocomplete="username" required></label>
          <label>Contraseña<input id="crmLoginPassword" type="password" autocomplete="current-password" required></label>
          <button class="primary" type="submit">Ingresar al CRM</button>
        </form>
      </div>
    `;

    document.querySelector('#crmLoginForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.querySelector('#crmLoginEmail')?.value || '';
      const password = document.querySelector('#crmLoginPassword')?.value || '';
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      button.textContent = 'Ingresando…';

      try {
        await window.TPLDataService.signIn(email, password);
        await loadSnapshot();
      } catch (error) {
        console.error('CRM login:', error);
        renderLogin(error?.message || 'No se pudo iniciar sesión.');
      }
    });
  }

  function renderLoading() {
    if (title) title.textContent = 'Cargando CRM';
    if (content) content.innerHTML = `
      <div class="card">
        <h3>Sincronizando cerebro TPL…</h3>
        <p class="muted">Leyendo operaciones, propiedades, tareas y alertas desde Supabase.</p>
      </div>`;
  }

  function renderError(error) {
    const msg = error?.message || 'No fue posible cargar el CRM.';
    if (/JWT|session|not authorized|no autorizado|42501|permission|Acceso CRM/i.test(msg)) {
      renderLogin('La cuenta inició sesión, pero todavía no está autorizada como personal TPL.');
      return;
    }
    if (content) content.innerHTML = `
      <div class="card">
        <h3>No pudimos sincronizar el CRM</h3>
        <p class="muted">${esc(msg)}</p>
        <button class="primary" data-action="refresh">Reintentar</button>
      </div>`;
  }

  function metric(label, value, note = '') {
    return `<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
  }

  function allSearchRecords() {
    const definitions = [
      ['parcelas', 'Parcela'], ['casas', 'Casa'], ['compradores', 'Comprador'],
      ['duenos', 'Propietario'], ['partners', 'Partner'], ['operaciones', 'Proyecto'],
      ['tasaciones', 'Tasación'], ['eventos', 'Actividad']
    ];
    return definitions.flatMap(([key, type]) => arr(key).map((record) => ({
      key, type, record,
      id: record.id || record.propiedad_id || record.actor_id || record.codigo,
      label: record.titulo || record.nombre || record.nombre_comercial || record.nombre_completo || record.codigo || record.evento || type,
      detail: record.comuna || record.correo || record.estado || record.clasificacion || record.descripcion || '',
      haystack: JSON.stringify(record).toLowerCase()
    })));
  }

  function universalSearchView(query) {
    const q = String(query || '').trim().toLowerCase();
    const results = q ? allSearchRecords().filter((item) => item.haystack.includes(q)).slice(0, 80) : [];
    return `<section class="command-search-results">
      <div class="section-title"><div><small>BUSCADOR UNIVERSAL</small><h3>Resultados para “${esc(query)}”</h3></div><span class="pill">${results.length} resultados</span></div>
      <div class="search-result-grid">
        ${results.map((item) => `<button class="search-result-card" data-detail-key="${esc(item.key)}" data-detail-id="${esc(item.id)}">
          <span>${esc(item.type)}</span><strong>${esc(item.label)}</strong><small>${esc(item.detail || 'Abrir registro')}</small>
        </button>`).join('') || '<div class="card empty">No encontramos coincidencias en el CRM.</div>'}
      </div>
    </section>`;
  }

  function commandWelcome() {
    const c = state.command || {};
    const staff = c.staff || {};
    const p = c.prioridades || {};
    return `<section class="command-welcome">
      <div><small>CENTRO DE OPERACIONES TPL</small><h2>Hola, ${esc(staff.nombre || 'equipo TPL')}</h2><p>Estas son las acciones que requieren atención ahora.</p></div>
      <div class="command-role"><span>${esc(staff.rol || 'staff')}</span><small>${esc(staff.email || '')}</small></div>
      <div class="command-priorities">
        <button data-view="revision"><b>${Number(p.publicaciones_revision || 0)}</b><span>Publicaciones por revisar</span></button>
        <button data-view="tareas"><b>${Number(p.tareas_vencidas || 0)}</b><span>Tareas vencidas</span></button>
        <button data-view="partners"><b>${Number(p.partners_pendientes || 0)}</b><span>Partners pendientes</span></button>
        <button data-view="tasaciones"><b>${Number(p.informes_pendientes || 0)}</b><span>Informes pendientes</span></button>
      </div>
    </section>`;
  }

  function dashboard() {
    const parcels = arr('parcelas');
    const operations = arr('operaciones');
    const tasks = arr('tareas');
    const alerts = arr('alertas');
    const review = arr('publicaciones_revision');
    const buyers = arr('compradores');

    const urgentTasks = tasks.filter((t) => /urgente|alta/i.test(t.prioridad || '')).length;
    const opportunities = parcels.filter((p) => p.es_oportunidad).length;

    return `
      ${commandWelcome()}
      <div class="hero">
        <div>
          <h2>Cerebro TPL</h2>
          <p>Acciones y señales reales que requieren atención.</p>
        </div>
        <button class="primary" data-action="refresh">Actualizar</button>
      </div>

      <div class="metric-grid">
        ${metric('En revisión', review.length, 'publicaciones nuevas')}
        ${metric('Operaciones activas', operations.length, 'proyectos en movimiento')}
        ${metric('Tareas pendientes', tasks.length, `${urgentTasks} de prioridad alta/urgente`)}
        ${metric('Oportunidades TPL', opportunities, 'según tasación')}
        ${metric('Compradores', buyers.length, 'intereses registrados')}
      </div>
      <section class="card uf-admin-card">
        <div class="section-title"><div><small>PARÁMETRO ECONÓMICO</small><h3>UF usada por TPL</h3></div><span class="pill ${state.uf?.stale ? 'warn' : 'ok'}">${state.uf?.stale ? 'Revisar actualización' : 'Vigente'}</span></div>
        <div class="uf-admin-grid">
          <div><span>Valor actual</span><strong>${state.uf?.valor_clp ? fmtMoney(state.uf.valor_clp) : '—'}</strong></div>
          <div><span>Última actualización</span><strong>${state.uf?.fecha_valor || '—'}</strong></div>
          <div><span>Fuente</span><strong>${esc(state.uf?.fuente || '—')}</strong></div>
          <form id="ufUpdateForm"><input id="ufValueInput" type="number" min="1" step="0.01" placeholder="Nuevo valor UF" required><button class="primary" type="submit">Actualizar UF</button></form>
        </div>
        <p class="muted">El tasador conserva la UF exacta utilizada en cada cálculo; actualizar este valor no modifica tasaciones históricas.</p>
      </section>

      <div class="grid">
        <article class="card span4">
          <h3>Qué hacer ahora</h3>
          <div class="list">
            ${tasks.slice(0, 8).map((t) => `
              <div class="item">
                <div class="item-main">
                  <strong>${esc(t.titulo)}</strong>
                  <small>${esc(t.detalle || 'Sin detalle')} · ${fmtDate(t.vence_at)}</small>
                </div>
                ${pill(t.prioridad)}
              </div>`).join('') || '<p class="muted">No hay tareas pendientes.</p>'}
          </div>
        </article>

        <article class="card span4">
          <h3>Alertas del cerebro</h3>
          <div class="list">
            ${alerts.slice(0, 8).map((a) => `
              <div class="item">
                <div class="item-main">
                  <strong>${esc(a.mensaje)}</strong>
                  <small>${esc(a.tipo)} · ${fmtDate(a.fecha_relevante)}</small>
                </div>
                ${pill(a.prioridad)}
              </div>`).join('') || '<p class="muted">Sin alertas activas.</p>'}
          </div>
        </article>

        <article class="card span4">
          <h3>Publicaciones por revisar</h3>
          <div class="list">
            ${review.slice(0, 8).map((p) => `
              <div class="item">
                <div class="item-main">
                  <strong>${esc(p.codigo || p.id)}</strong>
                  <small>${esc(p.tipo)} · ${fmtDate(p.created_at)}</small>
                </div>
                ${pill(p.estado)}
              </div>`).join('') || '<p class="muted">No hay publicaciones esperando revisión.</p>'}
          </div>
          ${review.length ? '<button class="primary" data-view="revision">Abrir revisión</button>' : ''}
        </article>

        <article class="card span8">
          <h3>Operaciones vivas</h3>
          <div class="list">
            ${operations.slice(0, 10).map((p) => `
              <div class="item">
                <div class="item-main">
                  <strong>${esc(p.codigo || p.nombre || 'Proyecto')}</strong>
                  <small>${esc(p.propiedad_titulo || 'Sin propiedad')} · ${esc(p.comuna || '')}</small>
                </div>
                ${pill(p.estado_operativo || p.estado)}
              </div>`).join('') || '<p class="muted">Todavía no hay operaciones activas.</p>'}
          </div>
        </article>

        <article class="card span4">
          <h3>Última actividad</h3>
          <div class="timeline compact">
            ${arr('eventos').slice(0, 8).map((e) => `
              <article>
                <strong>${esc(e.descripcion || e.evento)}</strong>
                <small>${esc(e.evento)} · ${fmtDate(e.created_at)}</small>
              </article>`).join('') || '<p class="muted">Sin eventos todavía.</p>'}
          </div>
        </article>
      </div>`;
  }

  function reviewView() {
    const rows = arr('publicaciones_revision');
    return `
      <div class="toolbar">
        <div>
          <h2>Publicaciones por revisar</h2>
          <p class="muted">Nada llega al catálogo público hasta que TPL lo aprueba.</p>
        </div>
        <button class="primary" data-action="refresh">Actualizar</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Tipo</th><th>Estado</th><th>Recibida</th><th>Acción</th></tr></thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td>${esc(r.codigo || r.id)}</td>
                <td>${esc(r.tipo)}</td>
                <td>${pill(r.estado)}</td>
                <td>${fmtDate(r.created_at)}</td>
                <td>
                  <button class="primary small" data-approve="${esc(r.id)}">Aprobar y publicar</button>
                  <button class="nav-btn detail-btn" data-detail-key="publicaciones_revision" data-detail-id="${esc(r.id)}">Ver</button><button class="studio-mini-btn" data-studio-key="publicaciones_revision" data-studio-id="${esc(r.id)}">Material premium</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="5">No hay publicaciones pendientes.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  }

  const viewDefs = {
    compradores: {
      source: 'compradores',
      columns: [
        ['nombre', 'Comprador'],
        ['tipo_interes', 'Interés'],
        ['comuna', 'Comuna'],
        ['presupuesto_max', 'Presupuesto', fmtMoney],
        ['estado', 'Estado', pill],
        ['proxima_accion', 'Próxima acción']
      ]
    },
    duenos: {
      source: 'duenos',
      columns: [
        ['nombre', 'Dueño / corredor'],
        ['comuna', 'Comuna'],
        ['parcelas', 'Parcelas'],
        ['casas', 'Casas canónicas'],
        ['ultima_actualizacion', 'Actualización', fmtDate]
      ]
    },
    partners: {
      source: 'partners',
      columns: [
        ['nombre', 'Partner'],
        ['comuna', 'Base'],
        ['telefono', 'Teléfono'],
        ['servicios', 'Servicios', (v) => Array.isArray(v) ? v.map((s) => s.servicio).filter(Boolean).join(', ') || '—' : '—']
      ]
    },
    parcelas: {
      source: 'parcelas',
      columns: [
        ['titulo', 'Parcela'],
        ['comuna', 'Comuna'],
        ['superficie_m2', 'm²', (v) => Number(v || 0).toLocaleString('es-CL')],
        ['precio_publicado', 'Precio', fmtMoney],
        ['valor_tpl_m2', 'TPL / m²', fmtMoney],
        ['referencia_comunal_m2', 'Comunal / m²', fmtMoney],
        ['es_oportunidad', 'Lectura', (v) => v ? pill('Oportunidad TPL') : pill('Normal')]
      ]
    },
    'parcelas-casas': {
      source: 'parcelas_casas',
      columns: [
        ['propiedad', 'Parcela'],
        ['casa', 'Casa'],
        ['comuna', 'Comuna'],
        ['casa_m2', 'Casa m²'],
        ['dormitorios', 'Dorm.'],
        ['precio_total', 'Total', fmtMoney],
        ['estado', 'Estado', pill]
      ]
    },
    casas: {
      source: 'casas',
      columns: [
        ['nombre', 'Casa'],
        ['material', 'Material'],
        ['superficie_m2', 'm²'],
        ['dormitorios', 'Dorm.'],
        ['banos', 'Baños'],
        ['precio_base', 'Precio base', fmtMoney],
        ['estado', 'Estado', pill]
      ]
    },
    operaciones: {
      source: 'operaciones',
      columns: [
        ['codigo', 'Proyecto'],
        ['propiedad_titulo', 'Propiedad'],
        ['comuna', 'Comuna'],
        ['estado_operativo', 'Estado', pill],
        ['requiere_revision', 'Revisión', (v) => v ? pill('Requiere revisión') : pill('Al día')],
        ['proxima_accion_at', 'Próxima acción', fmtDate]
      ]
    },
    tareas: {
      source: 'tareas',
      columns: [
        ['titulo', 'Tarea'],
        ['tipo', 'Tipo'],
        ['prioridad', 'Prioridad', pill],
        ['estado', 'Estado', pill],
        ['vence_at', 'Vence', fmtDate]
      ]
    },
    tasaciones: {
      source: 'tasaciones',
      columns: [
        ['propiedad_id', 'Propiedad ID'],
        ['precio_publicado_m2', 'Publicado / m²', fmtMoney],
        ['valor_tpl_m2', 'TPL / m²', fmtMoney],
        ['referencia_comunal_m2', 'Comunal / m²', fmtMoney],
        ['clasificacion', 'Clasificación', pill],
        ['version_motor', 'Motor'],
        ['created_at', 'Fecha', fmtDate]
      ]
    },
    analytics: {
      source: 'analytics_diario',
      columns: [
        ['dia', 'Día', fmtDate],
        ['evento', 'Evento'],
        ['pagina', 'Página'],
        ['total', 'Eventos'],
        ['sesiones', 'Sesiones']
      ]
    },
    eventos: {
      source: 'eventos',
      columns: [
        ['evento', 'Evento'],
        ['categoria', 'Categoría'],
        ['descripcion', 'Descripción'],
        ['origen', 'Origen'],
        ['created_at', 'Fecha', fmtDate]
      ]
    },
    mensajes: {
      source: 'mensajes_pendientes',
      columns: [
        ['canal', 'Canal'],
        ['destinatario', 'Destinatario'],
        ['asunto', 'Asunto'],
        ['estado', 'Estado', pill],
        ['programado_at', 'Programado', fmtDate],
        ['created_at', 'Creado', fmtDate]
      ]
    }
  };


  function reportDialogHtml(record, history = []) {
    const owner = arr('duenos').find((x) => x.id === record.propietario_actor_id || x.actor_id === record.propietario_actor_id) || {};
    return `
      <dialog id="premiumReportDialog" class="premium-report-dialog">
        <form method="dialog"><button class="dialog-close" value="cancel" aria-label="Cerrar">×</button></form>
        <div class="premium-report-head"><small>INFORME PREMIUM TPL</small><h2>${esc(record.titulo || 'Parcela')}</h2><p>${esc([record.comuna, record.region].filter(Boolean).join(' · '))}</p></div>
        <div class="premium-report-grid">
          <label>Nombre del destinatario <small>(opcional)</small><input id="premiumReportName" value="${esc(owner.nombre || '')}" placeholder="Solo si deseas personalizarlo"></label>
          <label>Correo <small>(solo para enviar)</small><input id="premiumReportEmail" type="email" value="${esc(owner.email || '')}" placeholder="No es necesario para descargar"></label>
          <label>WhatsApp <small>(opcional)</small><input id="premiumReportPhone" value="${esc(owner.telefono || owner.whatsapp || '')}" placeholder="+56 9..."></label>
        </div>
        <div class="premium-report-note"><strong>Puedes descargar el PDF sin completar ningún dato.</strong> El correo solo es necesario cuando elijas enviarlo.</div>
        <div class="premium-report-actions">
          <button type="button" class="nav-btn" data-report-action="preview">Descargar PDF</button>
          <button type="button" class="primary" data-report-action="send">Generar y enviar</button>
        </div>
        <section class="premium-report-history"><h3>Historial</h3>${history.length ? history.map((h) => `<article><div><strong>${esc(h.codigo || 'Informe')}</strong><small>${fmtDate(h.generado_at || h.created_at)}${h.enviado_a ? ` · enviado a ${esc(h.enviado_a)}` : ''}</small></div>${h.estado ? pill(h.estado) : ''}</article>`).join('') : '<p class="muted">Todavía no existen informes generados para esta parcela.</p>'}</section>
      </dialog>`;
  }

  function propertyHasValuation(record) {
    return arr('tasaciones').some((t) => String(t.propiedad_id || '') === String(record.id || ''));
  }

  function tasadorUrlFor(record, options = {}) {
    const q = new URLSearchParams();
    q.set('embed', 'crm');
    if (options.auto) q.set('auto', '1');
    if (options.openReport) q.set('open_report', '1');
    if (options.full) q.set('full', '1');
    if (options.mode) q.set('modo', options.mode);
    q.set('propiedad_id', record.id || '');
    if (record.codigo) q.set('propiedad_codigo', record.codigo);
    if (record.region) q.set('region', record.region);
    if (record.comuna) q.set('comuna', record.comuna);
    if (record.superficie_m2) q.set('superficie', record.superficie_m2);
    if (record.precio_publicado) q.set('asking', record.precio_publicado);
    if (record.lat) q.set('lat', record.lat);
    if (record.lng) q.set('lng', record.lng);
    if (record.rol_situacion) q.set('rol', record.rol_situacion);
    if (record.electricidad) q.set('electricity', record.electricidad);
    if (record.agua) q.set('water', record.agua);
    if (record.acceso) q.set('access', record.acceso);
    if (record.topografia) q.set('topography', record.topografia);
    if (record.suelo) q.set('soil', record.suelo);
    if (record.exposicion) q.set('exposure', record.exposicion);
    if (record.vista_principal) q.set('view', record.vista_principal);
    if (record.vegetacion) q.set('vegetation', record.vegetacion);
    if (record.cierre_perimetral) q.set('fencing', record.cierre_perimetral);
    if (record.porton) q.set('gate', record.porton);
    if (record.condominio !== undefined && record.condominio !== null) q.set('condominium', record.condominio ? 'si' : 'no');
    if (record.distancia_ruta_principal_km !== undefined && record.distancia_ruta_principal_km !== null) q.set('route_distance', record.distancia_ruta_principal_km);
    const metadata = record.metadata || {};
    const house = record.casa_datos || metadata.casa_datos || {};
    const assetType = record.tipo === 'casa' || metadata.solo_vivienda ? 'casa' : (house && Object.keys(house).length ? 'parcela_casa' : 'parcela');
    q.set('tipo_activo', assetType);
    const communeDistance = record.distancia_centro_comuna_km ?? metadata.distancia_centro_comuna_km ?? metadata.communeDistanceKm;
    if (communeDistance !== undefined && communeDistance !== null && communeDistance !== '') q.set('commune_distance', communeDistance);
    else if (!record.lat || !record.lng) q.set('commune_distance', '0');
    if (house && Object.keys(house).length) {
      q.set('incluye_vivienda', '1');
      if (house.superficie_m2 || house.m2) q.set('area_casa', house.superficie_m2 || house.m2);
      if (house.material || house.materialidad) q.set('material_casa', house.material || house.materialidad);
      if (house.dormitorios) q.set('dormitorios', house.dormitorios);
      if (house.banos || house.baños) q.set('banos', house.banos || house.baños);
      if (house.anio_construccion) q.set('anio_construccion', house.anio_construccion);
      if (house.estado) q.set('estado_casa', house.estado);
    }
    return `/frontend-v2/plataforma/publicar/tasador.html?${q.toString()}`;
  }

  function openCrmTasador(record, options = {}) {
    const dialog = document.querySelector('#crmTasadorDialog');
    const frame = document.querySelector('#crmTasadorFrame');
    const title = document.querySelector('#crmTasadorTitle');
    if (!dialog || !frame) return window.open(tasadorUrlFor(record, options), '_blank', 'noopener,noreferrer');
    if (title) title.textContent = `Tasar · ${record.titulo || record.codigo || 'Propiedad'}`;
    frame.src = tasadorUrlFor(record, options);
    dialog.showModal();
  }

  async function openPremiumReport(record) {
    if (!propertyHasValuation(record)) {
      openCrmTasador(record, { auto: true, openReport: true });
      return;
    }
    document.querySelector('#premiumReportDialog')?.remove();
    let history = [];
    try { history = await window.TPLDataService.getCrmReportHistory(record.id); } catch (error) { console.warn(error); }
    document.body.insertAdjacentHTML('beforeend', reportDialogHtml(record, history));
    const dialog = document.querySelector('#premiumReportDialog');
    dialog.showModal();
    dialog.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-report-action]');
      if (!action) return;
      const name = document.querySelector('#premiumReportName')?.value?.trim() || 'Propietario';
      const email = document.querySelector('#premiumReportEmail')?.value?.trim() || '';
      const telefono = document.querySelector('#premiumReportPhone')?.value?.trim() || '';
      const send = action.dataset.reportAction === 'send';
      if (send && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Ingresa un correo válido.');
      action.disabled = true; action.textContent = send ? 'Generando y enviando…' : 'Generando PDF…';
      try {
        const order = await window.TPLDataService.prepareCrmPremiumReport(record.id, { nombre: name, email, telefono }, send);
        const result = await window.TPLDataService.generateCrmPremiumReport(order.orden_id, { enviar: send, email });
        if (result.download_url) window.open(result.download_url, '_blank', 'noopener,noreferrer');
        alert(send ? (result.enviado ? 'Informe generado y enviado correctamente.' : 'Informe generado. No se pudo confirmar el envío por correo.') : 'Informe Premium generado correctamente.');
        dialog.close();
      } catch (error) { console.error(error); alert(error?.message || 'No fue posible generar el informe.'); }
      finally { action.disabled = false; action.textContent = send ? 'Generar y enviar' : 'Descargar PDF'; }
    });
  }


  function studioView() {
    return `
      ${commandWelcome()}
      <div class="hero">
        <div><small>TPL STUDIO</small><h2>Marketing, informes y captación</h2><p>Crea material premium desde cualquier propiedad, publicación, proyecto o actor del CRM.</p></div>
        <button class="primary" data-open-studio>Entrar a TPL Studio</button>
      </div>
      <div class="metric-grid" id="studioCrmMetrics">
        ${metric('Campañas', '…', 'cargando')}
        ${metric('Recursos', '…', 'landing, PDF, video y redes')}
        ${metric('Visitas atribuidas', '…', 'analytics Studio')}
        ${metric('Conversiones', '…', 'consultas, visitas y reservas')}
      </div>
      <div class="grid">
        <article class="card span6"><h3>Desde propiedades</h3><p class="muted">Abre Parcelas o Parcelas + casas y pulsa <strong>TPL Studio</strong> para generar informe o landing con los datos existentes.</p><button class="primary" data-view="parcelas">Ver parcelas</button></article>
        <article class="card span6"><h3>Desde proyectos</h3><p class="muted">Crea el informe completo parcela + casa + presupuesto desde una operación activa.</p><button class="primary" data-view="operaciones">Ver proyectos</button></article>
      </div>`;
  }
  function crmCommercialTier(r) {
    const price=Number(r?.precio_publicado||0);
    const tplM2=Number(r?.valor_tpl_m2||0);
    const area=Number(r?.superficie_m2||0);
    const tplValue=tplM2&&area?tplM2*area:0;
    if(!price||!tplValue) return null;
    const ratio=price/tplValue;
    const manual=Boolean(r?.seleccion_tpl===true||r?.metadata?.seleccion_tpl===true);
    const discount=Math.max(0,Math.round((1-ratio)*100));
    if(manual&&ratio<=1.005)return {key:'selection',label:'Selección TPL'};
    if(ratio<=.85)return {key:'great-opportunity',label:`Gran Oportunidad · ${discount}% bajo TPL`};
    if(ratio<=.95)return {key:'opportunity',label:`Oportunidad · ${discount}% bajo TPL`};
    if(ratio<=1.005)return {key:'featured',label:'Destacada TPL'};
    return null;
  }
  function crmCommercialBadge(r){const t=crmCommercialTier(r);return t?`<span class="crm-commercial-badge is-${t.key}">${esc(t.label)}</span>`:'';}

  function parcelsView() {
    const rows = arr('parcelas');
    const published = rows.filter((x) => x.estado === 'publicada').length;
    const withoutImage = rows.filter((x) => !x.imagen_principal && !(Array.isArray(x.imagenes) && x.imagenes.length)).length;
    return `
      <div class="toolbar catalog-toolbar">
        <div><h2>Parcelas y campos</h2><p class="muted">Vista completa del inventario canónico. Incluye publicaciones nuevas y el catálogo histórico migrado.</p></div>
        <div class="catalog-toolbar-actions"><input id="search" placeholder="Buscar nombre, comuna, código…"><button class="primary" data-action="refresh">Actualizar</button></div>
      </div>
      <div class="metric-grid">${metric('Inventario', rows.length, 'propiedades en Supabase')}${metric('Publicadas', published, 'visibles o listas para revisión')}${metric('Sin fotografía', withoutImage, 'requieren completar ficha')}${metric('Oportunidades', rows.filter(x=>['opportunity','great-opportunity','selection'].includes(crmCommercialTier(x)?.key)).length, 'detectadas por TPL')}</div>
      <div class="catalog-grid">
        ${rows.map((r) => `
          <article class="catalog-card" data-search-row="${esc(JSON.stringify(r).toLowerCase())}">
            <div class="catalog-card-media">${previewImage(r, 'parcela')}<span class="catalog-state">${esc(r.estado || 'sin estado')}</span><span class="catalog-count">${Number(r.total_imagenes || 0)} fotos</span></div>
            <div class="catalog-card-body">
              <small>${esc(r.codigo || r.id || '')}</small>
              ${crmCommercialBadge(r)}<h3>${esc(r.titulo || 'Parcela sin título')}</h3>
              <p>${esc([r.comuna,r.region].filter(Boolean).join(' · '))}</p>
              <div class="catalog-facts"><b>${Number(r.superficie_m2 || 0).toLocaleString('es-CL')} m²</b><b>${fmtMoney(r.precio_publicado)}</b></div>
              <div class="catalog-actions">
                <button class="nav-btn detail-btn" data-preview-key="parcelas" data-preview-id="${esc(r.id)}">Vista CRM</button>
                <a class="primary-link" href="/frontend-v2/parcela.html?id=${encodeURIComponent(r.codigo || r.id)}" target="_blank" rel="noopener">Ver anuncio</a>
                <button class="tasar-basic-btn" data-crm-tasar-basic="${esc(r.id)}">Tasación básica</button>
                <button class="tasar-crm-btn" data-crm-tasar-full="${esc(r.id)}">${propertyHasValuation(r) ? 'Completar y recalcular' : 'Completar y tasar'}</button>
                <button class="report-premium-btn" data-premium-report="${esc(r.id)}">Informe Premium</button>
                <button class="studio-mini-btn" data-studio-key="parcelas" data-studio-id="${esc(r.id)}">TPL Studio</button>
              </div>
            </div>
          </article>`).join('') || '<div class="empty">No hay parcelas en Supabase.</div>'}
      </div>`;
  }

  function housesView() {
    const rows = arr('casas');
    return `
      <div class="toolbar"><div><h2>Casas canónicas</h2><p class="muted">Una sola ficha alimenta CRM, Casas, PlaceMarket, cotizador y landing del Partner.</p></div><div><button class="primary" data-new-house>Nueva casa</button><button class="nav-btn" data-action="refresh">Actualizar</button></div></div>
      <div class="metric-grid">${metric('Modelos', rows.length, 'en Supabase')}${metric('Sin proveedor', rows.filter(x=>/pendiente/i.test(x.proveedor_estado||'')).length, 'requieren identificación')}${metric('Publicadas', rows.filter(x=>x.estado==='activa').length, 'visibles en catálogo')}</div>
      <div class="table-wrap"><table><thead><tr><th>Casa</th><th>Proveedor</th><th>m²</th><th>Dorm.</th><th>Precio</th><th>Publicación</th><th>Acción</th></tr></thead><tbody>
      ${rows.map(r=>`<tr data-search-row="${esc(JSON.stringify(r).toLowerCase())}"><td><strong>${esc(r.nombre)}</strong><small style="display:block">${esc(r.codigo||r.source_legacy_id||'')}</small></td><td>${esc(r.nombre_proveedor_pendiente||'Proveedor por confirmar')}<small style="display:block">${esc(r.proveedor_estado||'')}</small></td><td>${esc(r.superficie_m2||'—')}</td><td>${esc(r.dormitorios||'—')}</td><td>${fmtMoney(r.precio_base)}</td><td>${pill(r.estado_publicacion||r.estado)}</td><td><button class="primary small" data-edit-house="${esc(r.id)}">Editar</button></td></tr>`).join('')||'<tr><td colspan="7">Sin casas todavía.</td></tr>'}
      </tbody></table></div>`;
  }

  function openHouseDialog(record={}) {
    const dialog=document.querySelector('#houseDialog'); if(!dialog)return;
    const set=(id,v)=>{const el=document.querySelector(id);if(el)el.value=v??''};
    set('#houseId',record.id);set('#houseName',record.nombre);set('#houseCode',record.codigo);set('#houseM2',record.superficie_m2);set('#houseBedrooms',record.dormitorios);set('#houseBathrooms',record.banos);set('#houseFloors',record.pisos||1);set('#houseMaterial',record.material);set('#housePrice',record.precio_base);set('#houseState',record.estado||'pausada');set('#houseProviderState',record.proveedor_estado||'pendiente_identificacion');set('#houseProviderName',record.nombre_proveedor_pendiente);set('#housePartnerId',record.partner_actor_id);set('#houseRelation',record.tipo_relacion||'comercializador');set('#houseDays',record.plazo_estimado_dias);set('#houseWarranty',record.garantia);set('#houseDescription',record.descripcion);set('#houseImages',(Array.isArray(record.imagenes)?record.imagenes:[]).join('\n'));set('#housePlans',(Array.isArray(record.planos)?record.planos:[]).join('\n'));
    document.querySelector('#houseDialogTitle').textContent=record.id?'Editar casa':'Nueva casa'; dialog.showModal();
  }

  function lines(id){return String(document.querySelector(id)?.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean)}

  function genericView(id) {
    const def = viewDefs[id];
    const rows = arr(def.source);
    return `
      <div class="toolbar">
        <input id="search" placeholder="Buscar en ${esc(groups.flatMap((g) => g[1]).find((x) => x[0] === id)?.[1] || id)}…">
        <button class="primary" data-action="refresh">Actualizar</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${def.columns.map(([, label]) => `<th>${esc(label)}</th>`).join('')}<th>Acción</th></tr>
          </thead>
          <tbody id="tbody">
            ${rows.map((row) => tableRow(row, def.columns, def.source)).join('') ||
              `<tr><td colspan="${def.columns.length + 1}">Sin registros todavía.</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  function tableRow(row, columns, source) {
    const id = row.id || row.proyecto_id || row.propiedad_id || row.comprador_id || row.dueno_id || '';
    return `<tr data-search-row="${esc(JSON.stringify(row).toLowerCase())}">
      ${columns.map(([key, , formatter]) => {
        const value = row[key];
        return `<td>${formatter ? formatter(value, row) : esc(value ?? '—')}</td>`;
      }).join('')}
      <td><div class="row-actions"><button class="nav-btn detail-btn" data-detail-key="${esc(source)}" data-detail-id="${esc(id)}">Ver ficha</button><button class="studio-mini-btn" data-studio-key="${esc(source)}" data-studio-id="${esc(id)}">TPL Studio</button></div></td>
    </tr>`;
  }

  function detailFor(source, id) {
    const rows = arr(source);
    return rows.find((row) => String(
      row.id || row.proyecto_id || row.propiedad_id || row.comprador_id || row.dueno_id || ''
    ) === String(id));
  }

  function showDetail(record) {
    if (!record) return;
    const text = Object.entries(record)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`)
      .join('\n\n');
    alert(text);
  }

  function showPreview(record, source) {
    if (!record) return;
    const isHouse = source === 'casas';
    const titleText = isHouse ? record.nombre : record.titulo;
    const media = previewImage(record, isHouse ? 'casa' : 'parcela');
    const dialog = document.querySelector('#previewDialog');
    const body = document.querySelector('#previewDialogBody');
    if (!dialog || !body) return showDetail(record);
    body.innerHTML = `<div class="preview-hero">${media}</div><div class="preview-content"><small>${esc(record.codigo || record.source_legacy_id || '')}</small><h2>${esc(titleText || 'Sin título')}</h2><p>${esc(record.descripcion || 'Sin descripción disponible.')}</p><div class="preview-stats"><span><small>Ubicación / proveedor</small><b>${esc(isHouse ? (record.nombre_proveedor_pendiente || 'Por confirmar') : [record.comuna,record.region].filter(Boolean).join(' · '))}</b></span><span><small>Superficie</small><b>${esc(record.superficie_m2 || '—')} m²</b></span><span><small>Precio</small><b>${fmtMoney(isHouse ? record.precio_base : record.precio_publicado)}</b></span><span><small>Estado</small><b>${esc(record.estado_publicacion || record.estado || '—')}</b></span></div>${!isHouse ? `<a class="primary-link preview-public-link" href="/frontend-v2/parcela.html?id=${encodeURIComponent(record.codigo || record.id)}" target="_blank" rel="noopener">Abrir anuncio público</a>` : ''}</div>`;
    dialog.showModal();
  }

  function render(view) {
    state.current = view;
    document.querySelectorAll('.nav-btn[data-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === view);
    });

    const label = groups.flatMap((g) => g[1]).find((x) => x[0] === view)?.[1] || view;
    if (title) title.textContent = label;

    if (!content) return;

    if (view === 'inicio') content.innerHTML = dashboard();
    else if (view === 'revision') content.innerHTML = reviewView();
    else if (view === 'studio') content.innerHTML = studioView();
    else if (view === 'parcelas') content.innerHTML = parcelsView();
    else if (view === 'casas') content.innerHTML = housesView();
    else if (viewDefs[view]) content.innerHTML = genericView(view);
    else content.innerHTML = '<div class="card"><p class="muted">Módulo no disponible.</p></div>';

    document.querySelector('#ufUpdateForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = document.querySelector('#ufValueInput');
      try {
        await window.TPLDataService.updateUfConfig(input?.value, 'CRM TPL');
        state.uf = await window.TPLDataService.getUfConfig();
        render('inicio');
        statusBadge('UF actualizada correctamente', 'ok');
      } catch (error) {
        console.error('CRM TPL UF:', error);
        alert(error?.message || 'No fue posible actualizar la UF.');
      }
    });

    if (view === 'studio' && window.TPLStudioService?.getAnalytics) {
      window.TPLStudioService.getAnalytics().then((a) => {
        const grid = document.querySelector('#studioCrmMetrics');
        if (grid) grid.innerHTML = [
          metric('Campañas', a.campaigns || 0, 'creadas en TPL Studio'),
          metric('Recursos', a.outputs || 0, 'landing, PDF, video y redes'),
          metric('Visitas atribuidas', a.visits || 0, 'analytics Studio'),
          metric('Conversiones', a.conversions || 0, 'consultas, visitas y reservas')
        ].join('');
      }).catch(console.warn);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadSnapshot() {
    if (state.loading) return;
    state.loading = true;
    renderLoading();
    statusBadge('Conectando al Supabase nuevo…');

    try {
      const session = await window.TPLDataService.getSession();
      if (!session) {
        statusBadge('Sesión requerida', 'warn');
        renderLogin();
        return;
      }

      try { state.command = await window.TPLDataService.getCrmCommandCenter(); } catch (commandError) { console.warn('CRM Command Center no disponible:', commandError); state.command = null; }
      const snapshot = await window.TPLDataService.getCrmSnapshot();
      state.snapshot = snapshot;
      try { state.uf = await window.TPLDataService.getUfConfig(); } catch (error) { console.warn('CRM TPL: UF no disponible.', error); state.uf = null; }
      setNav();

      statusBadge(
        `Supabase conectado · ${arr('parcelas').length} propiedades · ${arr('eventos').length} eventos`,
        'ok'
      );

      render(state.current === 'inicio' ? 'inicio' : state.current);
      ensureSignOutButton();
    } catch (error) {
      console.error('CRM TPL:', error);
      statusBadge('Error de sincronización', 'danger');
      renderError(error);
    } finally {
      state.loading = false;
    }
  }

  function ensureSignOutButton() {
    if (!topbar || document.querySelector('#tplCrmSignOut')) return;
    const button = document.createElement('button');
    button.id = 'tplCrmSignOut';
    button.className = 'nav-btn';
    button.type = 'button';
    button.textContent = 'Salir';
    button.addEventListener('click', async () => {
      await window.TPLDataService.signOut();
      state.snapshot = null;
      renderLogin();
      statusBadge('Sesión cerrada');
    });
    topbar.appendChild(button);
  }

  nav?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    render(button.dataset.view);
    document.querySelector('.sidebar')?.classList.remove('open');
  });

  document.querySelector('#menuBtn')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('open');
  });

  const quickAdd = document.querySelector('#quickAdd');
  if (quickAdd) {
    quickAdd.disabled = true;
    quickAdd.title = 'El alta manual se habilitará mediante una RPC segura; no se guardarán registros falsos en localStorage.';
  }

  content?.addEventListener('click', async (event) => {
    const openStudio = event.target.closest('[data-open-studio]');
    if (openStudio) {
      window.location.href = '../studio/index.html?origen=crm';
      return;
    }

    const newHouse = event.target.closest('[data-new-house]');
    if (newHouse) { openHouseDialog(); return; }
    const editHouse = event.target.closest('[data-edit-house]');
    if (editHouse) { openHouseDialog(detailFor('casas', editHouse.dataset.editHouse)); return; }
    const refresh = event.target.closest('[data-action="refresh"]');
    if (refresh) {
      await loadSnapshot();
      return;
    }

    const approve = event.target.closest('[data-approve]');
    if (approve) {
      if (!confirm('¿Aprobar esta publicación y habilitarla para el catálogo público?')) return;
      approve.disabled = true;
      approve.textContent = 'Aprobando…';
      try {
        await window.TPLDataService.approvePublication(approve.dataset.approve, true);
        await loadSnapshot();
      } catch (error) {
        console.error(error);
        alert(error?.message || 'No fue posible aprobar la publicación.');
        approve.disabled = false;
        approve.textContent = 'Aprobar y publicar';
      }
      return;
    }

    const tasarBasic = event.target.closest('[data-crm-tasar-basic]');
    if (tasarBasic) {
      const record = detailFor('parcelas', tasarBasic.dataset.crmTasarBasic);
      if (!record) return alert('No pudimos recuperar la parcela.');
      openCrmTasador(record, { auto: true, openReport: true, mode: 'rapida' });
      return;
    }

    const tasarFull = event.target.closest('[data-crm-tasar-full]');
    if (tasarFull) {
      const record = detailFor('parcelas', tasarFull.dataset.crmTasarFull);
      if (!record) return alert('No pudimos recuperar la parcela.');
      openCrmTasador(record, { full: true, openReport: true, mode: 'precisa' });
      return;
    }

    const premiumReport = event.target.closest('[data-premium-report]');
    if (premiumReport) {
      const record = detailFor('parcelas', premiumReport.dataset.premiumReport);
      if (!record) return alert('No pudimos recuperar la parcela.');
      await openPremiumReport(record);
      return;
    }

    const studio = event.target.closest('[data-studio-key]');
    if (studio) {
      const record = detailFor(studio.dataset.studioKey, studio.dataset.studioId);
      if (!record) return alert('No pudimos recuperar el registro para TPL Studio.');
      window.TPLCrmStudio?.open(record, studio.dataset.studioKey);
      return;
    }

    const preview = event.target.closest('[data-preview-key]');
    if (preview) { showPreview(detailFor(preview.dataset.previewKey, preview.dataset.previewId), preview.dataset.previewKey); return; }

    const detail = event.target.closest('[data-detail-key]');
    if (detail) {
      showDetail(detailFor(detail.dataset.detailKey, detail.dataset.detailId));
      return;
    }

    const go = event.target.closest('[data-view]');
    if (go) render(go.dataset.view);
  });

  content?.addEventListener('input', (event) => {
    if (event.target.id !== 'search') return;
    const q = event.target.value.toLowerCase().trim();
    content.querySelectorAll('[data-search-row]').forEach((row) => {
      row.hidden = q && !row.dataset.searchRow.includes(q);
    });
  });

  document.querySelector('#universalSearch')?.addEventListener('input', (event) => {
    state.universalQuery = event.target.value || '';
    const q = state.universalQuery.trim();
    if (!q) { render(state.current || 'inicio'); return; }
    if (title) title.textContent = 'Búsqueda TPL';
    if (content) content.innerHTML = universalSearchView(q);
  });

  document.querySelector('#saveHouse')?.addEventListener('click', async () => {
    const button=document.querySelector('#saveHouse'); button.disabled=true; button.textContent='Guardando…';
    try {
      const val=id=>document.querySelector(id)?.value?.trim()||'';
      await window.TPLDataService.saveCrmHouse({id:val('#houseId')||null,nombre:val('#houseName'),codigo:val('#houseCode')||null,superficie_m2:val('#houseM2')||null,dormitorios:val('#houseBedrooms')||null,banos:val('#houseBathrooms')||null,pisos:val('#houseFloors')||null,material:val('#houseMaterial')||null,precio_base:val('#housePrice')||null,estado:val('#houseState'),proveedor_estado:val('#houseProviderState'),nombre_proveedor_pendiente:val('#houseProviderName')||null,partner_actor_id:val('#housePartnerId')||null,tipo_relacion:val('#houseRelation'),plazo_estimado_dias:val('#houseDays')||null,garantia:val('#houseWarranty')||null,descripcion:val('#houseDescription')||null,imagenes:lines('#houseImages'),planos:lines('#housePlans')});
      document.querySelector('#houseDialog')?.close(); await loadSnapshot(); render('casas');
    } catch(error){console.error(error);alert(error?.message||'No fue posible guardar la casa.')} finally {button.disabled=false;button.textContent='Guardar y sincronizar';}
  });

  document.querySelector('#crmTasadorClose')?.addEventListener('click', () => {
    const dialog = document.querySelector('#crmTasadorDialog');
    const frame = document.querySelector('#crmTasadorFrame');
    dialog?.close();
    if (frame) frame.src = 'about:blank';
  });

  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== 'TPL_TASACION_GUARDADA') return;
    document.querySelector('#crmTasadorDialog')?.close();
    const frame = document.querySelector('#crmTasadorFrame');
    if (frame) frame.src = 'about:blank';
    await loadSnapshot();
    render('parcelas');
    const propertyId = event.data.propiedad_id;
    const record = detailFor('parcelas', propertyId);
    if (record) await openPremiumReport(record);
  });

  async function bootstrap() {
    const today = document.querySelector('#today');
    if (today) today.textContent = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date());

    if (!window.TPLDataService) {
      if (content) content.innerHTML = `
        <div class="card">
          <h3>Falta tpl-data-service.js</h3>
          <p class="muted">Carga el servicio de datos antes de crm-v2.js.</p>
        </div>`;
      statusBadge('Servicio de datos no cargado', 'danger');
      return;
    }

    await loadSnapshot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
