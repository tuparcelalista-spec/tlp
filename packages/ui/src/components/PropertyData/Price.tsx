export type PriceEmphasis = "primary" | "secondary" | "technical";

export interface PriceProps {
  /** Valor ya formateado por la capa de datos (ej. "UF 3.200" o "$85.000.000"). Este componente no calcula ni formatea moneda. */
  value: string;
  emphasis?: PriceEmphasis;
  /** Ej. "/ mes", "aprox." — texto corto, mismo tamaño reducido en cualquier énfasis. */
  suffix?: string;
  className?: string;
}

/**
 * La presentación de un precio es una decisión del sistema, no texto suelto
 * por página. `primary` = precio protagonista de una card/ficha, `secondary`
 * = precio de apoyo (ej. "desde", precio anterior), `technical` = cifra
 * económica secundaria en contexto denso (ej. tabla, ficha técnica).
 * NO calcula ni valida el valor — lo recibe ya resuelto por la capa de negocio.
 */
export function Price({ value, emphasis = "primary", suffix, className }: PriceProps) {
  const Tag = emphasis === "primary" ? "p" : "span";
  const classes = ["tpl-price", `tpl-price--${emphasis}`, className].filter(Boolean).join(" ");
  return (
    <Tag className={classes}>
      {value}
      {suffix ? <span className="tpl-price__suffix">{suffix}</span> : null}
    </Tag>
  );
}
