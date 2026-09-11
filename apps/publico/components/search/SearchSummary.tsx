"use client";

import { Badge, Select } from "@tpl/ui";
import { RANKING_OPTIONS, type SearchFormState } from "./searchState";
import type { AppliedFilterSummary } from "../../lib/search/presentation";
import type { RankingCriterion } from "@tpl/core";

export interface SearchSummaryProps {
  totalCount: number;
  commune: string;
  appliedFilters: AppliedFilterSummary[];
  ranking: SearchFormState["ranking"];
  canRankByDistance: boolean;
  onRankingChange: (criterion: RankingCriterion) => void;
}

/**
 * Solo muestra lo que `SearchResult`/`SearchViewModel` ya entregaron
 * (`totalCount`, `appliedFilters`) — no cuenta nada por su cuenta. El
 * selector de ranking solo ENVÍA la elección al Core (vía `onRankingChange`
 * → `SearchWidget` → Server Action) — no reordena nada localmente.
 */
export function SearchSummary({ totalCount, commune, appliedFilters, ranking, canRankByDistance, onRankingChange }: SearchSummaryProps) {
  const countLabel = commune
    ? `${totalCount} ${totalCount === 1 ? "propiedad encontrada" : "propiedades encontradas"} en ${commune}`
    : `${totalCount} ${totalCount === 1 ? "propiedad encontrada" : "propiedades encontradas"}`;

  return (
    <div className="tpl-search-summary">
      <div>
        <p className="tpl-search-summary__count">{countLabel}</p>
        {appliedFilters.length > 0 ? (
          <div className="tpl-search-summary__chips">
            {appliedFilters.map((filter) => (
              <Badge key={filter.label} variant="info">
                {filter.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="tpl-search-summary__ranking">
        <label htmlFor="search-ranking">Ordenar por</label>
        <Select id="search-ranking" value={ranking} onChange={(event) => onRankingChange(event.target.value as RankingCriterion)}>
          {RANKING_OPTIONS.filter((option) => option.value !== "distance" || canRankByDistance).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
