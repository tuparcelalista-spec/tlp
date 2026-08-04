(() => {
  'use strict';

  const appPath=(path='')=>{const clean=String(path||'').replace(/^\/+/, '');const prefix=window.location.pathname.startsWith('/frontend-v2/')?'/frontend-v2':'';return `${prefix}/${clean}`;};

  const state = {
    snapshot: null,
    current: 'inicio',
    loading: false,
    uf: null,
    command: null,
    universalQuery: '',
    recentValuations: new Map(),
    handledTasaciones: new Set(),
    activeTasadorPropertyId: null,
    parcelFilters: {
      query: '',
      region: '',
      commune: '',
      status: '',
      valuation: '',
      completeness: '',
      sort: 'recent'
    }
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



  function hydratedProperty(record = {}) {
    const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata : {};
    const ubicacion = metadata.ubicacion && typeof metadata.ubicacion === 'object' ? metadata.ubicacion : {};
    const house = record.casa_datos || metadata.casa_datos || metadata.casa || {};
    const source = { ...metadata, ...ubicacion, ...record };
    const text = String([source.titulo, source.nombre, source.descripcion, metadata.descripcion].filter(Boolean).join(' '))
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const yes = (value) => /^(si|sí|true|1|disponible|con)$/i.test(String(value ?? '').trim());
    const infer = (current, fallback) => current !== undefined && current !== null && String(current).trim() !== '' ? current : fallback;
    const natural = Array.isArray(source.atributos_naturales) ? [...source.atributos_naturales] : [];
    const pushNature = (value, pattern) => { if (pattern.test(text) && !natural.some(x => String(x).toLowerCase().includes(value))) natural.push(value); };
    pushNature('rio', /acceso (?:directo )?al rio|rio dentro|orilla de rio/);
    pushNature('lago', /acceso (?:directo )?al lago|orilla de lago/);
    pushNature('termas', /aguas termales|termas/);
    pushNature('bosque nativo', /bosque nativo|araucarias/);
    const legacyRol = yes(source.rol) || /rol propio/.test(text) ? 'Rol propio' : '';
    const legacyElectricity = yes(source.luz) || /energia electrica|electricidad disponible|empalme/.test(text) ? 'Empalme instalado' : '';
    const legacyWater = yes(source.agua) || /agua disponible|disponibilidad de agua|con agua/.test(text) ? 'Agua disponible' : '';
    const legacyCondo = source.condominio === true || /condominio privado|dentro del condominio/.test(text);
    const legacyTourism = /caburgua|pucon|pucón|destino turistico|turismo aventura|parque nacional|lago caburgua/.test(text) ? 'nacional' : '';
    const legacyView = /vista.*volcan|volcan villarrica/.test(text) ? 'Vista panorámica / cordillera / volcán' : '';
    return {
      ...metadata,
      ...ubicacion,
      ...record,
      region: record.region || ubicacion.region || metadata.region || '',
      comuna: record.comuna || ubicacion.comuna || metadata.comuna || '',
      superficie_m2: record.superficie_m2 || metadata.superficie_m2 || metadata.superficie || metadata.tamano || null,
      precio_publicado: record.precio_publicado || metadata.precio_publicado || metadata.precio || null,
      lat: record.lat ?? ubicacion.lat ?? metadata.lat ?? null,
      lng: record.lng ?? ubicacion.lng ?? metadata.lng ?? null,
      rol_situacion: infer(record.rol_situacion, legacyRol),
      electricidad: infer(record.electricidad, legacyElectricity),
      agua: infer(record.agua, legacyWater),
      condominio: record.condominio !== undefined && record.condominio !== null ? record.condominio : legacyCondo,
      clasificacion_turistica: infer(record.clasificacion_turistica ?? metadata.clasificacion_turistica, legacyTourism),
      vista_principal: infer(record.vista_principal, legacyView),
      atributos_naturales: natural,
      casa_datos: house,
      metadata: { ...metadata, legacy_inference: { applied: true, source: 'crm_hydration_v2' } }
    };
  }

  function latestValuation(record) {
    const id = String(record?.id || '');
    const recent = state.recentValuations.get(id);
    if (recent) return recent;
    return arr('tasaciones')
      .filter((t) => String(t.propiedad_id || t.entrada?.propiedadId || t.entrada?.propiedad_id || '') === id)
      .sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
  }

  function valuationValues(record) {
    const valuation = latestValuation(record);
    const result = valuation?.resultado || valuation?.result || {};
    const technical = Number(result.valorTplTasador ?? result.valor_tpl_tasador ?? result.ideal ?? result.recommended ?? result.market ?? 0);
    const communal = Number(result.valorComunal ?? result.valor_comunal ?? result.marketReference?.medianValue ?? result.referencia_comunal_total ?? result.observedComparables?.mediana_total ?? 0);
    const suggested = Number(result.valorTplTasadorComuna ?? result.valor_tpl_tasador_comuna ?? (communal ? Math.round((technical + communal) / 2) : technical));
    const urgency = Number(result.valorVentaApuro ?? result.valor_venta_apuro ?? result.quick ?? result.agile ?? Math.round(suggested * .93));
    return {
      valuation,
      technical,
      suggested,
      communal,
      urgency,
      // aliases temporales para módulos antiguos
      ideal: technical,
      quick: urgency,
      patient: Number(result.patient ?? result.patientPotential ?? Math.round(technical*1.07) ?? 0)
    };
  }


  function valuationExplanation(record) {
    const { valuation, technical: ideal, communal } = valuationValues(record);
    const result = valuation?.resultado || valuation?.result || {};
    const input = valuation?.entrada || valuation?.input || {};
    if (!ideal) return '';
    const market = result.marketReference || result.landResult?.marketReference || null;
    const factors = [];
    if (market) factors.push(`<span><b>Valor observado comunal</b>${fmtMoney(Number(market.medianM2||0))}/m² · no modifica el motor técnico</span>`);
    const territorialBase=Number(result.territorialBase||result.landResult?.territorialBase||0);
    if(territorialBase) factors.push(`<span><b>Base territorial</b>${fmtMoney(territorialBase)}</span>`);
    const groups=result.adjustmentGroups||result.landResult?.adjustmentGroups||{};
    const groupLabels={tourism:'Turismo',legal:'Situación legal',infrastructure:'Servicios e infraestructura',natural:'Atributos naturales',readiness:'Preparación',route:'Acceso a ruta'};
    Object.entries(groups).forEach(([key,mult])=>{const pct=Math.round((Number(mult||1)-1)*100);if(pct)factors.push(`<span><b>${groupLabels[key]||key}</b>${pct>0?'+':''}${pct}%</span>`)});
    if (input.region && input.comuna) factors.push(`<span><b>Ubicación base</b>${esc(input.comuna)} · ${esc(input.region)}</span>`);
    if (Number(input.area || input.superficie_m2 || 0)) factors.push(`<span><b>Superficie</b>${Number(input.area || input.superficie_m2).toLocaleString('es-CL')} m²</span>`);
    const confidence = result.observedComparables?.confianza || (input.lat && input.lng ? 'alta' : 'referencial');
    factors.push(`<span><b>Confianza</b>${esc(confidence)}</span>`);
    return `<details class="crm-value-details"><summary>Cómo se llegó a estos valores</summary><div>${factors.join('')}</div></details>`;
  }

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
    return Boolean(latestValuation(record));
  }

  function tasadorUrlFor(record, options = {}) {
    record = hydratedProperty(record);
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
    if (record.distancia_ruta_principal_km !== undefined && record.distancia_ruta_principal_km !== null) q.set('route_distance_m', Math.round(Number(record.distancia_ruta_principal_km) * 1000));
    const metadata = record.metadata || {};
    const house = record.casa_datos || metadata.casa_datos || {};
    const natural = record.atributos_naturales || metadata.atributos_naturales || metadata.nature || [];
    const known = (value) => value !== undefined && value !== null && String(value).trim() !== '';
    const present = [];
    const mark = (key, value) => { if (known(value)) present.push(key); };
    mark('region', record.region); mark('comuna', record.comuna); mark('superficie', record.superficie_m2);
    mark('asking', record.precio_publicado); mark('lat', record.lat); mark('lng', record.lng);
    mark('rol', record.rol_situacion); mark('electricity', record.electricidad); mark('water', record.agua);
    mark('access', record.acceso); mark('topography', record.topografia); mark('soil', record.suelo);
    mark('exposure', record.exposicion); mark('view', record.vista_principal); mark('vegetation', record.vegetacion);
    mark('fencing', record.cierre_perimetral); mark('gate', record.porton);
    if (record.condominio !== undefined && record.condominio !== null) present.push('condominium');
    mark('route_distance', record.distancia_ruta_principal_km);
    mark('commune_distance', record.distancia_centro_comuna_km ?? metadata.distancia_centro_comuna_km ?? metadata.communeDistanceKm);
    mark('electricity_pole_distance', record.distancia_poste_electrico_m ?? metadata.distancia_poste_electrico_m ?? metadata.electricityPoleDistanceM);
    mark('tourism', record.clasificacion_turistica ?? metadata.clasificacion_turistica ?? metadata.tourismLevel);
    if (Array.isArray(natural) && natural.length) present.push('nature');
    if (options.full) { q.set('smart_missing', '1'); q.set('campos_presentes', present.join(',')); }
    if (Array.isArray(natural) && natural.length) q.set('nature', natural.join('|'));
    const poleDistance = record.distancia_poste_electrico_m ?? metadata.distancia_poste_electrico_m ?? metadata.electricityPoleDistanceM;
    if (known(poleDistance)) q.set('electricity_pole_distance', poleDistance);
    const tourismLevel = record.clasificacion_turistica ?? metadata.clasificacion_turistica ?? metadata.tourismLevel;
    if (known(tourismLevel)) q.set('tourism', tourismLevel);
    const assetType = record.tipo === 'casa' || metadata.solo_vivienda ? 'casa' : (house && Object.keys(house).length ? 'parcela_casa' : 'parcela');
    q.set('tipo_activo', assetType);
    const communeDistance = record.distancia_centro_comuna_km ?? metadata.distancia_centro_comuna_km ?? metadata.communeDistanceKm;
    if (communeDistance !== undefined && communeDistance !== null && communeDistance !== '') q.set('commune_distance_m', Math.round(Number(communeDistance) * 1000));
    // Sin coordenadas ni distancia declarada, el Tasador básico usa una referencia comunal neutral.
    if (house && Object.keys(house).length) {
      q.set('incluye_vivienda', '1');
      if (house.superficie_m2 || house.m2) q.set('area_casa', house.superficie_m2 || house.m2);
      if (house.material || house.materialidad) q.set('material_casa', house.material || house.materialidad);
      if (house.dormitorios) q.set('dormitorios', house.dormitorios);
      if (house.banos || house.baños) q.set('banos', house.banos || house.baños);
      if (house.anio_construccion) q.set('anio_construccion', house.anio_construccion);
      if (house.estado) q.set('estado_casa', house.estado);
      if (house.anio_remodelacion) q.set('anio_remodelacion', house.anio_remodelacion);
      if (house.pisos) q.set('pisos', house.pisos);
      if (house.obras_adicionales && Object.keys(house.obras_adicionales).length) q.set('works', JSON.stringify(house.obras_adicionales));
      if (house.caracteristica_diferenciadora) q.set('differentiator', house.caracteristica_diferenciadora);
      mark('area_casa', house.superficie_m2 || house.m2);
      mark('material_casa', house.material || house.materialidad);
      mark('dormitorios', house.dormitorios); mark('banos', house.banos || house.baños);
      mark('anio_construccion', house.anio_construccion); mark('estado_casa', house.estado);
      mark('anio_remodelacion', house.anio_remodelacion); mark('pisos', house.pisos);
      if (house.obras_adicionales && Object.keys(house.obras_adicionales).length) present.push('works');
      mark('differentiator', house.caracteristica_diferenciadora);
      if (options.full) q.set('campos_presentes', [...new Set(present)].join(','));
    }
    return `${appPath('plataforma/publicar/tasador.html')}?${q.toString()}`;
  }

  function openCrmTasador(record, options = {}) {
    record = hydratedProperty(record);
    if (!record.region || !record.comuna || !Number(record.superficie_m2)) {
      return alert('Para tasar se necesita como mínimo región, comuna y superficie. Completa esos datos en la ficha de la propiedad.');
    }
    if (state.activeTasadorPropertyId) return;
    state.activeTasadorPropertyId = String(record.id || '');
    const dialog = document.querySelector('#crmTasadorDialog');
    const frame = document.querySelector('#crmTasadorFrame');
    const title = document.querySelector('#crmTasadorTitle');
    if (!dialog || !frame) { state.activeTasadorPropertyId = null; return window.open(tasadorUrlFor(record, options), '_blank', 'noopener,noreferrer'); }
    if (title) title.textContent = `Tasar · ${record.titulo || record.codigo || 'Propiedad'}`;
    frame.src = tasadorUrlFor(record, options);
    dialog.addEventListener('close', () => { state.activeTasadorPropertyId = null; }, { once: true });
    dialog.showModal();
  }

  async function openPremiumReport(record, options = {}) {
    let serverValuation = null;
    try { serverValuation = await window.TPLDataService.getLatestCrmValuation?.(record.id); } catch (error) { console.warn(error); }
    if (!serverValuation) {
      openCrmTasador(record, { auto: true, openReport: true });
      return;
    }
    state.recentValuations.set(String(record.id), serverValuation);
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


  const normText = (value) => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function parcelCompletion(record) {
    const p = hydratedProperty(record);
    const checks = [
      Boolean(record?.imagen_principal || (Array.isArray(record?.imagenes) && record.imagenes.length)),
      Boolean(p.titulo || record?.titulo),
      Boolean(p.descripcion || record?.descripcion),
      Number(p.superficie_m2 || 0) > 0,
      Number(p.precio_publicado || 0) > 0,
      Boolean(p.region),
      Boolean(p.comuna),
      Boolean(p.rol_situacion || p.rol),
      Boolean(p.agua || p.agua_tipo),
      Boolean(p.electricidad || p.electricidad_tipo),
      Boolean(p.acceso),
      Boolean(p.topografia),
      propertyHasValuation(record)
    ];
    const completed = checks.filter(Boolean).length;
    return {
      score: Math.round((completed / checks.length) * 100),
      missing: checks.length - completed
    };
  }

  function parcelFilterOptions(rows, field) {
    return [...new Set(rows.map((row) => String(hydratedProperty(row)?.[field] || row?.[field] || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  function applyParcelFilters() {
    if (state.current !== 'parcelas' || !content) return;
    const filters = state.parcelFilters;
    const grid = content.querySelector('#parcelCatalogGrid');
    const cards = [...content.querySelectorAll('.catalog-card[data-parcel-card]')];
    const query = normText(filters.query);
    let visible = cards.filter((card) => {
      const matchesQuery = !query || normText(card.dataset.searchRow).includes(query);
      const matchesRegion = !filters.region || card.dataset.region === normText(filters.region);
      const matchesCommune = !filters.commune || card.dataset.commune === normText(filters.commune);
      const matchesStatus = !filters.status || card.dataset.status === normText(filters.status);
      const matchesValuation =
        !filters.valuation ||
        (filters.valuation === 'with' && card.dataset.valuation === 'with') ||
        (filters.valuation === 'without' && card.dataset.valuation === 'without');
      const matchesCompleteness =
        !filters.completeness ||
        (filters.completeness === 'pending' && Number(card.dataset.completion) < 100) ||
        (filters.completeness === 'complete' && Number(card.dataset.completion) === 100) ||
        (filters.completeness === 'critical' && Number(card.dataset.completion) < 60);
      return matchesQuery && matchesRegion && matchesCommune && matchesStatus && matchesValuation && matchesCompleteness;
    });

    const sorters = {
      recent: (a, b) => Number(b.dataset.updated || 0) - Number(a.dataset.updated || 0),
      oldest: (a, b) => Number(a.dataset.updated || 0) - Number(b.dataset.updated || 0),
      'price-asc': (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
      'price-desc': (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
      'area-desc': (a, b) => Number(b.dataset.area) - Number(a.dataset.area),
      'tpl-desc': (a, b) => Number(b.dataset.tpl) - Number(a.dataset.tpl),
      'completion-asc': (a, b) => Number(a.dataset.completion) - Number(b.dataset.completion)
    };
    visible.sort(sorters[filters.sort] || sorters.recent);
    cards.forEach((card) => { card.hidden = !visible.includes(card); });
    visible.forEach((card) => grid?.appendChild(card));

    const resultCount = content.querySelector('#parcelResultCount');
    if (resultCount) resultCount.textContent = `${visible.length} de ${cards.length} parcelas`;
    const empty = content.querySelector('#parcelFilterEmpty');
    if (empty) empty.hidden = visible.length > 0;

    const communes = [...new Set(cards
      .filter((card) => !filters.region || card.dataset.region === normText(filters.region))
      .map((card) => card.dataset.communeLabel)
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    const communeSelect = content.querySelector('#parcelCommuneFilter');
    if (communeSelect) {
      const current = filters.commune;
      communeSelect.innerHTML = `<option value="">Todas las comunas</option>${communes.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}`;
      communeSelect.value = communes.includes(current) ? current : '';
      if (current && !communes.includes(current)) {
        state.parcelFilters.commune = '';
      }
    }
  }

  function parcelsView() {
    const rows = arr('parcelas');
    const published = rows.filter((x) => normText(x.estado) === 'publicada').length;
    const withoutImage = rows.filter((x) => !x.imagen_principal && !(Array.isArray(x.imagenes) && x.imagenes.length)).length;
    const withoutValuation = rows.filter((x) => !propertyHasValuation(x)).length;
    const pending = rows.filter((x) => parcelCompletion(x).score < 100).length;
    const regions = parcelFilterOptions(rows, 'region');
    const statuses = [...new Set(rows.map((x) => String(x.estado || x.estado_publicacion || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    const f = state.parcelFilters;

    return `
      <div class="toolbar catalog-toolbar">
        <div><h2>Parcelas y campos</h2><p class="muted">Encuentra y prioriza propiedades por ubicación, estado, tasación y completitud.</p></div>
        <div class="catalog-toolbar-actions"><button class="primary" data-action="refresh">Actualizar</button></div>
      </div>

      <div class="metric-grid crm-parcel-metrics">
        ${metric('Inventario', rows.length, 'propiedades en Supabase')}
        ${metric('Publicadas', published, 'visibles o listas para revisión')}
        ${metric('Sin tasación', withoutValuation, 'requieren calcular valor TPL')}
        ${metric('Ficha pendiente', pending, 'con antecedentes por completar')}
        ${metric('Sin fotografía', withoutImage, 'requieren completar material')}
        ${metric('Oportunidades', rows.filter(x=>['opportunity','great-opportunity','selection'].includes(crmCommercialTier(x)?.key)).length, 'detectadas por TPL')}
      </div>

      <section class="parcel-control-center" aria-label="Buscar y filtrar parcelas">
        <div class="parcel-search-main">
          <label for="search">Buscar parcela</label>
          <input id="search" type="search" value="${esc(f.query)}" placeholder="Nombre, código, comuna, sector, propietario o rol…">
        </div>
        <div class="parcel-filter-grid">
          <label>Región<select id="parcelRegionFilter"><option value="">Todas las regiones</option>${regions.map((x)=>`<option value="${esc(x)}" ${f.region===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
          <label>Comuna<select id="parcelCommuneFilter"><option value="">Todas las comunas</option></select></label>
          <label>Estado<select id="parcelStatusFilter"><option value="">Todos los estados</option>${statuses.map((x)=>`<option value="${esc(x)}" ${f.status===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
          <label>Tasación<select id="parcelValuationFilter"><option value="">Todas</option><option value="with" ${f.valuation==='with'?'selected':''}>Con tasación</option><option value="without" ${f.valuation==='without'?'selected':''}>Sin tasación</option></select></label>
          <label>Completitud<select id="parcelCompletenessFilter"><option value="">Todas</option><option value="pending" ${f.completeness==='pending'?'selected':''}>Con datos pendientes</option><option value="critical" ${f.completeness==='critical'?'selected':''}>Crítica: menos de 60%</option><option value="complete" ${f.completeness==='complete'?'selected':''}>Ficha completa</option></select></label>
          <label>Ordenar<select id="parcelSortFilter"><option value="recent" ${f.sort==='recent'?'selected':''}>Más recientes</option><option value="oldest" ${f.sort==='oldest'?'selected':''}>Más antiguas</option><option value="price-asc" ${f.sort==='price-asc'?'selected':''}>Menor precio</option><option value="price-desc" ${f.sort==='price-desc'?'selected':''}>Mayor precio</option><option value="area-desc" ${f.sort==='area-desc'?'selected':''}>Mayor superficie</option><option value="tpl-desc" ${f.sort==='tpl-desc'?'selected':''}>Mayor Valor TPL</option><option value="completion-asc" ${f.sort==='completion-asc'?'selected':''}>Más incompletas primero</option></select></label>
        </div>
        <div class="parcel-filter-footer">
          <strong id="parcelResultCount">${rows.length} parcelas</strong>
          <div class="parcel-quick-filters">
            <button type="button" data-parcel-quick="without-valuation">Sin tasación</button>
            <button type="button" data-parcel-quick="pending">Datos pendientes</button>
            <button type="button" data-parcel-quick="published">Publicadas</button>
            <button type="button" data-parcel-clear>Limpiar filtros</button>
          </div>
        </div>
      </section>

      <div class="catalog-grid" id="parcelCatalogGrid">
        ${rows.map((r) => {
          const p=hydratedProperty(r);
          const v=valuationValues(r);
          const completion=parcelCompletion(r);
          const searchPayload=[
            r.titulo,r.codigo,r.id,r.comuna,r.region,r.sector,r.localidad,
            r.propietario_nombre,r.contacto_nombre,r.rol,r.rol_situacion,r.descripcion
          ].filter(Boolean).join(' ');
          const updated=new Date(r.updated_at||r.publicada_at||r.created_at||0).getTime()||0;
          return `
          <article class="catalog-card" data-parcel-card
            data-search-row="${esc(searchPayload)}"
            data-region="${esc(normText(p.region||r.region))}"
            data-commune="${esc(normText(p.comuna||r.comuna))}"
            data-commune-label="${esc(p.comuna||r.comuna||'')}"
            data-status="${esc(normText(r.estado||r.estado_publicacion))}"
            data-valuation="${v.technical?'with':'without'}"
            data-completion="${completion.score}"
            data-price="${Number(p.precio_publicado||0)}"
            data-area="${Number(p.superficie_m2||0)}"
            data-tpl="${Number(v.suggested||v.technical||0)}"
            data-updated="${updated}">
            <div class="catalog-card-media">${previewImage(r, 'parcela')}<span class="catalog-state">${esc(r.estado || 'sin estado')}</span><span class="catalog-count">${Number(r.total_imagenes || 0)} fotos</span></div>
            <div class="catalog-card-body">
              <div class="parcel-card-topline"><small>${esc(r.codigo || r.id || '')}</small><span class="parcel-completion ${completion.score<60?'is-critical':completion.score<100?'is-pending':'is-complete'}">${completion.score}% completa</span></div>
              <div class="parcel-completion-track"><i style="width:${completion.score}%"></i></div>
              ${crmCommercialBadge(r)}<h3>${esc(r.titulo || 'Parcela sin título')}</h3>
              <p>${esc([p.comuna||r.comuna,p.region||r.region].filter(Boolean).join(' · '))}</p>
              <div class="catalog-facts"><b>${Number(p.superficie_m2 || 0).toLocaleString('es-CL')} m²</b><b>${fmtMoney(p.precio_publicado)}</b></div>
              ${v.technical ? `<div class="crm-valuation-summary"><span><small>TPL Tasador</small><b>${fmtMoney(v.technical)}</b></span><span><small>TPL Tasador Comunal</small><b>${fmtMoney(v.suggested)}</b></span><span><small>Base Comunal</small><b>${v.communal?fmtMoney(v.communal):'Sin muestra'}</b></span><span><small>Valor de Apuro</small><b>${fmtMoney(v.urgency)}</b></span></div>` : '<div class="crm-valuation-empty">Aún sin tasación registrada</div>'}
              ${valuationExplanation(r)}
              <div class="catalog-actions catalog-actions--primary">
                <a class="primary-link" href="${appPath(`parcela.html?id=${encodeURIComponent(r.codigo || r.id)}`)}" target="_blank" rel="noopener">Ver propiedad</a>
                <button class="tasar-basic-btn" data-crm-tasar-basic="${esc(r.id)}">Tasar</button>
                <button class="report-premium-btn" data-premium-report="${esc(r.id)}" ${propertyHasValuation(r)?'':'disabled title="Primero debes tasar esta propiedad"'}>Informe Premium</button>
                <details class="catalog-more"><summary>Más</summary><div>
                  <button class="nav-btn detail-btn" data-preview-key="parcelas" data-preview-id="${esc(r.id)}">Vista CRM</button>
                  <button class="nav-btn" data-crm-tasar-full="${esc(r.id)}">Completar datos y tasar</button>
                  <button class="studio-mini-btn" data-studio-key="parcelas" data-studio-id="${esc(r.id)}">TPL Studio</button>
                </div></details>
              </div>
            </div>
          </article>`}).join('') || '<div class="empty">No hay parcelas en Supabase.</div>'}
      </div>
      <div id="parcelFilterEmpty" class="empty parcel-filter-empty" hidden>No encontramos parcelas que coincidan con estos filtros.</div>`;
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
    body.innerHTML = `<div class="preview-hero">${media}</div><div class="preview-content"><small>${esc(record.codigo || record.source_legacy_id || '')}</small><h2>${esc(titleText || 'Sin título')}</h2><p>${esc(record.descripcion || 'Sin descripción disponible.')}</p><div class="preview-stats"><span><small>Ubicación / proveedor</small><b>${esc(isHouse ? (record.nombre_proveedor_pendiente || 'Por confirmar') : [record.comuna,record.region].filter(Boolean).join(' · '))}</b></span><span><small>Superficie</small><b>${esc(record.superficie_m2 || '—')} m²</b></span><span><small>Precio</small><b>${fmtMoney(isHouse ? record.precio_base : record.precio_publicado)}</b></span><span><small>Estado</small><b>${esc(record.estado_publicacion || record.estado || '—')}</b></span></div>${!isHouse ? `<a class="primary-link preview-public-link" href="${appPath(`parcela.html?id=${encodeURIComponent(record.codigo || record.id)}`)}" target="_blank" rel="noopener">Abrir anuncio público</a>` : ''}</div>`;
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
    if (view === 'parcelas') requestAnimationFrame(applyParcelFilters);
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
    const parcelClear = event.target.closest('[data-parcel-clear]');
    if (parcelClear) {
      state.parcelFilters = { query:'', region:'', commune:'', status:'', valuation:'', completeness:'', sort:'recent' };
      render('parcelas');
      return;
    }
    const parcelQuick = event.target.closest('[data-parcel-quick]');
    if (parcelQuick) {
      const quick = parcelQuick.dataset.parcelQuick;
      if (quick === 'without-valuation') state.parcelFilters.valuation = 'without';
      if (quick === 'pending') state.parcelFilters.completeness = 'pending';
      if (quick === 'published') state.parcelFilters.status = 'publicada';
      render('parcelas');
      return;
    }
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
      openCrmTasador(record, { auto: true, openReport: false, mode: 'rapida' });
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
    if (event.target.id === 'search' && state.current === 'parcelas') {
      state.parcelFilters.query = event.target.value || '';
      applyParcelFilters();
      return;
    }
    if (event.target.id !== 'search') return;
    const q = normText(event.target.value);
    content.querySelectorAll('[data-search-row]').forEach((row) => {
      row.hidden = q && !normText(row.dataset.searchRow).includes(q);
    });
  });

  content?.addEventListener('change', (event) => {
    if (state.current !== 'parcelas') return;
    const map = {
      parcelRegionFilter: 'region',
      parcelCommuneFilter: 'commune',
      parcelStatusFilter: 'status',
      parcelValuationFilter: 'valuation',
      parcelCompletenessFilter: 'completeness',
      parcelSortFilter: 'sort'
    };
    const key = map[event.target.id];
    if (!key) return;
    state.parcelFilters[key] = event.target.value || '';
    if (key === 'region') state.parcelFilters.commune = '';
    applyParcelFilters();
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
    state.activeTasadorPropertyId = null;
    if (frame) frame.src = 'about:blank';
  });

  window.addEventListener('message', async (event) => {
    const frame = document.querySelector('#crmTasadorFrame');
    if (event.origin !== window.location.origin || event.source !== frame?.contentWindow || event.data?.type !== 'TPL_TASACION_GUARDADA') return;
    const tasacionId = String(event.data.tasacion_id || '');
    const propertyId = String(event.data.propiedad_id || '');
    if (!tasacionId || !propertyId) {
      statusBadge('La tasación no fue confirmada por Supabase', 'danger');
      return;
    }
    if (state.handledTasaciones.has(tasacionId)) return;
    state.handledTasaciones.add(tasacionId);
    let confirmed = null;
    try {
      confirmed = await window.TPLDataService.getLatestCrmValuation?.(propertyId);
    } catch (error) {
      console.error('No fue posible verificar la tasación en Supabase.', error);
    }
    if (!confirmed || String(confirmed.id) !== tasacionId || String(confirmed.propiedad_id) !== propertyId) {
      statusBadge('La tasación fue calculada, pero aún no está vinculada a esta propiedad', 'danger');
      return;
    }
    state.recentValuations.set(propertyId, confirmed);
    document.querySelector('#crmTasadorDialog')?.close();
    state.activeTasadorPropertyId = null;
    if (frame) frame.src = 'about:blank';
    await loadSnapshot();
    render('parcelas');
    const record = detailFor('parcelas', propertyId);
    if (record && event.data.open_report === true) await openPremiumReport(record, { force: true });
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
