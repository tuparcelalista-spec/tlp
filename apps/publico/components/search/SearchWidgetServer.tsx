import { listAvailableCommunes, listAvailableNaturalFeatures, runPropertySearch } from "../../lib/search/actions";
import type { SearchViewModel } from "../../lib/search/presentation";
import { SearchWidget } from "./SearchWidget";

export interface SearchWidgetServerProps {
  /**
   * Bloque 3.16 — catálogo hidratado por SSR: cuando es `true`, hace una
   * tercera consulta server-side (el mismo `runPropertySearch()` que ya
   * usa cualquier búsqueda real, sin filtros — `{ intent: "property" }`)
   * y la pasa como resultado inicial al Client Component, que arranca
   * directo en estado "success" con las tarjetas visibles — sin esperar a
   * que la persona (o un robot de indexación, que no ejecuta el submit
   * de un formulario) presione "Buscar propiedades". Por defecto `false`
   * para no cambiar el comportamiento de la Home (que ya muestra su
   * propio catálogo real en las secciones de destacadas/oportunidades,
   * debajo del buscador) ni de `/search-demo`.
   */
  hydrateCatalog?: boolean;
  /**
   * Bloque Home-paridad — comuna que llega por `?comuna=` (ej. desde un
   * chip de la Commune Ribbon de la Home). Cuando viene con valor, la
   * hidratación inicial se filtra por esa comuna (mismo
   * `runPropertySearch()`, con `commune` real, no un filtro nuevo) y se
   * fuerza la hidratación aunque `hydrateCatalog` no se haya pasado — así
   * el link es realmente "navega pre-filtrado", no solo texto.
   */
  initialCommune?: string;
}

/**
 * Server Component — única pieza de este bloque que corre en el servidor
 * antes de que exista interactividad. Hace dos consultas (a través de
 * `listAvailableCommunes()`/`listAvailableNaturalFeatures()`, que a su vez
 * son 100% `searchProperties()` + `PropertyRepository.list()`, sin
 * `.ilike()`/FTS/RPC nuevos) para poblar comuna y características
 * naturales con datos reales, y pasa el resultado como props simples
 * (`string[]`) al Client Component. Ninguna clave ni cliente de Supabase
 * cruza este límite — solo texto plano / el `SearchViewModel` ya
 * serializado (mismo tipo que ya cruza este límite en cada búsqueda real).
 */
export async function SearchWidgetServer({ hydrateCatalog = false, initialCommune }: SearchWidgetServerProps = {}) {
  const shouldHydrate = hydrateCatalog || Boolean(initialCommune);
  const [communes, naturalFeatureOptions, initialViewModel] = await Promise.all([
    listAvailableCommunes(),
    listAvailableNaturalFeatures(),
    shouldHydrate
      ? runPropertySearch({ filters: initialCommune ? { intent: "property", commune: initialCommune } : { intent: "property" } })
      : Promise.resolve<SearchViewModel | null>(null),
  ]);
  return (
    <SearchWidget
      initialCommunes={communes}
      initialNaturalFeatureOptions={naturalFeatureOptions}
      initialViewModel={initialViewModel}
      initialCommune={initialCommune}
    />
  );
}
