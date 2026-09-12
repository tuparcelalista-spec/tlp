import { distanceKm } from "@tpl/core";
import type {
  Property,
  PropertyType,
  PropertyVideo,
  SearchResult,
  SearchFilters,
  RankingOptions,
  RankingCriterion,
  ProjectCombination,
} from "@tpl/core";
import { resolvePropertyImageUrl, resolvePropertyGallery, type ResolvedImageOrigin } from "../images/resolvePropertyImageUrl";

/**
 * Contrato de presentación de Search — Bloque 2.3. Transforma `SearchResult`
 * (`@tpl/core`) en un modelo listo para renderizar, sin que la UI futura
 * necesite conocer Supabase, `PropertyRepository` ni los tipos internos de
 * Search Core.
 *
 * `Property` NO se modifica ni se duplica: `PropertyCardViewModel` es un
 * tipo nuevo y separado, y ningún campo de presentación (`priceLabel`,
 * `areaLabel`, etc.) se agrega al dominio.
 *
 * Única dependencia en tiempo de ejecución de `@tpl/core`: `distanceKm`
 * (ajuste de revisión de código — Opción A). Se REUTILIZA tal cual, sin
 * copiar la fórmula Haversine ni crear una segunda — es la misma función
 * que usa `rankProperties({criterion:"distance"})` en Search Core. No se
 * accede a `navigator`/`window`/geolocalización aquí: el origen llega
 * siempre como parámetro explícito (`options.origin`), nunca se obtiene
 * dentro de este archivo.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PropertyCardAttribute {
  label: string;
}

/**
 * Preserva los tres valores de valoración de `Property.valuation` sin
 * fusionarlos ni renombrarlos — cada uno ya formateado para mostrar
 * directamente (o `null` si el valor original era `null`).
 */
export interface PropertyValuationViewModel {
  technicalValueLabel: string | null;
  communalAverageValueLabel: string | null;
  recommendedValueLabel: string | null;
}

/**
 * Forma pensada para alimentar directamente `PropertyCardProps` de
 * `@tpl/ui` (auditado: `href`/`title`/`location`/`area`/`price` esperan
 * string ya resuelto, nunca lo calculan). El mapeo final campo-a-campo
 * hacia `PropertyCardProps` es responsabilidad del componente/bloque de UI
 * futuro — este contrato solo entrega los datos ya listos.
 */
export interface PropertyCardViewModel {
  id: string;
  /**
   * PLACEHOLDER: `apps/publico` no tiene todavía ninguna ruta de detalle de
   * propiedad — no existe `app/propiedades/[code]` ni equivalente. Este
   * esquema (`/propiedades/{code}`) es una convención propuesta, no una
   * ruta real; el bloque de UI/routing futuro puede cambiarla sin que este
   * contrato deba romperse (solo esta función cambiaría).
   */
  href: string;
  title: string;
  location: string;
  imageSrc?: string;
  imageAlt: string;
  areaLabel?: string;
  priceLabel?: string;
  attributes: PropertyCardAttribute[];
  featured: boolean;
  /** `Property.opportunity` (`oportunidad_tpl`, curado manualmente) — no el cálculo interno de ranking `"opportunity"` de Search Core, que es una señal distinta y no se recalcula aquí. */
  opportunity: boolean;
  /**
   * `undefined` salvo que se pase `options.origin` (con coordenadas
   * finitas) Y la propiedad tenga `coordinates` propias — en ese caso se
   * calcula reutilizando `distanceKm` de `@tpl/core` (Search Core), la
   * misma fórmula usada por `rankProperties({criterion:"distance"})`. Sin
   * origen, o con coordenadas inválidas de cualquiera de los dos lados,
   * queda `undefined` — nunca se inventa ni se aproxima.
   */
  distanceKm?: number;
  valuation: PropertyValuationViewModel;
}

export interface ProjectCombinationViewModel {
  property: PropertyCardViewModel;
  houseName: string;
  houseAreaLabel?: string;
  houseRoomsLabel?: string;
  totalPriceLabel?: string;
}

export interface AppliedFilterSummary {
  label: string;
}

export interface AppliedRankingSummary {
  criterion: RankingCriterion;
  label: string;
}

export interface PropertySearchViewModel {
  mode: "property";
  items: PropertyCardViewModel[];
  totalCount: number;
  isEmpty: boolean;
  appliedFilters: AppliedFilterSummary[];
  appliedRanking: AppliedRankingSummary | null;
}

export interface ProjectSearchViewModel {
  mode: "project";
  items: ProjectCombinationViewModel[];
  totalCount: number;
  isEmpty: boolean;
  appliedFilters: AppliedFilterSummary[];
}

export type SearchViewModel = PropertySearchViewModel | ProjectSearchViewModel;

export interface ToSearchViewModelOptions {
  /** Los mismos `SearchFilters` que produjeron `result` — solo para resumir "filtros activos" en texto, nunca para volver a filtrar. */
  filters?: SearchFilters;
  /** El mismo `RankingOptions` usado al llamar `runSearch()` — solo para resumir "ordenado por X", nunca para volver a ordenar. */
  ranking?: RankingOptions;
  /**
   * Origen explícito para calcular `distanceKm` en cada `PropertyCardViewModel`
   * (reutilizando `distanceKm` de `@tpl/core`). Este archivo NUNCA llama a
   * `navigator.geolocation` — quien invoque `toSearchViewModel()` (la
   * futura UI) es responsable de obtener la ubicación y pasarla aquí, igual
   * que ya hace `SearchFilters.coordinates`/`RankingOptions.origin` en
   * Search Core.
   */
  origin?: { lat: number; lng: number };
}

export interface PropertyCardViewModelOptions {
  /** Ver `ToSearchViewModelOptions.origin`. */
  origin?: { lat: number; lng: number };
}

// ---------------------------------------------------------------------------
// Formato — únicamente aquí, nunca en `Property`
// ---------------------------------------------------------------------------

const CLP_FORMATTER = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

/** Mismo formato que ya usa `frontend-v2/js/index.js` (CLP, sin decimales) — no se inventa un formato nuevo. */
function formatPriceCLP(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return CLP_FORMATTER.format(value);
}

function formatAreaM2(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return `${value.toLocaleString("es-CL")} m²`;
}

function toLocation(property: Property): string {
  const parts = [property.sector, property.commune].filter((value): value is string => Boolean(value));
  if (parts.length > 0) return parts.join(", ");
  return property.region || "Ubicación por confirmar";
}

function toHref(property: Property): string {
  return `/propiedades/${property.code}`;
}

/**
 * Mapeo PROPUESTO, no definitivo — el propio contrato de `Property`
 * (Bloque 1.1) dejó explícitamente pendiente "qué características se
 * muestran como chips". Se listan solo 3 campos estructurados existentes,
 * como texto simple (sin ícono — la asignación de íconos es una decisión
 * de estilo del componente, no de este adaptador de datos).
 */
function toAttributes(property: Property): PropertyCardAttribute[] {
  const attributes: PropertyCardAttribute[] = [];
  // Prefijo con la categoría: además de contexto ("no" a secas no dice de
  // qué), evita etiquetas duplicadas cuando dos características comparten
  // el mismo valor crudo (ej. electricity="no" y water="no") — encontrado
  // en verificación real (React: "two children with the same key").
  if (property.characteristics.electricity) attributes.push({ label: `Electricidad: ${property.characteristics.electricity}` });
  if (property.characteristics.water) attributes.push({ label: `Agua: ${property.characteristics.water}` });
  if (property.characteristics.access) attributes.push({ label: `Acceso: ${property.characteristics.access}` });
  return attributes;
}

function isValidCoordinates(value: { lat: number; lng: number } | null | undefined): value is { lat: number; lng: number } {
  return Boolean(value) && Number.isFinite(value!.lat) && Number.isFinite(value!.lng);
}

/**
 * No calcula si falta un origen válido o la propiedad no tiene coordenadas
 * propias válidas — nunca aproxima ni inventa una distancia. Reutiliza
 * `distanceKm` de `@tpl/core` tal cual: mismo cálculo que Search Core.
 */
function computeDistanceKm(property: Property, origin: { lat: number; lng: number } | undefined): number | undefined {
  if (!isValidCoordinates(origin) || !isValidCoordinates(property.coordinates)) return undefined;
  return distanceKm(origin.lat, origin.lng, property.coordinates.lat, property.coordinates.lng);
}

function toValuationViewModel(property: Property): PropertyValuationViewModel {
  return {
    technicalValueLabel: formatPriceCLP(property.valuation.technicalValue) ?? null,
    communalAverageValueLabel: formatPriceCLP(property.valuation.communalAverageValue) ?? null,
    recommendedValueLabel: formatPriceCLP(property.valuation.recommendedValue) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Adaptadores — puros, no mutan `property`/`result`
// ---------------------------------------------------------------------------

export function toPropertyCardViewModel(property: Property, options: PropertyCardViewModelOptions = {}): PropertyCardViewModel {
  return {
    id: property.id,
    href: toHref(property),
    title: property.title,
    location: toLocation(property),
    // Corrección real (Bloque 2.6): antes se pasaba `property.coverImage`
    // crudo — para el 96,84% de las propiedades reales eso es una ruta
    // relativa legacy ("image/...") que un <img>/next-image no puede
    // cargar tal cual. Ahora se resuelve con la única función de
    // resolución de imágenes (`resolvePropertyImageUrl`, Bloque 2.6);
    // `undefined` cuando el origen es "missing", para que `PropertyImage`
    // de `@tpl/ui` (ya diseñado para `src` ausente) muestre su placeholder.
    imageSrc: resolvePropertyImageUrl(property.coverImage).url ?? undefined,
    imageAlt: property.title,
    areaLabel: formatAreaM2(property.landAreaM2),
    priceLabel: formatPriceCLP(property.price),
    attributes: toAttributes(property),
    featured: property.featured,
    opportunity: property.opportunity,
    distanceKm: computeDistanceKm(property, options.origin),
    valuation: toValuationViewModel(property),
  };
}

// ---------------------------------------------------------------------------
// Detalle de propiedad — Fase 3.2/3.4. Más completo que la card (galería
// completa, las 12 características, no solo 3) — no reemplaza
// `PropertyCardViewModel`, es un contrato nuevo para una necesidad nueva.
// ---------------------------------------------------------------------------

export interface PropertyGalleryImageViewModel {
  url: string | null;
  origin: ResolvedImageOrigin;
  alt: string | null;
  isCover: boolean;
  order: number;
}

/**
 * Las 12 características de `Property.characteristics`, cada una
 * etiquetada — a diferencia de `toAttributes()` (solo 3, para la card),
 * el detalle muestra todas las que existan. Ningún campo inventado: son
 * exactamente los mismos 12 de `Property.characteristics` (Bloque 1.1).
 */
function toDetailCharacteristics(property: Property): PropertyCardAttribute[] {
  const c = property.characteristics;
  const items: PropertyCardAttribute[] = [];
  if (c.legalSituation) items.push({ label: `Situación legal: ${c.legalSituation}` });
  if (c.electricity) items.push({ label: `Electricidad: ${c.electricity}` });
  if (c.water) items.push({ label: `Agua: ${c.water}` });
  if (c.access) items.push({ label: `Acceso: ${c.access}` });
  if (c.topography) items.push({ label: `Topografía: ${c.topography}` });
  if (c.soilType) items.push({ label: `Suelo: ${c.soilType}` });
  if (c.exposure) items.push({ label: `Exposición: ${c.exposure}` });
  if (c.mainView) items.push({ label: `Vista: ${c.mainView}` });
  if (c.vegetation) items.push({ label: `Vegetación: ${c.vegetation}` });
  if (c.fencing) items.push({ label: `Cierre perimetral: ${c.fencing}` });
  if (c.gate) items.push({ label: `Portón: ${c.gate}` });
  if (typeof c.isGatedCommunity === "boolean") items.push({ label: `Condominio: ${c.isGatedCommunity ? "sí" : "no"}` });
  if (c.naturalFeatures.length > 0) items.push({ label: `Entorno natural: ${c.naturalFeatures.join(", ")}` });
  return items;
}

export interface PropertyDetailViewModel {
  id: string;
  code: string;
  /** Crudo — necesario para pedir "relacionadas" del mismo tipo (`getRelatedProperties`) sin reinterpretar un label de texto. */
  type: PropertyType;
  status: string;
  title: string;
  description: string;
  location: string;
  region: string;
  commune: string;
  sector: string | null;
  /** Para una futura sección de mapa (Fase 3, "regla especial sobre mapa") — no se renderiza ningún mapa en este bloque. */
  coordinates: { lat: number; lng: number } | null;
  areaLabel?: string;
  builtAreaLabel?: string;
  /** Crudo — ver `type` arriba: evita reparsear `priceLabel` (string) para construir filtros de "relacionadas". */
  price: number | null;
  priceLabel?: string;
  currency: string;
  characteristics: PropertyCardAttribute[];
  gallery: PropertyGalleryImageViewModel[];
  coverImageUrl: string | null;
  featured: boolean;
  opportunity: boolean;
  publishedAt: string | null;
  valuation: PropertyValuationViewModel;
  video: PropertyVideo | null;
}

/**
 * `PropertyRepository.getByCode()` (Bloque 1.3) → esta función → página de
 * detalle. No consulta nada, no muta `property`. Usa el mismo resolver de
 * imágenes que la card (Bloque 2.6) — ninguna lógica de URL duplicada.
 */
export function toPropertyDetailViewModel(property: Property): PropertyDetailViewModel {
  const gallery = resolvePropertyGallery(property.images);
  const cover = resolvePropertyImageUrl(property.coverImage);
  return {
    id: property.id,
    code: property.code,
    type: property.type,
    status: property.status,
    title: property.title,
    description: property.description,
    location: toLocation(property),
    region: property.region,
    commune: property.commune,
    sector: property.sector,
    coordinates: property.coordinates,
    areaLabel: formatAreaM2(property.landAreaM2),
    builtAreaLabel: formatAreaM2(property.builtAreaM2),
    price: property.price,
    priceLabel: formatPriceCLP(property.price),
    currency: property.currency,
    characteristics: toDetailCharacteristics(property),
    gallery,
    coverImageUrl: cover.url,
    featured: property.featured,
    opportunity: property.opportunity,
    publishedAt: property.publishedAt,
    valuation: toValuationViewModel(property),
    video: property.video,
  };
}

function toProjectCombinationViewModel(combination: ProjectCombination, options: PropertyCardViewModelOptions): ProjectCombinationViewModel {
  return {
    property: toPropertyCardViewModel(combination.property, options),
    houseName: combination.house.name,
    houseAreaLabel: formatAreaM2(combination.house.areaM2),
    houseRoomsLabel:
      combination.house.rooms !== undefined ? `${combination.house.rooms} dormitorio${combination.house.rooms === 1 ? "" : "s"}` : undefined,
    totalPriceLabel: formatPriceCLP(combination.totalPrice),
  };
}

const RANKING_LABELS: Record<RankingCriterion, string> = {
  economic: "Precio: menor a mayor",
  distance: "Cercanía",
  nature: "Entorno natural",
  payment: "Facilidad de pago",
  services: "Servicios cercanos",
  large: "Mayor superficie",
  opportunity: "Oportunidades primero",
};

function summarizeRanking(ranking: RankingOptions | undefined): AppliedRankingSummary | null {
  if (!ranking) return null;
  return { criterion: ranking.criterion, label: RANKING_LABELS[ranking.criterion] };
}

/**
 * Solo compone texto a partir de los filtros ya aplicados — no vuelve a
 * evaluar ninguna condición de `searchProperties()`/`runSearch()`.
 */
function summarizeFilters(filters: SearchFilters | undefined): AppliedFilterSummary[] {
  if (!filters) return [];
  const summary: AppliedFilterSummary[] = [];
  if (filters.commune) summary.push({ label: `Comuna: ${filters.commune}` });
  if (filters.keyword) summary.push({ label: `Búsqueda: "${filters.keyword}"` });
  if (typeof filters.priceMin === "number") summary.push({ label: `Precio desde ${formatPriceCLP(filters.priceMin)}` });
  if (typeof filters.priceMax === "number") summary.push({ label: `Precio hasta ${formatPriceCLP(filters.priceMax)}` });
  if (typeof filters.totalBudget === "number") summary.push({ label: `Presupuesto total: ${formatPriceCLP(filters.totalBudget)}` });
  if (typeof filters.landAreaMin === "number") summary.push({ label: `Superficie desde ${formatAreaM2(filters.landAreaMin)}` });
  if (typeof filters.landAreaMax === "number") summary.push({ label: `Superficie hasta ${formatAreaM2(filters.landAreaMax)}` });
  if (filters.naturalFeatures && filters.naturalFeatures.length > 0) {
    summary.push({ label: `Características: ${filters.naturalFeatures.join(", ")}` });
  }
  if (typeof filters.radiusKm === "number") summary.push({ label: `Radio: ${filters.radiusKm} km` });
  return summary;
}

/**
 * Único punto de entrada. `result` es exactamente lo que devolvió
 * `runSearch()` (vía `searchProperties()` de `supabaseSearchRepository.ts`)
 * — esta función no filtra, no rankea, no consulta nada, no muta `result`
 * ni los `Property`/`ProjectCombination` que contiene.
 */
export function toSearchViewModel(result: SearchResult, options: ToSearchViewModelOptions = {}): SearchViewModel {
  const appliedFilters = summarizeFilters(options.filters);

  if (result.intent === "project") {
    const items = (result.combinations ?? []).map((combination) => toProjectCombinationViewModel(combination, { origin: options.origin }));
    return { mode: "project", items, totalCount: result.total, isEmpty: items.length === 0, appliedFilters };
  }

  const items = result.properties.map((property) => toPropertyCardViewModel(property, { origin: options.origin }));
  return {
    mode: "property",
    items,
    totalCount: result.total,
    isEmpty: items.length === 0,
    appliedFilters,
    appliedRanking: summarizeRanking(options.ranking),
  };
}

// ---------------------------------------------------------------------------
// Home — Trust Bar + Commune Ribbon (paridad con legacy `frontend-v2/js/index.js`)
// ---------------------------------------------------------------------------

/**
 * Orden real de `frontend-v2/js/index.js:populateCommunes()` — se
 * mantiene idéntico a propósito (línea `regionOrder = [...]` del legacy).
 * "Otras zonas" es el cajón de cierre para cualquier región no listada
 * arriba, siempre al final.
 */
const REGION_DISPLAY_ORDER = ["Biobío", "Ñuble", "La Araucanía", "Maule", "Otras zonas"];

/**
 * Mismo patrón que `frontend-v2/js/index.js:REGION_SIN_DATO` — la base
 * real llegó a tener "Desconocida" como placeholder en la columna
 * `region` (comentario real del legacy: "32 de 33 fichas"). Verificado
 * con los 33 datos reales actuales: hoy la columna viene limpia (0
 * placeholders), pero se conserva esta guardia por si vuelve a pasar —
 * es más barato que dejarlo sin cubrir.
 */
const REGION_SIN_DATO = /^(desconocida|desconocido|sin regi[oó]n|n\/a|null|-)$/i;

/**
 * Mismo `normalizarRegion()` del legacy: distintas fichas escriben la
 * misma región de formas distintas ("Región del Biobío" vs "Biobío") —
 * verificado con los datos reales actuales (23 filas dicen "Biobío", 1
 * dice "Región del Biobío"; sin esta normalización contarían como 2
 * regiones en vez de 1).
 */
function normalizeRegionName(rawRegion: string): string {
  const trimmed = rawRegion.trim();
  if (!trimmed || REGION_SIN_DATO.test(trimmed)) return "Otras zonas";
  const stripped = trimmed.replace(/^regi[oó]n\s+(de\s+la\s+|del\s+|de\s+)?/i, "").trim();
  const canon: Record<string, string> = {
    biobio: "Biobío",
    "biobío": "Biobío",
    nuble: "Ñuble",
    "ñuble": "Ñuble",
    araucania: "La Araucanía",
    "araucanía": "La Araucanía",
    "la araucania": "La Araucanía",
    "la araucanía": "La Araucanía",
    maule: "Maule",
  };
  return canon[stripped.toLowerCase()] ?? stripped;
}

export interface CommuneRegionGroup {
  region: string;
  communes: string[];
}

export interface HomeCatalogSummary {
  /** Total de propiedades publicadas — real, sin el "+3 mínimo" artificial que tenía el legacy (ver nota en el bloque que agregó esto). */
  totalPublished: number;
  communeCount: number;
  regionCount: number;
  /** Ordenado por `REGION_DISPLAY_ORDER`; comunas alfabéticas dentro de cada región. */
  communesByRegion: CommuneRegionGroup[];
}

/**
 * Pura — recibe propiedades ya obtenidas (`searchProperties()`, en
 * `actions.ts`), no hace I/O. Reemplaza al `MutationObserver`/recuento en
 * el DOM del legacy: acá los datos ya están completos en el servidor
 * antes del primer render, así que no hace falta observar nada.
 */
export function summarizeCatalogForHome(properties: Property[]): HomeCatalogSummary {
  const communes = new Set<string>();
  const communesByRegionMap = new Map<string, Set<string>>();

  for (const property of properties) {
    const commune = property.commune.trim();
    if (!commune) continue;
    communes.add(commune);

    const region = normalizeRegionName(property.region);
    if (!communesByRegionMap.has(region)) communesByRegionMap.set(region, new Set());
    communesByRegionMap.get(region)!.add(commune);
  }

  const communesByRegion = [...communesByRegionMap.entries()]
    .map(([region, communeSet]) => ({ region, communes: [...communeSet].sort((a, b) => a.localeCompare(b, "es")) }))
    .sort((a, b) => {
      const orderA = REGION_DISPLAY_ORDER.indexOf(a.region);
      const orderB = REGION_DISPLAY_ORDER.indexOf(b.region);
      return (orderA < 0 ? 99 : orderA) - (orderB < 0 ? 99 : orderB) || a.region.localeCompare(b.region, "es");
    });

  return {
    totalPublished: properties.length,
    communeCount: communes.size,
    regionCount: communesByRegionMap.size,
    communesByRegion,
  };
}
