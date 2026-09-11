# TPL — Search: Especificación técnica final del contrato

**Estado: ESPECIFICACIÓN PARA REVISIÓN — SIN IMPLEMENTAR. No autoriza
tocar `packages/core`, `apps/publico`, `frontend-v2`, `@tpl/ui`,
Supabase ni Vercel.** Cierra la serie de documentos de Search
(`TPL-FASE-3-SEARCH-AUDITORIA-ARQUITECTURA.md` →
`TPL-FASE-3-SEARCH-DISENO-DECISIONES.md` → este documento) con el
contrato final, incorporando tus decisiones confirmadas:

- `casas.js` se mantiene intacto — no se toca ni se migra a `tpl_casas`.
- No se agrega ningún campo nuevo a `Property.characteristics`
  (Bloque 1, ya aprobado y cerrado).
- `services` y `payment` **no** son filtros estructurados —
  encontrables únicamente vía búsqueda textual, cuando el contenido
  indexado los mencione.
- `nature` se mantiene mediante los campos estructurados ya existentes
  (`characteristics.naturalFeatures`/`vegetation`).
- No se implementa FTS ni PostGIS en esta etapa.

Fecha: 2026-09-10. No se modificó ningún archivo de código para producir
esta especificación.

---

## 1. Principio arquitectónico central: búsqueda ≠ ranking

Hoy, `frontend-v2/js/index.js:getResults()` mezcla en una sola función
dos responsabilidades distintas: decidir **qué propiedades califican**
(filtrado) y decidir **en qué orden se muestran** (ordenamiento por
`state.priority`). Esta especificación las separa en dos piezas
independientes y componibles:

```
PropertySearchRepository.search(filters)   →  Property[] (el conjunto que califica)
                                                    ↓
                        rankProperties(properties, ranking)  →  Property[] (mismo conjunto, ordenado)
```

- **`search()`** decide pertenencia (¿comuna correcta? ¿dentro del
  rango de precio? ¿coincide la palabra clave?). No conoce ni le
  importa el orden final.
- **`rankProperties()`** decide únicamente el orden de un conjunto ya
  obtenido. Es una función pura (sin I/O, sin conocer Supabase, sin
  conocer `SearchFilters`), testeable con fixtures como
  `normalizeProperty()`.

**Por qué importa separarlas:** permite cambiar el motor de búsqueda
(client-side hoy → FTS/PostGIS después,
`TPL-FASE-3-SEARCH-DISENO-DECISIONES.md` §6) sin tocar el ranking, y
permite agregar o ajustar criterios de orden sin tocar cómo se decide
qué calza. Ninguna de las dos debe saber de la existencia de la otra.

---

## 2. Tipos finales

```ts
// ---------------------------------------------------------------------
// Intención de búsqueda — una sola experiencia, dos modos (§0 del
// documento de decisiones).
// ---------------------------------------------------------------------
type SearchIntent = "property" | "project";

// ---------------------------------------------------------------------
// SearchFilters — entrada de search(). Determina pertenencia, nunca orden.
// ---------------------------------------------------------------------
interface SearchFilters {
  intent: SearchIntent;

  // Ubicación — ambos modos
  commune?: string;                        // igualdad exacta normalizada, igual que hoy
  coordinates?: { lat: number; lng: number };

  // Texto libre — ambos modos (alcance exacto en §3)
  keyword?: string;

  // Precio — ambos modos
  priceMin?: number;
  priceMax?: number;

  // Superficie — principalmente intent "property"
  landAreaMin?: number;
  landAreaMax?: number;

  // Estructurados — solo intent "property"
  propertyType?: PropertyType;             // "parcela" | "casa" (Property, Bloque 1)
  naturalFeatures?: string[];              // property.characteristics.naturalFeatures debe intersectar

  // Solo intent "project"
  totalBudget?: number;

  limit?: number;
}

// ---------------------------------------------------------------------
// Ranking — entrada de rankProperties(). Determina orden, nunca pertenencia.
// ---------------------------------------------------------------------
type RankingCriterion =
  | "economic"      // precio ascendente — default
  | "distance"      // requiere coordinates de origen
  | "nature"        // por characteristics.naturalFeatures/vegetation
  | "payment"       // heurística de texto libre, igual que hoy — sin campo estructurado
  | "services"      // heurística de texto libre, igual que hoy — sin campo estructurado
  | "large"         // landAreaM2 >= 10000
  | "opportunity";  // valuation vs price (ya existe en Property)

interface RankingOptions {
  criterion: RankingCriterion;
  origin?: { lat: number; lng: number };   // obligatorio solo si criterion === "distance"
}

// ---------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------
interface SearchResult {
  intent: SearchIntent;
  properties: Property[];                  // intent "property": resultado directo
  combinations?: ProjectCombination[];      // intent "project": pares parcela+casa
  total: number;
}

interface ProjectCombination {
  property: Property;
  house: unknown;                          // tipo House no existe todavía — casas.js intacto (§6)
  totalPrice: number;
}

// ---------------------------------------------------------------------
// Contratos de función
// ---------------------------------------------------------------------
interface PropertySearchRepository {
  search(filters: SearchFilters): Promise<SearchResult>;
}

function rankProperties(properties: Property[], ranking: RankingOptions): Property[];
```

`PropertyRepository` (Bloque 1) no se modifica — `PropertySearchRepository`
es una interfaz nueva y separada.

---

## 3. Especificación campo por campo

### 3.1 Comuna
Igualdad exacta normalizada (acentos/mayúsculas), idéntico al
comportamiento actual (`normalize(p.comuna) === normalize(filters.commune)`).
Sin coincidencia parcial ni tolerancia a variantes de escritura más allá
de esa normalización — no cambia respecto a lo ya auditado.

### 3.2 Proximidad
`coordinates` entra como parámetro ya resuelto — quien llama (el
`SearchWidget`) es responsable de obtenerlo vía
`navigator.geolocation`, igual que hoy. `search()` filtra a las
propiedades con `coordinates` propias válidas; `rankProperties()` con
`criterion: "distance"` ordena por Haversine usando `origin`. Misma
fórmula que hoy (`distanceKm`), sin cambios.

### 3.3 Keyword — alcance exacto
Busca coincidencias en:

```
title + description + commune + sector + characteristics.naturalFeatures
+ characteristics.vegetation + characteristics.water
+ characteristics.electricity + characteristics.access
+ characteristics.mainView
```

**No busca en:** `id`, `code`, `region` (cubierta indirectamente por
`commune`), ni en `attributes`/`metadata` cruda completa. Esto es
consistente con "no convertir todos los campos en texto buscable" —
solo el contenido ya pensado para lectura humana (título, descripción,
ubicación, características descriptivas).

**`services` y `payment`, resueltos exactamente como pediste:** no
existen como filtros (`SearchFilters` no tiene `hasServices` ni
`hasPayment`) ni como campos nuevos en `Property.characteristics`. Si
una propiedad menciona "facilidad de pago" o "cerca de colegios" en su
`description`, una búsqueda por esas palabras la encuentra — porque
`description` ya está dentro del alcance de `keyword` de esta misma
sección. No se necesita ninguna pieza adicional para lograr esto: es
una consecuencia directa del alcance de `keyword` ya definido, no un
mecanismo aparte.

**Nota transparente (no pedida explícitamente, señalada por
consistencia):** como `RankingCriterion` conserva `payment`/`services`
(§2) para no perder la función de reordenar que ya existe hoy, esos dos
criterios de ranking seguirían usando la misma heurística de regex
sobre texto libre que usan actualmente (`hasPayment`/`hasServices` en
`js/index.js`) — no un campo estructurado, porque no existe. Si
prefieres eliminar `payment`/`services` también de `RankingCriterion`
en vez de conservarlos como heurística, es un cambio de una línea en
este documento; los dejo porque tu instrucción fue sobre filtros y
búsqueda textual, no sobre el ranking existente.

### 3.4 Precio
`priceMin`/`priceMax` — comparación numérica simple sobre `Property.price`.
No existe hoy en `frontend-v2` como filtro explícito (hoy el precio solo
participa en orden, nunca en filtro) — es una capacidad nueva, acotada y
sin ambigüedad.

### 3.5 Superficie
`landAreaMin`/`landAreaMax` sobre `Property.landAreaM2`. Mismo caso que
precio: nuevo como filtro, no existía. `large` se mantiene como
criterio de **ranking** (no de filtro) exactamente como hoy
(`landAreaM2 >= 10000`), para no duplicar la misma señal como filtro y
como orden sin necesidad.

### 3.6 Características (`naturalFeatures`)
`SearchFilters.naturalFeatures` es un filtro estructurado: la propiedad
califica si `property.characteristics.naturalFeatures` intersecta con
la lista pedida. Usa el campo tal como existe hoy en `Property`
(Bloque 1) — no se agrega ningún campo nuevo. `characteristics.vegetation`
no se expone como filtro estructurado aparte (es texto libre, ej.
"Pradera despejada", no una categoría cerrada) — su contenido ya es
buscable vía `keyword` (§3.3).

### 3.7 Modo `"project"`
`totalBudget` reemplaza el input de presupuesto actual. El margen
`±$5.000.000` (auditado en `frontend-v2/js/index.js:comboCandidates`)
se mantiene como constante interna del motor, no como parámetro de
`SearchFilters` — no se expone un número mágico como si fuera una
decisión del llamador. `casas.js` se lee tal cual, sin cambios, sin
migrar a `tpl_casas` (decisión ya tomada en el documento de diseño,
confirmada aquí).

---

## 4. No-objetivos explícitos de esta especificación

- No se implementa FTS ni PostGIS — `search()` en su primera versión es
  un motor client-side, exactamente como se diseñó en
  `TPL-FASE-3-SEARCH-DISENO-DECISIONES.md` §5.
- No se agrega ningún campo a `Property`/`Property.characteristics`.
- No se modifica `casas.js` ni se decide su relación con `tpl_casas`.
- No se modifica `PropertyRepository` (`list()`/`getByCode()` quedan
  intactos).
- No se toca ningún archivo de código, Supabase, Vercel,
  `frontend-v2` ni `apps/publico` — este documento es exclusivamente la
  especificación.

---

## ESPECIFICACIÓN PENDIENTE DE APROBACIÓN DEL DUEÑO

Ninguna parte de este documento autoriza implementar `SearchFilters`,
`SearchResult`, `PropertySearchRepository`, `rankProperties()` ni
ningún otro elemento aquí descrito. Implementarlos requiere una
autorización explícita y separada, igual que cada bloque anterior.
