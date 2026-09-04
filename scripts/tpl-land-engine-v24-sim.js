// ═══════════════════════════════════════════════════════════════════════════════
// TPL Land Engine — Motor Canónico Unificado (Deno / ESM)
// ═══════════════════════════════════════════════════════════════════════════════
// FUENTE ÚNICA: esta implementación es idéntica a la del frontend
// (frontend-v2/plataforma/publicar/tpl-land-engine.js).
// Cualquier cambio en la lógica de cálculo debe hacerse en AMBOS archivos.
// ═══════════════════════════════════════════════════════════════════════════════

const ENGINE_VERSION = 'tpl-land-engine-v2.4-sim';

const RULES = Object.freeze({
  // Tramos acumulativos aprobados TPL.
  surfaceBands: Object.freeze([
    Object.freeze({ upTo: 7000, rate: 2000 }),
    Object.freeze({ upTo: 10000, rate: 1500 }),
    Object.freeze({ upTo: 30000, rate: 1500 }),
    Object.freeze({ upTo: 50000, rate: 1200 }),
    Object.freeze({ upTo: 100000, rate: 950 }),
    Object.freeze({ upTo: Infinity, rate: 800 })
  ]),
  // Ciudad grande: principal motor territorial (70%).
  majorCityDistanceMultipliers: Object.freeze([
    Object.freeze({ maxKm: 10, multiplier: 3.0, label: '0 a 10 km' }),
    Object.freeze({ maxKm: 20, multiplier: 2.7, label: '10 a 20 km' }),
    Object.freeze({ maxKm: 30, multiplier: 2.4, label: '20 a 30 km' }),
    Object.freeze({ maxKm: 40, multiplier: 2.1, label: '30 a 40 km' }),
    Object.freeze({ maxKm: 50, multiplier: 1.8, label: '40 a 50 km' }),
    Object.freeze({ maxKm: 70, multiplier: 1.6, label: '50 a 70 km' }),
    Object.freeze({ maxKm: 100, multiplier: 1.4, label: '70 a 100 km' }),
    Object.freeze({ maxKm: 150, multiplier: 1.2, label: '100 a 150 km' }),
    Object.freeze({ maxKm: Infinity, multiplier: 1.0, label: 'Más de 150 km' })
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
  agileFactor: 0.93,
  patientFactor: 1.07,
  ruralImmediateClosingM2: 1650,
  routePenaltyPerKm: 0.01,
  routePenaltyMax: 0.50,
  communalIsolationThresholdKm: 20,
  isolatedTechnicalWeight: 0.70,
  isolatedMarketWeight: 0.30,
  // seasonalAdjustmentFactor: 0.83 // Removed for V2.4
});

// REFERENCIA METODOLÓGICA ÑIPAS — Ya no genera multiplicador global.
// Se mantiene como metadata de auditoría.
const CALIBRATION_PROFILE = Object.freeze({
  anchor:'Ñipas', anchorComunaKey:'nipas', anchorAreaM2:5000,
  anchorValueCLP:25000000, referenceM2CLP:5000, version:'nipas-reference-v2',
  appliesGlobally: false
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

// Referencias comunales depuradas. En esta versión se aplican a parcelas < 10.000 m²;
// los campos requieren muestra del mismo rango de superficie para evitar inflar el valor.
const MARKET_REFERENCES = Object.freeze({
  quillon: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4800, p25M2:3626, p75M2:5928, sampleSize:22, observedAt:'2026-07-29', confidence:'media-alta', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
  florida: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:6000, p25M2:3800, p75M2:7143, sampleSize:9, observedAt:'2026-07-31', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
  nacimiento: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4294, p25M2:3508, p75M2:5015, sampleSize:4, observedAt:'2026-07-31', confidence:'baja-media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
  yumbel: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:4800, p25M2:3500, p75M2:6500, sampleSize:8, observedAt:'2026-07-31', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
  negrete: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:6750, p25M2:5270, p75M2:9160, sampleSize:3, observedAt:'2026-07-31', confidence:'media-baja', sources:['Portal Inmobiliario','Yapo'] }),
  ranquil: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:4000, p75M2:6500, sampleSize:4, observedAt:'2026-07-31', confidence:'media-baja', sources:['Portal Inmobiliario','Yapo'] }),
  nipas: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:5000, p25M2:4000, p75M2:6500, sampleSize:4, observedAt:'2026-07-31', confidence:'media-baja', sources:['Portal Inmobiliario','Yapo'], aliasOf:'ranquil' }),
  pucon: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:10300, p25M2:9625, p75M2:12385, sampleSize:8, observedAt:'2026-07-29', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'] }),
  caburgua: Object.freeze({ segment:'parcela_sola_5k_10k', medianM2:10300, p25M2:9625, p75M2:12385, sampleSize:8, observedAt:'2026-07-29', confidence:'media', sources:['Portal Inmobiliario','Yapo','Portal Terreno'], aliasOf:'pucon' })
});

let RUNTIME_MARKET_REFERENCES = null;

function setMarketReferences(rows=[], context={}){
  const mapped={};
  for(const row of rows||[]){
    const key=normalize(row.comuna_key||row.comuna);
    if(!key)continue;
    mapped[key]={
      segment:row.segmento||'parcela_sola_5k_10k',
      medianM2:Number(row.mediana_m2_actual ?? row.mediana_m2 ?? row.medianM2 ?? 0),
      p25M2:Number(row.p25_m2_actual ?? row.p25_m2 ?? row.p25M2 ?? 0),
      p75M2:Number(row.p75_m2_actual ?? row.p75_m2 ?? row.p75M2 ?? 0),
      sampleSize:Number(row.cantidad_comparables ?? row.sampleSize ?? 0),
      observedAt:row.fecha_observacion||row.observedAt||'',
      confidence:row.confianza||row.confidence||'referencial',
      sources:Array.isArray(row.fuentes)?row.fuentes:(row.sources||[]),
      canonicalUfM2:Number(row.mediana_uf_m2||0)||null,
      ufClp:Number(row.uf_clp_actual||context.ufClp||0)||null,
      source:'supabase'
    };
  }
  RUNTIME_MARKET_REFERENCES=Object.keys(mapped).length?mapped:null;
  return RUNTIME_MARKET_REFERENCES;
}

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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

function marketReference(comuna,area){
  const ref=(RUNTIME_MARKET_REFERENCES||MARKET_REFERENCES)[normalize(comuna)]; if(!ref)return null;
  const safeArea=Math.max(0,Number(area)||0);
  return {...ref,medianValue:roundPrice(safeArea*ref.medianM2),p25Value:roundPrice(safeArea*ref.p25M2),p75Value:roundPrice(safeArea*ref.p75M2)};
}

function electricityAdjustment(input={}){
  const state=normalize(input.electricity); const rawMeters=input.electricityPoleDistanceM; const hasMeters=rawMeters!==''&&rawMeters!==null&&rawMeters!==undefined&&Number.isFinite(Number(rawMeters)); const meters=hasMeters?Math.max(0,Number(rawMeters)):null;
  if(/empalme|conectada|conexion/.test(state))return {pct:0.20,label:'Empalme / conexión eléctrica',detail:'+20%'};
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

  const fencing=normalize(input.fencing);
  if(/completamente/.test(fencing))add('fence','Cierre perimetral completo',0.15,'+15%');
  else if(/parcialmente|deslindes/.test(fencing))add('fence','Cierre perimetral parcial',0.05,'+5%');
  else if(/sin cierre/.test(fencing))add('fence','Sin cierre perimetral',-0.15,'-15%');

  const gate=normalize(input.gate);
  if(/automatico|acceso controlado/.test(gate))add('gate','Portón y acceso controlado',0.08,'+8%');
  else if(/instalado/.test(gate))add('gate','Portón instalado',0.05,'+5%');

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

  const nature=(input.nature||[]).map(normalize);
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
  const routeKm=Number(input.routeDistanceKm),access=normalize(input.access);let ar=/pavimentado/.test(access)?1:/ripio bueno|buen estado/.test(access) ? .82 : (/ripio regular|transitable/.test(access) ? .65 : (/tierra/.test(access) ? .45 : (/servidumbre/.test(access) ? .35 : null)));if(Number.isFinite(routeKm)&&routeKm>0)ar=clamp((ar??.5)-Math.min(.4,routeKm*.01),0,1);add('access','Acceso y conexión vial',15,ar,Number.isFinite(routeKm)?`${routeKm} km a ruta`:input.access||'Por confirmar');
  const top=normalize(input.topography);add('topography','Topografía',10,/completamente plana/.test(top)?1:/mayormente plana/.test(top) ? .9 : (/pendiente suave|lomaje suave/.test(top) ? .72 : (/mixta/.test(top) ? .58 : (/quebrada|escarpada/.test(top) ? .3 : null))),input.topography||'Por confirmar');
  const nature=(input.nature||[]).map(normalize),view=normalize(input.view),veg=normalize(input.vegetation);let nat=.45;if(nature.some(x=>x.includes('rio')))nat+=.2;if(nature.some(x=>x.includes('estero')))nat+=.08;if(nature.some(x=>x.includes('vertiente')))nat+=.12;if(nature.some(x=>x.includes('lago')))nat+=.16;if(nature.some(x=>x.includes('terma')))nat+=.12;if(veg.includes('bosque nativo'))nat+=.08;if(/panoramica|cordillera|lago|mar/.test(view))nat+=.1;add('naturalAttributes','Vista y atributos naturales',20,clamp(nat,0,1),[input.view,input.vegetation,...(input.nature||[])].filter(Boolean).join(' · '));
  const fence=normalize(input.fencing),cond=normalize(input.condominium);let ready=.5;if(fence.includes('completamente'))ready+=.25;else if(fence.includes('sin cierre'))ready-=.2;if(cond==='si')ready+=.15;add('readiness','Preparación',10,clamp(ready,0,1),[input.fencing,cond==='si'?'Condominio':''].filter(Boolean).join(' · ')||'Por confirmar');
  const score=Math.round(components.reduce((s,c)=>s+c.points,0));return {score:clamp(score,0,100),label:score>=85?'Excepcional':score>=70?'Muy bueno':score>=55?'Bueno':score>=40?'Medio':'Bajo',components,calculatedAt:new Date().toISOString()};
}

// fetchNearbyContext no está disponible en el entorno Deno del worker.
// El worker usa las RPCs de geoint (tpl_geoint_resolver_propiedad_v1) en su lugar.
const fetchNearbyContext = null;


function calculate(input){
  const area=Math.max(0,Number(input.area||input.superficie||input.areaTerreno)||0); if(!area)return {error:'La superficie debe ser mayor que cero.'};
  const majorRaw=input.majorCityDistanceKm ?? input.distanceKm; const majorKm=Number(majorRaw); if(majorRaw===null||majorRaw===undefined||majorRaw===''||!Number.isFinite(majorKm)||majorKm<0)return {error:'No fue posible determinar la distancia a la ciudad grande de referencia.'};
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
  
  const valorTplTasadorBase = technicalPotential;
  const valorFinal = technicalPotential; // no seasonal adjustment

  const promedio_m2_comunal = Number(input.promedio_m2_comunal) || (market?.medianM2 || 0);
  const valorComunal = roundPrice(promedio_m2_comunal * area);
  
  const valorPromedioReferencia = roundPrice((valorFinal + valorComunal) / 2);
  const valorPorApuro = roundPrice(valorFinal * 0.93);

  const valorVentaReal = roundPrice(area * 1590.48);
  const recommended = valorFinal;
  const agile = valorPorApuro;
  const patient = roundPrice(valorFinal * RULES.patientFactor);
  const immediateBase = roundPrice(area * RULES.ruralImmediateClosingM2);
  const immediateReference = normalize(input.tourism) === 'nacional' ? null : roundPrice((valorFinal * .90 + immediateBase) / 2);

  const propertyIndex = input.propertyIndex?.score !== undefined ? input.propertyIndex : calculatePropertyIndex(input);
  const territorialIndex = input.territorialIndex?.score !== undefined ? input.territorialIndex : calculateTerritorialIndex(input.nearbyContext || {}, { majorCityDistanceKm: majorKm, distanceKm: majorKm, tourism: input.tourism });
  const asking = Number(input.asking) || 0, publishedM2 = asking && area ? Math.round(asking / area) : null, tplM2 = area ? Math.round(valorFinal / area) : null, marketM2 = market?.medianM2 || null;
  const priceVsTplPct = publishedM2 && tplM2 ? ((publishedM2 - tplM2) / tplM2 * 100) : null;
  const classification = priceVsTplPct === null ? 'Sin precio publicado' : priceVsTplPct <= -20 ? 'Oportunidad destacada' : priceVsTplPct <= -10 ? 'Precio atractivo' : priceVsTplPct <= 10 ? 'Precio competitivo' : priceVsTplPct <= 20 ? 'Sobre estimación' : 'Precio elevado';

  return {
    valorFinal,
    valorComunal,
    valorPromedioReferencia,
    valorPorApuro,
    // compat
    quick: agile, ideal: recommended, patient,
    agile, recommended, technicalPotential: valorTplTasadorBase, patientPotential: patient, immediateReference,
    valorTplTasadorBase, valorVentaReal,
    valor_tpl_tasador_base: valorTplTasadorBase,
    valor_tpl_tasador: valorFinal,
    valor_comunal: valorComunal,
    valor_venta_real_tpl: valorVentaReal,
    valor_recomendado: recommended,
    valor_venta_apuro: valorPorApuro,
    reference: valorFinal, low: agile, high: valorTplTasadorBase,
    asking, area, location: input.location || '', region: input.region || '', comuna: input.comuna || '',
    base: surfacePricing.base, surfacePricing, territorialBase, commercialBase: territorialBase,
    territorialBlend, cityDistance: territorialBlend.major, distanceMultiplier: territorialBlend.multiplier,
    nearestCity: input.nearestCity ? { name: input.nearestCity.name, category: input.nearestCity.category || '', distanceKm: Number(majorKm.toFixed(1)) } : null,
    communeDistanceKm: Number.isFinite(Number(input.communeDistanceKm)) ? Number(input.communeDistanceKm) : null,
    marketReference: market, marketBlend: { technicalWeight: 1, marketWeight: 0, independent: true, isolationApplied: false },
    propertyIndex, territorialIndex, nearbyContext: input.nearbyContext || null,
    priceAnalysis: { publishedM2, tplM2, marketM2, priceVsTplPct, classification, opportunity: priceVsTplPct !== null && priceVsTplPct <= -15 },
    adjustments: adjustments.map(x => ({ ...x, amount: Math.round(territorialBase * x.pct) })), adjustmentGroups: groupedAdjustments.groups, adjustmentRationale: groupedAdjustments.rationale, totalPct, adjustmentFactor,
    score: Math.round(propertyIndex.score * .55 + territorialIndex.score * .45), coverage: 'motor_tpl_v2', source: 'tpl_land_engine_local', persisted: false, method: ENGINE_VERSION, engineVersion: ENGINE_VERSION,
    cautions: [...(area >= 10000 && !market ? ['No existe una referencia comunal validada del mismo rango de superficie; el Valor TPL sigue siendo técnico e independiente.'] : []), ...(immediateReference === null ? ['La referencia de venta inmediata rural no se muestra para turismo nacional.'] : [])]
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exportación ESM para Deno (Supabase Edge Functions)
// ═══════════════════════════════════════════════════════════════════════════════
export const TPLLandEngine = Object.freeze({
  ENGINE_VERSION,
  RULES,
  TERRITORIAL_WEIGHTS,
  MARKET_REFERENCES,
  MAJOR_URBAN_POLES,
  CALIBRATION_PROFILE,
  setMarketReferences,
  calculateSurfaceBase,
  distanceRule,
  calculateTerritorialBlend,
  marketReference,
  electricityAdjustment,
  directAdjustments,
  groupedAdjustmentFactor,
  calculateTerritorialIndex,
  calculatePropertyIndex,
  fetchNearbyContext,
  haversineKm,
  calculate
});
