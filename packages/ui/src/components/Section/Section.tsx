import type { ElementType, HTMLAttributes } from "react";

export type SectionTone = "canvas" | "raised" | "inverse";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
  as?: ElementType;
}

/**
 * Ritmo vertical de sección + tono de fondo, para que Fase 3 no reinvente
 * `padding-block`/colores de fondo por sección. No incluye el `Container`
 * adentro a propósito — una sección puede querer contenido full-bleed
 * (imagen) y un `Container` anidado solo para el texto.
 */
export function Section({ tone = "canvas", as, className, children, ...rest }: SectionProps) {
  const Tag = as ?? "section";
  const classes = ["tpl-section", `tpl-section--${tone}`, className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
