# TPL — Search: Segunda etapa de diseño (resolución de decisiones abiertas)

**Estado: DOCUMENTO DE TRABAJO — SOLO DISEÑO, SIN CÓDIGO. Ninguna
resolución de este documento autoriza tocar `packages/core`,
`apps/publico`, `frontend-v2`, `@tpl/ui`, Supabase o Vercel.** Es la
continuación directa de `TPL-FASE-3-SEARCH-AUDITORIA-ARQUITECTURA.md`
(aprobada como auditoría) — resuelve, como propuesta, las 5 decisiones
que ese documento dejó abiertas más la sexta que agregaste ("qué debe
encontrar realmente el buscador"), y desarrolla los 12 puntos pedidos.
Antes de tocar `packages/core` hace falta tu aprobación explícita de
este documento, igual que con `Property` (Bloque 1).

Fecha: 2026-09-10. Donde este documento necesitó evidencia nueva (el
caso de `casas.js`/`tpl_casas`, punto 10), se investigó leyendo código
real — no se asumió nada de lo ya escrito antes.

---

## 0. La sexta decisión: dos intenciones, una experiencia

Adopto tu propuesta como base de diseño: **una sola experiencia de
búsqueda, con dos intenciones diferenciadas**, modeladas explícitamente
en el contrato en vez de vivir implícitas en el código (como hoy):

```ts
type SearchIntent = "property" | "complete-project";
```

- **`"property"`** — comuna, cercanía, texto libre, características,
  rango de precio, superficie, tipo. Es la evolución directa de lo que
  ya existe (§1 de la auditoría).
- **`"complete-project"`** — parcela + casa + presupuesto total,
  eventualmente características de la casa. Es la evolución del combo
  actual (§1.3 de la auditoría), sin obligar a construir el sistema de
  casas completo ahora (punto 10 más abajo).

Esto reemplaza la idea de tratar "comuna/cercanía/texto" y
"presupuesto combo" como dos widgets sin relación (que es como están
hoy en `frontend-v2`, aunque comparten la misma sección del hero) — en
la propuesta, ambos son **la misma búsqueda**, distinguida por
`intent`, no dos features separadas.

---

## 1–2. Contrato final: `SearchFilters` y `SearchResult`

**PROPUESTA** (reemplaza el boceto ilustrativo del documento anterior,
ya incorporando el punto 0):

```ts
interface SearchFilters {
  intent: SearchIntent;

  // Comunes a ambas intenciones
  commune?: string;                      // igual que hoy: comparación exacta
  coordinates?: { lat: number; lng: number };
  keyword?: string;                      // ver §4 — alcance de campos
  priceMin?: number;
  priceMax?: number;

  // Solo cuando intent === "property"
  landAreaMin?: number;                  // m² — no existe hoy en frontend-v2
  propertyType?: PropertyType;           // "parcela" | "casa" (Bloque 1)
  characteristics?: Partial<{            // ver §11 — reemplaza heurísticas regex
    naturalFeatures: string[];
    vegetation: string;
    water: string;
    electricity: string;
  }>;

  // Solo cuando intent === "complete-project"
  totalBudget?: number;                  // hoy: state combo-budget-input
  houseCharacteristics?: Partial<{       // "eventualmente", como dijiste — no v1
    minRooms: number;
  }>;

  priority?: "economic" | "distance" | "opportunity"; // ver nota abajo
  limit?: number;
}

interface SearchResult {
  intent: SearchIntent;
  properties: Property[];                // "property": resultados directos
  combinations?: Array<{                 // "complete-project": pares parcela+casa
    property: Property;
    house: unknown;                      // tipo House — no existe todavía, ver §10
    totalPrice: number;
  }>;
  total: number;
}
```

**Nota sobre `priority`:** propongo **retirar** `payment`/`nature`/
`services` como valores de `priority` y moverlos a `characteristics`
como filtros reales (§11) — un filtro estructurado ("solo con
naturaleza") es más correcto que una prioridad de orden basada en regex
sobre texto. Es una propuesta, no una decisión tuya ya tomada; lo
señalo explícitamente porque cambia el comportamiento actual (hoy
`nature` no filtra, solo reordena — con esta propuesta pasaría a
filtrar). Si prefieres conservar el comportamiento actual de "reordena,
no filtra", se puede mantener `priority` con esos tres valores tal cual
están hoy.

---

## 3. Relación con `PropertyRepository`

Sin cambios respecto al documento anterior: `PropertySearchRepository`
es una interfaz **nueva y separada**, que **usa** `Property`
(Bloque 1) como tipo de resultado, sin modificar `PropertyRepository`
ni forzarlo a crecer con parámetros de búsqueda que nunca fueron parte
de su contrato aprobado (`list()`/`getByCode()` quedan exactamente como
están):

```ts
interface PropertySearchRepository {
  search(filters: SearchFilters): Promise<SearchResult>;
}
```

Un futuro `SupabasePropertySearchRepository` podría **reutilizar**
`SupabasePropertyRepository` internamente (para no duplicar la
hidratación batch de imágenes ya resuelta en Bloque 1) en vez de
reimplementarla — apunto la intención, no lo diseño en detalle todavía
porque depende de si el motor termina siendo client-side o server-side
(§5–6).

---

## 4. Alcance exacto de búsqueda textual

Decisión conceptual, como pediste, tomada ahora: **`keyword` busca en**

```
título + descripción + comuna + sector + características relevantes
(naturalFeatures, vegetation, water, electricity, access, mainView)
```

**y explícitamente NO en:** `id`, `codigo` (no son texto para buscar,
son identificadores), `region` (ya cubierta indirectamente por comuna),
`metadata` cruda completa (solo los campos de `characteristics` ya
promovidos a texto — no se convierte todo `metadata`/`casa_datos` en
texto buscable, tal como pediste explícitamente).

Ejemplo concreto que diste — `"bosque cerca de río con luz"` — con este
alcance, encontraría coincidencias si `naturalFeatures` contiene
`"bosque"`/`"río"`, o si `vegetation`/`descripcion` los mencionan, o si
`electricity` indica "conectada"/"disponible". El **peso relativo**
entre campos (¿título pesa más que descripción?) queda explícitamente
diferido, tal como aceptaste ("y posteriormente podemos decidir qué
peso tiene cada campo") — no es necesario resolverlo antes de la
primera versión.

---

## 5. Estrategia inicial: client-side (motor actual)

**PROPUESTA para v1**, sin FTS/PostGIS todavía:

```
SearchWidget → SearchFilters → PropertySearchRepository
                                        ↓
                        ClientSidePropertySearchEngine
                (recibe Property[] ya cargado por PropertyRepository.list(),
                 aplica los mismos filtros de §1-2 en memoria)
                                        ↓
                                   SearchResult
```

Esto es, literalmente, portar `getResults()` (auditoría §1.2) a una
función pura que recibe `Property[]` + `SearchFilters` y devuelve
`SearchResult` — mismo principio que `normalizeProperty()`: una función
sin I/O, testeable con fixtures, que no decide de dónde vino el
catálogo. La geolocalización (`navigator.geolocation`) sigue siendo
responsabilidad del `SearchWidget` (Client Component), no del motor de
búsqueda — el motor solo recibe `coordinates` ya resueltas.

---

## 6. Punto futuro de migración a FTS/PostGIS

La garantía de diseño es exactamente la que dibujaste: **el contrato
`PropertySearchRepository.search(filters)` no cambia** entre el motor
actual y un futuro motor server-side — solo cambia qué hay detrás de
la interfaz:

```
SearchWidget → SearchFilters → PropertySearchRepository
                                        ↓
                    SupabasePropertySearchEngine (futuro)
              (to_tsvector/websearch_to_tsquery para keyword,
               ST_DWithin para proximidad, filtros SQL para el resto)
                                        ↓
                                   SearchResult
```

Condición explícita para cruzar a esta migración (no antes): una
auditoría separada de Supabase que confirme qué columnas/índices
existen o se necesitarían en `tpl_propiedades` — esta etapa de diseño
**no la incluye a propósito**, tal como ya se acotó en el documento
anterior (§7, riesgo 3).

---

## 7. Diseño de proximidad

Se mantiene Haversine client-side (auditoría §1.1) para v1 — es
correcto y ya probado, no hay razón técnica para tocarlo todavía. El
único cambio de diseño es de **forma**, no de fórmula: en vez de vivir
dentro del estado global de un script de página (`state.coords` en
`js/index.js`), pasa a ser un parámetro explícito de `SearchFilters`
(`coordinates`), que el motor recibe sin acoplarse a cómo se obtuvo. La
migración a PostGIS (`ST_DWithin`) queda como parte de §6, no antes.

---

## 8. Diseño de presupuesto

Se incorpora como `totalBudget` dentro de `intent: "complete-project"`
(§1-2), conservando la regla ya auditada (±$5.000.000, auditoría §1.3)
como valor por defecto del motor — no como parte del contrato público
de `SearchFilters` (para no exponer un número mágico como si fuera una
decisión del llamador). Si en el futuro se quiere ajustar ese margen,
sería un parámetro del motor, no del contrato.

---

## 9. Diseño de "proyecto completo"

Formalizado en §0 y §1-2 (`intent: "complete-project"`,
`SearchResult.combinations`). La lógica de cruce (parcela × casa,
descarte de duplicados, orden por cercanía al presupuesto — auditoría
§1.3) se porta tal cual a una función pura del motor, igual que §5. La
única pieza que falta para que esto sea real es de dónde sale el
catálogo de casas — eso es exactamente el punto 10.

---

## 10. Relación con `casas.js` y `tpl_casas` — investigado ahora, con evidencia nueva

Tenías razón en pedir cautela aquí. Investigué el uso real de ambos en
todo `frontend-v2` (no solo `index.js`) y el panorama es más amplio de
lo que parecía:

| Fuente | Quién la usa hoy | Evidencia |
|---|---|---|
| `casas.js` (estático, 370 líneas, catálogo de modelos ChileHome) | **Homepage** (combo, `index.html:514`), **Cotizador público** (`cotizador.html:207`, `js/cotizador.js:63`), `proyecto.html`/`proyecto.js`, `js/tpl-seo.js` (sección SEO de casas) | HECHO CONFIRMADO — grep de `window.casas`/`casas.js` en todo `frontend-v2` |
| `tpl_casas` (tabla Supabase real, 14 filas) | **Solo el CRM** (`plataforma/crm-tpl-v1/modules/casas/index.js:435`) | HECHO CONFIRMADO — única referencia a `tpl_casas` en todo el repositorio |

**No se encontró ningún paso de sincronización o exportación entre
ambas** (`tpl_casas` → `casas.js` o viceversa) — son, hasta donde el
código muestra, dos catálogos independientes que podrían estar
desincronizados hoy mismo.

**Implicación para Search:** `casas.js` no es un dato "solo del
combo de la homepage" que se pueda migrar sin más — es la fuente real
del **Cotizador público completo**. Cualquier cambio a cómo se lee ese
catálogo afecta al Cotizador, no solo a Search. Por eso:

- **Propuesta para v1 de Search:** dejar `casas.js` exactamente como
  está, sin tocarlo, y que el motor de "proyecto completo" (§5, §9) lo
  lea tal cual se lee hoy (`window.casas`) — cero riesgo para el
  Cotizador, cero decisión prematura sobre `tpl_casas`.
- **Fuera de alcance de Search, explícitamente:** decidir si el
  Cotizador y la homepage deberían migrar a `tpl_casas` como fuente
  única. Eso es una auditoría propia (qué tiene cada uno, cuál es más
  reciente, si hay 14 filas en `tpl_casas` vs. cuántas hay en
  `casas.js`) que no se hizo aquí porque tocaría al Cotizador, y el
  encargo de esta etapa es exclusivamente Search.

---

## 11. Qué campos de `Property.characteristics` reemplazan las heurísticas

Resultado honesto, no todas tienen reemplazo limpio:

| Heurística actual (regex sobre texto) | ¿Reemplazo estructurado en `Property`? |
|---|---|
| `hasNature` (bosque/nativo/araucaria/naturaleza/río/...) | **Sí** — `characteristics.naturalFeatures` (array) y `characteristics.vegetation` ya son datos estructurados reales (Bloque 1) |
| `hasServices` (colegio/hospital/supermercado/...) | **No existe** — ningún campo de `Property.characteristics` describe cercanía a servicios; sería un campo nuevo, no cubierto por Bloque 1 |
| `hasPayment` (facilidad de pago/cuotas/pie) | **No existe** — es un concepto comercial/de venta, no una característica física de la propiedad; no encaja conceptualmente en `Property.characteristics` tal como está definido (Bloque 1 lo dejó fuera a propósito) |

Conclusión: solo `nature` puede pasar a ser un filtro estructurado real
hoy sin tocar `property.ts`. `services` y `payment` seguirían siendo
heurísticas de texto (dentro del alcance de `keyword`, §4) o quedarían
fuera de Search hasta que exista una decisión explícita de agregar esos
campos a `Property` — que es un cambio a un archivo protegido y
requeriría su propia aprobación, no se propone aquí.

---

## 12. Comportamiento en móvil

Auditado en `frontend-v2/css/index.css` (breakpoints reales, no
supuestos): el widget de búsqueda actual es **responsive pero
funcionalmente idéntico** entre desktop y móvil — no hay una lógica de
búsqueda distinta en móvil, solo layout:

- `≤1024px`: el widget pasa de dos columnas (panel de búsqueda +
  panel de presupuesto lado a lado) a una sola columna apilada.
- `≤820px`: la cinta de comunas oculta las flechas de navegación (en
  táctil se desliza con el dedo).
- `≤620px`: los botones de método ("Cerca de ti"/"Por comuna") apilan
  ícono sobre etiqueta en vez de en línea.

**Propuesta:** mantener el mismo principio para `apps/publico` — un
único `SearchWidget` (Client Component) con un solo comportamiento
funcional, y que la diferencia móvil/desktop sea exclusivamente CSS/
layout (grid responsive, como hoy), no una segunda implementación de
lógica de búsqueda. No se identificó ninguna razón, en la auditoría de
código real, para apartarse de ese patrón ya probado.

---

## Resumen de lo que queda pendiente de tu aprobación

Todo lo anterior es **propuesta**. Antes de tocar `packages/core`
necesito tu confirmación explícita sobre, como mínimo:

1. La forma final de `SearchFilters`/`SearchResult` (§1-2), incluyendo
   si `priority` pierde `payment`/`nature`/`services` a favor de
   `characteristics` (cambio de comportamiento, no solo de forma).
2. El alcance de `keyword` (§4) tal como quedó definido.
3. Dejar `casas.js` intacto para v1 de Search y tratar la
   reconciliación con `tpl_casas` como una iniciativa aparte (§10).
4. Que `services`/`payment` no se conviertan en filtros estructurados
   por ahora (§11), quedando como texto libre o fuera de Search.

## PENDIENTE DE APROBACIÓN DEL DUEÑO

Este documento no autoriza ningún cambio en `packages/core`,
`apps/publico`, `frontend-v2`, `@tpl/ui`, Supabase ni Vercel. No se
modificó ningún archivo de código para producirlo — toda la evidencia
nueva (§10, §12) se obtuvo leyendo código y estilos ya existentes.
