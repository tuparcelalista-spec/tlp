import type { SearchFilters, RankingCriterion, PropertyType } from "@tpl/core";

/**
 * Estado y lógica pura del SearchWidget — Bloque 2.4. Sin JSX, sin React,
 * sin `@tpl/core` en tiempo de ejecución (solo tipos) — testeable con
 * `node:assert` plano, igual que `presentation.ts` antes del ajuste de
 * distancia. Esta separación es intencional: la construcción de
 * `SearchFilters` a partir del formulario, y la derivación de qué estado
 * mostrar, son la única "lógica" de este bloque — todo lo demás (filtrar,
 * rankear, calcular distancia) sigue viviendo exclusivamente en
 * `@tpl/core`/`presentation.ts`.
 */

export type SearchIntentMode = "property" | "project";

/**
 * Fase 3.15 — auditoría QA: la lista de chips de `naturalFeatures` YA NO
 * vive aquí como constante estática. La versión anterior tomaba el
 * vocabulario de la heurística legacy de texto libre
 * `frontend-v2/js/index.js:hasNature` (`bosque|nativo|araucaria|naturaleza|
 * rio|río|estero|laguna|lago|campo`), pero `matchesNaturalFeatures()` en
 * Search Core exige igualdad EXACTA normalizada contra
 * `atributos_naturales` (un campo estructurado de texto libre cargado
 * manualmente, no un enum) — con los datos reales eso hacía que 5 de los 6
 * chips ("bosque", "río", "estero", "laguna", "vista") no devolvieran
 * jamás ningún resultado. Ahora las opciones se derivan del catálogo real
 * vía `listAvailableNaturalFeatures()` (`actions.ts`), mismo patrón que
 * `listAvailableCommunes()`.
 */

/** Sin `subtype`: `SearchFilters` no lo expone (no se agregó — Property.subtype está en null en el 100% de los datos reales). */
export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "parcela", label: "Parcela" },
  { value: "casa", label: "Casa" },
];

export const RADIUS_OPTIONS_KM = [5, 10, 25, 50] as const;

export const RANKING_OPTIONS: { value: RankingCriterion; label: string }[] = [
  { value: "economic", label: "Precio: menor a mayor" },
  { value: "distance", label: "Cercanía" },
  { value: "large", label: "Mayor superficie" },
  { value: "opportunity", label: "Oportunidades primero" },
  { value: "nature", label: "Entorno natural" },
  { value: "payment", label: "Facilidad de pago" },
  { value: "services", label: "Servicios cercanos" },
];

export interface SearchFormState {
  intent: SearchIntentMode;
  keyword: string;
  commune: string;
  /** Presupuesto total para modo 'project' (parcela + casa). Por defecto $35.000.000. */
  totalBudgetText: string;
  /** Texto tal como lo escribe la persona (ej. "10.000.000" o "$10.000.000") — se parsea recién al construir `SearchFilters`. */
  priceMinText: string;
  priceMaxText: string;
  landAreaMinText: string;
  landAreaMaxText: string;
  propertyType: PropertyType | "";
  naturalFeatures: string[];
  nearbyEnabled: boolean;
  origin: { lat: number; lng: number } | null;
  radiusKm: number | null;
  ranking: RankingCriterion;
}

export const INITIAL_SEARCH_FORM_STATE: SearchFormState = {
  intent: "property",
  keyword: "",
  commune: "",
  totalBudgetText: "35.000.000",
  priceMinText: "",
  priceMaxText: "",
  landAreaMinText: "",
  landAreaMaxText: "",
  propertyType: "",
  naturalFeatures: [],
  nearbyEnabled: false,
  origin: null,
  radiusKm: null,
  ranking: "economic",
};

/**
 * "10.000.000" | "$10.000.000" | "10000000" | "" -> number | undefined.
 * Nunca produce `NaN`: `search.ts` (Bloque 2.1) rechaza `priceMin`/
 * `priceMax` no finitos lanzando un error — mejor no enviarlos.
 */
export function parseCLPInput(text: string): number | undefined {
  const digitsOnly = text.replace(/[^0-9]/g, "");
  if (!digitsOnly) return undefined;
  const value = Number(digitsOnly);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Única traducción formulario -> `SearchFilters`. Construye el objeto de
 * entrada exacto que espera `@tpl/core` — no filtra, no valida de más, no
 * agrega campos que `SearchFilters` no tenga.
 */
export function buildSearchFilters(form: SearchFormState): SearchFilters {
  if (form.intent === "project") {
    const totalBudget = parseCLPInput(form.totalBudgetText) ?? 35_000_000;
    const filters: SearchFilters = {
      intent: "project",
      totalBudget,
    };
    if (form.keyword.trim()) filters.keyword = form.keyword.trim();
    if (form.commune) filters.commune = form.commune;
    return filters;
  }

  const filters: SearchFilters = { intent: "property" };

  if (form.keyword.trim()) filters.keyword = form.keyword.trim();
  if (form.commune) filters.commune = form.commune;

  if (form.nearbyEnabled && form.origin) {
    filters.coordinates = form.origin;
    if (typeof form.radiusKm === "number") filters.radiusKm = form.radiusKm;
  }

  const priceMin = parseCLPInput(form.priceMinText);
  if (priceMin !== undefined) filters.priceMin = priceMin;
  const priceMax = parseCLPInput(form.priceMaxText);
  if (priceMax !== undefined) filters.priceMax = priceMax;

  const landAreaMin = parseCLPInput(form.landAreaMinText);
  if (landAreaMin !== undefined) filters.landAreaMin = landAreaMin;
  const landAreaMax = parseCLPInput(form.landAreaMaxText);
  if (landAreaMax !== undefined) filters.landAreaMax = landAreaMax;

  if (form.propertyType) filters.propertyType = form.propertyType;
  if (form.naturalFeatures.length > 0) filters.naturalFeatures = [...form.naturalFeatures];

  return filters;
}

export type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface DeriveSearchStatusInput {
  hasSearched: boolean;
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
}

/**
 * Unión discriminada de 5 estados, nunca combinados ni contradictorios —
 * exactamente los 5 pedidos. `loading` y `error` tienen prioridad sobre
 * `idle`/`empty`/`success` porque describen la operación EN CURSO o su
 * falla, no el contenido de un resultado anterior.
 */
export function deriveSearchStatus(input: DeriveSearchStatusInput): SearchStatus {
  if (input.isLoading) return "loading";
  if (input.error) return "error";
  if (!input.hasSearched) return "idle";
  if (input.isEmpty) return "empty";
  return "success";
}

/** Mensaje de error mostrado a la persona — nunca el mensaje crudo de la excepción (que podría mencionar detalles internos). */
export const GENERIC_SEARCH_ERROR_MESSAGE = "No pudimos completar la búsqueda.";
