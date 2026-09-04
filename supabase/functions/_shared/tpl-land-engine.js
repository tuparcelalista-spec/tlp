// =============================================================================
// ARCHIVO GENERADO - NO EDITAR A MANO
// =============================================================================
// Copia para Deno del motor unico del proyecto. La fuente es
// frontend-v2/js/core/valuation-engine.js.
//
// Para cambiar una regla de tasacion: edita ese archivo y ejecuta
//   node scripts/generar-motor-deno.mjs
// =============================================================================

// =============================================================================
// TPL LAND ENGINE - MOTOR DE TASACION UNICO DEL PROYECTO
// =============================================================================
// Este es el UNICO archivo que calcula el valor de un terreno en Tu Parcela
// Lista. Lo consumen el catalogo, la ficha de parcela, el proyecto, el
// publicador, el tasador publico, el CRM, el portal del propietario y el
// informe premium.
//
// Antes convivian cuatro motores distintos bajo el mismo nombre global
// TPLLandEngine, y cada pantalla mostraba un precio diferente para la misma
// parcela. La copia de Deno (supabase/functions/_shared/tpl-land-engine.js)
// se GENERA desde este archivo con scripts/generar-motor-deno.mjs; no se edita
// a mano.
//
// Si cambias una regla aqui, ejecuta:  node scripts/generar-motor-deno.mjs
// =============================================================================

(function(global){
  'use strict';

  const ENGINE_VERSION = 'tpl-land-engine-v2.3-mercado-segmentado-20260902';

  const RULES = Object.freeze({
    // Tramos acumulativos aprobados TPL.
    surfaceBands: Object.freeze([
      Object.freeze({ upTo: 7000, rate: 2000 }),
      Object.freeze({ upTo: 50000, rate: 1500 }),
      Object.freeze({ upTo: Infinity, rate: 1200 })
    ]),
    // Ciudad grande: principal motor territorial (70%).
    majorCityDistanceMultipliers: Object.freeze([
      Object.freeze({ maxKm: 10, multiplier: 9, label: '0 a 10 km' }),
      Object.freeze({ maxKm: 15, multiplier: 5, label: 'Más de 10 hasta 15 km' }),
      Object.freeze({ maxKm: 25, multiplier: 4, label: 'Más de 15 hasta 25 km' }),
      Object.freeze({ maxKm: 35, multiplier: 2, label: 'Más de 25 hasta 35 km' }),
      Object.freeze({ maxKm: 50, multiplier: 1.5, label: 'Más de 35 hasta 50 km' }),
      Object.freeze({ maxKm: Infinity, multiplier: 1, label: 'Más de 50 km' })
    ]),
    // Centro comunal/local: señal secundaria (30%).
    localTownDistanceMultipliers: Object.freeze([
      Object.freeze({ maxKm: 5, multiplier: 2.5, label: '0 a 5 km' }),
      Object.freeze({ maxKm: 10, multiplier: 2, label: 'Más de 5 hasta 10 km' }),
      Object.freeze({ maxKm: 15, multiplier: 1.5, label: 'Más de 10 hasta 15 km' }),
      Object.freeze({ maxKm: 25, multiplier: 1.2, label: 'Más de 15 hasta 25 km' }),
      Object.freeze({ maxKm: Infinity, multiplier: 1, label: 'Más de 25 km' })
    ]),
    majorCityWeight: 0.70,
    communeWeight: 0.30,
    // Peso del mercado comunal en la CIFRA TITULAR. Hasta el 2026-09-02 el
    // titular era 100% valor tecnico: la mediana del catastro se calculaba, se
    // mostraba en el informe y no movia el precio ni un peso, que es por lo que
    // el tasador no reflejaba el mercado. Decision del 2026-09-02: mitad y
    // mitad. Si la comuna no tiene muestra de su tramo, el titular vuelve a ser
    // 100% tecnico y se declara en `cautions` (nunca se promedia contra cero).
    technicalWeight: 0.50,
    marketWeight: 0.50,
    agileFactor: 0.93,
    patientFactor: 1.07,
    ruralImmediateClosingM2: 1650,
    routePenaltyPerKm: 0.01,
    routePenaltyMax: 0.50,
    communalIsolationThresholdKm: 20,
    isolatedTechnicalWeight: 0.70,
    isolatedMarketWeight: 0.30,
    seasonalAdjustmentFactor: 0.88 // Invierno: -12%
  });

  const TERRITORIAL_WEIGHTS = Object.freeze({
    centerUrban: 20, healthServices: 15, commerce: 12, security: 8,
    education: 8, generalServices: 7, gastronomy: 5, attractions: 25
  });

  const MAJOR_URBAN_POLES = Object.freeze([
    'concepcion','gran concepcion','los angeles','chillan','temuco','puerto montt','valdivia',
    'santiago','vina del mar','valparaiso','rancagua','talca','curico','osorno',
    'antofagasta','la serena','coquimbo','iquique','arica'
  ]);

  // ---------------------------------------------------------------------------
  // REFERENCIAS COMUNALES DE MERCADO
  // ---------------------------------------------------------------------------
  // El motor NO trae medianas escritas a mano. Hasta el 2026-09-02 tenia unas 50
  // comunas con cifras redondas ($4.500, $5.000, $6.500) que nadie habia medido,
  // y como setMarketReferences las fusionaba con las de Supabase, esos numeros
  // inventados sobrevivian en toda comuna sin dato real: Negrete, Nipas y Pemuco
  // tasaban contra una mediana imaginaria.
  //
  // La unica fuente de verdad es tpl_tasador_referencias, que se recalcula con
  // scripts/recalcular-referencias-comunales.mjs sobre el catastro de avisos
  // reales. Si una comuna no tiene muestra, el motor NO inventa: entrega el
  // valor tecnico y lo declara en `cautions`.
  const MARKET_REFERENCES = Object.freeze({});

  // Tramos de superficie con los que se elige contra que muestra comparar. Una
  // parcela de 5.000 m2 y un campo de 6 hectareas no cotizan en el mismo
  // mercado: en Nacimiento las parcelas del catastro estaban en $6.102/m2 y los
  // campos en $2.978/m2, y promediar los dos daba $3.774/m2, que no describia a
  // ninguno. Estos limites son los mismos del script que publica las
  // referencias: si cambian aqui, hay que cambiarlos alla.
  const MARKET_SEGMENTS = Object.freeze([
    Object.freeze({ name:'parcela',     from:3000,  to:12000,  label:'Parcela 3.000-12.000 m²' }),
    Object.freeze({ name:'campo_chico', from:12000, to:50000,  label:'Campo 1,2-5 ha' }),
    Object.freeze({ name:'campo',       from:50000, to:200000, label:'Campo 5-20 ha' })
  ]);

  // Localidades que la gente escribe como si fueran comuna. Caburgua es Pucon y
  // Nipas es Ranquil; sin esto quedan sin referencia por un tema de
  // nomenclatura, no porque falte mercado.
  const COMMUNE_ALIASES = Object.freeze({
    caburgua:'pucon',
    nipas:'ranquil'
  });

  let RUNTIME_MARKET_REFERENCES = null;

  function segmentForArea(area){
    const m2=Math.max(0,Number(area)||0);
    return MARKET_SEGMENTS.find(s=>m2>=s.from&&m2<s.to)||null;
  }

  // Carga las referencias vigentes de Supabase. Se indexan por comuna Y
  // segmento: una misma comuna tiene una mediana para parcelas y otra distinta
  // para campos.
  function setMarketReferences(rows=[], context={}){
    const mapped={};
    for(const row of rows||[]){
      const key=normalize(row.comuna_key||row.comuna);
      if(!key)continue;
      const meta=row.metadata||{};
      // Las filas antiguas traian el segmento con otro nombre
      // ('parcela_sola_5k_10k', 'parcela_catastro_limpio'); todas describian el
      // tramo parcela.
      const segment=MARKET_SEGMENTS.some(s=>s.name===row.segmento)?row.segmento:'parcela';
      const medianM2=Number(row.mediana_m2_actual ?? row.mediana_m2 ?? row.medianM2 ?? 0);
      if(!(medianM2>0))continue;
      const ref={
        segment,
        segmentLabel:meta.etiqueta_segmento||segment,
        medianM2,
        p25M2:Number(row.p25_m2_actual ?? row.p25_m2 ?? row.p25M2 ?? 0),
        p75M2:Number(row.p75_m2_actual ?? row.p75_m2 ?? row.p75M2 ?? 0),
        sampleSize:Number(row.cantidad_comparables ?? row.sampleSize ?? 0),
        sampleMedianAreaM2:Number(meta.superficie_mediana_m2||0)||null,
        // 'comuna' = la muestra es de la propia comuna. 'territorial' = se
        // tomo prestada de comunas vecinas del mismo tramo.
        origin:meta.origen||'comuna',
        ownAds:Number(meta.avisos_propios_del_segmento ?? 0),
        contributors:meta.comunas_que_aportan||null,
        radiusKm:meta.radio_km||null,
        observedAt:row.fecha_observacion||row.observedAt||'',
        confidence:row.confianza||row.confidence||'referencial',
        sources:Array.isArray(row.fuentes)?row.fuentes:(row.sources||[]),
        canonicalUfM2:Number(row.mediana_uf_m2||0)||null,
        ufClp:Number(row.uf_clp_actual||context.ufClp||0)||null,
        source:'supabase'
      };
      (mapped[key]||(mapped[key]={}))[segment]=ref;
    }
    RUNTIME_MARKET_REFERENCES = mapped;
    return RUNTIME_MARKET_REFERENCES;
  }

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // 'nature' llega a veces como arreglo y a veces como texto: el publicador
  // manda atributosNaturales.join(' '). Con un texto, el .map de antes lanzaba
  // "input.nature.map is not a function" y el tasador del publicador no
  // entregaba ningun valor.
  const listaAtributos = value => {
    if (Array.isArray(value)) return value.map(normalize).filter(Boolean);
    const texto = normalize(value);
    return texto ? [texto] : [];
  };
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const roundPrice = value => Math.round(Number(value || 0) / 10000) * 10000;

  function haversineKm(a,b){
    const R=6371,toRad=v=>Number(v)*Math.PI/180;
    const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),lat1=toRad(a.lat),lat2=toRad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }

  function calculateSurfaceBase(area){
    const safeArea=Math.max(0,Number(area)||0); let previous=0,total=0; const bands=[];
    for(const band of RULES.surfaceBands){
      const bandArea=Math.max(0,Math.min(safeArea,band.upTo)-previous);
      if(bandArea>0){
        const amount=bandArea*band.rate; total+=amount;
        bands.push({from:previous+1,to:Number.isFinite(band.upTo)?Math.min(safeArea,band.upTo):safeArea,area:bandArea,rate:band.rate,amount});
      }
      previous=band.upTo; if(safeArea<=band.upTo)break;
    }
    return {base:Math.round(total),area:safeArea,bands};
  }

  function distanceBand(distanceKm,bands){
    const km=Math.max(0,Number(distanceKm)||0); const band=bands.find(x=>km<=x.maxKm)||bands.at(-1);
    return {distanceKm:km,multiplier:band.multiplier,label:band.label};
  }

  function isMajorUrbanPole(city){
    const name=normalize(city?.name),category=normalize(city?.category);
    if(MAJOR_URBAN_POLES.some(x=>name===x||name.includes(x)))return true;
    return /capital regional|metropoli|metropolitana|gran ciudad|polo regional|area metropolitana/.test(category);
  }

  // Compatibilidad: si se llama con una sola distancia, mantiene la regla según tipo de ciudad.
  function distanceRule(distanceKm,nearestCity){
    const major=isMajorUrbanPole(nearestCity);
    const out=distanceBand(distanceKm,major?RULES.majorCityDistanceMultipliers:RULES.localTownDistanceMultipliers);
    return {...out,urbanClass:major?'ciudad_grande':'comuna_pueblo_menor'};
  }

  function calculateTerritorialBlend(input={}){
    const majorRaw=input.majorCityDistanceKm ?? input.distanceKm;
    const communeRaw=input.communeDistanceKm;
    const majorKm=Number(majorRaw);
    const hasCommune=communeRaw!==null&&communeRaw!==undefined&&communeRaw!==''&&Number.isFinite(Number(communeRaw));
    const communeKm=hasCommune?Number(communeRaw):null;
    const isMajor = input.nearestCity ? isMajorUrbanPole(input.nearestCity) : true;
    const major=distanceBand(majorKm,isMajor?RULES.majorCityDistanceMultipliers:RULES.localTownDistanceMultipliers);
    const local=hasCommune?distanceBand(communeKm,RULES.localTownDistanceMultipliers):{distanceKm:null,multiplier:null,label:'Sin distancia comunal'};
    const tourism=normalize(input.tourism ?? input.tourismLevel);
    let majorWeight=hasCommune?RULES.majorCityWeight:1;
    let communeWeight=hasCommune?RULES.communeWeight:0;
    let multiplier=(major.multiplier*majorWeight)+((local.multiplier||0)*communeWeight);

    // Un destino turístico nacional funciona como polo propio. La distancia a una
    // gran ciudad sigue aportando contexto, pero no puede rebajar la base territorial
    // por debajo de un piso turístico nacional verificable.
    let tourismNationalProtected=false;
    if(tourism==='nacional'){
      majorWeight=hasCommune?0.20:0.35;
      communeWeight=hasCommune?0.30:0;
      const destinationWeight=hasCommune?0.50:0.65;
      const destinationMultiplier=1.50;
      multiplier=(major.multiplier*majorWeight)+((local.multiplier||1)*communeWeight)+(destinationMultiplier*destinationWeight);
      multiplier=Math.max(destinationMultiplier,multiplier);
      tourismNationalProtected=true;
    }
    return {multiplier:Number(multiplier.toFixed(3)),major,local,majorWeight,communeWeight,tourismNationalProtected};
  }

  // El precio por m2 NO es lineal con la superficie: una parcela de 5.000 m2 y
  // un campo de 10 hectareas no valen lo mismo por metro. La mediana comunal se
  // calcula sobre parcelas del tramo tipico (~5.000 m2), asi que multiplicarla
  // por 100.000 m2 daba referencias absurdas: $669.900.000 para un campo en
  // Quillon cuyo dueno pide $120.000.000.
  //
  // Se corrige con los mismos tramos de superficie ya aprobados del motor: se
  // compara la tarifa media por m2 de la superficie real contra la del tramo de
  // referencia, y se aplica esa proporcion a la mediana comunal.
  const AREA_REFERENCIA_M2 = 5000;

  function factorSuperficie(area){
    const safeArea=Math.max(0,Number(area)||0);
    if(!safeArea||safeArea===AREA_REFERENCIA_M2)return 1;
    const tarifa=calculateSurfaceBase(safeArea).base/safeArea;
    const tarifaRef=calculateSurfaceBase(AREA_REFERENCIA_M2).base/AREA_REFERENCIA_M2;
    if(!tarifaRef)return 1;
    return tarifa/tarifaRef;
  }

  // Devuelve la referencia de mercado que le corresponde a ESTA propiedad: la
  // mediana de su comuna en su mismo tramo de superficie. Si la comuna no tiene
  // muestra de ese tramo devuelve null, y el motor tasa solo con valor tecnico.
  // Nunca se compara una parcela contra campos ni al reves.
  function marketReference(comuna,area){
    const table=RUNTIME_MARKET_REFERENCES||MARKET_REFERENCES;
    const raw=normalize(comuna);
    const key=COMMUNE_ALIASES[raw]||raw;
    const bySegment=table[key]||table[raw];
    if(!bySegment)return null;

    const safeArea=Math.max(0,Number(area)||0);
    const segment=segmentForArea(safeArea);
    if(!segment)return null;
    const ref=bySegment[segment.name];
    if(!ref)return null;

    // Correccion fina DENTRO del tramo. La muestra tiene su propia superficie
    // mediana (casi siempre 5.000 m2 en parcelas), y una de 11.000 m2 no vale
    // por m2 lo mismo aunque las dos sean "parcela". Se usa la misma curva de
    // tramos de superficie ya aprobada del motor, asi que esto no cambia
    // ninguna regla de valor: solo evita un escalon en el borde del tramo.
    const areaRef=ref.sampleMedianAreaM2||AREA_REFERENCIA_M2;
    const fArea=factorSuperficie(safeArea);
    const fRef=factorSuperficie(areaRef)||1;
    const f=fArea/fRef;

    return {
      ...ref,
      segmentName:segment.name,
      segmentLabel:ref.segmentLabel||segment.label,
      segmentRange:{from:segment.from,to:segment.to},
      areaFactor:Number(f.toFixed(4)),
      medianM2Ajustado:Math.round(ref.medianM2*f),
      medianValue:roundPrice(safeArea*ref.medianM2*f),
      p25Value:roundPrice(safeArea*ref.p25M2*f),
      p75Value:roundPrice(safeArea*ref.p75M2*f)
    };
  }

  function electricityAdjustment(input={}){
    const state=normalize(input.electricity); const rawMeters=input.electricityPoleDistanceM; const hasMeters=rawMeters!==''&&rawMeters!==null&&rawMeters!==undefined&&Number.isFinite(Number(rawMeters)); const meters=hasMeters?Math.max(0,Number(rawMeters)):null;
    if(/empalme|conectada|conexion/.test(state))return {pct:0.20,label:'Empalme / conexión eléctrica',detail:'+20%'};
    // "Sistema solar" es una de las opciones del publicador y no calzaba con
    // ninguna regla: una parcela con energia propia puntuaba igual que una sin
    // electricidad. Se le da el mismo peso que a la factibilidad sin metros.
    if(/solar/.test(state))return {pct:0.05,label:'Sistema solar autónomo',detail:'Energía en sitio sin conexión a la red · +5%'};
    if(/factibilidad|postacion/.test(state)){
      const pct=hasMeters?(meters>=1000?0:clamp(0.10-(Math.floor(meters/100)*0.01),0,0.10)):0.05;
      return {pct,label:'Factibilidad eléctrica',detail:hasMeters?`${meters} m a postación · +${Math.round(pct*100)}%`:'Distancia a postación no informada · +5% referencial'};
    }
    return {pct:0,label:'Electricidad',detail:'Sin bonificación eléctrica'};
  }

  function directAdjustments(input={}){
    const items=[]; const add=(key,label,pct,detail='')=>items.push({key,label,pct,detail});
    const rol=normalize(input.rol);
    if(/rol propio|^propio$/.test(rol))add('rol','Rol propio',0.15,'+15%');
    else if(/sin rol|rol compartido/.test(rol))add('rol','Sin rol propio',-0.15,'-15%');

    const elec=electricityAdjustment(input); if(elec.pct)add('electricity',elec.label,elec.pct,elec.detail);

    const water=normalize(input.water);
    if(/apr|pozo|puntera|agua disponible|con agua/.test(water))add('water','Agua disponible',0.10,'+10%');
    else if(/factibilidad/.test(water)&&!/sin factibilidad/.test(water))add('water','Factibilidad de agua',0.05,'+5%');

    // El publicador ofrece "Cerrado completo" / "Cerrado parcial" y el motor
    // solo reconocia "completamente" / "parcialmente": ninguna de las dos
    // opciones positivas sumaba, y si solo registraba el castigo de "Sin
    // cierre". El formulario nunca podia subir el valor por este campo.
    const fencing=normalize(input.fencing);
    if(/completamente|cerrado completo/.test(fencing))add('fence','Cierre perimetral completo',0.15,'+15%');
    else if(/parcialmente|deslindes|cerrado parcial/.test(fencing))add('fence','Cierre perimetral parcial',0.05,'+5%');
    else if(/sin cierre/.test(fencing))add('fence','Sin cierre perimetral',-0.15,'-15%');

    // Mismo caso: el publicador manda "Con portón".
    const gate=normalize(input.gate);
    if(/automatico|acceso controlado/.test(gate))add('gate','Portón y acceso controlado',0.08,'+8%');
    else if(/instalado|con porton/.test(gate))add('gate','Portón instalado',0.05,'+5%');

    if(normalize(input.condominium)==='si')add('condominium','Condominio / loteo organizado',0.10,'+10%');

    const topography=normalize(input.topography);
    if(/^plana$|completamente plana/.test(topography))add('topography','Topografía plana',0.08,'+8%');
    else if(/pendiente suave|lomaje suave|mayormente plana/.test(topography))add('topography','Pendiente suave',0.02,'+2%');
    else if(/pendiente pronunciada|con pendiente/.test(topography))add('topography','Pendiente pronunciada',-0.10,'-10%');
    else if(/irregular|mixta/.test(topography))add('topography','Topografía irregular',-0.08,'-8%');
    else if(/escarpada|quebrada/.test(topography))add('topography','Topografía escarpada',-0.15,'-15%');

    const fireRisk=normalize(input.fireRisk ?? input.fire_risk);
    if(fireRisk==='moderado')add('fireRisk','Riesgo de incendio moderado',-0.03,'-3%');
    else if(fireRisk==='alto')add('fireRisk','Riesgo de incendio alto',-0.08,'-8%');

    const floodRisk=normalize(input.floodRisk ?? input.flood_risk);
    if(floodRisk==='moderado')add('floodRisk','Riesgo de inundación moderado',-0.05,'-5%');
    else if(floodRisk==='alto')add('floodRisk','Riesgo de inundación alto',-0.12,'-12%');

    const routeKm=Math.max(0,Number(input.routeDistanceKm)||0);
    if(routeKm>0){const pct=-Math.min(RULES.routePenaltyMax,routeKm*RULES.routePenaltyPerKm);add('route','Distancia a ruta principal',pct,`${routeKm} km · ${Math.round(pct*100)}%`);}

    const tourism=normalize(input.tourism);
    if(tourism==='nacional')add('tourism','Zona turística nacional',3.00,'+300%');
    else if(tourism==='local'||tourism==='regional'||tourism==='local_regional')add('tourism','Zona turística local / regional',0.20,'+20%');

    const nature=listaAtributos(input.nature);
    if(nature.some(x=>/rio/.test(x)))add('river','Río dentro o acceso directo',0.30,'+30%');
    if(nature.some(x=>/estero/.test(x)))add('stream','Estero dentro o acceso directo',0.10,'+10%');
    if(nature.some(x=>/vertiente/.test(x)))add('spring','Vertiente natural',0.20,'+20%');
    if(nature.some(x=>/orilla.*lago|lago.*orilla|acceso.*lago/.test(x)))add('lake','Orilla / acceso directo a lago',0.50,'+50%');
    if(nature.some(x=>/terma/.test(x)))add('thermal','Aguas termales / termas',0.30,'+30%');

    return items;
  }

  function groupedAdjustmentFactor(adjustments=[]){
    const byKey=Object.fromEntries((adjustments||[]).map(x=>[x.key,Number(x.pct||0)]));
    const tourism=1+(byKey.tourism||0);
    const legal=1+(byKey.rol||0);
    const infrastructure=1+clamp((byKey.electricity||0)+(byKey.water||0)+(byKey.condominium||0),-0.25,0.35);
    const natural=1+clamp((byKey.river||0)+(byKey.stream||0)+(byKey.spring||0)+(byKey.lake||0)+(byKey.thermal||0),0,0.45);
    const readiness=1+clamp((byKey.fence||0)+(byKey.gate||0),-0.15,0.20);
    const terrain=1+clamp((byKey.topography||0)+(byKey.fireRisk||0)+(byKey.floodRisk||0),-0.30,0.10);
    const route=1+clamp((byKey.route||0),-0.50,0);
    return {
      factor: tourism*legal*infrastructure*natural*readiness*terrain*route,
      groups:{tourism,legal,infrastructure,natural,readiness,terrain,route},
      rationale:'Bonificaciones agrupadas con topes para evitar doble conteo de atributos relacionados.'
    };
  }

  function scoreDistance(distance,bands){const km=Number(distance);if(!Number.isFinite(km)||km<0)return null;const m=bands.find(b=>km<=b.max);return m?m.ratio:0;}
  function nearestSummary(items,maxCount=5){const list=(items||[]).filter(x=>Number.isFinite(Number(x.distanceKm))).sort((a,b)=>a.distanceKm-b.distanceKm);if(!list.length)return null;return {nearest:list[0],count:list.length,within5:list.filter(x=>x.distanceKm<=5).length,within10:list.filter(x=>x.distanceKm<=10).length,within20:list.filter(x=>x.distanceKm<=20).length,examples:list.slice(0,maxCount)};}

  function calculateTerritorialIndex(nearbyContext={},context={}){
    const centerDistance=Number(context.majorCityDistanceKm ?? context.distanceKm ?? nearbyContext.centerUrban?.distanceKm); const tourism=normalize(context.tourism); const components=[];
    function add(key,label,weight,ratio,detail=''){const safe=ratio===null?0.5:clamp(Number(ratio)||0,0,1);components.push({key,label,weight,ratio:safe,points:Number((weight*safe).toFixed(1)),detail});}
    add('centerUrban','Centro urbano',TERRITORIAL_WEIGHTS.centerUrban,scoreDistance(centerDistance,[{max:10,ratio:1},{max:20,ratio:.8},{max:35,ratio:.6},{max:50,ratio:.35},{max:Infinity,ratio:.12}]),Number.isFinite(centerDistance)?`${centerDistance.toFixed(1)} km`:'Sin distancia confirmada');
    const configs=[
      ['healthServices','Servicios de salud',15,'healthServices'],['commerce','Comercio',12,'commerce'],['security','Seguridad',8,'security'],['education','Educación',8,'education'],['generalServices','Servicios generales',7,'generalServices'],['gastronomy','Gastronomía',5,'gastronomy']
    ];
    for(const [key,label,weight,source] of configs){const s=nearbyContext[source],d=Number(s?.nearest?.distanceKm);add(key,label,weight,scoreDistance(d,[{max:5,ratio:1},{max:10,ratio:.85},{max:20,ratio:.6},{max:35,ratio:.3},{max:Infinity,ratio:.1}]),Number.isFinite(d)?`${d.toFixed(1)} km`:'Sin dato suficiente');}
    const a=nearbyContext.attractions,d=Number(a?.nearest?.distanceKm);let ratio=tourism==='nacional'?1:(tourism==='local'||tourism==='regional') ? .78 :scoreDistance(d,[{max:5,ratio:1},{max:15,ratio:.7},{max:30,ratio:.45},{max:Infinity,ratio:.12}]);
    add('attractions','Atractivos naturales / turísticos',25,ratio,tourism==='nacional'?'Destino turístico nacional':tourism==='local'||tourism==='regional'?'Zona turística local / regional':Number.isFinite(d)?`${d.toFixed(1)} km`:'Sin dato suficiente');
    const score=Math.round(components.reduce((s,c)=>s+c.points,0));return {score:clamp(score,0,100),label:score>=85?'Excepcional':score>=70?'Muy bueno':score>=55?'Bueno':score>=40?'Medio':'Bajo',components,weights:TERRITORIAL_WEIGHTS,source:nearbyContext.source||'datos_disponibles',calculatedAt:new Date().toISOString()};
  }

  function calculatePropertyIndex(input={}){
    const components=[]; const add=(key,label,weight,ratio,detail='')=>{const safe=ratio===null?0.5:clamp(Number(ratio)||0,0,1);components.push({key,label,weight,ratio:safe,points:Number((weight*safe).toFixed(1)),detail});};
    const rol=normalize(input.rol);add('documentation','Documentación / rol',15,rol.includes('rol propio')?1:rol.includes('tramite') ? .65 : (rol ? .3 : null),input.rol||'Por confirmar');
    const water=normalize(input.water);add('water','Agua',15,/apr|pozo|puntera|vertiente|agua disponible|con agua/.test(water)?1:(/factibilidad/.test(water)&&!/sin factibilidad/.test(water)) ? .7 : (/sin factibilidad|sin agua/.test(water) ? .15 : null),input.water||'Por confirmar');
    const e=electricityAdjustment(input);add('electricity','Electricidad',15,e.pct>=.20 ? 1 : (e.pct>0 ? .5+(e.pct/.2) : (/sin electricidad/.test(normalize(input.electricity)) ? .15 : null)),e.detail);
    const routeKm=Number(input.routeDistanceKm),access=normalize(input.access);let ar=/pavimentado/.test(access)?1:/ripio bueno|buen estado/.test(access) ? .82 : (/ripio regular|transitable|de ripio/.test(access) ? .65 : (/tierra|por mejorar/.test(access) ? .45 : (/servidumbre/.test(access) ? .35 : null)));if(Number.isFinite(routeKm)&&routeKm>0)ar=clamp((ar??.5)-Math.min(.4,routeKm*.01),0,1);add('access','Acceso y conexión vial',15,ar,Number.isFinite(routeKm)?`${routeKm} km a ruta`:input.access||'Por confirmar');
    const top=normalize(input.topography);add('topography','Topografía',10,/completamente plana/.test(top)?1:/mayormente plana/.test(top) ? .9 : (/pendiente suave|lomaje suave/.test(top) ? .72 : (/mixta/.test(top) ? .58 : (/quebrada|escarpada/.test(top) ? .3 : null))),input.topography||'Por confirmar');
    const nature=listaAtributos(input.nature),view=normalize(input.view),veg=normalize(input.vegetation);let nat=.45;if(nature.some(x=>x.includes('rio')))nat+=.2;if(nature.some(x=>x.includes('estero')))nat+=.08;if(nature.some(x=>x.includes('vertiente')))nat+=.12;if(nature.some(x=>x.includes('lago')))nat+=.16;if(nature.some(x=>x.includes('terma')))nat+=.12;if(veg.includes('bosque nativo'))nat+=.08;if(/panoramica|cordillera|lago|mar/.test(view))nat+=.1;add('naturalAttributes','Vista y atributos naturales',20,clamp(nat,0,1),[input.view,input.vegetation,...nature].filter(Boolean).join(' · '));
    const fence=normalize(input.fencing),cond=normalize(input.condominium);let ready=.5;if(fence.includes('completamente'))ready+=.25;else if(fence.includes('sin cierre'))ready-=.2;if(cond==='si')ready+=.15;add('readiness','Preparación',10,clamp(ready,0,1),[input.fencing,cond==='si'?'Condominio':''].filter(Boolean).join(' · ')||'Por confirmar');
    const score=Math.round(components.reduce((s,c)=>s+c.points,0));return {score:clamp(score,0,100),label:score>=85?'Excepcional':score>=70?'Muy bueno':score>=55?'Bueno':score>=40?'Medio':'Bajo',components,calculatedAt:new Date().toISOString()};
  }

  async function fetchNearbyContext(lat,lng,{radius=30000,timeout=16000}={}){
    const a=Number(lat),b=Number(lng); if(!Number.isFinite(a)||!Number.isFinite(b)||!a||!b)return null;
    const q=`[out:json][timeout:15];(nwr(around:${radius},${a},${b})["amenity"~"hospital|clinic|doctors|police|school|college|university|fuel|pharmacy|bank|atm|marketplace|restaurant|cafe"];nwr(around:${radius},${a},${b})["healthcare"];nwr(around:${radius},${a},${b})["shop"~"supermarket|convenience|mall"];nwr(around:${radius},${a},${b})["tourism"~"attraction|viewpoint"];nwr(around:${radius},${a},${b})["leisure"="park"];nwr(around:${radius},${a},${b})["natural"~"beach|water|peak"];);out center tags;`;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q),signal:controller.signal});if(!res.ok)throw new Error(`Overpass ${res.status}`);const payload=await res.json();const items=(payload.elements||[]).map(el=>{const elat=Number(el.lat??el.center?.lat),elng=Number(el.lon??el.center?.lon),distanceKm=Number.isFinite(elat)&&Number.isFinite(elng)?haversineKm({lat:a,lng:b},{lat:elat,lng:elng}):Infinity;return {name:el.tags?.name||'',distanceKm,tags:el.tags||{},lat:elat,lng:elng};}).filter(x=>Number.isFinite(x.distanceKm));const pick=test=>nearestSummary(items.filter(x=>test(x.tags||{})));return {healthServices:pick(t=>/hospital|clinic|doctors/.test(t.amenity||'')||Boolean(t.healthcare)),security:pick(t=>(t.amenity||'')==='police'),commerce:pick(t=>/supermarket|convenience|mall/.test(t.shop||'')||(t.amenity||'')==='marketplace'),education:pick(t=>/school|college|university/.test(t.amenity||'')),generalServices:pick(t=>/fuel|pharmacy|bank|atm/.test(t.amenity||'')),gastronomy:pick(t=>/restaurant|cafe/.test(t.amenity||'')),attractions:pick(t=>/attraction|viewpoint/.test(t.tourism||'')||(t.leisure||'')==='park'||/beach|water|peak/.test(t.natural||'')),source:'openstreetmap_overpass',radiusKm:radius/1000,calculatedAt:new Date().toISOString()};}finally{clearTimeout(timer);}
  }

  // Distancia de respaldo cuando no hay ninguna confirmada. Cae en el tramo
  // "mas de 50 km" (multiplicador 1), el mas conservador: sin ubicacion el
  // motor entrega un piso, nunca un valor inflado.
  const DISTANCIA_DESCONOCIDA_KM = 999;

  function calculate(input){
    // Se aceptan tambien los nombres del catalogo antiguo (tamano,
    // distanciaComuna) porque el catalogo y la ficha de parcela llaman al motor
    // con la fila cruda, sin pasar por el adaptador.
    const area=Math.max(0,Number(input.area||input.superficie||input.areaTerreno||input.tamano||input.superficie_m2)||0); if(!area)return {error:'La superficie debe ser mayor que cero.'};

    // Una distancia 0 o ausente NO es "esta a 0 km del polo urbano": es un dato
    // que falta. Tomarla al pie de la letra caia en el tramo 0-10 km, que
    // multiplica la base por 9. Antes ese caso reventaba o inflaba el valor.
    const majorRaw=input.majorCityDistanceKm ?? input.distanceKm;
    const majorParsed=Number(majorRaw);
    const majorConocida=majorRaw!==null&&majorRaw!==undefined&&majorRaw!==''&&Number.isFinite(majorParsed)&&majorParsed>0;
    const majorKm=majorConocida?majorParsed:DISTANCIA_DESCONOCIDA_KM;

    const communeRaw=input.communeDistanceKm ?? input.distanciaComuna;
    const communeParsed=Number(communeRaw);
    const communeKm=Number.isFinite(communeParsed)&&communeParsed>0?communeParsed:null;

    input={...input,majorCityDistanceKm:majorKm,communeDistanceKm:communeKm};
    const surfacePricing=calculateSurfaceBase(area);
    const territorialBlend=calculateTerritorialBlend({...input,majorCityDistanceKm:majorKm});
    const territorialBase=roundPrice(surfacePricing.base*territorialBlend.multiplier);
    const adjustments=directAdjustments(input);
    const groupedAdjustments=groupedAdjustmentFactor(adjustments);
    const adjustmentFactor=groupedAdjustments.factor;
    const totalPct=adjustmentFactor-1;
    const technicalPotential=roundPrice(territorialBase*adjustmentFactor);

    const market=marketReference(input.comuna,area);
    const routeKm=Math.max(0,Number(input.routeDistanceKm)||0);
    const valorTplTasadorBase=technicalPotential;
    // Valor tecnico puro, ya con el ajuste estacional. Es lo que el motor sabe
    // calcular desde los atributos de la propiedad, sin mirar el mercado.
    const valorTplTasadorAjustado=roundPrice(valorTplTasadorBase*RULES.seasonalAdjustmentFactor);
    const valorTplTasador=valorTplTasadorAjustado;
    const valorComunal=market?.medianValue||0;
    const tieneMercado=Boolean(market&&valorComunal>0);
    const valorVentaReal=roundPrice(area*1680);

    // CIFRA TITULAR. Mitad valor tecnico, mitad mercado observado del mismo
    // tramo de superficie en la comuna. Sin muestra comunal el titular es el
    // valor tecnico solo: antes se promediaba contra un valor comunal en cero,
    // lo que partia la tasacion por la mitad sin ninguna razon de mercado.
    const valorFinal=tieneMercado
      ? roundPrice((valorTplTasadorAjustado*RULES.technicalWeight)+(valorComunal*RULES.marketWeight))
      : valorTplTasadorAjustado;

    const recommended=valorFinal;
    const valorTplTasadorComuna=valorFinal;
    // Equivale a promediar tecnico, comunal y venta real cuando hay mercado;
    // cuando no lo hay, pondera dos veces el tecnico en vez de contar un cero.
    const valorVentaApuro=roundPrice(((valorFinal*2)+valorVentaReal)/3);
    const agile=valorVentaApuro;
    const patient=roundPrice(valorFinal*RULES.patientFactor);
    const immediateBase=roundPrice(area*RULES.ruralImmediateClosingM2);
    const immediateReference=normalize(input.tourism)==='nacional'?null:roundPrice(((recommended*.90)+immediateBase)/2);

    const propertyIndex=input.propertyIndex?.score!==undefined?input.propertyIndex:calculatePropertyIndex(input);
    const territorialIndex=input.territorialIndex?.score!==undefined?input.territorialIndex:calculateTerritorialIndex(input.nearbyContext||{}, {majorCityDistanceKm:majorKm,distanceKm:majorKm,tourism:input.tourism});
    const asking=Number(input.asking)||0,publishedM2=asking&&area?Math.round(asking/area):null,tplM2=area?Math.round(recommended/area):null,marketM2=market?.medianM2||null;
    const priceVsTplPct=publishedM2&&tplM2?((publishedM2-tplM2)/tplM2*100):null;
    const classification=priceVsTplPct===null?'Sin precio publicado':priceVsTplPct<=-20?'Oportunidad destacada':priceVsTplPct<=-10?'Precio atractivo':priceVsTplPct<=10?'Precio competitivo':priceVsTplPct<=20?'Sobre estimación':'Precio elevado';

    return {
      quick:agile, ideal:recommended, patient,
      agile, recommended, technicalPotential:valorTplTasadorBase, patientPotential:patient, immediateReference,
      valorTplTasadorBase, valorTplTasadorAjustado, valorComunal, valorVentaReal, valorVentaApuro,
      valor_tpl_tasador_base:valorTplTasadorBase,
      valor_tpl_tasador_ajustado:valorTplTasadorAjustado,
      valor_tpl_tasador:valorTplTasadorAjustado,
      valor_comunal:valorComunal,
      valor_venta_real_tpl:valorVentaReal,
      valor_recomendado:recommended,
      valor_venta_apuro:valorVentaApuro,
      valorFinal, valorPromedioReferencia:recommended, valorPorApuro:valorVentaApuro,
      // Nombres que usaba el motor que se elimino. El catalogo, la ficha de
      // parcela y el editor del CRM leen estos campos; apuntarlos a la cifra
      // canonica es lo que hace que todas las pantallas muestren el MISMO valor
      // que el informe premium, en vez de cada una el suyo.
      valorRecomendado:valorFinal,
      valorComunalBase:valorComunal,
      // Como se compuso el titular, para que el informe pueda explicarlo en vez
      // de mostrar un numero sin origen.
      composicionValor:{
        tecnico:valorTplTasadorAjustado,
        comunal:valorComunal,
        pesoTecnico:tieneMercado?RULES.technicalWeight:1,
        pesoComunal:tieneMercado?RULES.marketWeight:0,
        conMercado:tieneMercado,
        segmento:market?.segmentName||null,
        segmentoEtiqueta:market?.segmentLabel||null,
        origenMuestra:market?.origin||null,
        muestra:market?.sampleSize||0
      },
      baseDepreciada:territorialBase,
      // Avisa a quien consuma el resultado que no habia distancia confirmada y
      // el valor tecnico es un piso, no una estimacion de mercado.
      distanciaEstimada:!majorConocida,
      reference:recommended, low:agile, high:valorTplTasadorBase,
      asking, area, location:input.location||'',region:input.region||'',comuna:input.comuna||'',
      base:surfacePricing.base,surfacePricing,territorialBase,commercialBase:territorialBase,
      territorialBlend,cityDistance:territorialBlend.major,distanceMultiplier:territorialBlend.multiplier,
      nearestCity:input.nearestCity?{name:input.nearestCity.name,category:input.nearestCity.category||'',distanceKm:Number(majorKm.toFixed(1))}:null,
      communeDistanceKm:Number.isFinite(Number(input.communeDistanceKm))?Number(input.communeDistanceKm):null,
      marketReference:market,marketBlend:{technicalWeight:1,marketWeight:0,independent:true,isolationApplied:false},
      propertyIndex,territorialIndex,nearbyContext:input.nearbyContext||null,
      priceAnalysis:{publishedM2,tplM2,marketM2,priceVsTplPct,classification,opportunity:priceVsTplPct!==null&&priceVsTplPct<=-15},
      adjustments:adjustments.map(x=>({...x,amount:Math.round(territorialBase*x.pct)})),adjustmentGroups:groupedAdjustments.groups,adjustmentRationale:groupedAdjustments.rationale,totalPct,adjustmentFactor,
      score:Math.round(propertyIndex.score*.55+territorialIndex.score*.45),coverage:'motor_tpl_v2',source:'tpl_land_engine_local',persisted:false,method:ENGINE_VERSION,engineVersion:ENGINE_VERSION,
      cautions:[
        ...(!market?[`No hay avisos suficientes del catastro para ${input.comuna||'esta comuna'} en el tramo de ${Math.round(area).toLocaleString('es-CL')} m²; el valor mostrado es solo el técnico TPL, sin contraste de mercado.`]:[]),
        ...(market&&market.origin==='territorial'?[`La referencia de mercado no es de ${input.comuna||'la comuna'} sino de avisos del mismo tramo a menos de ${market.radiusKm||35} km (${market.sampleSize} comparables). Tómala como orientación territorial.`]:[]),
        ...(market&&market.origin==='comuna'&&market.sampleSize<6?[`La referencia comunal se apoya en solo ${market.sampleSize} avisos del tramo; es una muestra corta.`]:[]),
        ...(immediateReference===null?['La referencia de venta inmediata rural no se muestra para turismo nacional.']:[])
      ]
    };
  }

  const exportObj=Object.freeze({ENGINE_VERSION,RULES,TERRITORIAL_WEIGHTS,MARKET_REFERENCES,MARKET_SEGMENTS,COMMUNE_ALIASES,MAJOR_URBAN_POLES,setMarketReferences,segmentForArea,calculateSurfaceBase,distanceRule,calculateTerritorialBlend,marketReference,electricityAdjustment,directAdjustments,groupedAdjustmentFactor,calculateTerritorialIndex,calculatePropertyIndex,fetchNearbyContext,haversineKm,calculate});
  if(typeof module!=='undefined'&&module.exports)module.exports=exportObj;
  global.TPLLandEngine=exportObj;
})(typeof window!=='undefined'?window:globalThis);

// El IIFE de arriba registra el motor en globalThis; aqui solo se reexpone como
// modulo ESM para que las edge functions puedan importarlo.
export const TPLLandEngine = globalThis.TPLLandEngine;
export default TPLLandEngine;
