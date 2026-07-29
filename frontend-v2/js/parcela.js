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
    return `../${value.replace(/^\.?\//, "")}`;
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
  const id=params.get("id");
  const parcel=catalog().find(p=>String(p.id)===String(id));
  if(!parcel){ $("not-found").hidden=false; return; }
  const context=getContext();
  const images=(Array.isArray(parcel.imagenes)&&parcel.imagenes.length?parcel.imagenes:[parcel.imagen]).filter(Boolean).map(absoluteAsset);
  let imageIndex=0;
  const size=sizeOf(parcel), price=priceNumber(parcel.precio), type=size>=10000?"Campo":"Parcela";
  function contextLabel(){
    const labels={distance:"más cercanas",payment:"facilidad de pago",nature:"entorno natural",services:"servicios cercanos",economic:"precio más económico",large:"1 hectárea o más"};
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
  function valuation(){
    const m2=size&&price?Math.round(price/size):0;
    let position="Sin referencia suficiente";
    let explanation="El valor debe compararse con propiedades equivalentes de la misma comuna y con sus servicios reales.";
    if(m2){
      if(m2<1800){position="Precio por m² bajo";explanation="El precio por metro cuadrado publicado es bajo para una parcela rural; conviene revisar ubicación, acceso y servicios antes de concluir que es una oportunidad."}
      else if(m2<=4000){position="Rango intermedio";explanation="El precio por metro cuadrado está en un rango intermedio. Los servicios, acceso, agua, electricidad y documentación determinarán su conveniencia real."}
      else {position="Precio por m² alto";explanation="El precio por metro cuadrado es alto y debería estar respaldado por ubicación, servicios, atributos naturales o condiciones comerciales superiores."}
    }
    $("valuation-price").textContent=parcel.precio||formatMoney(price);
    $("valuation-m2").textContent=m2?`${formatMoney(m2)} / m²`:"No calculable";
    $("valuation-position").textContent=position;
    $("valuation-explanation").textContent=explanation;
  }
  function quantile(values,q){
    if(!values.length)return 0;
    const sorted=[...values].sort((a,b)=>a-b),pos=(sorted.length-1)*q,base=Math.floor(pos),rest=pos-base;
    return Math.round(sorted[base]+((sorted[base+1]-sorted[base])*rest||0));
  }
  function tasadorReference(){
    const direct=Number(parcel.valorTasacionM2||parcel.valor_tasacion_m2||parcel.valorComunalM2||parcel.valor_comunal_m2||parcel.tasacion_m2||0);
    const commune=normalize(parcel.comuna);
    const comparables=catalog().filter(p=>normalize(p.comuna)===commune&&String(p.id)!==String(parcel.id)).map(p=>{const s=sizeOf(p),pr=priceNumber(p.precio);return s&&pr?Math.round(pr/s):0}).filter(Boolean);
    const own=size&&price?Math.round(price/size):0;
    const reference=direct||quantile(comparables,.5)||own;
    const low=Number(parcel.valorTasacionMinM2||parcel.valor_tasacion_min_m2||0)||quantile(comparables,.25)||Math.round(reference*.82);
    const high=Number(parcel.valorTasacionMaxM2||parcel.valor_tasacion_max_m2||0)||quantile(comparables,.75)||Math.round(reference*1.18);
    return {own,reference,low:Math.min(low,reference),high:Math.max(high,reference),count:comparables.length,direct:Boolean(direct)};
  }
  function renderInvestment(){
    const v=tasadorReference();
    const max=Math.max(v.high,v.own,1),ratio=Math.max(0,Math.min(100,(v.own/max)*100));
    const refRatio=Math.max(8,Math.min(100,(v.reference/max)*100));
    const ownRatio=Math.max(8,Math.min(100,(v.own/max)*100));
    let badge='En rango',cls='is-mid',reading='Precio cercano a la referencia comunal',explanation='El precio publicado se encuentra cerca del valor por metro cuadrado usado como referencia para parcelas comparables de la comuna.';
    const delta=v.reference?((v.own-v.reference)/v.reference)*100:0;
    if(delta<=-8){badge='Bajo referencia';cls='is-good';reading='Precio publicado bajo la referencia';explanation=`El valor por m² está aproximadamente ${Math.abs(Math.round(delta))}% bajo la referencia. Puede ser una oportunidad, pero conviene confirmar acceso, servicios, documentación y ubicación exacta.`}
    else if(delta>=8){badge='Sobre referencia';cls='is-high';reading='Precio publicado sobre la referencia';explanation=`El valor por m² está aproximadamente ${Math.abs(Math.round(delta))}% sobre la referencia. El diferencial debería justificarse por ubicación, servicios, atributos naturales o condiciones comerciales.`}
    $('investment-reading').textContent=reading;
    $('investment-source').textContent=v.direct?'Dato principal: tasador TPL':v.count?`Comparación con ${v.count} publicación${v.count===1?'':'es'} de ${parcel.comuna||'la comuna'}`:'Referencia preliminar calculada con esta publicación';
    $('investment-badge').textContent=badge;$('investment-badge').className=`investment-badge ${cls}`;
    $('investment-marker').style.left=`${ratio}%`;
    $('investment-low').textContent=`Bajo ${formatMoney(v.low)} / m²`;
    $('investment-reference').textContent=`Referencia ${formatMoney(v.reference)} / m²`;
    $('investment-high').textContent=`Alto ${formatMoney(v.high)} / m²`;
    $('bar-reference').style.width=`${refRatio}%`;$('bar-published').style.width=`${ownRatio}%`;
    $('bar-reference-value').textContent=`${formatMoney(v.reference)} / m²`;$('bar-published-value').textContent=v.own?`${formatMoney(v.own)} / m²`:'No calculable';
    $('investment-explanation').textContent=explanation;
    $('owner-action-advice').textContent=delta>=8?'Como el valor está sobre la referencia, puedes presentar una oferta o pedir mejoras que compensen la diferencia antes de reservar.':'Puedes proteger tu decisión solicitando una condición comercial o una mejora concreta antes de reservar.';
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
      let remote=false;
      try{const r=await fetch('/api/propuesta-propietario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(r.ok)remote=true;else if(r.status!==404)throw new Error('No fue posible registrar la propuesta')}catch(error){if(!String(error.message||'').includes('fetch')&&!String(error.message||'').includes('404'))throw error}
      const saved=JSON.parse(localStorage.getItem('tpl_owner_proposals')||'[]');saved.unshift(payload);localStorage.setItem('tpl_owner_proposals',JSON.stringify(saved.slice(0,30)));
      status.textContent=remote?'Solicitud enviada. Te avisaremos por correo cuando el propietario responda.':'Solicitud guardada en este dispositivo. Falta conectar el correo/CRM para enviarla automáticamente al propietario.';
      status.className='proposal-status is-success';
      if(remote)event.target.reset();
    }catch(error){status.textContent=error.message||'No fue posible enviar la solicitud.';status.className='proposal-status is-error'}finally{button.disabled=false}
  }
  function setImage(){
    $("main-image").src=images[imageIndex]||"./assets/logo-tu-parcela-lista.png";
    $("main-image").alt=`${parcel.nombre||type} · fotografía ${imageIndex+1}`;
    $("gallery-count").textContent=images.length?`${imageIndex+1} / ${images.length}`:"";
    $("gallery-prev").hidden=images.length<2; $("gallery-next").hidden=images.length<2;
  }
  function cotizadorUrl(kind){
    const q=new URLSearchParams({parcela:String(parcel.id||""),tipo:kind,origen:context.method||"ficha"});
    if(context.priority)q.set("prioridad",context.priority);
    if(context.distance)q.set("distancia",context.distance);
    return `./cotizador.html?${q.toString()}`;
  }
  function render(){
    document.title=`${parcel.nombre||type} | Tu Parcela Lista`;
    $("search-memory").textContent=contextLabel();
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
    valuation(); renderInvestment(); setImage(); $("parcel-page").hidden=false;
  }
  function loadLeaflet(){
    if(window.L)return Promise.resolve();
    return new Promise((resolve,reject)=>{const l=document.createElement("link");l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(l);const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  }
  async function showMap(){
    const lat=Number(parcel.lat||parcel.latitude||parcel.latitud),lng=Number(parcel.lng||parcel.lon||parcel.longitude||parcel.longitud);
    if(!lat||!lng){$("map").innerHTML="<p>La ubicación exacta todavía no está disponible.</p>";return}
    $("map").innerHTML="";
    try{await loadLeaflet();const map=L.map("map",{scrollWheelZoom:false}).setView([lat,lng],13);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);L.marker([lat,lng]).addTo(map).bindPopup(parcel.nombre||type).openPopup()}catch{$("map").innerHTML="<p>No fue posible cargar el mapa.</p>"}
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
})();
