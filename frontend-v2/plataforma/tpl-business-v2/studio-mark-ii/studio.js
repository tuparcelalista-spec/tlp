(function(){
  'use strict';
  const actors = window.TPLBrain ? window.TPLBrain.read('actors') : [];
  const actorSelect = document.querySelector('#actorSelect');
  const roleBadge = document.querySelector('#roleBadge');
  const nav = document.querySelector('#studioNav');
  const content = document.querySelector('#studioContent');
  const summary = document.querySelector('#summary');
  const dialog = document.querySelector('#approvalDialog');
  const preview = document.querySelector('#approvalPreview');
  let currentActor = actors[0] || { id: 'demo', name: 'Demo' };
  let currentView = 'inicio';
  let pendingDraft = null;
  
  let dbDrafts = [];
  // null = "no medido". Con ceros, la pantalla mostraba un embudo en cero como
  // si la campana hubiera fracasado, cuando en realidad nadie estaba midiendo.
  let dbAnalytics = { impresiones: null, visitas: null, intencion_agendar: null, leads: null, visitas_agendadas: null, ventas: null, medido: false };

  const tabs = [['inicio','Diagnóstico'],['campanas','Kit de Campaña'],['audiovisual','Director Video'],['landing','Landing'],['resultados','Resultados'],['aprobaciones','Aprobaciones']];
  
  function initOptions() {
      actorSelect.innerHTML = actors.map(a => '<option value="' + a.id + '">' + a.name + ' · ' + (a.roles||[]).join(', ') + '</option>').join('');
      nav.innerHTML = tabs.map(([id,label]) => '<button class="studio-tab" data-view="' + id + '">' + label + '</button>').join('');
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const role = () => currentActor.roles?.[0] || 'usuario';
  
  async function loadActorData() {
    if (window.TPLDataService) {
       dbDrafts = await window.TPLDataService.getStudioDraftsByActor(currentActor.id);
       dbAnalytics = await window.TPLDataService.getActorAnalytics(currentActor.id, currentActor.propertyId);
    }
  }

  /**
   * Generacion de contenido.
   *
   * Antes esta funcion devolvia literalmente "TEXTO GENERADO POR IA
   * (Simulacion)" y el prompt pegado debajo. O sea, el partner apretaba
   * "generar", veia un bloque encabezado como salida de IA, y no habia ninguna
   * IA: era una plantilla fija. Ahora se llama a la funcion real que ya existe
   * en Supabase y, si no responde, se dice que no se pudo generar en vez de
   * entregar un texto de mentira.
   */
  async function generateStudioContent(prompt, type) {
    const cfg = window.TPLDataService?.config;
    if (!cfg?.url) throw new Error('No hay conexión con el asistente de TPL.');

    const prop = currentActor.prop_data || {};
    if (!prop.comuna || !(Number(prop.superficie) || Number(prop.superficie_total) || Number(prop.superficie_m2))) {
      throw new Error('Selecciona una propiedad con comuna y superficie para poder redactar.');
    }

    const res = await fetch(`${cfg.url}/functions/v1/gemini-redactar-aviso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${cfg.publishableKey}`,
      },
      body: JSON.stringify({
        propiedad: {
          tipo: prop.tipo || 'parcela',
          comuna: prop.comuna,
          localidad: prop.sector || prop.localidad || '',
          superficie: Number(prop.superficie || prop.superficie_total || prop.superficie_m2) || 0,
          suelo: prop.suelo || '',
          atributosNaturales: Array.isArray(prop.atributos_naturales) ? prop.atributos_naturales : [],
          terreno: {
            agua: prop.agua || '', luz: prop.electricidad || prop.luz || '',
            rol: prop.rol_situacion || '', acceso: prop.acceso || '',
            topografia: prop.topografia || '', vegetacion: prop.vegetacion || '',
            cierre: prop.cierre_perimetral || '',
          },
        },
        contexto: { formato: type, instrucciones: prompt },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      const motivos = {
        DATOS_INSUFICIENTES: 'Faltan antecedentes de la propiedad para poder redactar.',
        DEMASIADAS_SOLICITUDES: 'Hiciste varias solicitudes seguidas. Espera un momento.',
        IA_NO_DISPONIBLE: 'El asistente no está disponible ahora.',
        RESPUESTA_IA_INVALIDA: 'No pudimos redactar con estos datos.',
      };
      throw new Error(motivos[data?.error] || 'No pudimos generar el contenido.');
    }
    return `${data.titulo}\n\n${data.descripcion}`;
  }

  // FASE 4: DIAGNÓSTICO COMERCIAL
  function getCommercialDiagnostic() {
      const prop = currentActor.prop_data || {};
      let score = 0;
      let issues = [];
      let improvements = [];
      
      if (prop.precio) score += 20; else issues.push('Falta precio público.');
      if (prop.comuna || prop.region) score += 10; else issues.push('Ubicación incompleta.');
      if (prop.superficie_total) score += 10; else issues.push('Falta superficie total.');
      
      if (prop.virtudes_terreno || (prop.descripcion && prop.descripcion.length > 100)) {
          score += 30;
      } else {
          issues.push('Propuesta de valor débil (Sin descripción).');
          improvements.push('Agrega información sobre entrega inmediata, rol propio o accesos (Ficha Comercial).');
      }
      
      if (prop.imagenes && prop.imagenes.length >= 5) {
          score += 30;
      } else {
          issues.push('Menos de 5 fotografías cargadas.');
          improvements.push('Sube más imágenes destacando el entorno y los accesos.');
      }
      
      let badge = score >= 80 ? 'Excelente' : score >= 50 ? 'Regular' : 'Deficiente';
      return { score, badge, issues, improvements };
  }

  function renderSummary() {
    const diag = getCommercialDiagnostic();
    summary.innerHTML = [
        ['Puntaje Comercial', diag.score + '/100'], 
        ['Estado', diag.badge], 
        ['Borradores', dbDrafts.length], 
        ['Rol principal', role()]
    ].map(([l,v]) => '<article class="metric"><span>' + esc(l) + '</span><strong>' + esc(v) + '</strong></article>').join('');
    roleBadge.textContent = 'Vista: ' + role() + ' · ' + (currentActor.kind || 'Generico');
  }

  function home() { 
      const diag = getCommercialDiagnostic();
      return '<article class="panel">' +
      '<h2>Diagnóstico Comercial de la Parcela</h2>' +
      '<p>Studio revisa la información de la ficha y evalúa su potencial de captación de Leads reales.</p>' +
      '<div class="grid">' +
          '<div class="card">' +
              '<span class="score">' + diag.score + '/100</span>' +
              '<h3>Completitud y Potencial</h3>' +
              '<div class="bar"><i style="width:' + diag.score + '%"></i></div>' +
              '<p>Nivel de preparación: <strong>' + diag.badge + '</strong></p>' +
          '</div>' +
          '<div class="card">' +
              '<h3 style="color:#b91c1c;">Brechas Detectadas</h3>' +
              '<ul style="margin-left:20px; font-size:0.9rem;">' +
                 diag.issues.map(i => '<li>' + esc(i) + '</li>').join('') +
              '</ul>' +
              '<h3 style="color:#047857; margin-top:1rem;">Acciones Recomendadas</h3>' +
              '<ul style="margin-left:20px; font-size:0.9rem;">' +
                 (diag.improvements.length ? diag.improvements.map(i => '<li>' + esc(i) + '</li>').join('') : '<li>La ficha está óptima para campañas.</li>') +
              '</ul>' +
              '<div class="action" style="margin-top:1rem;">' +
                  '<button class="primary" data-view="campanas">Generar Kit Comercial</button>' +
              '</div>' +
          '</div>' +
      '</div>' +
      '</article>'; 
  }
  
  function landing() { return '<article class="panel"><h2>Landing inteligente</h2><p>Genera estructura y textos con IA.</p><div class="action"><button class="primary" id="generateLanding">Generar borrador de Landing</button></div></article>'; }
  
  // FASE 5: KIT DE CAMPAÑA
  function campaigns() { 
      return '<article class="panel">' +
      '<h2>Generador de Kit Comercial (Fase 5)</h2>' +
      '<p>En lugar de generar piezas sueltas, crea una estrategia completa de 10 elementos que se enviarán a la Cola de Aprobaciones.</p>' +
      '<div class="card" style="background:#f8fafc; border: 1px solid #e2e8f0;">' +
          '<h3>Piezas a generar:</h3>' +
          '<ul style="font-size:0.9rem; columns: 2; margin-bottom: 20px;">' +
              '<li>✅ Propuesta de Valor</li>' +
              '<li>✅ Copy Instagram & Facebook</li>' +
              '<li>✅ Post LinkedIn Inversor</li>' +
              '<li>✅ Anuncio Meta Ads</li>' +
              '<li>✅ Anuncio Google Ads (Search)</li>' +
              '<li>✅ Guion Reel (30s)</li>' +
              '<li>✅ Mensaje Inicial WhatsApp</li>' +
              '<li>✅ Seguimiento Comercial</li>' +
          '</ul>' +
          '<div id="kitProgress" style="display:none; color:#047857; font-weight:bold; margin-bottom:15px;">Generando 1/8...</div>' +
          '<div class="action"><button class="primary" id="generateMegaKit">Generar Kit Completo con IA</button></div>' +
      '</div>' +
      '</article>'; 
  }
  
  function audiovisual() { 
      return '<article class="panel">' +
      '<h2>Director Audiovisual (IA)</h2>' +
      '<p>Genera guiones altamente persuasivos basados en 5 estructuras de neuromarketing inmobiliario.</p>' +
      '<div class="grid">' +
        '<label class="field">Tipo de Guion (Fórmula)' +
          '<select id="scriptType">' +
            '<option value="flash">Tipo 1: Oportunidad Flash (Bajo Precio / Urgencia)</option>' +
            '<option value="familiar">Tipo 2: El Refugio Familiar (Vida tranquila / Servicios)</option>' +
            '<option value="premium">Tipo 3: La Joya Premium (Alto Valor / Exclusividad)</option>' +
            '<option value="inversor">Tipo 4: El Terreno Inversor (ROI / Turismo)</option>' +
            '<option value="lista">Tipo 5: Lista para Construir (Urbanizada / Sin trámites)</option>' +
          '</select>' +
        '</label>' +
        '<label class="field">Duración objetivo' +
          '<select id="scriptDuration">' +
            '<option value="30s">30 Segundos (Reels/TikTok/Ads)</option>' +
            '<option value="60s">60 Segundos (Recorrido Landing)</option>' +
          '</select>' +
        '</label>' +
      '</div>' +
      '<label class="field">Atractivo o detalle clave a destacar (Opcional)' +
        '<input id="videoTopic" placeholder="Ej: orilla de río, a 5 min del centro, rol propio...">' +
      '</label>' +
      '<div class="action"><button class="primary" id="generateScript">Generar guion individual con IA</button></div>' +
      '</article>'; 
  }

  function analyzeFunnel() {
      const { visitas, intencion_agendar, leads, ventas } = dbAnalytics;
      // Con null (no medido) no se emite ningun diagnostico: antes un embudo sin
      // medicion se interpretaba como embudo con cero resultados.
      if (visitas === null || visitas === undefined) {
        return { title: 'Todavía no medimos este embudo', desc: 'Para leer el rendimiento hay que conectar la medición de la ficha (visitas y clics). Los leads sí se cuentan desde el CRM.' };
      }
      if (visitas === 0) return { title: 'Sin tráfico registrado', desc: 'La ficha aún no registra visitas. Aún no hay nada que interpretar.' };
      
      const ctr_intencion = (intencion_agendar / visitas) * 100;
      const conv_lead = leads > 0 ? (leads / intencion_agendar) * 100 : 0;
      
      if (visitas > 100 && ctr_intencion < 5) {
          return { title: 'Alto tráfico, baja interacción', desc: 'La parcela recibe visitas por encima del promedio, pero la gente no hace clic en Agendar Visita. Se recomienda cambiar la imagen principal, o mejorar el gancho.' };
      } else if (intencion_agendar > 20 && conv_lead < 20) {
          return { title: 'Fricción en el Formulario', desc: 'Muchos hacen clic en Agendar, pero pocos dejan sus datos antes de ir a WhatsApp. Revisa si pides demasiada información.' };
      } else if (leads > 10 && ventas === 0) {
          return { title: 'Fuga en Cierre de Ventas', desc: 'Estás consiguiendo Leads, pero no agendan visita física. ¿Tu equipo los contacta rápido?' };
      } else {
          return { title: 'Embudo Saludable', desc: 'El rendimiento actual está dentro de los márgenes sanos de conversión.' };
      }
  }

  // Lo que no se mide se dice, no se pinta como cero.
  function metrica(etiqueta, valor) {
    const texto = (valor === null || valor === undefined) ? 'Sin medición' : String(valor);
    const clase = (valor === null || valor === undefined) ? ' style="color:#94a3b8;font-weight:500;"' : '';
    return '<article class="metric"><span>' + esc(etiqueta) + '</span><strong' + clase + '>' + esc(texto) + '</strong></article>';
  }

  function results() { 
      const recommendation = analyzeFunnel();
      return '<article class="panel">' +
      '<h2>Métricas del Embudo (CRM)</h2>' +
      '<p>Interpretación comercial basada en el tráfico cruzado de Ads y la ficha de la parcela.</p>' +
      '<div class="summary" style="margin-bottom: 2rem;">' +
        metrica('Impresiones (Ads)', dbAnalytics.impresiones) +
        metrica('Visitas Landing', dbAnalytics.visitas) +
        metrica('Clic "Agendar"', dbAnalytics.intencion_agendar) +
        metrica('Leads Reales', dbAnalytics.leads) +
      '</div>' +
      '<div class="card" style="background:#f8fafc; border-left: 4px solid #0056b3;">' +
          '<h3 style="margin-top:0; color:#0056b3;">Lectura del embudo</h3>' +
          '<p><strong>' + recommendation.title + '</strong>: ' + recommendation.desc + '</p>' +
          '<div class="action" style="margin-top:1rem;">' +
             '<button class="primary" onclick="document.querySelector(\'.studio-tab[data-view=campanas]\').click()">Lanzar Nuevo Kit Comercial</button>' +
          '</div>' +
      '</div>' +
      '</article>'; 
  }

  function approvalQueue() { 
      return '<article class="panel"><h2>Cola de aprobaciones</h2>' +
      '<p>Control estricto de contenido. Revisa el historial y aprueba o rechaza los borradores.</p>' +
      '<div class="queue">' + (dbDrafts.length ? dbDrafts.map(item => '' +
        '<div class="queue-item" style="cursor:pointer;" onclick="window.viewDraft(\'' + item.id + '\')">' +
          '<div>' +
            '<strong>' + esc(item.titulo || item.title) + '</strong>' +
            '<small>' + esc(item.canal || item.channel || item.tipo_contenido) + ' · ' + new Date(item.created_at).toLocaleString('es-CL') + '</small>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<span class="pill pill-' + esc(item.estado || item.status) + '">' + esc(item.estado || item.status).toUpperCase() + '</span>' +
            '<div style="font-size:0.75rem; color:#64748b; margin-top:4px;">Revisor: ' + esc(item.revisor_id || 'Pendiente') + '</div>' +
          '</div>' +
        '</div>').join('') : '<div class="card"><p>No hay borradores pendientes.</p></div>') + '</div></article>'; 
  }

  async function render() {
    renderSummary();
    document.querySelectorAll('.studio-tab').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
    content.innerHTML = ({inicio:home, landing:landing, campanas:campaigns, audiovisual:audiovisual, resultados:results, aprobaciones:approvalQueue}[currentView] || home)();
    bindView();
  }

  window.viewDraft = function(id) {
     const draft = dbDrafts.find(d => d.id === id);
     if (draft) openApproval(draft);
  };

  function openApproval(draft) { 
      pendingDraft = draft; 
      preview.textContent = draft.contenido || draft.content; 
      const footer = dialog.querySelector('footer');
      if (draft.estado === 'aprobado' || draft.status === 'aprobado') {
          footer.innerHTML = '<button value="cancel" class="secondary">Volver</button><span class="pill pill-aprobado">Aprobado por ' + esc(draft.revisor_id) + '</span>';
      } else {
          footer.innerHTML = '<button value="cancel" class="secondary">Volver</button><input id="approvalComments" placeholder="Comentarios opcionales..." style="margin-right:auto;"><button class="secondary" id="rejectAction">Rechazar</button><button value="default" id="approveAction">Aprobar</button>';
          
          dialog.querySelector('#approveAction').onclick = async e => handleApproval(e, 'aprobado');
          dialog.querySelector('#rejectAction').onclick = async e => handleApproval(e, 'rechazado');
      }
      dialog.showModal(); 
  }
  
  async function handleApproval(e, newStatus) {
      e.preventDefault();
      const btn = e.target;
      const comments = document.getElementById('approvalComments')?.value || '';
      btn.disabled = true; btn.textContent = 'Procesando...';
      if (pendingDraft?.id && window.TPLDataService) {
          await window.TPLDataService.updateStudioDraftStatus(pendingDraft.id, newStatus, currentActor.name, comments);
          await loadActorData();
      }
      dialog.close();
      currentView = 'aprobaciones';
      await render();
  }

  async function saveDraft(data, skipOpen) {
    if (window.TPLDataService) {
       const draft = await window.TPLDataService.saveStudioDraft(Object.assign({ actorId: currentActor.id }, data));
       if (!skipOpen) {
           await loadActorData();
           openApproval(draft);
       }
       return draft;
    }
  }

  function bindView() {
    content.querySelectorAll('[data-view]').forEach(b => b.onclick = async () => { currentView = b.dataset.view; await render(); });
    
    const generateLanding = document.querySelector('#generateLanding');
    if (generateLanding) generateLanding.onclick = async () => {
        const etiqueta = generateLanding.textContent;
        generateLanding.disabled = true; generateLanding.textContent = 'Redactando...';
        try {
            const content = await generateStudioContent('Crea estructura Landing', 'landing');
            await saveDraft({ kind: 'landing', channel: 'Landing', title: 'Landing de ' + currentActor.name, content });
        } catch (e) {
            alert(e.message || 'No pudimos generar el contenido.');
        } finally {
            generateLanding.disabled = false; generateLanding.textContent = etiqueta;
        }
    };

    const generateMegaKit = document.querySelector('#generateMegaKit');
    if (generateMegaKit) generateMegaKit.onclick = async () => {
        const btn = generateMegaKit;
        const progress = document.getElementById('kitProgress');
        btn.disabled = true;
        progress.style.display = 'block';
        
        const kitPieces = [
            { type: 'propuesta', name: 'Propuesta de Valor Comercial', prompt: 'Estructura característica, beneficio y diferencial de la parcela.' },
            { type: 'post', name: 'Copy Redes Sociales (IG/FB)', prompt: 'Redacta un post persuasivo para Meta destacando el terreno.' },
            { type: 'post', name: 'Post LinkedIn Inversor', prompt: 'Redacta un post corporativo para LinkedIn enfocado en ROI y plusvalía.' },
            { type: 'ad', name: 'Anuncio Meta Ads', prompt: '3 opciones de texto principal y título para Ads de Facebook.' },
            { type: 'ad', name: 'Anuncio Google Ads (Search)', prompt: 'Títulos de 30 caracteres y Descripciones de 90 caracteres para Search.' },
            { type: 'video_script', name: 'Guion Reel (30s) Oportunidad', prompt: 'Guion de 30s con estructura de oportunidad rápida.' },
            { type: 'whatsapp', name: 'Mensaje Inicial WhatsApp', prompt: 'Mensaje de saludo cálido y directo para cuando el cliente entra al chat.' },
            { type: 'whatsapp', name: 'Seguimiento Comercial', prompt: 'Mensaje para enviar 24hs después a los leads fríos.' }
        ];

        try {
            for (let i = 0; i < kitPieces.length; i++) {
                progress.textContent = 'Generando pieza ' + (i + 1) + ' de ' + kitPieces.length + '... (' + kitPieces[i].name + ')';
                const p = kitPieces[i];
                const megaPrompt = 'Eres el CMO de TPL.\nCrea: ' + p.name + '.\nInstrucciones: ' + p.prompt + '\nParcela: ' + currentActor.name;
                const content = await generateStudioContent(megaPrompt, p.type);
                await saveDraft({ kind: p.type, channel: 'Kit de Campaña', title: p.name, content }, true);
            }
            progress.textContent = '¡Kit generado con éxito! Revisa la Cola de Aprobaciones.';
            progress.style.color = '#1d4ed8';
            await loadActorData();
            setTimeout(() => { currentView = 'aprobaciones'; render(); }, 1500);
        } catch(e) {
            progress.textContent = e.message || 'No pudimos generar el kit.';
            progress.style.color = 'red';
        } finally {
            btn.disabled = false;
        }
    };

    const generateScript = document.querySelector('#generateScript');
    if (generateScript) generateScript.onclick = async () => {
        const scriptType = document.getElementById('scriptType').value;
        const scriptDuration = document.getElementById('scriptDuration').value;
        const topic = document.getElementById('videoTopic').value.trim() || currentActor.differentiator;
        
        generateScript.disabled = true; generateScript.textContent = 'Escribiendo Guion con IA...';
        
        const prompts = {
            flash: 'Estructura Oportunidad Flash: Enfócate en la escasez, el precio atractivo y la urgencia de compra inmediata por bajo valor.',
            familiar: 'Estructura Refugio Familiar: Enfócate en el bienestar, la tranquilidad, la cercanía a servicios y el concepto de hogar para la familia.',
            premium: 'Estructura Joya Premium: Enfócate en la exclusividad, plusvalía, lujo y la sensación de estatus.',
            inversor: 'Estructura Terreno Inversor: Enfócate en el ROI, potencial turístico y la rentabilidad del terreno a largo plazo.',
            lista: 'Estructura Lista para Construir: Enfócate en la facilidad, la urbanización, el ahorro de trámites y la posibilidad de construir de inmediato.'
        };
        
        const megaPrompt = 'Eres el Director Creativo de Tu Parcela Lista (TPL). Redacta un guion de video.\nDuración objetivo: ' + scriptDuration + '.\n' + prompts[scriptType] + '\nPropiedad/Actor: ' + currentActor.name + '\nVirtud a destacar: ' + topic;
        const content = await generateStudioContent(megaPrompt, 'video_script');
        await saveDraft({ kind: 'video_script', channel: 'Video', title: 'Guion: ' + scriptType + ' (' + scriptDuration + ')', content });
    };
  }

  async function init() {
      initOptions();
      const urlParams = new URLSearchParams(window.location.search);
      const propiedadId = urlParams.get('propiedad_id');
      const actorId = urlParams.get('actor_id');
      
      if (propiedadId && window.TPLDataService) {
          try {
              const prop = await window.TPLDataService.getPublishedPropertyById(propiedadId);
              if (prop) {
                  const name = prop.nombre || prop.titulo || 'Propietario de ' + (prop.codigo || propiedadId);
                  const adHocActor = {
                      id: actorId || 'owner-' + propiedadId, name, kind: 'persona', roles: ['propietario'],
                      commune: prop.comuna || 'Por definir', propertyId: propiedadId,
                      differentiator: prop.virtudes_terreno || prop.descripcion || 'Sin diferenciador',
                      prop_data: prop
                  };
                  actorSelect.innerHTML += '<option value="' + adHocActor.id + '" selected>CRM: ' + adHocActor.name + '</option>';
                  currentActor = adHocActor;
                  actors.push(adHocActor);
              }
          } catch(e) { console.warn('Studio: No CRM prop loaded', e); }
      }
      
      await loadActorData();
      await render();
  }

  init();
})();
