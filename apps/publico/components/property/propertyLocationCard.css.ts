export const propertyLocationCardCss = `
.tpl-location-card {
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-3);
  padding: var(--tpl-space-5);
  border-radius: var(--tpl-radius-lg);
  border: 1px solid var(--tpl-border-default);
  background: var(--tpl-surface-canvas);
}
.tpl-location-card__pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--tpl-radius-md);
  background: var(--tpl-surface-raised);
  color: var(--tpl-color-brand);
  flex: 0 0 auto;
}
.tpl-location-card__pin svg { width: 24px; height: 24px; }
.tpl-location-card__row { display: flex; align-items: flex-start; gap: var(--tpl-space-3); }
.tpl-location-card__place { font-weight: 600; color: var(--tpl-content-primary); }
.tpl-location-card__coords { margin: var(--tpl-space-1) 0 0; color: var(--tpl-content-secondary); font-size: 0.875rem; }
`;
