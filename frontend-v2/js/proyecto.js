(()=>{
'use strict';
const $=id=>document.getElementById(id);const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const positive=v=>['si','sí','true','1','disponible','incluido','con'].includes(norm(v));
const iconPaths={phone:'<path d="M6.7 3.5 9 8l-2 1.5a16 16 0 0 0 7.5 7.5l1.5-2 4.5 2.3-.7 3.2c-.2.9-1 1.5-1.9 1.5C9.1 22 2 14.9 2 6.1c0-.9.6-1.7 1.5-1.9l3.2-.7Z"/>',message:'<path d="M4 5h16v11H8l-4 4V5Z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',land:'<path d="M3 18 8 9l4 5 3-4 6 8H3Z"/><path d="M3 21h18"/>',home:'<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3v-9Z"/>',route:'<path d="M7 3 5 21M17 3l2 18M10 7h4M10 12h4M10 17h4"/>',doc:'<path d="M6 2h9l4 4v16H6V2Z"/><path d="M14 2v5h5M9 12h7M9 16h7"/>',water:'<path d="M12 3s-5 6-5 11a5 5 0 0 0 10 0c0-5-5-11-5-11Z"/>',bolt:'<path d="m13 2-7 12h6l-1 8 7-12h-6l1-8Z"/>',leaf:'<path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16Z"/><path d="M5 20c3-5 7-8 12-10"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',tools:'<path d="m14 7 3-3 3 3-3 3M17 7 9 15M5 13l6 6-3 3-6-6 3-3Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]||iconPaths.land}</svg>`;
function catalogs(){let ps=[];try{ps=Array.isArray(window.parcelas)?window.parcelas:(typeof parcelas!=='undefined'&&Array.isArray(parcelas)?parcelas:[])}catch{}let hs=[];try{hs=Array.isArray(window.casas)?window.casas:(typeof casas!=='undefined'&&Array.isArray(casas)?casas:[])}catch{}return{ps,hs}}
function getProject(){
  try {
      const ctxStr = sessionStorage.getItem('tpl_project_context_v1');
      if (ctxStr) {
          const ctx = JSON.parse(ctxStr);
          return {
              id: ctx.sessionId,
              parcelId: ctx.parcel.id,
              parcelName: ctx.parcel.snapshot ? ctx.parcel.snapshot.nombre : '',
              parcelPrice: ctx.pricing.parcel,
              parcelSize: ctx.parcel.snapshot ? ctx.parcel.snapshot.superficieM2 : 0,
              parcelCommune: ctx.parcel.snapshot ? ctx.parcel.snapshot.comuna : '',
              parcelData: ctx.parcel.snapshot,
              houseId: ctx.housing.houseId,
              housing: ctx.housing.mode === 'prefab' ? 'prefabricada' : 'diseno-propio',
              m2: ctx.housing.mode === 'prefab' ? (ctx.housing.snapshot?.metros || 0) : (ctx.housing.customConfig?.m2 || 0),
              rooms: ctx.housing.mode === 'prefab' ? (ctx.housing.snapshot?.habitaciones || 0) : (ctx.housing.customConfig?.rooms || 0),
              material: ctx.housing.mode === 'custom' ? ctx.housing.customConfig?.material?.name : null,
              houseData: ctx.housing.snapshot,
              housePrice: ctx.pricing.house,
              foundationPrice: ctx.pricing.foundation,
              extrasPrice: ctx.pricing.extras,
              total: ctx.pricing.total
          };
      }
  } catch(e) {}
  const id=new URLSearchParams(location.search).get('id');let current=null;try{current=JSON.parse(sessionStorage.getItem('tpl_v2_current_project')||localStorage.getItem('tpl_v2_current_project')||'null')}catch{}let list=[];try{list=JSON.parse(localStorage.getItem('tpl_v2_projects')||'[]')}catch{}return (current&&(!id||String(current.id)===String(id))?current:null)||(id&&list.find(x=>String(x.id)===String(id)))||null
}
const project=getProject();if(!project){$('project-not-found').hidden=false;return}const {ps,hs}=catalogs();const parcel=project.parcelData||ps.find(x=>String(x.id)===String(project.parcelId))||{};const house=project.houseData||hs.find(x=>String(x.id)===String(project.houseId))||{};
const size=num(project.parcelSize||parcel.tamano||parcel.superficie),price=num(project.parcelPrice||parcel.precio),housePrice=num(project.housePrice),total=num(project.total)||price+housePrice+(num(project.foundationPrice)||0)+(num(project.extrasPrice)||0);const reserveAmount=Math.round(price*.01/1000)*1000;
function asset(path){if(!path)return'./assets/logo-tu-parcela-lista.png';if(/^https?:|^data:|^blob:/.test(path))return path;return`./${String(path).replace(/^\.\//,'')}`}
function text(){return norm([parcel.nombre,parcel.descripcion,parcel.detalle].join(' '))}const t=text();
function virtues(){const v=[];const push=(icon,title,copy)=>v.push({icon,title,copy});if(size)push('land',`${size.toLocaleString('es-CL')} m² de terreno`,size>=10000?'Amplitud para desarrollar un proyecto de campo con mayor privacidad.':'Espacio para vivienda, jardín, huerto y una vida con más aire.');if(positive(parcel.rol)||/rol propio/.test(t))push('doc','Rol propio informado','Un antecedente relevante para avanzar con mayor claridad documental.');if(positive(parcel.luz)||/electric|empalme|postacion/.test(t))push('bolt','Electricidad informada','La propiedad declara conexión o factibilidad eléctrica en sus antecedentes.');if(positive(parcel.agua)||/puntera|pozo|apr|vertiente|agua/.test(t))push('water','Solución de agua informada','Existe agua o una alternativa declarada que debe validarse técnicamente.');if(/rio|lago|vertiente|termal|termas|volcan|bosque|nativ|panoram/.test(t)||positive(parcel.naturaleza))push('leaf','Entorno con carácter propio','Naturaleza, paisaje o atributos que diferencian este proyecto.');if(project.m2)push('home',`${project.m2} m² de vivienda`,`${project.rooms||'—'} dormitorio(s) en la alternativa que elegiste.`);return v.slice(0,6)}
function dreams(){const cards=[['sun','Vida al aire libre','Terraza, jardín o un espacio para disfrutar el terreno.'],['leaf','Huerto y naturaleza','Reserva una parte para frutales, huerto o áreas verdes.'],['home','Una casa con propósito','Adapta la vivienda a tu familia y a cómo quieres usar el campo.'],['tools','Proyecto que puede crecer','Agrega quincho, bodega, taller u otras etapas cuando estés listo.']];return cards}
function improvements(){const out=[];const add=(title,copy)=>out.push({title,copy});if(!positive(parcel.agua)&&!/puntera|pozo|apr|vertiente|agua disponible/.test(t))add('Solución de agua','Evaluar puntera, pozo, APR u otra alternativa acorde al sector.');if(!positive(parcel.luz)&&!/empalme|conectada|electricidad/.test(t))add('Energía eléctrica','Confirmar factibilidad, empalme o una solución solar según el proyecto.');if(!/cercad|cerco|cierre perimetral/.test(t))add('Cerco perimetral','Puede mejorar delimitación, privacidad y preparación del terreno.');if(!/porton|portón/.test(t))add('Portón de acceso','Una mejora sencilla que ordena el ingreso y la presentación del proyecto.');if(!/fosa|alcantarillado|planta de tratamiento/.test(t))add('Solución sanitaria','La vivienda necesitará definir fosa u otra solución sanitaria.');if(/camino de tierra|acceso por mejorar|camino interior/.test(t))add('Mejorar acceso','Revisar camino y acceso puede facilitar construcción, visitas y uso diario.');return out.slice(0,6)}
function investment(){let score=0;if(price&&size){const m2=price/size;if(m2>0)score+=1}if(positive(parcel.rol)||/rol propio/.test(t))score+=1;if(positive(parcel.agua)||/puntera|pozo|apr|vertiente|agua/.test(t))score+=1;if(positive(parcel.luz)||/electric/.test(t))score+=1;if(/rio|lago|termal|termas|volcan|panoram|nativ/.test(t))score+=1;const level=score>=5?'Muy atractivo':score>=4?'Atractivo':score>=3?'Equilibrado':'En desarrollo';const reading=score>=4?'El proyecto reúne varios atributos que suelen fortalecer su uso, comercialización y proyección.':score>=3?'Combina una base razonable con aspectos que conviene confirmar antes de tomar una decisión.':'Todavía hay antecedentes y mejoras que pueden cambiar de forma importante la lectura del proyecto.';return{level,reading}}
function phrase(){const commune=parcel.comuna||project.parcelCommune||'el campo';if(/caburgua|pucon|pucón/.test(norm(commune+' '+t)))return'“Naturaleza, agua y paisaje convierten este proyecto en algo más cercano a un patrimonio de vida que a una simple parcela.”';if(/florida/.test(norm(commune)))return'“Campo para respirar, una vivienda propia y Concepción lo suficientemente cerca para mantener tu vida conectada.”';if(/nipas|ñipas|ranquil/.test(norm(commune)))return'“Un proyecto entre campo y Valle del Itata, con espacio para construir una etapa más tranquila a tu manera.”';return`“${size?size.toLocaleString('es-CL')+' m² de terreno, ':''}una vivienda elegida por ti y un proyecto que puede crecer contigo.”`}
function nearby(){const items=[];if(parcel.comuna)items.push(['Centro comunal',project.source?.communeDistance?`${project.source.communeDistance} km`:parcel.comuna]);if(parcel.tiempoConcepcion)items.push(['Conectividad urbana',parcel.tiempoConcepcion]);else if(parcel.distanciaConcepcion)items.push(['Referencia urbana',parcel.distanciaConcepcion]);if(project.source?.distance)items.push(['Desde tu búsqueda',`${project.source.distance} km`]);const route=(String(parcel.detalle||'').match(/ruta[^.<]{0,45}/i)||[])[0];if(route)items.push(['Ruta / acceso',route.replace(/<br\s*\/?>/gi,'')]);return items.slice(0,5)}
function gallery(){let imgs=[];if(project.housing==='prefabricada')imgs=[house.foto,...(house.imagenes||[])].filter(Boolean);else imgs=(project.materialData?[]:[]);if(!imgs.length)imgs=[parcel.imagen,...(parcel.imagenes||[])].filter(Boolean).slice(0,3);return[...new Set(imgs)].slice(0,3)}

async function renderTerritorialProject(){
 const section=$('lectura-territorial');if(!section||!window.TPLDataService?.getTerritorialProjectAnalysis)return;
 const identifier=parcel.canonicalId||parcel.codigo||parcel.id||project.parcelId;
 try{
  const a=await window.TPLDataService.getTerritorialProjectAnalysis(identifier);if(!a)return;
  const pa=a.analisis_proyecto||{};const hints=Array.isArray(pa.layout_hints)?pa.layout_hints:[];const steps=Array.isArray(pa.next_steps)?pa.next_steps:[];
  $('territorial-project-headline').textContent=pa.headline||'Cómo influye el terreno en tu proyecto';
  $('territorial-project-hints').innerHTML=hints.length?hints.map(x=>`<p>${x}</p>`).join(''):'<p>El análisis territorial se actualizará a medida que TPL confirme ubicación, acceso e infraestructura.</p>';
  $('territorial-project-steps').innerHTML=steps.slice(0,6).map((x,i)=>`<article><strong>${i+1}. ${x.title||'Siguiente paso'}</strong><small>${x.detail||''}</small></article>`).join('')||'<article><strong>Validación inicial</strong><small>Confirmar antecedentes técnicos antes de ejecutar obras.</small></article>';
  section.hidden=false;

      const conitSection=$("conit-conectividad");
      if(conitSection && (!window.latestValuation || (!window.latestValuation.conit && !window.latestValuation.geoint && !window.latestValuation.resultado?.conit && !window.latestValuation.resultado?.geoint))) {
          renderConit(dist, infra);
      }
  }catch(error){console.warn('TPL Proyecto: análisis territorial no disponible.',error)}
}

function renderConit(distData, infraData) {
  const conitSection=$("conit-conectividad");
  if(!conitSection) return;
  
  const dist = distData || {};
  const infra = infraData || distData || {}; 

  const cityDist=dist.ciudad_principal_km!=null?Number(dist.ciudad_principal_km):null;
  const cityName=dist.ciudad_principal_nombre||dist.hub_nombre||dist.ciudad_principal||'Ciudad principal';
  if($('conit-city-name')) $('conit-city-name').textContent=cityName;
  if($('conit-city-dist')) $('conit-city-dist').textContent=cityDist!=null?`${cityDist.toFixed(1).replace('.',',')} km`:'— km';
  
  const cityTimeRaw = dist.ciudad_principal_minutos || dist.hub_minutos;
  const cityTime = cityTimeRaw != null ? Number(cityTimeRaw) : (cityDist != null ? Math.round(cityDist*1.2) : null);
  if($('conit-city-time')) $('conit-city-time').textContent=cityTime!=null?`${cityTime} min`:'— min';
  
  const commDist=dist.centro_comuna_km!=null?Number(dist.centro_comuna_km):null;
  const commName=dist.centro_comuna_nombre||dist.comuna_nombre||dist.comuna||parcel.comuna||project.parcelCommune||'Cabecera comunal';
  if($('conit-commune-name')) $('conit-commune-name').textContent=commName;
  if($('conit-commune-dist')) $('conit-commune-dist').textContent=commDist!=null?`${commDist.toFixed(1).replace('.',',')} km`:'— km';
  
  const commTimeRaw = dist.centro_comuna_minutos || dist.comuna_minutos;
  const commTime = commTimeRaw != null ? Number(commTimeRaw) : (commDist != null ? Math.round(commDist*1.5) : null);
  if($('conit-commune-time')) $('conit-commune-time').textContent=commTime!=null?`${commTime} min`:'— min';
  
  const servGrid=$("conit-services-grid");
  if(servGrid){
    const servicesData = [
      { name: "Hospital", icon: "🏥", dist: infra.hospital_km!=null?infra.hospital_km:(commDist!=null?commDist+2:null) },
      { name: "CESFAM", icon: "🏥", dist: infra.cesfam_km!=null?infra.cesfam_km:(commDist!=null?commDist:null) },
      { name: "Supermercado", icon: "🛒", dist: infra.supermercado_km!=null?infra.supermercado_km:(commDist!=null?commDist:null) },
      { name: "Estación de servicio", icon: "⛽", dist: infra.estacion_servicio_km!=null?infra.estacion_servicio_km:(commDist!=null?commDist-1:null) },
      { name: "Banco", icon: "🏦", dist: infra.banco_km!=null?infra.banco_km:(commDist!=null?commDist:null) },
      { name: "Colegio", icon: "🎓", dist: infra.colegio_km!=null?infra.colegio_km:(commDist!=null?commDist-2:null) }
    ];
    
    const validServices = servicesData.filter(s => s.dist != null);
    if (validServices.length === 0) {
      servGrid.innerHTML = '<div class="conit-service-card"><small>Servicios por confirmar</small></div>';
    } else {
      servGrid.innerHTML = validServices.map(s => `
        <div class="conit-service-card">
          <span class="conit-service-icon">${s.icon}</span>
          <div class="conit-service-info">
            <strong>${s.name}</strong>
            <small>${Math.max(1,s.dist).toFixed(1).replace('.',',')} km</small>
          </div>
        </div>
      `).join('');
    }
  }
  conitSection.style.display='';
}

function render(){const pimgs=(parcel.imagenes?.length?parcel.imagenes:[parcel.imagen]).filter(Boolean);$('hero-parcel-image').src=asset(pimgs[0]);const commune=parcel.comuna||project.parcelCommune||'el campo';$('project-title').textContent=`Tu proyecto en ${commune}: espacio, vivienda y una nueva etapa.`;$('project-manifesto').textContent=parcel.descripcion||'Una combinación de parcela y vivienda construida para que puedas evaluar el proyecto completo, no piezas separadas.';$('hero-facts').innerHTML=[size?`${size.toLocaleString('es-CL')} m²`:'',project.m2?`Casa ${project.m2} m²`:'',project.rooms?`${project.rooms} dormitorio(s)`:'',parcel.rol?'Rol informado':'',parcel.tiempoConcepcion||''].filter(Boolean).map(x=>`<span class="hero-fact">${x}</span>`).join('');$('project-total').textContent=money(total);$('view-parcel-detail').href=`./parcela.html?id=${encodeURIComponent(parcel.id||project.parcelId||'')}`;
$('virtue-grid').innerHTML=virtues().map(v=>`<article class="virtue-card"><span class="line-icon">${icon(v.icon)}</span><strong>${v.title}</strong><p>${v.copy}</p></article>`).join('');$('dream-copy').textContent=`Con ${size?size.toLocaleString('es-CL')+' m²':''} puedes pensar la parcela como una plataforma para distintas etapas: vivienda, descanso, jardín, trabajo, reuniones o inversión. La idea es que el terreno se adapte a tu vida, no al revés.`;$('project-phrase').textContent=phrase();$('dream-cards').innerHTML=dreams().map(v=>`<article class="dream-card"><span class="line-icon">${icon(v[0])}</span><strong>${v[1]}</strong><small>${v[2]}</small></article>`).join('');
const imgs=gallery();$('house-gallery').innerHTML=imgs.map(x=>`<img src="${asset(x)}" alt="Vivienda del proyecto" loading="lazy">`).join('');$('house-name').textContent=project.housing==='prefabricada'?(project.houseName||house.nombre||'Casa prefabricada'):`Diseño propio · ${project.material||'Sistema por definir'}`;$('house-description').textContent=project.housing==='prefabricada'?(house.descripcion_breve||'Modelo prefabricado seleccionado para integrar al proyecto.'):`Diseño de ${project.m2||'—'} m² pensado para adaptarse a la parcela y a tu forma de vivir.`;$('house-specs').innerHTML=[project.m2?`${project.m2} m²`:'',project.rooms?`${project.rooms} dormitorios`:'',house.banos?`${house.banos} baño(s)`:'',project.material||house.empresa||''].filter(Boolean).map(x=>`<span>${x}</span>`).join('');$('house-price').textContent=money(housePrice);
const near=nearby();$('nearby-list').innerHTML=near.length?near.map(x=>`<div class="nearby-item"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join(''):'<div class="nearby-item"><span>Ubicación</span><strong>Contexto en construcción</strong></div>';$('location-reading').textContent=parcel.tiempoConcepcion?`Este proyecto combina entorno rural con una referencia de conectividad de ${parcel.tiempoConcepcion}. Los tiempos son orientativos y deben confirmarse según ruta y tráfico.`:'La ubicación exacta permite visualizar el entorno y preparar futuras cercanías automáticas con servicios, rutas y atractivos.';
const inv=investment();$('investment-level').textContent=inv.level;$('investment-reading').textContent=inv.reading;$('budget-parcel').textContent=money(price);$('budget-house').textContent=money(housePrice);if($('budget-foundation'))$('budget-foundation').textContent=money(project.foundationPrice||0);if($('budget-extras'))$('budget-extras').textContent=money(project.extrasPrice||0);$('budget-total').textContent=money(total);const imps=improvements();$('improvement-grid').innerHTML=imps.length?imps.map(x=>`<article class="improvement-card"><span class="line-icon">${icon('tools')}</span><div><strong>${x.title}</strong><small>${x.copy}</small></div></article>`).join(''):`<article class="improvement-card"><span class="line-icon">${icon('doc')}</span><div><strong>Proyecto bien preparado</strong><small>No detectamos pendientes principales en los antecedentes disponibles. Siempre conviene validar técnicamente antes de ejecutar.</small></div></article>`;$('snapshot-parcel').textContent=parcel.nombre||project.parcelName||'Parcela seleccionada';$('snapshot-parcel-meta').textContent=`${commune}${size?' · '+size.toLocaleString('es-CL')+' m²':''} · ${money(price)}`;$('snapshot-parcel-link').href=`./parcela.html?id=${encodeURIComponent(parcel.id||project.parcelId||'')}`;$('reserve-label').textContent=`Reservar por ${money(reserveAmount)}`;$('reserve-copy').textContent=`Corresponde al 1% del valor de la parcela (${money(price)}).`;$('project-page').hidden=false;document.title=`Proyecto en ${commune} | Tu Parcela Lista`;renderMap();renderTerritorialProject();renderProjectValuation()}

async function renderProjectValuation(){
 const identifier=parcel.canonicalId||parcel.id||project.parcelId||'';
 let a=null;
 // El motor ya no trae medianas comunales de respaldo; hay que esperar a que
 // tpl-data-service las cargue antes de calcular nada.
 try{ await (window.TPLReferenciasComunales||window.TPLDataService?.cargarReferenciasEnMotor?.()); }catch{}
 try{
  const latest=identifier&&window.TPLDataService?.getLatestCrmValuation?await window.TPLDataService.getLatestCrmValuation(identifier):null;
  window.latestValuation = latest;
  if(latest){
   const r=latest.resultado||{};
   // Estas tres lineas leian valor_tpl_tecnico, valor_tpl_promedio_comunal y
   // referencia_m2_utilizada: tres campos que el motor NUNCA devolvio. Siempre
   // daban 0 y la funcion caia al respaldo, asi que las tarjetas de valor de
   // esta pagina llevaban tiempo mostrando "—". Estos son los nombres reales.
   const technical=Number(r.valorTplTasadorAjustado||r.valor_tpl_tasador_ajustado||0);
   const observed=Number(r.valor_comunal||r.valorComunal||r.valorComunalBase||0);
   const suggested=Number(r.valorFinal||r.valor_recomendado||0);
   if(technical||observed||suggested){
    a={technicalValue:technical,observedCommunalValue:observed,suggestedCommunalValue:suggested,market:r.marketReference||null};
   }
  }
 }catch(error){console.warn('TPL Proyecto: no fue posible recuperar la tasación registrada.',error)}
 // analyze() es sincrona y solo devuelve {error:'Use analyzeAsync'}: el
 // respaldo tampoco entregaba cifras.
 if(!a) a=await window.TPLMarketIntelligence?.analyzeAsync?.(parcel)||null;
 const technical=Number(a?.technicalValue||0),observed=Number(a?.observedCommunalValue||0),suggested=Number(a?.suggestedCommunalValue||0);
 // 'project-value-suggested' no existe en proyecto.html (solo hay dos tarjetas:
 // tecnico y comunal). Sin esta guarda, la asignacion sobre null cortaba la
 // ejecucion aqui y las cuatro lineas siguientes nunca llegaban a correr, por lo
 // que "Promedio Comunal", la meta de mercado y la lectura quedaban en "—".
 const texto=(id,valor)=>{const el=$(id);if(el)el.textContent=valor;};
 texto('project-value-technical',technical?money(technical):'Por calcular');
 texto('project-value-suggested',suggested?money(suggested):'Por calcular');
 texto('project-value-observed',observed?money(observed):'Sin muestra validada');
 texto('project-value-market-meta',a?.market?.sampleSize?`${a.market.sampleSize} comparables · confianza ${String(a.market.confidence||'referencial').replace('-',' ')}`:'Referencia estadística pendiente de validación.');
 if(technical&&observed){const diff=Math.round(((technical-observed)/observed)*100);$('project-value-reading').textContent=`Tasación técnica ${Math.abs(diff)}% ${diff>=0?'sobre':'bajo'} el mercado observado`;$('project-value-explanation').textContent='El Valor Recomendado TPL es el promedio entre el Valor Técnico y el Promedio Comunal.'}
 else{$('project-value-reading').textContent='Tasación técnica independiente';$('project-value-explanation').textContent='El Valor Recomendado coincide con el cálculo técnico.'}
 
 const conitObj = window.latestValuation?.conit || window.latestValuation?.geoint || window.latestValuation?.resultado?.conit || window.latestValuation?.resultado?.geoint;
 if(conitObj) {
     renderConit(conitObj, conitObj);
 }
}

function loadLeaflet(){if(window.L)return Promise.resolve();return new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l);const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
async function renderMap(){const lat=num(parcel.lat||parcel.latitude),lng=num(parcel.lng||parcel.longitude);if(!lat||!lng){$('project-map').innerHTML='<div class="map-placeholder"><strong>Ubicación por confirmar</strong><small>No hay coordenadas suficientes para mostrar el mapa.</small></div>';return}try{await loadLeaflet();$('project-map').innerHTML='';const map=L.map('project-map',{scrollWheelZoom:false}).setView([lat,lng],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);L.marker([lat,lng]).addTo(map).bindPopup(`<div style="text-align:center; min-width:150px; font-family:'Outfit',sans-serif;"><strong style="color:#0f172a; font-size:1.05rem;">Ubicación de tu proyecto</strong><br><span style="color:#64748b; font-size:0.9rem;">${parcel.nombre || 'Parcela'}</span></div>`).openPopup()}catch{$('project-map').innerHTML='<div class="map-placeholder"><strong>Mapa temporalmente no disponible</strong><small>La ubicación del proyecto sigue guardada.</small></div>'}}
const dialog=$('project-action-dialog');let action='';const configs={call:{kicker:'ASESORÍA TPL',title:'Quiero que me llamen',description:'Dinos cuándo te acomoda y un asesor recibirá el contexto completo del proyecto.',fields:`<label>Nombre<input name="name" required></label><label>Teléfono<input name="phone" required inputmode="tel"></label><label>Horario preferido<select name="time"><option>Mañana</option><option>Mediodía</option><option>Tarde</option><option>Después de las 18:00</option></select></label><label>Motivo<select name="reason"><option>Revisar proyecto completo</option><option>Presupuesto</option><option>Parcela</option><option>Vivienda</option><option>Financiamiento</option></select></label>`},question:{kicker:'PREGUNTA SOBRE EL PROYECTO',title:'Haz una pregunta concreta',description:'La pregunta quedará vinculada a esta parcela y vivienda para que la respuesta tenga contexto.',fields:`<label>Nombre<input name="name" required></label><label>Correo<input name="email" type="email" required></label><label class="full">Pregunta<textarea name="question" required placeholder="Escribe tu pregunta..."></textarea></label>`},visit:{kicker:'VISITA A LA PARCELA',title:'Solicitar una visita',description:'Indica una fecha preferida. La visita queda solicitada hasta que TPL o el propietario confirme disponibilidad.',fields:`<label>Nombre<input name="name" required></label><label>Teléfono<input name="phone" required inputmode="tel"></label><label>Fecha preferida<input name="date" type="date" required></label><label>Horario<select name="time"><option>Mañana</option><option>Mediodía</option><option>Tarde</option></select></label>`},reserve:{kicker:'RESERVA DE PARCELA',title:`Reservar por ${money(reserveAmount)}`,description:`El monto corresponde al 1% del valor publicado de la parcela. Al confirmar el pago, TPL debe enviar al correo los antecedentes de la reserva y próximos pasos.`,fields:`<label>Nombre<input name="name" required></label><label>Teléfono<input name="phone" required inputmode="tel"></label><label class="full">Correo para comprobante<input name="email" type="email" required></label><label class="full">Monto de reserva<input value="${money(reserveAmount)}" readonly></label>`}};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{action=b.dataset.action;const c=configs[action];$('action-kicker').textContent=c.kicker;$('action-title').textContent=c.title;$('action-description').textContent=c.description;$('action-fields').innerHTML=c.fields;$('action-submit').textContent=action==='reserve'?`Continuar con reserva · ${money(reserveAmount)}`:'Enviar solicitud';$('action-status').textContent='';$('action-consent').checked=false;dialog.showModal()});
$('project-action-form').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!$('action-consent').checked){$('action-status').textContent='Debes autorizar el contacto para continuar.';return}
  const fd=new FormData(e.currentTarget);
  const clientData=Object.fromEntries(fd.entries());
  const payload={action,projectId:project.id,parcelId:project.parcelId,parcelName:project.parcelName,parcelPrice:price,reserveAmount:action==='reserve'?reserveAmount:null,total,client:clientData,createdAt:new Date().toISOString(),status:'pendiente'};

  // La reserva cobra de verdad (Flow): el monto lo calcula el servidor a
  // partir del precio publicado, nunca se manda desde aquí. Ver
  // supabase/functions/crear-pago-reserva.
  if(action==='reserve'){
    if(!window.TPLDataService?.startReservationPayment){
      $('action-status').textContent='El pago de reservas no está disponible en este momento. Intenta más tarde.';
      return;
    }
    $('action-submit').disabled=true;
    $('action-status').textContent='Redirigiendo a la pasarela de pago segura...';
    try{
      const reservaPayload={parcela_codigo:project.parcelId,contacto:{nombre:clientData.name,email:clientData.email,telefono:clientData.phone},origen:'proyecto'};
      const pago=await window.TPLDataService.startReservationPayment(reservaPayload);
      window.location.href=pago.payment_url;
    }catch(error){
      console.error('TPL Proyecto: no se pudo iniciar el pago de la reserva.',error);
      $('action-status').textContent=error?.message||'No pudimos iniciar el pago de la reserva. Intenta nuevamente.';
      $('action-submit').disabled=false;
    }
    return;
  }

  // "Llamar", "Preguntar" y "Visitar" usaban window.TPLDataService.createProjectAction,
  // que no existe en tpl-data-service.js: las 3 acciones fallaban siempre.
  // Se reemplaza por createPublicOpportunity, la misma vía que ya usa el
  // cotizador para dejar oportunidades públicas (tpl_registrar_oportunidad_publica_v1).
  const mensajesPorAccion={
    call:`Solicita que lo llamen. Horario preferido: ${clientData.time||'sin indicar'}. Motivo: ${clientData.reason||'sin indicar'}.`,
    question:clientData.question||'',
    visit:`Solicita visita a la parcela. Fecha preferida: ${clientData.date||'sin indicar'}. Horario: ${clientData.time||'sin indicar'}.`
  };
  const oportunidadPayload={
    nombre_contacto:clientData.name,
    email:clientData.email||undefined,
    telefono:clientData.phone||undefined,
    tipo:'consulta',
    origen:'proyecto',
    mensaje:mensajesPorAccion[action]||'',
    metadata:{
      subtipo:action,
      parcela_codigo:project.parcelId,
      project_id:project.id,
      parcel_name:project.parcelName,
      total
    }
  };
  try{
    if(!window.TPLDataService?.createPublicOpportunity)throw new Error('El registro de solicitudes no está disponible en este momento.');
    const saved=await window.TPLDataService.createPublicOpportunity(oportunidadPayload);
    $('action-status').textContent=`Solicitud registrada (${saved.codigo}). Te contactaremos pronto.`;
    setTimeout(()=>dialog.close(),1600)
  }catch(error){
    console.error('TPL Proyecto: solicitud no guardada.',error);
    $('action-status').textContent=error?.message||'No pudimos registrar la solicitud. No se mostrará como enviada; intenta nuevamente.';
  }
});
render();
})();
