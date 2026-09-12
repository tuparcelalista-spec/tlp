"use client";

import type { FormEvent } from "react";
import { Input, Select, Button, FilterChip } from "@tpl/ui";
import { type SearchFormState, parseCLPInput } from "./searchState";

export interface SearchProjectPanelProps {
  form: SearchFormState;
  communes: string[];
  isLoading: boolean;
  onChange: (patch: Partial<SearchFormState>) => void;
  onSubmit: () => void;
  onClear: () => void;
}

const QUICK_BUDGETS = [
  { label: "$10M", value: "10.000.000", num: 10_000_000 },
  { label: "$25M", value: "25.000.000", num: 25_000_000 },
  { label: "$35M", value: "35.000.000", num: 35_000_000 },
  { label: "$50M", value: "50.000.000", num: 50_000_000 },
];

export function SearchProjectPanel({
  form,
  communes,
  isLoading,
  onChange,
  onSubmit,
  onClear,
}: SearchProjectPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const currentBudgetNum = parseCLPInput(form.totalBudgetText);

  return (
    <form className="tpl-search-panel" onSubmit={handleSubmit} aria-label="Filtros de búsqueda de proyectos combinados">
      <div className="tpl-search-panel__field tpl-search-panel__field--wide">
        <label className="tpl-search-panel__label" htmlFor="search-project-budget">
          Presupuesto total (Parcela + Casa)
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Input
            id="search-project-budget"
            type="text"
            inputMode="numeric"
            placeholder="Ej: 35.000.000"
            value={form.totalBudgetText}
            onChange={(event) => onChange({ totalBudgetText: event.target.value })}
          />
          <div className="tpl-search-panel__quick-budgets" role="group" aria-label="Presupuestos rápidos" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {QUICK_BUDGETS.map((qb) => (
              <FilterChip
                key={qb.value}
                label={qb.label}
                active={currentBudgetNum === qb.num}
                onClick={() => onChange({ totalBudgetText: qb.value })}
              />
            ))}
          </div>
          <span className="tpl-search-panel__hint">
            Calcula combinaciones de parcelas y casas dentro de ±$5.000.000 de tu presupuesto total.
          </span>
        </div>
      </div>

      <div className="tpl-search-panel__field">
        <label className="tpl-search-panel__label" htmlFor="search-project-commune">
          Comuna (opcional)
        </label>
        <Select
          id="search-project-commune"
          value={form.commune}
          onChange={(event) => onChange({ commune: event.target.value })}
        >
          <option value="">Todas las comunas</option>
          {communes.map((commune) => (
            <option key={commune} value={commune}>
              {commune}
            </option>
          ))}
        </Select>
      </div>

      <div className="tpl-search-panel__field">
        <label className="tpl-search-panel__label" htmlFor="search-project-keyword">
          Palabras clave (opcional)
        </label>
        <Input
          id="search-project-keyword"
          type="search"
          placeholder="Bosque, orilla de río…"
          value={form.keyword}
          onChange={(event) => onChange({ keyword: event.target.value })}
        />
      </div>

      <div className="tpl-search-panel__actions">
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? "Buscando proyectos…" : "Ver proyectos compatibles"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClear} disabled={isLoading}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}
