
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const on=(selector,event,handler)=>{const el=typeof selector==='string'?$(selector):selector;if(el)el.addEventListener(event,handler);return el};
const KEY='tpl_frontend_v2_publicador_draft_v1';
const REPORTS_KEY='tpl_frontend_v2_tasaciones_v1';
const SUBMISSIONS_KEY='tpl_frontend_v2_publicaciones_v1';
const stepNames=['Propiedad','Características','Precio y tasación','Fotografías','Descripción','Contacto','Revisión'];
let current=0;
let photos=[];
let valuation=null;
let coords=null;

let regionsMap={};
let territoryCatalog=null;

const valueOf=selector=>$(selector)?.value?.trim?.()||'';
const checked=selector=>Boolean($(selector)?.checked);
const numberOf=selector=>Number($(selector)?.value||0);
const radioValue=name=>$(`input[name="${name}"]:checked`)?.value||'';
const setSelectValue=(selector,value)=>{const el=$(selector);if(el&&value!==undefined&&value!==null)el.value=String(value)};

async function initTerritory(){
 try{
  const module=await import('./tpl-national-catalog.mjs');
  const cat=module.TPL_NATIONAL_CATALOG;
  territoryCatalog=cat||null;
  if(Array.isArray(cat?.regions)&&Array.isArray(cat?.communes)){
   const names=new Map(cat.regions.map(r=>[r.code,r.name]));
   regionsMap={};
   cat.regions.forEach(r=>{regionsMap[r.name]=[]});
   cat.communes.forEach(c=>{const regionName=names.get(c.reg);if(regionName&&c.name)regionsMap[regionName].push(c.name)});
   Object.values(regionsMap).forEach(list=>list.sort((a,b)=>a.localeCompare(b,'es')));
  }
 }catch(error){console.warn('Catálogo territorial no disponible.',error)}
 if(!Object.keys(regionsMap).length){
  regionsMap={
   'Región de Ñuble':['Bulnes','Chillán','Chillán Viejo','Cobquecura','Coelemu','Coihueco','El Carmen','Ninhue','Ñiquén','Pemuco','Pinto','Portezuelo','Quillón','Quirihue','Ránquil','San Carlos','San Fabián','San Ignacio','San Nicolás','Trehuaco','Yungay'],
   'Región del Biobío':['Alto Biobío','Antuco','Arauco','Cabrero','Cañete','Chiguayante','Concepción','Contulmo','Coronel','Curanilahue','Florida','Hualpén','Hualqui','Laja','Lebu','Los Álamos','Los Ángeles','Lota','Mulchén','Nacimiento','Negrete','Penco','Quilaco','Quilleco','San Pedro de la Paz','San Rosendo','Santa Bárbara','Santa Juana','Talcahuano','Tirúa','Tomé','Tucapel','Yumbel'],
   'Región de La Araucanía':['Angol','Carahue','Cholchol','Collipulli','Cunco','Curacautín','Curarrehue','Ercilla','Freire','Galvarino','Gorbea','Lautaro','Loncoche','Lonquimay','Los Sauces','Lumaco','Melipeuco','Nueva Imperial','Padre Las Casas','Perquenco','Pitrufquén','Pucón','Purén','Renaico','Saavedra','Temuco','Teodoro Schmidt','Toltén','Traiguén','Victoria','Vilcún','Villarrica']
  };
 }
 const region=$('#region');
 if(region){
  region.innerHTML='<option value="">Selecciona una región</option>'+Object.keys(regionsMap).map(name=>`<option>${name}</option>`).join('');
  region.addEventListener('change',()=>populateCommunes(region.value,''));
 }
 populateCommunes(region?.value||'','');
}
function populateCommunes(regionName,selected=''){
 const comuna=$('#comuna');if(!comuna)return;
 const communes=regionsMap[regionName]||[];
 comuna.disabled=!communes.length;
 comuna.innerHTML=communes.length?'<option value="">Selecciona una comuna</option>'+communes.map(name=>`<option>${name}</option>`).join(''):'<option value="">Primero selecciona una región</option>';
 if(selected&&communes.includes(selected))comuna.value=selected;
}
function toggleHouseFields(){
 const isHouse=radioValue('tipo')==='casa';
 const box=$('#houseFields');if(box)box.hidden=!isHouse;
}
function syncQuickServices(){
 const water=valueOf('#aguaDetalle');
 const power=valueOf('#luzDetalle');
 const role=valueOf('#rolDetalle');
 const fence=valueOf('#cierreDetalle');
 const gate=valueOf('#portonDetalle');
 if($('#agua')&&water)$('#agua').checked=!/sin agua|sin factibilidad|no lo sé/i.test(water);
 if($('#luz')&&power)$('#luz').checked=!/sin electricidad|no lo sé/i.test(power);
 if($('#rol')&&role)$('#rol').checked=/rol propio/i.test(role);
 if($('#cerco')&&fence)$('#cerco').checked=!/sin cierre/i.test(fence);
 if($('#porton')&&gate)$('#porton').checked=!/sin portón/i.test(gate);
}

const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n||0));
const parseMoney=v=>Number(String(v||'').replace(/[^\d]/g,''))||0;
const id=()=>crypto.randomUUID?.()||`tpl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const readJSON=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const writeJSON=(key,val)=>localStorage.setItem(key,JSON.stringify(val));


function selectedValues(name){return $$(`input[name="${name}"]:checked`).map(el=>el.value)}
function diagnosis(){
 const needed=selectedValues('necesidad');
 const negotiable=selectedValues('mejoraNegociable');
 return {
  estados:{},
  necesidades:needed.filter(x=>x!=='ninguna').map(tipo=>({tipo,descripcion:`Mejora declarada: ${tipo.replaceAll('_',' ')}`,negociable:negotiable.includes(tipo),datos:{origen:'declarado_por_publicador'}})),
  mejorasNegociables:negotiable,
  declaracionVeracidad:true
 };
}

let parcelMap=null,parcelMarker=null,mapPendingCoords=null,mapClickCount=0;

function data(){
 return {
  id: $('#draftId')?.value||id(),
  tipo:radioValue('tipo')||'parcela',
  region:valueOf('#region'),comuna:valueOf('#comuna'),localidad:valueOf('#localidad'),
  ubicacionTexto:valueOf('#ubicacionTexto'),googleMapsLink:valueOf('#googleMapsLink'),publicApproximate:checked('#publicApproximate'),coords,
  superficie:numberOf('#superficie'),suelo:valueOf('#suelo'),
  distanciaCiudad:numberOf('#distanciaCiudad'),acceso:valueOf('#acceso'),
  terreno:{
   tipoTerreno:valueOf('#tipoTerreno'),rol:valueOf('#rolDetalle'),condominio:valueOf('#condominio'),subdivision:valueOf('#subdivision'),
   usoSuelo:valueOf('#usoSuelo'),construccion:valueOf('#construccion'),topografia:valueOf('#topografia'),
   condicionSuelo:valueOf('#condicionSuelo'),vegetacion:valueOf('#vegetacion'),vistaPrincipal:valueOf('#vistaPrincipal'),
   orientacion:valueOf('#orientacion'),privacidad:valueOf('#privacidad'),agua:valueOf('#aguaDetalle'),
   luz:valueOf('#luzDetalle'),acceso:valueOf('#accesoDetalle'),distanciaRutaPrincipalKm:numberOf('#distanciaRutaPrincipalKm'),
   cierre:valueOf('#cierreDetalle'),porton:valueOf('#portonDetalle')
  },
  casa:radioValue('tipo')==='casa'?{
   tipoCasa:valueOf('#tipoCasa'),superficie:numberOf('#casaSuperficie'),habitaciones:valueOf('#habitaciones'),banos:valueOf('#banos'),
   pisos:valueOf('#pisos'),material:valueOf('#material'),estado:valueOf('#estadoCasa'),regularizacion:valueOf('#regularizacion'),
   anio:valueOf('#anioCasa'),calidad:valueOf('#calidadCasa'),remodelacion:valueOf('#remodelacionCasa'),
   anioRemodelacion:valueOf('#anioRemodelacionCasa'),centroUrbano:valueOf('#centroUrbanoCasa'),minutosCentro:numberOf('#minutosCentroCasa'),
   camino:valueOf('#caminoCasa'),aislacion:valueOf('#aislacionCasa'),ventanas:valueOf('#ventanasCasa'),agua:valueOf('#aguaCasa'),
   sanitario:valueOf('#sanitarioCasa'),calefaccion:valueOf('#calefaccion'),estacionamientos:valueOf('#estacionamientos')
  }:null,
  servicios:{agua:checked('#agua'),luz:checked('#luz'),rol:checked('#rol'),cerco:checked('#cerco'),porton:checked('#porton'),naturaleza:checked('#naturaleza')},
  precio:parseMoney($('#precio')?.value),
  estrategia:{urgencia:radioValue('urgencia'),plazoVenta:valueOf('#plazoVenta'),tiempoEnVenta:valueOf('#tiempoEnVenta'),negociacionPrecio:valueOf('#negociacionPrecio'),disponibilidadVisitas:valueOf('#disponibilidadVisitas')},
  videoUrl:valueOf('#videoUrl'),
  titulo:valueOf('#titulo'),descripcion:valueOf('#descripcion'),
  diagnostico:diagnosis(),
  contacto:{tipoActor:'persona',responsable:radioValue('responsable')||'propietario',nombre:valueOf('#nombre'),telefono:valueOf('#telefono'),email:valueOf('#email'),rut:valueOf('#rut')},
  valuation,photoNames:photos.map(p=>p.name),updatedAt:new Date().toISOString()
 };
}
function fill(d){
 if(!d)return;
 const set=(sel,val)=>{const el=$(sel);if(el&&val!==undefined&&val!==null)el.value=val};
 const check=(sel,val)=>{const el=$(sel);if(el)el.checked=!!val};
 const radio=(name,val)=>{const el=$(`input[name="${name}"][value="${val}"]`);if(el)el.checked=true};
 radio('tipo',d.tipo);
 set('#region',d.region);populateCommunes(d.region,d.comuna);set('#comuna',d.comuna);set('#localidad',d.localidad);set('#ubicacionTexto',d.ubicacionTexto);
 set('#googleMapsLink',d.googleMapsLink);check('#publicApproximate',d.publicApproximate!==false);
 set('#superficie',d.superficie);set('#suelo',d.suelo);set('#distanciaCiudad',d.distanciaCiudad);set('#acceso',d.acceso);
 Object.entries(d.servicios||{}).forEach(([k,v])=>check('#'+k,v));
 const t=d.terreno||{};
 [['#tipoTerreno',t.tipoTerreno],['#rolDetalle',t.rol],['#condominio',t.condominio],['#subdivision',t.subdivision],['#usoSuelo',t.usoSuelo],['#construccion',t.construccion],['#topografia',t.topografia],['#condicionSuelo',t.condicionSuelo],['#vegetacion',t.vegetacion],['#vistaPrincipal',t.vistaPrincipal],['#orientacion',t.orientacion],['#privacidad',t.privacidad],['#aguaDetalle',t.agua],['#luzDetalle',t.luz],['#accesoDetalle',t.acceso],['#distanciaRutaPrincipalKm',t.distanciaRutaPrincipalKm],['#cierreDetalle',t.cierre],['#portonDetalle',t.porton]].forEach(([s,v])=>set(s,v));
 const c=d.casa||{};
 [['#tipoCasa',c.tipoCasa],['#casaSuperficie',c.superficie],['#habitaciones',c.habitaciones],['#banos',c.banos],['#pisos',c.pisos],['#material',c.material],['#estadoCasa',c.estado],['#regularizacion',c.regularizacion],['#anioCasa',c.anio],['#calidadCasa',c.calidad],['#remodelacionCasa',c.remodelacion],['#anioRemodelacionCasa',c.anioRemodelacion],['#centroUrbanoCasa',c.centroUrbano],['#minutosCentroCasa',c.minutosCentro],['#caminoCasa',c.camino],['#aislacionCasa',c.aislacion],['#ventanasCasa',c.ventanas],['#aguaCasa',c.agua],['#sanitarioCasa',c.sanitario],['#calefaccion',c.calefaccion],['#estacionamientos',c.estacionamientos]].forEach(([s,v])=>set(s,v));
 set('#precio',d.precio?String(d.precio).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'');
 const e=d.estrategia||{};radio('urgencia',e.urgencia);set('#plazoVenta',e.plazoVenta);set('#tiempoEnVenta',e.tiempoEnVenta);set('#negociacionPrecio',e.negociacionPrecio);set('#disponibilidadVisitas',e.disponibilidadVisitas);
 set('#videoUrl',d.videoUrl);set('#titulo',d.titulo);set('#descripcion',d.descripcion);radio('responsable',d.contacto?.responsable);
 set('#nombre',d.contacto?.nombre);set('#telefono',d.contacto?.telefono);set('#email',d.contacto?.email);set('#rut',d.contacto?.rut);
 const diag=d.diagnostico||{};
 (diag.necesidades||[]).forEach(n=>{const el=$(`input[name="necesidad"][value="${n.tipo}"]`);if(el)el.checked=true});
 (diag.mejorasNegociables||[]).forEach(v=>{const el=$(`input[name="mejoraNegociable"][value="${v}"]`);if(el)el.checked=true});
 coords=d.coords||null;valuation=d.valuation||null;if(valuation)renderValuation();
 toggleHouseFields();
}
function normalizeCoords(lat,lng){
 const a=Number(lat),b=Number(lng);
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<-90||a>90||b<-180||b>180)return null;
 return {lat:a,lng:b};
}
function coordsFromMapsValue(raw){
 const text=String(raw||'').trim();
 if(!text)return null;
 let m=text.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
 if(!m)m=text.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
 if(!m)m=text.match(/[?&](?:q|query|ll|center)=(-?\d{1,2}(?:\.\d+)?)(?:%2C|,)(-?\d{1,3}(?:\.\d+)?)/i);
 return m?normalizeCoords(m[1],m[2]):null;
}
function mapsLinkFor(c){return c?`https://www.google.com/maps?q=${c.lat.toFixed(7)},${c.lng.toFixed(7)}`:''}
function paintCoordinates(c,{updateLink=true,status=true}={}){
 if(!c)return;
 const normalized=normalizeCoords(c.lat,c.lng);if(!normalized)return;
 mapPendingCoords=normalized;
 const lat=$('#latitude'),lng=$('#longitude'),confirm=$('#mapConfirmBtn');
 if(lat)lat.value=normalized.lat.toFixed(7);if(lng)lng.value=normalized.lng.toFixed(7);if(confirm)confirm.disabled=false;
 if(updateLink){const link=$('#googleMapsLink');if(link)link.value=mapsLinkFor(normalized)}
 if(status){const s=$('#geoStatus');if(s){s.textContent=`Punto seleccionado: ${normalized.lat.toFixed(6)}, ${normalized.lng.toFixed(6)}`;s.classList.add('location-selected')}}
}
function setMapMarker(c,center=true,{progressive=false}={}){
 if(!parcelMap||!c)return;
 if(!parcelMarker){parcelMarker=L.marker([c.lat,c.lng],{draggable:true}).addTo(parcelMap);parcelMarker.on('dragend',()=>{const p=parcelMarker.getLatLng();paintCoordinates({lat:p.lat,lng:p.lng})})}
 else parcelMarker.setLatLng([c.lat,c.lng]);
 if(center){
  if(progressive){
   mapClickCount=Math.min(mapClickCount+1,4);
   const zoomSteps=[8,11,15,16];
   parcelMap.flyTo([c.lat,c.lng],zoomSteps[mapClickCount-1],{animate:true,duration:.65});
  }else{
   parcelMap.setView([c.lat,c.lng],Math.max(parcelMap.getZoom(),15));
  }
 }
 paintCoordinates(c);
}
function ensureParcelMap(){
 if(parcelMap||!window.L)return parcelMap;
 parcelMap=L.map('parcelMap',{zoomControl:true}).setView([-36.6,-71.5],5);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(parcelMap);
 parcelMap.on('click',e=>setMapMarker({lat:e.latlng.lat,lng:e.latlng.lng},true,{progressive:true}));
 const initial=coords||coordsFromMapsValue(valueOf('#googleMapsLink'));
 if(initial)setMapMarker(initial);
 return parcelMap;
}
function openMapPicker(){
 const box=$('#mapPickerBox');if(!box)return;box.hidden=false;mapClickCount=0;
 ensureParcelMap();
 setTimeout(()=>{
  parcelMap?.invalidateSize();
  const c=coords||mapPendingCoords||coordsFromMapsValue(valueOf('#googleMapsLink'));
  if(c)setMapMarker(c);
  else parcelMap?.setView([-36.6,-71.5],5);
  box.scrollIntoView({behavior:'smooth',block:'start'});
 },90);
}
function closeMapPicker(){const box=$('#mapPickerBox');if(box)box.hidden=true}
function requestBrowserLocation({openMap=false}={}){
 const status=$('#geoStatus');
 if(!navigator.geolocation){if(status)status.textContent='GPS no disponible en este dispositivo.';return}
 if(status){status.textContent='Buscando ubicación…';status.classList.remove('location-selected')}
 navigator.geolocation.getCurrentPosition(p=>{
  const c={lat:p.coords.latitude,lng:p.coords.longitude};
  coords=c;mapPendingCoords=c;
  if(openMap)openMapPicker();
  if(parcelMap)setMapMarker(c);else paintCoordinates(c);
  if(status){status.textContent=`Ubicación guardada: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;status.classList.add('location-selected')}
  saveDraft();
 },()=>{if(status)status.textContent='No se pudo obtener la ubicación. Puedes marcarla manualmente en el mapa.'},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
}
function initMapPicker(){
 const toggle=$('#mapToggleBtn'),close=$('#mapCloseBtn'),confirm=$('#mapConfirmBtn'),useLocation=$('#mapUseLocationBtn'),link=$('#googleMapsLink');
 if(toggle)toggle.onclick=openMapPicker;if(close)close.onclick=closeMapPicker;if(useLocation)useLocation.onclick=()=>requestBrowserLocation({openMap:true});
 if(confirm)confirm.onclick=()=>{if(!mapPendingCoords)return;coords={...mapPendingCoords};const l=$('#googleMapsLink');if(l)l.value=mapsLinkFor(coords);const s=$('#geoStatus');if(s){s.textContent=`Ubicación seleccionada: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;s.classList.add('location-selected')}closeMapPicker();saveDraft(true)};
 if(link)link.addEventListener('change',()=>{const parsed=coordsFromMapsValue(link.value);if(parsed){coords=parsed;mapPendingCoords=parsed;paintCoordinates(parsed,{updateLink:false});if(parcelMap)setMapMarker(parsed)}else if(link.value.trim()){const s=$('#geoStatus');if(s){s.textContent='Enlace guardado. Si quieres precisar el punto, usa “Ubicar en mapa”.';s.classList.remove('location-selected')}}saveDraft()});
 if(coords){mapPendingCoords={...coords};paintCoordinates(coords,{updateLink:false,status:false})}
}
function saveDraft(show=false){
 writeJSON(KEY,data());
 $('#draftStatus').textContent=`Guardado ${new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}`;
 if(show) $('#draftStatus').textContent='Borrador guardado correctamente';
}
function validateStep(step){
 const pane=$(`.wizard-step[data-step="${step}"]`);
 const required=$$('[required]',pane);
 for(const el of required){
  if(el.type==='checkbox'&&!el.checked){el.focus();return false}
  if(el.type==='radio'){
   const selected=pane.querySelector(`input[name="${el.name}"]:checked`);
   if(!selected){el.focus();return false}
   continue;
  }
  if(!el.value?.trim()){el.focus();return false}
 }
 if(step===1&&!Number($('#superficie').value)){ $('#superficie').focus(); return false; }
 if(step===1&&!selectedValues('necesidad').length){alert('Selecciona al menos una mejora necesaria. Si no necesita ninguna, marca “No necesita mejoras”.');return false;}
 return true;
}
function showStep(next){
 current=Math.max(0,Math.min(6,next));
 $$('.wizard-step').forEach((el,i)=>el.classList.toggle('is-active',i===current));
 $$('.step-link').forEach((el,i)=>{el.classList.toggle('is-active',i===current);el.classList.toggle('is-done',i<current)});
 $('#progressText').textContent=`Paso ${current+1} de 7`;
 $('#mobileStepLabel').textContent=`Paso ${current+1} de 7`;
 $('#mobileStepName').textContent=stepNames[current];
 $('#stepCounter').textContent=`${current+1} / 7`;
 $('#progressBar').style.width=`${((current+1)/7)*100}%`;
 $('#prevBtn').disabled=current===0;
 $('#nextBtn').hidden=current===6;
 if(current===4&&(!valueOf('#titulo')||!valueOf('#descripcion')))suggestDescription({silent:true});
 if(current===6)renderReview();
 window.scrollTo({top:0,behavior:'smooth'});
 saveDraft();
}
function formatInput(el){const n=parseMoney(el.value);el.value=n?String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):''}
function territorialContext(property){
 const cat=territoryCatalog||globalThis.TPL_NATIONAL_CATALOG||null;
 const selectedCoords=property.coords&&Number.isFinite(Number(property.coords.lat))&&Number.isFinite(Number(property.coords.lng))
  ? {lat:Number(property.coords.lat),lng:Number(property.coords.lng)} : null;
 let commune=null,city=null,cascade=null;
 try{
  commune=cat?.getCommune?.(property.comuna)||cat?.communes?.find?.(c=>cat.normalizeText?.(c.name)===cat.normalizeText?.(property.comuna))||null;
  city=cat?.getCityForCommune?.(property.comuna,property.region)||null;
  if(selectedCoords&&cat?.resolveTerritorialCascade) cascade=cat.resolveTerritorialCascade(property.comuna,property.region,selectedCoords.lat,selectedCoords.lng,0);
 }catch(error){console.warn('No fue posible resolver contexto territorial.',error)}
 const cityDistance=Number(cascade?.distanceKm);
 const manualDistance=Number(property.distanciaCiudad||0);
 const distanceKm=Number.isFinite(cityDistance)&&cityDistance>0?cityDistance:manualDistance;
 const cityCategory=String(city?.category||'').toLowerCase();
 const tourism=commune?.tour ? (/destino tur[ií]stico|internacional|lacustre/.test(cityCategory)?'nacional':'local') : '';
 return {commune,city,cascade,distanceKm,tourism};
}

let valuationPopupChoice='tpl';
let valuationPopupTimer=null;

function prevalidateValuation(){
 const property=data();
 const missing=[];
 if(!Number(property.superficie||0))missing.push({message:'Ingresa la superficie del terreno.',el:$('#superficie')});
 if(!property.region)missing.push({message:'Selecciona la región de la propiedad.',el:$('#region')});
 if(!property.comuna)missing.push({message:'Selecciona la comuna de la propiedad.',el:$('#comuna')});
 const urgency=property.estrategia?.urgencia||radioValue('urgencia');
 if(!urgency)missing.push({message:'Selecciona tu nivel de apuro antes de calcular.',el:document.querySelector('input[name="urgencia"]')});
 return missing;
}
function openValuationThinking(){
 const dialog=$('#valuationResultDialog'),thinking=$('#valuationThinking'),content=$('#valuationResultContent');
 if(!dialog)return;
 if(thinking)thinking.hidden=false;if(content)content.hidden=true;
 if(!dialog.open)dialog.showModal();
 const messages=[
  'Revisando ubicación, superficie y características declaradas…',
  'Contrastando la propiedad con referencias generales de mercado…',
  'Ordenando factores de conectividad, documentación y atributos…',
  'Preparando alternativas de valoración para que puedas compararlas…'
 ];
 let i=0;const target=$('#valuationThinkingText');
 clearInterval(window.__tplThinkingInterval);
 window.__tplThinkingInterval=setInterval(()=>{i=(i+1)%messages.length;if(target)target.textContent=messages[i]},1250);
}
function calculate(){
 const missing=prevalidateValuation();
 if(missing.length){
  const first=missing[0];
  const explanation=$('#valuationExplanation');
  if(explanation)explanation.textContent=first.message;
  first.el?.focus?.();
  return;
 }
 const btn=$('#calculateBtn');if(btn)btn.disabled=true;
 openValuationThinking();
 clearTimeout(valuationPopupTimer);
 valuationPopupTimer=setTimeout(()=>performCalculate(),5200);
}
function showValuationPopupError(message){
 clearInterval(window.__tplThinkingInterval);
 const dialog=$('#valuationResultDialog'),thinking=$('#valuationThinking'),content=$('#valuationResultContent');
 if(thinking)thinking.hidden=true;
 if(content){
  content.hidden=false;
  content.innerHTML=`<div class="valuation-result-body"><span class="eyebrow">Tasador TPL</span><h2>No pudimos completar el análisis</h2><p>${message}</p><button class="primary" type="button" onclick="document.getElementById('valuationResultDialog')?.close()">Revisar datos</button></div>`;
 }
 if(dialog&&!dialog.open)dialog.showModal();
}
function setPopupChoice(choice){
 if(!valuation)return;
 const tpl=Number(valuation.technical||valuation.market||0);
 const mr=valuation.marketReference;
 const market=Number(mr?.medianValue||0);
 const blend=market?Math.round(((tpl+market)/2)/10000)*10000:tpl;
 const map={tpl,market,blend};
 if(choice==='market'&&!market)choice='tpl';
 valuationPopupChoice=choice;
 document.querySelectorAll('[data-valuation-choice]').forEach(el=>el.classList.toggle('is-selected',el.dataset.valuationChoice===choice));
 const selected=map[choice]||tpl;
 const value=$('#popupSelectedValue');if(value)value.textContent=money(selected);
 const explanation=$('#popupSelectedExplanation');
 if(explanation){
  explanation.textContent=choice==='tpl'
   ?'Usa el análisis técnico de TPL con distancia y atributos declarados.'
   :choice==='market'
    ?'Usa como referencia el valor comunal observado para una propiedad de esta superficie.'
    :'Promedia en partes iguales el análisis TPL y la referencia comunal de mercado.';
 }
 valuation.selectedMethod=choice;
 valuation.selectedValue=selected;
}
function populateValuationPopup(){
 const dialog=$('#valuationResultDialog'),thinking=$('#valuationThinking'),content=$('#valuationResultContent');
 if(!dialog||!valuation)return;
 clearInterval(window.__tplThinkingInterval);
 if(thinking)thinking.hidden=true;if(content)content.hidden=false;
 const tpl=Number(valuation.technical||valuation.market||0);
 const mr=valuation.marketReference;
 const market=Number(mr?.medianValue||0);
 const blend=market?Math.round(((tpl+market)/2)/10000)*10000:tpl;
 if($('#popupTplValue'))$('#popupTplValue').textContent=money(tpl);
 if($('#popupMarketValue'))$('#popupMarketValue').textContent=market?money(market):'Sin referencia suficiente';
 if($('#popupBlendValue'))$('#popupBlendValue').textContent=market?money(blend):money(tpl);
 const meta=$('#popupMarketMeta');
 if(meta)meta.textContent=mr?`Referencia comunal · ${mr.sampleSize} comparables · confianza ${String(mr.confidence||'referencial').replace('-',' ')}`:'Aún no contamos con una muestra comunal suficiente.';
 const marketBtn=document.querySelector('[data-valuation-choice="market"]');
 const blendBtn=document.querySelector('[data-valuation-choice="blend"]');
 if(marketBtn)marketBtn.disabled=!market;if(blendBtn)blendBtn.disabled=!market;
 setPopupChoice(market?'blend':'tpl');
}
function applyPopupValuation(){
 if(!valuation)return;
 const selected=Number(valuation.selectedValue||valuation.market||valuation.technical||0);
 if(!selected)return;
 valuation.market=Math.round(selected/10000)*10000;
 valuation.quick=Math.round((selected*(1+Number(valuation.urgencyPct||0)))/10000)*10000;
 valuation.patient=Math.round((selected*1.10)/10000)*10000;
 valuation.selectionSource=valuation.selectedMethod||valuationPopupChoice;
 renderValuation();saveReport();
 $('#valuationResultDialog')?.close();
}
function haversineKm(a,b){
 const R=6371,toRad=v=>Number(v)*Math.PI/180;
 const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),lat1=toRad(a.lat),lat2=toRad(b.lat);
 const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
 return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
async function loadNearbyServices(){
 const holder=$('#nearbyServicesReport');if(!holder)return;
 const d=data(),lat=Number(d.coords?.lat),lng=Number(d.coords?.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)){holder.innerHTML='<p>No hay coordenadas confirmadas para calcular cercanías.</p>';return}
 holder.innerHTML='<p>Calculando servicios y puntos útiles cercanos…</p>';
 const query=`[out:json][timeout:15];(nwr(around:20000,${lat},${lng})["amenity"~"hospital|clinic|doctors|police|school|fuel|pharmacy|marketplace"];nwr(around:20000,${lat},${lng})["shop"~"supermarket|convenience"];);out center tags;`;
 try{
  const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query)});
  if(!res.ok)throw new Error('nearby unavailable');
  const payload=await res.json();
  const categories=[
   {key:'salud',label:'Salud',test:t=>/hospital|clinic|doctors/.test(t.amenity||'')},
   {key:'seguridad',label:'Carabineros / policía',test:t=>(t.amenity||'')==='police'},
   {key:'supermercado',label:'Supermercado / comercio',test:t=>/supermarket|convenience/.test(t.shop||'')||(t.amenity||'')==='marketplace'},
   {key:'educacion',label:'Educación',test:t=>(t.amenity||'')==='school'},
   {key:'combustible',label:'Servicentro',test:t=>(t.amenity||'')==='fuel'},
   {key:'farmacia',label:'Farmacia',test:t=>(t.amenity||'')==='pharmacy'}
  ];
  const items=(payload.elements||[]).map(e=>{
   const elat=Number(e.lat??e.center?.lat),elng=Number(e.lon??e.center?.lon);
   return {...e,_lat:elat,_lng:elng,_distance:(Number.isFinite(elat)&&Number.isFinite(elng))?haversineKm({lat,lng},{lat:elat,lng:elng}):Infinity};
  }).filter(e=>Number.isFinite(e._distance));
  const selected=[];
  for(const cat of categories){
   const found=items.filter(e=>cat.test(e.tags||{})).sort((a,b)=>a._distance-b._distance)[0];
   if(found)selected.push({label:cat.label,name:found.tags?.name||cat.label,distance:found._distance});
  }
  if(!selected.length){holder.innerHTML='<p>No encontramos suficientes servicios cercanos en este momento.</p>';return}
  holder.innerHTML='<div class="tpl-nearby-grid">'+selected.map(x=>`<div class="tpl-nearby-item"><strong>${x.label}</strong><span>${x.name} · ${x.distance.toFixed(1).replace('.',',')} km aprox.</span></div>`).join('')+'</div>';
 }catch(error){
  console.warn('Cercanías TPL no disponibles.',error);
  holder.innerHTML='<p>Las cercanías no pudieron calcularse en este momento. El informe conserva el resto de la información.</p>';
 }
}

function performCalculate(){
 const explanation=$('#valuationExplanation');
 const button=$('#calculateBtn');
 try{
  const property=data();
  const area=Number(property.superficie||0);
  const territory=territorialContext(property);
  const distance=Number(territory.distanceKm||property.distanciaCiudad||0);
  const missing=[];
  if(!area)missing.push({message:'Ingresa la superficie del terreno.',el:$('#superficie')});
  if(!property.region)missing.push({message:'Selecciona la región de la propiedad.',el:$('#region')});
  if(!property.comuna)missing.push({message:'Selecciona la comuna de la propiedad.',el:$('#comuna')});
  const urgency=property.estrategia?.urgencia||radioValue('urgencia');
  if(!urgency)missing.push({message:'Selecciona tu nivel de apuro antes de calcular.',el:$('input[name="urgencia"]')});
  if(missing.length){
   if(explanation)explanation.textContent=`Falta un dato para calcular: ${missing[0].message}`;
   missing[0].el?.focus?.();
   return;
  }
  const features={
   water:$('#agua').checked,electricity:$('#luz').checked,role:$('#rol').checked,nature:$('#naturaleza').checked,
   fence:$('#cerco').checked,gate:$('#porton').checked
  };
  const landInput={
   area,distanceKm:distance,
   rol:property.terreno?.rol||(features.role?'Rol propio':'Por confirmar'),
   electricity:property.terreno?.luz||(features.electricity?'Empalme instalado':'Por confirmar'),
   topography:property.terreno?.topografia||property.suelo||'Por confirmar',
   nature:features.nature?['Bosque nativo']:[],
   routeDistanceKm:Number(property.terreno?.distanciaRutaPrincipalKm||0),
   asking:property.precio,
   comuna:property.comuna,region:property.region,sector:property.localidad,
   water:property.terreno?.agua||(features.water?'Agua disponible':'Por confirmar'),
   access:property.terreno?.acceso||property.acceso,
   tourism:territory.tourism,
   nearestCity:territory.city?{name:territory.city.name,category:territory.city.category,weight:Number(territory.city.weight||1)}:null,
   territorial:territory.cascade||null,
   communeProfile:territory.commune||null
  };
  let result;
  if(property.tipo==='casa' && window.TPLHouseEngine?.calculate){
   const c=property.casa||{};
   const currentYear=new Date().getFullYear();
   const houseYear=Number(c.anio||0);
   const remodelYear=Number(c.anioRemodelacion||0);
   result=window.TPLHouseEngine.calculate({
    ...landInput,incluyeVivienda:true,areaCasa:Number(c.superficie||0),materialCasa:c.material||'mixta',
    antiguedadCasa:houseYear?Math.max(0,currentYear-houseYear):0,anioConstruccion:houseYear||0,
    estadoCasa:c.estado||'bueno',remodelacionIntegral:/integral/i.test(c.remodelacion||''),anioRemodelacion:remodelYear||0,
    dormitorios:Number(c.habitaciones||0),banos:Number(c.banos||0),pisos:Number(c.pisos||1),tipoFundacion:'sin_fundacion',
    rolAvaluo:property.terreno?.rol||'',valorTerreno:0
   });
  }else if(window.TPLLandEngine?.calculate){
   result=window.TPLLandEngine.calculate(landInput);
  }else{
   if(explanation)explanation.textContent='El motor interno de tasación no está disponible en este momento. Intenta nuevamente más tarde.';
   showValuationPopupError('El motor interno de tasación no está disponible en este momento.');
   return;
  }
  if(result?.error){if(explanation)explanation.textContent=result.error;showValuationPopupError(result.error);return}
  const technical=Number(result.ideal||result.market||result.recommended||result.baseValue||0);
  if(!technical||!Number.isFinite(technical)){if(explanation)explanation.textContent='No fue posible obtener una tasación con estos antecedentes. Revisa los datos e intenta nuevamente.';showValuationPopupError('Revisa los antecedentes ingresados e intenta nuevamente.');return}
  const urgencyPct=urgencyAdjustment(urgency);
  const recommended=Math.round(technical/10000)*10000;
  const urgencyValue=Math.round((technical*(1+urgencyPct))/10000)*10000;
  const idealValue=Math.round((Number(result.patient||technical*1.10))/10000)*10000;
  valuation={
   id:id(),createdAt:new Date().toISOString(),area,distance,technical:Math.round(technical/10000)*10000,
   urgency,urgencyPct,quick:urgencyValue,market:recommended,patient:idealValue,asking:property.precio,
   comuna:property.comuna,tipo:property.tipo,features,territory:{nearestCity:territory.city?.name||'',distanceKm:distance,tourism:territory.tourism||'',marketZone:territory.city?.marketZone||''},breakdown:result.desglose||null,landResult:result.landResult||null,
   houseResult:result.vivienda||null,marketReference:result.marketReference||result.landResult?.marketReference||null,
   distanceRule:result.cityDistance||result.landResult?.cityDistance||null,method:result.method||'tpl-unified-local-v2',source:result.source||'tpl_local'
  };
  renderValuation();saveReport();captureValuationLead(property,valuation);populateValuationPopup();
 }catch(error){
  console.error('Error al calcular tasación TPL:',error);
  if(explanation)explanation.textContent='No pudimos calcular en este intento. Revisa los datos e inténtalo nuevamente; el botón sigue disponible.';showValuationPopupError('Ocurrió un problema al analizar la propiedad. Puedes revisar los datos e intentarlo nuevamente.');
 }finally{
  if(button)button.disabled=false;
 }
}
function renderValuation(){
 $('#valuationMain').textContent=`Valor recomendado TPL: ${money(valuation.market)}`;
 $('#quickValue').textContent=money(valuation.quick);$('#marketValue').textContent=money(valuation.market);$('#patientValue').textContent=money(valuation.patient);
 const virtues=valuationVirtues(data()),box=$('#valuationVirtues'),list=$('#valuationVirtuesList');
 if(box&&list){list.innerHTML=virtues.map(x=>`<li>${x}</li>`).join('');box.hidden=!virtues.length}
 const offer=$('#professionalReportOffer');if(offer)offer.hidden=false;
 const ask=valuation.asking||parseMoney($('#precio').value);
 let msg='El rango ayuda a decidir una estrategia de venta.';
 if(ask&&valuation.market){const diff=(ask-valuation.market)/valuation.market;if(diff>.1)msg='El precio indicado está sobre la referencia. Conviene respaldarlo con atributos diferenciales o revisar la estrategia.';else if(diff<-.1)msg='El precio indicado está bajo la referencia y podría atraer demanda más rápido.';else msg='El precio indicado se encuentra dentro del rango razonable estimado.'}
 if(valuation.marketReference){
  const mr=valuation.marketReference;
  msg+=` Referencia de mercado publicada en ${data().comuna}: mediana ${money(mr.medianM2)}/m²; rango central ${money(mr.p25M2)}–${money(mr.p75M2)}/m² (${mr.sampleSize} comparables depurados; confianza ${String(mr.confidence||'referencial').replace('-', ' ')}).`;
 }
 if(valuation.distanceRule){
  const dr=valuation.distanceRule;
  msg+=` Cercanía territorial: ${dr.urbanClass==='ciudad_grande'?'polo urbano principal':'comuna o pueblo menor'}, tramo ${dr.label}, factor ×${String(dr.multiplier).replace('.',',')}.`;
 }
 if(valuation.breakdown){
  const b=valuation.breakdown;
  const parts=[];
  if(Number(b.valorTerreno))parts.push(`terreno ${money(b.valorTerreno)}`);
  if(Number(b.valorCasa))parts.push(`vivienda ${money(b.valorCasa)}`);
  if(Number(b.valorFundacion))parts.push(`fundación ${money(b.valorFundacion)}`);
  if(Number(b.sumaObrasAdicionales))parts.push(`obras ${money(b.sumaObrasAdicionales)}`);
  if(parts.length)msg+=` Desglose estimado: ${parts.join(' + ')}.`;
 }
 $('#valuationExplanation').textContent=msg;$('#openReportBtn').disabled=false;
}
function saveReport(){
 const reports=readJSON(REPORTS_KEY,[]);
 const report={...valuation,property:data(),status:'borrador'};
 const idx=reports.findIndex(r=>r.id===report.id);if(idx>=0)reports[idx]=report;else reports.unshift(report);
 writeJSON(REPORTS_KEY,reports.slice(0,100));
}
function reportHTML(){
 const d=data(),v=valuation,t=d.terreno||{},c=d.casa||null,mr=v?.marketReference||null;
 const row=(label,value)=>value!==undefined&&value!==null&&String(value).trim()!==''?`<tr><td>${label}</td><td>${value}</td></tr>`:'';
 const services=[
  d.servicios?.agua?'Agua':'',d.servicios?.luz?'Electricidad':'',d.servicios?.rol?'Rol propio':'',d.servicios?.naturaleza?'Entorno natural':''
 ].filter(Boolean).join(', ');
 const chosenLabel=v?.selectionSource==='market'?'Referencia comunal':v?.selectionSource==='blend'?'Promedio TPL + mercado':'Modelo TPL';
 return `<article class="tpl-report">
 <h1>Informe Premium TPL</h1><p>${new Date().toLocaleDateString('es-CL')}</p>
 <h2>${d.titulo||`${d.tipo} en ${d.comuna||'Chile'}`}</h2>
 <p>Documento orientativo preparado con los antecedentes declarados y el análisis territorial disponible.</p>
 <div class="valuation-range"><div><small>Según nivel de apuro</small><strong>${money(v.quick)}</strong></div><div><small>Valor seleccionado</small><strong>${money(v.market)}</strong></div><div><small>Venta paciente</small><strong>${money(v.patient)}</strong></div></div>
 <section class="tpl-premium-section"><h3>Lectura de valoración</h3>
 <table class="tpl-report-table">
 ${row('Alternativa utilizada',chosenLabel)}
 ${row('Modelo TPL',money(v.technical||v.market))}
 ${mr?row('Referencia comunal',`${money(mr.medianM2)}/m² · estimación para esta superficie ${money(mr.medianValue)}`):''}
 ${mr?row('Rango comunal central',`${money(mr.p25M2)}–${money(mr.p75M2)}/m²`):''}
 ${mr?row('Nivel de confianza',String(mr.confidence||'referencial').replace('-',' ')):''}
 </table></section>
 <section class="tpl-premium-section"><h3>Antecedentes de la propiedad</h3><table class="tpl-report-table">
 ${row('Tipo',d.tipo)}
 ${row('Región',d.region)}
 ${row('Comuna',d.comuna)}
 ${row('Sector / referencia',d.localidad)}
 ${row('Superficie',`${Number(d.superficie||0).toLocaleString('es-CL')} m²`)}
 ${row('Precio informado',d.precio?money(d.precio):'')}
 ${row('Suelo',d.suelo)}
 ${row('Topografía',t.topografia)}
 ${row('Exposición solar',t.orientacion)}
 ${row('Vista principal',t.vistaPrincipal)}
 ${row('Agua',t.agua)}
 ${row('Electricidad',t.luz)}
 ${row('Documentación / rol',t.rol)}
 ${row('Acceso',t.acceso||d.acceso)}
 ${row('Vegetación',t.vegetacion)}
 ${row('Servicios confirmados',services)}
 ${c?row('Superficie construida',c.superficie?`${c.superficie} m²`:''):''}
 ${c?row('Dormitorios',c.habitaciones):''}
 ${c?row('Baños',c.banos):''}
 ${c?row('Material',c.material):''}
 ${c?row('Estado vivienda',c.estado):''}
 </table></section>
 <section class="tpl-premium-section"><h3>Cercanías y conectividad</h3><div id="nearbyServicesReport"><p>Calculando servicios y puntos útiles cercanos…</p></div></section>
 <section class="tpl-premium-section"><h3>Lectura TPL</h3><p>${$('#valuationExplanation').textContent}</p></section>
 <small>Estimación orientativa. No reemplaza una tasación bancaria, peritaje ni estudio de títulos.</small>
 </article>`;
}
function renderPhotos(){
 const grid=$('#photoGrid');grid.innerHTML='';
 photos.forEach((p,i)=>{const el=document.createElement('div');el.className='photo-item';el.innerHTML=`<img src="${p.url}" alt="Fotografía ${i+1}"><button type="button" aria-label="Eliminar">×</button>`;el.querySelector('button').onclick=()=>{URL.revokeObjectURL(p.url);photos.splice(i,1);renderPhotos()};grid.appendChild(el)});
}
function suggestDescription({silent=false}={}){
 const d=data(),t=d.terreno||{},c=d.casa||null;
 const typeLabel=d.tipo==='campo'?'Campo':d.tipo==='casa'?'Casa con terreno':'Parcela';
 const place=d.localidad||d.comuna||'sector por confirmar';
 const titleBits=[typeLabel];
 if(d.superficie)titleBits.push(`de ${Number(d.superficie).toLocaleString('es-CL')} m²`);
 if(d.comuna)titleBits.push(`en ${d.comuna}`);
 const strong=[];
 if(t.agua)strong.push(t.agua);
 if(t.luz)strong.push(t.luz);
 if(t.rol)strong.push(t.rol);
 if(t.vistaPrincipal)strong.push(t.vistaPrincipal);
 if(t.vegetacion)strong.push(t.vegetacion);
 if(d.servicios.naturaleza&&!t.vegetacion)strong.push('entorno natural');
 const titleSuffix=strong.find(x=>!/factibilidad|sin /i.test(x));
 const title=(titleBits.join(' ')+(titleSuffix?` · ${titleSuffix}`:'')).slice(0,85);
 const sentences=[];
 sentences.push(`${typeLabel} ubicada en ${place}${d.comuna&&place!==d.comuna?`, comuna de ${d.comuna}`:''}${d.region?`, ${d.region}`:''}, con ${Number(d.superficie||0).toLocaleString('es-CL')} m² de superficie.`);
 const terrain=[];
 if(d.suelo)terrain.push(`suelo ${d.suelo.toLowerCase()}`);
 if(t.topografia)terrain.push(`topografía ${t.topografia.toLowerCase()}`);
 if(t.orientacion)terrain.push(`exposición ${t.orientacion.toLowerCase()}`);
 if(t.vistaPrincipal)terrain.push(`vista ${t.vistaPrincipal.toLowerCase()}`);
 if(t.privacidad)terrain.push(t.privacidad.toLowerCase());
 if(terrain.length)sentences.push(`El terreno presenta ${terrain.join(', ')}.`);
 const services=[];
 if(t.agua)services.push(`agua: ${t.agua}`); else if(d.servicios.agua)services.push('agua disponible');
 if(t.luz)services.push(`electricidad: ${t.luz}`); else if(d.servicios.luz)services.push('electricidad disponible');
 if(t.rol)services.push(t.rol); else if(d.servicios.rol)services.push('rol propio informado');
 if(t.acceso||d.acceso)services.push(`acceso ${String(t.acceso||d.acceso).toLowerCase()}`);
 if(services.length)sentences.push(`En servicios y documentación declara ${services.join(', ')}.`);
 const location=[];
 if(d.distanciaCiudad)location.push(`${d.distanciaCiudad} km de la ciudad principal`);
 if(t.distanciaRutaPrincipalKm)location.push(`${t.distanciaRutaPrincipalKm} km de la ruta principal`);
 if(location.length)sentences.push(`Ubicación referencial: ${location.join(' y ')}.`);
 if(t.vegetacion)sentences.push(`Vegetación predominante: ${t.vegetacion.toLowerCase()}.`);
 if(c){
  const house=[];
  if(c.superficie)house.push(`${c.superficie} m² construidos`);
  if(c.habitaciones)house.push(`${c.habitaciones} dormitorios`);
  if(c.banos)house.push(`${c.banos} baños`);
  if(c.material)house.push(`construcción ${c.material.toLowerCase()}`);
  if(c.estado)house.push(`estado ${c.estado.toLowerCase()}`);
  if(house.length)sentences.push(`La vivienda cuenta con ${house.join(', ')}.`);
 }
 const needs=d.diagnostico?.necesidades?.map(x=>x.tipo.replaceAll('_',' '))||[];
 if(needs.length)sentences.push(`Mejoras declaradas por evaluar: ${needs.join(', ')}.`);
 const negotiable=d.diagnostico?.mejorasNegociables?.filter(x=>!['ninguna','caso_a_caso'].includes(x)).map(x=>x.replaceAll('_',' '))||[];
 if(negotiable.length)sentences.push(`Si se acuerda el precio, el propietario está dispuesto a evaluar mejoras como ${negotiable.join(', ')}.`);
 const titleEl=$('#titulo'),descEl=$('#descripcion');
 if(titleEl)titleEl.value=title;
 if(descEl){descEl.value=sentences.join(' ');descEl.dispatchEvent(new Event('input'))}
 if(!silent)saveDraft();
}
function renderReview(){
 const d=data(),t=d.terreno||{},c=d.casa||null,e=d.estrategia||{};
 const serviceSummary=[t.agua,t.luz,t.rol,t.acceso].filter(Boolean).join(' · ')||Object.entries(d.servicios).filter(([,v])=>v).map(([k])=>k).join(', ')||'Por confirmar';
 $('#reviewCard').innerHTML=`
 <section class="review-section"><h3>Propiedad</h3><div class="review-row"><span>Tipo</span><strong>${d.tipo}</strong></div><div class="review-row"><span>Ubicación</span><strong>${d.comuna||'—'}, ${d.region||'—'}</strong></div><div class="review-row"><span>Superficie</span><strong>${d.superficie.toLocaleString('es-CL')} m²</strong></div><div class="review-row"><span>Topografía</span><strong>${t.topografia||d.suelo||'—'}</strong></div><div class="review-row"><span>Servicios</span><strong>${serviceSummary}</strong></div><div class="review-row"><span>Precio</span><strong>${money(d.precio)}</strong></div></section>
 ${c?`<section class="review-section"><h3>Casa</h3><div class="review-row"><span>Construcción</span><strong>${c.superficie||'—'} m² · ${c.material||'material por confirmar'}</strong></div><div class="review-row"><span>Programa</span><strong>${c.habitaciones||'—'} dorm. · ${c.banos||'—'} baños</strong></div><div class="review-row"><span>Estado</span><strong>${c.estado||'—'} · ${c.regularizacion||'regularización por confirmar'}</strong></div></section>`:''}
 <section class="review-section"><h3>Estrategia comercial</h3><div class="review-row"><span>Urgencia</span><strong>${e.urgencia||'No indicada'}</strong></div><div class="review-row"><span>Plazo</span><strong>${e.plazoVenta||'No indicado'}</strong></div><div class="review-row"><span>Negociación</span><strong>${e.negociacionPrecio||'No indicada'}</strong></div><div class="review-row"><span>Visitas</span><strong>${e.disponibilidadVisitas||'No indicada'}</strong></div></section>
 <section class="review-section"><h3>Diagnóstico y acuerdos</h3><div class="review-row"><span>Mejoras necesarias</span><strong>${d.diagnostico.necesidades.map(x=>x.tipo.replaceAll('_',' ')).join(', ')||'Ninguna'}</strong></div><div class="review-row"><span>Mejoras negociables</span><strong>${d.diagnostico.mejorasNegociables.join(', ')||'Caso a caso'}</strong></div></section>
 <section class="review-section"><h3>Tasación y medios</h3><div class="review-row"><span>Valor recomendado</span><strong>${valuation?money(valuation.market):'No calculada'}</strong></div><div class="review-row"><span>Fotografías</span><strong>${photos.length}</strong></div><div class="review-row"><span>Video</span><strong>${d.videoUrl?'Sí':'No'}</strong></div></section>
 <section class="review-section"><h3>Responsable</h3><div class="review-row"><span>Nombre</span><strong>${d.contacto.nombre||'—'}</strong></div><div class="review-row"><span>Correo</span><strong>${d.contacto.email||'—'}</strong></div></section>`;
}
async function submit(e){
 e.preventDefault();if(!validateStep(5))return showStep(5);
 const d={...data(),status:'pendiente_revision',createdAt:new Date().toISOString(),welcomeStatus:'pendiente',businessAccess:'pendiente'};
 const btn=$('#submitBtn'),status=$('#submitStatus');if(btn){btn.disabled=true;btn.textContent='Enviando…'}if(status)status.textContent='Registrando propietario, parcela, diagnóstico y necesidades…';
 try{
  const result=await window.TPLDataService.publishProperty(d);
  localStorage.removeItem(KEY);
  if(status)status.textContent=result.source==='supabase'?`Publicación ${result.codigo} enviada. TPL preparará la bienvenida y acceso a TPL Business.`:'Publicación guardada en respaldo local. Se sincronizará cuando Supabase esté disponible.';
  if(btn)btn.textContent='Enviada correctamente ✓';
 }catch(error){
  console.error(error);if(status)status.textContent=error.message||'No fue posible enviar la publicación.';if(btn){btn.disabled=false;btn.textContent='Reintentar envío';}
 }
}

const nextBtn=$('#nextBtn');if(nextBtn)nextBtn.onclick=()=>{if(validateStep(current))showStep(current+1)};
const prevBtn=$('#prevBtn');if(prevBtn)prevBtn.onclick=()=>showStep(current-1);
$$('.step-link').forEach(btn=>btn.onclick=()=>{const n=Number(btn.dataset.step);if(n<=current||validateStep(current))showStep(n)});
const saveDraftTop=$('#saveDraftTop');if(saveDraftTop)saveDraftTop.onclick=()=>saveDraft(true);
['#precio'].forEach(s=>on(s,'blur',e=>formatInput(e.target)));
const calculateBtn=$('#calculateBtn');if(calculateBtn)calculateBtn.onclick=calculate;

document.querySelectorAll('[data-valuation-choice]').forEach(btn=>btn.onclick=()=>setPopupChoice(btn.dataset.valuationChoice));
const closeValuationResult=$('#closeValuationResult');if(closeValuationResult)closeValuationResult.onclick=()=>$('#valuationResultDialog')?.close();
const closeValuationResultBottom=$('#closeValuationResultBottom');if(closeValuationResultBottom)closeValuationResultBottom.onclick=()=>$('#valuationResultDialog')?.close();
const useValuationBtn=$('#useValuationBtn');if(useValuationBtn)useValuationBtn.onclick=applyPopupValuation;
const popupPremiumBtn=$('#popupPremiumBtn');if(popupPremiumBtn)popupPremiumBtn.onclick=()=>{const resultDialog=$('#valuationResultDialog');if(resultDialog?.open)resultDialog.close();const content=$('#reportContent'),dialog=$('#reportDialog');if(content&&dialog){content.innerHTML=reportHTML();dialog.showModal();loadNearbyServices()}};

const openReportBtn=$('#openReportBtn');if(openReportBtn)openReportBtn.onclick=()=>{const content=$('#reportContent');const dialog=$('#reportDialog');if(content&&dialog){content.innerHTML=reportHTML();dialog.showModal();loadNearbyServices()}};
const closeReport=$('#closeReport');if(closeReport)closeReport.onclick=()=>$('#reportDialog')?.close();
const printReport=$('#printReport');if(printReport)printReport.onclick=()=>window.print();
const photosInput=$('#photos');if(photosInput)photosInput.onchange=e=>{photos.push(...[...e.target.files].map(file=>({name:file.name,url:URL.createObjectURL(file)})));renderPhotos();saveDraft()};
const descripcion=$('#descripcion');if(descripcion)descripcion.oninput=e=>{const count=$('#descCount');if(count)count.textContent=e.target.value.length};
const suggestBtn=$('#suggestDescription');if(suggestBtn)suggestBtn.onclick=suggestDescription;
const geoBtn=$('#geoBtn');if(geoBtn)geoBtn.onclick=()=>requestBrowserLocation();
initMapPicker();
const buyReportBtn=$('#buyProfessionalReportBtn');if(buyReportBtn)buyReportBtn.onclick=()=>{const d=data();const intent={createdAt:new Date().toISOString(),property:d,valuation,amount:1990,status:'intencion_compra'};try{localStorage.setItem('tpl_report_purchase_intent_v1',JSON.stringify(intent))}catch{};if(window.TPLDataService?.trackEvent)window.TPLDataService.trackEvent('informe_tasacion_solicitado',intent).catch?.(()=>{});alert('Tu solicitud de informe quedó registrada. El pago de $1.990 se habilitará en el siguiente paso de integración de pagos.');};
const form=$('#publisherForm');if(form){form.addEventListener('input',()=>{clearTimeout(window.__tplDraftTimer);window.__tplDraftTimer=setTimeout(saveDraft,450)});form.onsubmit=submit;}
$$('input[name="tipo"]').forEach(el=>el.addEventListener('change',toggleHouseFields));
['#aguaDetalle','#luzDetalle','#rolDetalle','#cierreDetalle','#portonDetalle'].forEach(sel=>on(sel,'change',syncQuickServices));
(async()=>{await initTerritory();fill(readJSON(KEY,null));toggleHouseFields();showStep(0)})();
})();
