(() => {
  'use strict';

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const money = (v) => Number(v) > 0 ? new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)) : 'A consultar';
  const dialog = () => document.querySelector('#studioToolsDialog');
  const body = () => document.querySelector('#studioToolsContent');
  let current = null;

  const entityType = (source) => {
    if (/operaciones|proyectos/.test(source)) return 'proyecto';
    if (/publicaciones/.test(source)) return 'publicacion';
    if (/parcelas|propiedades/.test(source)) return 'propiedad';
    if (/duenos|compradores|partners/.test(source)) return 'actor';
    return 'propiedad';
  };

  const entityId = (record) => record?.id || record?.proyecto_id || record?.propiedad_id || record?.publicacion_id || record?.actor_id || record?.dueno_id || record?.comprador_id || null;

  function summary(record) {
    return {
      title: record?.titulo || record?.propiedad_titulo || record?.nombre || record?.codigo || 'Propiedad TPL',
      commune: record?.comuna || record?.sector || 'Chile',
      area: record?.superficie_m2 || record?.area || null,
      price: record?.precio_total || record?.precio_publicado || record?.valor_estimado || null,
      description: record?.descripcion || record?.detalle || record?.diagnostico?.resumen || '',
      image: record?.imagen_principal || record?.foto || record?.portada_url || null,
      type: record?.tipo || 'propiedad'
    };
  }

  async function open(record, source) {
    current = { record, source, type: entityType(source), id: entityId(record) };
    const data = summary(record);
    document.querySelector('#studioToolsTitle').textContent = data.title;
    body().innerHTML = `
      <section class="studio-context-card">
        ${data.image ? `<img src="${esc(data.image)}" alt="${esc(data.title)}">` : '<div class="studio-context-placeholder"><span>TP</span></div>'}
        <div><small>${esc(data.type)} · ${esc(data.commune)}</small><h3>${esc(data.title)}</h3><p>${data.area ? Number(data.area).toLocaleString('es-CL')+' m² · ' : ''}${money(data.price)}</p></div>
      </section>
      <div class="studio-tool-grid">
        <button class="studio-tool-card" data-studio-tool="pdf"><span class="line-icon">▱</span><strong>Informe PDF premium</strong><small>Vista previa, imprimir o guardar en PDF.</small></button>
        <button class="studio-tool-card" data-studio-tool="landing"><span class="line-icon">◇</span><strong>Crear landing premium</strong><small>Abre TPL Studio con los datos ya cargados.</small></button>
        <button class="studio-tool-card" data-studio-tool="campaign"><span class="line-icon">◫</span><strong>Campaña completa</strong><small>Video, redes, blog, PDF y WhatsApp.</small></button>
      </div>
      <div class="studio-options">
        <h4>Contenido del informe</h4>
        <label><input type="checkbox" data-report-section="price" checked> Precio y presupuesto</label>
        <label><input type="checkbox" data-report-section="valuation" checked> Tasación y lectura TPL</label>
        <label><input type="checkbox" data-report-section="location" checked> Ubicación y cercanías</label>
        <label><input type="checkbox" data-report-section="house" checked> Casa y proyecto, cuando corresponda</label>
        <label><input type="checkbox" data-report-section="contact"> Datos de contacto</label>
      </div>`;
    dialog().showModal();
  }

  function selectedSections() {
    return Object.fromEntries([...body().querySelectorAll('[data-report-section]')].map((x) => [x.dataset.reportSection, x.checked]));
  }

  function studioUrl(mode='landing') {
    const params = new URLSearchParams({ tipo: current.type, id: current.id || '', modo: mode, origen: 'crm' });
    return `../studio/index.html?${params.toString()}`;
  }

  async function getFullContext() {
    if (!current?.id || !window.TPLStudioService?.getContext) return null;
    try { return await window.TPLStudioService.getContext(current.type, current.id); }
    catch (error) { console.warn('TPL Studio CRM: contexto completo no disponible.', error); return null; }
  }

  function flattenContext(context) {
    const prop = context?.propiedad || context?.publicacion?.datos || current.record || {};
    const project = context?.proyecto || (context?.proyectos || [])[0] || {};
    const actor = context?.propietario || context?.publicador || context?.comprador || {};
    const imgs = context?.imagenes || prop?.imagenes || [];
    const firstImage = imgs[0]?.url || imgs[0]?.public_url || imgs[0]?.archivo_url || summary(current.record).image;
    return { prop, project, actor, imgs, firstImage };
  }

  async function printReport() {
    const context = await getFullContext();
    const { prop, project, actor, imgs, firstImage } = flattenContext(context);
    const sections = selectedSections();
    const title = prop.titulo || project.nombre || summary(current.record).title;
    const house = project.casa_configuracion || prop.casa_datos || {};
    const total = project.valor_estimado || current.record.precio_total || prop.precio_publicado;
    const features = [
      ['Superficie', prop.superficie_m2 ? Number(prop.superficie_m2).toLocaleString('es-CL')+' m²' : '—'],
      ['Comuna', prop.comuna || '—'], ['Sector', prop.sector || '—'], ['Rol', prop.rol_situacion || '—'],
      ['Agua', prop.agua || '—'], ['Electricidad', prop.electricidad || '—'], ['Acceso', prop.acceso || '—']
    ];
    const reportHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow,noarchive"><title>Informe TPL · ${esc(title)}</title><style>
      @page{size:A4;margin:13mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#10384e;background:#fff}.cover{min-height:260mm;display:flex;flex-direction:column;justify-content:flex-end;padding:22mm;background:linear-gradient(180deg,#063b5c22,#063b5cee),url('${esc(firstImage||'')}') center/cover;color:#fff;page-break-after:always}.brand{font-size:12px;letter-spacing:3px;font-weight:800}.cover h1{font-size:42px;line-height:1.05;margin:16px 0}.cover p{font-size:18px;max-width:620px}.page{padding:4mm 0}.kicker{font-size:11px;letter-spacing:2px;color:#b28600;font-weight:800}.page h2{font-size:28px;margin:7px 0 18px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.fact{border:1px solid #dce7ed;border-radius:12px;padding:14px}.fact span{display:block;color:#667d89;font-size:11px;text-transform:uppercase}.fact strong{display:block;margin-top:5px}.price{background:#063b5c;color:#fff;padding:20px;border-radius:16px;margin:18px 0}.price strong{font-size:30px}.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.gallery img{width:100%;height:190px;object-fit:cover;border-radius:10px}.note{background:#f5f9fb;border-left:4px solid #e3b207;padding:14px;margin:14px 0}.footer{margin-top:28px;padding-top:12px;border-top:1px solid #dce7ed;font-size:11px;color:#667d89}@media print{button{display:none}}
    </style></head><body>
      <section class="cover"><div class="brand">TU PARCELA LISTA · INFORME PREMIUM</div><h1>${esc(title)}</h1><p>${esc(prop.comuna||'Chile')} · ${prop.superficie_m2?Number(prop.superficie_m2).toLocaleString('es-CL')+' m²':''}</p></section>
      <section class="page"><div class="kicker">RESUMEN DEL PROYECTO</div><h2>Una lectura completa para tomar mejores decisiones</h2>
      ${sections.price?`<div class="price"><span>Valor informado / estimado</span><br><strong>${money(total)}</strong></div>`:''}
      <div class="grid">${features.map(([a,b])=>`<div class="fact"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('')}</div>
      ${prop.descripcion?`<div class="note">${esc(prop.descripcion)}</div>`:''}
      ${sections.house && Object.keys(house).length?`<h2>Vivienda y configuración</h2><div class="grid">${Object.entries(house).slice(0,10).map(([k,v])=>`<div class="fact"><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(typeof v==='object'?JSON.stringify(v):v)}</strong></div>`).join('')}</div>`:''}
      ${sections.location?`<h2>Ubicación, cercanías y atributos</h2><div class="note">${esc(JSON.stringify(prop.cercanias||prop.atributos_naturales||{},null,2))}</div>`:''}
      ${sections.valuation?`<h2>Lectura TPL</h2><div class="note">Informe orientativo construido con antecedentes disponibles en TPL. Debe validarse con revisión legal, técnica y comercial antes de una decisión.</div>`:''}
      ${imgs.length?`<h2>Galería</h2><div class="gallery">${imgs.slice(0,6).map(i=>`<img src="${esc(i.url||i.public_url||i.archivo_url||'')}" alt="">`).join('')}</div>`:''}
      ${sections.contact?`<h2>Contacto</h2><div class="fact"><strong>${esc(actor.nombre||'')}</strong><br>${esc(actor.email||'')} · ${esc(actor.telefono||'')}</div>`:''}
      <div class="footer">Generado por TPL Studio · ${new Intl.DateTimeFormat('es-CL',{dateStyle:'long'}).format(new Date())}</div></section>
      <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    const reportBlob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const reportUrl = URL.createObjectURL(reportBlob);
    const reportWindow = window.open(reportUrl, '_blank', 'noopener,noreferrer');
    if (!reportWindow) {
      URL.revokeObjectURL(reportUrl);
      return alert('El navegador bloqueó la vista previa. Habilita ventanas emergentes para el CRM.');
    }
    // El documento ya fue entregado al navegador; liberamos la URL temporal sin conservar datos en historial.
    window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000);
    try {
      if (window.TPLStudioService?.saveCampaign) {
        const campaign = await window.TPLStudioService.saveCampaign({ name:`Informe · ${title}`, subjectType:current.type, subjectId:current.id, goal:'informe_comercial', channels:['pdf'], outputs:[] });
        await window.TPLStudioService.saveOutput?.({ campaignId:campaign.id, type:'informe_pdf', status:'generado', title:`Informe premium · ${title}`, metadata:{source:'crm',sections} });
      }
    } catch (error) { console.warn('TPL Studio CRM: no se pudo registrar el informe.', error); }
  }

  body()?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-studio-tool]');
    if (!button) return;
    if (button.dataset.studioTool === 'pdf') printReport();
    else window.location.href = studioUrl(button.dataset.studioTool === 'campaign' ? 'campana' : 'landing');
  });
  document.querySelector('#studioToolsClose')?.addEventListener('click', () => dialog().close());
  window.TPLCrmStudio = { open };
})();
