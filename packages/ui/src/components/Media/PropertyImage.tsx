"use client";

import { useState, type ReactNode } from "react";

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

const PLACEHOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path d="M3 10.5 12 4l9 6.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 9.5V20h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Patrón único de imagen inmobiliaria: aspect-ratio fijo (evita que cards
 * con fotos de proporciones distintas rompan la grilla), object-fit cover,
 * placeholder cuando no hay foto todavía (no se sale del layout), y slots
 * para overlay/badge. La galería completa (múltiples fotos) es un
 * componente futuro que compone este mismo primitivo — ver README.
 *
 * `onError` (Fase 3.15, auditoría QA): sin esto, una URL con `src` presente
 * que falla en tiempo de ejecución (bloqueada, 404, red) caía al
 * comportamiento nativo del navegador — ícono de imagen rota + el `alt`
 * superpuesto sobre el badge/overlay, visible en producción para fotos
 * legacy servidas desde `www.parcelalista.cl` (ese dominio responde
 * `Cross-Origin-Resource-Policy: same-site`, que bloquea el `<img>` plano
 * en cualquier navegador real cuando este sitio se sirve desde un origen
 * distinto — confirmado con evidencia real, no es un artefacto del
 * entorno de previsualización). Este componente ya tenía el placeholder
 * correcto para "sin foto"; ahora también lo usa para "foto que falló al
 * cargar", igual que ya hace `PropertyGallery` en `apps/publico`. No
 * cambia la firma pública ni agrega dependencias — sigue siendo el mismo
 * contrato, solo con manejo de error interno.
 */
export function PropertyImage({ src, alt, ratio = "landscape", badge, overlay, priority, className }: PropertyImageProps) {
  const [failed, setFailed] = useState(false);
  const classes = ["tpl-property-image", className].filter(Boolean).join(" ");
  const showImage = Boolean(src) && !failed;
  return (
    <div className={classes} data-ratio={ratio}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="tpl-property-image__placeholder" role="img" aria-label={alt}>
          {PLACEHOLDER_ICON}
        </div>
      )}
      {overlay ? <div className="tpl-property-image__overlay" aria-hidden="true" /> : null}
      {badge ? <div className="tpl-property-image__badge-slot">{badge}</div> : null}
    </div>
  );
}
