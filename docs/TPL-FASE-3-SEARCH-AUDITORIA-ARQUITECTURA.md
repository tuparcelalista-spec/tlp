# TPL — Search: Auditoría del buscador actual y arquitectura propuesta

**Estado: DOCUMENTO DE TRABAJO — SOLO AUDITORÍA Y PROPUESTA. Ninguna
conclusión ni propuesta de este documento está aprobada. No autoriza
escribir código, modificar `frontend-v2`/`apps/publico`/`packages/core`/
`@tpl/ui`, ni tocar Supabase, Vercel o producción.**

Fecha de la auditoría: 2026-09-10. Este documento es independiente de
`TPL-FASE-3-AUDITORIA-ARQUITECTURA.md` y de
`TPL-FASE-3-COEXISTENCIA-AUDITORIA.md` — no los reemplaza. Cubre
exclusivamente el buscador: su estado real en `frontend-v2` y una
propuesta de contrato/arquitectura para `apps/publico`, construida sobre
el Bloque 1 — Data Foundation (`Property`, `normalizeProperty()`,
`PropertyRepository`) ya aprobado y cerrado.

**Metodología:** toda la sección de auditoría (§1–§2) proviene de lectura
directa del código real (`frontend-v2/js/index.js`,
`frontend-v2/index.html`, `frontend-v2/js/core/tpl-data-service.js`,
`frontend-v2/casas.js`) — no de descripciones previas ni de memoria de
sesiones anteriores. Donde una afirmación de un documento anterior no
coincidía exactamente con el código, se corrige aquí y se señala. Misma
disciplina de etiquetas que las auditorías anteriores:

- **HECHO CONFIRMADO** — verificado leyendo el código real.
- **PENDIENTE DE VERIFICAR** — no confirmado con evidencia directa.
- **PROPUESTA** — parte del análisis de este documento, no una decisión.

---

## 1. Auditoría del buscador actual (`frontend-v2`)

### 1.1 Los dos métodos de búsqueda reales

| Método | Cómo funciona | Archivo/línea |
|---|---|---|
| **"Cerca de ti"** (`nearby`) | `navigator.geolocation.getCurrentPosition()` obtiene `{lat, lng}` del navegador; `distanceKm()` calcula distancia Haversine contra `p.lat`/`p.lng` de cada propiedad; los resultados se ordenan por distancia ascendente. | `js/index.js:511-532` (`locate()`), `172-184` (`distanceKm`/`distanceOf`) |
| **"Por comuna"** (`commune`) | `<select>` poblado dinámicamente desde las comunas presentes en el catálogo ya cargado (`populateCommunes()`); al elegir una, filtra por **igualdad exacta normalizada** (`normalize(p.comuna) === normalize(state.commune)`) — no hay coincidencia parcial ni tolerancia a variantes de escritura fuera de la normalización de acentos/mayúsculas. | `js/index.js:230-262` (`populateCommunes`), `360-361` (filtro) |

**Hallazgo — no existe búsqueda por palabras clave hoy.** Se revisó
`frontend-v2/index.html` completo en la zona del buscador (`#buscador`,
líneas 182-277): no hay ningún campo de texto libre para buscar. El
único `<input>` de texto en todo el widget es `#combo-budget-input`, que
es numérico (presupuesto), no una caja de búsqueda. Existen funciones
internas (`hasNature`, `hasServices`, `hasPayment`) que sí evalúan texto
libre con regex (`textOf(p)` concatena `nombre, comuna, sector,
descripcion, detalle, entorno, servicios`), pero se usan únicamente como
**heurísticas internas de orden/filtro por prioridad** (ver 1.2) — nunca
como una caja de búsqueda que el usuario escriba. Esto corrige,
apoyándose en el código real, la referencia previa a "búsqueda por
palabras clave" como si ya existiera: **es una necesidad funcional
nueva, no una capacidad heredada.**

### 1.2 "Prioridad" — el verdadero mecanismo de refinamiento

Además del método (nearby/commune), cada búsqueda aplica una
`state.priority` que reordena o filtra la lista ya obtenida
(`js/index.js:348-380`, función `getResults()`):

| Prioridad | Qué hace | Basado en |
|---|---|---|
| `economic` (por defecto) | Ordena por precio ascendente | `p.precio` |
| `distance` | Ordena por distancia (solo tiene sentido con `nearby`) | `distanceOf(p)` |
| `payment` | Prioriza propiedades con "facilidad de pago" | Heurística regex sobre texto libre + campos booleanos (`facilidadPago`, etc.) |
| `nature` | Prioriza "entorno natural" | Heurística regex (`bosque\|nativo\|araucaria\|...`) sobre `textOf(p)` |
| `services` | Prioriza "servicios cerca" | Heurística regex (`colegio\|hospital\|...`) sobre `textOf(p)` |
| `large` | Prioriza terrenos ≥ 1 hectárea | `sizeOf(p) >= 10000` |
| `opportunity` | Filtra por precio ≤ 90% del valor TPL guardado | `valoracionGuardada(p)` (misma fuente que la ficha pública) |

**Observación relevante para la arquitectura futura:** `hasNature`,
`hasServices` y `hasPayment` son heurísticas de texto libre porque en
`frontend-v2` no hay campos estructurados confiables para esas señales.
Con el contrato `Property` ya aprobado (Bloque 1), varias de estas
señales **ya tienen datos estructurados reales** —
`characteristics.naturalFeatures` (array), `characteristics.vegetation`,
`characteristics.water`, `characteristics.electricity` — que podrían
reemplazar la heurística regex en vez de heredarla tal cual. Esto es una
observación, no una decisión: **PROPUESTA**, pendiente de evaluación.

### 1.3 El modo "proyecto completo" (combo terreno + casa)

Es una tercera función, independiente de los dos métodos anteriores
(`js/index.js:629-807`, `comboCandidates`/`renderComboResults`):

- El usuario ingresa un presupuesto total (o usa un atajo `$10M/$25M/$35M/$50M`).
- El sistema cruza **todas** las parcelas con precio contra **todas**
  las casas con precio (`O(n×m)`, sin índice ni paginación), acepta
  combinaciones dentro de `± $5.000.000` del presupuesto, ordena por
  cercanía al presupuesto y descarta duplicados de parcela u casa,
  devolviendo máximo 6 resultados.
- **Hallazgo:** el catálogo de casas (`houseCatalog()`) viene
  **exclusivamente** de `frontend-v2/casas.js` — un arreglo estático de
  370 líneas hardcodeado en el frontend. Se buscó explícitamente
  cualquier fetch remoto de casas (`tpl_casas`, `listPublishedHouses`,
  etc.) en `frontend-v2/js/` y **no existe ninguno**. Esto es distinto
  de las parcelas, que sí se hidratan desde Supabase. La tabla real
  `tpl_casas` (auditada en el contrato `Property`, Bloque 1) es el
  catálogo de modelos para el Cotizador — **no** alimenta este combo
  hoy.

### 1.4 Integración con catálogo y mapa

- **Catálogo:** `getResults()` es la única función que decide qué se
  muestra — tanto la grilla (`render()`) como el mapa (`paintMap()`)
  consumen la **misma lista ya filtrada/ordenada**. No hay dos fuentes
  de verdad.
- **Mapa:** Leaflet se carga de forma perezosa (`loadLeaflet()`, solo al
  hacer clic en "Ver en mapa" — `openMap()`, `js/index.js:551-577`),
  nunca en la carga inicial. Cuando se abre, pinta exactamente el mismo
  conjunto de resultados vigente (`paintMap(getResults())`), agrega un
  marcador para la ubicación del usuario si existe, y ajusta el zoom a
  los límites (`fitBounds`). Coincide con la decisión ya confirmada en
  `TPL-FASE-3-AUDITORIA-ARQUITECTURA.md` §Q ("Mapa — lazy loading
  obligatorio").
- **Comunas rápidas (ribbon):** los chips de comuna (`data-commune-shortcut`)
  simplemente pre-rellenan `state.commune` y ejecutan el mismo camino
  que "Por comuna" — no es un mecanismo aparte.

### 1.5 Fuente de datos — el hallazgo más importante para la arquitectura

`frontend-v2/js/core/tpl-data-service.js:232-279`
(`listPublishedProperties()`) — la única función que trae propiedades
desde Supabase para el home — hace exactamente esto:

```
tpl_propiedades .select(<columnas>) .eq('estado','publicada')
  .order('publicada_at', desc) .limit(300)
+ 1 consulta batch a tpl_propiedad_imagenes (in propiedad_id)
```

**No hay ningún filtro de búsqueda a nivel de base de datos. No hay
`.ilike()`, no hay `.textSearch()`, no hay `to_tsvector`/FTS, no hay
PostGIS, no hay RPC de búsqueda.** Se confirma exhaustivamente (grep
sobre `tpl-data-service.js` completo): cero coincidencias. Todo el
buscador de `frontend-v2` — comuna, proximidad, prioridad, combo — opera
en JavaScript, en el navegador, sobre un catálogo completo descargado de
una sola vez (tope actual: 300 filas, ~4 KB cada una por
`metadata`+`descripcion`, según el propio comentario del código). Esto
**confirma con evidencia directa** lo que la auditoría de coexistencia
ya sospechaba sobre filtros client-side, y es coherente con el patrón
`list()`/`getByCode()` ya implementado en `SupabasePropertyRepository`
(Bloque 1): ambos leen sin filtrar más que `estado='publicada'`.

---

## 2. Brecha entre lo existente y la necesidad funcional ya definida

El dueño del proyecto ya definió esta necesidad funcional (mensaje de
aprobación de Fase 3, ver `TPL-FASE-3-AUDITORIA-ARQUITECTURA.md`):
búsqueda por comuna, por proximidad, por palabras clave (incluyendo la
descripción), descubrimiento por catálogo, descubrimiento por mapa, y un
futuro modo de "proyecto completo" (terreno + casa + presupuesto).
Comparado con la auditoría de §1:

| Necesidad funcional | ¿Existe hoy en `frontend-v2`? |
|---|---|
| Búsqueda por comuna | **Sí** — filtro exacto normalizado (§1.1) |
| Búsqueda por proximidad | **Sí** — geolocalización + Haversine (§1.1) |
| Búsqueda por palabras clave, incluyendo descripción | **No** — no existe ningún campo de texto libre de búsqueda (§1.1); las únicas heurísticas de texto libre son internas de prioridad, no una caja de búsqueda |
| Descubrimiento por catálogo | **Sí** — grilla con prioridades (§1.2) |
| Descubrimiento por mapa | **Sí** — Leaflet lazy (§1.4) |
| Modo proyecto completo (terreno + casa + presupuesto) | **Parcial** — existe como combo (§1.3), pero 100% client-side sobre un catálogo de casas **estático y hardcodeado**, no conectado a Supabase |

---

## 3. Propuesta de contrato de dominio para Search en `packages/core`

**Todo lo siguiente es PROPUESTA — no implementado, no aprobado.** Se
apoya en lo ya aprobado del Bloque 1 (`Property`,
`PropertyRepository`), sin modificarlo.

```ts
// PROPUESTA — ilustrativa, no implementada, no aprobada.

type SearchMethod = "nearby" | "commune" | "keyword";
// "nearby" y "commune" heredan 1:1 la lógica ya auditada en §1.1.
// "keyword" es una capacidad NUEVA — no existe hoy en ninguna forma.

interface SearchFilters {
  method?: SearchMethod;
  commune?: string;                       // igual que hoy: comparación exacta
  coordinates?: { lat: number; lng: number };
  keyword?: string;                       // NUEVO — ¿contra qué campos? ver §6
  priority?: "economic" | "distance" | "payment" | "nature" | "services" | "large" | "opportunity";
  limit?: number;
}

interface SearchResult {
  properties: Property[];                 // el mismo Property de Bloque 1, sin cambios
  total: number;
}

// Extiende PropertyRepository (Bloque 1) — no lo reemplaza ni lo modifica.
interface PropertySearchRepository {
  search(filters: SearchFilters): Promise<SearchResult>;
}
```

Este boceto es deliberadamente mínimo — su único propósito es mostrar
que Search puede construirse **sobre** `Property`/`PropertyRepository`
sin tocarlos, igual que se decidió para `hasHouse` en el propio Bloque
1. La forma exacta de `SearchFilters`/`SearchResult` queda abierta a tu
revisión, igual que pasó con `Property` V1.

---

## 4. Propuesta de arquitectura para `apps/publico`

**PROPUESTA**, coherente con la arquitectura ya descrita (sin aprobar
todavía) en `TPL-FASE-3-AUDITORIA-ARQUITECTURA.md` §N:

- **Server Component** (`page.tsx` o una ruta de catálogo): ejecuta la
  búsqueda inicial (comuna o catálogo general) en el servidor, usando
  `PropertyRepository`/una futura extensión de búsqueda — igual que hoy
  ya se decidió que el catálogo se sirve por ISR sin que los hijos
  vuelvan a consultar Supabase.
- **Client Component** (`SearchWidget`): reemplaza el widget actual de
  `frontend-v2` — método (nearby/commune/keyword), prioridad, y el
  combo de presupuesto. La geolocalización (`navigator.geolocation`)
  seguirá siendo necesariamente client-side, como hoy.
- **Pregunta abierta central (no resuelta aquí):** si "nearby" y
  "keyword" se resuelven client-side (sobre el catálogo ya cargado, como
  hoy) o server-side (nueva consulta por cada búsqueda). Ver §5 —
  ninguna opción está descartada ni elegida.
- **Combo terreno+casa:** si se retoma, necesitaría un
  `HouseRepository` equivalente a `PropertyRepository` — hoy no existe
  ninguna fuente de datos real para casas en el sitio público (§1.3).
  Esto es una pieza de infraestructura nueva, no cubierta por el Bloque
  1, y **no se propone construir aquí** — se deja solo señalada.

---

## 5. Client-side vs. server-side — evaluación sin decidir

| | Client-side (como hoy) | Server-side (FTS/PostGIS/RPC) |
|---|---|---|
| Comuna | Ya funciona, cero costo adicional | Requiere una consulta nueva por selección |
| Proximidad | Cálculo trivial en JS, ya funciona | PostGIS (`ST_Distance`/`ST_DWithin`) — no hay evidencia de que la tabla tenga columna geográfica (`geography`/`geometry`) hoy, sería infraestructura nueva |
| Palabras clave | Regex/`includes()` sobre lo ya cargado — funciona hasta que el catálogo crezca | `to_tsvector`/`websearch_to_tsquery` sobre `titulo`+`descripcion` — no existe ninguna columna ni índice de este tipo hoy en `tpl_propiedades` (verificado: cero menciones en el código existente) |
| Escala | El propio código ya limita a 300 filas por el peso de la respuesta — un techo real, no teórico | Escala mejor, pero es infraestructura nueva que requeriría su propia auditoría de Supabase (índices, migraciones) — explícitamente fuera de lo que se audita aquí |
| Complejidad | Mínima — ya probado en producción durante meses | Alta — nueva superficie de RPC/índices, nueva capa en `PropertyRepository` |

Ninguna fila de esta tabla es una recomendación cerrada — es
exclusivamente para que la decisión (§6) se tome con la información
completa.

---

## 6. Decisiones que necesitan tu aprobación

1. **¿"Keyword" busca solo en `title`, o también en `description`?** El
   dueño ya pidió que incluya descripción — se deja como diseño
   propuesto en §3, pendiente de confirmar si aplica igual a ambos
   campos o con distinto peso.
2. **¿Client-side o server-side para keyword/proximidad?** (§5) — no se
   recomienda una opción todavía; requiere saber cuánto va a crecer el
   catálogo antes de decidir si el techo de 300 filas es aceptable para
   la nueva homepage.
3. **¿Se retoma el modo "proyecto completo" (combo)?** Si sí, requiere
   definir de dónde sale el catálogo de casas (§1.3, §4) — hoy no hay
   ninguna fuente real conectada a Supabase para eso en el sitio
   público.
4. **¿Se reemplazan las heurísticas regex de prioridad
   (`payment`/`nature`/`services`) por los campos estructurados reales
   de `Property.characteristics`?** (§1.2) — observación técnica, no
   una decisión tomada.
5. **Forma final de `SearchFilters`/`SearchResult`** (§3) — es un
   boceto ilustrativo, no una propuesta cerrada como sí lo fue
   `Property` V1 tras su propia ronda de revisión.

---

## 7. Riesgos

1. **Divergencia de comportamiento** si se reimplementa "nearby"/"comuna"
   con lógica distinta a la ya auditada en §1.1, en vez de portar
   exactamente las mismas reglas (Haversine, igualdad exacta
   normalizada).
2. **Confundir "palabras clave" con las heurísticas de prioridad
   existentes** (`hasNature`/`hasServices`/`hasPayment`) — son cosas
   distintas: las heurísticas ya existen y reordenan; la búsqueda por
   palabras clave no existe y filtraría.
3. **Construir infraestructura de búsqueda server-side (FTS/PostGIS)
   sin auditoría propia de Supabase primero** — esta auditoría
   deliberadamente no investigó si `tpl_propiedades` tiene o podría
   tener columnas/índices para eso; sería una auditoría separada antes
   de decidir server-side.
4. **Combo terreno+casa** — si se retoma, migrar `casas.js` (estático)
   a una fuente real sin una decisión explícita sobre `tpl_casas` podría
   mezclar el catálogo de modelos del Cotizador con el catálogo de
   propiedades públicas, algo que la auditoría del contrato `Property`
   (Bloque 1) ya dejó separado a propósito.

---

## RECOMENDACIÓN — PENDIENTE DE APROBACIÓN DEL DUEÑO

Ninguna parte de este documento autoriza implementar Search, modificar
`packages/core`, `apps/publico`, `frontend-v2`, `@tpl/ui`, Supabase o
Vercel. No se creó, modificó ni eliminó ningún archivo de código durante
esta auditoría — toda la evidencia se obtuvo leyendo el código ya
existente. Implementar cualquier parte de esta propuesta (incluida
cualquier extensión de `packages/core`) requiere una autorización
explícita y separada, sección por sección si hace falta.
