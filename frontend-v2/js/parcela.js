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
    const published=a?.publishedM2||0, tplM2=a?.tplM2||0, marketM2=a?.marketM2||0;
    $('valuation-published-m2').textContent=published?`${formatMoney(published)} / m²`:'No calculable';
    $('valuation-tpl-m2').textContent=tplM2?`${formatMoney(tplM2)} / m²`:'Antecedentes insuficientes';
    $('valuation-market-m2').textContent=marketM2?`${formatMoney(marketM2)} / m²`:'En construcción';
    $('valuation-market-note').textContent=a?.market?`${a.market.sampleSize} comparables · confianza ${String(a.market.confidence||'referencial').replace('-',' ')}`:'Aún no hay referencia comunal validada';
    $('valuation-position').textContent=a?.label||'Sin lectura suficiente';
    $('valuation-reading').className=`valuation-reading is-${a?.tone||'neutral'}`;
    $('valuation-explanation').textContent=a?.summary||'Aún faltan antecedentes suficientes para comparar el precio.';
  }
  function renderInvestment(){
    const a=marketAnalysis();
    if(!a){
      $('investment-reading').textContent='Antecedentes insuficientes';
      $('investment-source').textContent='No fue posible ejecutar el motor TPL';
      $('investment-explanation').textContent='La publicación necesita más información estructurada para generar una comparación responsable.';
      return;
    }
    const values=[a.publishedM2,a.tplM2,a.marketM2].filter(Boolean),max=Math.max(...values,1);
    const width=v=>v?`${Math.max(8,Math.min(100,(v/max)*100))}%`:'0%';
    $('bar-published').style.width=width(a.publishedM2);
    $('bar-tpl').style.width=width(a.tplM2);
    $('bar-reference').style.width=width(a.marketM2);
    $('bar-published-value').textContent=a.publishedM2?`${formatMoney(a.publishedM2)} / m²`:'No calculable';
    $('bar-tpl-value').textContent=a.tplM2?`${formatMoney(a.tplM2)} / m²`:'Sin cálculo';
    $('bar-reference-value').textContent=a.marketM2?`${formatMoney(a.marketM2)} / m²`:'En construcción';
    $('investment-reading').textContent=a.label;
    const tier=window.TPLMarketIntelligence?.commercialTier?.(parcel,a);
    $('investment-badge').textContent=tier?.key&&tier.key!=='none'?tier.label:a.label;
    $('investment-badge').className=`investment-badge is-${tier?.key&&tier.key!=='none'?tier.key:a.tone}`;
    $('investment-source').textContent=a.market?`Modelo TPL + referencia validada de ${parcel.comuna}`:'Modelo TPL · referencia comunal aún no validada';
    $('investment-explanation').textContent=a.summary;
    const marketNote=$('market-comparison-note');
    if(a.market && a.diffMarket!=null){
      const direction=a.diffMarket<=0?'bajo':'sobre';
      marketNote.textContent=`Frente a la referencia comunal validada, esta parcela está ${Math.abs(Math.round(a.diffMarket))}% ${direction}.`;
    } else {
      marketNote.textContent='No mostramos un promedio comunal hasta contar con una muestra validada para esta comuna.';
    }
    $('investment-signals').innerHTML=(a.signals||[]).slice(0,6).map(x=>`<span>${x}</span>`).join('');
    $('owner-action-advice').textContent=a.opportunity
      ?'El precio aparece bajo nuestra estimación. Si te interesa, puedes intentar mantener esta condición o solicitar una mejora concreta antes de reservar.'
      :a.diffTpl!=null&&a.diffTpl>=10
        ?'El precio está sobre nuestra estimación TPL. Puedes presentar una oferta o pedir una mejora que compense la diferencia antes de reservar.'
        :'Puedes presentar una oferta o pedir una mejora concreta antes de solicitar la reserva.';
  }
  function formatInputMoney(input){
    const n=priceNumber(input.value); input.value=n?n.toLocaleString('es-CL'):'';
  }
  function proposalPayload(){
    return {
      parcelaId:String(parcel.id||''),parcela:parcel.nombre||type,comuna:parcel.comuna||'',precioPublicado:price,
      tipo:$('proposal-type').value,montoOferta:priceNumber($('proposal-amount').value),
      mejoras:[...document.querySelectorAll('input[name="improvement"]:checked')].map(x=>x.value),
      condicion:$('proposal-condition').value,mensaje:$('proposal-message').value.trim(),
      cliente:{nombre:$('proposal-name').value.trim(),email:$('proposal-email').value.trim(),telefono:$('proposal-phone').value.trim()},
      origen:context.method||'ficha',prioridad:context.priority||'',createdAt:new Date().toISOString(),status:'pendiente_propietario'
    };
  }
  async function submitProposal(event){
    event.preventDefault(); const status=$('proposal-status'),button=event.submitter;
    const payload=proposalPayload();
    if(payload.tipo==='oferta'&&!payload.montoOferta){status.textContent='Ingresa el monto que deseas ofrecer.';status.className='proposal-status is-error';return}
    if(payload.tipo==='mejoras'&&!payload.mejoras.length){status.textContent='Selecciona al menos una mejora.';status.className='proposal-status is-error';return}
    button.disabled=true;status.textContent='Enviando tu solicitud…';status.className='proposal-status';
    try{
      const result=await window.TPLDataService.createPublicOpportunity({
        tipo: payload.tipo==='oferta'?'compra':'consulta',
        origen: 'parcela_html',
        prioridad: payload.tipo==='oferta'?'alta':'media',
        nombre_contacto: payload.cliente.nombre,
        email: payload.cliente.email,
        telefono: payload.cliente.telefono,
        mensaje: payload.mensaje,
        presupuesto: payload.montoOferta || null,
        metadata: {
          parcela_id: parcel.canonicalId || null,
          parcela_codigo: parcel.codigo || parcel.id || '',
          parcela_nombre: parcel.nombre || type,
          comuna: parcel.comuna || '',
          precio_publicado: price,
          mejoras: payload.mejoras,
          condicion: payload.condicion,
          contexto: {origen:payload.origen,prioridad:payload.prioridad}
        }
      });
      localStorage.removeItem('tpl_owner_proposals');
      status.textContent=`Solicitud ${result.codigo||''} enviada. TPL la registró y dará seguimiento.`.trim();
      status.className='proposal-status is-success';
      event.target.reset();
    }catch(error){try{const saved=JSON.parse(localStorage.getItem('tpl_owner_proposals')||'[]');saved.unshift(payload);localStorage.setItem('tpl_owner_proposals',JSON.stringify(saved.slice(0,30)))}catch{} status.textContent=(error.message||'No fue posible enviar la solicitud.')+' Dejamos un respaldo local para reintentar.';status.className='proposal-status is-error'}finally{button.disabled=false}
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
