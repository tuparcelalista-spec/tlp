import type { CSSProperties, HTMLAttributes } from "react";
import { space } from "../../tokens";

export interface GridColumns {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: GridColumns;
  gap?: keyof typeof space;
}

/**
 * Grid responsive por breakpoint, no "desktop que se achica": el número de
 * columnas se decide por rango (mobile/tablet/desktop), igual que el resto
 * del sistema. Pensado para grillas de `PropertyCard`.
 */
export function Grid({ columns, gap = 6, className, style, ...rest }: GridProps) {
  const cssVars = {
    "--tpl-grid-cols-mobile": columns?.mobile ?? 1,
    "--tpl-grid-cols-tablet": columns?.tablet ?? columns?.mobile ?? 2,
    "--tpl-grid-cols-desktop": columns?.desktop ?? columns?.tablet ?? 3,
    "--tpl-grid-gap": space[gap],
    ...style,
  } as CSSProperties;

  const classes = ["tpl-grid", className].filter(Boolean).join(" ");
  return <div className={classes} style={cssVars} {...rest} />;
}
