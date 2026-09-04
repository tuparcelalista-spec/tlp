// =============================================================================
// TPL VALUATION ADAPTER - ORQUESTADOR UNICO DE TASACION
// =============================================================================
// Toma una propiedad tal como viene de tpl_propiedades y produce el resultado
// canonico de tasacion que consumen el informe premium y el detector de
// oportunidades. El calculo lo hace siempre js/core/valuation-engine.js: aqui
// no vive ninguna formula de valor.
//
// QUE CAMBIO Y POR QUE
//   1. Las distancias salen de tpl_geoint_propiedad_contexto, que ya las tiene
//      calculadas por comuna y hub. Antes se inventaban (10 km al centro, 15 km
//      al hub) para toda propiedad sin metadatos. Para la parcela de Caburgua
//      las reales son 15,04 km al centro de Pucon y 37,32 km al hub turistico.
//   2. El nivel turistico sale del mismo contexto (Pucon = internacional). El
//      motor lo cobra como el ajuste mas grande que existe, asi que inventarlo
//      o ignorarlo mueve el valor mas que cualquier otro atributo.
//   3. Las referencias comunales se cargan desde Supabase con la UF del dia.
//      Este archivo tenia ademas su propia tabla de medianas por comuna, una
//      tercera version que no coincidia con ninguna de las otras dos.
//   4. Los comparables reales del catastro (avisos a menos de 15 km) ya se
//      consultaban pero se descartaban. Ahora sostienen la confianza declarada.
// =============================================================================

export const TPLValuationAdapter = (function () {
  'use strict';

  const RADIO_COMPARABLES_KM = 15;

  // Vocabulario de la base (tpl_geoint_perfiles) -> vocabulario del motor.
  const NIVEL_TURISMO = {
    internacional: 'nacional',
    nacional: 'nacional',
    regional: 'regional',
    local: 'regional',
    local_regional: 'regional',
    sin_influencia: '',
    sin_clasificar: '',
  };

  let referenciasCargadas = null;

  async function cliente() {
    if (!window.TPLDataService?.getClient) return null;
    try {
      return await window.TPLDataService.getClient();
    } catch {
      return null;
    }
  }

  /** Carga en el motor las medianas comunales vigentes en Supabase, con la UF del dia. */
  async function cargarReferenciasComunales(motor) {
    if (!motor?.setMarketReferences || referenciasCargadas) return referenciasCargadas;
    try {
      const ctx = await window.TPLDataService.getTasadorContext();
      motor.setMarketReferences(ctx.references || [], { ufClp: Number(ctx.uf?.valor_clp || 0) });
      referenciasCargadas = {
        cantidad: (ctx.references || []).length,
        ufClp: Number(ctx.uf?.valor_clp || 0),
        ufFecha: ctx.uf?.fecha_valor || null,
        fuente: 'supabase',
      };
    } catch (error) {
      // El motor ya no trae medianas escritas a mano de respaldo: sin
      // Supabase no hay contraste de mercado y la tasacion sale 100% tecnica,
      // declarandolo en `cautions`.
      console.warn('[Tasador] Sin referencias comunales de Supabase; la tasacion sera solo tecnica.', error);
      referenciasCargadas = { cantidad: 0, ufClp: 0, ufFecha: null, fuente: 'sin_referencia' };
    }
    return referenciasCargadas;
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Tramos de superficie del motor. Un campo de 5 ha y una parcela de 5.000 m2
  // no comparten mercado: mezclarlos fue lo que obligo a segmentar la tabla de
  // referencias, y el informe tiene que respetar el mismo corte.
  const TRAMOS_MERCADO = [
    { nombre: 'parcela', desde: 3000, hasta: 12000 },
    { nombre: 'campo_chico', desde: 12000, hasta: 50000 },
    { nombre: 'campo', desde: 50000, hasta: 200000 },
  ];
  const tramoDe = (m2) => TRAMOS_MERCADO.find((t) => m2 >= t.desde && m2 < t.hasta)?.nombre || null;

  // Descarte de atipicos por Tukey 1,5 IQR, el mismo criterio con el que se
  // construyen las referencias comunales.
  function sinAtipicos(ordenados) {
    if (ordenados.length < 4) return ordenados;
    const iqr = percentil(ordenados, 0.75) - percentil(ordenados, 0.25);
    if (!(iqr > 0)) return ordenados;
    const piso = percentil(ordenados, 0.25) - 1.5 * iqr;
    const techo = percentil(ordenados, 0.75) + 1.5 * iqr;
    return ordenados.filter((v) => v >= piso && v <= techo);
  }

  function percentil(ordenados, p) {
    if (!ordenados.length) return 0;
    const pos = (ordenados.length - 1) * p;
    const bajo = Math.floor(pos);
    const alto = Math.ceil(pos);
    if (bajo === alto) return ordenados[bajo];
    return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (pos - bajo);
  }

  /**
   * Distancias y nivel turistico. Prioridad: contexto geoint calculado por la
   * base > lo que quedo guardado en la ficha > estimacion desde la ruta.
   */
  async function resolverTerritorio(propiedad) {
    const db = await cliente();
    if (db && propiedad.id) {
      try {
        const { data } = await db
          .from('tpl_geoint_propiedad_contexto')
          .select('distancia_centro_comunal_km,distancia_hub_efectivo_km,hub_efectivo_nombre,hub_efectivo_tipo,nivel_turismo,turismo_reemplaza_hub,confianza,geoint_version,calculado_at')
          .eq('propiedad_id', propiedad.id)
          .maybeSingle();

        if (data?.distancia_hub_efectivo_km != null) {
          const comunaKm = Number(data.distancia_centro_comunal_km) || null;
          let hubKm = Number(data.distancia_hub_efectivo_km);
          let hubNombre = data.hub_efectivo_nombre || '';
          let hubCorregido = false;

          // Cuando el turismo reemplaza al hub, el destino ES la cabecera de la
          // comuna, no un eje regional. Para Caburgua el atlas devolvia 37,3 km
          // al centroide del "Eje Lacustre Villarrica-Pucon" cuando Pucon, que
          // es el destino internacional, esta a 15,0 km. Esa diferencia movia
          // la tasacion de $136M a $107M por medir contra el punto equivocado.
          if (data.turismo_reemplaza_hub && comunaKm && comunaKm < hubKm) {
            hubKm = comunaKm;
            hubNombre = `${data.hub_efectivo_nombre || 'Destino turístico'} (medido a la cabecera comunal)`;
            hubCorregido = true;
          }

          return {
            comunaKm,
            hubKm,
            hubCorregido,
            hubNombre,
            hubTipo: data.hub_efectivo_tipo || '',
            nivelTurismoBase: data.nivel_turismo || 'sin_clasificar',
            turismoReemplazaHub: Boolean(data.turismo_reemplaza_hub),
            fuente: 'geoint',
            fuenteEtiqueta: hubCorregido
              ? 'Distancias del atlas territorial TPL, con el destino turístico medido a la cabecera comunal'
              : 'Distancias calculadas por el atlas territorial TPL',
            version: data.geoint_version || '',
            calculadoAt: data.calculado_at || null,
          };
        }
      } catch (error) {
        console.warn('[Tasador] Sin contexto geoint para esta propiedad.', error);
      }
    }

    const guardado = propiedad.metadata?.tasacion_entrada_actual || propiedad.metadata?.tasador_entrada || {};
    let comunaKm = Number(guardado.communeDistanceKm ?? guardado.distancia_centro_comuna_km) || null;
    let hubKm = Number(guardado.majorCityDistanceKm ?? guardado.distanceKm) || null;

    if (!hubKm && propiedad.distancia_ruta_principal_km) {
      comunaKm = comunaKm || Number(propiedad.distancia_ruta_principal_km) + 5;
      hubKm = comunaKm + 5;
    }

    // Un hub muy lejano con la cabecera comunal al lado significa que el hub
    // comercial real es la cabecera. Sin esta correccion, Caburgua se tasaba
    // contra Temuco a 89 km.
    if (hubKm && comunaKm && hubKm > 50 && comunaKm <= 25) hubKm = comunaKm;

    return {
      comunaKm,
      hubKm,
      hubNombre: '',
      hubTipo: '',
      nivelTurismoBase: propiedad.metadata?.nivel_turismo || guardado.tourismLevel || guardado.tourism || 'sin_clasificar',
      turismoReemplazaHub: false,
      fuente: hubKm ? 'ficha' : 'sin_dato',
      fuenteEtiqueta: hubKm
        ? 'Distancias tomadas de la ficha, no del atlas territorial'
        : 'Sin distancias confirmadas',
      version: '',
      calculadoAt: null,
    };
  }

  /** Avisos reales del catastro dentro del radio, para sostener la confianza. */
  async function analizarCatastro(propiedad) {
    const vacio = { cantidad: 0, medianaM2: 0, p25M2: 0, p75M2: 0, radioKm: RADIO_COMPARABLES_KM, criterio: 'ninguno', comuna: propiedad.comuna || '', items: [] };
    const db = await cliente();
    const lat = Number(propiedad.lat);
    const lng = Number(propiedad.lng);
    const criterio = Number.isFinite(lat) && Number.isFinite(lng) ? 'radio' : 'comuna';
    if (!db) return vacio;

    try {
      // Se acota en el servidor: la consulta anterior se traia las 562 filas de
      // la tabla al navegador en cada informe.
      let query = db.from('tpl_catastro_mercado').select('precio_clp,superficie_m2,lat,lng,titulo,comuna').limit(300);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const delta = 0.25; // ~28 km, holgado para luego filtrar por distancia real
        query = query.gte('lat', lat - delta).lte('lat', lat + delta).gte('lng', lng - delta).lte('lng', lng + delta);
      } else if (propiedad.comuna) {
        query = query.eq('comuna', propiedad.comuna);
      } else {
        return vacio;
      }

      const { data, error } = await query;
      if (error || !data?.length) return vacio;

      // Tramo de superficie de ESTA propiedad: los avisos de otro tramo no son
      // comparables suyos. Sin esto, la parcela de Caburgua (5.000 m2) tenia en
      // su tabla de evidencia dos campos de 50.000 m2 a $800 y $1.000/m2.
      const areaPropia = Number(propiedad.superficie_m2 || propiedad.superficie) || 0;
      const tramoPropio = areaPropia > 0 ? tramoDe(areaPropia) : null;

      const preciosM2 = [];
      const items = [];
      // El catastro trae el mismo aviso capturado mas de una vez; contarlo dos
      // veces le da doble peso a un solo dato y abulta "avisos comparables".
      const vistos = new Set();
      for (const fila of data) {
        const precio = Number(fila.precio_clp);
        const sup = Number(fila.superficie_m2);
        if (!(precio > 0) || !(sup > 0)) continue;
        if (tramoPropio && tramoDe(sup) !== tramoPropio) continue;
        const huella = precio + '|' + sup;
        if (vistos.has(huella)) continue;
        vistos.add(huella);
        let distanciaKm = null;
        if (Number.isFinite(lat) && Number.isFinite(lng) && fila.lat && fila.lng) {
          distanciaKm = haversineKm(lat, lng, Number(fila.lat), Number(fila.lng));
          if (distanciaKm > RADIO_COMPARABLES_KM) continue;
        }
        preciosM2.push(precio / sup);
        items.push({ titulo: fila.titulo || 'Aviso sin titulo', precio, superficie: sup, precioM2: precio / sup, distanciaKm, comuna: fila.comuna || '' });
      }

      if (!preciosM2.length) return vacio;
      preciosM2.sort((a, b) => a - b);
      items.sort((a, b) => (a.distanciaKm ?? 99) - (b.distanciaKm ?? 99));

      // Comparables de superficie parecida. El precio por m2 no es lineal: una
      // parcela de 5.000 m2 no dice nada del valor por metro de un campo de 10
      // hectareas. Comparar solo contra avisos del mismo porte es la unica
      // forma de que la referencia signifique algo.
      const area = areaPropia;
      let similares = null;
      if (area > 0) {
        const mismos = items.filter((c) => c.superficie >= area * 0.5 && c.superficie <= area * 1.8);
        if (mismos.length >= 3) {
          const precios = sinAtipicos(mismos.map((c) => c.precioM2).sort((a, b) => a - b));
          similares = {
            cantidad: precios.length,
            medianaM2: percentil(precios, 0.5),
            p25M2: percentil(precios, 0.25),
            p75M2: percentil(precios, 0.75),
            rangoM2: [Math.round(area * 0.5), Math.round(area * 1.8)],
          };
        }
      }

      // Un aviso con casa incluida, o uno mal capturado, distorsiona el rango
      // que se le muestra al propietario como "lo que se pide en la zona".
      const preciosLimpios = sinAtipicos(preciosM2);

      return {
        cantidad: preciosLimpios.length,
        medianaM2: percentil(preciosLimpios, 0.5),
        p25M2: percentil(preciosLimpios, 0.25),
        p75M2: percentil(preciosLimpios, 0.75),
        similares,
        areaPropiedad: area,
        radioKm: RADIO_COMPARABLES_KM,
        criterio,
        comuna: propiedad.comuna || '',
        items: items.slice(0, 12),
      };
    } catch (error) {
      console.warn('[Tasador] No fue posible leer el catastro de mercado.', error);
      return vacio;
    }
  }

  function texto(valor) {
    return String(valor ?? '').trim();
  }

  // El catalogo antiguo guarda "si" / "no" en agua, luz, rol y cierre. El motor
  // busca terminos concretos ("Rol propio", "Conectada", "Sin cierre"), asi que
  // un "si" no activaba ningun ajuste: la propiedad se tasaba como si no
  // tuviera agua, ni luz, ni rol. Aqui se traduce a su vocabulario.
  const SI = /^(si|sí|true|1)$/i;
  const NO = /^(no|false|0)$/i;
  function normalizarHeredado(valor, siTexto, noTexto) {
    const v = texto(valor);
    if (SI.test(v)) return siTexto;
    if (NO.test(v)) return noTexto;
    return v;
  }

  function construirEntrada(propiedad, territorio) {
    const guardado = propiedad.metadata?.tasacion_entrada_actual || propiedad.metadata?.tasador_entrada || {};
    const casa = propiedad.casa_datos || {};
    const superficie = Number(propiedad.superficie_m2 || propiedad.superficie || guardado.area) || 0;

    // El motor lee 'nature' como arreglo de atributos DECLARADOS. Antes se le
    // pasaba un texto que incluia la descripcion comercial, asi que la palabra
    // "Lago" escrita en el aviso sumaba +50% al valor sin que la parcela
    // tuviera acceso a ningun lago.
    // La ficha y la entrada guardada suelen traer los mismos atributos: sin
    // deduplicar, el informe listaba "termas, rio dentro, termas, rio dentro".
    const naturaleza = [];
    const vistos = new Set();
    for (const bruto of [
      ...(Array.isArray(propiedad.atributos_naturales) ? propiedad.atributos_naturales : []),
      ...(Array.isArray(guardado.nature) ? guardado.nature : []),
    ]) {
      const valor = texto(bruto);
      const clave = valor.toLowerCase();
      if (!valor || vistos.has(clave)) continue;
      vistos.add(clave);
      naturaleza.push(valor);
    }

    return {
      area: superficie,
      comuna: propiedad.comuna || guardado.comuna || '',
      region: propiedad.region || '',

      // Sin ubicacion (por ejemplo el detector de oportunidades, que solo pide
      // comuna, superficie y precio) se usa el tramo mas lejano del motor. Asi
      // el valor tecnico queda como piso y nunca inflado por una distancia
      // inventada; antes se asumian 15 km, que es el segundo mejor tramo.
      majorCityDistanceKm: territorio.hubKm ?? 999,
      communeDistanceKm: territorio.comunaKm,
      tourism: NIVEL_TURISMO[texto(territorio.nivelTurismoBase).toLowerCase()] ?? '',

      rol: normalizarHeredado(propiedad.rol_situacion || guardado.rol, 'Rol propio', 'Sin rol'),
      water: normalizarHeredado(propiedad.agua || guardado.water, 'Con agua', 'Sin factibilidad'),
      electricity: normalizarHeredado(propiedad.electricidad || guardado.electricity, 'Conectada', 'Sin electricidad'),
      topography: texto(propiedad.topografia || guardado.topography),
      access: texto(propiedad.acceso || guardado.access),
      fencing: normalizarHeredado(propiedad.cierre_perimetral || guardado.fencing, 'Cerrado completo', 'Sin cierre'),
      gate: normalizarHeredado(propiedad.porton || guardado.gate, 'Con portón', 'Sin portón'),
      condominium: propiedad.condominio ? 'si' : texto(guardado.condominium) || 'no',
      vegetation: texto(propiedad.vegetacion || guardado.vegetation),
      view: texto(propiedad.vista_principal || guardado.view),
      routeDistanceKm: Number(propiedad.distancia_ruta_principal_km ?? guardado.route_distance) || 0,
      nature: naturaleza,

      fireRisk: guardado.fireRisk || 'bajo',
      floodRisk: guardado.floodRisk || 'bajo',

      superficie_construida: Number(casa.superficieConstruida || casa.superficie_construida) || 0,
      materialidad: casa.materialidad || '',
      antiguedad_anios: Number(casa.antiguedadAnios || casa.antiguedad_anios) || 0,

      asking: Number(propiedad.precio_publicado || propiedad.precio) || 0,
    };
  }

  /**
   * Confianza declarada. Se apoya en dos cosas verificables: cuantos avisos
   * reales hay cerca y si las distancias son calculadas o estimadas. Antes el
   * informe imprimia 85% en toda propiedad porque leia un campo inexistente.
   */
  function calcularConfianza(mercado, referenciaComunal, territorio) {
    let pct = 35;
    const razones = [];

    const n = mercado.cantidad;
    const donde = mercado.criterio === 'radio' ? `a menos de ${mercado.radioKm} km` : `en ${mercado.comuna || 'la comuna'}`;
    if (n >= 30) { pct += 35; razones.push(`${n} avisos comparables ${donde}`); }
    else if (n >= 15) { pct += 28; razones.push(`${n} avisos comparables ${donde}`); }
    else if (n >= 6) { pct += 20; razones.push(`${n} avisos comparables ${donde}`); }
    else if (n >= 1) { pct += 10; razones.push(`solo ${n} ${n === 1 ? 'aviso comparable' : 'avisos comparables'} ${donde}`); }
    else razones.push('sin avisos comparables cercanos');

    // Los comparables de superficie parecida valen mas que el total: son los que
    // de verdad sirven para poner precio.
    if (mercado.similares) {
      pct += 8;
      razones.push(`${mercado.similares.cantidad} de esos avisos son de superficie parecida`);
    } else if (mercado.cantidad > 0) {
      razones.push('ninguno de los avisos cercanos es de superficie parecida');
    }

    // Estirar la mediana de una muestra a una superficie muy distinta no es
    // referencia. Desde que las medianas se publican por tramo de superficie
    // esto casi no ocurre, porque la muestra ya es del tamano de la propiedad;
    // se deja como red de seguridad para los bordes de cada tramo.
    if (referenciaComunal && Number(referenciaComunal.areaFactor) < 0.85) {
      pct -= 12;
      razones.push('la referencia comunal se extrapoló a una superficie mucho mayor que la de su muestra');
    }

    const muestra = Number(referenciaComunal?.sampleSize) || 0;
    if (muestra >= 20) { pct += 15; razones.push(`referencia comunal con muestra de ${muestra}`); }
    else if (muestra >= 8) { pct += 10; razones.push(`referencia comunal con muestra de ${muestra}`); }
    else if (muestra > 0) { pct += 5; razones.push(`referencia comunal con muestra corta (${muestra})`); }
    else razones.push('sin referencia comunal para el tramo de superficie de esta propiedad');

    // Una referencia prestada de comunas vecinas describe el territorio, no la
    // comuna. Sirve, pero no puede sostener la misma confianza que los avisos
    // de la propia comuna.
    if (referenciaComunal?.origin === 'territorial') {
      pct -= 10;
      razones.push(`la referencia de mercado viene de comunas vecinas dentro de ${referenciaComunal.radiusKm || 35} km, no de ${referenciaComunal.comuna || 'la comuna'} misma`);
    } else if (referenciaComunal) {
      razones.push(`comparables del mismo tramo (${referenciaComunal.segmentLabel || referenciaComunal.segmentName || 'superficie similar'})`);
    }

    if (territorio.fuente === 'geoint') { pct += 15; razones.push('distancias calculadas por el atlas territorial'); }
    else if (territorio.fuente === 'ficha') { pct += 5; razones.push('distancias tomadas de la ficha'); }
    else razones.push('distancias sin confirmar');

    // Sin ubicacion el numero titular es un piso tecnico, no una estimacion de
    // mercado: por muchos comparables que haya, la confianza no puede ser alta.
    if (territorio.fuente === 'sin_dato') pct = Math.min(pct, 50);

    pct = Math.max(20, Math.min(95, pct));
    const nivel = pct >= 80 ? 'Alta' : pct >= 60 ? 'Media-alta' : pct >= 45 ? 'Media' : 'Baja';
    return { pct, nivel, razones };
  }

  function normalizar(resultado, contexto) {
    const { propiedad, territorio, mercado, referencias, entrada } = contexto;
    const referenciaComunal = resultado.marketReference || null;
    const confianza = calcularConfianza(mercado, referenciaComunal, territorio);

    // El motor ya entrega cada ajuste con su monto en pesos; no hay que
    // reconstruirlo interpretando textos como "+15%".
    const ajustes = (resultado.adjustments || []).map((a) => ({
      key: a.key,
      name: a.label,
      detail: a.detail || '',
      pct: a.pct,
      value: Math.round(a.amount || 0),
      type: (a.pct || 0) >= 0 ? 'positive' : 'negative',
    }));

    const valorFinal = Number(resultado.valorFinal) || 0;

    return {
      ok: !resultado.error,
      error: resultado.error || null,

      // Cifra titular unica del sistema.
      valorFinal,

      valores: {
        recomendado: valorFinal,
        comunalBruto: Number(resultado.valor_comunal) || 0,
        ventaApuro: Number(resultado.valor_venta_apuro) || 0,
        mercadoPotencial: Number(resultado.technicalPotential) || 0,
        promedioReferencia: Number(resultado.valor_recomendado) || 0,
        m2: resultado.area ? Math.round(valorFinal / resultado.area) : 0,
      },

      baseTerritorial: Number(resultado.territorialBase) || 0,
      baseSuperficie: Number(resultado.base) || 0,
      adjustments: ajustes,

      confianza: confianza.pct,
      confianzaDetalle: confianza,

      territorio: {
        ...territorio,
        multiplicador: resultado.territorialBlend?.multiplier ?? null,
        tramoHub: resultado.territorialBlend?.major?.label || '',
        tramoComuna: resultado.territorialBlend?.local?.label || '',
      },

      mercado: {
        ...mercado,
        referenciaComunal,
        ufClp: referencias?.ufClp || 0,
        ufFecha: referencias?.ufFecha || null,
        fuenteReferencias: referencias?.fuente || 'tabla_motor',
      },

      indices: {
        propiedad: resultado.propertyIndex || null,
        territorial: resultado.territorialIndex || null,
        global: Number(resultado.score) || 0,
      },

      entorno: resultado.nearbyContext || null,

      precio: resultado.priceAnalysis || null,
      cautions: [
        ...(resultado.cautions || []),
        ...(territorio.fuente === 'sin_dato'
          ? ['Esta propiedad no tiene ubicacion confirmada. El valor tecnico se calculo con el tramo de distancia mas desfavorable, asi que es un piso y no una estimacion de mercado.']
          : []),
        ...(territorio.fuente === 'ficha'
          ? ['Las distancias no vienen del atlas territorial sino de lo que quedo guardado en la ficha.']
          : []),
      ],
      motor: { version: resultado.engineVersion || resultado.method || '', calculadoAt: new Date().toISOString() },
      // Lo que el motor leyo realmente, ya traducido desde el catalogo antiguo.
      // El informe muestra esto y no la fila cruda, para que la ficha tecnica
      // coincida con el calculo que aparece al lado.
      entrada,
      propiedad,
    };
  }

  async function runValuation(rawProperty, engineInstance, opciones = {}) {
    const motor = engineInstance || window.TPLLandEngine;
    if (!motor?.calculate) throw new Error('El motor de tasacion TPL no esta disponible en esta pagina.');

    const propiedad = rawProperty || {};
    const referencias = await cargarReferenciasComunales(motor);
    const [territorio, mercado, entorno] = await Promise.all([
      resolverTerritorio(propiedad),
      analizarCatastro(propiedad),
      // Salud, comercio, educacion y atractivos reales alrededor del punto.
      // Sin esto el indice territorial dejaba cuatro de sus ocho componentes en
      // "sin dato" y los puntuaba con un 50% neutro.
      opciones.conEntorno === false
        ? Promise.resolve(null)
        : Promise.resolve(motor.fetchNearbyContext?.(propiedad.lat, propiedad.lng)).catch(() => null),
    ]);

    const entrada = construirEntrada(propiedad, territorio);
    if (entorno) entrada.nearbyContext = entorno;
    const resultado = motor.calculate(entrada);
    if (resultado?.error) {
      const error = new Error(resultado.error);
      error.entrada = entrada;
      throw error;
    }

    return normalizar(resultado, { propiedad, territorio, mercado, referencias, entrada });
  }

  /**
   * Misma salida canonica, pero a partir de una tasacion YA calculada por el
   * servidor (la que viaja en tpl_tasaciones.resultado).
   *
   * Se usa cuando la pagina corre como anonimo: en ese caso no puede leer
   * tpl_geoint_propiedad_contexto y, sin las distancias del atlas, el motor cae
   * al tramo mas desfavorable. El informe del propietario mostraba $12.070.000
   * donde el valor real es $136.390.000. La evidencia de mercado si se consulta
   * en vivo, porque el catastro si es legible por anonimos.
   */
  async function runValuationFromStored(rawProperty, resultadoGuardado) {
    const resultado = resultadoGuardado || {};
    if (!resultado.valorFinal) throw new Error('La tasacion guardada no trae un valor utilizable.');

    const propiedad = rawProperty || {};
    const mercado = await analizarCatastro(propiedad);

    const blend = resultado.territorialBlend || {};
    const territorio = {
      comunaKm: Number(resultado.communeDistanceKm ?? blend.local?.distanceKm) || null,
      hubKm: Number(blend.major?.distanceKm) || null,
      hubCorregido: false,
      hubNombre: resultado.nearestCity?.name || 'Polo de referencia',
      hubTipo: '',
      nivelTurismoBase: blend.tourismNationalProtected ? 'nacional' : 'sin_clasificar',
      turismoReemplazaHub: Boolean(blend.tourismNationalProtected),
      fuente: 'geoint',
      fuenteEtiqueta: 'Distancias calculadas por el atlas territorial TPL',
      version: '',
      calculadoAt: null,
    };

    const referencias = {
      cantidad: 0,
      ufClp: Number(resultado.marketReference?.ufClp) || 0,
      ufFecha: resultado.marketReference?.observedAt || null,
      fuente: resultado.marketReference?.source === 'supabase' ? 'supabase' : 'sin_referencia',
    };

    return normalizar(resultado, {
      propiedad,
      territorio,
      mercado,
      referencias,
      entrada: resultado.entrada || {},
    });
  }

  return { runValuation, runValuationFromStored };
})();

// El detector de oportunidades lo consume desde window, sin import.
if (typeof window !== 'undefined') window.TPLValuationAdapter = TPLValuationAdapter;
