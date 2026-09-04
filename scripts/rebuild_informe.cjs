const fs = require('fs');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tasación Inteligente de Parcelas | Informe Premium TPL</title>
  <meta name="description" content="Conocimiento y tecnología al servicio de tu inversión. Obtén el valor real de campos en Chile mediante nuestro modelo matemático de tasación inteligente.">
  <meta name="keywords" content="tasación de parcelas, evaluar terreno, informe premium, algoritmo inmobiliario, tasación inteligente, valorización rural">
  
  <meta property="og:title" content="Tasación Inteligente de Parcelas | Informe Premium TPL">
  <meta property="og:description" content="Conocimiento y tecnología al servicio de tu inversión. Obtén el valor real de campos en Chile mediante nuestro modelo matemático de tasación inteligente.">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://www.parcelalista.cl/image/logo_compartir.png">
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
    /* Premium Landing Overrides */
    :root {
      --premium-bg: #04101e; /* Deep Navy Blue */
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
    
    /* Make header dark mode compatible */
    .premium-page .tpl-header {
      background-color: rgba(4, 16, 30, 0.95);
      border-bottom: 1px solid rgba(212, 175, 55, 0.2);
    }
    .premium-page .tpl-nav a { color: var(--text-main); }
    .premium-page .tpl-nav a:hover { color: var(--accent-gold); }
    .premium-page .tpl-brand img { filter: brightness(0) invert(1); } /* Make logo white */
    .premium-page .tpl-mobile-actions a { color: var(--text-main); }
    .premium-page .tpl-menu-button { color: var(--text-main); }

    .premium-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
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
      border: 2px solid var(--accent-gold);
    }

    .btn-gold:hover {
      background-color: transparent;
      color: var(--accent-gold);
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
      transform: translateY(-2px);
    }

    /* Hero Section */
    .premium-hero {
      padding: 12rem 0 8rem;
      text-align: center;
      background: linear-gradient(to bottom, rgba(4, 16, 30, 0.8), var(--premium-bg)), url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80') center/cover no-repeat;
      min-height: 85vh;
      display: flex;
      align-items: center;
    }

    .premium-hero h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 4.5rem;
      margin-bottom: 1.5rem;
      color: var(--text-main);
      line-height: 1.1;
    }

    .premium-hero h1 span {
      color: var(--accent-gold);
      font-style: italic;
    }

    .premium-hero p {
      font-size: 1.35rem;
      max-width: 750px;
      margin: 0 auto 3.5rem;
      color: #e2e8f0;
      font-weight: 300;
      line-height: 1.6;
    }

    /* Problem Section */
    .problem-section {
      padding: 8rem 0;
      background-color: var(--premium-bg-sec);
    }

    .problem-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5rem;
      align-items: center;
    }

    .problem-text h2 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 2.8rem;
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }

    .problem-text.solution h2 {
      color: var(--accent-bronze);
    }

    .problem-text.solution {
      border-left: 1px solid rgba(212, 175, 55, 0.2);
      padding-left: 4rem;
      height: 100%;
    }

    .problem-text p {
      font-size: 1.15rem;
      color: var(--text-muted);
      line-height: 1.8;
    }

    /* Features Section */
    .features-section {
      padding: 10rem 0;
    }

    .section-header {
      text-align: center;
      margin-bottom: 5rem;
    }

    .section-header h2 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 3.5rem;
      margin-bottom: 1rem;
    }

    .section-header p {
      color: var(--accent-gold);
      font-size: 1rem;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 700;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2.5rem;
    }

    .feature-card {
      background-color: var(--premium-bg-sec);
      padding: 4rem 3rem;
      border-top: 2px solid var(--accent-gold);
      transition: all 0.4s ease;
      position: relative;
      overflow: hidden;
      border-radius: 8px;
    }
    
    .feature-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%);
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .feature-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    }
    .feature-card:hover::before { opacity: 1; }

    .feature-card h3 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.8rem;
      margin-bottom: 1.2rem;
      color: var(--accent-gold);
      position: relative;
      z-index: 1;
    }

    .feature-card p {
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.7;
      position: relative;
      z-index: 1;
    }

    /* CTA Section */
    .cta-section {
      padding: 10rem 0;
      background-color: var(--premium-bg-sec);
      text-align: center;
      border-top: 1px solid rgba(212, 175, 55, 0.1);
    }

    .cta-section h2 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 3.5rem;
      margin-bottom: 1.5rem;
    }

    .cta-section .price {
      font-family: 'Cormorant Garamond', serif;
      font-size: 3rem;
      color: var(--accent-gold);
      margin-bottom: 1.5rem;
      display: block;
      font-style: italic;
    }

    .cta-section p {
      font-size: 1.25rem;
      margin-bottom: 3.5rem;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto 3.5rem auto;
    }

    .premium-footer {
      padding: 4rem 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.95rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    @media (max-width: 992px) {
      .premium-hero h1 { font-size: 3.5rem; }
      .features-grid { grid-template-columns: repeat(2, 1fr); }
      .problem-grid { grid-template-columns: 1fr; gap: 4rem; }
      .problem-text.solution { border-left: none; padding-left: 0; border-top: 1px solid rgba(212, 175, 55, 0.2); padding-top: 3rem; }
    }

    @media (max-width: 768px) {
      .premium-hero h1 { font-size: 2.8rem; }
      .features-grid { grid-template-columns: 1fr; }
      .section-header h2, .cta-section h2 { font-size: 2.8rem; }
    }
  </style>
</head>
<body class="premium-page">

  <header class="tpl-header">
    <a class="tpl-brand" href="./index.html" aria-label="Tu Parcela Lista, inicio">
      <img src="./assets/brand/tpl-mark.svg" width="158" height="68" alt="Tu Parcela Lista">
    </a>
    <nav class="tpl-nav" aria-label="Navegación principal">
      <a href="./index.html#buscador">Buscar parcelas</a>
      <a href="./como-comprar.html">Cómo comprar</a>
      <a href="./red-partner-v2/index.html">Red Partner</a>
      <a href="./plataforma/tpl-business/index.html">TPL Business</a>
      <a class="tpl-publish" href="./plataforma/publicar/index.html">Publicar</a>
    </nav>
    <div class="tpl-mobile-actions">
      <a href="./index.html#resultados">Parcelas</a>
      <a class="tpl-publish" href="./plataforma/publicar/index.html">Publicar</a>
      <button id="menu-toggle" class="tpl-menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Abrir menú">☰</button>
    </div>
    <nav id="mobile-menu" class="tpl-mobile-menu" hidden aria-label="Menú móvil">
      <a href="./index.html#buscador">Buscar parcelas</a>
      <a href="./como-comprar.html">Cómo comprar</a>
      <a href="./red-partner-v2/index.html">Red Partner</a>
      <a href="./plataforma/tpl-business/index.html">TPL Business</a>
    </nav>
  </header>

  <main>
    <section class="premium-hero">
      <div class="premium-container">
        <h1>Tasación Inteligente <span>para Inversionistas</span></h1>
        <p>Conocimiento y tecnología al servicio de tu inversión. Obtén el valor real de campos en Chile mediante nuestro modelo matemático de tasación inteligente.</p>
        <a href="#solicitar" class="btn-gold">Descubrir el Valor Real</a>
      </div>
    </section>

    <section class="problem-section">
      <div class="premium-container">
        <div class="problem-grid">
          <div class="problem-text">
            <h2>Tasaciones tradicionales que no entienden de campos.</h2>
            <p>La gran mayoría del mercado utiliza métodos obsoletos. Se basan en promedios generales que ignoran por completo las características únicas que le dan valor a tu tierra.</p>
          </div>
          <div class="problem-text solution">
            <h2>La Solución TPL.</h2>
            <p>Un análisis de vanguardia, respaldado por inteligencia satelital y el criterio experto de especialistas en bienes raíces rurales, diseñado para maximizar el valor de tu patrimonio.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="features-section">
      <div class="premium-container">
        <div class="section-header">
          <p>Nuestra Metodología</p>
          <h2>Ventaja Competitiva</h2>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <h3>Topografía e Hidrología</h3>
            <p>Evaluamos a fondo pendientes, exposición solar y disponibilidad real de agua. Factores críticos y determinantes que definen el valor más alto posible para tu parcela.</p>
          </div>
          <div class="feature-card">
            <h3>Catastro Competitivo</h3>
            <p>Mapeamos a tus vecinos de forma precisa. Conoce con total transparencia a qué precio exacto se están transando propiedades comparables en tu mismo sector.</p>
          </div>
          <div class="feature-card">
            <h3>Ranking de Venta Rápida</h3>
            <p>Te entregamos el precio óptimo y estratégico para vender en el menor tiempo posible, asegurando liquidez sin castigar un solo peso del valor de tu inversión.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section" id="solicitar">
      <div class="premium-container">
        <h2>No dejes dinero sobre la mesa.</h2>
        <span class="price">UF 1.5</span>
        <p>Asegura el valor de tu patrimonio con datos duros. Solicita tu informe ahora.</p>
        <a href="https://wa.me/56988508361?text=Hola,%20quiero%20comprar%20el%20Informe%20Premium%20TPL%20para%20mi%20parcela." class="btn-gold" target="_blank" rel="noopener noreferrer">Solicitar mi Informe</a>
      </div>
    </section>
  </main>

  <footer class="premium-footer">
    <div class="premium-container">
      <p>&copy; 2026 Tu Parcela Lista. Todos los derechos reservados.</p>
    </div>
  </footer>

  <script>
    (function(){
      const toggle = document.getElementById('menu-toggle');
      const menu = document.getElementById('mobile-menu');
      if (toggle && menu) {
        toggle.addEventListener('click', () => {
          const hidden = menu.hasAttribute('hidden');
          if (hidden) menu.removeAttribute('hidden');
          else menu.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', hidden ? 'true' : 'false');
        });
      }
    })();
  </script>
</body>
</html>`;

fs.writeFileSync('frontend-v2/informe-premium.html', htmlContent, 'utf8');
console.log("Successfully rewrote informe-premium.html");
