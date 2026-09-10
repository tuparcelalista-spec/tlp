import type { ReactNode } from "react";

export interface PropertyMetaItem {
  icon?: ReactNode;
  label: string;
}

export interface PropertyMetaProps {
  items: PropertyMetaItem[];
  className?: string;
}

/** Fila de atributos relevantes (agua, luz, acceso...) entre Area y Price en PropertyCard. */
export function PropertyMeta({ items, className }: PropertyMetaProps) {
  if (!items.length) return null;
  const classes = ["tpl-property-meta", className].filter(Boolean).join(" ");
  return (
    <ul className={classes}>
      {items.map((item) => (
        <li key={item.label} className="tpl-property-meta__item">
          {item.icon}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
