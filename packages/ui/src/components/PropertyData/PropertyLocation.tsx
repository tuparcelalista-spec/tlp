import type { ReactNode } from "react";

export interface PropertyLocationProps {
  children: ReactNode;
  className?: string;
}

/**
 * Comuna/región con ícono de pin — primera línea de jerarquía de
 * PropertyCard, sobre el título. Nombrado `PropertyLocation` (no `Location`)
 * a propósito: evita sombrear el tipo/global `Location` del DOM.
 */
export function PropertyLocation({ children, className }: PropertyLocationProps) {
  const classes = ["tpl-location", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.6" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
