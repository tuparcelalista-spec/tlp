export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Cargando…", className }: LoadingStateProps) {
  const classes = ["tpl-loading-state", className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-live="polite">
      <span className="tpl-loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
