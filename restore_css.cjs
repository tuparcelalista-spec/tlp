const fs = require('fs');

let css = `/* 
  PARCELA CSS - VERSIÓN 4 (Restaurada y Mejorada Premium)
  Utiliza variables globales de global-tokens.css
*/

body {
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  color: var(--c-text);
  background-color: var(--c-bg);
}

.v3-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Header Nav */
.v3-header-nav {
  margin-bottom: 24px;
}
.v3-location {
  font-size: 0.85rem;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  margin-bottom: 8px;
}
.v3-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.5rem;
  color: var(--c-primary-dark);
  margin: 0;
  line-height: 1.1;
}

/* Premium Bento Gallery */
.v3-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  position: relative;
  margin-bottom: 40px;
  border-radius: 12px;
  height: 500px;
}
.v3-gallery-main {
  height: 100%;
  overflow: hidden;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  background: #e2e8f0;
}
.v3-gallery-sub {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  height: 100%;
}
.v3-gallery-sub div {
  overflow: hidden;
  background: #e2e8f0;
  position: relative;
}
.v3-gallery-corner-tr { border-top-right-radius: 12px; }
.v3-gallery-corner-br { border-bottom-right-radius: 12px; }

.v3-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease, filter 0.4s ease;
}
.v3-gallery img:hover {
  transform: scale(1.03);
  filter: brightness(1.05);
  cursor: pointer;
}
.v3-gallery-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: white;
  color: #222;
  border: 1px solid #222;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s;
  z-index: 10;
}
.v3-gallery-btn:hover {
  background: #f7f7f7;
  transform: scale(1.02);
}

/* Content Grid */
.v3-content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 48px;
  align-items: start;
}

/* Sidebar & Sticky */
.v3-sidebar-col {
  position: relative;
}
.v3-sticky-card {
  position: sticky;
  top: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}
.v3-price-block {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}
.v3-price {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
}
.v3-price-note {
  font-size: 0.9rem;
  color: #64748b;
  margin-top: 4px;
}
.v3-btn {
  width: 100%;
  padding: 14px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 12px;
  transition: all 0.2s;
}
.v3-btn-primary {
  background: #0f172a;
  color: white;
  border: none;
}
.v3-btn-primary:hover {
  background: #1e293b;
}
.v3-btn-secondary {
  background: white;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}
.v3-btn-secondary:hover {
  background: #f1f5f9;
}

/* Typography & Content Elements */
.v3-section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: #0f172a;
}
.v3-desc {
  font-size: 1.05rem;
  line-height: 1.7;
  color: #475569;
}

/* Mobile & Tablet Responsive */
@media (max-width: 900px) {
  .v3-container {
    padding: 16px;
  }
  
  .v3-content-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .v3-sidebar-col {
    order: -1; /* Mueve la caja de precio y contacto arriba en móviles */
    margin-bottom: 24px;
  }
  .v3-sticky-card {
    position: static;
    padding: 20px;
  }
  
  .v3-title {
    font-size: 1.8rem;
  }
  
  /* Gallery colapsada a single hero image con ancho total */
  .v3-gallery {
    grid-template-columns: 1fr;
    height: 350px;
    border-radius: 0;
    margin-left: -16px;
    margin-right: -16px;
    margin-top: 16px;
    gap: 0;
  }
  .v3-gallery-main {
    border-radius: 0;
  }
  .v3-gallery-sub {
    display: none;
  }
  .v3-gallery-btn {
    bottom: 16px;
    right: 16px;
    padding: 8px 12px;
    font-size: 0.85rem;
  }
}
`;

fs.writeFileSync('frontend-v2/css/parcela.css', css);
console.log('parcela.css restored and fully responsive!');
