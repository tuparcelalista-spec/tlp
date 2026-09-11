# TPL — Fase 3: Auditoría de la homepage actual y arquitectura propuesta

**Estado: DOCUMENTO DE TRABAJO EN REVISIÓN (última actualización 2026-09-10) — NINGUNA CONCLUSIÓN NI PROPUESTA DE FASE 3 APROBADA TODAVÍA.**

Este documento es una **auditoría de la homepage actual y una propuesta de
arquitectura** para la nueva homepage. Corresponde al trabajo de análisis
encargado para preparar la Fase 3 y se entrega exclusivamente para
revisión del dueño del proyecto.

**Precisión explícita sobre su estado:**

- Las clasificaciones (qué conservar/rediseñar/eliminar), la jerarquía de
  información propuesta, la arquitectura de datos, el mecanismo de
  conversión, la experiencia mobile y la arquitectura de `apps/publico`
  descritas aquí son **propuestas a revisar, no decisiones tomadas**.
- **Ninguna parte de este documento debe interpretarse como autorización
  para implementar ninguna parte de la nueva homepage.** Ver también la
  nota sobre el experimento de Fase 3-A/3-B más abajo: ya hubo un caso en
  que una autorización parcial se malinterpretó como luz verde para
  construir código, y dicho trabajo fue revertido por completo.
- Cualquier implementación de Fase 3 —incluyendo cambios en
  `apps/publico`, extensiones de `packages/core`, infraestructura de
  coexistencia en Vercel, o cualquier página nueva— queda **condicionada
  a una revisión y aprobación formal posterior** de esta arquitectura,
  sección por sección si fuera necesario.
- **Aprobar este documento y autorizar implementación son dos pasos
  distintos.** Este documento es exclusivamente de auditoría y propuesta
  de arquitectura. Si en algún momento se aprueba tal como está, esa
  aprobación valida el análisis y la propuesta, pero no constituye por sí
  misma autorización para comenzar ningún desarrollo. Cualquier
  desarrollo de la homepage o modificación de infraestructura requiere
  una autorización explícita y separada en una etapa posterior.
- La sección §Q separa explícitamente las **decisiones confirmadas**
  —instrucciones puntuales que el dueño ya dio directamente, como no
  portar `TPLPropertyCard.js`, no recalcular la tasación y no migrar
  imágenes todavía— de las **propuestas pendientes de revisión**, que no
  deben tratarse como decisiones cerradas.

## Estado de los bloques anteriores

Para evitar confundir el estado de Fase 3 con el trabajo ya aprobado:

- **Fase 1 — Infraestructura:** aprobada.
- **Fase 2 — Design System:** aprobada.
- **Bloque 1 — Data Foundation (`packages/core`):** implementado,
  verificado y aprobado/cerrado.
- **Fase 3 — Nueva homepage:** arquitectura todavía en revisión.
- **Implementación de la nueva homepage:** no autorizada.
- **Search:** arquitectura concreta pendiente de definición y aprobación.
- **Filtros:** estrategia definitiva pendiente de definición y aprobación.
- **Coexistencia con producción:** requisito confirmado; mecanismo
  técnico pendiente de decisión.
- **Tráfico real hacia la nueva homepage:** no autorizado hasta completar
  la definición, pruebas y validación del mecanismo de coexistencia.

## Distinción importante sobre `packages/core`

El experimento anterior de Fase 3-A/3-B que involucró una implementación
prematura de `packages/core` fue revertido.

Posteriormente, el Bloque 1 — Data Foundation fue implementado de manera
independiente, validado mediante typecheck y smoke tests reales contra
Supabase, incluyendo `list()` y `getByCode()`, y quedó aprobado y
cerrado.

Por lo tanto, este documento no debe volver a presentar `packages/core`
como un componente inexistente o como un bloqueador pendiente de
construcción. Si Fase 3 requiere nuevas capacidades en `packages/core`,
esas extensiones deberán analizarse y aprobarse específicamente antes de
implementarse.

## Nota sobre Fase 3-A/3-B (experimento revertido)

Después de entregar este análisis, se autorizó brevemente construir
`packages/core` y un mecanismo de coexistencia (middleware + Vercel Edge
Config + reglas de rutas) como "Fase 3-A/3-B". El dueño determinó
después que esa autorización fue prematura — la arquitectura debía
quedar aprobada primero — y pidió tratar todo ese trabajo como **un
experimento no aprobado**. En consecuencia:

- Todo el código de esa implementación (`packages/core/src/{client,config,normalize,properties}.ts`,
  `packages/core/README.md`, `apps/publico/middleware.ts`, y los cambios
  de `package.json` asociados) fue **revertido por completo** — el
  working tree volvió exactamente al commit de cierre de Fase 2
  (`05ff0702a7b712f4a0f8bb32df78eb2a0088a657`).
- Los recursos creados en Vercel (Edge Config `tpl-coexistencia-flags`,
  la variable `EDGE_CONFIG` en el proyecto `tpl-publico-preview`, y la
  regla de rutas `Fase3-Coexistencia-Home`) fueron **eliminados**.
- `tpl-publico-preview` fue redesplegado reflejando únicamente el estado
  aprobado de Fase 2.
- Lo único que permanece de ese experimento es el **conocimiento
  técnico** que dejó (documentado en la sección de riesgos más abajo,
  al final): el mecanismo de `vercel routes` para rewrites a nivel de
  proyecto funciona y se probó en vivo; el middleware de Next.js no se
  ejecuta bajo el modo de despliegue `builds` legacy que usa el proyecto
  de prueba aislado. Ninguna decisión de arquitectura de coexistencia
  queda tomada por ese experimento — sigue pendiente de aprobación
  explícita junto con el resto de esta arquitectura.

Lo que sigue es el informe de auditoría y arquitectura tal como se
entregó y se aprobó, sin cambios.

---

## A. Relación con el Master Plan

`TPL-MASTER-MIGRATION-PLAN.md` §5 dice literalmente sobre Fase 3: *"primera ruta real migrada y servida a tráfico real, empezando por la de menor riesgo (sin auth, sin escritura, **ya usa TPLPropertyCard**)... Dependencias: Fases 1 y 2... Resultado esperado: `/` se sirve desde Next.js (SSG + ISR)... con rewrite de vuelta a frontend-v2/index.html detrás de un feature flag."*

Se encontraron **tres discrepancias reales entre el plan y el código**, señaladas sin decidir:

1. **"Ya usa TPLPropertyCard" es falso hoy.** `frontend-v2/shared/ui-components/TPLPropertyCard.js` existe (un Web Component con Shadow DOM), pero no está referenciado por ningún `<script>` ni usado como `<tpl-property-card>` en ningún archivo de `frontend-v2` — grep completo, cero coincidencias fuera de su propio archivo. El home real genera las cards con `parcelCard()` en `js/index.js` (strings HTML planas), no con ese componente. El plan describe un estado que no existe en el código actual.
2. **`packages/core` (cliente Supabase único) no está construido.** El plan lista "consumiendo `packages/ui`, `packages/core`..." como parte de Fase 3, pero `packages/core/package.json` decía explícitamente: *"En Fase 1 son solo interfaces TypeScript provisionales, sin ninguna conexión real a Supabase"* — y así sigue tras revertir el experimento de Fase 3-A. Fase 2 construyó `@tpl/ui`, no `@tpl/core`. Es una dependencia de Fase 3 que ninguna fase aprobada completó todavía.
3. **Tensión de timing en §12 (media).** Dice que `next/image` "se activa... Fase 3 en adelante" apuntando a Supabase Storage, pero también dice que la migración de imágenes a Storage ocurre "en paralelo a la Fase 4, no antes". Fase 3 necesita mostrar fotos reales del catálogo hoy — que siguen viviendo en `frontend-v2/image/...` — antes de que exista el bucket de Storage.

**Sin contradicción, confirmado y respetado en esta propuesta:** ninguna pantalla pública recalcula tasación (§2), las URLs de parcelas se preservan con redirect 301 si cambian de forma (§13), y el criterio de regresión SEO es el corregido de §13 (caída técnica sostenida, no ruido normal).

---

## B. Auditoría de la homepage actual

**Cabecera / SEO estático:** GTM inline (antes incluso del `<meta charset>`), `title`/`description`/`keywords`, OG completo, Twitter Card, canonical fijo a `/`, preload del hero, Google Fonts vía `<link>` clásico (bloqueante), 3 hojas CSS (`tpl-foundation.css` + `tpl-design-system.css` [alias muerto según §6] + `index.css`), 2 bloques JSON-LD (`RealEstateAgent` + `WebSite` con `SearchAction`).

**Header/nav/menú móvil:** ya migrado en Fase 2 (`@tpl/ui` Header/Footer/MobileMenu).

**Hero + buscador:** dos métodos ("Cerca de ti" con geolocalización, "Por comuna" con `<select>`) más un **combo de presupuesto** (terreno + casa, con chips rápidos $10M/$25M/$35M/$50M) que busca combinaciones parcela+casa dentro de un margen de $5M — una función de producto real y distintiva.

**Commune ribbon:** carrusel horizontal con scroll suave custom (respeta `prefers-reduced-motion`), agrupado por región con un orden fijo (`Biobío, Ñuble, La Araucanía, Maule, Otras zonas`).

**Trust bar:** 3 cifras (parcelas/comunas/regiones) calculadas del catálogo ya cargado, actualizadas dos veces (catálogo local, y de nuevo cuando hidrata el remoto vía `MutationObserver`).

**Video:** iframe de YouTube con `autoplay=1&mute=1` **incondicional** en el `src` — cualquier `video-autoplay.js` handler que se cargue para esta página es código muerto: sus selectores (`#tpl-native-video`, `.video-wrapper[data-youtube]`) no existen en `index.html`.

**Catálogo/resultados:** barra de prioridades (cercanas/pago/naturales/servicios/oportunidad/económicas/1ha+), botón de mapa (deshabilitado hasta que haya coordenadas), grilla con skeleton de carga, paginación "Ver más" (client-side, sobre datos ya traídos, no re-consulta), sección separada "Parcelas con casa", y un **empty state de dos variantes**: genérico, y un **"Radar de Mercado TPL"** que ofrece gestionar la compra de propiedades de terceros vía WhatsApp cuando no hay inventario propio.

**Mapa:** Leaflet cargado 100% lazy (CSS+JS inyectados solo al abrir el mapa).

**Bloques secundarios:** banner de tasador (CTA "Tasar mi propiedad"), sección editorial "Campo Story" (teaser a `campo-chileno.html`).

**JavaScript / dependencias reales (13 archivos, 5.336 líneas):** `parcelas.js`/`casas.js` (catálogo estático local, 32+ filas, con URLs de imagen relativas a `frontend-v2/image/...`), `tpl-data-service.js` (Supabase), `tpl-property-view.js` (normalizador único), `tpl-market-intelligence.js` (geo-heurística hardcodeada a 9 comunas), `js/core/property-analyzer.js` (scoring de oportunidad — cargado por **import() dinámico**, no por `<script>`), `tpl-seo.js` (SEO dinámico), `valuation-engine.js`, `tpl-public-stats.js`, `video-autoplay.js`, `auth.js`, `analytics-tracker.js`, `index.js` (orquestador).

**Llamada a Supabase real del home:** `listPublishedProperties()` — un único `SELECT` a `tpl_propiedades` (`estado='publicada'`, orden por `publicada_at desc`, límite 300) + un segundo query batch a `tpl_propiedad_imagenes` por lote de ids. Todo el filtrado/ordenado/paginado posterior es 100% client-side sobre esos datos ya traídos.

**Lógica de precio:** nunca se calcula; viene de `precio_publicado` (columna real) o `metadata.precio`/catálogo local como respaldo.

**Accesibilidad — hallazgo real:** cada card es un `<article onclick="window.location.href=...">` — no es un `<a>`, no es enfocable por teclado, un lector de pantalla no puede activarlo. El `PropertyCard` de Fase 2 ya resuelve esto (patrón de link estirado real).

**Performance — riesgos identificados:** Google Fonts bloqueante, iframe de YouTube autoplay incondicional, catálogo completo (hasta 300 filas) se trae siempre client-side sin SSR/ISR, ~13 scripts `defer` más 2 `type="module"`, sin `next/image` ni optimización de imagen todavía.

---

## C. Qué conservar (A — Conservar)

| Elemento | Por qué |
|---|---|
| Patrón "render local instantáneo → hidratar remoto → re-render" | Progressive enhancement real; en Next.js se resuelve mejor con SSG/ISR, pero la intención se conserva |
| Normalización única (`TPLPropertyView.normalizarPropiedad`) | Ya resuelve el bug histórico de fotos divergentes; es exactamente el contrato de datos que `packages/core` deberá formalizar cuando se apruebe |
| Lazy-load de Leaflet | Cero costo de mapa hasta que el usuario lo pide |
| Valor TPL guardado (3 valores persistidos) y su uso solo como *comparación* para el badge "Oportunidad TPL" | Coincide exactamente con la regla del Plan Maestro — no recalcula, solo lee y compara |
| Combo de presupuesto terreno+casa | Función de producto diferenciada |
| "Radar de Mercado TPL" (empty state con derivación a WhatsApp) | Convierte una búsqueda sin resultados en una oportunidad comercial |
| Búsqueda por comuna + "cerca de ti" (geolocalización) | Los dos métodos de descubrimiento reales que usan los visitantes hoy |
| Schema.org `RealEstateAgent` + `WebSite`/`SearchAction` | Correcto y vigente, se porta 1:1 vía Metadata API |
| GTM + analytics-tracker | Continuidad de medición |

## D. Qué rediseñar (B — Rediseñar)

| Elemento | Función válida, UX a evolucionar |
|---|---|
| Cards de propiedad | Jerarquía correcta; accesibilidad y superposición de precio/badges se resuelven mejor con `PropertyCard` de Fase 2 |
| Barra de prioridades (7 botones en fila) | La necesidad es real; se resuelve mejor con `Filter`/`FilterGroup`/`FilterChip` |
| Buscador de 2 paneles (ubicación + presupuesto combo) | Ambos flujos son válidos; jerarquía visual poco clara sobre cuál es la acción principal |
| Trust bar | El dato importa, la ejecución (spans con `innerHTML` manual) se resuelve mejor con `Stat` + datos servidos desde el servidor |
| Video corporativo | Vale la pena mantenerlo; autoplay incondicional no es "técnicamente eficiente" |
| Sello/diagnóstico de oportunidad (`property-analyzer.js`) | Ver §J — intención válida, ejecución necesita decisión del dueño antes de portarse |

## E. Qué eliminar o replantear (C)

| Elemento | Motivo |
|---|---|
| `video-autoplay.js` tal como está en el home | Código muerto en esta página específica |
| SEO dinámico vía `TPLSEO.apply()` sobreescribiendo `<title>`/meta ya declarados | Dos fuentes de verdad para lo mismo — Next.js Metadata API lo elimina de raíz |
| `tpl-market-intelligence.js` como "inteligencia geográfica" | Solo cubre 9 comunas hardcodeadas — no es un servicio de geointeligencia real |
| 7 botones de prioridad en una sola fila | No se elimina la función, se reemplaza la forma |

---

## F. Papel de la homepage y nueva arquitectura de información

| Orden | Sección | Responde a | Componentes @tpl/ui |
|---|---|---|---|
| 1 | **Hero + búsqueda** | "¿Qué es esto y qué puedo hacer?" | `Section`, `Container`, `SearchBar`, `Button` |
| 2 | **Confianza inmediata** (trust bar) | "¿Por qué confiar?" | `Stat`, `Container` |
| 3 | **Descubrimiento por comuna** (ribbon) | Acotar sin escribir | (nuevo, ver §M) |
| 4 | **Catálogo** (grilla + filtros) | "¿Qué puedo encontrar?" | `Grid`, `PropertyCard`, `Filter`/`FilterGroup`/`FilterChip`, `LoadingState`/`EmptyState` |
| 5 | **Inteligencia TPL** (banner de tasación) | El diferencial | `Card`, `Button` |
| 6 | **Video + contenido editorial** | Refuerzo de marca | `Section`, `Button` |
| 7 | **CTA final + Footer** | Última conversión | `Footer` |

**Baja de posición:** el video (hoy antes del catálogo) — pasa después. **Se convierte en interacción:** el combo de presupuesto (hoy panel fijo) — pasa a tab dentro del buscador (ver §G/§Q-5). **Vive fuera del flujo principal:** el mapa como panel bajo demanda (ya es así, se conserva).

## G. Jerarquía de conversión

- **CTA principal:** buscador del hero.
- **CTA secundario:** "Tasar mi propiedad".
- **Descubrimiento:** buscador + ribbon + filtros de grilla.
- **Contacto:** WhatsApp (ya es el canal real hoy).
- **Publicar:** botón del Header (ya migrado en Fase 2).

## H. Experiencia mobile

- **Buscador:** un modo visible por vez (tabs), no paneles apilados.
- **Filtros:** drawer/hoja inferior con `FilterGroup`, no fila de 7 botones.
- **Mapa:** pantalla completa (drawer/modal) en mobile.
- **Ribbon:** horizontal-scroll (ya mobile-friendly).
- **PropertyCards:** una columna, misma jerarquía que desktop.
- **Combo de presupuesto:** no desaparece, se convierte en tab (ver §Q-5).

## I. Arquitectura de datos (documentada, no implementada todavía)

**Hoy:** fuente = `tpl_propiedades` (+ `tpl_propiedad_imagenes` batch) vía cliente Supabase directo desde el navegador. Sin paginación server-side — trae hasta 300 filas y pagina/filtra en el cliente. Fallback a catálogo estático local si Supabase falla o mientras hidrata.

**Campos reales usados:** `id, codigo, tipo, estado, titulo, descripcion, region, comuna, sector, lat, lng, superficie_m2, precio_publicado, rol_situacion, electricidad, agua, acceso, topografia, suelo, exposicion, vista_principal, vegetacion, cierre_perimetral, porton, condominio, atributos_naturales, casa_datos, diagnostico, destacada, oportunidad_tpl, metadata`.

**Propuesta conceptual para `apps/publico` (pendiente de aprobación e implementación):**
- Un futuro `packages/core` expondría un cliente Supabase único server-side, tipado desde el esquema real.
- La página del home sería un Server Component que llama a `packages/core` en build/revalidate time (ISR).
- Los filtros/orden pueden seguir siendo client-side sobre los datos ya renderizados por el servidor.
- Las imágenes siguen resolviendo a las mismas URLs que hoy hasta que una fase posterior migre a Storage.

## J. Valorización / Inteligencia TPL — requiere decisión del dueño

Zona gris real, no decidida: `property-analyzer.js` calcula un **score ponderado de "oportunidad"** (precio 40%, acceso 10%, agua 8%, luz 8%, documentación 8%, topografía 8%, entorno 8%, potencial de inversión 10%) y una banda ("Excelente valoración", "Sello TPL Verde", etc.) **en el cliente**, mezclando los 3 valores persistidos con heurísticas de texto libre.

**Decisión ya tomada por el dueño (2026-09-10):** los 3 valores (Técnico/Comunal/Recomendado) son la tasación y no se tocan. El score/banda de `property-analyzer.js` es una capa comercial/marketing separada — **no se migra, rediseña ni recalcula durante esta etapa**, queda fuera de alcance hasta una decisión posterior explícita.

**Propuesta acotada para cuando se implemente:** la card del home solo muestra lo que ya persiste — badge "Oportunidad TPL" + "% bajo estimación" cuando `oportunidad_tpl`/diferencia contra `valor_tpl_recomendado` lo indican. El panel completo de score/diagnóstico queda fuera de esta fase.

## K. SEO

| Elemento | Hoy | Propuesta (pendiente de implementación) |
|---|---|---|
| Title/description | Estático en HTML **más** un override vía JS con texto distinto | Una sola fuente: Next.js Metadata API |
| Canonical | Fijo a `/` en HTML, recalculado dinámicamente (redundante) | `alternates.canonical` de Metadata API, una sola vez |
| Open Graph / Twitter | Completo, imagen fija | Se porta igual |
| Schema.org | `RealEstateAgent` + `WebSite`/`SearchAction` — correcto | Se porta igual; ningún schema por propiedad en Fase 3 (eso es Fase 4) |
| Sitemap | `sitemap.xml` estático | Sigue estático mientras `/` conviva con `frontend-v2`; `sitemap.ts` dinámico no es bloqueante para Fase 3 sola |
| Enlaces internos | A rutas de `frontend-v2` | Deben seguir apuntando ahí mientras esas páginas no migren |

## L. Performance — riesgos identificados

1. Google Fonts render-blocking — `next/font` lo resuelve.
2. Video con autoplay incondicional — candidato a lazy.
3. Mapa ya lazy — preservar el patrón.
4. Catálogo completo traído client-side — SSR/ISR lo serviría pre-renderizado.
5. Hydration — mínimo de Client Components (buscador, filtros, toggle del combo); el resto Server Components.
6. GTM — en Next.js va en `next/script` con estrategia `afterInteractive`.

## M. Componentes de `@tpl/ui` por sección

| Sección | Componentes existentes | Falta algo? |
|---|---|---|
| Header/Footer | `Header`, `Footer`, `MobileMenu` | No |
| Hero + búsqueda | `Container`, `Section`, `SearchBar`, `Button`, `Input` | El toggle de 2 métodos de búsqueda no tiene primitivo — posible `Tabs` (ya en el roadmap de Fase 2 como pendiente), no implementado |
| Trust bar | `Stat`, `Container` | No |
| Ribbon de comunas | — | Necesidad nueva — ver §Q-6, decisión: no se construye en `@tpl/ui` todavía |
| Catálogo/grilla | `Grid`, `PropertyCard`, `Badge`, `PropertyData` | No |
| Filtros | `FilterGroup`, `FilterChip`, `Select` | No |
| Estados | `LoadingState`, `EmptyState`, `Skeleton` | El "Radar de Mercado TPL" se arma componiendo `EmptyState` + `Button` (variante whatsapp) |
| Mapa | — | Fuera de `@tpl/ui` (integración Leaflet, no design system) |
| Banner de tasación | `Card`, `Button` | No |
| Video | — | No necesita componente propio |
| Editorial (Campo Story) | `Section`, `Container`, `Button` | No |

## N. Arquitectura propuesta de `apps/publico` (conceptual, no implementada)

```
app/
  layout.tsx          Server Component — <TplDesignSystemStyles/>, metadata base
  page.tsx            Server Component — fetch catálogo vía packages/core (ISR)
  components/
    Hero.tsx            Server Component (estático) + <SearchWidget/> anidado
    SearchWidget.tsx    "use client" — único límite de interactividad del hero
    CatalogGrid.tsx     Server Component — recibe datos ya resueltos
    CatalogFilters.tsx  "use client" — estado de filtro/orden
    CommuneRibbon.tsx   "use client" (scroll interactivo)
    MapPanel.tsx        "use client", dynamic import sin SSR (Leaflet)
    ValuationBanner.tsx Server Component
```

**Server Components:** layout, page, Hero (excepto el widget), CatalogGrid, ValuationBanner, secciones editoriales.
**Client Components:** SearchWidget, CatalogFilters, CommuneRibbon, MapPanel.
**Datos:** page.tsx haría un solo fetch server-side, pasaría el catálogo ya normalizado como props — ningún componente hijo volvería a consultar Supabase.

## O. Riesgos de migración

1. **Data Foundation de `packages/core` — ya implementado y aprobado (Bloque 1), no un bloqueador.** El contrato `Property`, la normalización única (`normalizeProperty()`), el repositorio (`PropertyRepository`/`SupabasePropertyRepository`) y el cliente público (`createSupabasePublicClient()`) ya existen, están operativos y fueron validados con un smoke test real contra Supabase y typecheck limpio (ver "Estado actual antes de implementar Fase 3"). Lo pendiente no es construir nuevamente esta base, sino determinar si la arquitectura actual de `core` necesita alguna extensión para Search, filtros u otras necesidades futuras de la homepage — cualquier extensión debe evaluarse y aprobarse antes de implementarse.
2. **Paridad de Core Web Vitals** exigida por el propio plan — hay que medirla, no asumirla.
3. **Divergencia de normalización** si se reimplementa la lógica de campos en vez de usar exactamente `normalizeProperty()`.
4. **El score de oportunidad (§J)** si se porta sin decisión explícita.
5. **Imágenes:** activar `next/image` antes de que se migren las imágenes a Storage rompería las fotos del catálogo.
6. **Radar de Mercado TPL:** lógica de negocio no trivial (mensaje de WhatsApp con contexto) — migrarla mal podría perder la plantilla o el contexto.
7. **Mecanismo de coexistencia (hallazgo del experimento revertido, documentado para cuando se retome):** en el modo de despliegue `builds` legacy de Vercel (necesario para resolver el monorepo pnpm en un proyecto sin "Root Directory" configurado), el Middleware de Next.js **no se ejecuta** — verificado de forma directa. El sistema nativo de reglas de rutas de Vercel (`vercel routes`) sí funcionó en vivo para el rewrite/rollback instantáneo. Antes de construir la coexistencia real, hay que resolver "Root Directory" del proyecto correspondiente (requiere dashboard, no esta versión de CLI) o decidir depender de `vercel routes` en vez de middleware.

## P. Orden recomendado de implementación (una vez aprobada la arquitectura)

Este orden asume que el Bloque 1 — Data Foundation (`packages/core`) ya
está completo y aprobado (ver "Estado actual antes de implementar
Fase 3"), por eso ya no incluye construirlo. Es una **recomendación de
secuencia, no una autorización** — cada paso requiere su propia
aprobación explícita antes de implementarse:

1. Definir y aprobar arquitectura de coexistencia.
2. Definir y aprobar contrato/arquitectura de Search.
3. Extender `packages/core` únicamente si Search/filtros realmente lo requieren.
4. Implementar Server Component de catálogo con datos reales.
5. Implementar Hero + SearchWidget.
6. Implementar filtros + CommuneRibbon.
7. Implementar MapPanel lazy.
8. Implementar valoración, editorial y video.
9. Implementar Metadata/SEO y medir Core Web Vitals.
10. Ejecutar pruebas de coexistencia y rollback antes de cualquier tráfico real.

**Importante: este listado es una recomendación, no una autorización para implementar.**

## Q. Decisiones confirmadas y propuestas pendientes de aprobación

Esta sección distingue dos cosas que antes estaban mezcladas: instrucciones
puntuales que el dueño ya dio de forma explícita y directa (independientes
de que se apruebe o no la arquitectura completa), y puntos que son parte
de la propuesta de este análisis y **siguen en revisión**. Ningún punto de
esta sección, confirmado o propuesto, autoriza por sí solo a implementar
ninguna parte de la nueva homepage.

### Decisiones confirmadas

1. **`TPLPropertyCard.js`** — no se porta ni se reconcilia. Se sigue con el `PropertyCard` de `@tpl/ui` (Fase 2).
2. **Score de oportunidad (`property-analyzer.js`)** — es capa comercial/marketing, separada de la tasación. No se migra ni recalcula en esta etapa.
3. **Imágenes** — se conservan las URLs actuales tal cual; no se migra a Storage ni se inventan rutas nuevas en esta fase.
4. **Ribbon de comunas** — no se convierte todavía en componente permanente de `@tpl/ui`; empieza específico de `apps/publico`, se extrae después solo si demuestra reutilización real.
5. **Mapa** — lazy loading obligatorio, sin cargar Leaflet ni recursos del mapa durante el primer render.
6. **Video** — lazy/interactivo, nunca iframe pesado con autoplay incondicional en el primer render.
7. **Coexistencia — el requisito, no el mecanismo:** es una condición crítica antes de cualquier tráfico real. El *mecanismo concreto* sigue sin definirse (ver más abajo), pero el requisito de que quede técnicamente definido, probado y sin afectar producción antes de implementar la homepage **no está en discusión**.
8. **Bloque 1 — Data Foundation (`packages/core`): aprobado y cerrado.** No es una propuesta pendiente de revisión — ya fue implementado y validado (contrato `Property`, `normalizeProperty()`, `PropertyRepository`/`SupabasePropertyRepository`, smoke test real contra Supabase, typecheck limpio; ver "Estado actual antes de implementar Fase 3"). Distinto del experimento de Fase 3-A, que sí fue revertido por completo — ver nota más abajo.

### Propuestas / Recomendaciones — pendientes de revisión y aprobación

Lo siguiente es parte del análisis y la propuesta de arquitectura de este
documento. Son recomendaciones a evaluar, **no decisiones cerradas**:

- **Extensión de `packages/core` más allá del Bloque 1** — el Data Foundation (contrato `Property`, normalización, repositorio, cliente público) ya está implementado y aprobado, eso no se reabre. Lo que sigue pendiente es si necesita alguna extensión para Search, filtros u otras necesidades futuras de la homepage; cualquier extensión requiere su propia evaluación y aprobación.
- **Arquitectura final del buscador** — la dirección de un único buscador con dos modos ("Buscar parcela" / "Buscar proyecto completo" = terreno+casa+presupuesto, sin CTAs principales compitiendo) fue una indicación del dueño sobre el resultado deseado; su diseño concreto (tabs, toggle u otro patrón) no está definido ni aprobado.
- **Mecanismo de coexistencia** — middleware + Edge Config vs. `vercel routes` vs. otro, y cómo resolver "Root Directory" del proyecto real — abierto, no decidido (ver hallazgo de §O.7).
- **Tratamiento definitivo de filtros client-side vs. server-side** — se documentó como aceptable para una primera implementación, explícitamente **no** como arquitectura definitiva; sigue en revisión, sobre todo si el volumen de propiedades crece.
- **Orden exacto de implementación de Fase 3** — la secuencia de §P es una recomendación de este análisis, no una secuencia aprobada.
