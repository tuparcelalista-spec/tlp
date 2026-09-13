/**
 * Estilos canónicos del Hero de Portada y Video Corporativo TPL.
 * Recrea la consola de vidrio ahumado con acentos dorados y el diseño responsive
 * de 2 paneles en escritorio / 1 columna en móvil.
 */
export const homeHeroCss = `
.tpl-home-hero {
  position: relative;
  overflow: hidden;
  background: #021628;
  min-height: 520px;
}
.tpl-home-hero__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 48%;
  opacity: 0.65;
  transform: scale(1.02);
  transition: transform 8s ease;
}
.tpl-home-hero:hover .tpl-home-hero__bg {
  transform: scale(1.04);
}
.tpl-home-hero__shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(120% 90% at 50% 42%, rgba(0, 22, 44, 0.2) 0%, rgba(0, 22, 44, 0.65) 60%, rgba(0, 18, 36, 0.88) 100%),
    linear-gradient(0deg, rgba(0, 20, 38, 0.75), transparent 50%);
}
.tpl-home-hero__inner {
  position: relative;
  z-index: 2;
  width: min(1200px, 100%);
  margin-inline: auto;
  padding: clamp(48px, 6vw, 84px) clamp(16px, 3vw, 32px) clamp(44px, 5vw, 76px);
}
.tpl-home-hero__h1-seo {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Consola de búsqueda con vidrio ahumado */
.tpl-home-search-widget {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  width: min(1040px, 100%);
  margin-inline: auto;
  padding: clamp(24px, 3vw, 36px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  background: linear-gradient(160deg, rgba(8, 44, 72, 0.82) 0%, rgba(2, 22, 40, 0.92) 100%);
  backdrop-filter: blur(28px) saturate(1.2);
  -webkit-backdrop-filter: blur(28px) saturate(1.2);
  color: #fff;
  box-shadow:
    0 32px 80px rgba(0, 12, 26, 0.55),
    0 2px 0 rgba(255, 255, 255, 0.12) inset;
}
@media (min-width: 860px) {
  .tpl-home-search-widget {
    grid-template-columns: minmax(0, 1.05fr) auto minmax(0, 0.95fr);
    gap: clamp(24px, 3vw, 40px);
    align-items: stretch;
  }
}
.tpl-home-search-widget::before {
  content: "";
  position: absolute;
  top: -1px;
  right: 15%;
  left: 15%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, #f2cf4a, transparent);
  opacity: 0.8;
  pointer-events: none;
}
.tpl-home-widget-divider {
  align-self: stretch;
  width: 1px;
  height: auto;
  margin: 0;
  border: none;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.28) 20%, rgba(255, 255, 255, 0.28) 80%, transparent);
}
@media (max-width: 859px) {
  .tpl-home-widget-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25) 20%, rgba(255, 255, 255, 0.25) 80%, transparent);
  }
}

.tpl-home-widget-panel {
  min-width: 0;
}
.tpl-home-widget-panel h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0 0 18px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}
.tpl-home-widget-step {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(242, 207, 74, 0.6);
  border-radius: 50%;
  background: linear-gradient(160deg, rgba(242, 207, 74, 0.25), rgba(242, 207, 74, 0.08));
  color: #f2cf4a;
  font-size: 0.95rem;
  font-weight: 800;
  flex: none;
}
.tpl-home-widget-panel h3 small {
  padding: 3px 9px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Conmutador de métodos de búsqueda (Cerca de ti vs Por Comuna) */
.tpl-home-search-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 30px;
  background: rgba(0, 14, 28, 0.35);
}
.tpl-home-search-method {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 8px;
  border: 1px solid transparent;
  border-radius: 26px;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tpl-home-search-method:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.tpl-home-search-method.is-active {
  border-color: rgba(242, 207, 74, 0.5);
  background: linear-gradient(160deg, rgba(242, 207, 74, 0.2), rgba(242, 207, 74, 0.08));
  color: #f2cf4a;
  box-shadow: 0 4px 14px rgba(0, 12, 26, 0.35);
}

.tpl-home-method-hint {
  margin: 0 0 14px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.9rem;
  line-height: 1.45;
}

/* Inputs y Selects */
.tpl-home-field-shell {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  background: rgba(0, 14, 28, 0.4);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.tpl-home-field-shell:hover {
  border-color: rgba(255, 255, 255, 0.36);
}
.tpl-home-field-shell:focus-within {
  border-color: #f2cf4a;
  box-shadow: 0 0 0 3px rgba(242, 207, 74, 0.2);
}
.tpl-home-select {
  width: 100%;
  min-height: 50px;
  padding: 12px 40px 12px 16px;
  border: none;
  border-radius: 12px;
  background-color: transparent;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23f2cf4a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}
.tpl-home-select option {
  background: #0b2f4d;
  color: #fff;
}

/* Botón primario de búsqueda (naranjo vibrante) */
.tpl-home-primary-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 14px 18px;
  border: none;
  border-radius: 30px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 16, 32, 0.4), 0 1px 0 rgba(255, 255, 255, 0.25) inset;
  transition: all 0.2s ease;
}
.tpl-home-primary-btn:hover {
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(0, 16, 32, 0.5);
}
.tpl-home-primary-btn:disabled {
  opacity: 0.65;
  transform: none;
  cursor: not-allowed;
}

/* Panel 2: Presupuesto */
.tpl-home-budget-input-wrap {
  gap: 10px;
  padding: 4px 16px;
}
.tpl-home-budget-input-wrap b {
  color: #f2cf4a;
  font-size: 1.25rem;
  font-weight: 700;
}
.tpl-home-budget-input-wrap input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  outline: none;
}
.tpl-home-budget-input-wrap input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}
.tpl-home-budget-unit {
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.tpl-home-budget-quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.tpl-home-budget-quick button {
  min-height: 40px;
  padding: 6px 2px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tpl-home-budget-quick button:hover,
.tpl-home-budget-quick button.is-active {
  background: rgba(242, 207, 74, 0.22);
  border-color: #f2cf4a;
  color: #f2cf4a;
  transform: translateY(-1px);
}

/* Botón de búsqueda combo (dorado) */
.tpl-home-combo-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 14px 18px;
  border: none;
  border-radius: 30px;
  background: linear-gradient(135deg, #f2cf4a 0%, #eab308 100%);
  color: #0b253e;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 16, 32, 0.4), 0 1px 0 rgba(255, 255, 255, 0.3) inset;
  transition: all 0.2s ease;
}
.tpl-home-combo-search-btn:hover {
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(0, 16, 32, 0.5);
}
.tpl-home-combo-search-btn:disabled {
  opacity: 0.65;
  transform: none;
  cursor: not-allowed;
}

/* Sección de Video Corporativo */
.tpl-home-video-section {
  width: min(1200px, 100%);
  margin-inline: auto;
  padding: clamp(48px, 6vw, 80px) clamp(16px, 3vw, 32px);
}
.tpl-home-video-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(28px, 4vw, 56px);
  align-items: center;
}
@media (min-width: 860px) {
  .tpl-home-video-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  }
}
.tpl-home-video-copy h2 {
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  line-height: 1.2;
  margin: 8px 0 14px;
  color: #132437;
}
.tpl-home-video-copy p {
  color: #4a5d6e;
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0 0 20px;
}
.tpl-home-video-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 2px;
  border-bottom: 2px solid rgba(0, 63, 122, 0.3);
  color: #003f7a;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s ease;
}
.tpl-home-video-link:hover {
  color: #f97316;
  border-color: #f97316;
}
.tpl-home-video-player-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(0, 22, 44, 0.16);
  background: #000;
}
.tpl-home-video-player-wrap iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
}
`;
