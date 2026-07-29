
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

const valueOf=selector=>$(selector)?.value?.trim?.()||'';
const checked=selector=>Boolean($(selector)?.checked);
const numberOf=selector=>Number($(selector)?.value||0);
const radioValue=name=>$(`input[name="${name}"]:checked`)?.value||'';
const setSelectValue=(selector,value)=>{const el=$(selector);if(el&&value!==undefined&&value!==null)el.value=String(value)};

async function initTerritory(){
 try{
  const module=await import('./tpl-national-catalog.mjs');
  const cat=module.TPL_NATIONAL_CATALOG;
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
 if($('#agua')&&water)$('#agua').checked=!/sin agua|no lo sé/i.test(water);
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
  estados:{cerco:$('#estadoCerco')?.value||'',porton:$('#estadoPorton')?.value||'',camino:$('#estadoCamino')?.value||'',limpieza:$('#estadoLimpieza')?.value||''},
  necesidades:needed.filter(x=>x!=='ninguna').map(tipo=>({tipo,descripcion:`Mejora declarada: ${tipo.replaceAll('_',' ')}`,negociable:negotiable.includes(tipo),condiciones:{tipo:$('#condicionMejora')?.value||'acuerdo_partes'},datos:{origen:'declarado_por_publicador'}})),
  mejorasNegociables:negotiable,condicion:$('#condicionMejora')?.value||'acuerdo_partes',comentario:$('#comentarioMejoras')?.value.trim()||'',declaracionVeracidad:true
 };
}

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
   cierre:valueOf('#cierreDetalle'),porton:valueOf('#portonDetalle'),frente:numberOf('#frente'),formaTerreno:valueOf('#formaTerreno')
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
  precio:parseMoney($('#precio')?.value),valorM2:parseMoney($('#valorM2')?.value),
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
 [['#tipoTerreno',t.tipoTerreno],['#rolDetalle',t.rol],['#condominio',t.condominio],['#subdivision',t.subdivision],['#usoSuelo',t.usoSuelo],['#construccion',t.construccion],['#topografia',t.topografia],['#condicionSuelo',t.condicionSuelo],['#vegetacion',t.vegetacion],['#vistaPrincipal',t.vistaPrincipal],['#orientacion',t.orientacion],['#privacidad',t.privacidad],['#aguaDetalle',t.agua],['#luzDetalle',t.luz],['#accesoDetalle',t.acceso],['#distanciaRutaPrincipalKm',t.distanciaRutaPrincipalKm],['#cierreDetalle',t.cierre],['#portonDetalle',t.porton],['#frente',t.frente],['#formaTerreno',t.formaTerreno]].forEach(([s,v])=>set(s,v));
 const c=d.casa||{};
 [['#tipoCasa',c.tipoCasa],['#casaSuperficie',c.superficie],['#habitaciones',c.habitaciones],['#banos',c.banos],['#pisos',c.pisos],['#material',c.material],['#estadoCasa',c.estado],['#regularizacion',c.regularizacion],['#anioCasa',c.anio],['#calidadCasa',c.calidad],['#remodelacionCasa',c.remodelacion],['#anioRemodelacionCasa',c.anioRemodelacion],['#centroUrbanoCasa',c.centroUrbano],['#minutosCentroCasa',c.minutosCentro],['#caminoCasa',c.camino],['#aislacionCasa',c.aislacion],['#ventanasCasa',c.ventanas],['#aguaCasa',c.agua],['#sanitarioCasa',c.sanitario],['#calefaccion',c.calefaccion],['#estacionamientos',c.estacionamientos]].forEach(([s,v])=>set(s,v));
 set('#precio',d.precio?String(d.precio).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'');
 set('#valorM2',d.valorM2?String(d.valorM2).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'');
 const e=d.estrategia||{};radio('urgencia',e.urgencia);set('#plazoVenta',e.plazoVenta);set('#tiempoEnVenta',e.tiempoEnVenta);set('#negociacionPrecio',e.negociacionPrecio);set('#disponibilidadVisitas',e.disponibilidadVisitas);
 set('#videoUrl',d.videoUrl);set('#titulo',d.titulo);set('#descripcion',d.descripcion);radio('responsable',d.contacto?.responsable);
 set('#nombre',d.contacto?.nombre);set('#telefono',d.contacto?.telefono);set('#email',d.contacto?.email);set('#rut',d.contacto?.rut);
 const diag=d.diagnostico||{};set('#estadoCerco',diag.estados?.cerco);set('#estadoPorton',diag.estados?.porton);set('#estadoCamino',diag.estados?.camino);set('#estadoLimpieza',diag.estados?.limpieza);
 (diag.necesidades||[]).forEach(n=>{const el=$(`input[name="necesidad"][value="${n.tipo}"]`);if(el)el.checked=true});
 (diag.mejorasNegociables||[]).forEach(v=>{const el=$(`input[name="mejoraNegociable"][value="${v}"]`);if(el)el.checked=true});
 set('#condicionMejora',diag.condicion);set('#comentarioMejoras',diag.comentario);
 coords=d.coords||null;valuation=d.valuation||null;if(valuation)renderValuation();
 toggleHouseFields();
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
  if(!el.value?.trim()){el.focus();return false}
 }
 if(step===1&&!Number($('#superficie').value)){ $('#superficie').focus(); return false; }
 if(step===1&&!selectedValues('necesidad').length){alert('Indica al menos una mejora necesaria o selecciona “No necesita mejoras”.');return false;}
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
 if(current===6)renderReview();
 window.scrollTo({top:0,behavior:'smooth'});
 saveDraft();
}
function formatInput(el){const n=parseMoney(el.value);el.value=n?String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):''}
function calculate(){
 const property=data();
 const area=Number(property.superficie||0), rate=parseMoney($('#valorM2').value), distance=Number(property.distanciaCiudad||0);
 if(!area){$('#valuationExplanation').textContent='Ingresa la superficie del terreno para calcular la tasación.';return}
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
  access:property.terreno?.acceso||property.acceso
 };
 let result;
 if(property.tipo==='casa' && window.TPLHouseEngine?.calculate){
  const c=property.casa||{};
  const currentYear=new Date().getFullYear();
  const houseYear=Number(c.anio||0);
  const remodelYear=Number(c.anioRemodelacion||0);
  result=window.TPLHouseEngine.calculate({
   ...landInput,
   incluyeVivienda:true,
   areaCasa:Number(c.superficie||0),
   materialCasa:c.material||'mixta',
   antiguedadCasa:houseYear?Math.max(0,currentYear-houseYear):0,
   anioConstruccion:houseYear||0,
   estadoCasa:c.estado||'bueno',
   remodelacionIntegral:/integral/i.test(c.remodelacion||''),
   anioRemodelacion:remodelYear||0,
   dormitorios:Number(c.habitaciones||0),
   banos:Number(c.banos||0),
   pisos:Number(c.pisos||1),
   tipoFundacion:'sin_fundacion',
   rolAvaluo:property.terreno?.rol||'',
   valorTerreno:0
  });
 }else if(window.TPLLandEngine?.calculate){
  result=window.TPLLandEngine.calculate(landInput);
 }else{
  if(!rate){$('#valuationExplanation').textContent='El motor de tasación no está disponible. Ingresa un valor base por m² como respaldo.';return}
  let market=area*rate;
  if(distance<=10)market*=1.08;else if(distance>35)market*=.94;
  market*=1+Object.values(features).filter(Boolean).length*.025;
  result={quick:market*.9,ideal:market,patient:market*1.1};
 }
 if(result?.error){$('#valuationExplanation').textContent=result.error;return}
 const technical=Number(result.ideal||result.market||result.recommended||result.baseValue||area*rate);
 const urgency=property.estrategia?.urgencia||radioValue('urgencia');
 if(!urgency){$('#valuationExplanation').textContent='Indica tu nivel de apuro antes de calcular la tasación.';return}
 const urgencyPct=urgencyAdjustment(urgency);
 const recommended=Math.round(technical/10000)*10000;
 const urgencyValue=Math.round((technical*(1+urgencyPct))/10000)*10000;
 const idealValue=Math.round((Number(result.patient||technical*1.10))/10000)*10000;
 valuation={
  id:id(),createdAt:new Date().toISOString(),area,rate,distance,
  technical:Math.round(technical/10000)*10000,
  urgency,urgencyPct,
  quick:urgencyValue,
  market:recommended,
  patient:idealValue,
  asking:property.precio,comuna:property.comuna,tipo:property.tipo,
  features,
  breakdown:result.desglose||null,
  landResult:result.landResult||null,
  houseResult:result.vivienda||null,
  method:result.method||'tpl-unified-local-v2',
  source:result.source||'tpl_local'
 };
 renderValuation();
 saveReport();
 captureValuationLead(property,valuation);
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
 const d=data(),v=valuation;
 return `<article class="tpl-report"><h1>Informe de tasación TPL</h1><p>${new Date().toLocaleDateString('es-CL')}</p><h2>${d.titulo||`${d.tipo} en ${d.comuna||'Chile'}`}</h2><p>${d.superficie.toLocaleString('es-CL')} m² · ${d.suelo||'Suelo por confirmar'} · ${d.distanciaCiudad||0} km de ciudad principal</p><div class="valuation-range"><div><small>Valor según tu nivel de apuro</small><strong>${money(v.quick)}</strong></div><div><small>Valor recomendado TPL</small><strong>${money(v.market)}</strong></div><div><small>Valor ideal sin apuro</small><strong>${money(v.patient)}</strong></div></div><h3>Lectura TPL</h3><p>${$('#valuationExplanation').textContent}</p><h3>Antecedentes declarados</h3><p>${Object.entries(d.servicios).filter(([,x])=>x).map(([k])=>k).join(', ')||'Sin servicios confirmados.'}</p><small>Estimación orientativa. No reemplaza una tasación bancaria, peritaje ni estudio de títulos.</small></article>`;
}
function renderPhotos(){
 const grid=$('#photoGrid');grid.innerHTML='';
 photos.forEach((p,i)=>{const el=document.createElement('div');el.className='photo-item';el.innerHTML=`<img src="${p.url}" alt="Fotografía ${i+1}"><button type="button" aria-label="Eliminar">×</button>`;el.querySelector('button').onclick=()=>{URL.revokeObjectURL(p.url);photos.splice(i,1);renderPhotos()};grid.appendChild(el)});
}
function suggestDescription(){
 const d=data(),attrs=[];
 const t=d.terreno||{};
 if(t.agua)attrs.push(t.agua);else if(d.servicios.agua)attrs.push('agua disponible');
 if(t.luz)attrs.push(t.luz);else if(d.servicios.luz)attrs.push('electricidad');
 if(t.rol)attrs.push(t.rol);else if(d.servicios.rol)attrs.push('rol propio');
 if(t.vegetacion)attrs.push(t.vegetacion);else if(d.servicios.naturaleza)attrs.push('entorno natural');
 if(t.vistaPrincipal)attrs.push(t.vistaPrincipal);
 const typeLabel=d.tipo==='campo'?'Campo':d.tipo==='casa'?'Casa con terreno':'Parcela';
 $('#titulo').value=`${typeLabel} de ${Number(d.superficie||0).toLocaleString('es-CL')} m² en ${d.comuna||'Chile'}`;
 const house=d.casa?` La vivienda cuenta con ${d.casa.superficie||'—'} m² construidos, ${d.casa.habitaciones||'—'} dormitorios y ${d.casa.banos||'—'} baños.`:'';
 $('#descripcion').value=`${typeLabel} ubicada en ${d.localidad||d.comuna||'un sector por confirmar'}, comuna de ${d.comuna||'—'}, ${d.region||''}. Cuenta con ${Number(d.superficie||0).toLocaleString('es-CL')} m², ${t.topografia?`topografía ${t.topografia.toLowerCase()}`:`terreno ${String(d.suelo||'por confirmar').toLowerCase()}`} y acceso ${String(t.acceso||d.acceso||'por confirmar').toLowerCase()}. ${attrs.length?`Entre sus atributos destacan ${attrs.join(', ')}.`:''}${house} ${d.estrategia.negociacionPrecio==='mejoras'||d.estrategia.negociacionPrecio==='ofertas_y_mejoras'?'El propietario está disponible para conversar alternativas que faciliten la operación.':''}`.trim();
 $('#descripcion').dispatchEvent(new Event('input'));saveDraft();
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
['#precio','#valorM2'].forEach(s=>on(s,'blur',e=>formatInput(e.target)));
const calculateBtn=$('#calculateBtn');if(calculateBtn)calculateBtn.onclick=calculate;
const openReportBtn=$('#openReportBtn');if(openReportBtn)openReportBtn.onclick=()=>{const content=$('#reportContent');const dialog=$('#reportDialog');if(content&&dialog){content.innerHTML=reportHTML();dialog.showModal()}};
const closeReport=$('#closeReport');if(closeReport)closeReport.onclick=()=>$('#reportDialog')?.close();
const printReport=$('#printReport');if(printReport)printReport.onclick=()=>window.print();
const photosInput=$('#photos');if(photosInput)photosInput.onchange=e=>{photos.push(...[...e.target.files].map(file=>({name:file.name,url:URL.createObjectURL(file)})));renderPhotos();saveDraft()};
const descripcion=$('#descripcion');if(descripcion)descripcion.oninput=e=>{const count=$('#descCount');if(count)count.textContent=e.target.value.length};
const suggestBtn=$('#suggestDescription');if(suggestBtn)suggestBtn.onclick=suggestDescription;
const geoBtn=$('#geoBtn');if(geoBtn)geoBtn.onclick=()=>{const status=$('#geoStatus');if(!navigator.geolocation){if(status)status.textContent='GPS no disponible.';return}if(status)status.textContent='Buscando ubicación…';navigator.geolocation.getCurrentPosition(p=>{coords={lat:p.coords.latitude,lng:p.coords.longitude};if(status)status.textContent='Ubicación aproximada guardada.';saveDraft()},()=>{if(status)status.textContent='No se pudo obtener la ubicación.'})};
const buyReportBtn=$('#buyProfessionalReportBtn');if(buyReportBtn)buyReportBtn.onclick=()=>{const d=data();const intent={createdAt:new Date().toISOString(),property:d,valuation,amount:1990,status:'intencion_compra'};try{localStorage.setItem('tpl_report_purchase_intent_v1',JSON.stringify(intent))}catch{};if(window.TPLDataService?.trackEvent)window.TPLDataService.trackEvent('informe_tasacion_solicitado',intent).catch?.(()=>{});alert('Tu solicitud de informe quedó registrada. El pago de $1.990 se habilitará en el siguiente paso de integración de pagos.');};
const form=$('#publisherForm');if(form){form.addEventListener('input',()=>{clearTimeout(window.__tplDraftTimer);window.__tplDraftTimer=setTimeout(saveDraft,450)});form.onsubmit=submit;}
$$('input[name="tipo"]').forEach(el=>el.addEventListener('change',toggleHouseFields));
['#aguaDetalle','#luzDetalle','#rolDetalle','#cierreDetalle','#portonDetalle'].forEach(sel=>on(sel,'change',syncQuickServices));
(async()=>{await initTerritory();fill(readJSON(KEY,null));toggleHouseFields();showStep(0)})();
})();
