/**
 * TPL PROPERTY VIEW — normalizador único de una fila de tpl_propiedades para
 * pantalla.
 *
 * ANTES de este archivo, la misma tarea (tomar una fila cruda de
 * tpl_propiedades + el catálogo estático local y armar el objeto que la
 * pantalla realmente pinta) estaba escrita DOS veces, con reglas ligeramente
 * distintas:
 *   - frontend-v2/js/index.js → mapRemoteProperty() (la grilla del home)
 *   - frontend-v2/js/parcela.js → dentro de cargarParcela() (la ficha)
 *
 * Que existieran dos copias no era solo desprolijo: eran la causa directa de
 * al menos un bug real (la ficha individual ignoraba las fotos reales que el
 * servicio ya traía y las recalculaba mal — ver fix 2026-09-03). Cualquier
 * corrección hecha en una copia y no en la otra vuelve a divergir.
 *
 * Este archivo es ahora la ÚNICA fuente de esa normalización. Cualquier
 * pantalla que necesite convertir una fila de tpl_propiedades (más,
 * opcionalmente, la fila equivalente del catálogo estático local
 * frontend-v2/parcelas.js) en el objeto "parcela" que se pinta, debe llamar
 * a normalizarPropiedad() en vez de reescribir esta lógica.
 *
 * Se expone como script clásico (window.TPLPropertyView) para poder cargarse
 * con <script> normal igual que el resto de frontend-v2/js/core/*, sin forzar
 * un cambio a type="module" en cada página que ya funciona con scripts
 * sueltos.
 */
(function (global) {
  'use strict';

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function money(value) {
    if (typeof value === 'number') return value;
    return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
  }

  /**
   * Busca en el catálogo estático local (window.parcelas) la fila que
   * corresponde a una fila remota, por id/código/slug/source_legacy_id.
   */
  function buscarLocal(row, catalogoLocal) {
    try {
      const catalogo = Array.isArray(catalogoLocal) ? catalogoLocal : [];
      return catalogo.find((item) =>
        [item.id, item.codigo, item.slug, item.source_legacy_id]
          .some((value) => normalize(value) === normalize(row.codigo || row.id))
      ) || {};
    } catch {
      return {};
    }
  }

  /**
   * Normaliza una fila de tpl_propiedades (tal como la devuelven
   * listPublishedProperties()/getPublishedPropertyById() en tpl-data-service.js)
   * al objeto "parcela" que las pantallas pintan.
   *
   * @param {object} row - fila remota (de Supabase).
   * @param {object} [opts]
   * @param {object[]} [opts.catalogoLocal] - window.parcelas, para completar
   *   campos que la base aún no tiene (se usa como RESPALDO, nunca pisa un
   *   dato real de la base).
   * @param {object} [opts.local] - fila local ya resuelta (si la pantalla ya
   *   la encontró, evita buscarla de nuevo).
   */
  function normalizarPropiedad(row, opts = {}) {
    if (!row) return null;
    const local = opts.local || buscarLocal(row, opts.catalogoLocal);

    const meta = (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) || {};

    // tpl_propiedad_imagenes (row.imagenes, ya armado por tpl-data-service.js)
    // es la fuente de verdad real de fotos -- metadata.imagenes es el patrón
    // viejo que solo usan las 32 parcelas sembradas. Se prefiere siempre lo
    // real; metadata.imagenes es respaldo, y el catálogo local el último
    // respaldo de todos.
    const remoteImages = Array.isArray(row.imagenes) && row.imagenes.length
      ? row.imagenes.filter(Boolean)
      : (Array.isArray(meta.imagenes) ? meta.imagenes.filter(Boolean) : []);
    const localImages = Array.isArray(local.imagenes) ? local.imagenes.filter(Boolean) : [];
    // La lista remota REEMPLAZA a la local, no se le suma: una foto borrada
    // en el CRM no debe seguir apareciendo solo porque el catálogo estático
    // la conservaba. Solo se cae al respaldo local cuando la propiedad no
    // tiene ninguna foto real ni de metadata.
    const imagenes = remoteImages.length
      ? [...new Set([...remoteImages, row.imagen].filter(Boolean))]
      : [...new Set([...localImages, local.imagen].filter(Boolean))];

    const precioValue = Number(row.precio_publicado) || money(meta.precio) || money(local.precio) || 0;

    return {
      ...local,
      ...row,
      id: row.codigo || row.id,
      canonicalId: row.id,
      codigo: row.codigo || '',
      tipo: row.tipo || '',
      nombre: row.titulo || local.nombre || `${Number(row.superficie_m2) >= 10000 ? 'Campo' : 'Parcela'} en ${row.comuna || 'Chile'}`,
      descripcion: row.descripcion || '',
      region: row.region || '',
      comuna: row.comuna || '',
      sector: row.sector || '',
      lat: row.lat,
      lng: row.lng,
      tamano: row.superficie_m2 || local.tamano,
      superficie: row.superficie_m2 || local.superficie,
      precio: precioValue ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(precioValue) : 'Consultar',
      precioNumero: precioValue,
      rol: row.rol_situacion || local.rol,
      electricidad: row.electricidad,
      luz: row.electricidad || local.luz,
      agua: row.agua,
      acceso: row.acceso,
      topografia: row.topografia,
      suelo: row.suelo,
      exposicion: row.exposicion,
      vista_principal: row.vista_principal,
      vegetacion: row.vegetacion,
      cierre_perimetral: row.cierre_perimetral,
      porton: row.porton,
      condominio: row.condominio,
      atributos_naturales: row.atributos_naturales,
      casa_datos: row.casa_datos,
      diagnostico: row.diagnostico,
      destacada: row.destacada,
      oportunidad_tpl: row.oportunidad_tpl,
      imagenes,
      imagen: imagenes[0] || local.imagen || '',
      // Ya parseado: valoracionGuardada() y el resto de las pantallas leen la
      // tasación desde aquí y no deben volver a adivinar si viene como
      // objeto o como texto.
      metadata: meta,
      fuenteDatos: 'supabase',
    };
  }

  global.TPLPropertyView = Object.freeze({ normalizarPropiedad });
})(typeof window !== 'undefined' ? window : globalThis);
