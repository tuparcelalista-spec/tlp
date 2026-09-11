export const communeRibbonCss = `
.tpl-commune-ribbon {
  padding: var(--tpl-space-3) 0;
  border-bottom: 1px solid var(--tpl-border-default);
}
.tpl-commune-ribbon__track {
  display: flex;
  align-items: center;
  gap: var(--tpl-space-5);
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  padding: 0 var(--tpl-space-5) var(--tpl-space-1);
  scrollbar-width: thin;
}
.tpl-commune-ribbon__group {
  display: flex;
  align-items: center;
  gap: var(--tpl-space-2);
  flex: 0 0 auto;
  white-space: nowrap;
}
.tpl-commune-ribbon__region {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tpl-content-muted);
  flex: 0 0 auto;
}
.tpl-commune-ribbon__chip {
  flex: 0 0 auto;
  padding: var(--tpl-space-1) var(--tpl-space-3);
  border-radius: var(--tpl-radius-pill);
  border: 1px solid var(--tpl-border-default);
  background: var(--tpl-surface-raised);
  color: var(--tpl-content-primary);
  font-size: 0.875rem;
  text-decoration: none;
  transition: border-color var(--tpl-duration-fast) var(--tpl-ease), color var(--tpl-duration-fast) var(--tpl-ease);
}
.tpl-commune-ribbon__chip:hover,
.tpl-commune-ribbon__chip:focus-visible {
  border-color: var(--tpl-color-brand);
  color: var(--tpl-color-brand);
}
`;
