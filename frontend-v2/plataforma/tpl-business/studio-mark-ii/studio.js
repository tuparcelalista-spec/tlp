(function(){
  'use strict';
  const brain=window.TPLBrain;
  const actors=brain.read('actors');
  const actorSelect=document.querySelector('#actorSelect');
  const roleBadge=document.querySelector('#roleBadge');
  const nav=document.querySelector('#studioNav');
  const content=document.querySelector('#studioContent');
  const summary=document.querySelector('#summary');
  const dialog=document.querySelector('#approvalDialog');
  const preview=document.querySelector('#approvalPreview');
  let currentActor=actors[0];
  let currentView='inicio';
  let pendingDraft=null;

  const tabs=[['inicio','Diagnóstico'],['marca','Mi marca'],['landing','Landing'],['contenido','Contenido'],['campanas','Campañas'],['audiovisual','Foto y video'],['resultados','Resultados'],['aprobaciones','Aprobaciones']];
  actorSelect.innerHTML=actors.map(a=>`<option value="${a.id}">${a.name} · ${(a.roles||[]).join(', ')}</option>`).join('');
  nav.innerHTML=tabs.map(([id,label])=>`<button class="studio-tab" data-view="${id}">${label}</button>`).join('');

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const role=()=>currentActor.roles?.[0]||'usuario';
  const profileScore=()=>Math.min(100,45+(currentActor.email?10:0)+(currentActor.commune?10:0)+(currentActor.services?.length||0)*8+(currentActor.differentiator?15:0));
  const approvals=()=>brain.read('approvals').filter(a=>a.actorId===currentActor.id);
  const studioProfiles=()=>brain.read('studio').filter(a=>a.actorId===currentActor.id);

  function renderSummary(){
    summary.innerHTML=[['Puntaje de perfil',`${profileScore()}%`],['Servicios activos',currentActor.services?.length||0],['Borradores',approvals().length],['Rol principal',role()]].map(([l,v])=>`<article class="metric"><span>${esc(l)}</span><strong>${esc(v)}</strong></article>`).join('');
    roleBadge.textContent=`Vista: ${role()} · ${currentActor.kind}`;
  }

  function recommendations(){
    const result=[];
    if(!currentActor.differentiator)result.push(['Diferenciador poco definido','Agrega una diferencia concreta: garantía, maquinaria propia, plazo o especialidad verificable.']);
    if(!currentActor.services?.includes('studio_mark_ii'))result.push(['Studio no está activado en este perfil','Puedes preparar borradores, pero la publicación dependerá del servicio activo.']);
    if(role()==='propietario')result.push(['Mejora comercial de propiedad','Usa fotografías actuales y explica con transparencia qué mejoras necesita la parcela.']);
    if(role()==='partner')result.push(['Portafolio técnico','Publica al menos tres trabajos terminados con ubicación, problema resuelto y resultado.']);
    if(role()==='comprador')result.push(['Proyecto personal','Studio puede ayudarte a documentar y compartir el avance de tu proyecto, no a promocionarte públicamente.']);
    return result;
  }

  function home(){return `<article class="panel"><h2>Diagnóstico de comunicación</h2><p>Studio revisa la información disponible en CRM y recomienda la próxima acción más útil para este actor.</p><div class="grid"><div class="card"><span class="score">${profileScore()}%</span><h3>Perfil preparado</h3><div class="bar"><i style="width:${profileScore()}%"></i></div><p>La calidad mejora cuando la información es específica, verificable y respaldada con trabajos o propiedades reales.</p></div><div class="card"><h3>Próxima acción</h3><p>${role()==='partner'?'Documentar un trabajo reciente con tres fotografías y una explicación concreta.':role()==='propietario'?'Actualizar datos, fotografías y necesidades reales de la propiedad.':'Ordenar el objetivo, presupuesto y próximos pasos del proyecto.'}</p><div class="action"><button class="primary" data-view="contenido">Crear contenido</button><button class="secondary" data-view="landing">Revisar Landing</button></div></div></div>${recommendations().map(([t,d])=>`<div class="recommendation"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}</article>`}

  function brand(){return `<article class="panel"><h2>Mi marca</h2><p>La marca utiliza datos del CRM y solo solicita información que todavía no existe.</p><div class="grid"><label class="field">Nombre visible<input id="brandName" value="${esc(currentActor.name)}"></label><label class="field">Especialidad principal<input id="brandSpecialty" value="${esc(currentActor.services?.[0]||role())}"></label></div><label class="field">Diferencia concreta<textarea id="brandDiff" placeholder="Ejemplo: Entrego garantía escrita y cuento con maquinaria propia.">${esc(currentActor.differentiator||'')}</textarea></label><label class="field">Promesa al cliente<textarea id="brandPromise" placeholder="Qué resultado concreto puede esperar un cliente.">${esc(currentActor.brandPromise||'')}</textarea></label><div class="action"><button class="primary" id="saveBrand">Guardar en perfil maestro</button></div></article>`}

  function landing(){const draft=studioProfiles().find(x=>x.type==='landing');return `<article class="panel"><h2>Landing inteligente</h2><p>Studio crea una estructura según el rol y los datos existentes. Primero genera un borrador; después se revisa y aprueba.</p><div class="grid"><div class="card"><h3>Estructura recomendada</h3><p>${role()==='partner'?'Presentación · Servicios · Cómo trabajo · Portafolio · Zonas · Solicitar presupuesto':role()==='propietario'?'Propiedades · Ventajas · Información verificada · Visitas · Contacto':'Proyecto · Objetivo · Avance · Documentos · Próximo paso'}</p></div><div class="card"><h3>Estado</h3><span class="pill">${draft?'Borrador existente':'Sin generar'}</span><p>${draft?'Última actualización guardada localmente.':'Genera una propuesta usando los datos actuales.'}</p></div></div><div class="action"><button class="primary" id="generateLanding">Generar borrador</button>${draft?'<button class="secondary" id="previewLanding">Ver borrador</button>':''}</div></article>`}

  function contentCreator(){return `<article class="panel"><h2>Creador de contenido</h2><p>Cuenta un hecho real. Studio lo transforma en piezas adaptadas a cada canal.</p><label class="field">¿Qué ocurrió en tu negocio o proyecto?<textarea id="contentFact" placeholder="Ejemplo: Terminamos un cerco de 240 metros en Quillón, con postes impregnados y entrega en cinco días."></textarea></label><div class="grid"><label class="field">Objetivo<select id="contentGoal"><option>Conseguir consultas</option><option>Mostrar experiencia</option><option>Vender una propiedad</option><option>Informar un avance</option></select></label><label class="field">Canal<select id="contentChannel"><option>Facebook</option><option>Instagram</option><option>LinkedIn</option><option>Landing</option><option>Correo</option></select></label></div><div class="action"><button class="primary" id="generateContent">Preparar publicación</button></div></article>`}

  function campaigns(){return `<article class="panel"><h2>Director de campañas</h2><p>Prepara la estrategia, segmentación y presupuesto. El lanzamiento siempre requiere aprobación.</p><div class="grid"><label class="field">Objetivo<select id="campaignGoal"><option>Conseguir clientes</option><option>Conseguir visitas</option><option>Vender una parcela</option><option>Promocionar un servicio</option></select></label><label class="field">Canal<select id="campaignChannel"><option>Google Ads</option><option>Facebook e Instagram</option><option>Correo</option></select></label><label class="field">Zona<input id="campaignArea" value="${esc(currentActor.commune||'')}"></label><label class="field">Presupuesto CLP<input id="campaignBudget" type="number" min="10000" step="5000" value="80000"></label></div><div class="action"><button class="primary" id="prepareCampaign">Preparar campaña</button></div></article>`}

  function audiovisual(){return `<article class="panel"><h2>Director audiovisual</h2><p>Studio identifica el material que falta antes de sugerir una producción.</p><div class="grid"><div class="card"><h3>Fotografías recomendadas</h3><p>Una portada horizontal, una imagen trabajando, un resultado final, equipo o herramientas y un detalle diferenciador.</p></div><div class="card"><h3>Video recomendado</h3><p>${role()==='partner'?'Video de 35 a 50 segundos: problema, proceso, resultado y llamada a cotizar.':role()==='propietario'?'Recorrido breve: acceso, superficie, servicios, entorno y mejoras pendientes.':'Resumen del proyecto y sus avances más importantes.'}</p></div></div><label class="field">Tema del próximo video<input id="videoTopic" placeholder="Ejemplo: Cómo instalamos un cerco agrícola resistente"></label><div class="action"><button class="primary" id="generateScript">Generar guion</button></div></article>`}

  function results(){return `<article class="panel"><h2>Resultados</h2><p>Esta etapa queda preparada para datos reales de Landing, campañas, WhatsApp, formularios y videos.</p><div class="summary"><article class="metric"><span>Visitas Landing</span><strong>—</strong></article><article class="metric"><span>Consultas</span><strong>—</strong></article><article class="metric"><span>WhatsApp</span><strong>—</strong></article><article class="metric"><span>Conversiones</span><strong>—</strong></article></div><div class="recommendation"><b>Fuente pendiente</b><span>Los números no se simulan. Aparecerán cuando Analytics, CRM y las plataformas publicitarias estén conectadas.</span></div></article>`}

  function approvalQueue(){const items=approvals();return `<article class="panel"><h2>Cola de aprobaciones</h2><p>Ninguna acción externa se ejecuta sin una decisión explícita.</p><div class="queue">${items.length?items.map(item=>`<div class="queue-item"><div><strong>${esc(item.title)}</strong><small>${esc(item.channel||item.kind)} · ${new Date(item.createdAt).toLocaleString('es-CL')}</small></div><span class="pill">${esc(item.status)}</span></div>`).join(''):'<div class="card"><p>No hay borradores pendientes para este actor.</p></div>'}</div></article>`}

  function render(){renderSummary();document.querySelectorAll('.studio-tab').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));content.innerHTML=({inicio:home,marca:brand,landing,contenido:contentCreator,campanas,audiovisual,resultados,aprobaciones:approvalQueue}[currentView]||home)();bindView();}

  function openApproval(draft){pendingDraft=draft;preview.textContent=draft.content;dialog.showModal();}
  function saveDraft(data){const approval=brain.createApproval({actorId:currentActor.id,...data});openApproval(approval);return approval;}

  function bindView(){
    content.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;render();});
    const saveBrand=document.querySelector('#saveBrand');if(saveBrand)saveBrand.onclick=()=>{currentActor=brain.update('actors',currentActor.id,{name:brandName.value.trim()||currentActor.name,differentiator:brandDiff.value.trim(),brandPromise:brandPromise.value.trim(),services:[...new Set([...(currentActor.services||[]),brandSpecialty.value.trim()].filter(Boolean))]})||currentActor;alert('Perfil maestro actualizado.');render();};
    const generateLanding=document.querySelector('#generateLanding');if(generateLanding)generateLanding.onclick=()=>{const structure=role()==='partner'?['Portada con propuesta de valor','Servicios','Cómo trabajo','Trabajos realizados','Zonas de cobertura','Formulario de presupuesto']:role()==='propietario'?['Propiedades activas','Información verificada','Virtudes y necesidades','Visitas y ofertas','Contacto']:['Objetivo del proyecto','Decisiones','Avance','Documentos','Próximo paso'];const profile=brain.addStudioProfile({actorId:currentActor.id,type:'landing',status:'borrador',structure});saveDraft({kind:'landing',channel:'Landing',title:`Landing de ${currentActor.name}`,content:`BORRADOR DE LANDING\n\nNombre: ${currentActor.name}\nRol: ${role()}\nZona: ${currentActor.commune||'Por definir'}\nDiferenciador: ${currentActor.differentiator||'Pendiente'}\n\nSecciones:\n- ${structure.join('\n- ')}\n\nID: ${profile.id}`});};
    const previewLanding=document.querySelector('#previewLanding');if(previewLanding){const draft=studioProfiles().find(x=>x.type==='landing');previewLanding.onclick=()=>openApproval({content:`Estructura guardada:\n- ${(draft.structure||[]).join('\n- ')}`});}
    const generateContent=document.querySelector('#generateContent');if(generateContent)generateContent.onclick=()=>{const fact=contentFact.value.trim();if(!fact)return alert('Escribe primero un hecho real.');const channel=contentChannel.value;const text=`${currentActor.name}\n\n${fact}\n\nEste trabajo refleja ${currentActor.differentiator||'nuestro compromiso con un resultado claro y verificable'}.\n\n${contentGoal.value}. Contáctanos en ${currentActor.commune||'nuestra zona de atención'}.`;saveDraft({kind:'social_post',channel,title:`Contenido para ${channel}`,content:text});};
    const prepareCampaign=document.querySelector('#prepareCampaign');if(prepareCampaign)prepareCampaign.onclick=()=>{const budget=Number(campaignBudget.value||0);if(budget<10000)return alert('Ingresa un presupuesto de al menos $10.000.');saveDraft({kind:'campaign',channel:campaignChannel.value,title:`Campaña: ${campaignGoal.value}`,content:`CAMPAÑA EN REVISIÓN\n\nActor: ${currentActor.name}\nObjetivo: ${campaignGoal.value}\nCanal: ${campaignChannel.value}\nZona: ${campaignArea.value}\nPresupuesto: ${new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(budget)}\n\nEstado: preparada, no publicada.\nRequiere conexión de cuenta, revisión de público, piezas y aprobación final.`});};
    const generateScript=document.querySelector('#generateScript');if(generateScript)generateScript.onclick=()=>{const topic=videoTopic.value.trim();if(!topic)return alert('Indica el tema del video.');saveDraft({kind:'video_script',channel:'Video',title:`Guion: ${topic}`,content:`GUION BREVE (40 SEGUNDOS)\n\n1. Apertura: ${topic}.\n2. Problema que resolvemos.\n3. Proceso real en 2 o 3 etapas.\n4. Resultado verificable.\n5. Diferencia concreta: ${currentActor.differentiator||'agregar diferenciador'}.\n6. Cierre: solicita información o presupuesto.`});};
  }

  nav.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){currentView=b.dataset.view;render();}});
  actorSelect.onchange=()=>{currentActor=actors.find(a=>a.id===actorSelect.value)||actors[0];currentView='inicio';render();};
  document.querySelector('#approveAction').onclick=e=>{e.preventDefault();if(pendingDraft?.id)brain.update('approvals',pendingDraft.id,{status:'aprobado_como_borrador'});dialog.close();currentView='aprobaciones';render();};
  render();
})();
