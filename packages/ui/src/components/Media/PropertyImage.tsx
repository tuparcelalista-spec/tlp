import type { ReactNode } from "react";

export type PropertyImageRatio = "landscape" | "wide" | "square" | "portrait";

export interface PropertyImageProps {
  src?: string;
  alt: string;
  ratio?: PropertyImageRatio;
  /** Ej. Badge de estado/destacada, posicionado arriba-izquierda. */
  badge?: ReactNode;
  /** Degradado inferior para legibilidad de texto/badges sobre la foto. */
  overlay?: boolean;
  /** Primera imagen visible de la página (hero/above the fold): carga eager + prioridad alta. */
  priority?: boolean;
  className?: string;
}

/**
 * Patrón único de imagen inmobiliaria: aspect-ratio fijo (evita que cards
 * con fotos de proporciones distintas rompan la grilla), object-fit cover,
 * placeholder cuando no hay foto todavía (no se sale del layout), y slots
 * para overlay/badge. La galería completa (múltiples fotos) es un
 * componente futuro que compone este mismo primitivo — ver README.
 */
export function PropertyImage({ src, alt, ratio = "landscape", badge, overlay, priority, className }: PropertyImageProps) {
  const classes = ["tpl-property-image", className].filter(Boolean).join(" ");
  return (
    <div className={classes} data-ratio={ratio}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
        />
      ) : (
        <div className="tpl-property-image__placeholder" role="img" aria-label={alt}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path d="M3 10.5 12 4l9 6.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 9.5V20h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      {overlay ? <div className="tpl-property-image__overlay" aria-hidden="true" /> : null}
      {badge ? <div className="tpl-property-image__badge-slot">{badge}</div> : null}
    </div>
  );
}
