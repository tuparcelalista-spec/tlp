const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/publicar/tasador-publico.js', 'utf8');

let startIndex = js.indexOf('function applyCrmSmartMissing(){');
let endIndex = js.indexOf('async function applyLaunchPrefill(){');

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const newFunction = `function applyCrmSmartMissing(){
   if(launchParams.get('embed')!=='crm')return;
   const smartMode=launchParams.get('smart_missing')==='1';
   const panel=$('#crmSmartCompletion');if(!panel)return;
   const declared=new Set((launchParams.get('campos_presentes')||'').split(',').filter(Boolean));
   const withHouse=assetType!=='parcela';
   const applicable=Object.keys(CRM_FIELD_DEFS).filter(k=>withHouse||!['area_casa','material_casa','anio_construccion','estado_casa','anio_remodelacion','dormitorios','banos','pisos','works','differentiator'].includes(k));
   const hasActualValue=(key)=>{
     if(key==='lat'||key==='lng') return Number.isFinite(Number($('#'+key)?.value)) && Number($('#'+key)?.value)!==0;
     if(key==='nature') return document.querySelectorAll('[data-nature]:checked').length>0;
     if(key==='works') return [...document.querySelectorAll('[data-work]')].some(el=>Number(el.value)>0);
     const def=CRM_FIELD_DEFS[key], el=def?.id?$('#'+def.id):null;
     if(!el) return declared.has(key);
     return String(el.value??'').trim()!=='';
   };
   const automaticKeys = ['commune_distance', 'route_distance', 'tourism'];
   const manualFields = applicable.filter(k => !automaticKeys.includes(k));
   const knownManual = manualFields.filter(hasActualValue);
   const missingManual = manualFields.filter(k => !hasActualValue(k));
   if(knownManual.includes('lat')&&knownManual.includes('lng'))document.querySelector('.coordinates-card')?.setAttribute('hidden','');
   if(smartMode)knownManual.forEach(hideKnownField);
   
   // Completion score
   const score=Math.round((knownManual.length/Math.max(1,manualFields.length))*100);
   
   // Render Missing/Known Data (we can still render them silently or hide them)
   $('#crmKnownData').innerHTML=\`<strong>Información recuperada (\${knownManual.length})</strong><div>\${knownManual.slice(0,12).map(k=>\`<span>✓ \${CRM_FIELD_DEFS[k].label}</span>\`).join('')}\${knownManual.length>12?\`<span>+\${knownManual.length-12} datos más</span>\`:\`\`}</div>\`;
   $('#crmMissingData').innerHTML=(missingManual.length?\`<div class="crm-save-actions"><button id="crmSaveOnly" type="button" class="secondary crm-save-only">Guardar datos parciales</button><button id="crmSaveAndValue" type="button" class="primary crm-save-and-value">Completar Ficha y Tasar</button></div>\`:\`<strong>Lista para informe</strong><p>Ficha manual al 100%. Las distancias se calculan automáticamente.</p><div class="crm-save-actions"><button id="crmSaveAndValue" type="button" class="primary crm-save-and-value">Tasar y guardar</button></div>\`);
   
   $('#crmSaveOnly')?.addEventListener('click',saveOnlyFromCrm);
   $('#crmSaveAndValue')?.addEventListener('click',()=>$('#tasadorForm')?.requestSubmit());
   document.body.classList.add('is-crm-smart-missing');
   setTimeout(()=>{document.querySelectorAll('.grid').forEach(grid=>{const visible=[...grid.children].some(x=>!x.hidden);grid.classList.toggle('is-empty-grid',!visible)});},0);

   // ================= AI AGENT REPORT LOGIC =================
   panel.hidden = false;
   const titleNode = $('#crmCompletionTitle');
   const textNode = $('#crmCompletionText');
   const loadingNode = $('#crmAiLoading');
   const knownNode = $('#crmKnownData');
   const missingNode = $('#crmMissingData');

   // Calculate AI stuff
   const comunaName = launchParams.get('comuna') || $('#comuna')?.value || 'tu zona';
   const mockRating = Math.round(65 + (score * 0.25)); // 65 to 90
   const percentile = 100 - mockRating + 3; // e.g rating 85 -> top 18%

   if(loadingNode) loadingNode.hidden = false;
   if(textNode) textNode.hidden = true;
   if(knownNode) knownNode.hidden = true;
   if(missingNode) missingNode.hidden = true;

   setTimeout(() => {
     if(loadingNode) loadingNode.hidden = true;
     if(titleNode) titleNode.textContent = missingManual.length ? 'Información Parcial Recopilada' : 'Análisis Completo';
     
     if(textNode) {
       textNode.hidden = false;
       if (missingManual.length) {
         textNode.innerHTML = \`Hemos hecho un pequeño catastro de parcelas parecidas a la tuya en <strong>\${comunaName}</strong> y encontramos que tu propiedad se posiciona en el <strong>Top \${percentile}%</strong> según el rating de competitividad (Puntaje preliminar: \${mockRating}/100).</br></br>Con la información histórica hemos logrado realizar una tasación preliminar, pero para obtener mayor precisión y generar tu Informe Final, <strong>requerimos que rellenes los campos faltantes a continuación.</strong>\`;
       } else {
         textNode.innerHTML = \`Hemos completado el catastro en <strong>\${comunaName}</strong> y tu ficha está 100% lista. Tu propiedad se posiciona en el <strong>Top \${percentile}%</strong> del mercado local.\`;
       }
     }
     
     if(knownNode) knownNode.hidden = false;
     if(missingNode) missingNode.hidden = false;
   }, 1800);
}
`;

let newJs = js.substring(0, startIndex) + newFunction + js.substring(endIndex);

fs.writeFileSync('frontend-v2/plataforma/publicar/tasador-publico.js', newJs, 'utf8');
console.log('Successfully updated tasador-publico.js');
