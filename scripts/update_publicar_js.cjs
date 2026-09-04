const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/publicar/publicar.js', 'utf8');

const target = "const form=$('#publisherForm');if(form){form.addEventListener('input',()=>{updateDiagnosticMotivation();clearTimeout(window.__tplDraftTimer);window.__tplDraftTimer=setTimeout(saveDraft,450)});form.onsubmit=submit;}";

const replacement = `
  const premiumBtn = $('#submitPremiumBtn');
  if (premiumBtn) {
    premiumBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if(!validateStep(5)) return showStep(5);
      
      premiumBtn.disabled = true;
      if(premiumBtn.querySelector('span')) premiumBtn.querySelector('span').textContent = 'Generando Reporte...';
      
      const payload = {
         entrada: data(),
         resultado: valuation,
         timestamp: Date.now()
      };
      localStorage.setItem('tpl_premium_pending_order', JSON.stringify(payload));
      
      window.location.href = '../../informe-premium.html';
    });
  }
  const form=$('#publisherForm');if(form){form.addEventListener('input',()=>{updateDiagnosticMotivation();clearTimeout(window.__tplDraftTimer);window.__tplDraftTimer=setTimeout(saveDraft,450)});form.onsubmit=submit;}
`;

js = js.replace(target, replacement);

fs.writeFileSync('frontend-v2/plataforma/publicar/publicar.js', js, 'utf8');
console.log('Modified publicar.js to handle premium button');
