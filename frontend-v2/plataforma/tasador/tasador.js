
(()=>{
'use strict';
const KEY='tpl_frontend_v2_tasaciones_v1';
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n||0));
let reports=[];let activeId=null;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const write=()=>localStorage.setItem(KEY,JSON.stringify(reports));
function filtered(){
 const q=$('#searchInput').value.trim().toLowerCase(),status=$('#statusFilter').value;
 return reports.filter(r=>{
  const p=r.property||{};const text=[r.comuna,r.tipo,p.titulo,p.comuna,p.localidad].join(' ').toLowerCase();
  return (!q||text.includes(q))&&(!status||r.status===status);
 });
}
function render(){
 reports=read();
 $('#countReports').textContent=reports.length;
 $('#totalValue').textContent=money(reports.reduce((a,r)=>a+Number(r.market||0),0));
 $('#lastDate').textContent=reports[0]?.createdAt?new Date(reports[0].createdAt).toLocaleDateString('es-CL'):'—';
 const list=filtered(),grid=$('#reportsGrid');grid.innerHTML='';
 $('#emptyState').hidden=list.length>0;
 list.forEach(r=>{
  const p=r.property||{};const card=document.createElement('article');card.className='report-card';
  card.innerHTML=`<header><h3>${p.titulo||`${r.tipo||'Propiedad'} en ${r.comuna||p.comuna||'Chile'}`}</h3><span class="badge">${r.status||'borrador'}</span></header><div class="main-value">${money(r.market)}</div><div class="report-meta"><div><small>Superficie</small><strong>${Number(r.area||p.superficie||0).toLocaleString('es-CL')} m²</strong></div><div><small>Valor por m²</small><strong>${money(r.rate)}</strong></div><div><small>Venta rápida</small><strong>${money(r.quick)}</strong></div><div><small>Venta paciente</small><strong>${money(r.patient)}</strong></div></div><footer><button class="view-btn">Ver informe</button><button class="publish-btn">${r.status==='publicada'?'Publicada':'Marcar publicada'}</button></footer>`;
  card.querySelector('.view-btn').onclick=()=>open(r.id);
  card.querySelector('.publish-btn').onclick=()=>{r.status='publicada';write();render()};
  grid.appendChild(card);
 });
}
function open(id){
 const r=reports.find(x=>x.id===id);if(!r)return;activeId=id;const p=r.property||{};
 $('#dialogContent').innerHTML=`<article class="report-sheet"><h1>Informe de tasación TPL</h1><p>${new Date(r.createdAt||Date.now()).toLocaleDateString('es-CL')}</p><h2>${p.titulo||`${r.tipo||'Propiedad'} en ${r.comuna||p.comuna||'Chile'}`}</h2><p>${Number(r.area||0).toLocaleString('es-CL')} m² · ${p.suelo||'Suelo por confirmar'}</p><div class="range"><div><small>Venta rápida</small><strong>${money(r.quick)}</strong></div><div><small>Recomendado</small><strong>${money(r.market)}</strong></div><div><small>Venta paciente</small><strong>${money(r.patient)}</strong></div></div><h3>Precio indicado por el propietario</h3><p>${money(r.asking||p.precio)}</p><h3>Servicios declarados</h3><p>${Object.entries(p.servicios||{}).filter(([,v])=>v).map(([k])=>k).join(', ')||'Sin servicios confirmados.'}</p><small>Esta estimación es orientativa y no reemplaza peritajes, tasaciones bancarias o estudios legales.</small></article>`;
 $('#reportDialog').showModal();
}
$('#searchInput').oninput=render;$('#statusFilter').onchange=render;
$('#newValuation').onclick=()=>location.href='../publicar/index.html';
$('#closeDialog').onclick=()=>$('#reportDialog').close();
$('#printBtn').onclick=()=>window.print();
$('#deleteBtn').onclick=()=>{if(!activeId)return;reports=reports.filter(r=>r.id!==activeId);write();$('#reportDialog').close();render()};
render();
})();
