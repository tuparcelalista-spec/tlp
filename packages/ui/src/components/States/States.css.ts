export const statesCss = `
.tpl-skeleton {
  display: inline-block;
  background: linear-gradient(90deg, var(--tpl-surface-sunken) 25%, var(--tpl-surface-2) 50%, var(--tpl-surface-sunken) 75%);
  background-size: 200% 100%;
  border-radius: var(--tpl-radius-xs);
  animation: tpl-skeleton-shimmer 1.4s ease-in-out infinite;
}
@keyframes tpl-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.tpl-loading-state {
  display: inline-flex;
  align-items: center;
  gap: var(--tpl-space-2);
  color: var(--tpl-content-secondary);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-base);
}
.tpl-loading-state__spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--tpl-border-default);
  border-top-color: var(--tpl-color-brand);
  animation: tpl-spin 0.7s linear infinite;
}
@keyframes tpl-spin { to { transform: rotate(360deg); } }

.tpl-state {
  display: grid;
  gap: var(--tpl-space-2);
  place-items: center;
  padding: var(--tpl-space-12) var(--tpl-space-6);
  border: 1px dashed var(--tpl-border-strong);
  border-radius: var(--tpl-radius-md);
  background: linear-gradient(180deg, var(--tpl-surface-raised), var(--tpl-surface-canvas));
  color: var(--tpl-content-secondary);
  text-align: center;
}
.tpl-state svg { width: 32px; height: 32px; color: var(--tpl-content-muted); }
.tpl-state__title { margin: 0; font-family: var(--tpl-font-sans); font-weight: var(--tpl-weight-bold); color: var(--tpl-content-primary); }
.tpl-state__description { margin: 0; font-family: var(--tpl-font-sans); font-size: var(--tpl-text-sm); color: var(--tpl-content-muted); }
.tpl-state--error {
  border-color: rgba(165, 50, 43, 0.35);
  background: linear-gradient(180deg, var(--tpl-surface-raised), var(--tpl-state-danger-bg));
}
.tpl-state--error svg { color: var(--tpl-state-danger); }

@media (prefers-reduced-motion: reduce) {
  .tpl-skeleton { animation: none; }
}
`;
