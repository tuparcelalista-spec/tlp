export interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

/** Toggle visual de filtro (ej. "Con casa", "Con agua"). Sin estado propio — el consumidor decide qué significa "active". */
export function FilterChip({ label, active, onClick }: FilterChipProps) {
  const classes = ["tpl-filter-chip", active && "tpl-filter-chip--active"].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} aria-pressed={Boolean(active)} onClick={onClick}>
      {label}
    </button>
  );
}
