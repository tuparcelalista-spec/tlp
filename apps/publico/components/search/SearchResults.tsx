"use client";

import { Grid, Button, EmptyState, ErrorState, LoadingState, Skeleton, Stack } from "@tpl/ui";
import type { SearchViewModel } from "../../lib/search/presentation";
import type { SearchStatus } from "./searchState";
import { GENERIC_SEARCH_ERROR_MESSAGE } from "./searchState";
import { SearchResultCard, SearchProjectCombinationCard } from "./SearchResultCard";

export interface SearchResultsProps {
  status: SearchStatus;
  viewModel: SearchViewModel | null;
  projectModeUnavailable: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
}

/**
 * Renderiza `SearchViewModel` (nunca `Property`/`SearchResult` directo).
 * Cada rama de `status` es mutuamente excluyente — nunca se combinan dos
 * estados a la vez.
 */
export function SearchResults({ status, viewModel, projectModeUnavailable, onRetry, onClearFilters }: SearchResultsProps) {
  if (projectModeUnavailable) {
    return (
      <div className="tpl-search-state-container">
        <EmptyState
          title="Búsqueda de proyectos disponible próximamente"
          description="La búsqueda de proyectos parcela + casa estará disponible próximamente. Por ahora puedes buscar parcelas y casas por separado en el modo Propiedades."
        />
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="tpl-search-state-container">
        <EmptyState
          title="Encuentra tu parcela ideal"
          description="Usa los filtros para buscar por comuna, palabras clave, precio, superficie o cercanía — o simplemente presiona Buscar propiedades para ver todo el catálogo."
        />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="tpl-search-state-container">
        <LoadingState label="Buscando propiedades…" />
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} style={{ marginTop: "24px", textAlign: "left" }}>
          {[0, 1, 2].map((key) => (
            <Stack key={key} direction="column" gap={2}>
              <Skeleton height="180px" radius="12px" />
              <Skeleton height="1.2em" width="70%" />
              <Skeleton height="1em" width="40%" />
            </Stack>
          ))}
        </Grid>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="tpl-search-state-container">
        <ErrorState title={GENERIC_SEARCH_ERROR_MESSAGE} description="Puedes intentarlo de nuevo en unos segundos." action={<Button onClick={onRetry}>Reintentar</Button>} />
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="tpl-search-state-container">
        <EmptyState
          title="No encontramos propiedades con estos criterios."
          description="Intenta ampliar el rango de precio o superficie, o quitar alguna característica."
          action={<Button variant="secondary" onClick={onClearFilters}>Limpiar filtros</Button>}
        />
      </div>
    );
  }

  // status === "success"
  if (!viewModel) return null;

  if (viewModel.mode === "project") {
    return (
      <Grid columns={{ mobile: 1, tablet: 1, desktop: 2 }}>
        {viewModel.items.map((combination) => (
          <SearchProjectCombinationCard key={`${combination.property.id}-${combination.houseName}`} combination={combination} />
        ))}
      </Grid>
    );
  }

  return (
    <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
      {viewModel.items.map((card, index) => (
        <SearchResultCard key={card.id} card={card} priority={index === 0} />
      ))}
    </Grid>
  );
}
