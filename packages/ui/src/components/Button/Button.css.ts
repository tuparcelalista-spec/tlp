/**
 * Portado de tpl-foundation.css §9 (BOTONES) — es el único primitivo del CSS
 * viejo que ya estaba bien diseñado como sistema de variantes (no como
 * parche de página), así que se conserva casi literal en vez de rehacerlo.
 */
export const buttonCss = `
.tpl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--tpl-space-2);
  min-height: 46px;
  padding: 12px 22px;
  border: 1px solid transparent;
  border-radius: var(--tpl-radius-xs);
  font-family: var(--tpl-font-sans);
  font-size: var(--tpl-text-base);
  font-weight: var(--tpl-weight-bold);
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--tpl-duration) var(--tpl-ease-out),
              border-color var(--tpl-duration) var(--tpl-ease-out),
              color var(--tpl-duration) var(--tpl-ease-out),
              box-shadow var(--tpl-duration) var(--tpl-ease-out),
              transform var(--tpl-duration) var(--tpl-ease-out);
}
.tpl-btn:hover { transform: translateY(-1px); }
.tpl-btn:active { transform: translateY(0); }
.tpl-btn[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.tpl-btn--primary { background: var(--tpl-orange-600); color: var(--tpl-content-inverse); box-shadow: 0 4px 14px rgba(168, 65, 15, 0.24); }
.tpl-btn--primary:hover { background: var(--tpl-orange-700); box-shadow: 0 8px 22px rgba(168, 65, 15, 0.3); }

.tpl-btn--navy { background: var(--tpl-navy-800); color: var(--tpl-content-inverse); box-shadow: 0 4px 14px rgba(0, 63, 122, 0.22); }
.tpl-btn--navy:hover { background: var(--tpl-navy-900); box-shadow: 0 8px 22px rgba(0, 43, 84, 0.28); }

.tpl-btn--secondary { background: var(--tpl-surface-raised); border-color: var(--tpl-line-2); color: var(--tpl-navy-900); box-shadow: var(--tpl-shadow-xs); }
.tpl-btn--secondary:hover { border-color: var(--tpl-navy-700); background: var(--tpl-navy-050); }

.tpl-btn--ghost { background: transparent; color: var(--tpl-navy-800); }
.tpl-btn--ghost:hover { background: var(--tpl-navy-050); }

.tpl-btn--gold { background: var(--tpl-gold-400); color: var(--tpl-navy-900); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18); }
.tpl-btn--gold:hover { background: var(--tpl-surface-raised); }

.tpl-btn--whatsapp { background: var(--tpl-whatsapp); color: var(--tpl-content-inverse); box-shadow: 0 4px 14px rgba(15, 122, 79, 0.26); }
.tpl-btn--whatsapp:hover { background: var(--tpl-whatsapp-hover); box-shadow: 0 8px 22px rgba(15, 122, 79, 0.32); }

.tpl-btn--pill { border-radius: var(--tpl-radius-pill); }
.tpl-btn--block { width: 100%; }
.tpl-btn--sm { min-height: 38px; padding: 8px 16px; font-size: var(--tpl-text-sm); }
.tpl-btn--lg { min-height: 54px; padding: 15px 30px; font-size: var(--tpl-text-md); }
`;
