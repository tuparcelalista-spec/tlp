import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const WarningIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 2.5 18a1.5 1.5 0 0 0 1.3 2.2h16.4a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z" />
  </svg>
);

/** Reutiliza `EmptyState` con tono de error en vez de duplicar el layout — solo cambia ícono/color. */
export function ErrorState({ title = "Ocurrió un error", description, action, className }: ErrorStateProps) {
  const classes = ["tpl-state--error", className].filter(Boolean).join(" ");
  return <EmptyState icon={WarningIcon} title={title} description={description} action={action} className={classes} />;
}
