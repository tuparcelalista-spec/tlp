export interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
}

/** Placeholder de carga — pensado para reemplazar Price/PropertyCard mientras Fase 3/4 conecta datos reales de Supabase. */
export function Skeleton({ width = "100%", height = "1em", radius, className }: SkeletonProps) {
  const classes = ["tpl-skeleton", className].filter(Boolean).join(" ");
  return <span className={classes} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}
