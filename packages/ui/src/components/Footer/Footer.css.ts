import { breakpoints } from "../../tokens";

/**
 * Portado de tpl-foundation.css §8 (FOOTER). El contenido y el orden son
 * idénticos al actual (marca → tagline → nav → acceso asesores); el ajuste
 * de nivel superior es de container/rhythm: `.tpl-footer__inner` centra el
 * bloque con el mismo ancho máximo que el header, en vez de "place-items:
 * center" sobre el ancho completo, para que se sienta compuesto y no solo
 * centrado por defecto.
 */
export const footerCss = `
.tpl-footer {
  background: var(--tpl-navy-950);
  color: var(--tpl-content-inverse-muted);
}
.tpl-footer__inner {
  display: grid;
  justify-items: center;
  gap: var(--tpl-space-4);
  padding: var(--tpl-space-16) 0 var(--tpl-space-10);
  text-align: center;
}
@media (max-width: ${breakpoints.tablet}px) {
  .tpl-footer__inner { padding-top: var(--tpl-space-12); }
}

.tpl-footer img { height: 52px; width: auto; }
.tpl-footer p {
  max-width: 46ch;
  color: var(--tpl-content-inverse-muted);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-base);
}

.tpl-footer__nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--tpl-space-1) var(--tpl-space-2);
  padding-top: var(--tpl-space-2);
  border-top: 1px solid var(--tpl-border-inverse);
  width: min(900px, 100%);
  margin-top: var(--tpl-space-2);
}
.tpl-footer__nav a {
  padding: 8px 12px;
  border-radius: var(--tpl-radius-xs);
  color: rgba(255, 255, 255, 0.8);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-base);
  font-weight: var(--tpl-weight-medium);
  text-decoration: none;
  transition: color var(--tpl-duration-fast) ease, background-color var(--tpl-duration-fast) ease;
}
.tpl-footer__nav a:hover { color: var(--tpl-content-inverse); background: rgba(255, 255, 255, 0.08); }
@media (max-width: ${breakpoints.mobile}px) {
  .tpl-footer__nav a { padding: 8px 10px; font-size: var(--tpl-text-sm); }
}

.tpl-internal-access {
  display: inline-flex;
  align-items: center;
  gap: var(--tpl-space-2);
  margin-top: var(--tpl-space-5);
  padding: 12px 24px;
  border: 1px solid rgba(242, 207, 74, 0.45);
  border-radius: var(--tpl-radius-pill);
  background: rgba(242, 207, 74, 0.1);
  color: var(--tpl-gold-400);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-base);
  font-weight: var(--tpl-weight-bold);
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: color var(--tpl-duration-fast) ease,
              border-color var(--tpl-duration-fast) ease,
              background-color var(--tpl-duration-fast) ease,
              transform var(--tpl-duration-fast) ease;
}
.tpl-internal-access svg { width: 17px; height: 17px; flex: none; }
.tpl-internal-access:hover {
  border-color: var(--tpl-gold-400);
  background: var(--tpl-gold-400);
  color: var(--tpl-navy-950);
  transform: translateY(-1px);
}
`;
