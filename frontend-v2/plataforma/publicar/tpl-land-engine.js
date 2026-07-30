(function(global){
  'use strict';

  const RULES = Object.freeze({
    surfaceBands: Object.freeze([
      Object.freeze({ upTo: 7000, rate: 2000 }),
      Object.freeze({ upTo: 10000, rate: 1000 }),
      Object.freeze({ upTo: Infinity, rate: 500 })
    ]),
    majorCityDistanceMultipliers: Object.freeze([
      Object.freeze({ maxKm: 10, multiplier: 9, label: '0 a 10 km' }),
      Object.freeze({ maxKm: 15, multiplier: 5, label: 'Más de 10 hasta 15 km' }),
      Object.freeze({ maxKm: 25, multiplier: 4, label: 'Más de 15 hasta 25 km' }),
      Object.freeze({ maxKm: 35, multiplier: 3, label: 'Más de 25 hasta 35 km' }),
      Object.freeze({ maxKm: Infinity, multiplier: 1, label: 'Más de 35 km' })
    ]),
    localTownDistanceMultipliers: Object.freeze([
      Object.freeze({ maxKm: 10, multiplier: 3.5, label: '0 a 10 km' }),
      Object.freeze({ maxKm: 15, multiplier: 2, label: 'Más de 10 hasta 15 km' }),
      Object.freeze({ maxKm: 25, multiplier: 1, label: 'Más de 15 hasta 25 km' }),
      Object.freeze({ maxKm: 35, multiplier: 1, label: 'Más de 25 hasta 35 km' }),
      Object.freeze({ maxKm: Infinity, multiplier: 1, label: 'Más de 35 km' })
    ]),
    quickFactor: 0.90,
    patientFactor: 1.10,
    minimumAdjustmentFactor: 0.10
  });

  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function roundPrice(value){
    return Math.round(Number(value || 0) / 10000) * 10000;
  }

  function calculateSurfaceBase(area){
    const safeArea = Math.max(0, Number(area) || 0);
    let previous = 0;
    let total = 0;
    const bands = [];

    for(const band of RULES.surfaceBands){
      const bandArea = Math.max(0, Math.min(safeArea, band.upTo) - previous);
      if(bandArea > 0){
        const amount = bandArea * band.rate;
        total += amount;
        bands.push({ from: previous + 1, to: Number.isFinite(band.upTo) ? Math.min(safeArea, band.upTo) : safeArea, area: bandArea, rate: band.rate, amount });
      }
      previous = band.upTo;
      if(safeArea <= band.upTo) break;
    }
    return { base: Math.round(total), area: safeArea, bands };
  }

  const MAJOR_URBAN_POLES = Object.freeze([
    'concepcion','los angeles','chillan','temuco','puerto montt','valdivia',
    'santiago','vina del mar','valparaiso','rancagua','talca','curico',
    'osorno','antofagasta','la serena','coquimbo','iquique','arica'
  ]);

  // Referencias observadas: se usan como señal de mercado y control de coherencia,
  // no reemplazan la valoración territorial ni los atributos de la propiedad.
  const MARKET_REFERENCES = Object.freeze({
    quillon: Object.freeze({
      segment:'parcela_sola', medianM2:4800, p25M2:3626, p75M2:5928,
      sampleSize:22, observedAt:'2026-07-29', confidence:'media-alta',
      sources:['Portal Inmobiliario','Yapo','Portal Terreno'],
      scope:'comunal', note:'Referencia comunal rural. No usa localidades ni microzonas.'
    }),
    florida: Object.freeze({
      segment:'parcela_sola', medianM2:5000, p25M2:3800, p75M2:7143,
      sampleSize:9, observedAt:'2026-07-29', confidence:'media',
      sources:['Portal Inmobiliario','Yapo','Portal Terreno'],
      scope:'comunal', note:'Referencia preliminar comunal; excluir casas y casos atípicos.'
    }),
    nacimiento: Object.freeze({
      segment:'parcela_sola', medianM2:4294, p25M2:3508, p75M2:5015,
      sampleSize:4, observedAt:'2026-07-29', confidence:'baja-media',
      sources:['Portal Inmobiliario','Yapo','Portal Terreno'],
      scope:'comunal', note:'Muestra reducida: usar como señal de mercado, no como valor determinante.'
    }),
    pucon: Object.freeze({
      segment:'parcela_sola', medianM2:10300, p25M2:9625, p75M2:12385,
      sampleSize:8, observedAt:'2026-07-29', confidence:'media',
      sources:['Portal Inmobiliario','Yapo','Portal Terreno'],
      scope:'comunal', note:'Referencia comunal. No premia localidades; atributos reales de cada parcela explican diferencias.'
    })
  });

  function isMajorUrbanPole(nearestCity){
    const name = normalize(nearestCity?.name);
    const category = normalize(nearestCity?.category);
    if(MAJOR_URBAN_POLES.some(city => name === city || name.includes(city))) return true;
    return /capital regional|metropolitana|gran ciudad|polo regional/.test(category);
  }

  function distanceRule(distanceKm, nearestCity){
    const km = Math.max(0, Number(distanceKm) || 0);
    const major = isMajorUrbanPole(nearestCity);
    const bands = major ? RULES.majorCityDistanceMultipliers : RULES.localTownDistanceMultipliers;
    const band = bands.find(item => km <= item.maxKm) || bands.at(-1);
    return { distanceKm: km, multiplier: band.multiplier, label: band.label, urbanClass: major ? 'ciudad_grande' : 'comuna_pueblo_menor' };
  }

  function marketReference(comuna, area){
    const ref = MARKET_REFERENCES[normalize(comuna)];
    if(!ref) return null;
    const safeArea = Math.max(0, Number(area) || 0);
    return {
      ...ref,
      medianValue: roundPrice(safeArea * ref.medianM2),
      p25Value: roundPrice(safeArea * ref.p25M2),
      p75Value: roundPrice(safeArea * ref.p75M2)
    };
  }

  function santiagoAdjustment(region, comuna, sector){
    const r = normalize(region);
    if(!r.includes('metropolitana')) return null;
    const c = normalize(comuna);
    const s = normalize(sector);
    const premiumSector = /chicureo|la dehesa|lo barnechea/.test(`${c} ${s}`);
    const highDemand = /colina|calera de tango|pirque|buin|paine|lampa/.test(c);
    if(premiumSector) return { key:'santiago_premium', label:'Santiago · sector premium', pct:2.00 };
    if(highDemand) return { key:'santiago_alta_demanda', label:'Santiago · zona de alta demanda', pct:1.50 };
    return { key:'santiago_general', label:'Región Metropolitana de Santiago', pct:1.00 };
  }

  function citySpecialAdjustment(region, comuna, sector){
    const c = normalize(comuna);
    // Para comunas con referencia TPL, el nombre de localidad/sector NO agrega premio automático.
    // La diferencia debe provenir de atributos verificables de la parcela y de su distancia real.
    if(MARKET_REFERENCES[c]) return null;
    const santiago = santiagoAdjustment(region, comuna, sector);
    if(santiago) return santiago;
    if(c.includes('vina del mar')) return { key:'vina_del_mar', label:'Viña del Mar', pct:1.00 };
    return null;
  }

  function calculate(input){
    const area = Math.max(0, Number(input.area || input.superficie || input.areaTerreno) || 0);
    if(!area) return { error:'La superficie debe ser mayor que cero.' };
    const distanceKm = Number(input.distanceKm);
    if(!Number.isFinite(distanceKm) || distanceKm < 0) return { error:'No fue posible determinar la distancia a una ciudad principal.' };

    const surfacePricing = calculateSurfaceBase(area);
    const distance = distanceRule(distanceKm, input.nearestCity);
    const commercialBase = Math.round(surfacePricing.base * distance.multiplier);
    const adjustments = [];
    const add = (key, label, pct, detail='') => adjustments.push({ key, label, pct, detail, amount:Math.round(commercialBase * pct) });

    const rol = normalize(input.rol);
    if(rol.includes('rol propio')) add('rol_propio','Rol propio',0.05);
    else if(rol) add('sin_rol_propio','Sin rol propio o situación equivalente',-0.15);

    const electricity = normalize(input.electricity);
    if(/conectada|empalme instalado/.test(electricity)) add('luz_conectada','Empalme o conexión eléctrica',0.15);
    else if(/postacion|factibilidad/.test(electricity)) add('luz_factible','Factibilidad eléctrica',0.10);

    const topography = normalize(input.topography);
    if(/completamente plana|mayormente plana/.test(topography)) add('terreno_plano','Terreno plano',0.20);

    const nature = (input.nature || []).map(normalize);
    if(nature.some(item => item.includes('rio dentro') || item === 'rio')) add('acceso_rio','Acceso a río',0.30);
    if(nature.some(item => item.includes('vertiente'))) add('vertiente','Vertiente natural',0.20);

    const tourism = normalize(input.tourism);
    // Premio territorial normalizado: evita el antiguo error de escala +300%.
    // El publicador lo resuelve desde el catálogo nacional (comuna + eje urbano/turístico).
    if(tourism === 'nacional') add('turismo_nacional','Destino turístico de alcance nacional/internacional',0.30);
    else if(tourism === 'local') add('turismo_local','Zona turística regional',0.20);

    const view = normalize(input.view);
    if(view.includes('mar')) add('vista_mar','Vista al mar',0.30);
    else if(view.includes('lago') || view.includes('laguna')) add('vista_lago','Vista a lago o laguna',0.30);
    else if(view.includes('cordillera')) add('vista_cordillera','Vista a cordillera',0.20);

    const routeKm = Math.max(0, Number(input.routeDistanceKm) || 0);
    const routePenaltyPct = Math.min(routeKm, 30) / 100;
    if(routeKm > 0) add(
      'distancia_ruta',
      `Distancia a ruta principal (${routeKm.toFixed(1)} km)`,
      -routePenaltyPct,
      routeKm > 30 ? '-1% por km, con descuento máximo de -30%' : '-1% por cada kilómetro'
    );

    const fencing = normalize(input.fencing);
    if(fencing.includes('completamente')) add('cercada','Completamente cercada',0.10);
    else if(fencing.includes('sin cierre')) add('sin_cierre','Sin cierre perimetral',-0.10);

    if(normalize(input.condominium) === 'si') add('condominio','Propiedad en condominio o loteo',0.20);

    const gate = normalize(input.gate);
    if(/porton instalado|porton automatico|acceso controlado/.test(gate)) add('porton','Portón o acceso controlado',0.05);

    const vegetation = normalize(input.vegetation);
    if(vegetation.includes('bosque nativo') || nature.some(item => item.includes('bosque nativo'))) add('bosque_nativo','Bosque nativo',0.10);

    const soil = normalize(input.soil);
    if(soil.includes('seco')) add('suelo_seco','Suelo seco',-0.05);

    const cityAdj = citySpecialAdjustment(input.region, input.comuna, input.sector);
    if(cityAdj) add(cityAdj.key, cityAdj.label, cityAdj.pct);

    const totalPct = adjustments.reduce((sum,item) => sum + item.pct, 0);
    const appliedFactor = Math.max(RULES.minimumAdjustmentFactor, 1 + totalPct);
    const ideal = roundPrice(commercialBase * appliedFactor);
    const quick = roundPrice(ideal * RULES.quickFactor);
    const patient = roundPrice(ideal * RULES.patientFactor);
    const asking = Number(input.asking) || 0;
    const diff = asking && ideal ? ((asking - ideal) / ideal * 100) : 0;
    const market = marketReference(input.comuna, area);

    return {
      quick, ideal, patient, reference:ideal, low:quick, high:patient,
      asking, diff, area, location:input.location || '', region:input.region || '', comuna:input.comuna || '',
      base:surfacePricing.base, surfacePricing, commercialBase,
      cityDistance:distance, distanceMultiplier:distance.multiplier,
      nearestCity: input.nearestCity ? { name:input.nearestCity.name, category:input.nearestCity.category||'', weight:Number(input.nearestCity.weight||1), distanceKm:Number(distanceKm.toFixed(1)) } : null,
      territorial: input.territorial || null, communeProfile: input.communeProfile || null,
      marketReference:market,
      adjustments, totalPct, adjustmentFactor:appliedFactor,
      score:Math.max(35,Math.min(95,55 + Math.min(30, adjustments.length * 3))),
      coverage:'reglas_tpl_propietario_v1', source:'tpl_land_engine_local', persisted:false,
      method:'tpl-land-engine-v1',
      cautions: distanceKm > 60 ? ['Para distancias superiores a 60 km se aplica multiplicador ×1.'] : []
    };
  }

  const exportObj = Object.freeze({ RULES, MARKET_REFERENCES, MAJOR_URBAN_POLES, calculateSurfaceBase, distanceRule, marketReference, calculate });
  if (typeof module !== 'undefined' && module.exports) module.exports = exportObj;
  global.TPLLandEngine = exportObj;
})(typeof window !== 'undefined' ? window : globalThis);
