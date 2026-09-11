import type { Property, PropertyType } from "./property";

/**
 * Motor puro de Search — Bloque 2.1 (Search Core), sobre la especificación
 * aprobada en docs/TPL-FASE-3-SEARCH-ESPECIFICACION-FINAL.md, con las
 * correcciones de revisión de código (radiusKm, totalBudget obligatorio en
 * modo "project", validación de límites numéricos).
 *
 * Sin React, sin Next.js, sin Supabase, sin Vercel, sin navegador, sin
 * `frontend-v2`, sin `apps/publico`. Recibe `Property[]` ya cargado (por
 * quien sea — hoy `PropertyRepository`, en un test, una fixture) y devuelve
 * resultados deterministas. No modifica `property.ts`/`normalizeProperty.ts`/
 * `repository.ts` ni agrega campos a `Property`/`Property.characteristics`.
 *
 * Principio central (spec §1): búsqueda (`searchProperties`) y ranking
 * (`rankProperties`) son responsabilidades separadas. `searchProperties`
 * decide pertenencia y no conoce el orden final; `rankProperties` decide
 * únicamente el orden de un conjunto ya obtenido y no filtra nada.
 */

// ---------------------------------------------------------------------------
// Tipos — spec §2 (+ radiusKm, corrección de revisión de código)
// ---------------------------------------------------------------------------

export type SearchIntent = "property" | "project";

export interface SearchFilters {
  intent: SearchIntent;

  // Ubicación — ambos modos.
  commune?: string;
  coordinates?: { lat: number; lng: number };
  /**
   * Radio de proximidad en km. `radiusKm` NO estaba en el texto de la
   * especificación aprobada (verificado: no aparece en ningún documento de
   * docs/TPL-FASE-3-SEARCH-*) — se agrega aquí porque la corrección de
   * código lo pidió explícitamente, completando una necesidad real que
   * "proximidad" dejaba subespecificada (antes: "tiene coordenadas" no era
   * lo mismo que "está cerca").
   *
   * Comportamiento, documentado explícitamente (sin semántica silenciosa):
   * - `coordinates` presente, `radiusKm` AUSENTE: comportamiento sin cambios
   *   respecto a la versión anterior — exige que la propiedad tenga
   *   coordenadas propias, sin tope de distancia. Es intencional: preserva
   *   paridad con "Cerca de ti" en `frontend-v2`, que tampoco tiene radio.
   * - `radiusKm` presente sin `coordinates`: **error** — un radio sin origen
   *   no tiene sentido geométrico. `searchProperties` lanza.
   * - `radiusKm === 0`: válido, no es un caso especial — exige distancia
   *   `<= 0` (coincidencia exacta de ubicación). Extremo pero no inválido.
   * - `radiusKm < 0`, `NaN`, `Infinity` o `-Infinity`: **error** — ninguno es
   *   una magnitud de distancia válida. La única forma de expresar "sin
   *   tope" es omitir el campo, no pasar `Infinity`.
   */
  radiusKm?: number;

  // Texto libre — ambos modos (alcance exacto: ver matchesKeyword)
  keyword?: string;

  // Precio — ambos modos. `NaN`/`Infinity`/`-Infinity` son error (ver
  // assertFinite) — un límite de precio no numérico no es un filtro válido.
  priceMin?: number;
  priceMax?: number;

  // Superficie — ambos modos (principalmente "property"). Misma regla que precio.
  landAreaMin?: number;
  landAreaMax?: number;

  // Estructurados — solo con sentido en intent "property"; searchProperties()
  // los aplica igual si vienen presentes, sin mirar `intent` (ver nota en
  // searchProperties). Es responsabilidad del llamador no enviarlos en modo
  // "project".
  propertyType?: PropertyType;
  naturalFeatures?: string[];

  /**
   * Solo intent "project". Corrección de revisión de código: antes,
   * ausencia de `totalBudget` se convertía silenciosamente en presupuesto 0
   * (`filters.totalBudget ?? 0`) — eso permitía ejecutar una búsqueda de
   * "project" sin presupuesto real. Ahora `runSearch()` exige `totalBudget`
   * explícitamente para `intent === "project"` y lanza si falta; el tipo
   * queda opcional a nivel de `SearchFilters` (sigue sin tener sentido para
   * intent "property") pero la ausencia deja de ser un valor por defecto
   * silencioso.
   */
  totalBudget?: number;

  /**
   * Límite de resultados (solo aplica a intent "property", ver runSearch).
   * Debe ser un entero finito >= 0 — un valor negativo lanza en vez de
   * alimentar `Array.prototype.slice()` con un índice negativo (que
   * recortaría desde el final del arreglo de forma no evidente para quien
   * llama).
   */
  limit?: number;
}

/**
 * `payment` y `services` son heurísticas LEGACY de texto libre — no campos
 * estructurados, no filtros. Se conservan únicamente como criterios de
 * RANKING para no perder la función de reordenar que ya existe en
 * `frontend-v2/js/index.js`. Son señales temporales y no contractuales: no
 * hay garantía de que sigan existiendo si en el futuro se decide una
 * arquitectura de señales distinta.
 */
export type RankingCriterion =
  | "economic"
  | "distance"
  | "nature"
  | "payment"
  | "services"
  | "large"
  | "opportunity";

export interface RankingOptions {
  criterion: RankingCriterion;
  /** Obligatorio solo si `criterion === "distance"`. */
  origin?: { lat: number; lng: number };
}

/**
 * Forma mínima necesaria para el modo "project". NO es un contrato de
 * dominio nuevo ni reemplaza `casas.js` — `packages/core` nunca lee ni
 * importa `casas.js` (violaría su aislamiento de `frontend-v2`). Quien
 * integre este motor (bloque futuro, `apps/publico`) es responsable de
 * adaptar el contenido real de `casas.js` a esta forma antes de llamar a
 * `runSearch`/`searchProjectCombinations`. Campos reales equivalentes en
 * `casas.js`: `id`, `nombre`, `valorCasa`, `metros`, `habitaciones`.
 */
export interface House {
  id: string;
  name: string;
  price: number;
  areaM2?: number;
  rooms?: number;
}

export interface ProjectCombination {
  property: Property;
  house: House;
  totalPrice: number;
}

export interface SearchResult {
  intent: SearchIntent;
  /** Intent "property": resultado directo, ya filtrado, rankeado y limitado. */
  properties: Property[];
  /** Intent "project": pares parcela+casa dentro del margen de presupuesto. */
  combinations?: ProjectCombination[];
  total: number;
}

/**
 * Contrato de un repositorio de búsqueda — NO implementado en este bloque.
 * Una implementación real (ej. sobre `PropertyRepository.list()` + este
 * motor puro, o más adelante sobre FTS/PostGIS) es un bloque de integración
 * futuro. Se declara aquí solo como forma, sin ningún efecto en tiempo de
 * ejecución ni dependencia externa.
 */
export interface PropertySearchRepository {
  search(filters: SearchFilters): Promise<SearchResult>;
}

// ---------------------------------------------------------------------------
// Helpers internos (no exportados salvo distanceKm, expuesta para que los
// tests puedan calcular un valor de radio exacto sin duplicar la fórmula)
// ---------------------------------------------------------------------------

const DIACRITICS_PATTERN = new RegExp("[̀-ͯ]", "g");

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .trim();
}

/**
 * Alcance exacto de `keyword` (spec §3.3): title + description + commune +
 * sector + characteristics.{naturalFeatures,vegetation,water,electricity,
 * access,mainView}. Deliberadamente NO incluye `id`/`code`/`region`/
 * `attributes`/`metadata` cruda.
 */
function buildKeywordHaystack(property: Property): string {
  const c = property.characteristics;
  const parts = [
    property.title,
    property.description,
    property.commune,
    property.sector,
    ...c.naturalFeatures,
    c.vegetation,
    c.water,
    c.electricity,
    c.access,
    c.mainView,
  ];
  return parts.filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

/**
 * Coincidencia por términos: cada palabra del `keyword` (separadas por
 * espacio) debe aparecer en el contenido indexado — no exige que aparezcan
 * como frase exacta ni en el mismo orden. Ej. "bosque cerca de rio" encuentra
 * una propiedad cuya descripción mencione "bosque" y, por separado, "rio".
 */
function matchesKeyword(property: Property, keyword: string): boolean {
  const terms = normalizeText(keyword).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalizeText(buildKeywordHaystack(property));
  return terms.every((term) => haystack.includes(term));
}

/** Intersección normalizada — spec §3.6. */
function matchesNaturalFeatures(property: Property, requested: string[]): boolean {
  if (requested.length === 0) return true;
  const normalizedRequested = requested.map(normalizeText);
  const propertyFeatures = property.characteristics.naturalFeatures.map(normalizeText);
  return normalizedRequested.some((feature) => propertyFeatures.includes(feature));
}

// --- Geo: compartido entre searchProperties (filtro por radiusKm) y ------
// --- rankProperties (criterion "distance"). Una sola fórmula, un solo lugar.

/** Haversine, idéntica a `frontend-v2/js/index.js:distanceKm`. Exportada solo para tests. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function distanceOf(property: Property, origin: { lat: number; lng: number }): number {
  if (!property.coordinates) return Infinity;
  return distanceKm(origin.lat, origin.lng, property.coordinates.lat, property.coordinates.lng);
}

// --- Validación de límites numéricos — mínima, explícita, sin framework. --

/**
 * Rechaza `NaN`/`Infinity`/`-Infinity`. La única forma válida de expresar
 * "sin tope" en este motor es omitir el campo — nunca `Infinity`.
 */
function assertFinite(label: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Search: "${label}" debe ser un número finito (recibido: ${value}).`);
  }
}

/** Como `assertFinite`, además rechaza negativos (radios y límites de conteo no pueden serlo). */
function assertFiniteNonNegative(label: string, value: number): void {
  assertFinite(label, value);
  if (value < 0) {
    throw new Error(`Search: "${label}" no puede ser negativo (recibido: ${value}).`);
  }
}

// ---------------------------------------------------------------------------
// searchProperties — filtrado puro. Decide pertenencia, no orden.
// ---------------------------------------------------------------------------

/**
 * Aplica cualquier filtro presente en `filters`, sin mirar `filters.intent`
 * — la responsabilidad de qué filtros tienen sentido para cada modo es del
 * llamador (ver `runSearch`). Un precio/superficie `null` en la propiedad
 * nunca satisface un filtro de rango: no se puede afirmar que una propiedad
 * sin precio conocido esté "dentro" de un rango de precio.
 *
 * Valida `priceMin`/`priceMax`/`landAreaMin`/`landAreaMax`/`radiusKm` antes
 * de filtrar (una sola vez, no por propiedad) — un valor no finito o un
 * `radiusKm` sin `coordinates` lanza en vez de producir un filtro que
 * silenciosamente no filtra nada o filtra todo.
 */
export function searchProperties(properties: Property[], filters: SearchFilters): Property[] {
  if (typeof filters.priceMin === "number") assertFinite("priceMin", filters.priceMin);
  if (typeof filters.priceMax === "number") assertFinite("priceMax", filters.priceMax);
  if (typeof filters.landAreaMin === "number") assertFinite("landAreaMin", filters.landAreaMin);
  if (typeof filters.landAreaMax === "number") assertFinite("landAreaMax", filters.landAreaMax);
  if (typeof filters.radiusKm === "number") {
    if (!filters.coordinates) {
      throw new Error('Search: "radiusKm" requiere "coordinates".');
    }
    assertFiniteNonNegative("radiusKm", filters.radiusKm);
  }

  return properties.filter((property) => {
    if (filters.commune && normalizeText(property.commune) !== normalizeText(filters.commune)) {
      return false;
    }
    if (filters.coordinates) {
      if (property.coordinates === null) return false;
      if (typeof filters.radiusKm === "number" && distanceOf(property, filters.coordinates) > filters.radiusKm) {
        return false;
      }
    }
    if (filters.keyword && !matchesKeyword(property, filters.keyword)) {
      return false;
    }
    if (typeof filters.priceMin === "number" && (property.price === null || property.price < filters.priceMin)) {
      return false;
    }
    if (typeof filters.priceMax === "number" && (property.price === null || property.price > filters.priceMax)) {
      return false;
    }
    if (
      typeof filters.landAreaMin === "number" &&
      (property.landAreaM2 === null || property.landAreaM2 < filters.landAreaMin)
    ) {
      return false;
    }
    if (
      typeof filters.landAreaMax === "number" &&
      (property.landAreaM2 === null || property.landAreaM2 > filters.landAreaMax)
    ) {
      return false;
    }
    if (filters.propertyType && property.type !== filters.propertyType) {
      return false;
    }
    if (filters.naturalFeatures && filters.naturalFeatures.length > 0 && !matchesNaturalFeatures(property, filters.naturalFeatures)) {
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// rankProperties — ranking puro. Decide orden, nunca filtra.
// ---------------------------------------------------------------------------

function byPriceAscending(a: Property, b: Property): number {
  // Un precio desconocido no es "gratis": va al final, nunca primero.
  if (a.price === null && b.price === null) return 0;
  if (a.price === null) return 1;
  if (b.price === null) return -1;
  return a.price - b.price;
}

function hasStructuredNature(property: Property): boolean {
  return property.characteristics.naturalFeatures.length > 0 || Boolean(property.characteristics.vegetation);
}

// Heurísticas LEGACY (regex verbatim de frontend-v2/js/index.js:hasPayment/hasServices),
// aplicadas solo a los campos que sí existen en `Property` (title, description,
// commune, sector). El legacy también miraba `detalle`/`entorno`/`servicios`/
// flags booleanos que no existen en `Property` (Bloque 1 los excluyó a propósito
// del contrato público) — esta es, honestamente, una heurística REDUCIDA
// respecto a la de frontend-v2, no una réplica 1:1.
const LEGACY_PAYMENT_PATTERN = /cuotas|facilidad de pago|pie/i;
const LEGACY_SERVICES_PATTERN = /colegio|hospital|supermercado|comercio|centro|servicios|ruta|pueblo|minutos/i;

function legacyTextSignal(property: Property, pattern: RegExp): boolean {
  const text = [property.title, property.description, property.commune, property.sector]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return pattern.test(text);
}

function hasLegacyPaymentSignal(property: Property): boolean {
  return legacyTextSignal(property, LEGACY_PAYMENT_PATTERN);
}

function hasLegacyServicesSignal(property: Property): boolean {
  return legacyTextSignal(property, LEGACY_SERVICES_PATTERN);
}

function isLarge(property: Property): boolean {
  return (property.landAreaM2 ?? 0) >= 10000;
}

function isOpportunity(property: Property): boolean {
  const recommended = property.valuation.recommendedValue;
  if (recommended === null || property.price === null) return false;
  return property.price <= recommended * 0.9;
}

/**
 * Ranking puro: nunca elimina elementos, solo reordena. Nota de diseño
 * (divergencia deliberada de `frontend-v2`, sin cambios en esta revisión): el
 * `priority === "opportunity"` legacy en `js/index.js:getResults()` FILTRA
 * (descarta no-oportunidades) y además ordena — mezcla exactamente las dos
 * responsabilidades que este motor separa a propósito (spec §1). Aquí
 * `"opportunity"` solo reordena (oportunidades primero, empate por precio
 * ascendente); si se quiere mostrar ÚNICAMENTE oportunidades, eso es un
 * filtro — y `SearchFilters` (aprobado) no define uno para esto todavía.
 */
export function rankProperties(properties: Property[], ranking: RankingOptions): Property[] {
  const list = [...properties];
  switch (ranking.criterion) {
    case "economic":
      return list.sort(byPriceAscending);
    case "distance": {
      if (!ranking.origin) {
        throw new Error('rankProperties: criterion "distance" requiere "origin".');
      }
      const origin = ranking.origin;
      return list.sort((a, b) => distanceOf(a, origin) - distanceOf(b, origin));
    }
    case "nature":
      return list.sort((a, b) => Number(hasStructuredNature(b)) - Number(hasStructuredNature(a)) || byPriceAscending(a, b));
    case "payment":
      return list.sort((a, b) => Number(hasLegacyPaymentSignal(b)) - Number(hasLegacyPaymentSignal(a)) || byPriceAscending(a, b));
    case "services":
      return list.sort((a, b) => Number(hasLegacyServicesSignal(b)) - Number(hasLegacyServicesSignal(a)) || byPriceAscending(a, b));
    case "large":
      return list.sort((a, b) => Number(isLarge(b)) - Number(isLarge(a)) || (b.landAreaM2 ?? 0) - (a.landAreaM2 ?? 0));
    case "opportunity":
      return list.sort((a, b) => Number(isOpportunity(b)) - Number(isOpportunity(a)) || byPriceAscending(a, b));
  }
}

// ---------------------------------------------------------------------------
// searchProjectCombinations — modo "project". Puro, recibe House[] inyectado.
// ---------------------------------------------------------------------------

/** Margen aprobado (spec §3.7) — constante interna, no parte de `SearchFilters`. */
const PROJECT_BUDGET_MARGIN = 5_000_000;
const PROJECT_MAX_RESULTS = 6;

/**
 * Port directo de `comboCandidates()` (frontend-v2/js/index.js:629-710):
 * cruza parcelas × casas con precio válido, acepta combinaciones dentro de
 * ±$5.000.000 del presupuesto, prioriza las más cercanas (empate: prefiere
 * la que no excede el presupuesto), sin repetir parcela ni casa, máximo 6.
 */
export function searchProjectCombinations(properties: Property[], houses: House[], totalBudget: number): ProjectCombination[] {
  const parcelsAvailable = properties.filter((p) => p.price !== null && p.price > 0);
  const housesAvailable = houses.filter((h) => h.price > 0);

  const candidates: Array<{ property: Property; house: House; totalPrice: number; score: number }> = [];
  for (const property of parcelsAvailable) {
    for (const house of housesAvailable) {
      const totalPrice = (property.price as number) + house.price;
      const score = Math.abs(totalPrice - totalBudget);
      if (score > PROJECT_BUDGET_MARGIN) continue;
      candidates.push({ property, house, totalPrice, score });
    }
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const aOver = a.totalPrice > totalBudget ? 1 : 0;
    const bOver = b.totalPrice > totalBudget ? 1 : 0;
    return aOver - bOver;
  });

  const selected: ProjectCombination[] = [];
  const usedProperties = new Set<string>();
  const usedHouses = new Set<string>();
  for (const candidate of candidates) {
    if (selected.length >= PROJECT_MAX_RESULTS) break;
    if (usedProperties.has(candidate.property.id) || usedHouses.has(candidate.house.id)) continue;
    usedProperties.add(candidate.property.id);
    usedHouses.add(candidate.house.id);
    selected.push({ property: candidate.property, house: candidate.house, totalPrice: candidate.totalPrice });
  }
  return selected;
}

// ---------------------------------------------------------------------------
// runSearch — única función de orquestación. Compone las tres piezas de
// arriba sin mezclar su lógica interna.
// ---------------------------------------------------------------------------

export interface RunSearchOptions {
  ranking?: RankingOptions;
  /** Catálogo de casas ya adaptado por el llamador — ver `House`. Solo se usa si `filters.intent === "project"`. */
  houses?: House[];
}

/**
 * Corrección de revisión de código: `intent === "project"` sin
 * `totalBudget` es un estado inválido — ya no se convierte silenciosamente
 * en presupuesto 0. `limit` se valida antes de usarse en `Array.slice()`
 * para que un valor negativo lance en vez de recortar desde el final del
 * arreglo de forma no evidente.
 */
export function runSearch(properties: Property[], filters: SearchFilters, options: RunSearchOptions = {}): SearchResult {
  if (typeof filters.limit === "number") {
    assertFiniteNonNegative("limit", filters.limit);
  }

  const matched = searchProperties(properties, filters);

  if (filters.intent === "project") {
    if (typeof filters.totalBudget !== "number") {
      throw new Error('runSearch: intent "project" requiere "totalBudget".');
    }
    assertFinite("totalBudget", filters.totalBudget);
    const combinations = searchProjectCombinations(matched, options.houses ?? [], filters.totalBudget);
    return { intent: "project", properties: [], combinations, total: combinations.length };
  }

  const ranked = rankProperties(matched, options.ranking ?? { criterion: "economic" });
  const total = ranked.length;
  const limited = typeof filters.limit === "number" ? ranked.slice(0, filters.limit) : ranked;
  return { intent: "property", properties: limited, total };
}
