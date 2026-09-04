(function (window) {
  'use strict';

  const runtimeConfig = window.TPL_CONFIG || {};
  const CONFIG = Object.freeze({
    url: runtimeConfig.supabaseUrl || 'https://hwyscirbycojwndyzozn.supabase.co',
    publishableKey: runtimeConfig.supabasePublishableKey || 'sb_publishable_p2F_lxf_oWyjQcPq_cQw1Q_rr7E3h4k',
    storageKey: runtimeConfig.supabaseStorageKey || 'sb-hwyscirbycojwndyzozn-auth-token',
    environment: runtimeConfig.environment || 'production'
  });

  const LOCAL_DRAFT_BACKUP = 'tpl_frontend_v2_publicaciones_backup_v2';
  const LOCAL_EVENTS = 'tpl_core_eventos_v2';
  let clientPromise = null;

  function read(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('TPL Data Service: no fue posible guardar respaldo local.', error);
    }
  }

  function localEmit(evento, payload) {
    const events = read(LOCAL_EVENTS, []);
    events.unshift({
      id: crypto.randomUUID?.() || String(Date.now()),
      evento,
      payload,
      createdAt: new Date().toISOString()
    });
    write(LOCAL_EVENTS, events.slice(0, 500));
    window.dispatchEvent(new CustomEvent('tpl:event', { detail: { evento, payload } }));
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tpl-supabase-lib]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('No se pudo cargar Supabase JS.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@supabase/supabase-js@2';
      script.defer = true;
      script.dataset.tplSupabaseLib = '1';
      script.onload = () => {
        if (window.supabase?.createClient) resolve(window.supabase);
        else reject(new Error('Supabase JS cargÃƒÆ’Ã‚Â³ sin createClient.'));
      };
      script.onerror = () => reject(new Error('No se pudo cargar Supabase JS.'));
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (window.tplCoreSupabase?.from && window.tplCoreSupabase?.rpc) {
      return window.tplCoreSupabase;
    }

    if (!clientPromise) {
      clientPromise = (async () => {
        const sdk = await loadSupabaseLibrary();
        const client = sdk.createClient(CONFIG.url, CONFIG.publishableKey, {
          auth: {
            storageKey: CONFIG.storageKey,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          },
          global: {
            headers: {
              'X-Client-Info': 'tu-parcela-lista-core/1.0'
            }
          }
        });

        window.tplCoreSupabase = client;
        if (!window.tplSupabase) window.tplSupabase = client;
        return client;
      })().catch((error) => {
        clientPromise = null;
        throw error;
      });
    }

    return clientPromise;
  }

  function saveSubmissionBackup(payload) {
    const list = read(LOCAL_DRAFT_BACKUP, []);
    const backupId = payload?.id || crypto.randomUUID?.() || `tpl-${Date.now()}`;
    const record = {
      backupId,
      payload,
      status: 'pendiente_envio',
      createdAt: new Date().toISOString()
    };
    list.unshift(record);
    write(LOCAL_DRAFT_BACKUP, list.slice(0, 100));
    return backupId;
  }

  function markSubmissionBackupSynced(backupId, result) {
    const list = read(LOCAL_DRAFT_BACKUP, []);
    const idx = list.findIndex((item) => item.backupId === backupId);
    if (idx < 0) return;
    list[idx] = {
      ...list[idx],
      status: 'sincronizado',
      syncedAt: new Date().toISOString(),
      result
    };
    write(LOCAL_DRAFT_BACKUP, list.slice(0, 100));
  }

  async function publishProperty(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('La publicaciÃƒÆ’Ã‚Â³n no contiene datos vÃƒÆ’Ã‚Â¡lidos.');
    }

    const backupId = saveSubmissionBackup(payload);

    try {
      const client = await getClient();
      const { data, error } = await client.rpc('tpl_publicar_propiedad_v3', {
        p_payload: payload
      });

      if (error) throw error;
      if (!data?.ok) throw new Error('Supabase no confirmÃƒÆ’Ã‚Â³ la publicaciÃƒÆ’Ã‚Â³n.');

      markSubmissionBackupSynced(backupId, data);
      localEmit('propiedad.publicada', {
        propiedad_id: data.propiedad_id,
        publicacion_id: data.publicacion_id,
        codigo: data.codigo,
        source: 'supabase'
      });

      return { ...data, source: 'supabase' };
    } catch (error) {
      console.error('TPL Data Service: error al publicar.', error);
      const wrapped = new Error(
        error?.message
          ? `No pudimos enviar la publicaciÃƒÆ’Ã‚Â³n a TPL: ${error.message}`
          : 'No pudimos enviar la publicaciÃƒÆ’Ã‚Â³n a TPL.'
      );
      wrapped.cause = error;
      wrapped.localBackup = true;
      wrapped.backupId = backupId;
      throw wrapped;
    }
  }


  async function savePublisherDraft(payload, token = null) {
    if (!payload || typeof payload !== 'object') throw new Error('Borrador invÃƒÆ’Ã‚Â¡lido.');
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_guardar_borrador_publicador_v1', {
      p_payload: payload,
      p_token: token || null
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible guardar el borrador.');
    return data;
  }

  async function loadPublisherDraft(token) {
    if (!token) return null;
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_recuperar_borrador_publicador_v1', { p_token: token });
    if (error) throw error;
    return data?.ok ? data : null;
  }

  async function revokePublisherDraft(token) {
    if (!token) return { ok: true };
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_revocar_borrador_publicador_v1', { p_token: token });
    if (error) throw error;
    return data || { ok: true };
  }


  async function getPublicationEcosystemStatus(publicationId, propertyId) {
    if (!publicationId || !propertyId) return null;
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_estado_ecosistema_publicacion_v1', {
      p_publicacion_id: publicationId,
      p_propiedad_id: propertyId
    });
    if (error) throw error;
    return data || null;
  }

  async function activateFreeOwner(payload) {
    if (!payload?.publicacion_id || !payload?.email) {
      throw new Error('Faltan los datos para activar la cuenta gratuita.');
    }
    const client = await getClient();
    const { data, error } = await client.functions.invoke('activar-propietario-gratis', {
      body: {
        publicacion_id: payload.publicacion_id,
        email: String(payload.email || '').trim().toLowerCase()
      }
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible activar Mi Propiedad TPL.');
    localEmit('propietario_gratis.activado', data);
    return data;
  }

  // Tope de seguridad: hoy hay ~32 propiedades publicadas, pero sin limite
  // esta consulta crece sin control junto con el catalogo (cada fila pesa
  // ~4 KB por 'metadata' y 'descripcion'). Con 500 propiedades serian ~2 MB
  // en cada carga del home.
  const MAX_PROPIEDADES_LISTADO = 300;

  async function listPublishedProperties() {
    const client = await getClient();
    const { data, error } = await client
      .from('tpl_propiedades')
      .select('id,codigo,tipo,estado,titulo,descripcion,region,comuna,sector,lat,lng,superficie_m2,precio_publicado,rol_situacion,electricidad,agua,acceso,topografia,suelo,exposicion,vista_principal,vegetacion,cierre_perimetral,porton,condominio,atributos_naturales,casa_datos,diagnostico,destacada,oportunidad_tpl,publicada_at,updated_at,metadata')
      .eq('estado', 'publicada')
      .order('publicada_at', { ascending: false })
      .limit(MAX_PROPIEDADES_LISTADO);

    if (error) throw error;
    const rows = data || [];

    // Las fotos reales viven en tpl_propiedad_imagenes, no en metadata.imagenes
    // (ese es el patron viejo que solo usan las 32 parcelas sembradas). Sin
    // este batch, el home/grilla mostraba sin fotos cualquier propiedad
    // publicada por el gestor de fotos real del CRM o del portal (ej.
    // Virquenco), aunque el CRM y la ficha (getPublishedPropertyById, que si
    // consulta esta tabla mas abajo) si las vieran. Se pide en un solo query
    // batch por todos los ids del listado, no uno por propiedad.
    const ids = rows.map((r) => r.id).filter(Boolean);
    if (ids.length) {
      const media = await client
        .from('tpl_propiedad_imagenes')
        .select('propiedad_id,url,storage_path,tipo,orden,es_portada')
        .in('propiedad_id', ids)
        .in('tipo', ['foto', 'plano', 'video_thumb'])
        .order('es_portada', { ascending: false })
        .order('orden', { ascending: true });

      if (media.error) {
        console.warn('TPL Data Service: no fue posible cargar fotos del listado.', media.error);
      } else {
        const porPropiedad = new Map();
        for (const item of media.data || []) {
          const url = item.url || item.storage_path;
          if (!url) continue;
          if (!porPropiedad.has(item.propiedad_id)) porPropiedad.set(item.propiedad_id, []);
          porPropiedad.get(item.propiedad_id).push(url);
        }
        for (const row of rows) {
          const fotos = porPropiedad.get(row.id);
          if (fotos && fotos.length) row.imagenes = fotos;
        }
      }
    }

    return rows;
  }


  async function getPublishedPropertyById(identifier) {
    const value = String(identifier || '').trim();
    if (!value) return null;
    const client = await getClient();
    const fields = 'id,codigo,tipo,estado,titulo,descripcion,region,comuna,sector,direccion_referencia,lat,lng,superficie_m2,precio_publicado,moneda,rol_situacion,electricidad,agua,acceso,topografia,suelo,exposicion,vista_principal,vegetacion,cierre_perimetral,porton,condominio,distancia_ruta_principal_km,atributos_naturales,cercanias,casa_datos,diagnostico,destacada,oportunidad_tpl,metadata,publicada_at,updated_at';
    const publicStates = ['publicada', 'activa', 'disponible'];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    let query = client.from('tpl_propiedades').select(fields);
    if (isUuid) {
      query = query.eq('id', value);
    } else {
      query = query.in('estado', publicStates).eq('codigo', value);
    }
    let response = await query.maybeSingle();
    if (response.error) throw response.error;

    if (!response.data && !isUuid) {
      response = await client
        .from('tpl_propiedades')
        .select(fields)
        .in('estado', publicStates)
        .contains('metadata', { source_legacy_id: value })
        .maybeSingle();
      if (response.error && response.error.code !== 'PGRST116') throw response.error;
    }

    const row = response.data || null;
    if (!row) return null;

    const media = await client
      .from('tpl_propiedad_imagenes')
      .select('url,storage_path,tipo,orden,es_portada,alt')
      .eq('propiedad_id', row.id)
      .in('tipo', ['foto', 'plano', 'video_thumb'])
      .order('es_portada', { ascending: false })
      .order('orden', { ascending: true });

    if (media.error) {
      console.warn('TPL Data Service: no fue posible cargar medios de la propiedad.', media.error);
    }

    const metadataImages = Array.isArray(row.metadata?.imagenes) ? row.metadata.imagenes : [];
    const remoteImages = (media.data || []).map((item) => item.url || item.storage_path).filter(Boolean);
    return {
      ...row,
      imagenes: [...new Set([...remoteImages, ...metadataImages])],
      imagen: remoteImages[0] || metadataImages[0] || row.metadata?.imagen_principal || ''
    };
  }

  async function prepareCrmPremiumReport(propertyId, contact = {}, send = false) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_preparar_informe_tasacion_v1', {
      p_propiedad_id: propertyId,
      p_contacto: contact || {},
      p_enviar: Boolean(send)
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible preparar el informe.');
    return data;
  }

  async function generateCrmPremiumReport(orderId, options = {}) {
    const client = await getClient();
    const { data, error } = await client.functions.invoke('generar-informe-premium', {
      body: {
        orden_id: orderId,
        enviar: options.enviar !== false,
        email: options.email || ''
      }
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible generar el informe premium.');
    return data;
  }

  async function getCrmReportHistory(propertyId) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_historial_informes_v1', { p_propiedad_id: propertyId });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  // Idempotency cache to prevent duplicate leads
  const _leadSubmissions = new Map();

  function _normalizePhone(phone) {
    if (!phone) return '';
    // Elimina espacios, guiones y caracteres no numÃ©ricos (excepto +)
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) cleaned = '+' + cleaned;
    if (cleaned.startsWith('9') && cleaned.length === 9) cleaned = '+56' + cleaned;
    if (cleaned.startsWith('09') && cleaned.length === 10) cleaned = '+569' + cleaned.slice(2);
    // Asume Chile por defecto si tiene 8 dÃ­gitos
    if (cleaned.length === 8) cleaned = '+569' + cleaned;
    return cleaned;
  }

  async function saveLead(data) {
      if (!data?.nombre || !data?.telefono) {
        throw new Error('Nombre y telÃ©fono son obligatorios.');
      }
      
      const telefonoNormalizado = _normalizePhone(data.telefono);
      const signature = `${data.nombre}-${telefonoNormalizado}-${data.parcelaId || data.propiedadId}`;
      const now = Date.now();
      
      // Idempotencia: Bloquear duplicados exactos en los Ãºltimos 30 segundos
      if (_leadSubmissions.has(signature)) {
          if (now - _leadSubmissions.get(signature) < 30000) {
              console.warn('Bloqueado por idempotencia: lead duplicado detectado.');
              return { ok: true, cached: true, warning: 'Lead ya registrado recientemente.' };
          }
      }
      _leadSubmissions.set(signature, now);

      const urlParams = new URLSearchParams(window.location.search);
      const payload = {
        nombre: data.nombre.trim(),
        telefono: telefonoNormalizado,
        parcela_id: data.parcelaId || data.propiedadId,
        origen: data.origen || 'agendar_visita',
        url_origen: window.location.href,
        utm_source: urlParams.get('utm_source') || data.utm_source || null,
        utm_campaign: urlParams.get('utm_campaign') || data.utm_campaign || null,
        fecha_visita_solicitada: data.fechaVisita || data.fecha_visita || null,
        consentimiento_contacto: true,
        estado: 'nuevo',
        canal: 'whatsapp',
        fecha_creacion: new Date().toISOString()
      };

      try {
        const client = await getClient();
        
        // Fase 1: Intentar registrar con la funciÃ³n diseÃ±ada para Leads
        const { data: result, error } = await client.rpc('tpl_registrar_lead_v1', { p_payload: payload });
        
        if (error) {
           console.warn("RPC fallÃ³, intentando insert directo como oportunidad CRM", error);
           // Fallback a tpl_crm_oportunidades (mapeando campos)
           const fallbackPayload = {
               nombre_contacto: payload.nombre,
               telefono: payload.telefono,
               parcelaId: payload.parcela_id,
               origen: payload.origen,
               estado: payload.estado,
               fecha: payload.fecha_creacion
           };
           const { data: insertData, error: insertError } = await client.from('tpl_crm_oportunidades').insert([fallbackPayload]).select();
           if (insertError) {
               _leadSubmissions.delete(signature); // Limpiar cachÃ© si falla
               throw insertError;
           }
           return { ok: true, data: insertData };
        }
        
        if (!result?.ok) {
            _leadSubmissions.delete(signature);
            throw new Error(result?.error || 'No fue posible guardar el lead.');
        }
        localEmit('lead.creado', result);
        return result;
      } catch (e) {
        console.error('Error guardando lead en Supabase:', e);
        _leadSubmissions.delete(signature);
        // Guardado local de respaldo si falla la red (Cola offline)
        const localLeads = read('tpl_offline_leads', []);
        localLeads.push(payload);
        write('tpl_offline_leads', localLeads);
        throw e;
      }
    }

  async function createPublicOpportunity(payload) {
    // Basta con una via de contacto: correo O telefono. La misma regla vive en
    // tpl_registrar_oportunidad_publica_v1; aqui solo evitamos un viaje inutil.
    const tieneContacto = Boolean(
      String(payload?.email || '').trim() || String(payload?.telefono || '').trim()
    );
    if (!payload?.nombre_contacto || !tieneContacto) {
      throw new Error('Necesitamos tu nombre y un correo o teléfono de contacto.');
    }
    const client = await getClient();
    const rpc = ['oferta', 'economica', 'mejoras', 'mixta'].includes(payload?.tipo)
      ? 'tpl_registrar_oferta_propiedad_v1'
      : 'tpl_registrar_oportunidad_publica_v1';
    const { data, error } = await client.rpc(rpc, { p_payload: payload });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible registrar la solicitud.');
    localEmit(rpc === 'tpl_registrar_oferta_propiedad_v1' ? 'oferta.propiedad_creada' : 'oportunidad.publica_creada', data);
    return data;
  }

  // --- STUDIO MARK II ABSTRACTIONS (FASE 2: Cola de Aprobaciones Robusta) ---
  async function saveStudioDraft(payload) {
    try {
      const client = await getClient();
      const now = new Date().toISOString();
      
      const insertPayload = {
        actorId: payload.actorId,
        parcela_id: payload.parcelaId || payload.propertyId || null,
        tipo_contenido: payload.kind || 'indefinido',
        canal: payload.channel || null,
        titulo: payload.title || 'Sin t\xEDtulo',
        contenido: payload.content || '',
        estado: payload.status || 'borrador', // borrador, pendiente_aprobacion, aprobado, rechazado, publicado, archivado
        prompt_utilizado: payload.prompt || null,
        datos_base: payload.baseData || {}, // Contexto inyectado a la IA
        historial_cambios: [{ fecha: now, accion: 'creacion', usuario: payload.actorId, estado: payload.status || 'borrador' }],
        created_at: now
      };
      
      const { data, error } = await client.from('tpl_studio_drafts').insert([insertPayload]).select();
      if (error) throw error;
      return data[0];
    } catch (e) {
      console.warn("Fallo guardado en la nube, usando fallback offline", e);
      const offline = read('tpl_offline_studio_drafts', []);
      const localRecord = { id: crypto.randomUUID?.() || Date.now().toString(), ...payload, status: payload.status || 'borrador', created_at: new Date().toISOString() };
      offline.push(localRecord);
      write('tpl_offline_studio_drafts', offline);
      return localRecord;
    }
  }

  async function updateStudioDraftStatus(id, status, reviewerId = 'sistema', comentarios = '') {
    try {
      const client = await getClient();
      const now = new Date().toISOString();
      
      // Obtener registro actual para apendizar historial
      const { data: current, error: fetchError } = await client.from('tpl_studio_drafts').select('historial_cambios,estado').eq('id', id).single();
      if (fetchError) throw fetchError;

      const newHistoryEvent = {
          fecha: now,
          accion: 'cambio_estado',
          usuario: reviewerId,
          estado_anterior: current?.estado || 'desconocido',
          nuevo_estado: status,
          comentarios: comentarios
      };
      
      const historial = Array.isArray(current?.historial_cambios) ? [...current.historial_cambios, newHistoryEvent] : [newHistoryEvent];
      
      const updatePayload = {
          estado: status,
          revisor_id: reviewerId,
          fecha_aprobacion: status === 'aprobado' ? now : null,
          historial_cambios: historial
      };

      const { data, error } = await client.from('tpl_studio_drafts').update(updatePayload).eq('id', id).select();
      if (error) throw error;
      return data[0];
    } catch(e) {
      console.warn("Fallo actualizaci\xF3n en la nube, usando fallback offline", e);
      const offline = read('tpl_offline_studio_drafts', []);
      const index = offline.findIndex(d => d.id === id);
      if (index >= 0) {
          offline[index].status = status; // Backward compat for offline
          offline[index].estado = status;
          write('tpl_offline_studio_drafts', offline);
          return offline[index];
      }
      return null;
    }
  }

  async function getStudioDraftsByActor(actorId) {
    try {
      const client = await getClient();
      const { data, error } = await client.from('tpl_studio_drafts').select('*').eq('actorId', actorId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch(e) {
      console.warn("Fallo lectura nube, mostrando fallback", e);
      return read('tpl_offline_studio_drafts', []).filter(d => d.actorId === actorId);
    }
  }

  async function getActorAnalytics(actorId, propertyId) {
    try {
      const client = await getClient();
      // Sin propiedad no hay embudo que medir: se declara, no se devuelven ceros
      // que en pantalla parecen "cero resultados" en vez de "sin medicion".
      if (!propertyId) return { impresiones: null, visitas: null, intencion_agendar: null, leads: null, visitas_agendadas: null, ventas: null, medido: false };

      const { data: oportunidades, error } = await client
         .from('tpl_crm_oportunidades')
         .select('origen, estado')
         .eq('parcelaId', propertyId);
         
      if (error) throw error;
      
      const ops = oportunidades || [];

      // Aqui habia Math.random(): las visitas salian de
      // `Math.floor(Math.random()*200)+50` y las impresiones se multiplicaban por
      // otro numero al azar. Es decir, al partner se le mostraba el rendimiento
      // de SU campana con cifras inventadas que cambiaban en cada recarga. Ahora
      // solo se cuenta lo que existe de verdad en tpl_crm_oportunidades, y lo que
      // no se mide se devuelve como null para que la pantalla diga "sin datos"
      // en vez de dibujar un embudo falso.
      const contar = (fn) => ops.filter(fn).length;

      return {
        impresiones: null, // Requiere conectar Meta/Google Ads; hoy no se mide.
        visitas: contar((o) => o.origen === 'vista'),
        intencion_agendar: contar((o) => o.origen === 'clic_agendar'),
        leads: contar((o) => o.origen === 'agendar_visita'),
        visitas_agendadas: contar((o) => o.estado === 'visita'),
        ventas: contar((o) => o.estado === 'vendido' || o.estado === 'ganado'),
        medido: true,
      };
    } catch(e) {
      console.warn("Fallo lectura analíticas del embudo", e);
      return { impresiones: null, visitas: null, intencion_agendar: null, leads: null, visitas_agendadas: null, ventas: null, medido: false };
    }
  }

  async function getOwnerOffers(token) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_propietario_ofertas_por_token_v1', { p_token: token });
    if (error) throw error;
    return data || { ok: false, items: [] };

    }

  async function respondOwnerOffer(token, offerId, action, payload = {}) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_propietario_responder_oferta_v1', {
      p_token: token,
      p_oferta_id: offerId,
      p_accion: action,
      p_payload: payload
    });
    if (error) throw error;
    return data;
  }

  async function getSession() {
    const client = await getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function signIn(email, password) {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || '')
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const client = await getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    return true;
  }


  async function getUfConfig() {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_obtener_uf_v1');
    if (error) throw error;
    return data || null;
  }

  async function updateUfConfig(valorClp, fuente = 'CRM TPL') {
    const client = await getClient();
    const value = Number(valorClp);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Valor UF invÃƒÆ’Ã‚Â¡lido.');
    const { data, error } = await client.rpc('tpl_actualizar_uf_v1', {
      p_valor_clp: value,
      p_fuente: String(fuente || 'CRM TPL')
    });
    if (error) throw error;
    return data;
  }


  async function getTasadorReferences() {
    const client = await getClient();
    const { data, error } = await client
      .from('tpl_tasador_referencias')
      // metadata trae el segmento de superficie, su superficie mediana y si la
      // muestra es de la comuna o prestada de vecinas: el motor lo necesita
      // para elegir contra que comparables tasar.
      .select('region,comuna,comuna_key,segmento,mediana_m2,p25_m2,p75_m2,mediana_uf_m2,uf_base_clp,cantidad_comparables,confianza,fuentes,fecha_observacion,metadata')
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  }

  async function getTasadorContext() {
    const [uf, references] = await Promise.all([
      getUfConfig(),
      getTasadorReferences()
    ]);
    const ufClp = Number(uf?.valor_clp || 0);
    const normalized = (references || []).map((row) => {
      const canonicalUfM2 = Number(row.mediana_uf_m2 || 0);
      const baseUf = Number(row.uf_base_clp || 0);
      const medianM2 = canonicalUfM2 > 0 && ufClp > 0
        ? canonicalUfM2 * ufClp
        : Number(row.mediana_m2 || 0);
      const ratio = Number(row.mediana_m2 || 0) > 0 ? medianM2 / Number(row.mediana_m2) : 1;
      return {
        ...row,
        mediana_m2_actual: medianM2,
        p25_m2_actual: Number(row.p25_m2 || 0) * ratio,
        p75_m2_actual: Number(row.p75_m2 || 0) * ratio,
        uf_clp_actual: ufClp,
        uf_base_clp: baseUf || null
      };
    });
    return { uf, references: normalized };
  }

  // ---------------------------------------------------------------------------
  // Carga de referencias comunales en el motor
  // ---------------------------------------------------------------------------
  // El motor ya no trae medianas escritas a mano de respaldo: su unica fuente
  // es tpl_tasador_referencias. Por eso TODA pagina que llame a
  // TPLLandEngine.calculate() tiene que cargarlas antes, o el valor comunal
  // sale en cero y la tasacion queda 100% tecnica sin motivo.
  //
  // Se memoiza: aunque la llamen cinco veces, se consulta una sola.
  let cargaReferencias = null;
  function cargarReferenciasEnMotor(motor = window.TPLLandEngine) {
    if (cargaReferencias) return cargaReferencias;
    // Se publica la promesa apenas se crea, para que cualquier pagina pueda
    // hacer `await window.TPLReferenciasComunales` sin importar quien disparo
    // la carga primero.
    cargaReferencias = (async () => {
      if (!motor?.setMarketReferences) return { cantidad: 0, fuente: 'sin_motor' };
      try {
        const ctx = await getTasadorContext();
        motor.setMarketReferences(ctx.references || [], { ufClp: Number(ctx.uf?.valor_clp || 0) });
        return {
          cantidad: (ctx.references || []).length,
          ufClp: Number(ctx.uf?.valor_clp || 0),
          ufFecha: ctx.uf?.fecha_valor || null,
          fuente: 'supabase',
        };
      } catch (error) {
        console.warn('[TPL] Sin referencias comunales; las tasaciones de esta página serán solo técnicas.', error);
        return { cantidad: 0, fuente: 'sin_referencia' };
      }
    })();
    if (typeof window !== 'undefined') window.TPLReferenciasComunales = cargaReferencias;
    return cargaReferencias;
  }

  // Arranca sola apenas hay motor en la pagina, para que el viaje de red vaya
  // en paralelo con el resto del arranque. Se intenta dos veces porque el orden
  // de los <script> no es el mismo en todas las paginas: parcela.html carga el
  // motor antes que este archivo, index.html al reves (y con defer, o sea que
  // cuando corre esto todavia no existe window.TPLLandEngine).
  if (typeof window !== 'undefined') {
    const arrancar = () => {
      if (window.TPLLandEngine?.setMarketReferences && !cargaReferencias) {
        cargarReferenciasEnMotor(window.TPLLandEngine);
      }
    };
    arrancar();
    if (!cargaReferencias) document.addEventListener('DOMContentLoaded', arrancar, { once: true });
  }

  async function getObservedComparables(input = {}) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_resumen_comparables_v1', {
      p_entrada: {
        comuna: input.comuna || '',
        superficie_terreno_m2: Number(input.area || input.superficie || 0) || null,
        tiene_casa: Boolean(input.incluyeVivienda),
        superficie_construida_m2: Number(input.areaCasa || 0) || null,
        dormitorios: Number(input.dormitorios || 0) || null
      }
    });
    if (error) throw error;
    return data || { ok:true, cantidad:0, confianza:'insuficiente', peso_sugerido:0 };
  }

  async function registerValuation(input, result) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_registrar_tasacion_v1', {
      p_entrada: input || {},
      p_resultado: result || {}
    });
    if (error) {
      if (/Could not find the function|404|PGRST202/i.test(error.message || '')) throw new Error('Falta instalar la RPC tpl_registrar_tasacion_v1(jsonb,jsonb) en Supabase.');
      throw error;
    }
    if (!data?.ok) throw new Error('Supabase no confirmÃƒÆ’Ã‚Â³ la tasaciÃƒÆ’Ã‚Â³n.');
    return data;
  }


  async function getLatestCrmValuation(propertyId) {
    const id = String(propertyId || '').trim();
    if (!id) return null;
    const client = await getClient();
    const { data, error } = await client
      .from('tpl_tasaciones')
      .select('id,propiedad_id,tipo,superficie_m2,valor_tpl_total,valor_tpl_m2,referencia_comunal_m2,entrada,resultado,version_motor,created_at')
      .eq('propiedad_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }



  async function saveCrmValuationProperty(propertyId, input = {}, result = {}) {
    const id = String(propertyId || '').trim();
    if (!id) throw new Error('Falta la propiedad que se debe actualizar.');
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_guardar_datos_tasacion_v1', {
      p_propiedad_id: id,
      p_entrada: input || {},
      p_resultado: result || {}
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.message || 'Supabase no confirmÃƒÆ’Ã‚Â³ la actualizaciÃƒÆ’Ã‚Â³n de la propiedad.');
    return data;
  }

  async function registerTerritorialAnalysis(payload) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_registrar_analisis_tasador_v1', { p_payload: payload || {} });
    if (error) throw error;
    if (!data?.ok) throw new Error('Supabase no confirmÃƒÆ’Ã‚Â³ el anÃƒÆ’Ã‚Â¡lisis territorial.');
    return data;
  }

  async function getTerritorialPublicSummary(identifier) {
    const id = String(identifier || '').trim();
    if (!id) return null;
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_analisis_publico_propiedad_v1', { p_identificador: id });
    if (error) throw error;
    return data && Object.keys(data).length ? data : null;
  }

  async function getTerritorialProjectAnalysis(identifier) {
    const id = String(identifier || '').trim();
    if (!id) return null;
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_analisis_proyecto_propiedad_v1', { p_identificador: id });
    if (error) throw error;
    return data && Object.keys(data).length ? data : null;
  }

  async function createReportOrder(payload) {
    if (!payload?.contacto?.email || !payload?.contacto?.nombre) {
      throw new Error('Nombre y correo son obligatorios para solicitar el informe.');
    }
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crear_orden_informe_v1', {
      p_payload: payload
    });
    if (error) throw error;
    if (!data?.ok) throw new Error('Supabase no confirmÃƒÆ’Ã‚Â³ la orden del informe.');
    localEmit('informe_tasacion.solicitado', data);
    return data;
  }


  async function startReportPayment(payload) {
    if (!payload?.contacto?.email || !payload?.contacto?.nombre) {
      throw new Error('Nombre y correo son obligatorios para iniciar el pago.');
    }
    const client = await getClient();
    const { data, error } = await client.functions.invoke('crear-pago-informe', {
      body: payload
    });
    if (error) throw error;
    if (!data?.ok || !data?.payment_url) {
      throw new Error(data?.error || 'No fue posible crear el pago seguro.');
    }
    localEmit('informe_tasacion.pago_iniciado', data);
    return data;
  }

  async function startReservationPayment(payload) {
    if (!payload?.parcela_codigo) {
      throw new Error('Falta identificar la parcela a reservar.');
    }
    if (!payload?.contacto?.email || !payload?.contacto?.nombre) {
      throw new Error('Nombre y correo son obligatorios para reservar.');
    }
    const client = await getClient();
    // El monto NO se envía desde aquí: crear-pago-reserva lo calcula en el
    // servidor (1% de tpl_propiedades.precio_publicado). Ver
    // supabase/functions/crear-pago-reserva y la migración
    // 20260903020000_tpl_reserva_parcela_pago_v1.sql.
    const { data, error } = await client.functions.invoke('crear-pago-reserva', {
      body: payload
    });
    if (error) throw error;
    if (!data?.ok || !data?.payment_url) {
      throw new Error(data?.error || 'No fue posible iniciar el pago de la reserva.');
    }
    localEmit('reserva_parcela.pago_iniciado', data);
    return data;
  }

  async function startSubscriptionPayment(payload = {}) {
    const client = await getClient();
    const { data: session } = await client.auth.getSession();
    if (!session?.session) throw new Error('Debes iniciar sesiÃƒÆ’Ã‚Â³n para mejorar tu plan.');

    const { data, error } = await client.functions.invoke('crear-pago-suscripcion', {
      body: payload,
      headers: { Authorization: `Bearer ${session.session.access_token}` }
    });
    if (error) throw error;
    if (!data?.ok || !data?.payment_url) {
      throw new Error(data?.error || 'No fue posible iniciar el pago de la suscripciÃƒÆ’Ã‚Â³n.');
    }
    return data;
  }

  async function getReportOrderStatus(orderId) {
    const id = String(orderId || '').trim();
    if (!id) throw new Error('Falta el identificador de la orden.');
    const endpoint = `${CONFIG.url}/functions/v1/estado-informe?orden=${encodeURIComponent(id)}`;
    const response = await fetch(endpoint, {
      headers: { apikey: CONFIG.publishableKey, Authorization: `Bearer ${CONFIG.publishableKey}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || 'No fue posible consultar el informe.');
    return data;
  }

  async function listPublicPlans() {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_listar_planes_publicos_v1');
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function listMyValuations(limit = 100) {
    const client = await getClient();
    const session = await getSession();
    if (!session?.user) return [];
    const { data, error } = await client
      .from('tpl_tasaciones')
      .select('id,propiedad_id,actor_id,tipo,superficie_m2,precio_publicado,valor_tpl_total,valor_tpl_m2,clasificacion,entrada,resultado,version_motor,created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(Number(limit) || 100, 200)));
    if (error) throw error;
    return data || [];
  }

  async function getCrmSnapshot() {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_snapshot_v1');
    if (error) throw error;
    return data || {};
  }

  async function getCrmCommandCenter() {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_command_center_v1');
    if (error) throw error;
    return data || {};
  }


  async function getCanonicalValuation(identifier) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_tasacion_canonica_activo_v1', {
      p_identificador: String(identifier || '').trim()
    });
    if (error) throw error;
    return data || { ok: false, error: 'SIN_RESPUESTA' };
  }

  async function getCrmValuationHistory(propertyId) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_historial_tasaciones_v1', {
      p_propiedad_id: propertyId
    });
    if (error) throw error;
    return data || { ok: true, versiones: [] };
  }

  async function getCrmOperationalInbox() {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_bandeja_operativa_v1');
    if (error) throw error;
    return data || { items: [], totales: {} };
  }

  async function approvePublication(publicacionId, publish = true) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_aprobar_publicacion_v1', {
      p_publicacion_id: publicacionId,
      p_publicar: Boolean(publish)
    });
    if (error) throw error;
    return data;
  }


  async function saveCrmHouse(payload) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_guardar_casa_v1', { p_payload: payload || {} });
    if (error) throw error;
    if (!data?.ok) throw new Error('Supabase no confirmÃƒÆ’Ã‚Â³ la casa.');
    return data;
  }


  async function generateOwnerLink(propertyId, days = 30) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_generar_link_propietario_v1', { p_propiedad_id: propertyId, p_dias: days });
    if (error) throw error;
    if (!data?.ok || !data?.token) throw new Error(data?.error || 'No fue posible generar el enlace.');
    return data;
  }

  async function getOwnerProperty(token) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_propietario_resumen_por_token_v1', { p_token: token });
    if (error) throw error;
    return data;
  }

  async function getOwnerValuationReport(token) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_propietario_informe_tasacion_por_token_v1', { p_token: token });
    if (error) throw error;
    
    // Enriquecer el informe con datos de catastro (mercado)
    if (data && data.propiedad) {
      const comuna = data.propiedad.comuna || '';
      const parcelaId = data.propiedad.id;
      
      const { data: catData, error: catError } = await client
        .from('tpl_catastro_mercado')
        .select('*')
        .or(`parcela_id.eq.${parcelaId},comuna.eq.${comuna}`);
        
      if (!catError) {
        // Ordenar primero los que estÃƒÆ’Ã‚Â¡n vinculados directamente a la parcela
        data.catastro = (catData || []).sort((a, b) => {
          if (a.parcela_id === parcelaId && b.parcela_id !== parcelaId) return -1;
          if (a.parcela_id !== parcelaId && b.parcela_id === parcelaId) return 1;
          return 0;
        });
      } else {
        data.catastro = [];
      }
    } else {
      data.catastro = [];
    }
    
    return data;
  }

  async function updateOwnerProperty(token, payload) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_propietario_actualizar_por_token_v1', { p_token: token, p_payload: payload || {} });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible actualizar la propiedad.');
    return data;
  }


  async function uploadOwnerPropertyPhoto(token, file) {
    const client = await getClient();
    const form = new FormData();
    form.append('token', token);
    form.append('file', file, file.name);
    const { data, error } = await client.functions.invoke('subir-foto-propietario', { body: form });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible subir la fotografÃƒÆ’Ã‚Â­a.');
    return data;
  }

  async function processOwnerValuationRecalculation(token) {
    const client = await getClient();
    const { data, error } = await client.functions.invoke('procesar-recalculo-tasador', { body: { token } });
    if (error) throw error;
    return data || {};
  }

  async function trackEvent(evento, payload = {}) {
    const client = await getClient();
    const safePayload = {
      ...payload,
      pagina: payload.pagina || window.location.pathname
    };
    const { data, error } = await client.rpc('tpl_registrar_evento_publico_v1', {
      p_evento: evento,
      p_payload: safePayload
    });
    if (error) throw error;
    localEmit(evento, payload);
    return Boolean(data);
  }

  async function saveCrmActor(nombre, email, telefono, rol, metadata = {}) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_crear_actor_v1', {
      p_nombre: nombre,
      p_email: email,
      p_telefono: telefono,
      p_rol: rol,
      p_metadata: metadata
    });
    if (error) throw error;
    return data;
  }

  async function updateOpportunityStage(oportunidadId, estado, comentario = null) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_actualizar_estado_oportunidad_v1', {
      p_oportunidad_id: oportunidadId,
      p_estado: estado,
      p_comentario: comentario
    });
    if (error) throw error;
    return data;
  }

  async function scheduleVisita(oportunidadId, staffId, fechaHora, notas = null) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_agendar_visita_v1', {
      p_oportunidad_id: oportunidadId,
      p_staff_id: staffId,
      p_fecha_hora: fechaHora,
      p_notas: notas
    });
    if (error) throw error;
    return data;
  }

  async function updateVisita(visitaId, estado, resultado = null, notas = null) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_crm_actualizar_visita_v1', {
      p_visita_id: visitaId,
      p_estado: estado,
      p_resultado: resultado,
      p_notas: notas
    });
    if (error) throw error;
    return data;
  }

  function getPendingBackups() {
    return read(LOCAL_DRAFT_BACKUP, []).filter((item) => item.status !== 'sincronizado');
  }

  async function saveTasadorLead(payload) {
    try {
      const client = await getClient();
      const { data, error } = await client.from('tpl_leads').insert([payload]).select();
      if (error) {
        console.warn('Error saving lead to Supabase (table might not exist yet):', error.message);
        return { id: 'temp-' + Date.now(), ...payload }; // Fallback
      }
      return data[0];
    } catch (err) {
      console.warn('Supabase not ready or table missing for leads:', err);
      return { id: 'temp-' + Date.now(), ...payload };
    }
  }

  async function updateTasadorLeadIntent(id, intent) {
    if (!id || String(id).startsWith('temp-')) return;
    try {
      const client = await getClient();
      await client.from('tpl_leads').update({ intencion: intent }).eq('id', id);
    } catch (err) {
      console.warn('Could not update lead intent:', err);
    }
  }

  window.TPLDataService = Object.freeze({
    config: CONFIG,
    getClient,
    prepareCrmPremiumReport,
    generateCrmPremiumReport,
    getCrmReportHistory,
    getSession,
    signIn,
    signOut,
    publishProperty,
      saveLead,
    savePublisherDraft,
    loadPublisherDraft,
    revokePublisherDraft,
    getPublicationEcosystemStatus,
    activateFreeOwner,
    listPublishedProperties,
    getPublishedPropertyById,
    createPublicOpportunity,
      saveStudioDraft,
      updateStudioDraftStatus,
      getStudioDraftsByActor,
      getActorAnalytics,
    getOwnerOffers,
    respondOwnerOffer,
    getCrmSnapshot,
    getCrmCommandCenter,
    getCrmOperationalInbox,
    getCanonicalValuation,
    getCrmValuationHistory,
    getUfConfig,
    updateUfConfig,
    getTasadorReferences,
    getTasadorContext,
    cargarReferenciasEnMotor,
    getObservedComparables,
    registerValuation,
    getLatestCrmValuation,
    saveCrmValuationProperty,
    registerTerritorialAnalysis,
    getTerritorialPublicSummary,
    getTerritorialProjectAnalysis,
    createReportOrder,
    startReportPayment,
    startReservationPayment,
    startSubscriptionPayment,
    getReportOrderStatus,
    listPublicPlans,
    listMyValuations,
    approvePublication,
    saveCrmHouse,
    generateOwnerLink,
    getOwnerProperty,
    getOwnerValuationReport,
    updateOwnerProperty,
    uploadOwnerPropertyPhoto,
    processOwnerValuationRecalculation,
    trackEvent,
    saveCrmActor,
    updateOpportunityStage,
    scheduleVisita,
    updateVisita,
    emit: localEmit,
    saveTasadorLead,
    updateTasadorLeadIntent,
    getPendingBackups,
    hasBackend: () => true
  });
})(window);




