(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const normalize = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const priceNumber = (v) => Number(String(v || "").replace(/[^0-9]/g, "")) || 0;
  const positive = (v) => ["si","sí","true","1","disponible","incluido","con"].some(x => normalize(v) === normalize(x));
  const formatMoney = (n) => n ? new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n) : "Consultar";
  const sizeOf = (p) => Number(p.tamano || p.metros || p.superficie || 0);
  const soilOf = (p) => p.tipoSuelo || p.tipo_suelo || p.suelo || p.topografia || p.terreno || inferSoil(p);
  const absoluteAsset = (path) => {
    const value = String(path || "");
    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
    try{return new URL(value.replace(/^\.\//, ""), document.baseURI).href}catch{return value}
  };
  function inferSoil(p){
    const t=normalize([p.descripcion,p.detalle,p.nombre].join(" "));
    if(/plano|nivelado/.test(t)) return "Principalmente plano";
    if(/lomaje|loma|ondulado/.test(t)) return "Lomaje suave";
    if(/pendiente|cerro/.test(t)) return "Con pendiente";
    return "Por confirmar";
  }
  function catalog(){ try{return Array.isArray(parcelas)?parcelas:[]}catch{return[]} }
  function getContext(){
    let saved={}; try{saved=JSON.parse(sessionStorage.getItem("tpl_search_context")||"{}")}catch{}
    return {
      method: params.get("origen") || saved.method || "",
      priority: params.get("prioridad") || saved.priority || "",
      commune: params.get("comuna") || saved.commune || "",
      distance: params.get("distancia") || saved.distance || null
    };
  }
  function mapCanonical(row, fallback={}){
    if(!row) return fallback;
    return {
      ...fallback,
      id: row.codigo || row.id || fallback.id,
      canonicalId: row.id || null,
      codigo: row.codigo || fallback.codigo || '',
      nombre: row.titulo || fallback.nombre,
      descripcion: row.descripcion || fallback.descripcion,
      region: row.region || fallback.region,
      comuna: row.comuna || fallback.comuna,
      sector: row.sector || fallback.sector,
      lat: row.lat ?? fallback.lat,
      lng: row.lng ?? fallback.lng,
      tamano: row.superficie_m2 ?? fallback.tamano,
      superficie: row.superficie_m2 ?? fallback.superficie,
      precio: row.precio_publicado ? formatMoney(row.precio_publicado) : fallback.precio,
      precioNumero: row.precio_publicado || fallback.precioNumero,
      rol: row.rol_situacion || fallback.rol,
      electricidad: row.electricidad ?? fallback.electricidad,
      luz: row.electricidad ?? fallback.luz,
      agua: row.agua ?? fallback.agua,
      acceso: row.acceso || fallback.acceso,
      topografia: row.topografia || fallback.topografia,
      suelo: row.suelo || fallback.suelo,
      cierre_perimetral: row.cierre_perimetral ?? fallback.cierre_perimetral,
      porton: row.porton ?? fallback.porton,
      atributos_naturales: row.atributos_naturales || fallback.atributos_naturales,
      diagnostico: row.diagnostico || fallback.diagnostico,
      imagenes: Array.isArray(row.imagenes) ? row.imagenes : fallback.imagenes,
      imagen: row.imagen || (Array.isArray(row.imagenes) ? row.imagenes[0] : '') || fallback.imagen,
      metadata: row.metadata || fallback.metadata,
      fuenteDatos: 'supabase'
    };
  }

  async function loadParcel(identifier){
    const wanted=normalize(decodeURIComponent(String(identifier||"")));
    const fallback=catalog().find(p=>[p.id,p.codigo,p.slug,p.source_legacy_id].some(v=>normalize(v)===wanted)) || {};
    try{
      const remote=await window.TPLDataService?.getPublishedPropertyById?.(identifier);
      if(remote) return mapCanonical(remote,fallback);
    }catch(error){
      console.warn('TPL Parcela: se utilizará el respaldo local.',error);
    }
    return Object.keys(fallback).length ? {...fallback,fuenteDatos:'respaldo-local'} : null;
  }

  function formatInputMoney(input){
    if(!input) return;
    const value=priceNumber(input.value);
    input.value=value?formatMoney(value):"";
  }

  async function submitProposal(event){
    event.preventDefault();
    const form=event.currentTarget;
    const statusNode=$("proposal-status");
    const submitButton=form?.querySelector('[type="submit"]');
    const proposalType=$("proposal-type")?.value||"oferta";
    const payload={
      tipo:proposalType,
      propiedad_id:null,
      propiedad_codigo:"",
      propiedad_nombre:"",
      nombre_contacto:$("proposal-name")?.value?.trim()||"",
      email:$("proposal-email")?.value?.trim()||"",
      telefono:$("proposal-phone")?.value?.trim()||"",
      monto_oferta:proposalType==="oferta"?priceNumber($("proposal-amount")?.value):null,
      condicion:$("proposal-condition")?.value?.trim()||"",
      mensaje:$("proposal-message")?.value?.trim()||"",
      origen:"parcela.html"
    };
    if(!payload.nombre_contacto||!payload.email){
      if(statusNode) statusNode.textContent="Completa tu nombre y correo.";
      return;
    }
    payload.propiedad_id=currentParcel?.canonicalId||null;
    payload.propiedad_codigo=currentParcel?.codigo||currentParcel?.id||"";
    payload.propiedad_nombre=currentParcel?.nombre||"Parcela";
    try{
      if(submitButton) submitButton.disabled=true;
      if(statusNode) statusNode.textContent="Enviando solicitud...";
      if(window.TPLDataService?.createPublicOpportunity){
        await window.TPLDataService.createPublicOpportunity(payload);
      }else{
        const backup=JSON.parse(localStorage.getItem("tpl_public_opportunities")||"[]");
        backup.push({...payload,created_at:new Date().toISOString()});
        localStorage.setItem("tpl_public_opportunities",JSON.stringify(backup));
      }
      form.reset();
      if($("proposal-type")) $("proposal-type").value="oferta";
      if($("offer-amount-field")) $("offer-amount-field").hidden=false;
      if($("improvement-field")) $("improvement-field").hidden=true;
      if(statusNode) statusNode.textContent="Solicitud enviada correctamente.";
    }catch(error){
      console.error("TPL Parcela: no fue posible enviar la solicitud.",error);
      if(statusNode) statusNode.textContent="No fue posible enviar ahora. Intenta nuevamente.";
    }finally{
      if(submitButton) submitButton.disabled=false;
    }
  }

  let currentParcel=null;

  async function init(){
    const id=params.get("id") || params.get("codigo") || params.get("parcela");
    if(!id){
      console.warn("TPL Parcela: la URL no contiene id, codigo ni parcela.");
      $("not-found").hidden=false;
      return;
    }
    const parcel=await loadParcel(id);
    if(!parcel){ $("not-found").hidden=false; return; }
    currentParcel=parcel;
    const context=getContext();
  const images=(Array.isArray(parcel.imagenes)&&parcel.imagenes.length?parcel.imagenes:[parcel.imagen]).filter(Boolean).map(absoluteAsset);
  let imageIndex=0;
  const size=sizeOf(parcel), price=Number(parcel.precioNumero)||priceNumber(parcel.precio), type=size>=10000?"Campo":"Parcela";
  function contextLabel(){
    const labels={distance:"más cercanas",payment:"facilidad de pago",nature:"entorno natural",services:"servicios cercanos",economic:"precio más económico",large:"1 hectárea o más",opportunity:"Oportunidad TPL"};
    if(context.method==="nearby") return `Encontrada entre las ${labels[context.priority]||"parcelas cercanas"}${context.distance?` · A ${context.distance} km de tu ubicación`:""}`;
    if(context.method==="commune") return `Encontrada en ${context.commune||parcel.comuna}${context.priority?` · Priorizando ${labels[context.priority]||context.priority}`:""}`;
    return "Parcela seleccionada en Tu Parcela Lista";
  }
  function tags(){
    const out=[];
    if(positive(parcel.facilidad)||positive(parcel.facilidad_pago)) out.push("Facilidad de pago");
    if(positive(parcel.naturaleza)) out.push("Entorno natural");
    if(positive(parcel.servicios)||positive(parcel.servicios_cerca)) out.push("Servicios cerca");
    if(positive(parcel.agua)) out.push("Agua informada");
    if(positive(parcel.luz)||positive(parcel.electricidad)) out.push("Electricidad");
    if(positive(parcel.rol)) out.push("Rol propio");
    return out;
  }
  function status(label,value,yes="Disponible",no="No informado"){
    return `<article class="status-item"><span>${label}</span><strong>${positive(value)?yes:no}</strong></article>`;
  }
  function diagnosis(){
    const included=[], pending=[];
    if(positive(parcel.rol)) included.push("Rol propio informado"); else pending.push("Confirmar situación de rol y documentación");
    if(positive(parcel.luz)||positive(parcel.electricidad)) included.push("Electricidad o factibilidad informada"); else pending.push("Confirmar solución eléctrica o paneles solares");
    if(positive(parcel.agua)) included.push("Disponibilidad de agua informada"); else pending.push("Definir puntera, pozo u otra solución de agua");
    const text=normalize([parcel.descripcion,parcel.detalle].join(" "));
    if(/cercad|cerco|cierre perimetral/.test(text)) included.push("Cerco o cierre informado"); else pending.push("Evaluar cerco perimetral");
    if(/porton|portón/.test(text)) included.push("Portón informado"); else pending.push("Evaluar portón de acceso");
    if(/fosa|alcantarillado/.test(text)) included.push("Solución sanitaria informada"); else pending.push("Definir fosa o solución sanitaria");
    if(/acceso|camino/.test(text)) included.push("Acceso o camino mencionado"); else pending.push("Confirmar estado del acceso");
    return {included,pending};
  }
  function marketAnalysis(){
    return window.TPLMarketIntelligence?.analyze?.(parcel) || null;
  }
  function opportunityBand(score){
    if(score>=95) return {key:'exceptional',label:'Oportunidad excepcional',seal:'Sello TPL Oro'};
    if(score>=85) return {key:'excellent',label:'Muy buena compra',seal:'Sello TPL Oro'};
    if(score>=70) return {key:'competitive',label:'Precio competitivo',seal:'Sello TPL Plata'};
    if(score>=55) return {key:'caution',label:'Revisar condiciones',seal:'Evaluación TPL'};
    return {key:'high',label:'Sobre referencia',seal:'Evaluación TPL'};
  }
  function factorScore(value, fallback=45){
    if(positive(value)) return 100;
    const v=normalize(value);
    if(/factibilidad|cercan|disponib|proyectad|posib/.test(v)) return 70;
    if(/no|sin|pendiente|desconoc/.test(v)) return 25;
    return fallback;
  }
  function buildOpportunity(){
    const a=marketAnalysis()||{};
    const published=Number(parcel.precio||0);
    const technical=Number(a.technicalValue||a.tpl?.ideal||0);
    const observed=Number(a.observedCommunalValue||0);
    const suggested=Number(a.suggestedCommunalValue||technical||observed||published||0);

    let priceScore=60;
    if(published&&suggested){
      const ratio=published/suggested;
      if(ratio<=.80) priceScore=100;
      else if(ratio<=.90) priceScore=92;
      else if(ratio<=.97) priceScore=84;
      else if(ratio<=1.05) priceScore=74;
      else if(ratio<=1.15) priceScore=58;
      else if(ratio<=1.30) priceScore=40;
      else priceScore=22;
    }
    const accessText=normalize([parcel.acceso,parcel.tipoAcceso,parcel.camino,parcel.descripcion].join(' '));
    const access=/paviment|asfalt/.test(accessText)?100:/ripio|estabiliz|buen acceso|camino publico/.test(accessText)?82:/servidumbre|camino interior/.test(accessText)?62:45;
    const topo=normalize(parcel.topografia||parcel.pendiente||'');
    const topography=/plana|regular|suave/.test(topo)?92:/mixta|ondulad/.test(topo)?72:/pendiente|quebrad/.test(topo)?48:58;
    const natureText=normalize([parcel.vista,parcel.vegetacion,parcel.entorno,parcel.descripcion].join(' '));
    const nature=/rio|lago|bosque nativo|vista|volcan|estero|naturaleza/.test(natureText)?90:/rural|campo|vegetacion/.test(natureText)?72:55;
    const signals=Array.isArray(a.signals)?a.signals.length:0;
    const investment=Math.min(95,55+(signals*7)+(a?.tone==='opportunity'?18:a?.tone==='good'?10:0));

    const factors=[
      {key:'price',label:'Precio frente a referencia',score:priceScore,weight:40},
      {key:'access',label:'Acceso',score:access,weight:10},
      {key:'water',label:'Agua',score:factorScore(parcel.agua),weight:8},
      {key:'power',label:'Electricidad',score:factorScore(parcel.luz||parcel.electricidad),weight:8},
      {key:'role',label:'Documentación y rol',score:factorScore(parcel.rol),weight:8},
      {key:'topography',label:'Topografía para construir',score:topography,weight:8},
      {key:'nature',label:'Entorno y calidad de vida',score:nature,weight:8},
      {key:'investment',label:'Potencial de inversión',score:investment,weight:10}
    ];
    const score=Math.max(0,Math.min(100,Math.round(factors.reduce((sum,f)=>sum+(f.score*f.weight/100),0))));
    return {score,band:opportunityBand(score),factors,published,observed,suggested,technical,a};
  }
  function valuation(){
    const result=buildOpportunity();
    const {score,band}=result;
    const card=$('opportunity-card');
    if(card) card.className=`opportunity-card is-${band.key}`;
    $('opportunity-score-value').textContent=score;
    $('opportunity-label').textContent=band.label;
    $('opportunity-seal').textContent=band.seal;
    $('opportunity-meter-fill').style.width=`${score}%`;
    $('opportunity-meter-marker').style.left=`${score}%`;

    const diff=result.published&&result.suggested?Math.round(((result.published-result.suggested)/result.suggested)*100):null;
    let summary='La nota combina precio, acceso, servicios, documentación, topografía y potencial de inversión.';
    if(diff!==null){
      if(diff<=-10) summary=`El precio publicado está ${Math.abs(diff)}% bajo la referencia TPL y presenta una posición atractiva para compradores.`;
      else if(diff<0) summary=`El precio publicado está ${Math.abs(diff)}% bajo la referencia TPL y se mantiene competitivo.`;
      else if(diff<=5) summary='El precio publicado se encuentra alineado con la referencia TPL para propiedades comparables.';
      else summary=`El precio publicado está ${diff}% sobre la referencia TPL; conviene revisar los atributos que justifican esa diferencia.`;
    }
    $('opportunity-summary').textContent=summary;

    const factors=$('opportunity-factors');
    factors.innerHTML=result.factors.map(f=>{
      const level=f.score>=85?'Excelente':f.score>=70?'Bueno':f.score>=55?'Aceptable':'Por confirmar';
      return `<article class="factor-row is-${f.score>=85?'high':f.score>=70?'good':f.score>=55?'mid':'low'}"><div><span>${f.label}</span><small>${level}</small></div><strong>${Math.round(f.score)}/100</strong></article>`;
    }).join('');

    const values=[result.observed,result.published,result.suggested,result.technical].filter(v=>v>0);
    const max=Math.max(...values,1);
    const setBar=(id,value)=>{$(id).style.width=value?`${Math.max(6,Math.min(100,(value/max)*100))}%`:'0%';};
    setBar('price-bar-observed',result.observed);
    setBar('price-bar-published',result.published);
    setBar('price-bar-suggested',result.suggested);
    setBar('price-bar-technical',result.technical);
    $('price-observed').textContent=result.observed?formatMoney(result.observed):'Sin muestra';
    $('price-published').textContent=result.published?formatMoney(result.published):'Consultar';
    $('price-suggested').textContent=result.suggested?formatMoney(result.suggested):'En análisis';
    $('price-technical').textContent=result.technical?formatMoney(result.technical):'En análisis';

    const strongest=[...result.factors].sort((a,b)=>b.score-a.score).slice(0,2).map(f=>f.label.toLowerCase());
    $('opportunity-reading').textContent=`Sus principales fortalezas son ${strongest.join(' y ')}. La nota debe interpretarse junto con una visita, revisión documental y factibilidades del proyecto.`;
    $('opportunity-source').textContent=result.a?.market
      ? `Análisis TPL basado en ${result.a.market.sampleSize} propiedades comparables de ${parcel.comuna}. Confianza ${String(result.a.market.confidence||'referencial').replace('-',' ')}.`
      : 'Análisis TPL basado en precio y atributos declarados. La referencia comunal se incorporará cuando exista una muestra validada.';
  }
  function renderInvestment(){
    valuation();
  }
  function setImage(){
    $("main-image").src=images[imageIndex]||"./assets/logo-tu-parcela-lista.png";
    $("main-image").alt=`${parcel.nombre||type} · fotografía ${imageIndex+1}`;
    $("gallery-count").textContent=images.length?`${imageIndex+1} / ${images.length}`:"";
    $("gallery-prev").hidden=images.length<2; $("gallery-next").hidden=images.length<2;
    const hero=$("parcel-emotional-hero");
    if(hero && images[imageIndex]){hero.style.setProperty("--tpl-hero-photo",`url("${images[imageIndex].replace(/"/g,"%22")}")`);hero.classList.add("has-parcel-photo")}
  }
  function persistParcelForProject(){
    try{
      localStorage.setItem("selectedParcelaId",String(parcel.id||""));
      localStorage.setItem("selectedParcelaData",JSON.stringify(parcel));
      localStorage.setItem("tpl_project_origin","parcela.html");
      localStorage.setItem("tpl_project_context",JSON.stringify({version:1,parcela_id:parcel.canonicalId||null,parcela_codigo:parcel.codigo||parcel.id||'',nombre:parcel.nombre||type,comuna:parcel.comuna||'',superficie_m2:size,precio_publicado:price,updated_at:new Date().toISOString()}));
    }catch(error){console.warn("TPL: no fue posible guardar respaldo local de la parcela.",error)}
  }
  function cotizadorUrl(kind){
    persistParcelForProject();
    const q=new URLSearchParams({parcela:String(parcel.id||""),tipo:kind,origen:context.method||"ficha"});
    if(context.priority)q.set("prioridad",context.priority);
    if(context.distance)q.set("distancia",context.distance);
    return `./cotizador.html?${q.toString()}`;
  }

  async function renderTerritorialProfile(parcel){
    const section=$("analisis-territorial");
    if(!section||!window.TPLDataService?.getTerritorialPublicSummary)return;
    const identifier=parcel.canonicalId||parcel.codigo||parcel.id;
    try{
      const a=await window.TPLDataService.getTerritorialPublicSummary(identifier);
      if(!a)return;
      const idx=a.indices_tpl||{},dist=a.distancias||{},infra=a.infraestructura||{},sum=a.resumen_publico||{};
      const cards=[
        ['Índice territorial',idx.territorial?.score!=null?`${idx.territorial.score}/100 · ${idx.territorial.label||''}`:'En análisis'],
        ['Accesibilidad',a.accesibilidad?.tipo||a.accesibilidad?.topografia||'Por confirmar'],
        ['Centro comunal',dist.centro_comuna_km!=null?`${Number(dist.centro_comuna_km).toFixed(1).replace('.',',')} km aprox.`:'Por confirmar'],
        ['Servicios básicos',[infra.agua?'Agua declarada':null,infra.electricidad?'Electricidad declarada':null].filter(Boolean).join(' · ')||'Por confirmar']
      ];
      $("territorial-summary-grid").innerHTML=cards.map(([l,v])=>`<article><span>${l}</span><strong>${v}</strong></article>`).join('');
      const rec=Array.isArray(a.recomendaciones)?a.recomendaciones:[];
      $("territorial-public-advice").innerHTML=rec.slice(0,4).map(r=>`<div><strong>${r.title||'Recomendación TPL'}</strong><small>${r.detail||''}</small></div>`).join('')||`<div><strong>${sum.headline||'Ubicación analizada por TPL'}</strong><small>${sum.confidence||''}</small></div>`;
      $("territorial-confidence").textContent=sum.confidence||'Información orientativa basada en antecedentes declarados y cálculos TPL.';
      section.hidden=false;
    }catch(error){console.warn('TPL Parcela: perfil territorial no disponible.',error)}
  }

  function render(){
    document.title=`${parcel.nombre||type} | Tu Parcela Lista`;
    $("search-memory").textContent=`${contextLabel()}${parcel.fuenteDatos==='respaldo-local'?' · Datos de respaldo':''}`;
    $("parcel-name").textContent=parcel.nombre||`${type} en ${parcel.comuna||"Chile"}`;
    $("parcel-price").textContent=parcel.precio||formatMoney(price);
    $("fact-distance").textContent=context.distance?`${context.distance} km desde tu ubicación`:parcel.distanciaConcepcion||"Por calcular";
    $("fact-commune").textContent=parcel.comuna||"Por confirmar";
    $("fact-size").textContent=size?`${size.toLocaleString("es-CL")} m² · ${type}`:"Por confirmar";
    $("fact-soil").textContent=soilOf(parcel);
    $("primary-tags").innerHTML=tags().map(x=>`<span>${x}</span>`).join("");
    $("parcel-description").textContent=parcel.descripcion||"Información descriptiva pendiente de confirmar.";
    $("confirmed-grid").innerHTML=status("Rol",parcel.rol,"Informado")+status("Electricidad",parcel.luz||parcel.electricidad,"Informada")+status("Agua",parcel.agua,"Informada")+status("Servicios cerca",parcel.servicios||parcel.servicios_cerca,"Informados");
    const d=diagnosis();
    $("included-list").innerHTML=d.included.map(x=>`<li>${x}</li>`).join("")||"<li>Sin antecedentes confirmados suficientes</li>";
    $("pending-list").innerHTML=d.pending.map(x=>`<li>${x}</li>`).join("")||"<li>No se detectaron pendientes principales</li>";
    $("aside-name").textContent=parcel.nombre||type;
    $("aside-meta").textContent=`${parcel.comuna||"Comuna por confirmar"} · ${size?size.toLocaleString("es-CL")+" m²":"Superficie por confirmar"}`;
    $("prefab-link").href=cotizadorUrl("prefabricada");
    $("custom-link").href=cotizadorUrl("diseno-propio");
    $("prefab-link").addEventListener("click",persistParcelForProject,{once:false});
    $("custom-link").addEventListener("click",persistParcelForProject,{once:false});
    renderInvestment(); setImage(); $("parcel-page").hidden=false; renderTerritorialProfile(parcel);
  }
  function loadLeaflet(){
    if(window.L)return Promise.resolve();
    return new Promise((resolve,reject)=>{const l=document.createElement("link");l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(l);const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  }
  async function showMap(){
    const lat=Number(parcel.lat||parcel.latitude||parcel.latitud),lng=Number(parcel.lng||parcel.lon||parcel.longitude||parcel.longitud);
    if(!lat||!lng){$("map").innerHTML="<p>La ubicación exacta todavía no está disponible.</p>";return}
    $("map").innerHTML="";
    try{await loadLeaflet();const map=L.map("map",{scrollWheelZoom:false}).setView([lat,lng],13);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);L.circle([lat,lng],{radius:650,color:"#0d5b86",fillColor:"#0d5b86",fillOpacity:.12,weight:2}).addTo(map).bindPopup("Ubicación aproximada · "+(parcel.comuna||type)).openPopup()}catch{$("map").innerHTML="<p>No fue posible cargar el mapa.</p>"}
  }
  $("gallery-prev").addEventListener("click",()=>{imageIndex=(imageIndex-1+images.length)%images.length;setImage()});
  $("gallery-next").addEventListener("click",()=>{imageIndex=(imageIndex+1)%images.length;setImage()});
  $("share-button").addEventListener("click",async()=>{try{if(navigator.share)await navigator.share({title:parcel.nombre,text:parcel.descripcion,url:location.href});else{await navigator.clipboard.writeText(location.href);$("share-button").textContent="Enlace copiado"}}catch{}});
  document.querySelectorAll(".owner-option").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll(".owner-option").forEach(x=>x.classList.toggle("is-active",x===button));
    const type=button.dataset.ownerAction;$('proposal-type').value=type;$('offer-amount-field').hidden=type!=="oferta";$('improvement-field').hidden=type!=="mejoras";
  }));
  $('proposal-amount')?.addEventListener('blur',()=>formatInputMoney($('proposal-amount')));
  $('owner-proposal-form')?.addEventListener('submit',submitProposal);
  $("load-map").addEventListener("click",showMap);
  $("menu-toggle").addEventListener("click",()=>{const m=$("mobile-menu"),open=m.hidden;m.hidden=!open;$("menu-toggle").setAttribute("aria-expanded",String(open))});
  render();
  }

  init().catch(error=>{console.error('TPL Parcela:',error);$("parcel-page").hidden=true;$("not-found").hidden=false;});
})();
