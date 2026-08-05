(function (window) {
  'use strict';

  const TYPE_ALIASES = Object.freeze({
    parcela: 'parcela',
    terreno: 'parcela',
    campo: 'campo',
    casa: 'casa_sola',
    casa_sola: 'casa_sola',
    casa_con_terreno: 'casa_con_terreno',
    parcela_con_casa: 'parcela_con_casa',
    sitio: 'sitio_urbano',
    sitio_urbano: 'sitio_urbano',
    proyecto: 'proyecto_inmobiliario',
    proyecto_inmobiliario: 'proyecto_inmobiliario'
  });

  function normalizeType(value) {
    const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return TYPE_ALIASES[key] || 'parcela';
  }

  function hasTerrain(type) {
    return ['parcela', 'campo', 'sitio_urbano', 'casa_con_terreno', 'parcela_con_casa', 'proyecto_inmobiliario'].includes(normalizeType(type));
  }

  function hasDwelling(type) {
    return ['casa_sola', 'casa_con_terreno', 'parcela_con_casa'].includes(normalizeType(type));
  }

  function normalizeMasterAsset(payload) {
    const raw = payload?.activo || payload || {};
    const components = payload?.componentes || {};
    const type = normalizeType(raw.tipo);
    const images = Array.isArray(payload?.imagenes) ? payload.imagenes : [];

    return {
      id: raw.id || null,
      code: raw.codigo || '',
      type,
      hasTerrain: hasTerrain(type),
      hasDwelling: hasDwelling(type),
      status: raw.estado || raw.estado_publicacion || 'revision',
      title: raw.titulo || raw.nombre_comercial || 'Propiedad TPL',
      description: raw.descripcion || '',
      location: {
        region: raw.region || '',
        comuna: raw.comuna || '',
        sector: raw.sector || raw.localidad || '',
        reference: raw.direccion_referencia || raw.ubicacion_texto || '',
        lat: raw.lat == null ? null : Number(raw.lat),
        lng: raw.lng == null ? null : Number(raw.lng)
      },
      price: {
        amount: Number(raw.precio_publicado || 0),
        currency: raw.moneda || 'CLP'
      },
      terrain: hasTerrain(type) ? { ...raw, ...(components.terreno || {}) } : null,
      dwelling: hasDwelling(type) ? { ...(raw.casa_datos || {}), ...(components.vivienda || {}) } : null,
      commercial: components.comercial || {},
      scores: payload?.scores || {},
      owner: payload?.relaciones?.propietario || null,
      broker: payload?.relaciones?.corredor || null,
      images: images.map((item) => ({
        url: item.url || item.storage_path || '',
        type: item.tipo || 'foto',
        cover: Boolean(item.es_portada),
        order: Number(item.orden || 0),
        alt: item.alt || ''
      })).filter((item) => item.url),
      version: Number(raw.version_actual || 1),
      plan: raw.plan_codigo || 'gratis',
      publicContactMode: raw.contacto_publico_modo || 'tpl',
      updatedAt: raw.updated_at || null,
      raw
    };
  }

  async function getMasterAsset(identifier) {
    const service = window.TPLDataService;
    if (!service?.getClient) throw new Error('TPLDataService no está disponible.');
    const client = await service.getClient();
    const { data, error } = await client.rpc('tpl_ficha_maestra_activo_v1', {
      p_identificador: String(identifier || '').trim()
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible cargar la ficha maestra.');
    return normalizeMasterAsset(data);
  }

  window.TPLMasterAsset = Object.freeze({
    normalizeType,
    hasTerrain,
    hasDwelling,
    normalize: normalizeMasterAsset,
    get: getMasterAsset
  });
})(window);
