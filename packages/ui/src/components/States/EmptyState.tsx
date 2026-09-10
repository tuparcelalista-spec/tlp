import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Ej. "Sin resultados para esta comuna". `ErrorState` reutiliza este mismo componente con otro tono/ícono. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const classes = ["tpl-state", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {icon}
      <p className="tpl-state__title">{title}</p>
      {description ? <p className="tpl-state__description">{description}</p> : null}
      {action}
    </div>
  );
}
