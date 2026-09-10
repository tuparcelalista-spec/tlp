import type { ReactNode } from "react";

export interface FilterGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** Agrupa FilterChip/Select bajo una etiqueta semántica (`<fieldset>`/`<legend>`, sin depender de estilos de tabla/formulario legacy). */
export function FilterGroup({ label, children, className }: FilterGroupProps) {
  const classes = ["tpl-filter-group", className].filter(Boolean).join(" ");
  return (
    <fieldset className={classes}>
      <legend className="tpl-filter-group__label">{label}</legend>
      <div className="tpl-filter-group__items">{children}</div>
    </fieldset>
  );
}
