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

  async function init(){
    const id=params.get("id") || params.get("codigo") || params.get("parcela");
    if(!id){
      console.warn("TPL Parcela: la URL no contiene id, codigo ni parcela.");
      $("not-found").hidden=false;
      return;
    }
    const parcel=await loadParcel(id);
    if(!parcel){ $("not-found").hidden=false; return; }
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
  function valuation(){
    const a=marketAnalysis();
    const technical=Number(a?.technicalValue||a?.tpl?.ideal||0);
    const observed=Number(a?.observedCommunalValue||0);
    const suggested=Number(a?.suggestedCommunalValue||technical||observed||0);
    const urgency=Number(a?.urgencyValue||0);
    $('valuation-technical').textContent=technical?formatMoney(technical):'Antecedentes insuficientes';
    $('valuation-suggested').textContent=suggested?formatMoney(suggested):'En construcción';
    $('valuation-observed').textContent=observed?formatMoney(observed):'Sin muestra validada';
    $('valuation-urgency').textContent=urgency?formatMoney(urgency):'En construcción';
    $('valuation-market-note').textContent=a?.market?`${a.market.sampleSize} comparables · confianza ${String(a.market.confidence||'referencial').replace('-',' ')}`:'Aún no hay referencia comunal validada';
    $('valuation-position').textContent=a?.label||'Lectura orientativa';
    $('valuation-reading').className=`valuation-reading is-${a?.tone||'neutral'}`;
    const diff=technical&&observed?Math.round(((technical-observed)/observed)*100):null;
    $('valuation-explanation').textContent=diff===null
      ? 'El TPL Valor Tasación se mantiene técnico e independiente. El sugerido utiliza el mercado comunal solo cuando existe una muestra validada.'
      : `El TPL Valor Tasación está ${Math.abs(diff)}% ${diff>=0?'sobre':'bajo'} el valor observado comunal. El TPL Valor Comunal Sugerido equilibra ambos resultados.`;
  }
  function renderInvestment(){
    const a=marketAnalysis();
    if(!a){
      $('investment-reading').textContent='Antecedentes insuficientes';
      $('investment-source').textContent='No fue posible ejecutar el motor TPL';
      $('investment-explanation').textContent='La publicación necesita región, comuna y superficie para generar una lectura básica.';
      return;
    }
    const technical=Number(a.technicalValue||a.tpl?.ideal||0), observed=Number(a.observedCommunalValue||0), suggested=Number(a.suggestedCommunalValue||0), urgency=Number(a.urgencyValue||0);
    const values=[urgency,observed,suggested,technical].filter(Boolean),max=Math.max(...values,1);
    const width=v=>v?`${Math.max(8,Math.min(100,(v/max)*100))}%`:'0%';
    $('bar-urgency').style.width=width(urgency);
    $('bar-reference').style.width=width(observed);
    $('bar-suggested').style.width=width(suggested);
    $('bar-tpl').style.width=width(technical);
    $('bar-urgency-value').textContent=urgency?formatMoney(urgency):'—';
    $('bar-reference-value').textContent=observed?formatMoney(observed):'Sin muestra';
    $('bar-suggested-value').textContent=suggested?formatMoney(suggested):'—';
    $('bar-tpl-value').textContent=technical?formatMoney(technical):'—';
    $('investment-reading').textContent=a.label;
    const tier=window.TPLMarketIntelligence?.commercialTier?.(parcel,a);
    $('investment-badge').textContent=tier?.key&&tier.key!=='none'?tier.label:a.label;
    $('investment-badge').className=`investment-badge is-${tier?.key&&tier.key!=='none'?tier.key:a.tone}`;
    $('investment-source').textContent=a.market?`Motor TPL + ${a.market.sampleSize} comparables validados de ${parcel.comuna}`:'Motor TPL independiente · referencia comunal aún no validada';
    const marketNote=$('market-comparison-note');
    if(technical&&observed){
      const diff=Math.round(((technical-observed)/observed)*100);
      marketNote.textContent=`La tasación técnica se ubica ${Math.abs(diff)}% ${diff>=0?'sobre':'bajo'} el mercado observado. El valor sugerido es el promedio entre ambos.`;
    }else marketNote.textContent='El valor sugerido coincide temporalmente con la tasación técnica hasta contar con mercado comunal validado.';
    $('investment-explanation').textContent=a.summary;
    const signals=$('investment-signals');
    signals.innerHTML=(a.signals||[]).map(x=>`<span>${x}</span>`).join('');
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
    valuation(); renderInvestment(); setImage(); $("parcel-page").hidden=false; renderTerritorialProfile(parcel);
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
  $('proposal-amount').addEventListener('blur',()=>formatInputMoney($('proposal-amount')));
  $('owner-proposal-form').addEventListener('submit',submitProposal);
  $("load-map").addEventListener("click",showMap);
  $("menu-toggle").addEventListener("click",()=>{const m=$("mobile-menu"),open=m.hidden;m.hidden=!open;$("menu-toggle").setAttribute("aria-expanded",String(open))});
  render();
  }

  init().catch(error=>{console.error('TPL Parcela:',error);$("parcel-page").hidden=true;$("not-found").hidden=false;});
})();
