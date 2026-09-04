const fs = require('fs');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recepción y Reporte Premium | Tu Parcela Lista</title>
  
  <link rel="icon" type="image/png" href="./assets/logo-tu-parcela-lista.png">

  <!-- TPL Core Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- TPL Global CSS -->
  <link href="./css/tpl-brand-system.css" rel="stylesheet"/>
  <link href="./css/tpl-design-system.css" rel="stylesheet"/>
  <link href="./css/index.css" rel="stylesheet"/>

  <style>
    :root {
      --premium-bg: #04101e;
      --premium-bg-sec: #091a2e;
      --accent-gold: #d4af37;
      --accent-bronze: #c5a059;
      --text-main: #ffffff;
      --text-muted: #94a3b8;
    }

    body.premium-page {
      background-color: var(--premium-bg);
      color: var(--text-main);
    }
    
    .premium-page .tpl-header {
      background-color: rgba(4, 16, 30, 0.95);
      border-bottom: 1px solid rgba(212, 175, 55, 0.2);
    }
    .premium-page .tpl-nav a, .premium-page .tpl-mobile-actions a, .premium-page .tpl-menu-button { color: var(--text-main); }
    .premium-page .tpl-nav a:hover { color: var(--accent-gold); }
    .premium-page .tpl-brand img { filter: brightness(0) invert(1); }

    .premium-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    /* Success Header */
    .success-header {
      padding: 8rem 0 4rem;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .success-icon {
      font-size: 4rem;
      color: #10b981;
      margin-bottom: 1rem;
    }
    .success-header h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 3.5rem;
      color: var(--accent-gold);
      margin-bottom: 1rem;
    }
    .success-header p {
      font-size: 1.2rem;
      color: var(--text-muted);
    }

    /* Summary Dashboard */
    .summary-section {
      padding: 4rem 0;
    }
    .summary-card {
      background: var(--premium-bg-sec);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 12px;
      padding: 2.5rem;
      margin-bottom: 2rem;
    }
    .summary-card h2 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 2rem;
      color: var(--text-main);
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 1rem;
    }
    .data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }
    .data-item {
      display: flex;
      flex-direction: column;
    }
    .data-item span {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.3rem;
    }
    .data-item strong {
      font-size: 1.2rem;
      color: var(--accent-gold);
      font-weight: 500;
    }

    /* Premium Offer */
    .premium-offer {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), transparent);
      border: 2px solid var(--accent-gold);
      border-radius: 12px;
      padding: 3rem;
      text-align: center;
      margin: 4rem 0;
    }
    .premium-offer h3 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 2.5rem;
      color: var(--text-main);
      margin-bottom: 1rem;
    }
    .premium-offer p {
      font-size: 1.1rem;
      line-height: 1.6;
      color: var(--text-muted);
      max-width: 700px;
      margin: 0 auto 2rem;
    }
    
    .feature-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      text-align: left;
      margin-bottom: 3rem;
    }
    .feature-item h4 {
      color: var(--accent-gold);
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feature-item p {
      font-size: 0.95rem;
      margin: 0;
      color: #cbd5e1;
    }

    .btn-gold {
      display: inline-block;
      background-color: var(--accent-gold);
      color: var(--premium-bg);
      font-weight: 700;
      font-size: 1.1rem;
      text-decoration: none;
      padding: 1.2rem 3rem;
      border-radius: 30px;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .btn-gold:hover {
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
      transform: translateY(-2px);
    }

    /* Brokerage Notice */
    .brokerage-notice {
      text-align: center;
      padding: 3rem;
      background: var(--premium-bg-sec);
      border-radius: 12px;
      margin-bottom: 4rem;
    }
    .brokerage-notice h4 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }

    .loader {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: var(--accent-gold);
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body class="premium-page">

  <header class="tpl-header">
    <a class="tpl-brand" href="./index.html">
      <img src="./assets/brand/tpl-mark.svg" width="158" height="68" alt="Tu Parcela Lista">
    </a>
  </header>

  <main>
    <section class="success-header">
      <div class="premium-container">
        <div class="success-icon">✓</div>
        <h1>Publicación Recibida</h1>
        <p>Hemos procesado exitosamente los antecedentes de tu propiedad.</p>
      </div>
    </section>

    <section class="summary-section">
      <div class="premium-container">
        
        <div class="summary-card" id="dataSummaryCard">
          <h2>Resumen de Antecedentes</h2>
          <div id="dataGrid" class="data-grid">
            <div style="text-align:center; grid-column: 1/-1; padding: 2rem;"><div class="loader"></div><p style="margin-top:1rem;">Cargando expediente...</p></div>
          </div>
        </div>

        <div class="premium-offer" id="premiumOfferBlock">
          <h3>Eleva tu Publicación con el Informe Premium</h3>
          <p>Potencia tus oportunidades de venta con un análisis profesional respaldado por el Agente IA de Tu Parcela Lista. Un entregable formal que transmite confianza total a tus posibles compradores.</p>
          
          <div class="feature-list">
            <div class="feature-item">
              <h4>🤖 Diagnóstico Agente IA</h4>
              <p>Analizamos el catastro de mercado de tu comuna evaluando parcelas semejantes (según superficie, río, condominio, etc) para calcular tu rating competitivo.</p>
            </div>
            <div class="feature-item">
              <h4>🔍 Investigación Garantizada</h4>
              <p>Si nuestro algoritmo no tiene suficientes parcelas en tu zona, nuestros asesores investigarán digitalmente el sector de forma manual para completar tu catastro.</p>
            </div>
            <div class="feature-item">
              <h4>📄 PDF Corporativo</h4>
              <p>Recibe un documento hermoso, con nuestro sello de confianza institucional. Ideal para enviarlo por WhatsApp a tus posibles clientes y justificar tu precio de venta.</p>
            </div>
          </div>
          
          <div style="margin-bottom: 1.5rem; font-size: 2rem; color: var(--accent-gold); font-family: 'Cormorant Garamond', serif; font-style: italic;">
            Solo $9.990 CLP
          </div>
          <a id="buyPremiumBtn" href="#" class="btn-gold" target="_blank" rel="noopener noreferrer">Adquirir Informe Premium</a>
        </div>

        <div class="brokerage-notice">
          <h4>¿Prefieres no hacer nada?</h4>
          <p style="color: var(--text-muted); max-width: 600px; margin: 0 auto;">Si no tienes tiempo para atender clientes o negociar, Tu Parcela Lista puede hacerse cargo de todo el proceso de corretaje. Nuestra comisión es de un <strong>2%</strong> (más IVA) sobre el precio de venta final, solo si vendemos.</p>
        </div>

      </div>
    </section>
  </main>

  <footer style="text-align:center; padding: 2rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05);">
    <p>&copy; 2026 Tu Parcela Lista.</p>
  </footer>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      try {
        const payloadRaw = localStorage.getItem('tpl_premium_pending_order');
        if (!payloadRaw) {
          document.getElementById('dataGrid').innerHTML = '<p style="color:#ef4444; text-align:center;">No se encontró información reciente de publicación. Vuelve al inicio.</p>';
          return;
        }
        
        const payload = JSON.parse(payloadRaw);
        const d = payload.entrada;
        const v = payload.resultado;

        // Render Summary
        const grid = document.getElementById('dataGrid');
        let html = '';
        
        const addRow = (label, value) => {
          if(value) html += \`<div class="data-item"><span>\${label}</span><strong>\${value}</strong></div>\`;
        };

        addRow('Comuna', d.comuna);
        addRow('Región', d.region);
        addRow('Superficie', d.superficie ? d.superficie + ' m²' : null);
        addRow('Precio Publicación', d.precio ? d.moneda + ' ' + Number(d.precio).toLocaleString('es-CL') : null);
        
        // Atributos detectados
        let attrs = [];
        if(d.rol) attrs.push(d.rol);
        if(d.electricity) attrs.push(d.electricity);
        if(d.water) attrs.push('Agua: ' + d.water);
        if(d.condominium === 'si') attrs.push('Condominio');
        if(attrs.length > 0) {
          addRow('Características', attrs.join(' • '));
        }

        // Valoración básica si existe
        if (v && v.rating) {
           addRow('Rating TPL Preliminar', v.rating + '/100');
        }

        grid.innerHTML = html;

        // Setup WhatsApp link
        let text = encodeURIComponent(\`Hola, acabo de publicar mi parcela en \${d.comuna || 'TPL'} y quiero adquirir el Informe Premium IA por $9.990.\`);
        document.getElementById('buyPremiumBtn').href = 'https://wa.me/56988508361?text=' + text;
        
      } catch (e) {
        console.error(e);
        document.getElementById('dataGrid').innerHTML = '<p style="color:#ef4444;">Error al cargar los datos.</p>';
      }
    });
  </script>
</body>
</html>`;

fs.writeFileSync('frontend-v2/informe-premium.html', htmlContent, 'utf8');
console.log("Successfully integrated informe-premium dashboard logic");
