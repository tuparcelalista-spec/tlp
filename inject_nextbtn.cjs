const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/publicar/publicar.js', 'utf8');

const silentValidateStr = `
function silentValidate(step) {
 const pane=$(\`.wizard-step[data-step="\${step}"]\`);
 if(!pane) return true;
 const required=pane.querySelectorAll('[required]');
 for(const el of required){
  if(el.type==='checkbox'&&!el.checked) return false;
  if(el.type==='radio'){
   const selected=pane.querySelector(\`input[name="\${el.name}"]:checked\`);
   if(!selected) return false;
   continue;
  }
  if(!el.value?.trim()) return false;
 }
 if(step===1&&!Number($('#superficie').value)) return false;
 if(step===1&&!selectedValues('necesidad').length) return false;
 return true;
}

function syncNextButton() {
    const next = $('#nextBtn');
    if (!next) return;
    const isValid = silentValidate(current);
    if (isValid) {
        next.style.opacity = '1';
        next.style.pointerEvents = 'auto';
        next.style.transform = 'scale(1.02)';
        next.style.boxShadow = '0 4px 12px rgba(0,90,160,0.4)';
        next.textContent = 'Siguiente ➔';
        next.style.transition = 'all 0.3s ease';
    } else {
        next.style.opacity = '0.5';
        next.style.pointerEvents = 'none';
        next.style.transform = 'scale(1)';
        next.style.boxShadow = 'none';
        next.textContent = 'Llena los campos ➔';
        next.style.transition = 'all 0.3s ease';
    }
}
`;

js = js.replace('function showStep(index){', silentValidateStr + '\nfunction showStep(index){');
js = js.replace("window.scrollTo({top:0,behavior:'smooth'});", "window.scrollTo({top:0,behavior:'smooth'});\n   syncNextButton();");

const bindStr = `
  const form=$('#publisherForm');if(form){
    form.addEventListener('input',()=>{
        updateDiagnosticMotivation();
        clearTimeout(window.__tplDraftTimer);
        window.__tplDraftTimer=setTimeout(saveDraft,450);
        syncNextButton();
    });
    form.addEventListener('change', syncNextButton);
    form.onsubmit=submit;
  }
`;
js = js.replace(/const form=\$\('#publisherForm'\);if\(form\)\{form\.addEventListener\('input',\(\)=>\{updateDiagnosticMotivation\(\);clearTimeout\(window\.__tplDraftTimer\);window\.__tplDraftTimer=setTimeout\(saveDraft,450\)\}\);form\.onsubmit=submit;\}/, bindStr);

fs.writeFileSync('frontend-v2/plataforma/publicar/publicar.js', js, 'utf8');
console.log('Dynamic next button validation added');
