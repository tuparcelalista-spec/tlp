import type { HTMLAttributes } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "accent";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/**
 * Único vocabulario de estado del sistema — siempre sobre tokens
 * semánticos, nunca un color a mano. Guía de uso (ver README para el
 * detalle): success=disponible, warning=en proceso/reservado,
 * danger=no disponible, info=informativo, neutral=default,
 * accent=destacado/nuevo/oportunidad. El texto (qué dice el badge) lo
 * decide quien lo usa — este componente no inventa estados de negocio.
 */
export function Badge({ variant = "neutral", className, children, ...rest }: BadgeProps) {
  const classes = ["tpl-badge", `tpl-badge--${variant}`, className].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
