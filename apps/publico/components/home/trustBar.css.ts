export const trustBarCss = `
.tpl-trust-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--tpl-space-2);
  margin: 0;
  padding: var(--tpl-space-3) var(--tpl-space-5);
  font-size: 0.9375rem;
  color: var(--tpl-content-secondary);
}
.tpl-trust-bar strong { color: var(--tpl-content-primary); }
.tpl-trust-bar__sep { color: var(--tpl-border-strong); }
.tpl-trust-bar__cta { font-weight: 600; color: var(--tpl-color-brand); text-decoration: none; }
.tpl-trust-bar__cta:hover { text-decoration: underline; }
`;
