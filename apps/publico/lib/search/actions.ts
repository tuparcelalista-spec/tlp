"use server";

import { cache } from "react";
import { searchProperties, getDefaultRepository } from "./supabaseSearchRepository";
import {
  toSearchViewModel,
  toPropertyDetailViewModel,
  toPropertyCardViewModel,
  summarizeCatalogForHome,
  type SearchViewModel,
  type PropertyDetailViewModel,
  type PropertyCardViewModel,
  type HomeCatalogSummary,
} from "./presentation";
import { HOUSE_MODELS, type SearchFilters, type RankingOptions, type PropertyType } from "@tpl/core";
import { adaptCasasToHouses } from "./houseAdapter";

/**
 * Server Action — Bloque 2.4. Único punto de contacto entre el
 * `SearchWidget` (Client Component) y la búsqueda real. La directiva
 * `"use server"` es la garantía, aplicada por el propio compilador de
 * Next.js (no una convención que dependa de que nadie se equivoque), de
 * que este archivo — y todo lo que importa: `searchProperties()`,
 * `SupabasePropertyRepository`, `createSupabasePublicClient`, las
 * variables de entorno del servidor — nunca se incluye en el bundle que
 * llega al navegador. El Client Component solo ve esta función como una
 * llamada async remota; no ve Supabase, no ve `PropertyRepository`, no ve
 * `@tpl/core`.
 *
 * No implementa ninguna lógica propia: delega 100% en `searchProperties()`
 * (el adaptador del Bloque 2.2) y `toSearchViewModel()` (el adaptador del
 * Bloque 2.3). Es, deliberadamente, una función de dos líneas.
 */

export interface RunPropertySearchInput {
  filters: SearchFilters;
  ranking?: RankingOptions;
  /** Mismo origen usado en `filters.coordinates` — se reenvía a `toSearchViewModel` para calcular `distanceKm` por card (Bloque 2.3, Opción A). */
  origin?: { lat: number; lng: number };
}

export async function runPropertySearch(input: RunPropertySearchInput): Promise<SearchViewModel> {
  const houses = input.filters.intent === "project" ? adaptCasasToHouses(HOUSE_MODELS) : undefined;
  const result = await searchProperties(input.filters, { ranking: input.ranking, houses });
  return toSearchViewModel(result, { filters: input.filters, ranking: input.ranking, origin: input.origin });
}

/**
 * Fetch inicial, server-side, para poblar el selector de comuna con datos
 * reales — misma fuente que ya usa `frontend-v2/js/index.js:populateCommunes()`
 * (derivar del catálogo ya cargado, no una lista estática inventada). Lee
 * `Property.commune` directo desde `SearchResult` (no desde `SearchViewModel`,
 * cuyo `location` ya viene compuesto con el sector — reprocesar ese string
 * sería más fràgil que leer el campo real). Se ejecuta UNA vez, en el
 * Server Component (`SearchWidgetServer.tsx`), no en cada render del cliente.
 */
/**
 * Fase 3.2/3.4 — detalle de propiedad. Usa `PropertyRepository.getByCode()`
 * (Bloque 1.3, sin `select('*')`, sin `service_role`) directamente — no se
 * consulta Supabase desde ningún componente. `null` cuando el código no
 * existe o la propiedad no está publicada (mismo comportamiento ya
 * probado de `getByCode()`) — la página decide mostrar 404, no esta función.
 *
 * Envuelta en `React.cache()` (Fase 3.15, auditoría QA): `/propiedades/
 * [codigo]` llama esta función tanto en `generateMetadata()` como en el
 * cuerpo de la página — se confirmó con logging real que sin `cache()`
 * eso ejecutaba dos consultas reales a Supabase para una sola visita (el
 * `fetch()` interno de supabase-js no calzaba con la deduplicación
 * automática de Next). `cache()` memoiza por argumento dentro del mismo
 * render del servidor — nunca se invoca como Server Action real desde el
 * cliente (a diferencia de `runPropertySearch`), así que no hay riesgo de
 * cachear una respuesta entre usuarios distintos.
 */
export const getPropertyDetail = cache(async function getPropertyDetail(code: string): Promise<PropertyDetailViewModel | null> {
  // P1-06: `getDefaultRepository()` está memoizado por render, así que el
  // cliente Supabase no se reconstruye en cada llamada.
  const repository = getDefaultRepository();
  const property = await repository.getByCode(code);
  if (!property) return null;
  return toPropertyDetailViewModel(property);
});

export interface RelatedPropertiesReference {
  code: string;
  commune: string;
  propertyType: PropertyType;
  price: number | null;
}

/**
 * Fase 3.5 — propiedades relacionadas. Regla CONSERVADORA, documentada:
 * misma comuna + mismo `propertyType`, dentro de un rango de precio
 * (0.6x–1.6x del precio de referencia). No es un algoritmo de
 * recomendación nuevo — son exactamente los filtros ya existentes de
 * `SearchFilters` (Bloque 2.1), con valores derivados de la propiedad de
 * referencia; ningún criterio nuevo se agregó a Search Core. Si el precio
 * de referencia es `null`, se omite ese filtro (no se inventa un rango).
 * Deliberadamente NO se filtra también por superficie a la vez que por
 * precio — encadenar dos rangos numéricos sobre un catálogo de 33
 * propiedades reales tiende a devolver 0 resultados; se prefiere un
 * criterio más simple que sí devuelva algo útil.
 */
export async function getRelatedProperties(reference: RelatedPropertiesReference, limit = 6): Promise<PropertyCardViewModel[]> {
  const filters: SearchFilters = {
    intent: "property",
    commune: reference.commune,
    propertyType: reference.propertyType,
    limit: limit + 1, // +1 por si la propia propiedad de referencia queda incluida
  };
  if (typeof reference.price === "number") {
    filters.priceMin = Math.round(reference.price * 0.6);
    filters.priceMax = Math.round(reference.price * 1.6);
  }

  const result = await searchProperties(filters);
  if (result.intent !== "property") return [];
  return result.properties
    .filter((property) => property.code !== reference.code)
    .slice(0, limit)
    .map((property) => toPropertyCardViewModel(property));
}

/**
 * Fase 3.6 (Home). `featured`/`opportunity` NO son parámetros de
 * `SearchFilters` (Search Core, Bloque 2.1 — no se le agregaron): se
 * obtiene el catálogo publicado tal cual (sin filtros de búsqueda) y se
 * filtra aquí, a nivel de llamador, por un campo booleano que
 * `Property`/`PropertyCardViewModel` ya traen — no es lógica de
 * búsqueda/ranking nueva, es un `.filter()` sobre un arreglo ya resuelto
 * (mismo criterio que `getRelatedProperties` al excluir la propiedad de
 * referencia).
 */
export async function getFeaturedProperties(limit = 6): Promise<PropertyCardViewModel[]> {
  const result = await searchProperties({ intent: "property" });
  if (result.intent !== "property") return [];
  return result.properties
    .filter((property) => property.featured)
    .slice(0, limit)
    .map((property) => toPropertyCardViewModel(property));
}

export async function getOpportunityProperties(limit = 6): Promise<PropertyCardViewModel[]> {
  const result = await searchProperties({ intent: "property" });
  if (result.intent !== "property") return [];
  return result.properties
    .filter((property) => property.opportunity)
    .slice(0, limit)
    .map((property) => toPropertyCardViewModel(property));
}

export async function listAvailableCommunes(): Promise<string[]> {
  const result = await searchProperties({ intent: "property" });
  if (result.intent !== "property") return [];
  const communes = new Set<string>();
  for (const property of result.properties) {
    if (property.commune) communes.add(property.commune);
  }
  return [...communes].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Fase 3.15 — auditoría QA. `naturalFeatures` (`atributos_naturales` en
 * Supabase) es texto libre cargado manualmente, no un enum fijo: la lista
 * de chips que mostraba el filtro (`bosque`, `río`, `estero`, `laguna`,
 * `vista`) era un vocabulario inventado en la UI que nunca coincidía con
 * los valores reales ("agua", "naturaleza", "rio dentro", "termas") —
 * `matchesNaturalFeatures()` en Search Core exige igualdad exacta
 * normalizada, así que 5 de los 6 chips no devolvían jamás ningún
 * resultado. Mismo patrón que `listAvailableCommunes()`: se deriva del
 * catálogo real en vez de mantener una lista estática que se desincroniza.
 */
export async function listAvailableNaturalFeatures(): Promise<string[]> {
  const result = await searchProperties({ intent: "property" });
  if (result.intent !== "property") return [];
  const features = new Set<string>();
  for (const property of result.properties) {
    for (const feature of property.characteristics.naturalFeatures) {
      if (feature) features.add(feature);
    }
  }
  return [...features].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Home — Trust Bar + Commune Ribbon. Una sola consulta real
 * (`searchProperties()`, la misma de siempre) y la transformación pura
 * (`summarizeCatalogForHome`, `presentation.ts`) hace el resto — nada de
 * `MutationObserver` ni recuento en el DOM como en el legacy: acá el
 * dato ya está completo antes del primer render (Server Component).
 */
export async function getHomeCatalogSummary(): Promise<HomeCatalogSummary> {
  const result = await searchProperties({ intent: "property" });
  if (result.intent !== "property") {
    return { totalPublished: 0, communeCount: 0, regionCount: 0, communesByRegion: [] };
  }
  return summarizeCatalogForHome(result.properties);
}
