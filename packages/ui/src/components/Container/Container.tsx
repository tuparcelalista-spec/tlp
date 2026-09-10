import type { HTMLAttributes } from "react";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  narrow?: boolean;
}

/**
 * Ancho máximo centrado — la misma fórmula que antes vivía duplicada en
 * `.tpl-header__inner` y `.tpl-footer__inner`. Ambos ahora componen esta
 * clase en vez de repetir la regla de `width`/`margin-inline`.
 */
export function Container({ narrow, className, ...rest }: ContainerProps) {
  const classes = ["tpl-container", narrow && "tpl-container--narrow", className].filter(Boolean).join(" ");
  return <div className={classes} {...rest} />;
}
