import { cache } from "react";
import {
  createSupabasePublicClient,
  SupabasePropertyRepository,
  runSearch,
  type Property,
  type PropertyRepository,
  type SearchFilters,
  type SearchResult,
  type RunSearchOptions,
} from "@tpl/core";

/**
 * Adaptador de integración — Bloque 2.2. Conecta:
 *
 *   Supabase -> PropertyRepository.list() -> Property[]
 *            -> runSearch() (Search Core, @tpl/core) -> SearchResult
 *
 * Vive en `apps/publico` (no en `packages/core`) porque necesita las
 * variables de entorno del sitio público y crea el cliente Supabase real —
 * exactamente el tipo de responsabilidad que `@tpl/core` delega a quien lo
 * consume (ver `createSupabasePublicClient`, Bloque 1.3: "no lee variables
 * de entorno por su cuenta"). No duplica NINGUNA lógica de filtrado ni
 * ranking — toda la decisión de qué califica y en qué orden vive
 * exclusivamente en `runSearch()`.
 */

export interface SearchPropertiesOptions extends RunSearchOptions {
  /**
   * Repositorio ya construido — inyectable para tests (evita depender de
   * Supabase real) y reutilizable entre llamadas (ej. una sola instancia
   * por request en un Server Component). Si se omite, se crea uno nuevo
   * leyendo `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` del
   * entorno — mismas variables ya usadas por el smoke test de Bloque 1.3.
   */
  repository?: PropertyRepository;
}

/**
 * Exportada (Bloque 2.6) para que `actions.ts` la reutilice en
 * `getPropertyDetail()` — evita construir el cliente/repositorio una
 * segunda vez con la misma lógica. No lanza si faltan las variables —
 * sigue el mismo criterio explícito que `repository.smoke.ts` (Bloque
 * 1.3): quien llama sin inyectar un `repository` y sin esas variables
 * definidas recibe un error claro en el momento de construir el cliente,
 * no un fallo silencioso en tiempo de red.
 */
export function createDefaultRepository(): PropertyRepository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "searchProperties: faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno " +
        "(y no se inyectó un 'repository' explícito).",
    );
  }
  const client = createSupabasePublicClient({ url, anonKey });
  return new SupabasePropertyRepository(client);
}

/**
 * P1-06 — memoización por render (2026-09-12).
 *
 * `React.cache()` memoiza por argumentos DENTRO de un mismo render del
 * servidor (o de una misma invocación de Server Action) y no comparte nada
 * entre peticiones ni entre usuarios — no es una caché de datos, es
 * deduplicación de trabajo repetido en el mismo árbol.
 *
 * Sin esto, una sola visita a `/propiedades` disparaba TRES recorridos
 * completos e independientes del catálogo: `listAvailableCommunes()`,
 * `listAvailableNaturalFeatures()` y la hidratación inicial, cada uno con
 * su propio `SELECT` a `tpl_propiedades` más su propia consulta batch a
 * `tpl_propiedad_imagenes` — 6 viajes a Supabase para pintar una página. La
 * Home hacía lo propio con `getFeaturedProperties()`,
 * `getOpportunityProperties()` y `getHomeCatalogSummary()`.
 *
 * `getDefaultRepository()` evita además reconstruir el cliente Supabase una
 * vez por llamada.
 */
export const getDefaultRepository = cache((): PropertyRepository => createDefaultRepository());

/**
 * Catálogo publicado completo, memoizado por render. Es la ÚNICA entrada
 * que deben usar los llamadores que necesitan "todo el catálogo" —
 * `repository.list()` sin filtros. Las búsquedas con filtros reales pasan
 * igual por acá porque el filtrado ocurre en memoria dentro de
 * `runSearch()` (Search Core), no en la consulta.
 */
export const getPublishedCatalog = cache(async (): Promise<Property[]> => getDefaultRepository().list());

/**
 * Único punto de entrada de este adaptador. `intent: "property"` recorre
 * exactamente el flujo Supabase -> PropertyRepository -> Property[] ->
 * Search Core -> SearchResult. `intent: "project"` usa el mismo `Property[]`
 * ya obtenido más `options.houses` (ver `houseAdapter.ts` — nunca lee
 * `casas.js`, recibe `House[]` ya adaptado por el llamador).
 *
 * No implementa `.ilike()`, FTS, PostGIS ni RPC: `repository.list()` trae
 * el catálogo publicado tal cual (sin filtros de búsqueda propios, igual
 * que en Bloque 1.3) y todo el filtrado/ranking ocurre en memoria dentro de
 * `runSearch()`.
 *
 * P1-06: cuando NO se inyecta un `repository` explícito, el catálogo se pide
 * a `getPublishedCatalog()` (memoizado por render). Un `repository`
 * inyectado —el caso de los tests— se sigue usando tal cual, sin memoizar:
 * un test que cuenta llamadas debe poder contarlas de verdad.
 */
export async function searchProperties(filters: SearchFilters, options: SearchPropertiesOptions = {}): Promise<SearchResult> {
  const properties = options.repository ? await options.repository.list() : await getPublishedCatalog();
  return runSearch(properties, filters, options);
}
