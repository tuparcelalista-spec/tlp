(() => {
  'use strict';
  const $=(s)=>document.querySelector(s);
  const OWNER_TOKEN_KEY='tpl_owner_access_token';
  const CANONICAL_FIELDS=['asking','region','comuna','lat','lng','commune_distance','route_distance','electricity_pole_distance','access','topography','soil','exposure','view','tourism','water','electricity','fencing','gate','condominium','vegetation','area_casa','material_casa','anio_construccion','estado_casa','anio_remodelacion','dormitorios','banos','pisos','differentiator'];
  const REQUIRED_FOR_CONFIDENCE=['superficie_m2','rol_situacion','lat','lng','access','topography','water','electricity','soil','view','commune_distance','route_distance'];
  function captureOwnerToken(){const url=new URL(location.href);const incoming=(url.searchParams.get('t')||'').trim();if(incoming){sessionStorage.setItem(OWNER_TOKEN_KEY,incoming);url.searchParams.delete('t');history.replaceState(null,document.title,`${url.pathname}${url.search}${url.hash}`);return incoming}return sessionStorage.getItem(OWNER_TOKEN_KEY)||''}
  const token=captureOwnerToken();let current=null;let currentTasacion=null;
  let ownerMap = null;
  let ownerMarker = null;
  function initOwnerMap(lat, lng) {
    const mapEl = $('#mi-parcela-mapa');
    if (!mapEl) return;
    if (!ownerMap) {
      ownerMap = L.map('mi-parcela-mapa').setView([lat || -33.4489, lng || -70.6693], lat ? 13 : 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(ownerMap);
      ownerMarker = L.marker([lat || -33.4489, lng || -70.6693], { draggable: true }).addTo(ownerMap);
      ownerMarker.on('dragend', function (e) {
        const coords = e.target.getLatLng();
        $('input[name="lat"]').value = coords.lat.toFixed(6);
        $('input[name="lng"]').value = coords.lng.toFixed(6);
      });
      ownerMap.on('click', function(e) {
        ownerMarker.setLatLng(e.latlng);
        $('input[name="lat"]').value = e.latlng.lat.toFixed(6);
        $('input[name="lng"]').value = e.latlng.lng.toFixed(6);
      });
    } else {
      const targetLat = lat || -33.4489;
      const targetLng = lng || -70.6693;
      ownerMap.setView([targetLat, targetLng], lat ? 13 : 5);
      ownerMarker.setLatLng([targetLat, targetLng]);
    }
    setTimeout(() => ownerMap.invalidateSize(), 500);
  }
  const money=(v)=>Number(v||0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
  function showError(message){$('#loading').hidden=true;$('#error').hidden=false;$('#errorText').textContent=message||'El enlace es inválido, fue revocado o ya venció.'}
  function setValue(form,name,value){const nodes=[...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];if(!nodes.length||value==null)return;if(nodes[0].type==='checkbox'){const selected=new Set(Array.isArray(value)?value:String(value).split('|'));nodes.forEach(n=>n.checked=selected.has(n.value));return}nodes[0].value=value}
  function canonicalSource(p){return {...(p.metadata?.tasador_entrada||{}),...(p.tasador_entrada||{})}}
  function updateCompletion(){const form=$('#ownerForm');if(!form)return;const present=REQUIRED_FOR_CONFIDENCE.filter(name=>{const nodes=[...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];return nodes.some(n=>n.type==='checkbox'?n.checked:String(n.value||'').trim()!=='')});const pct=Math.round(present.length/REQUIRED_FOR_CONFIDENCE.length*100);$('#valuationCompletion').textContent=`${pct}%`;$('#valuationCompletionBar').style.width=`${pct}%`;const missing=REQUIRED_FOR_CONFIDENCE.filter(x=>!present.includes(x));$('#valuationMissingText').textContent=missing.length?`Para mejorar la confianza aún faltan ${missing.length} antecedentes principales.`:'La ficha contiene los antecedentes principales para una tasación de alta confianza.'}
  function fill(p,t){current=p;currentTasacion=t||{};$('#loading').hidden=true;$('#app').hidden=false;$('#title').textContent=p.titulo||'Tu parcela';$('#location').textContent=[p.sector,p.comuna,p.region].filter(Boolean).join(' · ');$('#price').textContent=money(p.precio_publicado);$('#updated').textContent=`Actualizada ${new Date(p.updated_at).toLocaleDateString('es-CL')}`;$('#publicLink').href=`parcela.html?id=${encodeURIComponent(p.codigo||p.id)}`;
    const total=Number(t?.valor_tpl_oficial||t?.valor_tpl_total||t?.resultado?.valor_tpl_total||0),m2=Number(t?.valor_tpl_m2||0);if(total){$('#tplValue').textContent=money(total);$('#tplM2').textContent=m2?`${money(m2)} por m²`:'';$('#valuationText').textContent=`Valor TPL oficial de la versión ${t.version||t.total_versiones||'vigente'}. Los cambios relevantes generan una solicitud de recálculo.`}
    const hasReport=Boolean(t?.id&&total);$('#viewValuationReport').disabled=!hasReport;$('#downloadValuationReport').disabled=!hasReport;$('#reportVersion').textContent=hasReport?`Versión ${t.version||'vigente'} · ${money(total)}`:'Sin tasación canónica';$('#reportDate').textContent=hasReport?`Actualizada ${new Date(t.created_at).toLocaleDateString('es-CL')}`:'TPL debe registrar una versión oficial antes de habilitar el informe.';
    const form=$('#ownerForm');const canonical=canonicalSource(p);[...form.elements].forEach(el=>{if(!el.name||el.type==='file'||el.type==='checkbox')return;if(p[el.name]!=null)setValue(form,el.name,p[el.name]);else if(canonical[el.name]!=null)setValue(form,el.name,canonical[el.name])});
    setValue(form,'region',p.region);setValue(form,'comuna',p.comuna);setValue(form,'access',canonical.access??p.acceso);setValue(form,'topography',canonical.topography??p.topografia);setValue(form,'water',canonical.water??p.agua);setValue(form,'electricity',canonical.electricity??p.electricidad);setValue(form,'fencing',canonical.fencing??p.cierre_perimetral);setValue(form,'gate',canonical.gate??p.porton);setValue(form,'nature',canonical.nature||[]);
    const works=canonical.works||{};Object.entries(works).forEach(([k,v])=>setValue(form,`work_${k}`,v));const c=p.propietario_contacto||{};['nombre','email','whatsapp','tipo'].forEach(k=>setValue(form,`contacto_${k}`,c[k]));updateCompletion();
    
    // Iniciar Mapa
    const formLat = parseFloat($('input[name="lat"]').value);
    const formLng = parseFloat($('input[name="lng"]').value);
    initOwnerMap(isNaN(formLat) ? null : formLat, isNaN(formLng) ? null : formLng);
  }
  async function load(){if(!token)return showError();try{const data=await TPLDataService.getOwnerProperty(token);if(!data?.ok)return showError(data?.error);fill(data.propiedad,data.tasacion||{})}catch(e){console.error(e);showError(e.message)}}
  function openReport(printNow=false){if(!currentTasacion?.id)return;sessionStorage.setItem(OWNER_TOKEN_KEY,token);const win=window.open('informe-tasacion.html','_blank','noopener');if(!win){$('#reportStatus').textContent='El navegador bloqueó la ventana. Habilita ventanas emergentes para ver el informe.';return}if(printNow){$('#reportStatus').textContent='El informe se abrió en otra pestaña. Usa “Guardar como PDF” en el diálogo de impresión.';setTimeout(()=>{try{win.print()}catch(_){}},1800)}}
  $('#viewValuationReport')?.addEventListener('click',()=>openReport(false));
  $('#downloadValuationReport')?.addEventListener('click',()=>openReport(true));
  $('#scrollUpdate')?.addEventListener('click',()=>$('#update').scrollIntoView({behavior:'smooth'}));
  document.addEventListener('input',e=>{if(e.target.closest('#ownerForm'))updateCompletion()});
  document.addEventListener('click',(e)=>{const b=e.target.closest('[data-plan]');if(!b)return;const text=`Hola, quiero posicionar mi parcela ${current?.codigo||''} con una inversión inicial de $${Number(b.dataset.plan).toLocaleString('es-CL')}.`;location.href=`https://wa.me/56988508361?text=${encodeURIComponent(text)}`});
  $('#ownerForm')?.addEventListener('submit',async(e)=>{e.preventDefault();const f=e.currentTarget,status=$('#formStatus');status.textContent='Guardando ficha canónica…';const fd=new FormData(f),selectedPhotos=[...f.fotos.files];try{
    if(selectedPhotos.length>20)throw new Error('Puedes enviar como máximo 20 fotografías por actualización.');const allowed=new Set(['image/jpeg','image/png','image/webp']);for(const file of selectedPhotos){if(!allowed.has(file.type)||!(/\.(jpe?g|png|webp)$/i.test(file.name))||file.size<=0||file.size>8*1024*1024)throw new Error(`La fotografía ${file.name||'seleccionada'} no cumple formato o tamaño permitido.`)}
    const val=(k)=>String(fd.get(k)||'').trim(),num=(k)=>{const v=Number(fd.get(k));return Number.isFinite(v)&&v>=0?v:null};
    const payload={titulo:val('titulo'),descripcion:val('descripcion'),precio_publicado:num('precio_publicado'),superficie_m2:num('superficie_m2'),rol_situacion:val('rol_situacion'),agua:val('water'),electricidad:val('electricity'),acceso:val('access'),topografia:val('topography'),cierre_perimetral:val('fencing'),porton:val('gate')};
    const tasador={};CANONICAL_FIELDS.forEach(k=>{const v=['asking','lat','lng','commune_distance','route_distance','electricity_pole_distance','area_casa','anio_construccion','anio_remodelacion','dormitorios','banos','pisos'].includes(k)?num(k):val(k);if(v!==''&&v!==null)tasador[k]=v});tasador.nature=fd.getAll('nature');tasador.works={};['casa','galpon','agua','cerco','porton','camino','solar','recreacion'].forEach(k=>{const v=num(`work_${k}`);if(v)tasador.works[k]=v});
    payload.tasador_entrada=tasador;payload.solicitar_recalculo=true;payload.contacto={nombre:val('contacto_nombre'),email:val('contacto_email'),whatsapp:val('contacto_whatsapp'),tipo:val('contacto_tipo')};payload.fotos=selectedPhotos.map(x=>({name:x.name.slice(0,180),type:x.type,size:x.size,status:'pendiente_revision'}));
    const result=await TPLDataService.updateOwnerProperty(token,payload);
    let uploaded=0;
    for(const file of selectedPhotos){status.textContent=`Subiendo fotografía ${uploaded+1} de ${selectedPhotos.length}…`;await TPLDataService.uploadOwnerPropertyPhoto(token,file);uploaded++}
    status.textContent='Datos guardados. Recalculando la Tasación TPL…';
    const recalculation=await TPLDataService.processOwnerValuationRecalculation(token);
    if(recalculation?.ok){status.textContent=`Ficha sincronizada, ${uploaded} fotografía(s) guardada(s) y nueva Tasación TPL registrada: ${money(recalculation.valor_tpl_total)}.`}
    else if(recalculation?.requires_review){status.textContent='Ficha y fotografías guardadas. La tasación quedó en revisión porque faltan antecedentes territoriales.'}
    else{status.textContent='Ficha y fotografías guardadas en Supabase. El recálculo quedó en cola para reintento.'}
    setTimeout(load,1200)
  }catch(err){console.error(err);status.textContent=err.message||'No fue posible guardar.'}});
  load();
})();
