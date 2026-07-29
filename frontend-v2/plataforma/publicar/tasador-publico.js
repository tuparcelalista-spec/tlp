const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n||0));
const works={
 quincho_abierto:'Quincho abierto (m²)',quincho_cerrado:'Quincho cerrado (m²)',terraza_sin_techo:'Terraza sin techo (m²)',terraza_techada:'Terraza techada (m²)',bodega_madera:'Bodega madera (m²)',bodega_solida:'Bodega sólida (m²)',galpon:'Galpón (m²)',cobertizo:'Cobertizo (m²)',estacionamiento_techado:'Estacionamiento techado (m²)',piscina_fibra:'Piscina fibra (m²)',piscina_hormigon:'Piscina hormigón (m²)',tinaja_simple:'Tinaja simple (un.)',tinaja_equipada:'Tinaja equipada (un.)',porton_automatico:'Portón automático (un.)'
};
function buildWorks(){const g=$('#worksGrid');Object.entries(works).forEach(([k,l])=>{const lab=document.createElement('label');lab.innerHTML=`<span>${l}</span><input type="number" min="0" step="1" data-work="${k}" value="0">`;g.appendChild(lab)})}
function fillRegions(){
 const cat=globalThis.TPL_NATIONAL_CATALOG;if(!cat){setTimeout(fillRegions,50);return}
 const r=$('#region');r.innerHTML='<option value="">Selecciona región</option>'+cat.regions.map(x=>`<option value="${x.name}">${x.name}</option>`).join('');
 r.addEventListener('change',()=>{const c=$('#comuna');const reg=cat.regions.find(x=>x.name===r.value);const communes=cat.communes.filter(x=>x.reg===reg?.code);c.innerHTML='<option value="">Selecciona comuna</option>'+communes.map(x=>`<option value="${x.name}">${x.name}</option>`).join('');c.disabled=!r.value});
}
function inputs(){
 const obras={};document.querySelectorAll('[data-work]').forEach(el=>{const n=Number(el.value||0);if(n>0)obras[el.dataset.work]=n});
 const withHouse=$('#incluyeVivienda').checked;
 return {
  area:Number($('#superficie').value||0),distanceKm:Number($('#distanceKm').value||0),region:$('#region').value,comuna:$('#comuna').value,
  rol:$('#rol').value,electricity:$('#electricity').value,topography:$('#topography').value,routeDistanceKm:Number($('#routeDistanceKm').value||0),
  incluyeVivienda:withHouse,areaCasa:withHouse?Number($('#areaCasa').value||0):0,materialCasa:$('#materialCasa').value,
  anioConstruccion:Number($('#anioConstruccion').value||0),estadoCasa:$('#estadoCasa').value,tipoFundacion:$('#tipoFundacion').value,
  anioRemodelacion:Number($('#anioRemodelacion').value||0),remodelacionIntegral:Number($('#anioRemodelacion').value||0)>0,
  dormitorios:Number($('#dormitorios').value||0),banos:Number($('#banos').value||0),obrasAdicionales:obras,
  caracteristicaDiferenciadora:$('#caracteristicaDiferenciadora').value
 };
}
function calculate(ev){
 ev?.preventDefault();const x=inputs();let res;
 if(x.incluyeVivienda)res=window.TPLHouseEngine?.calculate(x);else res=window.TPLLandEngine?.calculate(x);
 if(!res||res.error){$('#status').textContent=res?.error||'No fue posible calcular. Revisa los datos.';$('#result').hidden=true;return}
 $('#status').textContent='Tasación calculada con el motor unificado TPL.';$('#result').hidden=false;
 $('#ideal').textContent=money(res.ideal);$('#quick').textContent=money(res.quick);$('#patient').textContent=money(res.patient);
 const b=res.desglose||{valorTerreno:res.ideal};const labels={valorTerreno:'Terreno',valorCasa:'Vivienda',valorFundacion:'Fundación',sumaObrasAdicionales:'Obras adicionales','bonificaciónDiferenciadora':'Característica diferenciadora'};
 $('#breakdown').innerHTML=Object.entries(labels).filter(([k])=>Number(b[k])).map(([k,l])=>`<div class="breakdown-row"><span>${l}</span><strong>${money(b[k])}</strong></div>`).join('')||`<div class="breakdown-row"><span>Terreno</span><strong>${money(res.ideal)}</strong></div>`;
 const q=new URLSearchParams({region:x.region,comuna:x.comuna,superficie:x.area,tasacion:String(Math.round(res.ideal)),tipo:x.incluyeVivienda?'casa':'parcela'});
 $('#publishLink').href=`index.html?${q.toString()}`;
}
document.addEventListener('DOMContentLoaded',()=>{buildWorks();fillRegions();$('#incluyeVivienda').addEventListener('change',e=>$('#houseFields').hidden=!e.target.checked);$('#tasadorForm').addEventListener('submit',calculate)});
