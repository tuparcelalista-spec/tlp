
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const on=(selector,event,handler)=>{const el=typeof selector==='string'?$(selector):selector;if(el)el.addEventListener(event,handler);return el};
const KEY='tpl_frontend_v2_publicador_draft_v1';
const REPORTS_KEY='tpl_frontend_v2_tasaciones_v1';
const SUBMISSIONS_KEY='tpl_frontend_v2_publicaciones_v1';
const REMOTE_DRAFT_TOKEN_KEY='tpl_publicador_remote_draft_token_v1';
let remoteDraftToken=new URLSearchParams(location.search).get('draft')||localStorage.getItem(REMOTE_DRAFT_TOKEN_KEY)||'';
let remoteDraftSaving=false;
let remoteDraftLastSaved='';
const stepNames=['Propiedad','Características','Precio y tasación','Fotografías','Descripción','Contacto','Revisión'];
let current=0;
let photos=[];
let valuation=null;
let coords=null;

let regionsMap={};
let territoryCatalog=null;
let tasadorContext=null;

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
 const selectedType=radioValue('tipo');
 const isHouse=selectedType==='parcela_casa'||selectedType==='casa';
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
 const accepts=radioValue('aceptaEvaluarMejoras');
 const canEvaluate=accepts==='si';
 return {
  estados:{},
  necesidades:needed.filter(x=>x!=='ninguna').map(tipo=>({tipo,descripcion:`Mejora declarada: ${tipo.replaceAll('_',' ')}`,negociable:canEvaluate,datos:{origen:'declarado_por_publicador'}})),
  aceptaEvaluarMejoras:accepts||null,
  mejorasNegociables:canEvaluate?needed.filter(x=>x!=='ninguna'):[],
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
  distanciaComuna:valueOf('#distanciaComuna')===''?null:numberOf('#distanciaComuna'),
  terreno:{
   rol:valueOf('#rolDetalle'),condominio:valueOf('#condominio'),subdivision:valueOf('#subdivision'),
   usoSuelo:valueOf('#usoSuelo'),topografia:valueOf('#topografia'),
   vegetacion:valueOf('#vegetacion'),vistaPrincipal:valueOf('#vistaPrincipal'),agua:valueOf('#aguaDetalle'),
   luz:valueOf('#luzDetalle'),distanciaPosteM:valueOf('#distanciaPosteM')===''?null:numberOf('#distanciaPosteM'),turismo:valueOf('#turismoDetalle'),acceso:valueOf('#accesoDetalle'),distanciaRutaPrincipalKm:numberOf('#distanciaRutaPrincipalKm'),
   cierre:valueOf('#cierreDetalle'),porton:valueOf('#portonDetalle'),rioDirecto:checked('#rioDirecto'),vertienteNatural:checked('#vertienteNatural'),orillaLago:checked('#orillaLago'),termasNaturales:checked('#termasNaturales')
  },
  casa:['parcela_casa','casa'].includes(radioValue('tipo'))?{
   superficie:numberOf('#casaSuperficie'),habitaciones:valueOf('#habitaciones'),banos:valueOf('#banos'),
   pisos:valueOf('#pisos'),material:valueOf('#material'),estado:valueOf('#estadoCasa'),regularizacion:valueOf('#regularizacion'),
   anio:valueOf('#anioCasa'),calidad:valueOf('#calidadCasa'),remodelacion:valueOf('#remodelacionCasa'),
   anioRemodelacion:valueOf('#anioRemodelacionCasa'),
   aislacion:valueOf('#aislacionCasa'),ventanas:valueOf('#ventanasCasa'),
   sanitario:valueOf('#sanitarioCasa'),calefaccion:valueOf('#calefaccion'),estacionamientos:valueOf('#estacionamientos')
  }:null,
  servicios:{
   agua:Boolean(valueOf('#aguaDetalle'))&&!/sin factibilidad|sin agua|no lo sé/i.test(valueOf('#aguaDetalle')),
   luz:Boolean(valueOf('#luzDetalle'))&&!/sin electricidad|no lo sé/i.test(valueOf('#luzDetalle')),
   rol:/rol propio/i.test(valueOf('#rolDetalle')),
   cerco:Boolean(valueOf('#cierreDetalle'))&&!/sin cierre/i.test(valueOf('#cierreDetalle')),
   porton:Boolean(valueOf('#portonDetalle'))&&!/sin portón/i.test(valueOf('#portonDetalle')),
   naturaleza:/bosque nativo|bosque mixto|pradera|frutales/i.test(valueOf('#vegetacion'))||checked('#rioDirecto')||checked('#vertienteNatural')||checked('#orillaLago')||checked('#termasNaturales')
  },
  precio:parseMoney($('#precio')?.value),
  estrategia:{urgencia:radioValue('urgencia'),plazoVenta:valueOf('#plazoVenta'),tiempoEnVenta:valueOf('#tiempoEnVenta'),negociacionPrecio:valueOf('#negociacionPrecio'),disponibilidadVisitas:valueOf('#disponibilidadVisitas')},
  videoUrl:valueOf('#videoUrl'),
  titulo:valueOf('#titulo'),descripcion:valueOf('#descripcion'),
  diagnostico:diagnosis(),
  contacto:{tipoActor:'persona',responsable:radioValue('responsable')||'propietario',nombre:valueOf('#nombre'),telefono:valueOf('#telefono'),email:valueOf('#email'),rut:valueOf('#rut')},
  valuation,photoNames:photos.map(p=>p.name),updatedAt:new Date().toISOString()
 };
}

function diagnosticPrecision(){
 const d=data(); let points=0,total=15;
 if(d.tipo)points++;
 if(d.region)points++;
 if(d.comuna)points++;
 if(Number(d.superficie)>0)points++;
 if(d.terreno?.rol)points++;
 if(d.terreno?.agua)points++;
 if(d.terreno?.luz)points++;
 if(d.terreno?.acceso)points++;
 if(d.terreno?.topografia)points++;
 if(d.coords||d.distanciaComuna!==null)points++;
 if(Number(d.precio)>0)points++;
 if(d.estrategia?.urgencia)points++;
 if(d.titulo)points++;
 if((d.descripcion||'').trim().length>=120)points++;
 if(d.contacto?.email&&d.contacto?.telefono)points++;
 if(d.casa){total++;if(Number(d.casa.superficie)>0)points++;}
 return Math.max(8,Math.min(100,Math.round(points/total*100)));
}
function updateDiagnosticMotivation(){
 const precision=diagnosticPrecision();
 const number=$('#diagnosticPrecision'),text=$('#diagnosticMotivationText');
 if(number)number.textContent=`${precision}%`;
 if(!text)return;
 if(precision<35)text.textContent='Completa ubicación, superficie y servicios para habilitar una primera comparación de valor.';
 else if(precision<60)text.textContent='Vas bien. Con acceso, agua, electricidad y topografía mejorará mucho la estimación.';
 else if(precision<80)text.textContent='Ya tenemos información suficiente para una tasación preliminar. Sigue para aumentar su precisión.';
 else if(precision<95)text.textContent='Excelente. Ya podemos comparar tu expectativa de precio con una referencia TPL bien fundamentada.';
 else text.textContent='Diagnóstico muy completo. Tu ficha está bien preparada para tasar, publicar y alimentar el CRM.';
}

function fill(d){
 if(!d)return;
 const set=(sel,val)=>{const el=$(sel);if(el&&val!==undefined&&val!==null)el.value=val};
 const check=(sel,val)=>{const el=$(sel);if(el)el.checked=!!val};
 const radio=(name,val)=>{const el=$(`input[name="${name}"][value="${val}"]`);if(el)el.checked=true};
 radio('tipo',d.tipo);
 set('#region',d.region);populateCommunes(d.region,d.comuna);set('#comuna',d.comuna);set('#localidad',d.localidad);set('#ubicacionTexto',d.ubicacionTexto);
 set('#googleMapsLink',d.googleMapsLink);check('#publicApproximate',d.publicApproximate!==false);
 set('#superficie',d.superficie);set('#suelo',d.suelo);set('#distanciaComuna',d.distanciaComuna);
 Object.entries(d.servicios||{}).forEach(([k,v])=>check('#'+k,v));
 const t=d.terreno||{};
 [['#rolDetalle',t.rol],['#condominio',t.condominio],['#subdivision',t.subdivision],['#usoSuelo',t.usoSuelo],['#topografia',t.topografia],['#vegetacion',t.vegetacion],['#vistaPrincipal',t.vistaPrincipal],['#aguaDetalle',t.agua],['#luzDetalle',t.luz],['#distanciaPosteM',t.distanciaPosteM],['#turismoDetalle',t.turismo],['#accesoDetalle',t.acceso],['#distanciaRutaPrincipalKm',t.distanciaRutaPrincipalKm],['#cierreDetalle',t.cierre],['#portonDetalle',t.porton]].forEach(([s,v])=>set(s,v));
 check('#rioDirecto',t.rioDirecto);check('#vertienteNatural',t.vertienteNatural);check('#orillaLago',t.orillaLago);check('#termasNaturales',t.termasNaturales);
 const c=d.casa||{};
 [['#casaSuperficie',c.superficie],['#habitaciones',c.habitaciones],['#banos',c.banos],['#pisos',c.pisos],['#material',c.material],['#estadoCasa',c.estado],['#regularizacion',c.regularizacion],['#anioCasa',c.anio],['#calidadCasa',c.calidad],['#remodelacionCasa',c.remodelacion],['#anioRemodelacionCasa',c.anioRemodelacion],['#aislacionCasa',c.aislacion],['#ventanasCasa',c.ventanas],['#sanitarioCasa',c.sanitario],['#calefaccion',c.calefaccion],['#estacionamientos',c.estacionamientos]].forEach(([s,v])=>set(s,v));
 set('#precio',d.precio?String(d.precio).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'');
 const e=d.estrategia||{};radio('urgencia',e.urgencia);set('#plazoVenta',e.plazoVenta);set('#tiempoEnVenta',e.tiempoEnVenta);set('#negociacionPrecio',e.negociacionPrecio);set('#disponibilidadVisitas',e.disponibilidadVisitas);
 set('#videoUrl',d.videoUrl);set('#titulo',d.titulo);set('#descripcion',d.descripcion);radio('responsable',d.contacto?.responsable);
 set('#nombre',d.contacto?.nombre);set('#telefono',d.contacto?.telefono);set('#email',d.contacto?.email);set('#rut',d.contacto?.rut);
 const diag=d.diagnostico||{};
 (diag.necesidades||[]).forEach(n=>{const el=$(`input[name="necesidad"][value="${n.tipo}"]`);if(el)el.checked=true});
 if(diag.aceptaEvaluarMejoras)radio('aceptaEvaluarMejoras',diag.aceptaEvaluarMejoras);
 else if(Array.isArray(diag.mejorasNegociables)&&diag.mejorasNegociables.length)radio('aceptaEvaluarMejoras','si');
 coords=d.coords||null;
 // Una tasación guardada en el borrador NO se presenta al abrir la página.
 // El panel parte siempre en $0 y sólo muestra valores calculados en esta sesión.
 valuation=null;
 resetValuationDisplay();
 toggleHouseFields();
 updateDiagnosticMotivation();
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
   mapClickCount=Math.min(mapClickCount+1,6);
   const zoomSteps=[6,8,10,12,14,16];
   parcelMap.flyTo([c.lat,c.lng],zoomSteps[mapClickCount-1],{animate:true,duration:.85});
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
function localDraftPayload(){
 const payload=data();
 payload.photoNames=photos.map(p=>p.name);
 delete payload.valuation;
 return payload;
}
function validDraftEmail(){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueOf('#email'))}
function recoveryUrl(token){const url=new URL(location.href);url.searchParams.set('draft',token);url.hash='';return url.toString()}
async function saveRemoteDraft({show=false}={}){
 if(remoteDraftSaving||!validDraftEmail()||!window.TPLDataService?.savePublisherDraft)return null;
 const snapshot=JSON.stringify(localDraftPayload());
 if(!show&&snapshot===remoteDraftLastSaved)return null;
 remoteDraftSaving=true;
 try{
  const result=await window.TPLDataService.savePublisherDraft(localDraftPayload(),remoteDraftToken||null);
  remoteDraftToken=result.token||remoteDraftToken;
  remoteDraftLastSaved=snapshot;
  if(remoteDraftToken){
   localStorage.setItem(REMOTE_DRAFT_TOKEN_KEY,remoteDraftToken);
   const url=new URL(location.href);url.searchParams.set('draft',remoteDraftToken);history.replaceState(null,'',url);
  }
  const status=$('#draftStatus');if(status)status.textContent=`Guardado en TPL ${new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}`;
  return result;
 }catch(error){console.warn('Borrador remoto pendiente:',error);return null}
 finally{remoteDraftSaving=false}
}
async function saveDraft(show=false){
 writeJSON(KEY,localDraftPayload());
 const status=$('#draftStatus');if(status)status.textContent=`Guardado ${new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}`;
 const remote=await saveRemoteDraft({show});
 if(show){
  if(remote?.token){
   const link=recoveryUrl(remote.token);
   try{await navigator.clipboard.writeText(link)}catch{}
   if(status)status.textContent='Borrador guardado en TPL · enlace copiado';
   alert('Borrador guardado. Copiamos un enlace privado para continuar desde otro dispositivo.');
  }else if(validDraftEmail()){
   if(status)status.textContent='Borrador local guardado · sincronización pendiente';
  }else{
   if(status)status.textContent='Borrador local guardado · agrega tu correo para recuperarlo en otro dispositivo';
  }
 }
 return remote;
}
async function restoreRemoteDraft(){
 if(!remoteDraftToken||!window.TPLDataService?.loadPublisherDraft)return null;
 try{
  const result=await window.TPLDataService.loadPublisherDraft(remoteDraftToken);
  if(result?.payload){writeJSON(KEY,result.payload);return result.payload}
 }catch(error){console.warn('No fue posible recuperar el borrador remoto.',error)}
 return null;
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
 if(step===1&&!selectedValues('necesidad').length){alert('Selecciona al menos una mejora necesaria.');return false;}
 return true;
}
function showStep(next){
 current=Math.max(0,Math.min(6,next));
 $$('.wizard-step').forEach((el,i)=>el.classList.toggle('is-active',i===current));
 $$('.step-link').forEach((el,i)=>{el.classList.toggle('is-active',i===current);el.classList.toggle('is-done',i<current)});
 const precision=diagnosticPrecision();
 const journeyLabels=['Conociendo tu propiedad','Mejorando la precisión','Listo para comparar valor','Preparando evidencia','Fortaleciendo el anuncio','Vinculando responsable','Activando el ecosistema'];
 $('#progressText').textContent=journeyLabels[current];
 $('#mobileStepLabel').textContent=`Precisión estimada ${precision}%`;
 $('#mobileStepName').textContent=stepNames[current];
 updateDiagnosticMotivation();
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
  city=cat?.getMajorCityForCommune?.(property.comuna,property.region)||cat?.getCityForCommune?.(property.comuna,property.region)||null;
  if(selectedCoords&&cat?.resolveTerritorialCascade) cascade=cat.resolveTerritorialCascade(property.comuna,property.region,selectedCoords.lat,selectedCoords.lng,0);
 }catch(error){console.warn('No fue posible resolver contexto territorial.',error)}
 let majorCityDistanceKm=null;
 let communeDistanceKm=property.distanciaComuna===null||property.distanciaComuna===undefined?null:Number(property.distanciaComuna);
 const communeCenter=(Number.isFinite(Number(commune?.lat))&&Number.isFinite(Number(commune?.lng)))?{lat:Number(commune.lat),lng:Number(commune.lng)}:(commune?.centroid||null);
 if(selectedCoords){
  if(city?.centroid) majorCityDistanceKm=haversineKm(selectedCoords,city.centroid);
  if(communeCenter) communeDistanceKm=haversineKm(selectedCoords,communeCenter);
 }else if(communeCenter&&city?.centroid){
  // Fallback no bloqueante: distancia estructural entre el centro comunal y la ciudad principal.
  // Cuando el usuario marca coordenadas, se reemplaza por la distancia real de la propiedad.
  majorCityDistanceKm=haversineKm(communeCenter,city.centroid);
 }
 const cityCategory=String(city?.category||'').toLowerCase();
 const autoTourism=commune?.tour ? (/destino tur[ií]stico|internacional|lacustre|tur/i.test(cityCategory)?'nacional':'local') : '';
 const tourismChoice=property.terreno?.turismo;
 const tourism=tourismChoice==='auto'||tourismChoice===undefined||tourismChoice===null?autoTourism:(tourismChoice||'');
 return {commune,city,cascade,distanceKm:majorCityDistanceKm,majorCityDistanceKm,communeDistanceKm,tourism};
}

function resetValuationDisplay(){
 const main=$('#valuationMain');if(main){main.textContent='Valor TPL Recomendado: $0';main.removeAttribute('title');}
 ['#quickValue','#marketValue','#patientValue'].forEach(sel=>{const el=$(sel);if(el)el.textContent='$0'});
 const exp=$('#valuationExplanation');if(exp)exp.textContent='Consideraremos superficie, ubicación, distancia y características declaradas.';
 const immediate=$('#immediateSaleBtn');if(immediate)immediate.hidden=true;
 const report=$('#openReportBtn');if(report)report.disabled=true;
 const virtues=$('#valuationVirtues');if(virtues)virtues.hidden=true;
 const offer=$('#professionalReportOffer');if(offer)offer.hidden=true;
}
function withTimeout(promise,ms,fallback){
 return Promise.race([Promise.resolve(promise),new Promise(resolve=>setTimeout(()=>resolve(fallback),ms))]);
}
function clearValuationError(){
 const panel=$('#valuationErrorPanel'),normal=$('#valuationNormalContent');
 if(panel)panel.hidden=true;if(normal)normal.hidden=false;
}

let valuationPopupChoice='tpl';
let valuationPopupTimer=null;

function prevalidateValuation(){
 const property=data();
 const missing=[];
 if(!Number(property.superficie||0))missing.push({message:'Ingresa la superficie del terreno.',el:$('#superficie')});
 if(!property.region)missing.push({message:'Selecciona la región de la propiedad.',el:$('#region')});
 if(!property.comuna)missing.push({message:'Selecciona la comuna de la propiedad.',el:$('#comuna')});
 const hasCoords=property.coords&&Number.isFinite(Number(property.coords.lat))&&Number.isFinite(Number(property.coords.lng));
 if(!hasCoords&&property.distanciaComuna===null)missing.push({message:'Ingresa la distancia al centro de la comuna o marca la ubicación en el mapa.',el:$('#distanciaComuna')});
 const urgency=property.estrategia?.urgencia||radioValue('urgencia');
 if(!urgency)missing.push({message:'Selecciona tu nivel de apuro antes de calcular.',el:document.querySelector('input[name="urgencia"]')});
 return missing;
}
function openValuationThinking(){
 const dialog=$('#valuationResultDialog'),thinking=$('#valuationThinking'),content=$('#valuationResultContent');
 if(!dialog)return;
 clearValuationError();
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
function showValuationPopupError(message,error=null){
 clearInterval(window.__tplThinkingInterval);
 const dialog=$('#valuationResultDialog'),thinking=$('#valuationThinking'),content=$('#valuationResultContent');
 const panel=$('#valuationErrorPanel'),normal=$('#valuationNormalContent'),text=$('#valuationErrorText');
 if(thinking)thinking.hidden=true;
 if(content)content.hidden=false;
 if(normal)normal.hidden=true;
 if(panel)panel.hidden=false;
 if(text)text.textContent=message||'Ocurrió un problema al analizar la propiedad. Revisa los datos e inténtalo nuevamente.';
 if(error)console.error('Tasador TPL · detalle técnico:',error);
 if(dialog&&!dialog.open)dialog.showModal();
}
function setPopupChoice(choice){
 if(!valuation)return;
 const technical=Number(valuation.patient||valuation.technical||0);
 const market=Number(valuation.marketReference?.medianValue||0);
 const recommended=Number(valuation.market||0);
 const map={tpl:technical,market,blend:recommended};
 if(choice==='market'&&!market)choice='blend';
 valuationPopupChoice=choice;
 document.querySelectorAll('[data-valuation-choice]').forEach(el=>el.classList.toggle('is-selected',el.dataset.valuationChoice===choice));
 const selected=map[choice]||recommended||technical;
 const value=$('#popupSelectedValue');if(value)value.textContent=money(selected);
 const explanation=$('#popupSelectedExplanation');
 if(explanation){
  explanation.textContent=choice==='tpl'?'Valor técnico potencial según superficie, territorio y atributos declarados.':choice==='market'?'Referencia comunal observada para parcelas del mismo rango de superficie.':'Valor TPL Recomendado: combina el motor técnico con el mercado comunal y prioriza un horizonte estimado de 3 a 6 meses.';
 }
 valuation.selectedMethod=choice;valuation.selectedValue=selected;
}
function populateValuationPopup(){
 const dialog=$('#valuationResultDialog'),thinking=$('#valuationThinking'),content=$('#valuationResultContent');
 if(!dialog||!valuation)return;clearInterval(window.__tplThinkingInterval);if(thinking)thinking.hidden=true;if(content)content.hidden=false;
 const technical=Number(valuation.patient||valuation.technical||0),market=Number(valuation.marketReference?.medianValue||0),recommended=Number(valuation.market||0);
 if($('#popupTplValue'))$('#popupTplValue').textContent=money(technical);
 if($('#popupMarketValue'))$('#popupMarketValue').textContent=market?money(market):'Sin referencia suficiente';
 if($('#popupBlendValue'))$('#popupBlendValue').textContent=money(recommended||technical);
 const meta=$('#popupMarketMeta');if(meta)meta.textContent=valuation.marketReference?`Referencia comunal · ${valuation.marketReference.sampleSize} comparables · confianza ${String(valuation.marketReference.confidence||'referencial').replace('-',' ')}`:'Aún no contamos con una muestra comunal suficiente del mismo rango de superficie.';
 const marketBtn=document.querySelector('[data-valuation-choice="market"]');if(marketBtn)marketBtn.disabled=!market;
 setPopupChoice('blend');
}
function applyPopupValuation(){
 if(!valuation)return;
 const selected=Number(valuation.selectedValue||valuation.market||valuation.technical||0);
 if(!selected)return;
 valuation.market=Math.round(selected/10000)*10000;
 valuation.quick=Math.round((selected*.93)/10000)*10000;
 if(valuation.selectedMethod==='tpl') valuation.patient=valuation.market;
 else valuation.patient=Math.max(Number(valuation.patient||0),valuation.market);
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
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||!lat||!lng){holder.innerHTML='<p>No hay coordenadas confirmadas para calcular cercanías.</p>';return}
 holder.innerHTML='<p>Calculando servicios y puntos útiles cercanos…</p>';
 try{
  const context=valuation?.nearbyContext||await window.TPLLandEngine?.fetchNearbyContext?.(lat,lng);
  if(!context){holder.innerHTML='<p>No encontramos suficientes datos de cercanía en este momento.</p>';return}
  if(valuation&&!valuation.nearbyContext)valuation.nearbyContext=context;
  const groups=[
   ['Servicios de salud','healthServices'],
   ['Seguridad','security'],
   ['Comercio','commerce'],
   ['Educación','education'],
   ['Servicios generales','generalServices'],
   ['Gastronomía','gastronomy'],
   ['Atractivos naturales / turísticos','attractions']
  ];
  const rows=groups.map(([label,key])=>{
   const summary=context[key],near=summary?.nearest;
   if(!near)return '';
   return `<div class="tpl-nearby-item"><strong>${label}</strong><span>${near.name||label} · ${Number(near.distanceKm).toFixed(1).replace('.',',')} km aprox.${summary.within10?` · ${summary.within10} dentro de 10 km`:''}</span></div>`;
  }).filter(Boolean).join('');
  holder.innerHTML=rows?`<div class="tpl-nearby-grid">${rows}</div>`:'<p>No encontramos suficientes servicios cercanos en este momento.</p>';
 }catch(error){
  console.warn('Cercanías TPL no disponibles.',error);
  holder.innerHTML='<p>Las cercanías no pudieron calcularse en este momento. El informe conserva el resto de la información.</p>';
 }
}

async function performCalculate(){
 const explanation=$('#valuationExplanation');
 const button=$('#calculateBtn');
 try{
  const property=data();
  const area=Number(property.superficie||0);
  const territory=territorialContext(property);
  const distance=Number(territory.majorCityDistanceKm||territory.distanceKm||0);
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
  tasadorContext=await withTimeout(window.TPLTasadorSupabase?.loadContext?.(),3500,null)||tasadorContext||{uf:null,references:[]};
  const landInput={
   area,distanceKm:distance,majorCityDistanceKm:territory.majorCityDistanceKm,communeDistanceKm:territory.communeDistanceKm,
   rol:property.terreno?.rol||(features.role?'Rol propio':'Por confirmar'),
   electricity:property.terreno?.luz||(features.electricity?'Empalme instalado':'Por confirmar'),electricityPoleDistanceM:Number(property.terreno?.distanciaPosteM||0),
   water:property.terreno?.agua||(features.water?'Agua disponible':'Por confirmar'),
   access:property.terreno?.acceso||property.acceso,
   topography:property.terreno?.topografia||property.suelo||'Por confirmar',
   soil:property.suelo||'',
   exposure:property.terreno?.orientacion||'',
   view:property.terreno?.vistaPrincipal||'',
   vegetation:property.terreno?.vegetacion||'',
   fencing:property.terreno?.cierre||(features.fence?'Completamente cercada':''),
   gate:property.terreno?.porton||(features.gate?'Portón instalado':''),
   condominium:property.terreno?.condominio||'',
   nature:[features.nature?'Bosque nativo':'',property.terreno?.vegetacion||'',property.terreno?.vistaPrincipal||'',property.terreno?.rioDirecto?'Río dentro o acceso directo':'',property.terreno?.vertienteNatural?'Vertiente':'',property.terreno?.orillaLago?'Orilla lago':'',property.terreno?.termasNaturales?'Termas':''].filter(Boolean),
   routeDistanceKm:Number(property.terreno?.distanciaRutaPrincipalKm||0),
   asking:property.precio,
   tipo:['parcela_casa','casa'].includes(property.tipo)?'casa':'parcela',lat:Number(property.coords?.lat)||null,lng:Number(property.coords?.lng)||null,
   comuna:property.comuna,region:property.region,sector:property.localidad,
   tourism:territory.tourism,
   nearestCity:territory.city?{name:territory.city.name,category:territory.city.category,weight:Number(territory.city.weight||1)}:null,
   territorial:territory.cascade||null,
   communeProfile:territory.commune||null
  };
  // Las cercanías externas enriquecen el informe, pero nunca deben bloquear el valor principal.
  // Se consultan después, bajo demanda, desde el informe premium.
  landInput.nearbyContext=null;
  landInput.territorialIndex=window.TPLLandEngine?.calculateTerritorialIndex?.(
   landInput.nearbyContext||{},
   {majorCityDistanceKm:territory.majorCityDistanceKm,distanceKm:territory.majorCityDistanceKm,tourism:territory.tourism}
  )||null;
  landInput.propertyIndex=window.TPLLandEngine?.calculatePropertyIndex?.(landInput)||null;
  let result;
  if(['parcela_casa','casa'].includes(property.tipo) && window.TPLHouseEngine?.calculate){
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
  // Enriquecemos UF localmente para mostrar el resultado de inmediato. La persistencia nunca bloquea el cálculo.
  const enriched=window.TPLTasadorSupabase?.enrich?.(landInput,result,tasadorContext);
  result=enriched?.result||result;
  landInput.ufClpUsed=enriched?.input?.ufClpUsed||landInput.ufClpUsed||null;
  const technical=Number(result.recommended||result.ideal||result.market||result.technicalPotential||result.patient||result.baseValue||0);
  if(!technical||!Number.isFinite(technical)){if(explanation)explanation.textContent='No fue posible obtener una tasación con estos antecedentes. Revisa los datos e intenta nuevamente.';showValuationPopupError('Revisa los antecedentes ingresados e intenta nuevamente.');return}
  const recommended=Math.round(Number(result.ideal||technical)/10000)*10000;
  const agileValue=Math.round(Number(result.quick||recommended*.93)/10000)*10000;
  const potentialValue=Math.round(Number(result.patient||result.technicalPotential||technical)/10000)*10000;
  valuation={
   id:id(),createdAt:new Date().toISOString(),area,distance,technical:potentialValue,
   urgency,urgencyPct:0,quick:agileValue,market:recommended,patient:potentialValue,immediateReference:Number(result.immediateReference||0),asking:property.precio,
   comuna:property.comuna,tipo:property.tipo,features,territory:{nearestCity:territory.city?.name||'',distanceKm:distance,tourism:territory.tourism||'',marketZone:territory.city?.marketZone||''},breakdown:result.desglose||null,landResult:result.landResult||null,
   houseResult:result.vivienda||null,marketReference:result.marketReference||result.landResult?.marketReference||null,marketBlend:result.marketBlend||result.landResult?.marketBlend||null,
   distanceRule:result.cityDistance||result.landResult?.cityDistance||null,
   territorialIndex:result.territorialIndex||result.landResult?.territorialIndex||landInput.territorialIndex||null,
   propertyIndex:result.propertyIndex||result.landResult?.propertyIndex||landInput.propertyIndex||null,
   nearbyContext:result.nearbyContext||result.landResult?.nearbyContext||landInput.nearbyContext||null,
   priceAnalysis:result.priceAnalysis||result.landResult?.priceAnalysis||null,
   engineVersion:result.engineVersion||result.landResult?.engineVersion||'tpl-land-engine-v2.0-20260731',
   method:result.method||'tpl-land-engine-v2.0-20260731',source:'tpl_local',ufClpUsed:Number(result.ufClpUsed||0)||null,recommendedUf:Number(result.recommendedUf||0)||null,tasacionId:null,tasacionCodigo:null
  };
  renderValuation();saveReport();captureValuationLead(property,valuation);populateValuationPopup();
  // Registro asíncrono: si Supabase está lento o falla, la tasación visible no se pierde.
  window.TPLTasadorSupabase?.register?.(landInput,result,tasadorContext).then(persisted=>{
   if(!persisted?.registration)return;
   valuation.source='supabase';
   valuation.tasacionId=persisted.registration.tasacion_id||null;
   valuation.tasacionCodigo=persisted.registration.codigo||null;
   saveReport();
  }).catch(error=>console.warn('Tasación calculada; registro Supabase pendiente.',error));
 }catch(error){
  console.error('Error al calcular tasación TPL:',error);
  if(explanation)explanation.textContent='No pudimos calcular en este intento. Revisa los datos e inténtalo nuevamente; el botón sigue disponible.';showValuationPopupError('Ocurrió un problema al analizar la propiedad. Puedes revisar los datos e intentarlo nuevamente.',error);
 }finally{
  if(button)button.disabled=false;
 }
}
function buildValuationVirtues(property){
 const out=[];
 const t=property?.terreno||{};
 const sv=property?.servicios||{};
 const push=(text)=>{if(text&&!out.includes(text))out.push(text)};
 if(/rol propio/i.test(String(t.rol||''))||sv.rol)push('Rol propio informado');
 if(/conectada|empalme/i.test(String(t.luz||''))||sv.luz)push(/empalme/i.test(String(t.luz||''))?'Empalme eléctrico':'Electricidad disponible');
 else if(/factibilidad|postaci[oó]n|cercana/i.test(String(t.luz||'')))push('Factibilidad eléctrica');
 if(/puntera|pozo|apr|disponible|conectada/i.test(String(t.agua||''))||sv.agua)push('Solución de agua informada');
 else if(/factibilidad/i.test(String(t.agua||'')))push('Factibilidad de agua');
 if(/completamente cercada/i.test(String(t.cierre||''))||sv.cerco)push('Cierre perimetral');
 if(/port[oó]n instalado/i.test(String(t.porton||''))||sv.porton)push('Portón de acceso');
 if(/s[ií]/i.test(String(t.condominio||'')))push('Condominio o loteo organizado');
 if(t.rioDirecto)push('Acceso directo a río');
 if(t.vertienteNatural)push('Vertiente natural');
 if(t.orillaLago)push('Orilla de lago');
 if(t.termasNaturales)push('Aguas termales');
 if(/bosque nativo/i.test(String(t.vegetacion||''))||sv.naturaleza)push('Entorno natural destacado');
 if(/panor[aá]mica/i.test(String(t.vistaPrincipal||'')))push('Vista panorámica');
 return out.slice(0,6);
}
function renderValuation(){
 $('#valuationMain').textContent=`Valor TPL Recomendado: ${money(valuation.market)}`;if(valuation.recommendedUf&&valuation.ufClpUsed)$('#valuationMain').title=`${Number(valuation.recommendedUf).toLocaleString('es-CL',{maximumFractionDigits:1})} UF · UF usada ${money(valuation.ufClpUsed)}`;
 $('#quickValue').textContent=money(valuation.quick);$('#marketValue').textContent=money(valuation.market);$('#patientValue').textContent=money(valuation.patient);
 const immediateBtn=$('#immediateSaleBtn');if(immediateBtn){immediateBtn.hidden=!Number(valuation.immediateReference);}
 const virtues=buildValuationVirtues(data()),box=$('#valuationVirtues'),list=$('#valuationVirtuesList');
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
 if(valuation.territorialIndex){
  msg+=` Índice Territorial TPL: ${valuation.territorialIndex.score}/100 (${valuation.territorialIndex.label}).`;
 }
 if(valuation.propertyIndex){
  msg+=` Índice de Propiedad TPL: ${valuation.propertyIndex.score}/100 (${valuation.propertyIndex.label}).`;
 }
 if(valuation.priceAnalysis?.classification){
  msg+=` Lectura de precio: ${valuation.priceAnalysis.classification}.`;
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
 <div class="valuation-range"><div><small>Venta Ágil</small><strong>${money(v.quick)}</strong></div><div><small>Valor TPL Recomendado</small><strong>${money(v.market)}</strong></div><div><small>Valor de Mercado Potencial</small><strong>${money(v.patient)}</strong></div></div>
 <section class="tpl-premium-section"><h3>Lectura de valoración</h3>
 <table class="tpl-report-table">
 ${row('Alternativa utilizada',chosenLabel)}
 ${row('Modelo TPL',money(v.technical||v.market))}
 ${v?.territorialIndex?row('Índice Territorial TPL',`${v.territorialIndex.score}/100 · ${v.territorialIndex.label}`):''}
 ${v?.propertyIndex?row('Índice de Propiedad TPL',`${v.propertyIndex.score}/100 · ${v.propertyIndex.label}`):''}
 ${v?.priceAnalysis?.classification?row('Lectura de precio',v.priceAnalysis.classification):''}
 ${v?.engineVersion?row('Versión del motor',v.engineVersion):''}
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
 const typeLabel=d.tipo==='parcela_casa'?'Parcela con casa':d.tipo==='casa'?'Casa':'Parcela';
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
 if(d.distanciaComuna)location.push(`${d.distanciaComuna} km del centro de ${d.comuna||'la comuna'}`);
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
 <section class="review-section"><h3>Diagnóstico y acuerdos</h3><div class="review-row"><span>Mejoras necesarias</span><strong>${d.diagnostico.necesidades.map(x=>x.tipo.replaceAll('_',' ')).join(', ')||'Ninguna'}</strong></div><div class="review-row"><span>¿Acepta evaluar mejoras?</span><strong>${d.diagnostico.aceptaEvaluarMejoras==='si'?'Sí':d.diagnostico.aceptaEvaluarMejoras==='no'?'No por ahora':'Sin responder'}</strong></div></section>
 <section class="review-section"><h3>Tasación y medios</h3><div class="review-row"><span>Valor recomendado</span><strong>${valuation?money(valuation.market):'No calculada'}</strong></div><div class="review-row"><span>Fotografías</span><strong>${photos.length}</strong></div><div class="review-row"><span>Video</span><strong>${d.videoUrl?'Sí':'No'}</strong></div></section>
 <section class="review-section"><h3>Responsable</h3><div class="review-row"><span>Nombre</span><strong>${d.contacto.nombre||'—'}</strong></div><div class="review-row"><span>Correo</span><strong>${d.contacto.email||'—'}</strong></div></section>`;
}
function showPublishSuccess(result,d,onboarding=null){
 const dialog=$('#publishSuccessDialog');
 if(!dialog)return;
 const code=$('#publishSuccessCode'),email=$('#publishSuccessEmail'),needs=$('#publishSuccessNeeds');
 const mailStatus=$('#publishSuccessMailStatus'),agendaLink=$('#publishSuccessAgendaLink');
 if(code)code.textContent=result?.codigo||'Publicación recibida';
 if(email)email.textContent=d?.contacto?.email||'tu correo registrado';
 const count=Number(result?.necesidades_detectadas||0);
 if(needs)needs.textContent=count?`TPL detectó ${count} mejora${count===1?'':'s'} o necesidad${count===1?'':'es'} que podremos considerar para potenciar la propiedad.`:'Tu publicación quedó preparada para revisión comercial y validación de antecedentes.';
 if(mailStatus){
  mailStatus.innerHTML=onboarding?.ok
   ? `Confirmación y acceso enviados a <b>${d?.contacto?.email||'tu correo'}</b>. Tu Plan Gratis quedó activado.`
   : `La publicación quedó registrada. El acceso y los correos están pendientes de reintento automático para <b>${d?.contacto?.email||'tu correo'}</b>.`;
 }
 if(agendaLink){agendaLink.hidden=!onboarding?.ok;agendaLink.href=onboarding?.agenda_url||'../tpl-business/'}
 if(!dialog.open)dialog.showModal();
}

async function submit(e){
 e.preventDefault();
 if(!validateStep(5))return showStep(5);

 const d={
  ...data(),
  status:'pendiente_revision',
  createdAt:new Date().toISOString(),
  welcomeStatus:'pendiente',
  businessAccess:'pendiente'
 };

 const btn=$('#submitBtn');
 const status=$('#submitStatus');

 if(!window.TPLDataService?.publishProperty){
  if(status)status.textContent='No se pudo iniciar la conexión segura con TPL. Recarga la página antes de enviar.';
  return;
 }

 if(btn){btn.disabled=true;btn.textContent='Enviando…'}
 if(status)status.textContent='Registrando responsable, propiedad, tasación y necesidades en TPL…';

 try{
  const result=await window.TPLDataService.publishProperty(d);

  if(!result?.ok||result.source!=='supabase'){
   throw new Error('La plataforma no confirmó el registro en Supabase.');
  }

  localStorage.removeItem(KEY);
  if(remoteDraftToken){try{await window.TPLDataService?.revokePublisherDraft?.(remoteDraftToken)}catch{}localStorage.removeItem(REMOTE_DRAFT_TOKEN_KEY);remoteDraftToken='';}

  // La tasación del publicador se convierte en la fuente canónica de la propiedad recién creada.
  if(valuation && window.TPLTasadorSupabase?.canonical && window.TPLDataService?.registerTerritorialAnalysis){
   try{
    const property=data();
    const canonical=window.TPLTasadorSupabase.canonical({
      area:Number(property?.terreno?.superficie||0),region:property.region,comuna:property.comuna,
      lat:Number(property?.ubicacion?.lat||0)||null,lng:Number(property?.ubicacion?.lng||0)||null,
      water:property?.terreno?.agua||'',electricity:property?.terreno?.luz||'',rol:property?.terreno?.rol||'',
      topography:property?.terreno?.topografia||'',access:property?.ubicacion?.acceso||'',
      propiedadId:result.propiedad_id,propiedadCodigo:result.codigo_propiedad||result.codigo,origen:'publicador'
    },valuation,{tasacion_id:valuation.tasacionId||null,propiedad_id:result.propiedad_id});
    canonical.propiedad_id=result.propiedad_id;canonical.propiedad_codigo=result.codigo_propiedad||result.codigo;canonical.origen='publicador';
    await window.TPLDataService.registerTerritorialAnalysis(canonical);
   }catch(analysisError){console.warn('Publicación guardada; análisis territorial pendiente:',analysisError)}
  }

  let onboarding=null;
  try{
   if(status)status.textContent='Publicación recibida. Activando Plan Gratis y enviando tus accesos…';
   onboarding=await window.TPLDataService.activateFreeOwner({publicacion_id:result.publicacion_id,email:d.contacto.email});
  }catch(onboardingError){
   console.warn('Onboarding propietario pendiente:',onboardingError);
   onboarding={ok:false,error:onboardingError?.message||'Activación pendiente'};
  }

  let ecosystem=null;
  try{
   ecosystem=await window.TPLDataService.getPublicationEcosystemStatus?.(result.publicacion_id,result.propiedad_id);
  }catch(ecosystemError){console.warn('Publicación guardada; verificación del ecosistema pendiente:',ecosystemError)}

  if(status){
   const needs=Number(result.necesidades_detectadas||0);
   status.textContent=onboarding?.ok
    ? `Publicación ${result.codigo} recibida · Plan Gratis activado · correos enviados${needs?` · ${needs} necesidad${needs===1?'':'es'} detectada${needs===1?'':'s'}`:''}${ecosystem?.ok?' · Ficha Maestra y CRM conectados':''}.`
    : `Publicación ${result.codigo} recibida correctamente. El acceso y los correos quedaron pendientes de reintento; la publicación no se perdió.`;
  }
  if(btn)btn.textContent='Enviada correctamente ✓';
  showPublishSuccess(result,d,onboarding);
 }catch(error){
  console.error('Publicador TPL:',error);
  if(status){
   status.textContent=error?.localBackup
    ? 'No se confirmó el envío a Supabase. Tus datos quedaron respaldados en este navegador; revisa la conexión y vuelve a intentarlo.'
    : (error.message||'No fue posible enviar la publicación.');
  }
  if(btn){btn.disabled=false;btn.textContent='Reintentar envío';}
 }
}

const nextBtn=$('#nextBtn');if(nextBtn)nextBtn.onclick=()=>{if(validateStep(current))showStep(current+1)};
const prevBtn=$('#prevBtn');if(prevBtn)prevBtn.onclick=()=>showStep(current-1);
$$('.step-link').forEach(btn=>btn.onclick=()=>{const n=Number(btn.dataset.step);if(n<=current||validateStep(current))showStep(n)});
const saveDraftTop=$('#saveDraftTop');if(saveDraftTop)saveDraftTop.onclick=()=>saveDraft(true);
['#precio'].forEach(s=>on(s,'blur',e=>formatInput(e.target)));
const calculateBtn=$('#calculateBtn');if(calculateBtn)calculateBtn.onclick=calculate;

document.querySelectorAll('[data-valuation-choice]').forEach(btn=>btn.onclick=()=>setPopupChoice(btn.dataset.valuationChoice));

const immediateSaleBtn=$('#immediateSaleBtn');if(immediateSaleBtn)immediateSaleBtn.onclick=()=>{if(!Number(valuation?.immediateReference))return;const val=$('#immediateSaleValue');if(val)val.textContent=money(valuation.immediateReference);$('#immediateSaleDialog')?.showModal();};
const closeImmediateSale=$('#closeImmediateSale');if(closeImmediateSale)closeImmediateSale.onclick=()=>$('#immediateSaleDialog')?.close();
const closePublishSuccess=$('#closePublishSuccess');if(closePublishSuccess)closePublishSuccess.onclick=()=>$('#publishSuccessDialog')?.close();
const closeValuationResult=$('#closeValuationResult');if(closeValuationResult)closeValuationResult.onclick=()=>$('#valuationResultDialog')?.close();
const valuationErrorClose=$('#valuationErrorClose');if(valuationErrorClose)valuationErrorClose.onclick=()=>$('#valuationResultDialog')?.close();
const closeValuationResultBottom=$('#closeValuationResultBottom');if(closeValuationResultBottom)closeValuationResultBottom.onclick=()=>$('#valuationResultDialog')?.close();
const useValuationBtn=$('#useValuationBtn');if(useValuationBtn)useValuationBtn.onclick=applyPopupValuation;
function openReportPreview(){
 const content=$('#reportContent'),dialog=$('#reportDialog');
 if(!content||!dialog||!valuation)return;
 content.classList.add('report-preview-watermark');
 content.innerHTML=reportHTML();
 dialog.showModal();
 loadNearbyServices();
}
const popupPremiumBtn=$('#popupPremiumBtn');if(popupPremiumBtn)popupPremiumBtn.onclick=()=>{const resultDialog=$('#valuationResultDialog');if(resultDialog?.open)resultDialog.close();openReportPreview()};

const openReportBtn=$('#openReportBtn');if(openReportBtn)openReportBtn.onclick=openReportPreview;
const closeReport=$('#closeReport');if(closeReport)closeReport.onclick=()=>$('#reportDialog')?.close();
const printReport=$('#printReport');if(printReport)printReport.onclick=()=>window.print();
const photosInput=$('#photos');if(photosInput)photosInput.onchange=e=>{photos.push(...[...e.target.files].map(file=>({name:file.name,url:URL.createObjectURL(file)})));renderPhotos();saveDraft()};
const descripcion=$('#descripcion');if(descripcion)descripcion.oninput=e=>{const count=$('#descCount');if(count)count.textContent=e.target.value.length};
const suggestBtn=$('#suggestDescription');if(suggestBtn)suggestBtn.onclick=suggestDescription;
const geoBtn=$('#geoBtn');if(geoBtn)geoBtn.onclick=()=>requestBrowserLocation();
initMapPicker();
function openReportOrder(){
 if(!valuation){alert('Primero debes calcular la tasación.');return}
 const d=data(),dialog=$('#reportOrderDialog');
 if(!dialog)return;
 const name=$('#reportOrderName'),email=$('#reportOrderEmail'),phone=$('#reportOrderPhone'),status=$('#reportOrderStatus');
 if(name)name.value=d.contacto?.nombre||'';
 if(email)email.value=d.contacto?.email||'';
 if(phone)phone.value=d.contacto?.telefono||'';
 if(status){status.textContent='';status.className='report-order-status'}
 dialog.showModal();
}
async function submitReportOrder(event){
 event.preventDefault();
 const status=$('#reportOrderStatus'),button=$('#submitReportOrder'),d=data();
 const payload={
  tipo_informe:'tasacion_premium',monto_clp:1990,origen:'publicador_v2',
  tasacion_id:valuation?.tasacionId||null,version_motor:valuation?.version||valuation?.versionMotor||'tpl-land-engine-v2',
  contacto:{nombre:valueOf('#reportOrderName'),email:valueOf('#reportOrderEmail'),telefono:valueOf('#reportOrderPhone')},
  entrada:d,resultado:valuation
 };
 if(!$('#reportOrderConsent')?.checked){if(status){status.textContent='Debes aceptar el uso de datos para continuar.';status.className='report-order-status is-error'}return}
 if(button){button.disabled=true;button.textContent='Registrando…'}
 try{
  let result;
  if(window.TPLDataService?.startReportPayment){result=await window.TPLDataService.startReportPayment(payload)}
  else throw new Error('El servicio de pago seguro aún no está disponible.');
  try{localStorage.setItem('tpl_report_purchase_intent_v2',JSON.stringify({...payload,...result,createdAt:new Date().toISOString()}))}catch{}
  if(status){status.textContent=`Orden ${result.codigo} creada. Redirigiendo al pago seguro…`;status.className='report-order-status is-success'}
  if(button){button.textContent='Abriendo Flow…'}
  location.href=result.payment_url;
 }catch(error){
  const fallback={...payload,localId:id(),createdAt:new Date().toISOString(),estado:'pendiente_sincronizacion'};
  try{localStorage.setItem('tpl_report_purchase_intent_v2',JSON.stringify(fallback))}catch{}
  if(status){status.textContent=`No fue posible sincronizar con TPL: ${error.message||'revisa la conexión'}. La solicitud quedó respaldada en este navegador.`;status.className='report-order-status is-error'}
  if(button){button.disabled=false;button.textContent='Reintentar'}
 }
}
const buyReportBtn=$('#buyProfessionalReportBtn');if(buyReportBtn)buyReportBtn.onclick=openReportOrder;
const reportOrderForm=$('#reportOrderForm');if(reportOrderForm)reportOrderForm.addEventListener('submit',submitReportOrder);
const closeReportOrder=$('#closeReportOrder');if(closeReportOrder)closeReportOrder.onclick=()=>$('#reportOrderDialog')?.close();
const cancelReportOrder=$('#cancelReportOrder');if(cancelReportOrder)cancelReportOrder.onclick=()=>$('#reportOrderDialog')?.close();
const form=$('#publisherForm');if(form){form.addEventListener('input',()=>{updateDiagnosticMotivation();clearTimeout(window.__tplDraftTimer);window.__tplDraftTimer=setTimeout(saveDraft,450)});form.onsubmit=submit;}
$$('input[name="tipo"]').forEach(el=>el.addEventListener('change',toggleHouseFields));
const luzDetalle=$('#luzDetalle'),distanciaPosteWrap=$('#distanciaPosteWrap');const syncPoleDistance=()=>{if(distanciaPosteWrap)distanciaPosteWrap.hidden=!/factibilidad|postación|postacion/i.test(luzDetalle?.value||'')};on('#luzDetalle','change',syncPoleDistance);syncPoleDistance();
(async()=>{await initTerritory();const remote=await restoreRemoteDraft();fill(remote||readJSON(KEY,null));toggleHouseFields();showStep(0)})();
})();
