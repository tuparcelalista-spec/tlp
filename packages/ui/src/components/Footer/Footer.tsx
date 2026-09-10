import type { TplNavLink } from "../../types";

export interface FooterProps {
  logoSrc: string;
  logoAlt?: string;
  tagline?: string;
  navLinks: TplNavLink[];
  internalAccessHref: string;
  internalAccessLabel?: string;
  showInternalAccessIcon?: boolean;
}

/**
 * Footer del sitio público. Contenido y orden idénticos a frontend-v2
 * (marca → tagline → nav → acceso asesores) — ver Footer.css.ts para el
 * único cambio deliberado (contenedor centrado con ancho máximo).
 */
export function Footer({
  logoSrc,
  logoAlt = "Tu Parcela Lista",
  tagline = "Encuentra tu parcela. Después construimos contigo el proyecto completo.",
  navLinks,
  internalAccessHref,
  internalAccessLabel = "Acceso asesores · CRM",
  showInternalAccessIcon = true,
}: FooterProps) {
  return (
    <footer className="tpl-footer">
      <div className="tpl-footer__inner tpl-container--narrow">
        <img src={logoSrc} width={330} height={72} alt={logoAlt} />
        <p>{tagline}</p>
        <nav className="tpl-footer__nav" aria-label="Navegación del pie de página">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a
          className="tpl-internal-access"
          href={internalAccessHref}
          aria-label="Acceso protegido para asesores de Tu Parcela Lista"
        >
          {showInternalAccessIcon ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="10.5" width="16" height="10" rx="2.2" />
              <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
            </svg>
          ) : null}
          {internalAccessLabel}
        </a>
      </div>
    </footer>
  );
}
