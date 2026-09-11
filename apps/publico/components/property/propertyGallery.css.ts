export const propertyGalleryCss = `
.tpl-gallery { display: flex; flex-direction: column; gap: var(--tpl-space-3); }
.tpl-gallery__main {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--tpl-surface-sunken);
  border-radius: var(--tpl-radius-lg);
  overflow: hidden;
}
.tpl-gallery--empty {
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--tpl-space-2);
  background: var(--tpl-surface-sunken);
  border-radius: var(--tpl-radius-lg);
  color: var(--tpl-content-muted);
}
.tpl-gallery--empty svg, .tpl-gallery__placeholder svg { width: 48px; height: 48px; }
.tpl-gallery__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tpl-content-muted);
}
.tpl-gallery__thumbs {
  display: flex;
  gap: var(--tpl-space-2);
  overflow-x: auto;
  padding-bottom: var(--tpl-space-1);
}
.tpl-gallery__thumb {
  position: relative;
  flex: 0 0 auto;
  width: 80px;
  height: 60px;
  border-radius: var(--tpl-radius-sm);
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  background: var(--tpl-surface-sunken);
}
.tpl-gallery__thumb--active { border-color: var(--tpl-color-brand); }
.tpl-gallery__thumb-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: var(--tpl-content-muted); }
.tpl-gallery__thumb-placeholder svg { width: 20px; height: 20px; }
`;
