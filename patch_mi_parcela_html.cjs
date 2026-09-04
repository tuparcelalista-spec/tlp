const fs = require('fs');

const htmlPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/mi-parcela.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Re-order the main menu
html = html.replace(/<nav class="tpl-nav".*?<\/nav>/s, `<nav class="tpl-nav" aria-label="Navegación principal">
    <a href="#inicio">Inicio</a>
    <a href="#mis-datos">Mis Datos</a>
    <a href="#tasacion">Tasación</a>
    <a href="#planes">Planes</a>
  </nav>`);

// 2. Build the interactive AI Funnel Section
const funnelHTML = `
  <section id="funnel-welcome" class="panel" style="text-align:center; padding: 40px 20px; background: linear-gradient(135deg, #1e3a8a, #0f172a); color: white; border-radius: 16px; margin-bottom: 30px;">
    <img src="./assets/logo-tu-parcela-lista.png" width="100" style="margin-bottom: 20px; filter: brightness(0) invert(1);" alt="TPL">
    <h1 style="font-size: 2.2rem; margin-bottom: 12px; color: white;">¡Gracias por ser parte de Tu Parcela Lista!</h1>
    <p style="font-size: 1.1rem; color: #cbd5e1; max-width: 600px; margin: 0 auto 30px;">Estamos felices de acompañarte en este proceso. Tenemos tu propiedad en nuestra base de datos y nuestro motor de Inteligencia Artificial está listo para trabajar para ti.</p>
    
    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 12px; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #60a5fa; margin-top: 0;">¿Quieres conocer el valor de tasación que tiene tu propiedad?</h2>
      
      <!-- Interactive Attribute Reveal Box -->
      <div id="ai-thinking-box" style="margin: 20px 0; min-height: 120px; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 20px; text-align: left; display: none;">
         <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
           <div class="ai-spinner"></div>
           <strong style="color: #60a5fa; font-size: 1.1rem;" id="ai-status-text">Analizando tu propiedad...</strong>
         </div>
         <ul id="ai-attributes-list" style="list-style: none; padding: 0; margin: 0; color: #cbd5e1; font-family: monospace; line-height: 1.6;">
         </ul>
      </div>

      <button id="btn-start-valuation" class="primary" style="font-size: 1.2rem; padding: 15px 30px; margin-top: 20px; background: #3b82f6; border: none; border-radius: 30px; color: white; cursor: pointer; font-weight: bold; width: 100%;">TASAR MI PROPIEDAD</button>
      
      <div id="missing-attributes-alert" style="display:none; margin-top: 20px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 15px; border-radius: 8px; color: #fca5a5; text-align: left;">
        <strong>⚠️ Faltan campos para lograr la tasación correcta:</strong>
        <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Necesitamos que completes el agua, la electricidad y el rol en el formulario de abajo para poder entregarte un valor preciso.</p>
        <button onclick="document.getElementById('update').scrollIntoView({behavior:'smooth'})" style="margin-top: 10px; background: transparent; border: 1px solid #fca5a5; color: #fca5a5; padding: 5px 15px; border-radius: 4px; cursor: pointer;">Completar datos ahora</button>
      </div>
    </div>
  </section>

  <!-- Valuation Results & Upsell -->
  <section id="funnel-results" class="panel" style="display:none; padding: 40px; background: #f8fafc; border-radius: 16px; margin-bottom: 30px; border: 1px solid #e2e8f0; text-align: center;">
    <h2 style="color: #0f172a; margin-top: 0; font-size: 2rem;">Resultados de Tasación TPL</h2>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 2px solid #3b82f6;">
        <span style="display: block; font-size: 0.9rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Valor TPL Tasación</span>
        <strong id="funnel-tpl-value" style="display: block; font-size: 2.5rem; color: #1e3a8a; margin: 10px 0;">Calculando...</strong>
        <small style="color: #94a3b8;">Precio de mercado recomendado</small>
      </div>
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 2px solid #ef4444;">
        <span style="display: block; font-size: 0.9rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Valor Apuro (Venta Rápida)</span>
        <strong id="funnel-apuro-value" style="display: block; font-size: 2.5rem; color: #ef4444; margin: 10px 0;">Calculando...</strong>
        <small id="funnel-apuro-context" style="color: #94a3b8; display: block; line-height: 1.4;">Calculado según promedio TPL y las parcelas cercanas más económicas de tu comuna.</small>
      </div>
    </div>

    <!-- Estrategia Recomendada -->
    <div id="strategy-recommendation" style="background: #e0e7ff; padding: 25px; border-radius: 12px; border: 1px solid #c7d2fe; margin-bottom: 40px; text-align: left;">
      <h3 style="color: #3730a3; margin-top: 0;">Estrategia Recomendada</h3>
      <p id="strategy-text" style="color: #4338ca; font-size: 1.1rem; font-weight: 500; margin-bottom: 0;"></p>
    </div>

    <!-- Planes de Inversión -->
    <h3 style="font-size: 1.8rem; color: #0f172a;">Planes de Inversión para Venta</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; text-align: left;">
      <!-- Básico -->
      <div style="background: white; border: 1px solid #cbd5e1; padding: 20px; border-radius: 12px;">
        <h4 style="margin: 0 0 10px 0; color: #475569;">Plan Básico</h4>
        <strong style="font-size: 1.5rem; color: #0f172a; display: block; margin-bottom: 15px;">$50.000</strong>
        <ul style="padding-left: 20px; color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">
          <li>Publicación en portales inmobiliarios líderes</li>
        </ul>
        <button onclick="window.open('https://wa.me/56988508361?text=Hola,%20me%20interesa%20el%20Plan%20Básico%20de%20$50.000%20para%20vender%20mi%20parcela.')" style="width:100%; padding: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: bold; color: #475569;">Elegir Básico</button>
      </div>
      <!-- Normal -->
      <div style="background: white; border: 2px solid #3b82f6; padding: 20px; border-radius: 12px; position: relative;">
        <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: white; font-size: 0.75rem; padding: 2px 10px; border-radius: 10px; font-weight: bold;">MÁS POPULAR</span>
        <h4 style="margin: 0 0 10px 0; color: #3b82f6;">Plan Normal</h4>
        <strong style="font-size: 1.5rem; color: #0f172a; display: block; margin-bottom: 15px;">$70.000</strong>
        <ul style="padding-left: 20px; color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">
          <li>Publicación en portales</li>
          <li>Video con Inteligencia Artificial</li>
          <li>Campaña en Redes Sociales (IG/FB)</li>
        </ul>
        <button onclick="window.open('https://wa.me/56988508361?text=Hola,%20me%20interesa%20el%20Plan%20Normal%20de%20$70.000%20con%20Video%20IA.')" style="width:100%; padding: 10px; background: #3b82f6; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; color: white;">Elegir Normal</button>
      </div>
      <!-- Mayor -->
      <div style="background: white; border: 1px solid #cbd5e1; padding: 20px; border-radius: 12px;">
        <h4 style="margin: 0 0 10px 0; color: #475569;">Plan Mayor</h4>
        <strong style="font-size: 1.5rem; color: #0f172a; display: block; margin-bottom: 15px;">$90.000</strong>
        <ul style="padding-left: 20px; color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">
          <li>Todo lo del Plan Normal</li>
          <li>Video grabado exclusivo de la propiedad</li>
          <li>Landing Page exclusiva para Google Ads</li>
        </ul>
        <button onclick="window.open('https://wa.me/56988508361?text=Hola,%20me%20interesa%20el%20Plan%20Mayor%20de%20$90.000%20con%20Landing%20Page.')" style="width:100%; padding: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: bold; color: #475569;">Elegir Mayor</button>
      </div>
      <!-- Apuro -->
      <div style="background: linear-gradient(135deg, #ef4444, #991b1b); border: none; padding: 20px; border-radius: 12px; color: white;">
        <h4 style="margin: 0 0 10px 0; color: #fca5a5;">Plan Apuro (Urgencia)</h4>
        <strong style="font-size: 1.5rem; color: white; display: block; margin-bottom: 15px;">$120.000</strong>
        <ul style="padding-left: 20px; color: #fecaca; font-size: 0.9rem; margin-bottom: 20px;">
          <li>TODO lo del Plan Mayor</li>
          <li>Se inyecta urgencia extrema en campañas</li>
          <li><strong>Garantía:</strong> Si logramos la venta, se descuenta este valor de la comisión final.</li>
        </ul>
        <button onclick="window.open('https://wa.me/56988508361?text=Hola,%20necesito%20vender%20rápido.%20Me%20interesa%20el%20Plan%20Apuro%20de%20$120.000.')" style="width:100%; padding: 10px; background: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; color: #991b1b;">Elegir Apuro</button>
      </div>
    </div>
  </section>
`;

// Inject funnel after the app div opens
html = html.replace('<div id="app" hidden>', '<div id="app" hidden>\n' + funnelHTML);

fs.writeFileSync(htmlPath, html, 'utf8');

// Also inject the CSS for the spinner
const cssPath = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/css/mi-parcela.css';
let css = fs.readFileSync(cssPath, 'utf8');
css += `
/* AI Funnel Spinner Animations */
.ai-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(96, 165, 250, 0.3);
  border-radius: 50%;
  border-top-color: #60a5fa;
  animation: spin 1s ease-in-out infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.attribute-reveal {
  opacity: 0;
  transform: translateY(10px);
  animation: fadeUp 0.5s forwards;
}
@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}
`;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('HTML and CSS patched with new funnel structure.');
