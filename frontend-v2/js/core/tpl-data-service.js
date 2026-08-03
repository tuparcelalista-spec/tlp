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
        else reject(new Error('Supabase JS cargó sin createClient.'));
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
      throw new Error('La publicación no contiene datos válidos.');
    }

    const backupId = saveSubmissionBackup(payload);

    try {
      const client = await getClient();
      const { data, error } = await client.rpc('tpl_publicar_propiedad_v3', {
        p_payload: payload
      });

      if (error) throw error;
      if (!data?.ok) throw new Error('Supabase no confirmó la publicación.');

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
          ? `No pudimos enviar la publicación a TPL: ${error.message}`
          : 'No pudimos enviar la publicación a TPL.'
      );
      wrapped.cause = error;
      wrapped.localBackup = true;
      wrapped.backupId = backupId;
      throw wrapped;
    }
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

  async function listPublishedProperties() {
    const client = await getClient();
    const { data, error } = await client
      .from('tpl_propiedades')
      .select('id,codigo,tipo,estado,titulo,descripcion,region,comuna,sector,lat,lng,superficie_m2,precio_publicado,rol_situacion,electricidad,agua,acceso,topografia,suelo,exposicion,vista_principal,vegetacion,cierre_perimetral,porton,condominio,atributos_naturales,casa_datos,diagnostico,destacada,oportunidad_tpl,publicada_at,updated_at')
      .in('estado', ['publicada', 'activa', 'disponible'])
      .order('publicada_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }


  async function getPublishedPropertyById(identifier) {
    const value = String(identifier || '').trim();
    if (!value) return null;
    const client = await getClient();
    const fields = 'id,codigo,tipo,estado,titulo,descripcion,region,comuna,sector,direccion_referencia,lat,lng,superficie_m2,precio_publicado,moneda,rol_situacion,electricidad,agua,acceso,topografia,suelo,exposicion,vista_principal,vegetacion,cierre_perimetral,porton,condominio,distancia_ruta_principal_km,atributos_naturales,cercanias,casa_datos,diagnostico,destacada,oportunidad_tpl,metadata,publicada_at,updated_at';
    const publicStates = ['publicada', 'activa', 'disponible'];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    let query = client.from('tpl_propiedades').select(fields).in('estado', publicStates);
    query = isUuid ? query.eq('id', value) : query.eq('codigo', value);
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
    const resolveMedia = (item) => {
      if (item?.url) return item.url;
      const path = String(item?.storage_path || '').trim();
      if (!path) return '';
      if (/^https?:\/\//i.test(path)) return path;
      const bucket = item?.tipo === 'documento' ? 'tpl-documentos' : 'tpl-propiedades';
      return client.storage.from(bucket).getPublicUrl(path).data?.publicUrl || path;
    };
    const remoteImages = (media.data || []).map(resolveMedia).filter(Boolean);
    return {
      ...row,
      imagenes: [...new Set([...remoteImages, ...metadataImages].filter(Boolean))],
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

  async function createPublicOpportunity(payload) {
    if (!payload?.nombre_contacto || !payload?.email) {
      throw new Error('Nombre y correo son obligatorios.');
    }
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_registrar_oportunidad_publica_v1', {
      p_payload: payload
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible registrar la solicitud.');
    localEmit('oportunidad.publica_creada', data);
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
    if (!Number.isFinite(value) || value <= 0) throw new Error('Valor UF inválido.');
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
      .select('region,comuna,comuna_key,segmento,mediana_m2,p25_m2,p75_m2,mediana_uf_m2,uf_base_clp,cantidad_comparables,confianza,fuentes,fecha_observacion')
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
    if (error) throw error;
    if (!data?.ok) throw new Error('Supabase no confirmó la tasación.');
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
    if (!data?.ok) throw new Error(data?.message || 'Supabase no confirmó la actualización de la propiedad.');
    return data;
  }

  async function registerTerritorialAnalysis(payload) {
    const client = await getClient();
    const { data, error } = await client.rpc('tpl_registrar_analisis_tasador_v1', { p_payload: payload || {} });
    if (error) throw error;
    if (!data?.ok) throw new Error('Supabase no confirmó el análisis territorial.');
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
    if (!data?.ok) throw new Error('Supabase no confirmó la orden del informe.');
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
    if (!data?.ok) throw new Error('Supabase no confirmó la casa.');
    return data;
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

  function getPendingBackups() {
    return read(LOCAL_DRAFT_BACKUP, []).filter((item) => item.status !== 'sincronizado');
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
    activateFreeOwner,
    listPublishedProperties,
    getPublishedPropertyById,
    createPublicOpportunity,
    getCrmSnapshot,
    getCrmCommandCenter,
    getUfConfig,
    updateUfConfig,
    getTasadorReferences,
    getTasadorContext,
    getObservedComparables,
    registerValuation,
    getLatestCrmValuation,
    saveCrmValuationProperty,
    registerTerritorialAnalysis,
    getTerritorialPublicSummary,
    getTerritorialProjectAnalysis,
    createReportOrder,
    startReportPayment,
    getReportOrderStatus,
    listPublicPlans,
    listMyValuations,
    approvePublication,
    saveCrmHouse,
    trackEvent,
    emit: localEmit,
    getPendingBackups,
    hasBackend: () => true
  });
})(window);
