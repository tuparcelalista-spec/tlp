import type { ChangeEvent, FormEvent } from "react";
import { Input } from "../Input/Input";
import { Button } from "../Button/Button";

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  submitLabel?: string;
  className?: string;
}

/**
 * Solo la capa visual del buscador — sin lógica de catálogo. Fase 3 la
 * conecta pasándole `value`/`onChange`/`onSubmit` reales; hoy no sabe nada
 * de comunas, geolocalización ni Supabase (eso vivía en index.js/index.html
 * y no se porta aquí).
 */
export function SearchBar({
  placeholder = "Buscar por comuna o región",
  value,
  onChange,
  onSubmit,
  submitLabel = "Buscar",
  className,
}: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.(value ?? "");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event.target.value);
  }

  const classes = ["tpl-search-bar", className].filter(Boolean).join(" ");
  return (
    <form className={classes} role="search" onSubmit={handleSubmit}>
      <Input type="search" placeholder={placeholder} value={value} onChange={handleChange} aria-label={placeholder} />
      <Button type="submit" variant="navy">
        {submitLabel}
      </Button>
    </form>
  );
}
