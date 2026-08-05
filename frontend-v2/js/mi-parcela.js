(() => {
  'use strict';
  const $=(s)=>document.querySelector(s);
  const OWNER_TOKEN_KEY='tpl_owner_access_token';
  function captureOwnerToken(){
    const url=new URL(location.href);
    const incoming=(url.searchParams.get('t')||'').trim();
    if(incoming){
      sessionStorage.setItem(OWNER_TOKEN_KEY,incoming);
      url.searchParams.delete('t');
      history.replaceState(null,document.title,`${url.pathname}${url.search}${url.hash}`);
      return incoming;
    }
    return sessionStorage.getItem(OWNER_TOKEN_KEY)||'';
  }
  const token=captureOwnerToken(); let current=null;
  const money=(v)=>Number(v||0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
  function showError(message){$('#loading').hidden=true;$('#error').hidden=false;$('#errorText').textContent=message||'El enlace es inválido, fue revocado o ya venció.'}
  function fill(p,t){current=p;$('#loading').hidden=true;$('#app').hidden=false;$('#title').textContent=p.titulo||'Tu parcela';$('#location').textContent=[p.sector,p.comuna,p.region].filter(Boolean).join(' · ');$('#price').textContent=money(p.precio_publicado);$('#updated').textContent=`Actualizada ${new Date(p.updated_at).toLocaleDateString('es-CL')}`;$('#publicLink').href=`parcela.html?id=${encodeURIComponent(p.codigo||p.id)}`;
    const total=Number(t?.valor_tpl_total||t?.resultado?.valor_tpl_total||0);const m2=Number(t?.valor_tpl_m2||0);if(total){$('#tplValue').textContent=money(total);$('#tplM2').textContent=m2?`${money(m2)} por m²`:'';$('#valuationText').textContent=t.clasificacion?`Clasificación actual: ${t.clasificacion}. Al modificar antecedentes importantes, esta referencia puede subir o bajar.`:'El valor puede cambiar al actualizar antecedentes importantes.'}
    [...$('#ownerForm').elements].forEach(el=>{if(el.name&&p[el.name]!=null&&el.type!=='file')el.value=p[el.name]});const c=p.metadata?.propietario_contacto||{};['nombre','email','whatsapp','tipo'].forEach(k=>{const el=$(`[name="contacto_${k}"]`);if(el&&c[k])el.value=c[k]});
  }
  async function load(){if(!token)return showError();try{const data=await TPLDataService.getOwnerProperty(token);if(!data?.ok)return showError(data?.error);fill(data.propiedad,data.tasacion||{})}catch(e){console.error(e);showError(e.message)}}
  $('#scrollUpdate')?.addEventListener('click',()=>$('#update').scrollIntoView({behavior:'smooth'}));
  document.addEventListener('click',(e)=>{const b=e.target.closest('[data-plan]');if(!b)return;const text=`Hola, quiero posicionar mi parcela ${current?.codigo||''} con una inversión inicial de $${Number(b.dataset.plan).toLocaleString('es-CL')}.`;location.href=`https://wa.me/56988508361?text=${encodeURIComponent(text)}`});
  $('#ownerForm')?.addEventListener('submit',async(e)=>{e.preventDefault();const f=e.currentTarget;const status=$('#formStatus');status.textContent='Guardando…';const fd=new FormData(f);const selectedPhotos=[...f.fotos.files];
    if(selectedPhotos.length>20) throw new Error('Puedes enviar como máximo 20 fotografías por actualización.');
    const allowed=new Set(['image/jpeg','image/png','image/webp']);
    for(const file of selectedPhotos){
      if(!allowed.has(file.type)||!/\.(jpe?g|png|webp)$/i.test(file.name)||file.size<=0||file.size>8*1024*1024){
        throw new Error(`La fotografía ${file.name||'seleccionada'} no cumple formato o tamaño permitido.`);
      }
    }
    const photos=selectedPhotos.map(x=>({name:x.name.slice(0,180),type:x.type,size:x.size,status:'pendiente_revision'}));const payload={};['titulo','descripcion','precio_publicado','superficie_m2','agua','electricidad','acceso','topografia','rol_situacion','cierre_perimetral','porton'].forEach(k=>payload[k]=fd.get(k));payload.contacto={nombre:fd.get('contacto_nombre'),email:fd.get('contacto_email'),whatsapp:fd.get('contacto_whatsapp'),tipo:fd.get('contacto_tipo')};payload.fotos=photos;try{const result=await TPLDataService.updateOwnerProperty(token,payload);status.textContent=result.fotos_pendientes_revision?'Datos actualizados. Fotografías pendientes de revisión.':'Datos actualizados correctamente.';setTimeout(load,700)}catch(err){console.error(err);status.textContent=err.message||'No fue posible guardar.'}});
  load();
})();
