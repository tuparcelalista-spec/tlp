(() => {
  'use strict';

  const state = {
    snapshot: null,
    current: 'inicio',
    loading: false,
    uf: null
  };

  const groups = [
    ['Inicio', [
      ['inicio', 'Inicio'],
      ['revision', 'Revisión']
    ]],
    ['Personas', [
      ['compradores', 'Compradores'],
      ['duenos', 'Dueños'],
      ['partners', 'Partners']
    ]],
    ['Catálogo', [
      ['parcelas', 'Parcelas'],
      ['parcelas-casas', 'Parcelas + casas'],
      ['casas', 'Casas canónicas']
    ]],
    ['Operación', [
      ['operaciones', 'Operaciones'],
      ['tareas', 'Tareas']
    ]],
    ['Inteligencia', [
      ['tasaciones', 'Tasaciones'],
      ['analytics', 'Analytics'],
      ['studio', 'TPL Studio'],
      ['eventos', 'Actividad']
    ]],
    ['Comunicación', [
      ['mensajes', 'Mensajes / Automatizaciones']
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


  function studioView() {
    return `
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

    const studio = event.target.closest('[data-studio-key]');
    if (studio) {
      const record = detailFor(studio.dataset.studioKey, studio.dataset.studioId);
      if (!record) return alert('No pudimos recuperar el registro para TPL Studio.');
      window.TPLCrmStudio?.open(record, studio.dataset.studioKey);
      return;
    }

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

  document.querySelector('#saveHouse')?.addEventListener('click', async () => {
    const button=document.querySelector('#saveHouse'); button.disabled=true; button.textContent='Guardando…';
    try {
      const val=id=>document.querySelector(id)?.value?.trim()||'';
      await window.TPLDataService.saveCrmHouse({id:val('#houseId')||null,nombre:val('#houseName'),codigo:val('#houseCode')||null,superficie_m2:val('#houseM2')||null,dormitorios:val('#houseBedrooms')||null,banos:val('#houseBathrooms')||null,pisos:val('#houseFloors')||null,material:val('#houseMaterial')||null,precio_base:val('#housePrice')||null,estado:val('#houseState'),proveedor_estado:val('#houseProviderState'),nombre_proveedor_pendiente:val('#houseProviderName')||null,partner_actor_id:val('#housePartnerId')||null,tipo_relacion:val('#houseRelation'),plazo_estimado_dias:val('#houseDays')||null,garantia:val('#houseWarranty')||null,descripcion:val('#houseDescription')||null,imagenes:lines('#houseImages'),planos:lines('#housePlans')});
      document.querySelector('#houseDialog')?.close(); await loadSnapshot(); render('casas');
    } catch(error){console.error(error);alert(error?.message||'No fue posible guardar la casa.')} finally {button.disabled=false;button.textContent='Guardar y sincronizar';}
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
