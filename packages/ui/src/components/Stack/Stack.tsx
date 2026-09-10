import type { CSSProperties, HTMLAttributes } from "react";
import { space } from "../../tokens";

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: keyof typeof space;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
}

/**
 * Utilidad de flex-layout — evita que cada sección de Fase 3 declare su
 * propio `display:flex; gap: 16px` suelto. Usa el `style` en línea (no una
 * clase por combinación) porque las combinaciones de dirección/gap/align
 * son demasiadas para justificar una clase por cada una.
 */
export function Stack({
  direction = "row",
  gap = 4,
  align,
  justify,
  wrap,
  style,
  children,
  ...rest
}: StackProps) {
  const computedStyle: CSSProperties = {
    display: "flex",
    flexDirection: direction,
    gap: space[gap],
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? "wrap" : undefined,
    ...style,
  };
  return (
    <div style={computedStyle} {...rest}>
      {children}
    </div>
  );
}
