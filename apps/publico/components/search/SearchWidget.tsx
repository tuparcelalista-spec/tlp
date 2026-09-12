"use client";

import { useState } from "react";
import type { RankingCriterion } from "@tpl/core";
import { runPropertySearch } from "../../lib/search/actions";
import type { SearchViewModel } from "../../lib/search/presentation";
import {
  INITIAL_SEARCH_FORM_STATE,
  buildSearchFilters,
  deriveSearchStatus,
  GENERIC_SEARCH_ERROR_MESSAGE,
  type SearchFormState,
} from "./searchState";
import { SearchFiltersPanel } from "./SearchFiltersPanel";
import { SearchProjectPanel } from "./SearchProjectPanel";
import { SearchSummary } from "./SearchSummary";
import { SearchResults } from "./SearchResults";
import { searchWidgetCss } from "./searchWidget.css";
import { Badge } from "@tpl/ui";

export interface SearchWidgetProps {
  /** Server-side, vía `listAvailableCommunes()` — ver `SearchWidgetServer.tsx`. No se inventa una lista estática. */
  initialCommunes: string[];
  /** Server-side, vía `listAvailableNaturalFeatures()` — ídem: derivado del catálogo real, no una lista estática adivinada (Fase 3.15). */
  initialNaturalFeatureOptions: string[];
  /**
   * Bloque 3.16 — catálogo hidratado por SSR (`SearchWidgetServer`, prop
   * `hydrateCatalog`). Cuando viene con datos, el widget arranca en
   * estado "success" con esos resultados en vez de "idle" — evita la
   * pantalla vacía inicial que exigía presionar "Buscar propiedades"
   * para ver el catálogo, tanto para personas como para robots de
   * indexación (que no ejecutan el submit de un formulario). `null`
   * conserva el comportamiento anterior (Home, `/search-demo`).
   */
  initialViewModel?: SearchViewModel | null;
  /** Bloque Home-paridad — precarga `form.commune` (ej. desde `?comuna=` de un chip de la Home) sin inventar un filtro nuevo en Search Core. */
  initialCommune?: string;
}

/**
 * Orquesta el estado del buscador. NO implementa filtros, ranking,
 * distancia ni combinaciones — cada búsqueda delega íntegramente en
 * `runPropertySearch()` (Server Action, Bloque 2.2/2.3). Este componente
 * solo decide CUÁNDO llamarlo y CÓMO mostrar el resultado.
 */
export function SearchWidget({
  initialCommunes,
  initialNaturalFeatureOptions,
  initialViewModel = null,
  initialCommune,
}: SearchWidgetProps) {
  const [form, setForm] = useState<SearchFormState>(
    initialCommune ? { ...INITIAL_SEARCH_FORM_STATE, commune: initialCommune } : INITIAL_SEARCH_FORM_STATE,
  );
  const [viewModel, setViewModel] = useState<SearchViewModel | null>(initialViewModel);
  const [hasSearched, setHasSearched] = useState(initialViewModel !== null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const status = deriveSearchStatus({
    hasSearched,
    isLoading,
    error,
    isEmpty: viewModel?.mode === "property" ? viewModel.isEmpty : viewModel?.mode === "project" ? viewModel.isEmpty : false,
  });

  function updateForm(patch: Partial<SearchFormState>) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  function handleModeChange(nextIntent: "property" | "project") {
    if (nextIntent === form.intent) return;
    setForm((previous) => ({ ...previous, intent: nextIntent }));
    setViewModel(null);
    setHasSearched(false);
    setError(null);
  }

  function toggleNaturalFeature(feature: string) {
    setForm((previous) => ({
      ...previous,
      naturalFeatures: previous.naturalFeatures.includes(feature)
        ? previous.naturalFeatures.filter((item) => item !== feature)
        : [...previous.naturalFeatures, feature],
    }));
  }

  /**
   * Única responsabilidad aislada que toca una API del navegador
   * (`navigator.geolocation`) — entrega `{lat, lng}` al estado del
   * formulario y nada más. Ningún cálculo de distancia ocurre aquí: eso
   * pasa, más adelante, dentro de `runPropertySearch()` (Search Core).
   */
  function handleRequestNearby() {
    if (form.nearbyEnabled) {
      updateForm({ nearbyEnabled: false, origin: null, radiusKm: null });
      setGeolocationError(null);
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeolocationError("Tu navegador no permite obtener ubicación.");
      return;
    }
    setIsRequestingLocation(true);
    setGeolocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsRequestingLocation(false);
        updateForm({
          nearbyEnabled: true,
          origin: { lat: position.coords.latitude, lng: position.coords.longitude },
          radiusKm: form.radiusKm ?? 25,
        });
      },
      (geoError) => {
        setIsRequestingLocation(false);
        const messages: Record<number, string> = {
          1: "No autorizaste el acceso a tu ubicación.",
          2: "No pudimos obtener tu ubicación.",
          3: "La búsqueda de ubicación tardó demasiado.",
        };
        setGeolocationError(messages[geoError.code] ?? "No fue posible usar tu ubicación.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function executeSearch(activeForm: SearchFormState) {
    setHasSearched(true);
    setIsLoading(true);
    setError(null);
    try {
      const filters = buildSearchFilters(activeForm);
      const origin = activeForm.nearbyEnabled && activeForm.origin ? activeForm.origin : undefined;
      const ranking = { criterion: activeForm.ranking, origin };
      const result = await runPropertySearch({ filters, ranking, origin });
      setViewModel(result);
    } catch (thrown) {
      // El mensaje real se registra para depuración, nunca se muestra tal
      // cual — evita exponer detalles internos (ver regla 22 del bloque).
      console.error("[SearchWidget] la búsqueda falló:", thrown);
      setError(GENERIC_SEARCH_ERROR_MESSAGE);
      setViewModel(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit() {
    void executeSearch(form);
  }

  function handleRetry() {
    void executeSearch(form);
  }

  function handleClear() {
    setForm({
      ...INITIAL_SEARCH_FORM_STATE,
      intent: form.intent,
    });
    setViewModel(null);
    setHasSearched(false);
    setError(null);
    setGeolocationError(null);
  }

  function handleRankingChange(criterion: RankingCriterion) {
    const nextForm = { ...form, ranking: criterion };
    setForm(nextForm);
    if (hasSearched) void executeSearch(nextForm);
  }

  return (
    <div className="tpl-search-widget-block">
      <style>{searchWidgetCss}</style>

      <div className="tpl-search-mode-toggle" role="tablist" aria-label="Modo de búsqueda">
        <button
          type="button"
          role="tab"
          aria-selected={form.intent === "property"}
          className={`tpl-search-mode-toggle__btn${form.intent === "property" ? " tpl-search-mode-toggle__btn--active" : ""}`}
          onClick={() => handleModeChange("property")}
        >
          Propiedades
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={form.intent === "project"}
          className={`tpl-search-mode-toggle__btn${form.intent === "project" ? " tpl-search-mode-toggle__btn--active" : ""}`}
          onClick={() => handleModeChange("project")}
        >
          Proyecto (parcela + casa)
        </button>
      </div>

      {form.intent === "property" ? (
        <SearchFiltersPanel
          form={form}
          communes={initialCommunes}
          naturalFeatureOptions={initialNaturalFeatureOptions}
          isLoading={isLoading}
          geolocationError={geolocationError}
          isRequestingLocation={isRequestingLocation}
          onChange={updateForm}
          onToggleNaturalFeature={toggleNaturalFeature}
          onRequestNearby={handleRequestNearby}
          onSubmit={handleSubmit}
          onClear={handleClear}
        />
      ) : (
        <SearchProjectPanel
          form={form}
          communes={initialCommunes}
          isLoading={isLoading}
          onChange={updateForm}
          onSubmit={handleSubmit}
          onClear={handleClear}
        />
      )}

      {form.intent === "property" && status === "success" && viewModel?.mode === "property" ? (
        <SearchSummary
          totalCount={viewModel.totalCount}
          commune={form.commune}
          appliedFilters={viewModel.appliedFilters}
          ranking={form.ranking}
          canRankByDistance={Boolean(form.nearbyEnabled && form.origin)}
          onRankingChange={handleRankingChange}
        />
      ) : null}

      {form.intent === "project" && status === "success" && viewModel?.mode === "project" ? (
        <div className="tpl-search-summary">
          <div>
            <p className="tpl-search-summary__count">
              {viewModel.totalCount} {viewModel.totalCount === 1 ? "combinación compatible encontrada" : "combinaciones compatibles encontradas"}
            </p>
            {viewModel.appliedFilters.length > 0 ? (
              <div className="tpl-search-summary__chips">
                {viewModel.appliedFilters.map((filter) => (
                  <Badge key={filter.label} variant="info">
                    {filter.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <SearchResults
        status={status}
        viewModel={viewModel}
        projectModeUnavailable={false}
        onRetry={handleRetry}
        onClearFilters={handleClear}
      />
    </div>
  );
}
