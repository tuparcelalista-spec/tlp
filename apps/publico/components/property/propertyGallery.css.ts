export const propertyGalleryCss = `
.tpl-bento-gallery {
  position: relative;
  margin-bottom: 32px;
  border-radius: var(--tpl-radius-lg, 16px);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.tpl-bento-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 8px;
  height: 480px;
  background: var(--tpl-surface-sunken, #0f172a);
}

.tpl-bento-main {
  position: relative;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  background: var(--tpl-surface-sunken, #1e293b);
}

.tpl-bento-sub {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  height: 100%;
}

.tpl-bento-sub-item {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: var(--tpl-surface-sunken, #1e293b);
}

.tpl-bento-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease;
}

.tpl-bento-main:hover .tpl-bento-img,
.tpl-bento-sub-item:hover .tpl-bento-img {
  transform: scale(1.03);
  filter: brightness(1.04);
}

.tpl-bento-btn-all {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.15);
  padding: 10px 18px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  z-index: 5;
}

.tpl-bento-btn-all:hover {
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
}

.tpl-bento-btn-all svg {
  width: 18px;
  height: 18px;
  color: var(--tpl-color-brand, #005aa0);
}

/* Modal Visor Pantalla Completa */
.tpl-modal-dialog {
  border: none;
  padding: 0;
  background: rgba(10, 15, 29, 0.96);
  backdrop-filter: blur(10px);
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  margin: 0;
  color: #ffffff;
  z-index: 99999;
}

.tpl-modal-dialog::backdrop {
  background: rgba(0, 0, 0, 0.9);
}

.tpl-modal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  user-select: none;
}

.tpl-modal-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
  z-index: 10;
}

.tpl-modal-counter {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.05em;
}

.tpl-modal-close-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #ffffff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: background 0.2s, transform 0.2s;
}

.tpl-modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.tpl-modal-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 16px 80px;
  overflow: hidden;
}

.tpl-modal-image-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tpl-modal-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  transition: opacity 0.2s ease;
}

.tpl-modal-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.18);
  border: none;
  color: #ffffff;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  z-index: 20;
}

.tpl-modal-nav-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.06);
}

.tpl-modal-nav-btn--prev {
  left: 20px;
}

.tpl-modal-nav-btn--next {
  right: 20px;
}

.tpl-modal-thumbs-bar {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px 20px;
  overflow-x: auto;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  z-index: 10;
}

.tpl-modal-thumb-btn {
  width: 60px;
  height: 44px;
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: #1e293b;
  flex-shrink: 0;
  padding: 0;
  transition: border-color 0.2s, transform 0.2s, opacity 0.2s;
  opacity: 0.6;
}

.tpl-modal-thumb-btn--active {
  border-color: #38bdf8;
  opacity: 1;
  transform: scale(1.08);
}

.tpl-modal-thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Estado Vacío */
.tpl-bento-empty {
  height: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--tpl-surface-sunken, #f1f5f9);
  border-radius: var(--tpl-radius-lg, 16px);
  color: var(--tpl-content-muted, #64748b);
}

.tpl-bento-empty svg {
  width: 48px;
  height: 48px;
}

/* Responsividad Mobile / Tablet */
@media (max-width: 860px) {
  .tpl-bento-grid {
    grid-template-columns: 1fr;
    height: 340px;
  }
  .tpl-bento-sub {
    display: none;
  }
  .tpl-bento-btn-all {
    bottom: 14px;
    right: 14px;
    padding: 8px 14px;
    font-size: 0.82rem;
  }
  .tpl-modal-body {
    padding: 10px 4px;
  }
  .tpl-modal-nav-btn {
    width: 40px;
    height: 40px;
  }
  .tpl-modal-nav-btn--prev { left: 8px; }
  .tpl-modal-nav-btn--next { right: 8px; }
}
`;
