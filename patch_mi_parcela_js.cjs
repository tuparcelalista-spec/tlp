const fs = require('fs');

const jsPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/mi-parcela.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Inject the funnel logic into the load/fill functions, or at the end of the IIFE
const funnelLogic = `
  // AI Funnel Logic
  const btnStart = document.getElementById('btn-start-valuation');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (!current) return;
      btnStart.style.display = 'none';
      document.getElementById('ai-thinking-box').style.display = 'block';
      
      const attrs = document.getElementById('ai-attributes-list');
      attrs.innerHTML = '';
      const lines = [
        \`> Conectando con Catastro TPL...\`,
        \`> Cruzando datos en \${current.comuna || 'tu comuna'}...\`,
        \`> Verificando superficie: \${current.superficie_m2 || 'N/A'} m2...\`,
        \`> Evaluando atributos clave (Rol, Agua, Luz)...\`
      ];
      
      let step = 0;
      const interval = setInterval(() => {
        if (step < lines.length) {
          const li = document.createElement('li');
          li.className = 'attribute-reveal';
          li.textContent = lines[step];
          attrs.appendChild(li);
          step++;
        } else {
          clearInterval(interval);
          
          // Check for missing key attributes
          const form = document.getElementById('ownerForm');
          const agua = form.querySelector('[name="water"]').value;
          const luz = form.querySelector('[name="electricity"]').value;
          const rol = form.querySelector('[name="rol_situacion"]').value;
          
          if (!agua || !luz || !rol) {
            document.getElementById('ai-status-text').textContent = "Evaluación pausada.";
            document.getElementById('missing-attributes-alert').style.display = 'block';
          } else {
            document.getElementById('ai-status-text').textContent = "Cálculo completado.";
            showFunnelResults();
          }
        }
      }, 1000);
    });
  }

  function showFunnelResults() {
    document.getElementById('funnel-results').style.display = 'block';
    
    // 1. Calculate TPL Value
    const tplValue = Number(currentTasacion?.valor_tpl_oficial || currentTasacion?.valor_tpl_total || currentTasacion?.resultado?.valor_tpl_total || 0);
    const moneyStr = (v) => Number(v || 0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
    
    if (tplValue > 0) {
      document.getElementById('funnel-tpl-value').textContent = moneyStr(tplValue);
    } else {
      document.getElementById('funnel-tpl-value').textContent = 'Faltan Datos';
      return;
    }
    
    // 2. Calculate Valor Apuro (Average of TPL + Average of 5 cheapest in Comuna)
    let apuroValue = tplValue * 0.8; // Fallback
    
    if (window.parcelas && current.comuna) {
      const cNorm = String(current.comuna).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      const competitors = window.parcelas.filter(p => {
        const pc = String(p.comuna||"").normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
        return pc === cNorm;
      }).map(p => {
        let pr = p.precio;
        if (typeof pr === 'string') pr = parseInt(pr.replace(/\\D/g, ''), 10);
        return pr;
      }).filter(pr => pr > 0).sort((a,b) => a - b);
      
      if (competitors.length > 0) {
        const cheapest5 = competitors.slice(0, 5);
        const avgCheapest = cheapest5.reduce((acc, v) => acc + v, 0) / cheapest5.length;
        
        apuroValue = (tplValue + avgCheapest) / 2;
        
        document.getElementById('funnel-apuro-context').innerHTML = \`Calculado según el promedio TPL y las \${cheapest5.length} parcelas más económicas publicadas en <strong>\${current.comuna}</strong>.\`;
      }
    }
    
    document.getElementById('funnel-apuro-value').textContent = moneyStr(apuroValue);
    
    // 3. Strategy Recommendation
    const publishedPrice = Number(current.precio_publicado || current.tasador_entrada?.asking || 0);
    const diff = publishedPrice - tplValue;
    const diffPct = tplValue > 0 ? Math.abs(diff) / tplValue : 0;
    
    const strategyEl = document.getElementById('strategy-text');
    
    if (publishedPrice === 0) {
       strategyEl.innerHTML = "No has publicado un precio oficial. Usa nuestro valor de tasación para definir el precio base de tu campaña y elige tu plan.";
    } else if (publishedPrice < tplValue || (diff < 0 && diffPct > 0.05)) {
       strategyEl.innerHTML = "Tu precio está por debajo del Valor TPL. Estás muy competitivo. La mejor opción es llevarla rápidamente a <strong>Portales Inmobiliarios</strong> para conseguir ofertas inmediatas.";
    } else if (diffPct <= 0.05) {
       strategyEl.innerHTML = "Tu precio está alineado exactamente con el Valor TPL de mercado. Te recomendamos potenciarlo haciendo un <strong>Video con Inteligencia Artificial</strong> para moverlo en Instagram y Facebook.";
    } else {
       strategyEl.innerHTML = "Tu precio está por encima del Valor TPL. Estás apuntando a un comprador premium. Necesitas demostrar el valor extra de tu propiedad haciendo un <strong>Video Grabado Exclusivo</strong>.";
    }
  }
`;

// Inject into load() function right before the closing brace
js = js.replace('load();\n})();', `${funnelLogic}\n  load();\n})();`);

fs.writeFileSync(jsPath, js, 'utf8');
console.log('JS patched with Funnel Logic!');
