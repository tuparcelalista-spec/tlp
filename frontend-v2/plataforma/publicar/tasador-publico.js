const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n||0));
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const works={quincho_abierto:'Quincho abierto (m²)',quincho_cerrado:'Quincho cerrado (m²)',terraza_sin_techo:'Terraza sin techo (m²)',terraza_techada:'Terraza techada (m²)',bodega_madera:'Bodega madera (m²)',bodega_solida:'Bodega sólida (m²)',galpon:'Galpón (m²)',cobertizo:'Cobertizo (m²)',estacionamiento_techado:'Estacionamiento techado (m²)',piscina_fibra:'Piscina fibra (m²)',piscina_hormigon:'Piscina hormigón (m²)',tinaja_simple:'Tinaja simple (un.)',tinaja_equipada:'Tinaja equipada (un.)',porton_automatico:'Portón automático (un.)'};
let mode='rapida',lastResult=null,lastInput=null,catalog=null,tasadorContext=null,locationMap=null,locationMarker=null;
const withTimeout=(promise,ms,fallback)=>Promise.race([Promise.resolve(promise),new Promise(resolve=>setTimeout(()=>resolve(fallback),ms))]);

function buildWorks(){
 const g=$('#worksGrid');if(!g)return;g.innerHTML='';
 Object.entries(works).forEach(([k,l])=>{const lab=document.createElement('label');lab.innerHTML=`<span>${l}</span><input type="number" min="0" step="1" data-work="${k}" value="0">`;g.appendChild(lab)});
}
async function ensureCatalog(){
 if(globalThis.TPL_NATIONAL_CATALOG)return globalThis.TPL_NATIONAL_CATALOG;
 try{const mod=await import('./tpl-national-catalog.mjs');return mod.TPL_NATIONAL_CATALOG||globalThis.TPL_NATIONAL_CATALOG||null}catch(e){console.warn('Catálogo territorial no disponible.',e);return null}
}
async function fillRegions(){
 catalog=await ensureCatalog();const r=$('#region'),c=$('#comuna');
 if(!catalog?.regions?.length||!catalog?.communes?.length){r.innerHTML='<option value="">No fue posible cargar regiones</option>';c.innerHTML='<option value="">Catálogo no disponible</option>';return}
 r.innerHTML='<option value="">Selecciona región</option>'+catalog.regions.map(x=>`<option value="${x.name}">${x.name}</option>`).join('');
 r.onchange=()=>fillCommunes(r.value);
}
function fillCommunes(regionName){
 const c=$('#comuna');const reg=catalog?.regions?.find(x=>x.name===regionName);
 const list=(catalog?.communes||[]).filter(x=>x.reg===reg?.code).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 c.innerHTML='<option value="">Selecciona comuna</option>'+list.map(x=>`<option value="${x.name}">${x.name}</option>`).join('');
 c.disabled=!regionName;
}
function setMode(next){
 mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('is-active',b.dataset.mode===next));
 $('#preciseFields').hidden=next!=='precisa';document.body.dataset.valuationMode=next;
 if(next==='precisa')setTimeout(()=>{initLocationMap();locationMap?.invalidateSize()},80);
}
function parseMoney(v){return Number(String(v||'').replace(/[^0-9]/g,''))||0}
function validCoordinate(lat,lng){return Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lng)>=-180&&Number(lng)<=180}
function setLocation(lat,lng,source='manual'){
 if(!validCoordinate(lat,lng))return false;
 const a=Number(lat),o=Number(lng);$('#lat').value=a.toFixed(6);$('#lng').value=o.toFixed(6);
 initLocationMap();if(locationMap){locationMap.setView([a,o],Math.max(locationMap.getZoom(),15));if(!locationMarker)locationMarker=L.marker([a,o],{draggable:true}).addTo(locationMap);else locationMarker.setLatLng([a,o]);}
 updateLocationStatus(a,o,source);return true;
}
function updateLocationStatus(lat,lng,source='manual'){
 const box=$('#locationStatus'),link=$('#openGoogleMaps');if(!box)return;
 const labels={mapa:'Marcada en el mapa',google:'Importada desde Google Maps',gps:'Detectada desde tu dispositivo',manual:'Coordenadas ingresadas'};
 box.classList.add('is-ready');box.innerHTML=`<span class="location-dot"></span><div><strong>${labels[source]||labels.manual}</strong><small>${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)} · este punto se usará en el análisis territorial.</small></div>`;
 if(link){link.hidden=false;link.href=`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;}
}
function initLocationMap(){
 const el=$('#tasadorMap');if(!el||locationMap||!window.L)return;
 locationMap=L.map(el,{scrollWheelZoom:false}).setView([-36.82,-73.05],7);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(locationMap);
 locationMap.on('click',e=>setLocation(e.latlng.lat,e.latlng.lng,'mapa'));
 const lat=Number($('#lat')?.value),lng=Number($('#lng')?.value);if(validCoordinate(lat,lng)&&lat&&lng)setLocation(lat,lng,'manual');
}
function parseGoogleMapsCoordinates(value){
 const raw=String(value||'').trim();if(!raw)return null;
 const patterns=[/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,/q=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i,/query=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i,/place\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i];
 for(const p of patterns){const m=raw.match(p);if(m&&validCoordinate(m[1],m[2]))return {lat:Number(m[1]),lng:Number(m[2])};}
 const plain=raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/);return plain&&validCoordinate(plain[1],plain[2])?{lat:Number(plain[1]),lng:Number(plain[2])}:null;
}
function applyGoogleMapsLink(){
 const input=$('#googleMapsLink'),coords=parseGoogleMapsCoordinates(input?.value);
 if(coords){setLocation(coords.lat,coords.lng,'google');return;}
 const box=$('#locationStatus');if(box){box.classList.remove('is-ready');box.innerHTML='<span class="location-dot"></span><div><strong>No pudimos leer ese enlace</strong><small>Abre el lugar en Google Maps y copia la URL completa que muestra las coordenadas.</small></div>';}
}
function setLocationMethod(method){
 document.querySelectorAll('[data-location-method]').forEach(b=>b.classList.toggle('is-active',b.dataset.locationMethod===method));
 const mapPanel=$('#mapLocationPanel'),googlePanel=$('#googleLocationPanel');if(mapPanel)mapPanel.hidden=method!=='mapa';if(googlePanel)googlePanel.hidden=method!=='google';
 if(method==='mapa')setTimeout(()=>{initLocationMap();locationMap?.invalidateSize()},50);
}

function inputs(){
 const obras={};document.querySelectorAll('[data-work]').forEach(el=>{const n=Number(el.value||0);if(n>0)obras[el.dataset.work]=n});
 const withHouse=$('#incluyeVivienda').checked;const nature=[...document.querySelectorAll('[data-nature]:checked')].map(x=>x.value);
 const base={area:Number($('#superficie').value||0),communeDistanceKm:$('#communeDistanceKm').value===''?null:Number($('#communeDistanceKm').value),region:$('#region').value,comuna:$('#comuna').value,rol:$('#rol').value,electricity:$('#electricity').value,electricityPoleDistanceM:$('#electricityPoleDistanceM').value===''?null:Number($('#electricityPoleDistanceM').value),topography:$('#topography').value,water:$('#water').value,tourismLevel:$('#tourismLevel').value,mode};
 if(mode==='precisa')Object.assign(base,{access:$('#access').value,routeDistanceKm:Number($('#routeDistanceKm').value||0),soil:$('#soil').value,exposure:$('#exposure').value,view:$('#view').value,vegetation:$('#vegetation').value,fencing:$('#fencing').value,gate:$('#gate').value,condominium:$('#condominium').value,asking:parseMoney($('#asking').value),nature,lat:Number($('#lat').value),lng:Number($('#lng').value)});
 return {...base,incluyeVivienda:withHouse,areaCasa:withHouse?Number($('#areaCasa').value||0):0,materialCasa:$('#materialCasa').value,anioConstruccion:Number($('#anioConstruccion').value||0),estadoCasa:$('#estadoCasa').value,tipoFundacion:'sin_fundacion',anioRemodelacion:Number($('#anioRemodelacion').value||0),remodelacionIntegral:Number($('#anioRemodelacion').value||0)>0,dormitorios:Number($('#dormitorios').value||0),banos:Number($('#banos').value||0),pisos:Number($('#pisos').value||1),obrasAdicionales:obras,caracteristicaDiferenciadora:$('#caracteristicaDiferenciadora').value};
}
function territorialContextFor(x){
 let city=null,cascade=null,commune=null,majorCityDistanceKm=null,communeDistanceKm=Number(x.communeDistanceKm);
 try{
  city=catalog?.getMajorCityForCommune?.(x.comuna,x.region)||catalog?.getCityForCommune?.(x.comuna,x.region)||null;
  commune=catalog?.getCommune?.(x.comuna)||null;
  const communeCenter=(Number.isFinite(Number(commune?.lat))&&Number.isFinite(Number(commune?.lng)))?{lat:Number(commune.lat),lng:Number(commune.lng)}:(commune?.centroid||null);
  if(Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&x.lat&&x.lng){
   if(catalog?.resolveTerritorialCascade) cascade=catalog.resolveTerritorialCascade(x.comuna,x.region,x.lat,x.lng,0);
   const point={lat:Number(x.lat),lng:Number(x.lng)};
   if(city?.centroid&&window.TPLLandEngine?.haversineKm) majorCityDistanceKm=window.TPLLandEngine.haversineKm(point,city.centroid);
   if(communeCenter&&window.TPLLandEngine?.haversineKm) communeDistanceKm=window.TPLLandEngine.haversineKm(point,communeCenter);
  }else if(communeCenter&&city?.centroid&&window.TPLLandEngine?.haversineKm){
   majorCityDistanceKm=window.TPLLandEngine.haversineKm(communeCenter,city.centroid);
  }
 }catch(error){console.warn('Contexto territorial no disponible.',error)}
 const category=String(city?.category||'').toLowerCase();
 const autoTourism=commune?.tour?(/destino tur[ií]stico|internacional|lacustre|tur/i.test(category)?'nacional':'local'):'';
 const tourism=x.tourismLevel==='auto'?autoTourism:(x.tourismLevel||'');
 return {city,commune,cascade,distanceKm:majorCityDistanceKm,majorCityDistanceKm,communeDistanceKm,tourism};
}
function validate(x,territory){
 if(!x.region)return 'Selecciona una región.';
 if(!x.comuna)return 'Selecciona una comuna.';
 if(!x.area)return 'Ingresa la superficie del terreno.';
 if(mode==='precisa'&&(!Number.isFinite(x.lat)||!Number.isFinite(x.lng)||!x.lat||!x.lng))return 'Para la tasación precisa ingresa coordenadas o usa tu ubicación.';
 if(mode!=='precisa'&&(!Number.isFinite(territory.communeDistanceKm)||territory.communeDistanceKm<0))return 'Ingresa la distancia al centro de la comuna.';
 if(x.incluyeVivienda&&!x.areaCasa)return 'Si incluye vivienda, indica sus m² construidos.';
 return '';
}
function scoreCard(id,index){
 const el=$(id);if(!el)return;
 if(!index){el.innerHTML='<strong>—</strong><small>Sin datos suficientes</small>';return}
 el.innerHTML=`<strong>${index.score}/100</strong><small>${index.label}</small>`;
}
async function calculate(ev){
 ev?.preventDefault();
 const x=inputs(),territory=territorialContextFor(x),error=validate(x,territory);
 if(error){$('#status').textContent=error;$('#result').hidden=true;return}
 const submit=$('#tasadorForm button[type="submit"]');if(submit)submit.disabled=true;
 $('#status').textContent=mode==='precisa'?'Analizando coordenadas, cercanías y atributos…':'Calculando referencia TPL…';
 try{
  tasadorContext=await withTimeout(window.TPLTasadorSupabase?.loadContext?.(),3500,null)||tasadorContext||{uf:null,references:[]};
  x.distanceKm=territory.majorCityDistanceKm;x.majorCityDistanceKm=territory.majorCityDistanceKm;x.communeDistanceKm=territory.communeDistanceKm;
  x.nearestCity=territory.city?{name:territory.city.name,category:territory.city.category||'',weight:Number(territory.city.weight||1)}:null;
  x.tourism=territory.tourism;x.territorial=territory.cascade||null;x.communeProfile=territory.commune||null;
  // Las cercanías enriquecen el informe premium, pero no bloquean el cálculo principal.
  x.nearbyContext=null;
  x.territorialIndex=window.TPLLandEngine?.calculateTerritorialIndex?.(x.nearbyContext||{}, {majorCityDistanceKm:x.majorCityDistanceKm,distanceKm:x.majorCityDistanceKm,tourism:x.tourism})||null;
  x.propertyIndex=window.TPLLandEngine?.calculatePropertyIndex?.(x)||null;
  const res=x.incluyeVivienda?window.TPLHouseEngine?.calculate(x):window.TPLLandEngine?.calculate(x);
  if(!res||res.error){$('#status').textContent=res?.error||'No fue posible calcular. Revisa los datos.';$('#result').hidden=true;return}
  const enriched=window.TPLTasadorSupabase?.enrich?.(x,res,tasadorContext);
  lastResult=enriched?.result||res;lastInput=enriched?.input||x;
  const displayResult=lastResult;
  $('#status').textContent=mode==='precisa'?'Tasación precisa calculada con Índice Territorial TPL y atributos de la propiedad.':'Tasación rápida calculada. La versión precisa agrega coordenadas y cercanías reales.';
  $('#result').hidden=false;$('#ideal').textContent=money(displayResult.ideal);$('#quick').textContent=money(displayResult.quick);$('#patient').textContent=money(displayResult.patient);const ufEl=$('#idealUf');if(ufEl){ufEl.textContent=displayResult.recommendedUf?`Equivalente referencial: ${Number(displayResult.recommendedUf).toLocaleString('es-CL',{maximumFractionDigits:1})} UF · UF ${money(displayResult.ufClpUsed)}`:'Equivalente UF no disponible';}
  window.TPLTasadorSupabase?.register?.(x,res,tasadorContext).catch(error=>console.warn('Tasación calculada; registro Supabase pendiente.',error));
  const immediateBtn=$('#immediateValueBtn');if(immediateBtn){immediateBtn.hidden=!Number(displayResult.immediateReference);immediateBtn.dataset.value=String(displayResult.immediateReference||'');}
  scoreCard('#territorialScore',displayResult.territorialIndex||displayResult.landResult?.territorialIndex);
  scoreCard('#propertyScore',displayResult.propertyIndex||displayResult.landResult?.propertyIndex);
  const pa=displayResult.priceAnalysis||displayResult.landResult?.priceAnalysis;
  const classification=$('#priceClassification');if(classification)classification.textContent=pa?.classification||'Sin precio publicado';
  const b=displayResult.desglose||{valorTerreno:displayResult.ideal};const labels={valorTerreno:'Terreno',valorCasa:'Vivienda',valorFundacion:'Fundación',sumaObrasAdicionales:'Obras adicionales','bonificaciónDiferenciadora':'Característica diferenciadora'};
  $('#breakdown').innerHTML=Object.entries(labels).filter(([k])=>Number(b[k])).map(([k,l])=>`<div class="breakdown-row"><span>${l}</span><strong>${money(b[k])}</strong></div>`).join('')||`<div class="breakdown-row"><span>Terreno</span><strong>${money(displayResult.ideal)}</strong></div>`;
  const mr=displayResult.marketReference||displayResult.landResult?.marketReference||null,box=$('#marketReference');
  if(mr){box.hidden=false;box.innerHTML=`<small>Referencia comunal disponible</small><strong>${money(mr.medianM2)}/m²</strong><span>Rango central ${money(mr.p25M2)}–${money(mr.p75M2)}/m² · confianza ${String(mr.confidence||'referencial').replace('-',' ')}</span>`}else box.hidden=true;
  const q=new URLSearchParams({region:x.region,comuna:x.comuna,superficie:x.area,tasacion:String(Math.round(displayResult.ideal)),tipo:x.incluyeVivienda?'casa':'parcela'});$('#publishLink').href=`index.html?${q.toString()}`;
 }catch(e){
  console.error(e);$('#status').textContent='No pudimos completar el análisis. Puedes intentarlo nuevamente.';$('#result').hidden=true;
 }finally{if(submit)submit.disabled=false}
}
function row(label,value){if(value===undefined||value===null||String(value).trim()==='')return '';return `<tr><td>${label}</td><td>${value}</td></tr>`}
function nearbyHTML(result){
 const ctx=result?.nearbyContext||result?.landResult?.nearbyContext;
 if(!ctx)return '<p class="muted">No fue posible consultar las cercanías exactas. El resto de la tasación se mantiene disponible.</p>';
 const groups=[
  ['Servicios de salud','healthServices'],
  ['Seguridad','security'],
  ['Comercio','commerce'],
  ['Educación','education'],
  ['Servicios generales','generalServices'],
  ['Gastronomía','gastronomy'],
  ['Atractivos naturales / turísticos','attractions']
 ];
 const out=groups.map(([label,key])=>{
  const s=ctx[key],n=s?.nearest;if(!n)return '';
  return `<div class="near-item"><strong>${label}</strong><span>${n.name||label} · ${Number(n.distanceKm).toFixed(1).replace('.',',')} km aprox.${s.within10?` · ${s.within10} dentro de 10 km`:''}</span></div>`;
 }).filter(Boolean).join('');
 return out?`<div class="near-grid">${out}</div>`:'<p class="muted">No se encontraron suficientes servicios cercanos.</p>';
}
function indexDetails(index){
 if(!index?.components?.length)return '';
 return `<div class="score-detail-grid">${index.components.map(c=>`<div><span>${c.label}</span><strong>${c.points}/${c.weight}</strong><small>${c.detail||''}</small></div>`).join('')}</div>`;
}
async function openPremium(){
 if(!lastResult||!lastInput)return;
 const x=lastInput,r=lastResult,mr=r.marketReference||r.landResult?.marketReference||null,c=$('#premiumContent');
 const territorial=r.territorialIndex||r.landResult?.territorialIndex,property=r.propertyIndex||r.landResult?.propertyIndex,pa=r.priceAnalysis||r.landResult?.priceAnalysis;
 $('#premiumDialog').showModal();
 c.innerHTML=`<section><h2>${x.incluyeVivienda?'Propiedad rural con vivienda':'Parcela / campo'} en ${x.comuna}</h2><p class="muted">Informe construido con Motor TPL v1 y antecedentes ingresados en modo ${x.mode==='precisa'?'preciso':'rápido'}.</p></section>
 <section class="premium-value"><small>Valor TPL Recomendado</small><strong>${money(r.ideal)}</strong><span>Venta Ágil ${money(r.quick)} · Valor de Mercado Potencial ${money(r.patient)}</span></section>
 <section><h3>Índices TPL</h3><div class="premium-score-grid"><article><small>Índice territorial</small><strong>${territorial?.score??'—'}/100</strong><span>${territorial?.label||'Sin datos'}</span></article><article><small>Índice de propiedad</small><strong>${property?.score??'—'}/100</strong><span>${property?.label||'Sin datos'}</span></article></div>${territorial?indexDetails(territorial):''}${property?indexDetails(property):''}</section>
 ${mr?`<section><h3>Referencia comunal</h3><p>Mediana observada: <strong>${money(mr.medianM2)}/m²</strong>. Rango central: ${money(mr.p25M2)}–${money(mr.p75M2)}/m². Confianza ${String(mr.confidence||'referencial').replace('-',' ')}.</p></section>`:''}
 ${pa?`<section><h3>Lectura de precio</h3><p><strong>${pa.classification}</strong>${pa.publishedM2?` · Publicado ${money(pa.publishedM2)}/m² · TPL ${money(pa.tplM2)}/m²${pa.marketM2?` · Comunal ${money(pa.marketM2)}/m²`:''}`:''}</p></section>`:''}
 <section><h3>Antecedentes</h3><table>${row('Región',x.region)}${row('Comuna',x.comuna)}${row('Superficie',`${x.area.toLocaleString('es-CL')} m²`)}${row('Distancia a ciudad grande',`${Number(x.majorCityDistanceKm??x.distanceKm).toFixed(1)} km`)}${row('Distancia al centro comunal',Number.isFinite(Number(x.communeDistanceKm))?`${Number(x.communeDistanceKm).toFixed(1)} km`:'No informada')}${row('Rol',x.rol)}${row('Electricidad',x.electricity)}${/factibilidad|postación|postacion/i.test(x.electricity||'')?row('Distancia a postación',`${Number(x.electricityPoleDistanceM||0)} m`):''}${row('Agua',x.water)}${row('Topografía',x.topography)}${x.mode==='precisa'?row('Acceso',x.access)+row('Suelo',x.soil)+row('Exposición solar',x.exposure)+row('Vista',x.view)+row('Vegetación',x.vegetation)+row('Cierre',x.fencing)+row('Acceso controlado',x.gate)+row('Condominio',x.condominium)+row('Distancia a ruta',`${x.routeDistanceKm||0} km`):''}${x.incluyeVivienda?row('Casa',`${x.areaCasa} m²`)+row('Material',x.materialCasa)+row('Dormitorios',x.dormitorios)+row('Baños',x.banos)+row('Estado',x.estadoCasa):''}</table></section>
 <section><h3>Cercanías y conectividad</h3>${nearbyHTML(r)}</section>
 <section><h3>Observación TPL</h3><p class="muted">El Índice Territorial no usa un promedio simple de kilómetros: pondera centro urbano, servicios de salud, comercio, seguridad, educación, servicios generales, gastronomía y atractivos. Los datos sin evidencia suficiente se mantienen neutrales para no castigar artificialmente la tasación.</p></section>`;
}
function useLocation(){
 if(!navigator.geolocation){alert('Tu navegador no permite geolocalización.');return}
 const b=$('#useMyLocation');b.disabled=true;b.textContent='Obteniendo ubicación…';
 navigator.geolocation.getCurrentPosition(p=>{setLocation(p.coords.latitude,p.coords.longitude,'gps');b.disabled=false;b.innerHTML='<span>Ubicación lista</span><small>Punto cargado correctamente</small>'},()=>{b.disabled=false;b.innerHTML='<span>Mi ubicación</span><small>Usa el GPS del dispositivo</small>';alert('No pudimos obtener tu ubicación.')},{enableHighAccuracy:true,timeout:10000});
}
document.addEventListener('DOMContentLoaded',async()=>{
 buildWorks();await fillRegions();tasadorContext=await window.TPLTasadorSupabase?.loadContext?.()||{uf:null,references:[]};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));setMode('rapida');
 $('#incluyeVivienda').addEventListener('change',e=>$('#houseFields').hidden=!e.target.checked);
 $('#tasadorForm').addEventListener('submit',calculate);$('#useMyLocation').onclick=useLocation;$('#premiumReportBtn').onclick=openPremium;$('#closePremium').onclick=()=>$('#premiumDialog').close();
 document.querySelectorAll('[data-location-method]').forEach(b=>b.addEventListener('click',()=>setLocationMethod(b.dataset.locationMethod)));$('#applyGoogleMapsLink')?.addEventListener('click',applyGoogleMapsLink);$('#googleMapsLink')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyGoogleMapsLink();}});['lat','lng'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{const lat=Number($('#lat').value),lng=Number($('#lng').value);if(validCoordinate(lat,lng)&&lat&&lng)setLocation(lat,lng,'manual')}));
 const electricity=$('#electricity'),poleWrap=$('#electricityPoleWrap');const syncPole=()=>{if(poleWrap)poleWrap.hidden=!/factibilidad|postación|postacion/i.test(electricity?.value||'')};electricity?.addEventListener('change',syncPole);syncPole();
 $('#immediateValueBtn')?.addEventListener('click',()=>{const v=Number($('#immediateValueBtn').dataset.value||0);if(!v)return;$('#immediateValue').textContent=money(v);$('#immediateDialog').showModal()});$('#closeImmediate')?.addEventListener('click',()=>$('#immediateDialog').close());
});
