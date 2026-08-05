(function(window){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function identifier(){
 const q=new URLSearchParams(location.search);
 return q.get('id')||q.get('parcela')||q.get('propiedad')||localStorage.getItem('selectedParcelaId')||'';
}
function host(){
 return $('#analisis-territorial')||$('#investment-section')||$('.main-column .clean-section:last-of-type')||$('main');
}
async function load(){
 const id=identifier(); if(!id||!window.TPLDataService?.getAssetServiceRecommendations)return;
 try{
  const data=await window.TPLDataService.getAssetServiceRecommendations(id);
  const items=Array.isArray(data?.recomendaciones)?data.recomendaciones:[];
  if(!data?.ok||!items.length)return;
  const section=document.createElement('section');
  section.className='clean-section tpl-needs-section';
  section.id='servicios-para-esta-propiedad';
  section.innerHTML=`<div class="section-heading"><span>CAPACIDADES TPL</span><h2>${esc(data.titulo||'Para que esta propiedad sea aún mejor')}</h2></div><p class="tpl-needs-intro">${esc(data.explicacion||'Mostramos soluciones relacionadas con esta propiedad.')}</p><div class="tpl-needs-grid">${items.map(x=>`<article class="tpl-need-card" data-kind="${esc(x.tipo)}"><div class="tpl-need-top"><span>${x.tipo==='necesidad_detectada'?'Necesidad detectada':'Mejora posible'}</span><b>${esc(x.prioridad||'media')}</b></div><h3>${esc(x.nombre)}</h3><p>${esc(x.motivo)}</p><small>${Number(x.especialistas_disponibles||0)>0?`TPL cuenta con ${Number(x.especialistas_disponibles)} especialista${Number(x.especialistas_disponibles)===1?'':'s'} compatible${Number(x.especialistas_disponibles)===1?'':'s'} en la red.`:'TPL está incorporando especialistas para esta capacidad.'}</small></article>`).join('')}</div><p class="tpl-needs-note">Estas sugerencias son orientativas y dependen de los datos declarados. No reemplazan una visita técnica.</p>`;
  const h=host(); h.parentNode.insertBefore(section,h.nextSibling);
 }catch(error){console.warn('TPL necesidades: recomendaciones no disponibles.',error)}
}
window.addEventListener('DOMContentLoaded',()=>setTimeout(load,250));
})(window);