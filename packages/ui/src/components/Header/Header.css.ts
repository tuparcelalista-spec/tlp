import { breakpoints } from "../../tokens";

/**
 * Portado de tpl-foundation.css §7 (HEADER), con un ajuste deliberado sobre
 * el original: `.tpl-header__inner` compone la clase `Container` (ver
 * `components/Container`) en vez de ir "full-bleed" puro como en
 * frontend-v2 (logo pegado al borde izquierdo en monitores anchos). La
 * barra sigue siendo edge-to-edge (fondo/blur/borde); solo su contenido se
 * centra con el mismo ancho máximo que el resto del sitio.
 *
 * Los breakpoints se interpolan desde `tokens/layout.ts` (no se repiten
 * como números sueltos) para que sigan siendo una sola fuente de verdad.
 */
export const headerCss = `
.tpl-header {
  position: sticky;
  top: 0;
  z-index: var(--tpl-z-header);
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(0, 43, 84, 0.08);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .tpl-header { background: var(--tpl-surface); }
}

.tpl-header__inner {
  display: flex;
  align-items: center;
  gap: var(--tpl-space-6);
  height: var(--tpl-header-h);
  font-family: var(--tpl-font-sans);
}
@media (max-width: ${breakpoints.tablet}px) {
  .tpl-header__inner { height: var(--tpl-header-h-condensed); }
}

.tpl-brand {
  display: inline-flex;
  align-items: center;
  margin-right: auto;
  text-decoration: none;
  border-radius: var(--tpl-radius-sm);
}
.tpl-brand img {
  height: 46px;
  width: auto;
  transition: transform var(--tpl-duration) var(--tpl-ease);
}
.tpl-brand:hover img { transform: scale(1.04); }
@media (max-width: ${breakpoints.tablet}px) {
  .tpl-brand img { height: 40px; }
}

.tpl-nav {
  display: flex;
  align-items: center;
  gap: var(--tpl-space-1);
}
.tpl-nav a {
  position: relative;
  padding: 9px 12px;
  border-radius: var(--tpl-radius-xs);
  color: var(--tpl-ink-2);
  font-size: var(--tpl-text-base);
  font-weight: var(--tpl-weight-medium);
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--tpl-duration-fast) ease, background-color var(--tpl-duration-fast) ease;
}
.tpl-nav a:hover { color: var(--tpl-navy-900); background: var(--tpl-navy-050); }
.tpl-nav a[aria-current="page"] { color: var(--tpl-navy-900); }
.tpl-nav a[aria-current="page"]::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 2px;
  height: 2px;
  border-radius: 2px;
  background: var(--tpl-gold-500);
}
@media (max-width: ${breakpoints.navCondensed}px) {
  .tpl-nav a { padding: 9px 9px; font-size: var(--tpl-text-sm); }
}
@media (max-width: ${breakpoints.tablet}px) {
  .tpl-nav { display: none; }
}

.tpl-nav .tpl-btn {
  margin-left: var(--tpl-space-2);
}

.tpl-mobile-actions {
  display: none;
  align-items: center;
  gap: var(--tpl-space-2);
  margin-left: auto;
}
@media (max-width: ${breakpoints.tablet}px) {
  .tpl-mobile-actions { display: flex; }
}
.tpl-mobile-actions .tpl-btn { padding: 9px 16px; font-size: var(--tpl-text-sm); min-height: 38px; }
.tpl-mobile-parcelas {
  padding: 9px 10px;
  color: var(--tpl-navy-900);
  font-size: var(--tpl-text-sm);
  font-weight: var(--tpl-weight-bold);
  text-decoration: none;
  white-space: nowrap;
}
@media (max-width: ${breakpoints.mobile}px) {
  .tpl-mobile-parcelas { display: none; }
}

.tpl-menu-button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--tpl-line);
  border-radius: var(--tpl-radius-xs);
  background: var(--tpl-surface);
  color: var(--tpl-navy-900);
  font-size: 1.2rem;
  line-height: 1;
  transition: background-color var(--tpl-duration-fast) ease, border-color var(--tpl-duration-fast) ease;
}
.tpl-menu-button:hover { background: var(--tpl-navy-050); border-color: var(--tpl-navy-200); }
.tpl-menu-button[aria-expanded="true"] { background: var(--tpl-navy-900); border-color: var(--tpl-navy-900); color: var(--tpl-content-inverse); }

.tpl-mobile-menu {
  position: absolute;
  top: var(--tpl-header-h-condensed);
  left: 0;
  right: 0;
  z-index: var(--tpl-z-menu);
  display: flex;
  flex-direction: column;
  padding: var(--tpl-space-2) 0 var(--tpl-space-3);
  background: var(--tpl-surface);
  border-bottom: 1px solid var(--tpl-line);
  box-shadow: var(--tpl-shadow-lg);
}
.tpl-mobile-menu[hidden] { display: none; }
@media (prefers-reduced-motion: no-preference) {
  .tpl-mobile-menu { animation: tpl-menu-in var(--tpl-duration) var(--tpl-ease) both; }
}
@keyframes tpl-menu-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: none; }
}
.tpl-mobile-menu a {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 var(--tpl-gutter);
  color: var(--tpl-ink);
  font-size: var(--tpl-text-md);
  font-weight: var(--tpl-weight-medium);
  text-decoration: none;
  border-bottom: 1px solid var(--tpl-surface-2);
  transition: background-color var(--tpl-duration-fast) ease, color var(--tpl-duration-fast) ease;
}
.tpl-mobile-menu a:last-child { border-bottom: none; }
.tpl-mobile-menu a:hover,
.tpl-mobile-menu a:focus-visible { background: var(--tpl-navy-050); color: var(--tpl-navy-900); }
.tpl-mobile-menu a[aria-current="page"] {
  color: var(--tpl-navy-900);
  box-shadow: inset 3px 0 0 var(--tpl-gold-500);
}
`;
