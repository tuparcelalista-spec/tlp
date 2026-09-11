"use client";

import type { FormEvent } from "react";
import { Input, Select, Button, FilterChip, FilterGroup } from "@tpl/ui";
import { PROPERTY_TYPE_OPTIONS, RADIUS_OPTIONS_KM, type SearchFormState } from "./searchState";

export interface SearchFiltersPanelProps {
  form: SearchFormState;
  communes: string[];
  /** Derivado del catálogo real (`listAvailableNaturalFeatures()`) — no una lista estática adivinada (Fase 3.15). */
  naturalFeatureOptions: string[];
  isLoading: boolean;
  geolocationError: string | null;
  isRequestingLocation: boolean;
  onChange: (patch: Partial<SearchFormState>) => void;
  onToggleNaturalFeature: (feature: string) => void;
  onRequestNearby: () => void;
  onSubmit: () => void;
  onClear: () => void;
}

/**
 * Solo interacción y presentación — construye texto/estado local, nunca
 * `SearchFilters` (eso lo hace `buildSearchFilters()` en `searchState.ts`,
 * recién cuando se envía la búsqueda). No implementa `.includes()`, no
 * normaliza texto, no filtra ni rankea nada aquí.
 */
export function SearchFiltersPanel({
  form,
  communes,
  naturalFeatureOptions,
  isLoading,
  geolocationError,
  isRequestingLocation,
  onChange,
  onToggleNaturalFeature,
  onRequestNearby,
  onSubmit,
  onClear,
}: SearchFiltersPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="tpl-search-panel" onSubmit={handleSubmit} aria-label="Filtros de búsqueda de propiedades">
      <div className="tpl-search-panel__field tpl-search-panel__field--wide">
        <label className="tpl-search-panel__label" htmlFor="search-keyword">
          ¿Qué estás buscando?
        </label>
        <Input
          id="search-keyword"
          type="search"
          placeholder="Bosque, parcela, río, Nacimiento…"
          value={form.keyword}
          onChange={(event) => onChange({ keyword: event.target.value })}
        />
      </div>

      <div className="tpl-search-panel__field">
        <label className="tpl-search-panel__label" htmlFor="search-commune">
          Comuna
        </label>
        <Select id="search-commune" value={form.commune} onChange={(event) => onChange({ commune: event.target.value })}>
          <option value="">Todas las comunas</option>
          {communes.map((commune) => (
            <option key={commune} value={commune}>
              {commune}
            </option>
          ))}
        </Select>
      </div>

      <div className="tpl-search-panel__field">
        <label className="tpl-search-panel__label" htmlFor="search-property-type">
          Tipo de propiedad
        </label>
        <Select
          id="search-property-type"
          value={form.propertyType}
          onChange={(event) => onChange({ propertyType: event.target.value as SearchFormState["propertyType"] })}
        >
          <option value="">Todos los tipos</option>
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="tpl-search-panel__field">
        <span className="tpl-search-panel__label" id="search-nearby-label">
          Cercanía
        </span>
        <div className="tpl-search-panel__nearby" role="group" aria-labelledby="search-nearby-label">
          <Button type="button" variant={form.nearbyEnabled ? "navy" : "secondary"} size="sm" onClick={onRequestNearby} disabled={isRequestingLocation}>
            {isRequestingLocation ? "Obteniendo ubicación…" : form.nearbyEnabled ? "Cerca de mí ✓" : "Cerca de mí"}
          </Button>
          {form.nearbyEnabled ? (
            <div className="tpl-search-panel__radius-options" role="group" aria-label="Radio de búsqueda">
              {RADIUS_OPTIONS_KM.map((km) => (
                <FilterChip key={km} label={`${km} km`} active={form.radiusKm === km} onClick={() => onChange({ radiusKm: km })} />
              ))}
            </div>
          ) : null}
        </div>
        {geolocationError ? <span className="tpl-search-panel__error">{geolocationError}</span> : null}
      </div>

      <div className="tpl-search-panel__field">
        <span className="tpl-search-panel__label">Precio (CLP)</span>
        <div className="tpl-search-panel__range">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Mínimo"
            aria-label="Precio mínimo en pesos chilenos"
            value={form.priceMinText}
            onChange={(event) => onChange({ priceMinText: event.target.value })}
          />
          <span className="tpl-search-panel__range-sep">–</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Máximo"
            aria-label="Precio máximo en pesos chilenos"
            value={form.priceMaxText}
            onChange={(event) => onChange({ priceMaxText: event.target.value })}
          />
        </div>
      </div>

      <div className="tpl-search-panel__field">
        <span className="tpl-search-panel__label">Superficie del terreno (m²)</span>
        <div className="tpl-search-panel__range">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Mínimo"
            aria-label="Superficie mínima en metros cuadrados"
            value={form.landAreaMinText}
            onChange={(event) => onChange({ landAreaMinText: event.target.value })}
          />
          <span className="tpl-search-panel__range-sep">–</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Máximo"
            aria-label="Superficie máxima en metros cuadrados"
            value={form.landAreaMaxText}
            onChange={(event) => onChange({ landAreaMaxText: event.target.value })}
          />
        </div>
      </div>

      {naturalFeatureOptions.length > 0 ? (
        <div className="tpl-search-panel__field tpl-search-panel__field--wide">
          <FilterGroup label="Características naturales">
            {naturalFeatureOptions.map((feature) => (
              <FilterChip
                key={feature}
                label={feature}
                active={form.naturalFeatures.includes(feature)}
                onClick={() => onToggleNaturalFeature(feature)}
              />
            ))}
          </FilterGroup>
        </div>
      ) : null}

      <div className="tpl-search-panel__actions">
        <Button type="submit" variant="navy" disabled={isLoading}>
          {isLoading ? "Buscando…" : "Buscar propiedades"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClear} disabled={isLoading}>
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}
