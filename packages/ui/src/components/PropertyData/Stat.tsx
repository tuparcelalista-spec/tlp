export interface StatProps {
  value: string;
  label: string;
  align?: "left" | "center";
  className?: string;
}

/** Bloque valor+etiqueta genérico — no exclusivo de propiedades (ej. trust bar: "32 · parcelas publicadas"). */
export function Stat({ value, label, align = "left", className }: StatProps) {
  const classes = ["tpl-stat", `tpl-stat--${align}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <span className="tpl-stat__value">{value}</span>
      <span className="tpl-stat__label">{label}</span>
    </div>
  );
}
