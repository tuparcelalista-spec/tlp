/**
 * Paridad 1:1 con `.tpl-valuation-banner` de `frontend-v2/css/index.css` —
 * mismos tokens de espaciado/color/tipografía, ahora vía variables `--tpl-*`
 * de `@tpl/ui` (confirmadas contra `packages/ui/src/tokens/{colors,layout,
 * typography,effects}.ts`, no inventadas de nuevo).
 */
export const tasadorBannerCss = `
.tpl-valuation-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--tpl-space-6);
  margin: 0 auto;
  max-width: var(--tpl-container);
  padding: var(--tpl-space-8) var(--tpl-gutter);
  background: linear-gradient(135deg, var(--tpl-navy-050) 0%, var(--tpl-navy-100) 100%);
  border: 1px solid var(--tpl-navy-200);
  border-radius: var(--tpl-radius-lg);
}
.tpl-valuation-banner__copy {
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-1);
  max-width: 640px;
}
.tpl-valuation-banner__copy span {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-xs);
  font-weight: var(--tpl-weight-black);
  letter-spacing: var(--tpl-tracking-caps);
  text-transform: uppercase;
  color: var(--tpl-navy-800);
}
.tpl-valuation-banner__copy strong {
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-lg);
  font-weight: var(--tpl-weight-medium);
  color: var(--tpl-ink);
}
.tpl-valuation-banner__copy p {
  margin: 0;
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-base);
  color: var(--tpl-ink-3);
}
.tpl-valuation-banner__cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--tpl-space-2);
  padding: var(--tpl-space-3) var(--tpl-space-6);
  border-radius: var(--tpl-radius-pill);
  background: var(--tpl-navy-900);
  color: #ffffff;
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-base);
  font-weight: var(--tpl-weight-medium);
  text-decoration: none;
  white-space: nowrap;
  transition: transform var(--tpl-duration) var(--tpl-ease-out), box-shadow var(--tpl-duration) var(--tpl-ease-out);
}
.tpl-valuation-banner__cta:hover {
  transform: translateY(-2px);
  box-shadow: var(--tpl-shadow-md);
}
`;
