export interface AreaProps {
  /** Ya formateado (ej. "5.000 m²"). No convierte unidades. */
  value: string;
  label?: string;
  className?: string;
}

export function Area({ value, label, className }: AreaProps) {
  const classes = ["tpl-area", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
      <span className="tpl-area__value">{value}</span>
      {label ? <span className="tpl-area__label">{label}</span> : null}
    </div>
  );
}
