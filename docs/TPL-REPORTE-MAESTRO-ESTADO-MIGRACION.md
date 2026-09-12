# TPL — REPORTE MAESTRO DE ESTADO DE MIGRACIÓN

**Proyecto:** Tu Parcela Lista (parcelalista.cl)
**Fecha del reporte:** 2026-09-12
**Destinatario:** el siguiente agente de IA que continúe la migración
**Repositorio auditado:** `D:\BIOTV MARKETING\NUEVO BIOTV\PÁGINAS WEB\TPL PAGINA MALA\TPL PRUEBA NUEVA`

---

## CÓMO LEER ESTE DOCUMENTO

Este reporte se produjo inspeccionando el código real en disco: listados de directorio, lectura completa de archivos fuente, y lectura de los logs de build/typecheck que dejó la última corrida de `turbo` en el equipo del usuario. **No es un resumen de los documentos de planificación** — los documentos de `docs/` se leyeron, pero cada afirmación sobre el estado actual se contrastó contra el código.

Tres etiquetas de certeza, usadas en todo el documento:

- **VERIFICADO** — leído directamente en el archivo citado, o en un log de ejecución real.
- **NO VERIFICADO** — no se pudo comprobar en esta sesión. Se dice explícitamente por qué.
- **CONTRADICCIÓN** — dos fuentes del propio proyecto se contradicen entre sí.

**Límites reales de esta auditoría (importantes, no omitirlos):**

1. Esta sesión **no tuvo shell en el equipo del usuario** (`device_bash` no está disponible). No se pudo ejecutar `pnpm build`, `tsc`, ni ningún test. Lo que sí se pudo hacer: leer los logs que dejó la última corrida real de turbo (`apps/publico/.turbo/turbo-build.log`, `packages/*/.turbo/turbo-typecheck.log`) — esos logs **sí** son evidencia de ejecución real y se citan textualmente.
2. **No se ejecutó ninguna consulta a Supabase.** Todo lo que se dice de tablas/columnas/RLS proviene de (a) el SQL de `supabase/migrations/`, (b) el código que las consulta, y (c) `docs/TPL-FASE-0-AUDITORIA-CONTRATO.md`, que sí fue verificado contra producción en su momento (2026-09-10) por otra sesión. Los conteos de filas de esa auditoría tienen ya 2 días y pueden haber cambiado.
3. **No se abrió ningún navegador.** Nada de lo que dice "se ve así" está comprobado visualmente; la sección 9 (diferencias visuales) se construye comparando código con código, y lo dice explícitamente.
4. Hay **trabajo concurrente activo**: durante esta misma auditoría (2026-09-12, ~11:17 UTC) se escribieron entradas nuevas en `.turbo/cache/` y en `apps/publico/.turbo/turbo-build.log`, es decir, alguien corrió un build mientras se leía el repositorio. Cualquier archivo citado puede haber cambiado desde entonces. **Re-stagear/releer antes de editar.**

**Convención de estados usada en las matrices:**

| Símbolo | Significado |
|---|---|
| ✅ COMPLETA | existe, funciona y cubre lo que cubría Legacy |
| 🟡 PARCIAL | existe y funciona, pero pierde funcionalidad respecto a Legacy |
| 🔴 FALTA | no existe en la migración |
| ⚠️ FUNCIONA PERO REQUIERE CORRECCIÓN | existe y no falla, pero tiene un defecto real identificado |

Y la distinción que el reporte respeta en todo momento:

- **"existe"** = hay un archivo/ruta.
- **"funciona"** = compila y responde (evidencia: log de build real).
- **"está correctamente migrado"** = hace lo mismo que hacía Legacy, con la misma fuente de datos y el mismo efecto de negocio.

Las tres cosas **no** coinciden en este proyecto. Ese es, de hecho, el hallazgo central.

---

# 1. RESUMEN EJECUTIVO

## 1.1 Estado general

**La migración está aproximadamente en un 30 % del alcance total del Plan Maestro, y en ~60 % del alcance del sitio público de lectura.**

Desglose de dónde sale ese número (el Plan Maestro define 15 fases, 0 a 14):

| Bloque de alcance | Peso | Estado | Aporte |
|---|---|---|---|
| Fase 0 — contrato de datos | doc | Completa | — |
| Fase 1 — infraestructura monorepo | 5 % | ✅ Completa | 5 % |
| Fase 2 — design system `@tpl/ui` | 10 % | ✅ Completa (18 componentes + tokens) | 10 % |
| Fase 3 — Home + catálogo público | 15 % | 🟡 ~70 % (funciona; sin corte de tráfico, sin paridad de conversión) | 10 % |
| Fase 4 — Ficha de parcela | 10 % | 🟡 ~45 % (datos y galería sí; mapa/clima/video/IA/gráfico no) | 4,5 % |
| Fase 5 — resto catálogo público | 10 % | 🟡 ~40 % (cotizador y páginas editoriales sí; `proyecto.html` no) | 4 % |
| Fase 6 — Portal propietario | 5 % | 🟡 ~35 % (solo lectura; sin edición ni fotos) | 1,7 % |
| Fase 7 — Auth staff/partner | 5 % | 🔴 0 % | 0 % |
| Fase 8 — Publicador consolidado | 10 % | 🔴 ~5 % (hay un wizard que termina en WhatsApp, no publica) | 0,5 % |
| Fase 9 — Red Partner | 5 % | 🟡 ~25 % (página de contenido; sin formulario real) | 1,2 % |
| Fase 10 — TPL Business | 8 % | 🔴 0 % (`apps/business` es un placeholder) | 0 % |
| Fase 11 — CRM (15 módulos) | 12 % | 🔴 0 % (`apps/crm` es un placeholder) | 0 % |
| Fase 12 — TPL Studio / AI Gateway | 5 % | 🔴 0 % (`packages/ai` es un placeholder) | 0 % |
| Fase 13 — Marketplace Partner | ~ | 🔴 0 % (no existe ni en Legacy) | 0 % |
| Fase 14 — Optimización | ~ | 🔴 0 % | 0 % |
| **TOTAL** | **100 %** | | **≈ 37 %** |

Ajustando a la baja por lo que el propio Plan Maestro exige para dar una fase por "terminada" (paridad funcional + rollback probado + aprobación del dueño — §18), y considerando que **ninguna ruta sirve tráfico real todavía**, el número honesto es: **~30 % del trabajo total, 0 % del tráfico real migrado.**

> **La frase que resume el estado:** existe un sitio público nuevo, en Next.js 15, que compila, que lee datos reales de Supabase y que nadie usa todavía, porque `www.parcelalista.cl` sigue sirviendo `frontend-v2/` íntegro. Las dos versiones conviven sin interferirse — y también sin converger.

## 1.2 Qué está terminado (VERIFICADO)

1. **Monorepo pnpm + Turborepo.** `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `packages/valuation/*`), `turbo.json` con tareas `build`/`dev`/`lint`/`typecheck`. 12 workspaces.
2. **`@tpl/ui` (Fase 2).** 18 componentes reales + sistema de tokens (`colors.ts`, `typography.ts`, `layout.ts`, `effects.ts`) inyectados como custom properties vía `<TplDesignSystemStyles/>`. Typecheck limpio.
3. **`@tpl/core` — Data Foundation (Bloque 1).** Contrato `Property` (`property.ts`), normalizador único puro (`normalizeProperty.ts`), repositorio (`repository.ts`, 1 consulta + 1 batch de imágenes, nunca N+1), factoría de cliente Supabase público (`supabaseClient.ts`). Typecheck limpio.
4. **`@tpl/core` — Search Core (Bloque 2.1).** `search.ts`: `searchProperties()` (filtrado puro), `rankProperties()` (7 criterios), `searchProjectCombinations()` (combo parcela+casa), `runSearch()`. Motor puro, sin I/O, con validación de límites numéricos.
5. **Resolver único de imágenes** (`apps/publico/lib/images/resolvePropertyImageUrl.ts`) + rewrite `/legacy-image/:path*` en `next.config.mjs`. Resuelve el problema real de las 184 rutas relativas legacy (157 de ellas con espacios en el nombre).
6. **El build pasa.** Evidencia textual de `apps/publico/.turbo/turbo-build.log` (última corrida 2026-09-12): `✓ Compiled successfully in 7.5s`, `✓ Generating static pages (21/21)`, 21 rutas, First Load JS compartido 103 kB.

## 1.3 Qué está parcialmente migrado

- **Home (`/`)** — tiene ribbon de comunas, trust bar, buscador y dos grillas (destacadas / oportunidades). **Pierde**: mapa, "Radar de Mercado TPL", video corporativo, banner de tasador, sección editorial Campo Story, barra de 7 prioridades, paginación "Ver más".
- **Catálogo (`/propiedades`)** — buscador real con 9 filtros y 7 criterios de orden, mejor que el legacy en filtrado. **Pierde**: mapa, Radar, paginación.
- **Ficha (`/propiedades/[codigo]`)** — galería, 12 características, 3 valores de tasación, JSON-LD, relacionadas. **Pierde**: mapa Leaflet, clima, video, gráfico de mercado (Chart.js), buscador IA, ruta por carretera, distancias a ciudades/servicios, "veredicto del experto", lightbox de galería, y el botón "Hacer oferta".
- **Cotizador (`/cotizador`)** — wizard completo con catálogo de casas y cálculo. **Pierde**: el correo de resumen (Edge Function `enviar-resumen-cotizacion`) y la creación de oportunidad real en el CRM.
- **Portal propietario (`/mi-parcela/[token]`)** — lee el resumen por token. **Pierde**: toda la edición, la subida de fotos y el recálculo de tasación.
- **Publicar (`/publicar`)** — wizard de 4 pasos con mapa. **Pierde**: publicar. Literalmente: termina abriendo WhatsApp.
- **Red Partner (`/red-partner`)** — página de contenido. **Pierde**: el formulario de postulación de 40+ campos.

## 1.4 Qué no ha sido migrado en absoluto

- **CRM** (`frontend-v2/plataforma/crm-tpl-v1/`, 15 módulos) → `apps/crm` es una página placeholder de 15 líneas.
- **TPL Business** (`plataforma/tpl-business-v2/`, 10 módulos) → `apps/business` es una página placeholder de 15 líneas.
- **TPL Studio / AI Gateway** → `packages/ai/src/index.ts` = `export const AI_GATEWAY_PLACEHOLDER = true;`
- **Motores de tasación** → `packages/valuation/{land,house,shared}/src/index.ts` = tres placeholders. Los motores reales siguen siendo `frontend-v2/js/core/valuation-engine.js` y `plataforma/publicar/tpl-house-engine.js`.
- **Automatizaciones** → `packages/automations` = placeholder.
- **Tasador standalone** (`plataforma/tasador/`), **Informe de valores** (`plataforma/informe-valores/`), **`proyecto.html`**, **publicador v1 y v2**, **portal propietario de plataforma**.
- **Autenticación real** (Supabase Auth + middleware) — no existe ningún `middleware.ts` en `apps/publico` (se revirtió deliberadamente; ver §15).
- **Pagos** — reserva 1 %, informe premium, suscripciones, contrataciones: nada de esto existe en el sitio nuevo.

## 1.5 Bloqueadores actuales

| # | Bloqueador | Por qué bloquea | Evidencia |
|---|---|---|---|
| B1 | **Mecanismo de coexistencia aprobado pero NO implementado** | Sin él ninguna ruta puede recibir tráfico real. La decisión (Opción D: subdominio de prueba + `vercel routes` para el corte) está aprobada desde 2026-09-10 y explícitamente sin autorización de implementación. | `docs/TPL-FASE-3-COEXISTENCIA-AUDITORIA.md`, sección de cierre |
| B2 | **`tpl-publico-preview` no tiene dominio propio** | Solo URLs `*.vercel.app` por deployment. No hay subdominio con `noindex`, no hay `NEXT_PUBLIC_SITE_URL` definido en el proyecto Vercel → todos los canonical/OG/sitemap caen a `http://localhost:3000`. | `apps/publico/lib/seo/site.ts` línea 12; auditoría de coexistencia §2 (`vercel env ls` → 0 variables) |
| B3 | **La Home y el sitemap son estáticos sin revalidación** | Una parcela nueva no aparece en `/` ni en `/sitemap.xml` hasta un redeploy. | `turbo-build.log`: `○ /` y `○ /sitemap.xml` marcados **(Static)**; `grep -rn "revalidate"` en `apps/publico` → 0 resultados |
| B4 | **Cero escrituras de negocio en el sitio nuevo** | Ningún lead, visita, postulación ni publicación llega a Supabase. Todo termina en un enlace `wa.me`. Migrar tráfico hoy significaría apagar la captación. | `grep -rn "\.rpc(\|\.insert(\|functions.invoke"` en `apps/publico` → solo 3 resultados, todos en `lib/propietario/actions.ts` (lectura + un update que nadie llama) |
| B5 | **Prerequisito crítico A sigue abierto** (`veo-generar-video`, `verify_jwt:false`, sin autorización) | Bloquea Fase 12 por completo según el Plan Maestro. El directorio `supabase/functions/veo-generar-video/` sigue existiendo. | Plan Maestro §14; listado de `supabase/functions/` |
| B6 | **Prerequisito crítico B sigue abierto** (`crear-pago-contratacion` / `flow-webhook-contratacion` escritas y no desplegadas) | Bloquea Fase 8 (publicador). Las carpetas existen en `supabase/functions/`. | Plan Maestro §14; listado de `supabase/functions/` |

## 1.6 Riesgos técnicos importantes

| # | Riesgo | Severidad |
|---|---|---|
| R1 | **Segunda fuente de verdad ya creada**: `packages/core/src/cotizador/catalog.ts` es una copia manual del catálogo de casas de `frontend-v2/casas.js` y de las fundaciones/obras de `frontend-v2/extras.js`. **Ya hay divergencia medible** (ver §14.1). Esto viola explícitamente la regla del Plan Maestro §16 y de la especificación de Search ("`casas.js` se mantiene intacto — no se toca ni se migra"). | **Alta** |
| R2 | **El sitio nuevo depende de que el sitio viejo siga vivo.** El rewrite `/legacy-image/:path*` apunta a `https://www.parcelalista.cl/image/:path*`. El 96,8 % de las fotos del catálogo se sirven así. Si `frontend-v2` se retira o cambia de Root Directory, el sitio nuevo se queda sin fotos. | **Alta** |
| R3 | **Consultas redundantes al catálogo completo.** Una visita a `/propiedades` dispara 3 llamadas independientes a `PropertyRepository.list()` (cada una = 1 SELECT a `tpl_propiedades` + 1 batch a `tpl_propiedad_imagenes`) = 6 round-trips. Una visita a `/propiedades/[codigo]` dispara ~4. Ninguna está cacheada (`React.cache()` solo envuelve `getPropertyDetail`). | **Media-alta** |
| R4 | **Hay tests escritos y ningún modo de correrlos.** 8 archivos `*.test.ts` + 2 `*.smoke.ts`, sin Vitest/Jest, sin script `test` en ningún `package.json`, sin tarea `test` en `turbo.json`. Se ejecutan a mano compilando con `tsc` a un directorio temporal. En la práctica: nadie los corre. | **Media-alta** |
| R5 | **No hay configuración de ESLint en ninguna parte del monorepo**, pero `turbo.json` define una tarea `lint` y cada app tiene `"lint": "next lint"`. `packages/config/` contiene solo `tsconfig.base.json`. | **Media** |
| R6 | **Dos migraciones SQL con el mismo prefijo de versión**: `20260910020000_tpl_eliminar_tasador_v3_preview_v1.sql` y `20260910020000_tpl_plan_studio_audiovisual_v1.sql`. El CLI de Supabase ordena por prefijo; dos iguales es ambigüedad real. | **Media** |
| R7 | **Deriva de normalización de tasación.** `@tpl/core/normalizeProperty.ts` lee `recommendedValue` **solo** de `metadata.valor_tpl_recomendado`, mientras que `frontend-v2/js/parcela.js:valoracionGuardada()` acepta además `valor_tpl_tasador_ajustado` y `valor_tpl_tasador`. Una parcela cuya tasación se guardó con una clave histórica **muestra tasación en Legacy y no la muestra en el sitio nuevo**. | **Media** |
| R8 | **`vercel.preview.json` no es un archivo que Vercel lea.** Vercel solo lee `vercel.json`. Ese archivo (con el bloque `builds` que explica el warning del log de deployment citado en la auditoría de coexistencia) solo surte efecto si alguien lo copia a mano sobre `vercel.json` antes de desplegar. No hay script que lo haga. | **Media** |
| R9 | **`vercel.json` de la raíz es configuración muerta.** El Root Directory de producción es `frontend-v2`, así que el `vercel.json` efectivo es `frontend-v2/vercel.json`. El de la raíz (con HSTS, CSP, headers de plataforma) no se aplica a nada. Además su CSP —igual que la del efectivo— va como `Content-Security-Policy-Report-Only`, es decir **no bloquea nada**. | **Media** |
| R10 | **Ninguna ruta nueva tiene `revalidate`/ISR**, contra lo que el Plan Maestro §5 exige para Fase 3 ("SSG + ISR"). | **Media** |

## 1.7 Próximo objetivo recomendado

**Cerrar la brecha de escritura antes de mover un solo visitante.** El sitio nuevo hoy es un catálogo de solo lectura, muy bien construido, que no captura nada. Mover tráfico en ese estado convierte una mejora técnica en una caída de conversión medible.

El orden concreto está en §18. La primera tarea única está en la última sección del documento.

---

# 2. MAPA LEGACY → MODERNO

Regla aplicada: **no se marca nada como migrado por parecido de nombre.** Cada fila se verificó abriendo ambos archivos.

## 2.1 Páginas públicas

| Legacy | Equivalente moderno | Estado | % | Observaciones |
|---|---|---|---|---|
| `frontend-v2/index.html` + `js/index.js` (5.336 líneas de JS en 13 archivos) | `apps/publico/app/page.tsx` + `components/home/*` + `components/search/*` | 🟡 PARCIAL | 55 % | La versión nueva sirve ribbon+trust bar+buscador+2 grillas. Faltan: mapa, Radar de Mercado, video, banner tasador, Campo Story, barra de prioridades, paginación. **VERIFICADO** leyendo ambos archivos completos. |
| `frontend-v2/parcela.html` + `js/parcela.js` (75.794 bytes, 33 funciones) | `apps/publico/app/propiedades/[codigo]/page.tsx` | 🟡 PARCIAL | 45 % | Detalle en §2.4. |
| — (no existe listado propio en Legacy; el catálogo vive dentro de `index.html`) | `apps/publico/app/propiedades/page.tsx` | ✅ NUEVO Y CORRECTO | — | **Ruta nueva, sin equivalente legacy.** Es una mejora real: URL propia, indexable, con `?comuna=` y metadata por comuna. |
| `frontend-v2/cotizador.html` + `js/cotizador.js` (51.863 bytes) | `apps/publico/app/cotizador/page.tsx` + `components/cotizador/CotizadorWizard.tsx` (33.615 bytes) | 🟡 PARCIAL | 60 % | Cálculo migrado a `@tpl/core/cotizador`. **Pierde** el correo de resumen y la creación de oportunidad. **Pierde 11 de 16 obras adicionales** (§14.1). |
| `frontend-v2/proyecto.html` + `js/proyecto.js` (30.226 bytes) | — | 🔴 FALTA | 0 % | No hay ninguna ruta `/proyecto` en `apps/publico`. Confirmado contra el listado de 21 rutas del build. |
| `frontend-v2/mi-parcela.html` + `js/mi-parcela.js` | `apps/publico/app/mi-parcela/[token]/page.tsx` | 🟡 PARCIAL | 35 % | §2.5. |
| `frontend-v2/campo-chileno.html` (31.326 bytes) | `apps/publico/app/campo-chileno/page.tsx` (18.681 bytes) | 🟡 PARCIAL | ~70 % | Contenido reescrito, no portado 1:1. **NO VERIFICADO** párrafo por párrafo. |
| `frontend-v2/como-comprar.html` (6.447 bytes) | `apps/publico/app/como-comprar/page.tsx` (7.880 bytes) | ✅ COMPLETA | 95 % | Página editorial estática. |
| `frontend-v2/comenzar-proyecto.html` | `apps/publico/app/comenzar-proyecto/page.tsx` | 🟡 PARCIAL | 60 % | La moderna es una página de confirmación + WhatsApp con `noindex`. Legacy usaba `tpl_crear_proyecto_desde_cotizador_v1` (migración `20260901140000`). **La moderna no llama a nada.** |
| `frontend-v2/terminos.html` | `apps/publico/app/terminos/page.tsx` | ✅ COMPLETA | 95 % | |
| `frontend-v2/politica-privacidad.html` | `apps/publico/app/privacidad/page.tsx` | ⚠️ REQUIERE CORRECCIÓN | 90 % | **La URL cambió** (`/politica-privacidad.html` → `/privacidad`) y **no hay ningún redirect 301 documentado**, contra el Plan Maestro §13 ("Toda URL que cambie de forma lleva un 301 explícito"). |
| `frontend-v2/red-partner-v2/` | `apps/publico/app/red-partner/page.tsx` | 🟡 PARCIAL | 25 % | Solo contenido + CTA WhatsApp. El propio archivo lo documenta: *"El legacy real es un formulario de 40+ campos [...] eso queda documentado como posible bloque futuro, no se porta acá."* |
| `frontend-v2/plataforma/publicar/` (v1) | — | 🔴 FALTA | 0 % | |
| `frontend-v2/plataforma/publicar-v2/` | `apps/publico/app/publicar/page.tsx` + `components/publicar/PublishWizard.tsx` | 🟡 PARCIAL | 15 % | El wizard nuevo tiene 4 pasos; el legacy tiene ~40 campos, multimedia, IA y pago Flow. **No publica nada**: el paso final abre WhatsApp. Documentado en el propio código. |
| `frontend-v2/plataforma/tasador/` | — | 🔴 FALTA | 0 % | Plan Maestro §6 lo clasifica "MANTENER TEMPORALMENTE". |
| `frontend-v2/plataforma/informe-valores/` | — | 🔴 FALTA | 0 % | |
| `frontend-v2/plataforma/propietario/` | — | 🔴 FALTA | 0 % | No confundir con `/mi-parcela/[token]`, que corresponde a `mi-parcela.html`. |
| `frontend-v2/plataforma/crm-tpl-v1/` (15 módulos) | `apps/crm` | 🔴 FALTA | 0 % | `apps/crm/app/page.tsx` es un `<InfraestructuraPlaceholder app="crm"/>`. |
| `frontend-v2/plataforma/tpl-business-v2/` (10 módulos) | `apps/business` | 🔴 FALTA | 0 % | Idem. |
| — | `apps/publico/app/design-system/` | ✅ NUEVA (interna) | — | Vitrina de `@tpl/ui`. Estática. **No está bloqueada en `robots.ts`** (ver §12, E-08). |
| — | `apps/publico/app/search-demo/` | ✅ NUEVA (interna) | — | Bloqueada correctamente en `robots.ts`. |

## 2.2 Funcionalidades transversales

| Legacy | Equivalente moderno | Estado | % | Observaciones |
|---|---|---|---|---|
| Búsqueda "por comuna" (`<select>`) | `SearchFiltersPanel` + `SearchFilters.commune` | ✅ COMPLETA | 100 % | Mejorada: la lista sale del catálogo real (`listAvailableCommunes()`). |
| Búsqueda "Cerca de ti" (geolocalización) | `SearchWidget` + `filters.coordinates` + `radiusKm` | ✅ COMPLETA | 110 % | Mejorada: el legacy no tenía radio; el nuevo ofrece 5/10/25/50 km. |
| Combo de presupuesto terreno+casa | `runSearch({intent:"project"})` + `searchProjectCombinations()` | ⚠️ CÓDIGO COMPLETO, FUNCIÓN APAGADA | 80 % | El motor está portado 1:1 (margen ±$5.000.000, máx 6, sin repetir). Pero `SearchResults.tsx` recibe `projectModeUnavailable={form.intent === "project"}` y muestra *"Búsqueda de proyectos disponible próximamente"*. Falta solo alimentarlo con casas (§17, P1-04). |
| Barra de 7 prioridades (cercanas/pago/naturales/servicios/oportunidad/económicas/1ha+) | `RANKING_OPTIONS` en `searchState.ts` | ✅ COMPLETA | 100 % | Los 7 criterios están, como `<select>` en vez de fila de botones (decisión de diseño documentada). |
| Filtro de precio / superficie | `priceMin/Max`, `landAreaMin/Max` | ✅ NUEVA | — | **No existía en Legacy** (allí el precio solo participaba en el orden). Mejora real. |
| Mapa Leaflet del catálogo | — | 🔴 FALTA | 0 % | Leaflet sí está instalado (`leaflet@^1.9.4`) pero solo se usa en `ParcelMapPicker` del wizard de publicación. |
| "Radar de Mercado TPL" (empty state comercial → WhatsApp) | — | 🔴 FALTA | 0 % | El empty state nuevo dice "Intenta ampliar el rango de precio". Se pierde una conversión de negocio explícita. |
| Paginación "Ver más" | — | 🔴 FALTA | 0 % | `SearchResults.tsx` renderiza `viewModel.items.map(...)` completo. Con 33 propiedades no duele; con 300 sí. |
| Normalizador único `TPLPropertyView.normalizarPropiedad` | `@tpl/core/normalizeProperty()` | ✅ COMPLETA | 95 % | Ver R7: precedencia de `recommendedValue` más estrecha. |
| Cliente Supabase (3 nombres globales) | `createSupabasePublicClient()` | ✅ COMPLETA | 100 % | Resuelve el hallazgo de Plan Maestro §1 (`window.supabaseClient`/`tplCoreSupabase`/`tplSupabase`). |
| Motor de tasación (`valuation-engine.js`) | `packages/valuation/land` | 🔴 FALTA | 0 % | Placeholder. |
| `property-analyzer.js` (score de oportunidad) | — | 🔴 NO SE MIGRA (decisión tomada) | — | Decisión del dueño 2026-09-10: es capa comercial, fuera de alcance. **No es un olvido.** |
| `tpl-market-intelligence.js` (9 comunas hardcodeadas) | — | 🔴 NO SE MIGRA (decisión tomada) | — | Clasificado como "eliminar/replantear". |
| SEO dinámico `tpl-seo.js` | Metadata API de Next | ✅ COMPLETA | 90 % | Ver §11 para la brecha real. |
| GTM `GTM-WK4M33H4` | `app/layout.tsx` con `next/script` | ✅ COMPLETA | 100 % | Mismo contenedor, verificado en ambos archivos. |
| `analytics-tracker.js` → `tpl_web_analytics` | — | 🔴 FALTA | 0 % | §11. |
| Lead de visita → `saveLead()` → `tpl_registrar_lead_v1` | `ScheduleVisitDialog` → WhatsApp | 🔴 FALTA (con matiz) | 0 % | §10, L-01. El legacy **también está roto** en producción. |
| Oportunidad del cotizador → `createPublicOpportunity()` | — | 🔴 FALTA | 0 % | §10, L-02. Esta sí funciona en Legacy. |
| Correo de resumen de cotización (Edge `enviar-resumen-cotizacion`) | — | 🔴 FALTA | 0 % | |
| Pago de reserva 1 % (Flow) | — | 🔴 FALTA | 0 % | |
| Informe premium pagado | — | 🔴 FALTA | 0 % | |
| Suscripciones / planes | — | 🔴 FALTA | 0 % | |
| Autenticación staff/partner | — | 🔴 FALTA | 0 % | |
| Edge Functions (28 carpetas) | — | ➖ NO SE MIGRAN (por diseño) | — | Plan Maestro §6: "NO TOCAR". Next.js las consumirá igual. **Hoy `apps/publico` no invoca ninguna.** |

## 2.3 Comparación detallada — Home

| Elemento de `index.html` | ¿En `apps/publico/app/page.tsx`? | Nota |
|---|---|---|
| GTM inline (antes del `<meta charset>`) | Sí, vía `next/script` `afterInteractive` | Mejor práctica |
| JSON-LD `RealEstateAgent` + `WebSite`/`SearchAction` | **No** | 🔴 Se perdió. La Home nueva no emite ningún JSON-LD. El legacy tiene 2 bloques (líneas 57 y 71 de `index.html`). |
| Hero + 2 métodos de búsqueda | Sí (`SearchWidgetServer`) | |
| Combo de presupuesto | UI presente, función apagada | |
| Commune ribbon | Sí (`CommuneRibbon`), como `<Link>` navegables | **Mejora**: cada comuna es URL indexable |
| Trust bar (3 cifras) | Sí (`TrustBar`), server-side | **Mejora**: sin `MutationObserver`. Diferencia intencional documentada: sin el piso artificial `Math.max(regiones,3)` |
| Video corporativo (iframe YouTube autoplay) | **No** | 🔴 Perdido |
| Barra de prioridades | Como `<select>` dentro del buscador | |
| Botón de mapa + panel Leaflet | **No** | 🔴 Perdido |
| Skeleton de carga | Sí (`LoadingState` + `Skeleton`) | |
| Paginación "Ver más" | **No** | 🔴 Perdido |
| Sección "Parcelas con casa" | **No** (hay filtro `propertyType=casa`) | 🟡 Reemplazado por filtro |
| Empty state "Radar de Mercado TPL" | **No** | 🔴 Perdido |
| Banner de tasador ("Tasar mi propiedad") | **No** | 🔴 Perdido |
| Sección editorial "Campo Story" | **No** (existe `/campo-chileno` en el nav) | 🟡 Degradado a link de nav |
| Grilla "Destacadas" | **Sí — NUEVA** | No existe como sección propia en Legacy |
| Grilla "Oportunidades TPL" | **Sí — NUEVA** | Idem |

## 2.4 Comparación detallada — Ficha de parcela

| Elemento de `parcela.html` / `js/parcela.js` | ¿En `/propiedades/[codigo]`? | Nota |
|---|---|---|
| Galería (5 imágenes + lightbox `#gallery-dialog`) | Galería sí (`next/image` + miniaturas). **Lightbox no.** | 🟡 |
| Badge de clima en el hero (`#v3-weather-badge`) | **No** | 🔴 `pintarClima()` no portado |
| Widget de clima completo (`#v3-weather-widget`, bioclima por comuna) | **No** | 🔴 |
| Distancias a ciudades (`pintarDistancias`) | **No** | 🔴 |
| Distancias a servicios (`#v3-distance-services`) | **No** | 🔴 |
| Video de la propiedad (`tpl_propiedad_videos`, `pintarVideo()`) | **No** | 🔴 `repository.ts` pasa `video: null` **siempre** y lo documenta como alcance pendiente |
| Características (agua/luz/rol/naturaleza) | Sí — **12 características**, más que el legacy | ✅ Mejora |
| "Virtudes" / tags (`pintarVirtudes`) | **No** | 🔴 |
| 3 valores de tasación | Sí (`Valor TPL Técnico` / `Promedio Comunal` / `Recomendado`) | ✅ — pero ver R7 |
| Score de valoración (`#v3-valuation-score`) | **No** | ➖ Decisión tomada (no se migra) |
| Comparación comunal (`#v3-communal-comparison`) | **No** | 🔴 |
| "Veredicto del Experto TPL" (`pintarEvaluacionPrecio`) | **No** | 🔴 |
| Mapa CRM Leaflet (`initCRMMap`, `#v3-crm-map`) | **No** — solo `PropertyLocationCard` con link a Google Maps | 🟡 Degradado |
| Ruta por carretera (`#btn-route-driving`, OSRM) | **No** | 🔴 |
| Gráfico de mercado Chart.js (`renderMarketChart`) | **No** | 🔴 |
| Estadísticas `$/m²` y crecimiento | **No** | 🔴 |
| CTA "Agendar visita" (dialog fecha+nombre+tel → `saveLead`) | Dialog nombre+tel → WhatsApp. **Sin fecha, sin backend.** | 🟡 |
| CTA "Cotizar casa" → `cotizador.html?parcelaId=` | Sí → `/cotizador?parcelaId=` | ✅ |
| CTA "Hacer oferta" | **No** | 🔴 |
| CTA WhatsApp | Sí | ✅ |
| Buscador IA del final (`initBuscadorIA`, Edge `gemini-buscador-parcelas`) | **No** — reemplazado por "Propiedades relacionadas" | 🟡 |
| JSON-LD `RealEstateListing` (`tpl-seo.js`) | Sí, pero como **`Product`** | ⚠️ Cambio de tipo de schema. Documentado como decisión conservadora, pero es una regresión de especificidad semántica frente al legacy. |

## 2.5 Comparación detallada — Portal del propietario

| Elemento de `mi-parcela.html` | ¿En `/mi-parcela/[token]`? | Nota |
|---|---|---|
| Lectura del resumen por token (RPC `tpl_propietario_resumen_por_token_v1`) | Sí | ✅ |
| Embudo de tasación con IA (`#funnel-welcome`, `#ai-thinking-box`) | **No** | 🔴 |
| Valor TPL + valor de venta apuro | Sí (labels) | ✅ |
| Recomendación de estrategia (`#strategy-recommendation`) | **No** | 🔴 |
| "Radar del propietario" (demanda en la comuna, `#v3-owner-radar`) | **No** | 🔴 |
| Simulador de mejoras (agua/rol → impacto en valor, `#sim-*`) | **No** | 🔴 |
| Línea de tiempo (`#timeline`) | **No** | 🔴 |
| Mapa (`#mi-parcela-mapa`) | **No** | 🔴 |
| **Edición de la ficha** (RPC `tpl_propietario_actualizar_por_token_v1`) | **No** — la función `updateOwnerProperty()` existe en `lib/propietario/actions.ts` pero **ningún componente la llama** | 🔴 **Código muerto listo para usarse** |
| **Subida de fotos** (`uploadOwnerPropertyPhoto`) | **No** | 🔴 |
| Recálculo de tasación (`processOwnerValuationRecalculation`) | **No** | 🔴 |

---

# 3. RUTAS ACTUALES

Fuente: `apps/publico/.turbo/turbo-build.log` (corrida real del 2026-09-12) + lectura de cada archivo. `○` = prerenderizado estático; `ƒ` = server-rendered on demand.

| Ruta | Archivo responsable | Render | ¿Funciona? | Errores / defectos | ¿Reemplaza ruta Legacy? | Dependencias |
|---|---|---|---|---|---|---|
| `/` | `app/page.tsx` | ○ Static · 3,66 kB / 117 kB | Sí (build OK) | **Datos congelados en build time** (sin `revalidate`). Sin JSON-LD. | `frontend-v2/index.html` (parcial) | `getFeaturedProperties`, `getOpportunityProperties`, `getHomeCatalogSummary`, `SearchWidgetServer`, `@tpl/ui` |
| `/propiedades` | `app/propiedades/page.tsx` | ƒ Dynamic · 388 B / 113 kB | Sí | 3× `repository.list()` por request (6 round-trips a Supabase) | Ninguna — **ruta nueva** | `SearchWidgetServer` → `listAvailableCommunes` + `listAvailableNaturalFeatures` + `runPropertySearch` |
| `/propiedades/[codigo]` | `app/propiedades/[codigo]/page.tsx` | ƒ Dynamic · 11 kB / 114 kB | Sí | Sin `generateStaticParams`, sin ISR. `getRelatedProperties` trae el catálogo completo. | `parcela.html?id=` (parcial) | `getPropertyDetail` (con `React.cache`), `getRelatedProperties`, `PropertyGallery`, `PropertyLocationCard`, `ScheduleVisitDialog` |
| `/cotizador` | `app/cotizador/page.tsx` | ƒ Dynamic · 9,4 kB / 113 kB | Sí | **Serializa `Property[]` completo al cliente** como `initialProperties`. Sin backend. | `cotizador.html` (parcial) | `createDefaultRepository().list()`, `CotizadorWizard`, `@tpl/core/cotizador` |
| `/publicar` | `app/publicar/page.tsx` | ○ Static · 11,2 kB / 115 kB | Sí | **No publica**: termina en WhatsApp | `plataforma/publicar-v2/` (nominalmente) | `PublishWizard`, `ParcelMapPicker` (leaflet, `ssr:false`), `getComunaPriceReference` |
| `/mi-parcela/[token]` | `app/mi-parcela/[token]/page.tsx` | ƒ Dynamic · 2,32 kB / 106 kB | Sí | Solo lectura. `noindex` correcto + bloqueo en `robots.ts`. 42 colores hex inline. | `mi-parcela.html` (parcial) | `getOwnerPortalViewModel` → RPC `tpl_propietario_resumen_por_token_v1` |
| `/campo-chileno` | `app/campo-chileno/page.tsx` | ○ Static · 2,32 kB / 106 kB | Sí | 35 colores hex inline | `campo-chileno.html` | `@tpl/ui` |
| `/como-comprar` | `app/como-comprar/page.tsx` | ○ Static | Sí | 7 hex inline | `como-comprar.html` | `@tpl/ui` |
| `/comenzar-proyecto` | `app/comenzar-proyecto/page.tsx` | ƒ Dynamic | Sí | `noindex,nofollow`. No llama a ninguna RPC (el legacy sí). | `comenzar-proyecto.html` | `@tpl/ui` |
| `/red-partner` | `app/red-partner/page.tsx` | ○ Static · 3,79 kB | Sí | Sin formulario real | `red-partner-v2/` (parcial) | `PartnerApplicationDialog` |
| `/terminos` | `app/terminos/page.tsx` | ○ Static | Sí | — | `terminos.html` | |
| `/privacidad` | `app/privacidad/page.tsx` | ○ Static | Sí | **URL cambiada sin 301** | `politica-privacidad.html` | |
| `/design-system` | `app/design-system/page.tsx` | ○ Static · 4,74 kB | Sí | **Indexable** — no está en el `disallow` de `robots.ts` | Ninguna (interna) | `@tpl/ui` |
| `/search-demo` | `app/search-demo/page.tsx` | ○ Static · 388 B | Sí | Bloqueada en robots. Datos congelados en build. | Ninguna (interna) | `SearchWidgetServer` |
| `/robots.txt` | `app/robots.ts` | ○ Static | Sí | Usa `SITE_URL` → hoy `localhost:3000` | `frontend-v2/robots.txt` | `lib/seo/site.ts` |
| `/sitemap.xml` | `app/sitemap.ts` | ○ Static | Sí | **Congelado en build time** + URLs a `localhost:3000` | `frontend-v2/sitemap.xml` | `searchProperties()` |
| `/_not-found` | `app/not-found.tsx` | ○ Static | Sí | — | — | `@tpl/ui` |
| (error boundary) | `app/error.tsx` | client | Sí | — | — | `@tpl/ui` |
| `/icon.png`, `/apple-icon.png`, `/opengraph-image.png`, `/twitter-image.png` | assets en `app/` | ○ Static | Sí | `opengraph-image.png` pesa **632.958 bytes** — grande para un OG | — | — |

**Rutas de `apps/business` y `apps/crm`:** cada una tiene solo `/` con un placeholder. No están en el pipeline de despliegue de preview (`vercel.preview.json` solo construye `apps/publico/package.json`).

**Nota sobre `opengraph-image.png`**: existe como asset a nivel de `app/`, lo que significa que Next lo expone automáticamente como imagen OG por defecto. Sin embargo `app/layout.tsx` documenta *"Sin imagen OG: no existe todavía un asset raster (1200×630)"*. **CONTRADICCIÓN** entre el comentario y el archivo presente — hay que verificar cuál gana en el HTML renderizado. **NO VERIFICADO** (requiere abrir el sitio).

---

# 4. COMPONENTES Y ARQUITECTURA

## 4.1 `packages/ui` (`@tpl/ui`) — 18 componentes

| Componente | Archivo | Clase |
|---|---|---|
| `Button` (variantes: navy, secondary, ghost, whatsapp, gold…) | `components/Button/` | **A** nuevo y correcto |
| `Header` + `MobileMenu` | `components/Header/` | **B** migrado desde `tpl-shell.js` |
| `Footer` | `components/Footer/` | **B** migrado |
| `Container`, `Section`, `Stack`, `Grid` | primitivos de layout | **A** |
| `Card` (+ `Card.Media`/`Body`/`Footer`) | `components/Card/` | **A** |
| `PropertyImage` | `components/Media/` | **A** — con `onError` → placeholder |
| `Badge` | `components/Badge/` | **A** |
| `PropertyData`: `Price`, `Area`, `PropertyLocation`, `PropertyMeta`, `Stat` | `components/PropertyData/` | **A** |
| `PropertyCard` | `components/PropertyCard/` | **A** — resuelve el problema de accesibilidad del legacy (`<article onclick>` → link real) |
| `Input`, `Select`, `SearchBar` | `components/{Input,Select,SearchBar}/` | **A** |
| `FilterChip`, `FilterGroup` | `components/Filter/` | **A** |
| `EmptyState`, `ErrorState`, `LoadingState`, `Skeleton` | `components/States/` | **A** |
| `InfraestructuraPlaceholder` | `src/` | **D** temporal — "prueba histórica de que el workspace enlaza bien". Usado por `apps/business` y `apps/crm`. |

**Tokens:** `tokens/colors.ts`, `typography.ts`, `layout.ts`, `effects.ts` → `tplTokensCss`, inyectado una vez por `<TplDesignSystemStyles/>`.
**Estilos:** cada componente trae un `*.css.ts` que exporta un **string de CSS plano** (no es vanilla-extract — no hay esa dependencia en `package.json`). `GlobalStyles.tsx` los concatena.

**Faltan según el propio README de `@tpl/ui`** (sección "Roadmap"): `Tabs` (lo necesita el toggle de dos modos del buscador), `Alert`/toast inline. **Pendiente explícito:** auditoría de contraste de los colores de marca.

## 4.2 `apps/publico` — componentes

| Componente | Archivo | Clase | Nota |
|---|---|---|---|
| `SiteChrome` | `components/layout/SiteChrome.tsx` | **A** | `"use client"` solo por `usePathname()` |
| `siteNav` | `components/layout/siteNav.ts` | **A** | ⚠️ **No incluye link a TPL Business**, que sí está en el nav legacy |
| `SearchWidget` | `components/search/SearchWidget.tsx` | **A** | Client Component, único límite de interactividad |
| `SearchWidgetServer` | `components/search/SearchWidgetServer.tsx` | **A** | ⚠️ hace 2-3 `repository.list()` |
| `SearchFiltersPanel`, `SearchSummary`, `SearchResults` | `components/search/` | **A** | |
| `SearchResultCard` | `components/search/SearchResultCard.tsx` | **A** | Adaptador `PropertyCardViewModel` → `PropertyCardProps` |
| `SearchProjectCombinationCard` | mismo archivo | **D** temporal | Se compone a mano porque no existe `ProjectCard` en `@tpl/ui` |
| `searchState.ts` | `components/search/` | **A** | Lógica pura, testeable |
| `CommuneRibbon`, `TrustBar` | `components/home/` | **B** migrados | Server Components |
| `PropertyGallery` | `components/property/` | **A** | Usa `next/image` |
| `PropertyLocationCard` | `components/property/` | **D** temporal | Sustituto del mapa Leaflet. Link a Google Maps. |
| `RelatedProperties` | `components/property/` | **A** | |
| `ScheduleVisitDialog` | `components/property/` | ⚠️ **D** | `<dialog>` nativo. **No persiste nada.** |
| `PartnerApplicationDialog` | `components/red-partner/` | ⚠️ **D** | Idem |
| `PublishWizard` | `components/publicar/` | ⚠️ **D** | Idem |
| `ParcelMapPicker` | `components/publicar/` | **A** | Leaflet con `dynamic({ssr:false})` — patrón correcto |
| `CotizadorWizard` | `components/cotizador/` | ⚠️ **C/D** | 33.615 bytes, **74 colores hex inline** — es el archivo más alejado del design system de todo el repo |

## 4.3 Servicios, hooks, normalizadores, tipos

| Pieza | Ubicación | Clase |
|---|---|---|
| `normalizeProperty()` | `@tpl/core/normalizeProperty.ts` | **A/B** — reemplaza `TPLPropertyView.normalizarPropiedad` |
| `SupabasePropertyRepository` | `@tpl/core/repository.ts` | **A** |
| `createSupabasePublicClient()` | `@tpl/core/supabaseClient.ts` | **A** |
| `searchProperties` / `rankProperties` / `runSearch` / `searchProjectCombinations` | `@tpl/core/search.ts` | **A/B** — port de `js/index.js:getResults()` y `comboCandidates()` |
| `calculateProjectBudget()` | `@tpl/core/cotizador/calculator.ts` | **B** — port de `js/cotizador.js` |
| `HOUSE_MODELS`, `FOUNDATION_OPTIONS`, `ADDITIONAL_WORKS`, `CONSTRUCTION_SYSTEM_RATES` | `@tpl/core/cotizador/catalog.ts` | 🔴 **C DUPLICADO** — copia de `casas.js` + `extras.js` |
| `searchProperties()` (adaptador) | `apps/publico/lib/search/supabaseSearchRepository.ts` | **A** |
| `adaptCasasToHouses()` | `apps/publico/lib/search/houseAdapter.ts` | ⚠️ **E POSIBLEMENTE OBSOLETO** — nadie lo llama; `HOUSE_MODELS` ya vive dentro de `@tpl/core` |
| `toSearchViewModel` / `toPropertyCardViewModel` / `toPropertyDetailViewModel` / `summarizeCatalogForHome` | `apps/publico/lib/search/presentation.ts` | **A** |
| `resolvePropertyImageUrl` / `resolvePropertyGallery` / `resolvePropertyCoverImage` | `apps/publico/lib/images/` | **A** |
| Server Actions de búsqueda | `apps/publico/lib/search/actions.ts` | **A** |
| `getOwnerPortalViewModel` | `apps/publico/lib/propietario/actions.ts` | **A** |
| `getOwnerPropertySummary` | mismo archivo | 🔴 **E OBSOLETO** — nadie lo llama; duplica la misma RPC que `getOwnerPortalViewModel` |
| `updateOwnerProperty` | mismo archivo | 🔴 **E CÓDIGO MUERTO** — nadie lo llama, pero es la única puerta a la escritura del propietario |
| `getComunaPriceReference` | `apps/publico/lib/publicar/actions.ts` | **A** — pero es un **cálculo nuevo inventado** (promedio de publicados), no el motor de tasación |
| `wizardState.ts`, `territoryCatalog.ts` (36.824 bytes) | `apps/publico/lib/publicar/` | **A** — catálogo territorial propio |
| `TplSupabaseClientPlaceholder` | `@tpl/core/types.ts` | 🔴 **E OBSOLETO** — describe un contrato "PROVISIONAL de Fase 1" ya superado por `supabaseClient.ts`, y sigue exportado desde `index.ts` |
| Placeholders | `packages/{ai,automations,valuation/*}` | **D** temporales |

**No hay ningún hook personalizado** (`use*`) en `apps/publico` ni en `packages/ui` fuera de los `useState`/`useRef`/`useEffect` inline. No hay contexto global, no hay store. Es una decisión coherente con la arquitectura Server Components.

---

# 5. FUENTE DE VERDAD DE LOS DATOS

## 5.1 Tabla de origen por dato (sitio nuevo)

| Dato | Fuente actual en `apps/publico` | Ruta de código | Tipo |
|---|---|---|---|
| Lista de propiedades publicadas | `tpl_propiedades` (`estado='publicada'`, orden `publicada_at desc`) | `@tpl/core/repository.ts:list()` | **Supabase** |
| Ficha individual | `tpl_propiedades` por `codigo` | `repository.ts:getByCode()` | **Supabase** |
| Imágenes | `tpl_propiedad_imagenes` (batch `in propiedad_id`) | `repository.ts:hydrate()` | **Supabase** (metadata) |
| Bytes de las imágenes | **Dos orígenes**: Supabase Storage (`tpl-propiedades-propietario`, 6 filas) **y** `https://www.parcelalista.cl/image/...` vía rewrite (184 filas) | `resolvePropertyImageUrl.ts` + `next.config.mjs` | **Supabase + Legacy (proxy)** |
| Precio | `tpl_propiedades.precio_publicado` | `normalizeProperty.ts` | **Supabase**. Nunca recalculado. |
| Ubicación (región/comuna/sector) | columnas homónimas | `normalizeProperty.ts` | **Supabase** |
| Coordenadas | `lat` + `lng` | `normalizeProperty.ts` | **Supabase** |
| Superficie de terreno | `superficie_m2` | `normalizeProperty.ts` | **Supabase** |
| Superficie construida | `casa_datos.superficie_construida` ?? `casa_datos.superficieConstruida` | `normalizeProperty.ts` | **Supabase** (jsonb, doble clave) |
| 12 características | columnas planas de `tpl_propiedades` | `normalizeProperty.ts` | **Supabase** |
| Entorno natural | `atributos_naturales` (jsonb array) | `normalizeProperty.ts` | **Supabase** |
| Valor TPL Técnico | `metadata.valor_tpl_tecnico` ?? `valor_tpl_tasador_base` ?? `valor_tpl_tasador_ajustado` | `normalizeProperty.ts:normalizeValuation()` | **Supabase** (jsonb) |
| Valor Promedio Comunal | `metadata.valor_comunal` ?? `valor_promedio_comunal` ?? `valor_tpl_promedio_comunal` | idem | **Supabase** |
| Valor Recomendado | **solo** `metadata.valor_tpl_recomendado` | idem | **Supabase** — ⚠️ más estrecho que Legacy (R7) |
| Vendedor / contacto | **No se expone** | — | ➖ Fuera del contrato `Property` |
| Videos | **`null` siempre** | `repository.ts` pasa `video: null` de forma incondicional y lo documenta | 🔴 **No se consulta `tpl_propiedad_videos`** |
| Catálogo de casas del cotizador | `HOUSE_MODELS` en `packages/core/src/cotizador/catalog.ts` | hardcode TS | 🔴 **HARDCODE** — copia de `casas.js` |
| Fundaciones | `FOUNDATION_OPTIONS` | hardcode TS | 🔴 **HARDCODE** — copia de `extras.js` |
| Obras adicionales | `ADDITIONAL_WORKS` (5 ítems) | hardcode TS | 🔴 **HARDCODE INCOMPLETO** — el legacy tiene 16 |
| Tarifas por sistema constructivo | `CONSTRUCTION_SYSTEM_RATES` | hardcode TS | 🔴 **HARDCODE** |
| Regiones y comunas (publicar) | `apps/publico/lib/publicar/territoryCatalog.ts` (36.824 bytes) | hardcode TS | 🔴 **HARDCODE** — el CRM usa `tpl_geoint_*` |
| Comunas del buscador | derivadas de `Property.commune` del catálogo real | `actions.ts:listAvailableCommunes()` | ✅ **Supabase (derivado)** |
| Opciones de entorno natural del filtro | derivadas de `characteristics.naturalFeatures` reales | `actions.ts:listAvailableNaturalFeatures()` | ✅ **Supabase (derivado)** — corregido en Fase 3.15 tras detectar que 5 de 6 chips fijos no devolvían nada |
| Cifras de la trust bar | derivadas del catálogo real | `presentation.ts:summarizeCatalogForHome()` | ✅ **Supabase (derivado)** |
| Datos del propietario (portal) | RPC `tpl_propietario_resumen_por_token_v1` | `lib/propietario/actions.ts` | ✅ **Supabase (RPC security definer)** |
| Referencia de precio comunal (publicar) | promedio de `Property.price` de la misma comuna | `lib/publicar/actions.ts` | ⚠️ **Cálculo nuevo** (no es el tasador) |
| Teléfono WhatsApp | `"56988508361"` | hardcode repetido en **6 archivos** | 🔴 **HARDCODE DUPLICADO** |
| ID de GTM | `"GTM-WK4M33H4"` | hardcode en `app/layout.tsx` | ➖ Correcto (mismo que legacy) |
| URL del sitio | `process.env.NEXT_PUBLIC_SITE_URL \|\| "http://localhost:3000"` | `lib/seo/site.ts` | ⚠️ **Fallback peligroso** en producción |

## 5.2 Casos de DOS FUENTES DE VERDAD detectados

### D-01 — Catálogo de casas (CRÍTICO)

- Fuente A: `frontend-v2/casas.js` — 20 modelos, `window.casas`, usado por `cotizador.html` y por el combo de presupuesto del home legacy.
- Fuente B: `packages/core/src/cotizador/catalog.ts` — 26 entradas (`grep -c "id:"`), cabecera literal: *"Portado directamente desde `frontend-v2/casas.js` (ADN original TPL)"*.

Las dos están vivas y ninguna deriva de la otra. Cambiar un precio en una no afecta a la otra. **Contradice tres documentos del propio proyecto**: Plan Maestro §16 ("no crear una segunda fuente de verdad"), `TPL-FASE-3-SEARCH-ESPECIFICACION-FINAL.md` §4 ("No se modifica `casas.js` ni se decide su relación con `tpl_casas`"), y el comentario de `houseAdapter.ts` ("`packages/core` nunca lee ni importa `casas.js` (violaría su aislamiento)") — que se cumple al pie de la letra y se incumple en espíritu: no lo importa, lo **copió adentro**.

### D-02 — Fundaciones y obras adicionales (CRÍTICO)

- Fuente A: `frontend-v2/extras.js` → `window.fundaciones` (3) + `window.extrasOpcionales` (16).
- Fuente B: `catalog.ts` → `FOUNDATION_OPTIONS` (3) + `ADDITIONAL_WORKS` (5).

Divergencia ya medible en §14.1.

### D-03 — Bytes de las imágenes (ALTO)

`tpl_propiedad_imagenes.url` contiene dos formas: URL absoluta de Storage y ruta relativa legacy. La segunda se sirve desde el proyecto Vercel de producción vía proxy. El sitio nuevo depende del viejo para mostrar el 96,8 % de sus fotos.

### D-04 — Catálogo territorial (MEDIO)

`apps/publico/lib/publicar/territoryCatalog.ts` (36.824 bytes de regiones/comunas hardcodeadas) vs. las tablas `tpl_geoint_regiones`/`provincias`/`comunas` (migraciones `202608060002` a `202608060004`) que ya son la fuente canónica del CRM y del tasador.

### D-05 — Metadata SEO (MEDIO, en el legacy)

Ya documentado en la auditoría de Fase 3: `index.html` declara title/description **y** `tpl-seo.js` los sobrescribe con texto distinto. El sitio nuevo elimina esa duplicación (Metadata API única). **No es un problema nuevo, es uno que la migración resuelve.**

### D-06 — Catálogo estático `parcelas.js` (ALTO, en el legacy — heredado)

`frontend-v2/parcelas.js` (72.316 bytes, 32 parcelas) sigue siendo el respaldo estático del home legacy y **no se sincroniza solo** con `tpl_propiedades`. El sitio nuevo **no lo usa en absoluto** (correcto). Pero mientras ambos sitios convivan, hay dos catálogos públicos que pueden mostrar precios distintos para la misma parcela.

---

# 6. SUPABASE

## 6.1 Lo que el sitio nuevo toca realmente

**Esta es la lista completa y verificada.** `grep -rn "\.rpc(\|\.insert(\|\.from(\|functions.invoke"` sobre todo `apps/publico` devuelve exactamente 3 llamadas reales, todas en `lib/propietario/actions.ts`; más las consultas de `@tpl/core/repository.ts`.

| Objeto Supabase | Operación | Desde dónde | Estado |
|---|---|---|---|
| `tpl_propiedades` | `SELECT` de 32 columnas, `eq(estado,'publicada')`, `order(publicada_at desc)`, `limit?` | `@tpl/core/repository.ts:list()` | ✅ Funciona |
| `tpl_propiedades` | `SELECT` + `eq(codigo)` + `maybeSingle()` | `repository.ts:getByCode()` | ✅ Funciona |
| `tpl_propiedad_imagenes` | `SELECT propiedad_id,url,storage_path,alt,orden,es_portada` + `in(propiedad_id, [...])` | `repository.ts:hydrate()` | ✅ Funciona |
| `tpl_propietario_resumen_por_token_v1` | RPC | `lib/propietario/actions.ts` (2 veces, una sin usar) | ✅ Funciona |
| `tpl_propietario_actualizar_por_token_v1` | RPC | `lib/propietario/actions.ts` | ⚠️ **Escrita, nunca invocada** |

**Nada más.** Ni `tpl_propiedad_videos`, ni `tpl_oportunidades`, ni `tpl_visitas`, ni `tpl_web_analytics`, ni `tpl_casas`, ni `tpl_tasaciones`, ni ninguna Edge Function.

## 6.2 Tabla por tabla (foco en lo que importa para la migración)

| Tabla | Uso | Legacy | Moderno | Estado |
|---|---|---|---|---|
| `tpl_propiedades` | catálogo, ficha, CRM, publicador | ✅ intensivo (columnas + `metadata` jsonb) | ✅ solo lectura, 32 columnas explícitas | ✅ Migrado correctamente |
| `tpl_propiedad_imagenes` | fotos | ✅ (corregido 2026-09-03) | ✅ batch, nunca N+1 | ✅ Migrado |
| `tpl_propiedad_videos` | video de la ficha | ✅ `pintarVideo()` | 🔴 **no se consulta** | 🔴 Falta |
| `tpl_oportunidades` | leads/CRM | ✅ vía `createPublicOpportunity` (cotizador) | 🔴 | 🔴 Falta |
| `tpl_visitas` | agenda | ✅ (indirectamente vía leads) | 🔴 | 🔴 Falta |
| `tpl_web_analytics` | "Asesor Espía" | ✅ `analytics-tracker.js` (insert directo) | 🔴 | 🔴 Falta |
| `tpl_casas` | casas del CRM | ✅ CRM | 🔴 (el cotizador nuevo usa hardcode) | 🔴 Falta |
| `tpl_tasaciones` | tasador | ✅ | 🔴 | 🔴 Falta |
| `tpl_publicaciones` | publicador | ✅ | 🔴 | 🔴 Falta |
| `tpl_actores` / `tpl_actor_roles` | identidad | ✅ | 🔴 (no hay auth) | 🔴 Falta |
| `crm_parcelas_resumen` (vista) | grilla CRM | ✅ | ➖ N/A | ➖ |
| `parcelas` (tabla vieja) | ninguno | ➖ | ➖ | ✅ **Correcto: el sitio nuevo NO la toca.** Clasificación oficial: `LEGACY — NO USAR — PENDIENTE DE RETIRO` |
| `tpl_landing_borradores` | TPL Business | ✅ | 🔴 | 🔴 |
| `tpl_comunicaciones_cola` | correos | ✅ (triggers) | 🔴 | 🔴 |

## 6.3 Vistas, funciones y Edge Functions

**Migraciones:** `supabase/migrations/` contiene **más de 150 archivos `.sql`**; el más reciente es del 2026-09-10. **Ninguna migración nueva se creó para esta migración a Next.js** — coherente con el Plan Maestro §6 ("servicios Supabase: NO TOCAR").

**Edge Functions presentes en `supabase/functions/` (28 carpetas):**
`_shared`, `activar-partner-aprobado`, `activar-propietario-gratis`, `aprobar-partner`, `crear-pago-contratacion`, `crear-pago-informe`, `crear-pago-reserva`, `crear-pago-suscripcion`, `enviar-dossier-parcela`, `enviar-resumen-cotizacion`, `estado-informe`, `flow-webhook`, `flow-webhook-contratacion`, `flow-webhook-suscripcion`, `gemini-analisis-mercado`, `gemini-buscador-parcelas`, `gemini-metodo-trabajo`, `gemini-redactar-aviso`, `gemini-tasacion-summary`, `generar-informe-premium`, `procesar-comunicaciones`, `procesar-recalculo-tasador`, `registrar-partner`, `subir-foto-propietario`, `tasador`, `tpl-seo-proxy`, `veo-consultar-video`, `veo-generar-video`.

`apps/publico` **no invoca ninguna de estas 28**. Legacy invoca al menos: `enviar-resumen-cotizacion` (`js/cotizador.js:885`), `gemini-buscador-parcelas` (buscador IA de la ficha), `subir-foto-propietario`, `crear-pago-*`, `generar-informe-premium`.

## 6.4 Problemas conocidos de base de datos

| # | Problema | Impacto en la migración | Fuente |
|---|---|---|---|
| S-01 | **Dos migraciones con prefijo `20260910020000`** (`_tpl_eliminar_tasador_v3_preview_v1.sql` y `_tpl_plan_studio_audiovisual_v1.sql`) | Orden ambiguo al correr `supabase db push`. Riesgo de aplicar una y no la otra. | Listado de `supabase/migrations/` |
| S-02 | **3 RPC rotos en producción (404)**: `tpl_registrar_lead_v1`, `tpl_actualizar_uf_v1`, `manifestar_interes` | Si se migra el lead de visita copiando el legacy, se copia el bug. **Hay que sanearlos primero.** | `docs/TPL-FASE-0-AUDITORIA-CONTRATO.md` (verificado contra producción 2026-09-10) |
| S-03 | `tpl_crm_oportunidades` **no existe**; es el fallback de `tpl_registrar_lead_v1` en `tpl-data-service.js:432` | El fallback del fallback cae a una cola en `localStorage` del navegador. Los leads de visita del legacy se están perdiendo. | `js/core/tpl-data-service.js` líneas 419-455 |
| S-04 | `tpl_actores` tiene RLS habilitado y **cero policies** | Cualquier `.from('tpl_actores')` desde el navegador afecta 0 filas en silencio. Cuando se migre auth/CRM, **obliga a RPC security definer**. | Migración `202607300000_tpl_nucleo_v1` línea 903; auditoría del CRM |
| S-05 | `tpl_proyectos` igual: RLS sin policies | Obliga a `tpl_avanzar_etapa_proyecto_v1`. | idem |
| S-06 | **`tpl_actores` NO tiene columna `auth_user_id`** | El patrón correcto es comparar por correo (`lower(a.email) = lower(auth.jwt()->>'email')`). Queda un bug preexistente con el patrón erróneo en `202608020008_tpl_tasador_fuente_canonica_v1.sql` línea 92. | Memoria de proyecto, verificada en sesiones anteriores |
| S-07 | `tpl_propiedades.subtipo` está en `null` en el 100 % de las filas | `normalizeSubtype()` devuelve `null` siempre a propósito. La clasificación oficial del dominio **no existe todavía como dato**. | `normalizeProperty.ts:167` |
| S-08 | `tipo` y `casa_datos` son **inconsistentes entre sí** en datos reales (la única fila `tipo='casa'` tiene `casa_datos` vacío; filas `tipo='parcela'` sí tienen `casa_datos`) | `Property.hasHouse` es una señal auxiliar y no debe usarse para clasificar. Documentado en `property.ts`. | `property.ts`, JSDoc de `hasHouse` |
| S-09 | `metadata` a veces llega **como string sin parsear** | `parseMetadata()` lo defiende. Comportamiento heredado de `tpl-property-view.js`. | `normalizeProperty.ts:137` |
| S-10 | Región escrita de formas distintas ("Región del Biobío" vs "Biobío") | `normalizeRegionName()` lo corrige en `presentation.ts`. 23 filas dicen "Biobío", 1 dice "Región del Biobío". | `presentation.ts:447` |
| S-11 | Códigos con caracteres no-ASCII (`venega_ñipas`) llegaban percent-encoded y producían 404 | **Ya corregido** con `decodeCodigo()` en Fase 3.15. | `app/propiedades/[codigo]/page.tsx:53` |
| S-12 | Migraciones editadas directamente en el SQL Editor sin pasar por CLI | El historial en `supabase/migrations/` **no siempre coincide con producción**. Ante cualquier síntoma raro, sospechar de esta diferencia. | Memoria de proyecto |

**RLS relevante para el sitio público (VERIFICADO en migraciones):**
- `tpl_propiedades`: policy de lectura pública para registros publicados + policies de staff (`202608230000_tpl_crm_staff_policies`).
- `tpl_propiedad_imagenes`: `tpl_propiedad_imagenes_public_read` — solo fotos de propiedades con `estado='publicada'`.
- El sitio nuevo usa **exclusivamente la clave `anon`** (`createSupabasePublicClient`, con un comentario explícito de que nunca debe pasarse `service_role`). ✅ Correcto.

---

# 7. IMÁGENES Y STORAGE

## 7.1 Dónde están físicamente

Auditoría real registrada en el encabezado de `apps/publico/lib/images/resolvePropertyImageUrl.ts` (ejecutada el 2026-09-11 con clave anon, solo lectura). Cifras textuales de ese archivo:

- **190 filas** en `tpl_propiedad_imagenes`.
- **6** URLs absolutas de Supabase Storage, bucket `tpl-propiedades-propietario`, verificado público con HTTP 200 real.
- **184** rutas relativas legacy (ej. `image/duenos/yumbel/...`).
- Las 184 existen físicamente en `frontend-v2/image/` (verificado con `fs.access`, **0 faltantes**).
- Las 184 se sirven hoy públicamente desde `https://www.parcelalista.cl/image/...` (HTTP 200 real).
- **157 de las 184** contienen espacios en el nombre de archivo.
- **0 filas vacías, 0 caracteres no-ASCII.**
- **18 valores de URL repetidos en más de una fila** — imágenes de ejemplo/plantilla compartidas entre fichas. Problema de contenido, no de código.

## 7.2 Cómo se construyen las URLs hoy

```
resolvePropertyImageUrl(rawUrl):
  vacío/null            → { url: null,  origin: "missing"  }   → placeholder visual
  https://…/storage/v1/object/public/…  → tal cual, origin: "storage"
  otra URL absoluta     → tal cual, origin: "external"
  ruta relativa         → "/legacy-image/" + cada segmento encodeURIComponent → origin: "legacy"
```

Y en `next.config.mjs`:

```js
async rewrites() {
  return [{ source: "/legacy-image/:path*", destination: "https://www.parcelalista.cl/image/:path*" }];
}
```

**Por qué el rewrite y no una URL absoluta:** `frontend-v2/vercel.json` aplica `Cross-Origin-Resource-Policy: same-site` a `/(.*)`, lo que incluye `/image/**`. Un `<img>` plano cross-origin queda bloqueado en cualquier navegador real. Al pedirse desde el propio origen, el navegador nunca evalúa esa política. **VERIFICADO** leyendo `frontend-v2/vercel.json` — la cabecera está ahí.

**Codificación por segmento (no de la ruta completa):** necesaria porque 157 rutas tienen espacios; `encodeURIComponent` sobre la ruta entera también codificaría las `/`.

`next.config.mjs` declara `remotePatterns` **solo** para `hwyscirbycojwndyzozn.supabase.co`. Las imágenes legacy pasan como rutas relativas, que `next/image` trata como locales y sirve por su propio optimizador. ✅ Correcto.

## 7.3 Qué registros tienen imágenes válidas

**NO VERIFICADO en esta sesión** (no se consultó Supabase). El dato más reciente disponible es el de la auditoría del 2026-09-11: 190 filas, 0 vacías, 0 faltantes en disco. Si se necesita el estado de hoy, hay que volver a consultar.

## 7.4 Rutas rotas, duplicación, referencias antiguas

- **Rutas relativas antiguas:** sí, 184 de 190. **No están rotas** — se sirven correctamente vía el rewrite.
- **Referencias rotas:** 0 detectadas en la auditoría del 2026-09-11.
- **Duplicación:** 18 URLs repetidas entre fichas distintas (contenido, no código).
- **Advertencia explícita del enunciado, respetada:** no se asume que una imagen esté rota por no estar en `public/`. Ninguna imagen de propiedad está en `apps/publico/public/` — solo hay ahí `brand/tpl-wordmark.svg` y `brand/tpl-wordmark-light.svg`. Eso es **intencional y correcto**.

## 7.5 Cómo debería quedar definitivamente

El plan A–E está escrito en el propio `resolvePropertyImageUrl.ts` y es sensato. Resumido:

- **A.** Subir las 184 imágenes legacy a `tpl-propiedades-propietario`, con el mismo esquema de carpeta por `propiedad_id` que ya usan las 6 existentes.
- **B.** Validar cada objeto (tamaño > 0, content-type de imagen, HTTP 200 real contra la URL pública).
- **C.** `UPDATE tpl_propiedad_imagenes.url` fila por fila, **en lotes verificables**, solo después de (B).
- **D.** Cuando el 100 % apunte a Storage, el caso `origin:"legacy"` deja de producirse solo; no hace falta borrar código.
- **E.** Solo tras un período de rollback razonable con producción 100 % sobre Storage, evaluar eliminar `frontend-v2/image/` y el rewrite.

**Precisión importante que hay que agregar a ese plan:** mientras exista el rewrite, **`apps/publico` no puede sobrevivir al retiro de `frontend-v2`**. Eso convierte a (A)-(C) en un prerrequisito duro del retiro del sitio legacy, no en una optimización opcional.

---

# 8. FUNCIONALIDADES — MATRIZ COMPLETA

| Funcionalidad | Legacy | Moderno | Estado | Falta |
|---|---|---|---|---|
| Listado de propiedades | `index.html` + `js/index.js` | `/propiedades` + `/` | ✅ COMPLETA | — |
| Ficha de propiedad | `parcela.html` | `/propiedades/[codigo]` | 🟡 PARCIAL | mapa, clima, video, gráfico, IA, ruta, veredicto, lightbox |
| Búsqueda por comuna | sí | sí | ✅ COMPLETA | — |
| Búsqueda por cercanía | sí (sin radio) | sí (con radio 5/10/25/50 km) | ✅ COMPLETA (+) | — |
| Búsqueda por texto libre | no | sí (`keyword` sobre 10 campos) | ✅ NUEVA | — |
| Filtro de precio | no | sí | ✅ NUEVA | — |
| Filtro de superficie | no | sí | ✅ NUEVA | — |
| Filtro por tipo (parcela/casa) | parcial | sí | ✅ COMPLETA | — |
| Filtro por entorno natural | heurística de texto | igualdad exacta + opciones derivadas del catálogo | ✅ COMPLETA | — |
| 7 criterios de orden | sí (botones) | sí (`<select>`) | ✅ COMPLETA | — |
| Combo presupuesto parcela+casa | sí | motor sí, UI apagada | ⚠️ REQUIERE CORRECCIÓN | conectar `HOUSE_MODELS` a `runSearch({intent:"project"})` |
| Mapa del catálogo (Leaflet) | sí (lazy) | no | 🔴 FALTA | todo |
| Mapa de la ficha | sí | no (link a Google Maps) | 🟡 PARCIAL | mapa embebido |
| Mapa para publicar | no verificado | sí (`ParcelMapPicker`) | ✅ COMPLETA | — |
| Paginación "Ver más" | sí | no | 🔴 FALTA | todo |
| Galería de fotos | sí + lightbox | sí, sin lightbox | 🟡 PARCIAL | lightbox |
| Placeholder de foto faltante | parcial | sí (`PropertyImage` + `onError`) | ✅ COMPLETA (+) | — |
| 3 valores de tasación | sí | sí | ⚠️ REQUIERE CORRECCIÓN | precedencia de claves (R7) |
| Score / sello de oportunidad | sí | no | ➖ NO SE MIGRA (decisión) | — |
| Badge "Oportunidad TPL" | sí | sí | ✅ COMPLETA | — |
| Badge "Destacada" | sí | sí | ✅ COMPLETA | — |
| Video de la propiedad | sí | no | 🔴 FALTA | consultar `tpl_propiedad_videos` con `publicado_en_parcela=true` |
| Clima / bioclima | sí | no | 🔴 FALTA | todo |
| Distancias a ciudades/servicios | sí | no | 🔴 FALTA | todo |
| Ruta por carretera | sí (OSRM) | no | 🔴 FALTA | todo |
| Gráfico de mercado comunal | sí (Chart.js) | no | 🔴 FALTA | todo |
| Buscador IA de la ficha | sí (`gemini-buscador-parcelas`) | no | 🔴 FALTA | todo |
| Propiedades relacionadas | no | sí | ✅ NUEVA | — |
| "Radar de Mercado TPL" (empty state comercial) | sí | no | 🔴 FALTA | todo |
| Trust bar | sí | sí | ✅ COMPLETA (+) | — |
| Commune ribbon | sí (botones) | sí (links indexables) | ✅ COMPLETA (+) | — |
| Cotizador: modelos prefabricados | sí (20) | sí (26 entradas hardcodeadas) | ⚠️ REQUIERE CORRECCIÓN | fuente única |
| Cotizador: diseño a medida | sí | sí (4 sistemas) | ✅ COMPLETA | — |
| Cotizador: fundaciones | sí (3) | sí (3) | ✅ COMPLETA | — |
| Cotizador: obras adicionales | sí (16) | sí (5) | 🟡 PARCIAL | 11 obras + la semántica `base: casa_m2` / `parcela_perimetro` |
| Cotizador: correo de resumen | sí (Edge Function) | no | 🔴 FALTA | todo |
| Cotizador: crear oportunidad CRM | sí | no | 🔴 FALTA | todo |
| Publicar propiedad | sí (publicar-v2, ~40 campos, pago) | wizard 4 pasos → WhatsApp | 🔴 FALTA (lo esencial) | persistencia, fotos, planes, pago |
| Postular a Red Partner | sí (40+ campos + Storage) | dialog → WhatsApp | 🔴 FALTA | todo |
| Agendar visita | dialog + `saveLead` (roto en prod) | dialog → WhatsApp, sin fecha | 🟡 PARCIAL | persistencia + campo fecha |
| Hacer oferta | sí (WhatsApp) | no | 🔴 FALTA | botón |
| Portal propietario: ver | sí | sí | ✅ COMPLETA | — |
| Portal propietario: editar | sí | no (función escrita, sin UI) | 🔴 FALTA | formulario |
| Portal propietario: subir fotos | sí | no | 🔴 FALTA | todo |
| Portal propietario: recalcular tasación | sí | no | 🔴 FALTA | todo |
| Portal propietario: simulador de mejoras | sí | no | 🔴 FALTA | todo |
| Portal propietario: radar de demanda | sí | no | 🔴 FALTA | todo |
| Pago de reserva (1 %) | sí (Flow) | no | 🔴 FALTA | todo |
| Informe premium pagado | sí | no | 🔴 FALTA | todo |
| Suscripciones | sí | no | 🔴 FALTA | todo |
| WhatsApp (CTA) | sí | sí (6 archivos) | ⚠️ REQUIERE CORRECCIÓN | centralizar el número |
| GTM | sí | sí | ✅ COMPLETA | — |
| `tpl_web_analytics` ("Asesor Espía") | sí | no | 🔴 FALTA | todo |
| Metadata / OG / canonical | sí (duplicado) | sí (única) | ✅ COMPLETA (+) | `NEXT_PUBLIC_SITE_URL` |
| JSON-LD de la ficha | sí (`RealEstateListing`) | sí (`Product`) | ⚠️ REQUIERE CORRECCIÓN | tipo de schema |
| JSON-LD del sitio (`RealEstateAgent`/`WebSite`) | sí | no | 🔴 FALTA | todo |
| Sitemap | estático, 7 URLs | dinámico, 8 fijas + todas las parcelas | ✅ COMPLETA (+) | pero **congelado en build** |
| robots.txt | sí | sí | ⚠️ REQUIERE CORRECCIÓN | falta bloquear `/design-system` |
| Accesibilidad de las cards | ❌ `<article onclick>` | ✅ link real | ✅ COMPLETA (+) | — |
| Estados de carga/vacío/error | parcial | 5 estados excluyentes | ✅ COMPLETA (+) | — |
| Autenticación | sí (Supabase Auth, CRM/Business) | no | 🔴 FALTA | todo |
| Favoritos | **no existe en Legacy** | no | ➖ N/A | — |
| Comparador | **no existe en Legacy** | no | ➖ N/A | — |

> Nota sobre favoritos y comparador: el enunciado los menciona como candidatos a "funcionalidad perdida". **Se buscaron explícitamente** (`grep -rn "favorit\|comparador\|compare"` sobre `js/*.js`, `index.html`, `parcela.html`) y **no existen en el legacy**. No se pueden haber perdido.

---

# 9. DIFERENCIAS VISUALES

> **Advertencia metodológica:** esta sección compara **código con código**. No se abrió ningún navegador ni se tomó ninguna captura. Todo lo que sigue es una diferencia estructural verificable en el HTML/JSX/CSS, no un juicio sobre cómo se ve. Cualquier afirmación sobre apariencia final está marcada **NO VERIFICADO**.

## 9.1 Lo que se conservó

- **Tokens de marca.** `packages/ui/src/tokens/colors.ts` es el port de `tpl-foundation.css`, incluidos los dos valores fijados por contraste que el Plan Maestro §5 prohíbe "mejorar a ojo" (`#a8410f`, `#0f7a4f`).
- **Navegación y footer.** Portados a `Header`/`Footer`/`MobileMenu` en Fase 2. Mismo logo (`tpl-wordmark.svg` / `tpl-wordmark-light.svg`).
- **Jerarquía de la tarjeta de propiedad**: imagen → ubicación → título → superficie → atributos → precio → acción. Fijada por diseño en `PropertyCard` (no configurable por prop, a propósito).
- **Formato de precio**: `Intl.NumberFormat("es-CL", {style:"currency", currency:"CLP", maximumFractionDigits:0})` — mismo formato que `js/index.js`, documentado como decisión de no inventar uno nuevo.
- **Orden de regiones del ribbon**: `["Biobío","Ñuble","La Araucanía","Maule","Otras zonas"]`, idéntico al `regionOrder` del legacy.
- **Texto de la trust bar**: mismo formato ("N+ parcelas publicadas · N comunas disponibles · N regiones cubiertas · Explorar ahora →").

## 9.2 Lo que se mejoró

| Mejora | Evidencia |
|---|---|
| **Accesibilidad de las tarjetas.** Legacy: `<article onclick="window.location.href=...">` — no enfocable por teclado, invisible para lectores de pantalla. Moderno: `<a>` real con patrón de link estirado. | `PropertyCard.tsx` vs auditoría de Fase 3 §B |
| **Placeholder de imagen.** `PropertyImage` maneja `src` ausente **y** `onError`, con un ícono SVG y `role="img"`. Legacy mostraba el ícono de imagen rota del navegador con el `alt` encima del badge. | `PropertyImage.tsx:55-70` |
| **Estados de búsqueda.** 5 estados mutuamente excluyentes (`idle`/`loading`/`error`/`empty`/`success`) con skeletons. Legacy tenía skeleton y dos empty states sueltos. | `SearchResults.tsx`, `searchState.ts:deriveSearchStatus()` |
| **Comunas como URLs.** Cada chip del ribbon es un `<Link href="/propiedades?comuna=...">` indexable con metadata propia, no un botón que dispara JS en la misma página. | `CommuneRibbon.tsx`, `app/propiedades/page.tsx:generateMetadata` |
| **Trust bar sin cifra inflada.** Se eliminó el piso artificial `Math.max(regiones, 3)` del legacy. Documentado explícitamente en `TrustBar.tsx`. | `TrustBar.tsx` |
| **Miniaturas con ARIA correcta.** Se corrigió `role="tablist"/"tab"` (que implica navegación por flechas y un `tabpanel` asociado que no existía) por `role="group"` + `aria-pressed`. | `PropertyGallery.tsx` (Fase 3.15) |
| **Tipografía y fuentes.** Legacy carga Google Fonts con `<link>` bloqueante. El sitio nuevo no carga Google Fonts en absoluto. | `index.html` vs `app/layout.tsx` — **NO VERIFICADO** el efecto visual de esa ausencia |

## 9.3 Lo que se perdió

| Elemento perdido | Dónde estaba | Impacto visual |
|---|---|---|
| Video corporativo del home | `index.html` (iframe YouTube) | Bloque completo ausente |
| Banner de tasador ("Tasar mi propiedad") | home | CTA secundario del negocio ausente |
| Sección editorial "Campo Story" | home | Bloque de marca ausente |
| Panel de mapa (home y ficha) | `loadLeaflet()`/`paintMap()`, `initCRMMap()` | Una de las dos formas de explorar el catálogo |
| Barra de 7 prioridades como fila de botones | home | Reemplazada por `<select>` — cambio de forma, no de función |
| Empty state "Radar de Mercado TPL" | home | Pieza comercial con copy propio y CTA a WhatsApp |
| Widget de clima + badge de clima | ficha | Dos bloques |
| Gráfico de tendencia de mercado (Chart.js) | ficha | Bloque completo |
| Sección "Veredicto del Experto TPL" | ficha | Bloque de texto generado |
| Comparación comunal | ficha | Bloque |
| Buscador IA del pie de la ficha | ficha | Bloque interactivo |
| Lightbox de galería | ficha (`#gallery-dialog`) | Interacción |
| "Parcelas con casa" como sección propia | home | Reemplazado por filtro |

## 9.4 Lo que cambió accidentalmente (deuda de diseño)

Este es el hallazgo menos evidente y el más fácil de dejar crecer: **hay dos estéticas conviviendo dentro de `apps/publico`.**

| Archivo | Colores hex inline | Comentario |
|---|---|---|
| `components/cotizador/CotizadorWizard.tsx` | **74** | Construido casi íntegramente fuera del design system |
| `app/mi-parcela/[token]/page.tsx` | **42** | Gradiente propio `#0f2942 → #1e3a8a`, tipografía `serif` inline |
| `app/campo-chileno/page.tsx` | **35** | |
| `app/terminos/page.tsx` | 12 | |
| `app/privacidad/page.tsx` | 12 | |
| `app/comenzar-proyecto/page.tsx` | 8 | |
| `app/como-comprar/page.tsx` | 7 | |
| Todos los `components/search/*` | **0** | ✅ 100 % sobre tokens |
| `components/home/*`, `components/property/*` | 0-1 | ✅ |

Las rutas construidas en los bloques de Search y Home usan el design system al 100 %. Las rutas añadidas después (cotizador, mi-parcela, campo-chileno) lo bordean. Eso **no es un error de una fase**, es una deriva: cada página nueva que se escriba con hex inline aleja el sitio del objetivo de la Fase 2.

## 9.5 Responsive y mobile

**NO VERIFICADO visualmente.** Lo verificable en código:

- `Grid` acepta `columns={{mobile, tablet, desktop}}` y se usa consistentemente (`{mobile:1, tablet:2, desktop:3}`).
- `MobileMenu` existe y está portado.
- `CommuneRibbon` usa `overflow-x:auto` + `scroll-behavior:smooth` **solo con CSS**, sin flechas ni JS (el legacy tenía scroll custom con JS respetando `prefers-reduced-motion`). **El nuevo pierde el manejo explícito de `prefers-reduced-motion`** — a verificar en `communeRibbon.css.ts`, **NO VERIFICADO** (archivo no leído en esta sesión).
- Los anchos fijos inline (`maxWidth: 840`, `maxWidth: 880`, `maxWidth: 640`) en cotizador/mi-parcela/comenzar-proyecto son responsivos por ser `maxWidth`, no `width`.
- `h1` del cotizador usa `clamp(2rem, 4vw, 3.2rem)` — responsive correcto.

---

# 10. FUNCIONALIDADES PERDIDAS

Esta sección es la más importante para quien continúe. Lista de lo que **existía y hacía algo** y hoy no ocurre en el sitio nuevo. Ordenada por impacto de negocio.

## 10.1 Conversión y captación (lo más grave)

| ID | Funcionalidad perdida | Legacy | Moderno | Nota crítica |
|---|---|---|---|---|
| **L-01** | **Lead de "Agendar visita"** | `parcela.html` inline script → `TPLDataService.saveLead()` → RPC `tpl_registrar_lead_v1` → fallback `tpl_crm_oportunidades` → fallback cola `localStorage`. Captura **fecha preferida** + nombre + teléfono. | `ScheduleVisitDialog` captura nombre + teléfono y abre WhatsApp. **Sin fecha. Sin persistencia.** | ⚠️ **Matiz honesto e importante:** el legacy también está roto — `tpl_registrar_lead_v1` devuelve 404 en producción (Fase 0) y `tpl_crm_oportunidades` no existe. Es decir, hoy esos leads **ya se están perdiendo** en el sitio viejo. No se debe portar el bug; hay que sanear la RPC primero (§17, P0-03). |
| **L-02** | **Oportunidad comercial del cotizador** | `js/cotizador.js:931` → `TPLDataService.createPublicOpportunity()` → RPC `tpl_registrar_oportunidad_publica_v1` (o `tpl_registrar_oferta_propiedad_v1` según `tipo`) | Nada. El wizard nuevo no llama a ningún backend. | Esta **sí funciona** en Legacy (la RPC existe, migración `20260901120000_tpl_oportunidad_publica_contacto_flexible_v1`). Es una pérdida neta real. |
| **L-03** | **Correo de resumen de cotización** | `js/cotizador.js:885` → `fetch(${url}/functions/v1/enviar-resumen-cotizacion)` | Nada | |
| **L-04** | **Publicación real de una propiedad** | `publicar-v2` → `tpl_publicaciones` + fotos a Storage + planes + pago Flow | WhatsApp | El propio `PublishWizard.tsx` lo documenta: *"NO llama a `tpl_publicar_propiedad_v3` (esa RPC exige nombre + contacto, que este paso no recolecta todavía)"* |
| **L-05** | **Postulación a Red Partner** | Formulario de 40+ campos + `postular.js` + bucket `partner-postulaciones-v2` + `tpl_onboarding_partner` | WhatsApp | |
| **L-06** | **"Hacer oferta"** | Botón `#btn-hacer-oferta` en la ficha → WhatsApp con mensaje contextual | No existe el botón | Pérdida barata de recuperar |
| **L-07** | **Creación de proyecto desde el cotizador** | `comenzar-proyecto.html` → `tpl_crear_proyecto_desde_cotizador_v1` (migración `202608050015`) | `/comenzar-proyecto` es una página de confirmación estática con un CTA de WhatsApp | |
| **L-08** | **"Radar de Mercado TPL"** | Empty state del home con copy propio, resumen del mercado externo y CTA "Solicitar asesoría de compra externa" a WhatsApp | Empty state genérico: "Intenta ampliar el rango de precio" | Convierte una búsqueda vacía en una oportunidad. Es negocio, no UI. |

## 10.2 Tracking y medición

| ID | Perdido | Detalle |
|---|---|---|
| **L-09** | **Todo `tpl_web_analytics`** | `analytics-tracker.js` registra 4 eventos con `session_id` de `sessionStorage`, `page_url`, `parcela_id` y `time_spent_seconds`: `page_view`, `page_exit`, `whatsapp_click` (delegado global sobre cualquier `<a href*="wa.me">`), `bot_trigger`. El sitio nuevo no tiene equivalente. |

⚠️ **Dos matices honestos sobre L-09:**
1. `analytics-tracker.js` **solo se carga en `index.html`** (verificado: no aparece en la lista de `<script>` de `parcela.html`). Es decir, el tracking de la ficha no existe hoy tampoco.
2. `parcela_id` se toma de `?id=` de la URL. En `index.html` nunca hay `?id=`, así que **el 100 % de los eventos actuales llega con `parcela_id = null`** — lo que hace que el módulo "Asesor Espía" del CRM (que filtra por `parcela_id`) salga siempre vacío. Hallazgo ya registrado en la auditoría del CRM.

Conclusión práctica: **no portar este componente como está.** Si se reconstruye, hacerlo bien desde el principio (evento por propiedad, con `code` real).

## 10.3 Contenido e interacción

| ID | Perdido |
|---|---|
| L-10 | Video de la propiedad (`tpl_propiedad_videos`) — `repository.ts` pasa `video: null` incondicionalmente |
| L-11 | Clima y perfil bioclimático por comuna |
| L-12 | Distancias a ciudades y a servicios |
| L-13 | Ruta por carretera con tiempo y distancia (OSRM) |
| L-14 | Gráfico de tendencia del mercado comunal (Chart.js) |
| L-15 | Buscador IA de la ficha (`gemini-buscador-parcelas`) |
| L-16 | "Veredicto del Experto TPL" y comparación comunal |
| L-17 | Lightbox de galería |
| L-18 | Mapa del catálogo y mapa de la ficha |
| L-19 | Paginación "Ver más" |
| L-20 | Sección "Parcelas con casa" |
| L-21 | Banner de tasador, video corporativo, Campo Story en el home |
| L-22 | Portal propietario: edición, fotos, recálculo, simulador de mejoras, radar de demanda, línea de tiempo, mapa |

## 10.4 SEO

| ID | Perdido |
|---|---|
| L-23 | **JSON-LD `RealEstateAgent` + `WebSite`/`SearchAction`** del home (2 bloques en `index.html`, líneas 57 y 71). La Home nueva no emite ninguno. |
| L-24 | `RealEstateListing` como tipo de schema de la ficha — sustituido por `Product`. |
| L-25 | La URL `/politica-privacidad.html` cambió a `/privacidad` sin 301. |

## 10.5 Navegación

| ID | Perdido |
|---|---|
| L-26 | **Enlace a TPL Business en el nav.** `parcela.html` y el resto del legacy tienen `./plataforma/tpl-business-v2/index.html` en el menú principal y en el móvil. `siteNav.ts` tiene 5 links y ninguno apunta a TPL Business. |
| L-27 | Enlace de "Acceso interno" al CRM en el footer — `SiteChrome` pasa `internalAccessHref="#crm"`, un ancla muerta. |

---

# 11. ANALYTICS Y CONVERSIONES

## 11.1 Qué existe hoy en cada versión

| Pieza | Legacy | Moderno | Evidencia |
|---|---|---|---|
| **GTM** contenedor `GTM-WK4M33H4` | ✅ inline al inicio del `<head>` + `<noscript>` iframe | ✅ vía `next/script strategy="afterInteractive"` + `<noscript>` iframe | `index.html:11` y `:89`; `app/layout.tsx:20,57,66` |
| **GA4 (`gtag`) directo** | ❌ no hay `gtag(` en el HTML | ❌ | `grep` sobre ambos |
| **Google Ads (`AW-`) directo** | ❌ no hay etiqueta `AW-` en el HTML | ❌ | idem |
| **CSP permite GA** | `https://www.google-analytics.com`, `https://region1.google-analytics.com` en `script-src`/`connect-src` | (no aplica: `apps/publico` no define CSP) | `frontend-v2/vercel.json` |
| **`tpl_web_analytics` (propio)** | ✅ solo en `index.html` | ❌ | `js/core/analytics-tracker.js` |
| Evento `page_view` propio | ✅ | ❌ | |
| Evento `page_exit` (con `time_spent_seconds`) | ✅ | ❌ | |
| Evento `whatsapp_click` (delegación global sobre `wa.me`) | ✅ | ❌ | |
| Evento `bot_trigger` (asistente IA) | ✅ | ❌ | |
| `session_id` propio en `sessionStorage` | ✅ | ❌ | |

## 11.2 Conclusión honesta

**GA4, Google Ads, conversiones y `page_view` no se perdieron: nunca estuvieron en el código.** Toda esa configuración vive dentro del contenedor GTM `GTM-WK4M33H4`, que el sitio nuevo carga idéntico. **NO VERIFICADO** qué etiquetas hay dentro de ese contenedor — requiere acceso a la consola de GTM, que esta sesión no tiene.

**Consecuencia práctica para el siguiente agente:** antes de mover tráfico hay que abrir GTM y revisar si alguna etiqueta depende de:
- selectores CSS o IDs del DOM de `frontend-v2` (ej. `#btn-agendar-visita`, `.tpl-btn`, `#parcel-grid`) — esos IDs **no existen** en el sitio nuevo;
- la forma de las URLs (`parcela.html?id=X` → `/propiedades/X`) — cualquier trigger basado en "Page Path contiene `parcela.html`" deja de dispararse;
- eventos personalizados empujados a `dataLayer` desde el JS de `frontend-v2` — el sitio nuevo no empuja ninguno.

**Lo que sí se perdió de verdad y es responsabilidad del código:** el tracking propio a `tpl_web_analytics` (L-09), con los matices de que solo cubría el home y siempre sin `parcela_id`.

---

# 12. ERRORES ACTUALES

Numerados para poder referenciarlos. "Error" incluye defectos que no rompen el build pero producen un comportamiento incorrecto.

| ID | Error | Archivo | Causa probable | Impacto | Solución recomendada | Prioridad |
|---|---|---|---|---|---|---|
| **E-01** | `SITE_URL` cae a `http://localhost:3000` | `apps/publico/lib/seo/site.ts:12` | `NEXT_PUBLIC_SITE_URL` no está definida en el proyecto Vercel (`vercel env ls` → 0 variables, auditoría de coexistencia §2) | Canonical, OG, Twitter y **todas las URLs del sitemap** apuntan a localhost. Si esa build llegara a indexarse, sería un desastre de SEO. | Definir `NEXT_PUBLIC_SITE_URL` en el proyecto de preview **y** lanzar un error en build si falta en producción | **P0** |
| **E-02** | La Home se prerenderiza estáticamente sin revalidación | `app/page.tsx` | Sin `export const revalidate` ni `dynamic` | El catálogo de destacadas/oportunidades, el ribbon y la trust bar quedan congelados en el momento del build. Una parcela nueva no aparece jamás sin redeploy. | `export const revalidate = 300` (o el valor que decida el dueño) | **P0** |
| **E-03** | `/sitemap.xml` se prerenderiza estáticamente | `app/sitemap.ts` | Idem | Las parcelas nuevas nunca entran al sitemap. Combinado con E-01, además apunta a localhost. | `export const revalidate` en `sitemap.ts` | **P0** |
| **E-04** | 3 consultas completas al catálogo por request en `/propiedades` | `components/search/SearchWidgetServer.tsx:57-63` + `lib/search/actions.ts` | `listAvailableCommunes()`, `listAvailableNaturalFeatures()` y `runPropertySearch()` llaman cada una a `searchProperties()` → `repository.list()`, sin memoización | 6 round-trips a Supabase por visita. Con catálogo creciente, se degrada linealmente. | Envolver `searchProperties()`/`list()` en `React.cache()` (el patrón ya está aplicado a `getPropertyDetail`) | **P1** |
| **E-05** | Consulta duplicada en la ficha | `lib/search/actions.ts:getRelatedProperties` | Trae el catálogo completo para filtrar 6 relacionadas en memoria | ~4 round-trips por ficha | Mismo `React.cache()` | **P1** |
| **E-06** | Precedencia de `recommendedValue` más estrecha que Legacy | `packages/core/src/normalizeProperty.ts:202` | Solo lee `metadata.valor_tpl_recomendado`; Legacy acepta además `valor_tpl_tasador_ajustado` y `valor_tpl_tasador` | Parcelas con tasación guardada bajo clave histórica **muestran tasación en Legacy y no en el sitio nuevo**. Viola el criterio de aceptación del Plan Maestro §18 ("cero discrepancias de cifras"). | Alinear la cadena de `??` con `valoracionGuardada()` de `js/parcela.js`, y verificar fila por fila contra las 32-33 propiedades reales | **P1** |
| **E-07** | El modo "project" del buscador está apagado | `components/search/SearchWidget.tsx:218` → `SearchResults.tsx:23` | No hay fuente de `House[]` conectada, aunque `HOUSE_MODELS` ya vive en `@tpl/core` | Se pierde una función de producto diferenciadora que ya está programada y probada | Pasar `HOUSE_MODELS` (adaptados a `House`) como `options.houses` en `runSearch` | **P1** |
| **E-08** | `/design-system` es indexable | `app/robots.ts:13` | El `disallow` lista `/search-demo` y `/mi-parcela` pero no `/design-system` | Una vitrina interna puede indexarse | Agregar `/design-system` al `disallow` | **P1** |
| **E-09** | El JSON-LD del sitio (`RealEstateAgent` + `WebSite`/`SearchAction`) no existe | `app/layout.tsx` / `app/page.tsx` | No se portó | Regresión de SEO frente a Legacy | Portar los 2 bloques de `index.html` | **P1** |
| **E-10** | `/politica-privacidad.html` → `/privacidad` sin 301 | — | No se creó la tabla de redirects que exige Plan Maestro §13 | Pérdida de la URL indexada | Agregar `redirects()` en `next.config.mjs` **y** documentar la tabla de redirects antes del corte de tráfico | **P1** |
| **E-11** | `updateOwnerProperty()` es código muerto | `lib/propietario/actions.ts:80` | Se escribió la acción y no se construyó el formulario | El portal del propietario es de solo lectura; el propietario no puede corregir su ficha | Construir el formulario, o borrar la función para no dar la impresión de que funciona | **P1** |
| **E-12** | `getOwnerPropertySummary()` duplica `getOwnerPortalViewModel()` | `lib/propietario/actions.ts:49` | Dos versiones de la misma llamada, una sin usar | Confusión para el siguiente desarrollador | Borrar la no usada | **P2** |
| **E-13** | `adaptCasasToHouses()` no lo llama nadie | `lib/search/houseAdapter.ts` | El catálogo de casas terminó hardcodeado en `@tpl/core` en vez de leerse de `casas.js` | Código con documentación extensa que describe una arquitectura que ya no es la real | Decidir: o se usa (al resolver E-07) o se borra | **P2** |
| **E-14** | `TplSupabaseClientPlaceholder` sigue exportado | `packages/core/src/types.ts` + `index.ts` | Resto de Fase 1 | Contrato obsoleto en la API pública del paquete | Borrar el archivo y su export | **P2** |
| **E-15** | Número de WhatsApp hardcodeado en 6 archivos | `app/propiedades/[codigo]/page.tsx:12`, `app/comenzar-proyecto/page.tsx`, `app/mi-parcela/[token]/page.tsx`, `app/red-partner/page.tsx`, `components/publicar/PublishWizard.tsx:20`, `components/cotizador/CotizadorWizard.tsx` | Nunca se centralizó | Cambiar el número comercial exige 6 ediciones. `.env.example` **ya declara `NEXT_PUBLIC_WHATSAPP_PHONE`** y ningún archivo la usa. | Crear `lib/contact.ts` que lea esa variable | **P2** |
| **E-16** | Dos migraciones con el mismo prefijo `20260910020000` | `supabase/migrations/` | Colisión de nombres al crearlas | Orden ambiguo en `supabase db push` | Renumerar una | **P2** |
| **E-17** | No hay configuración de ESLint | raíz, `apps/*`, `packages/config/` | Nunca se creó | `turbo run lint` / `next lint` no puede funcionar. `packages/config` promete "ESLint, TSConfig, Tailwind config compartidos" (Plan Maestro §3) y solo tiene `tsconfig.base.json`. | Crear `packages/config/eslint.config.mjs` y consumirlo | **P2** |
| **E-18** | Tests sin runner | `packages/core/src/__tests__/`, `apps/publico/**/__tests__/` | Decisión explícita de no instalar Vitest/Jest | 10 archivos de test que nadie ejecuta automáticamente | Ver §17, P2-05 | **P2** |
| **E-19** | `vercel.preview.json` es inerte | raíz | Vercel solo lee `vercel.json` | Confusión: parece configuración activa y no lo es | Documentarlo en el propio archivo o convertirlo en un script de despliegue | **P2** |
| **E-20** | `vercel.json` de la raíz no aplica a nada | raíz | Root Directory de producción es `frontend-v2` | Headers de seguridad que nadie sirve; da falsa sensación de cobertura | Documentarlo. **No borrarlo** hasta confirmar que ningún proyecto lo usa. | **P2** |
| **E-21** | CSP en modo `Report-Only` | `frontend-v2/vercel.json` | Decisión previa no revisada | La CSP no bloquea nada hoy | Evaluar pasar a enforcement — fuera del alcance de esta migración, pero anotado | **P2** |
| **E-22** | 74 / 42 / 35 colores hex inline | `CotizadorWizard.tsx`, `mi-parcela/[token]/page.tsx`, `campo-chileno/page.tsx` | Páginas escritas fuera del design system | Deriva visual; un rediseño de marca no se propaga | Migrar a tokens de `@tpl/ui` | **P3** |
| **E-23** | `internalAccessHref="#crm"` es un ancla muerta | `components/layout/SiteChrome.tsx` | Placeholder nunca resuelto | Link roto en el footer | Apuntar al CRM real o quitar la prop | **P3** |
| **E-24** | `siteNav` no incluye TPL Business | `components/layout/siteNav.ts` | Omisión | Se pierde un punto de entrada del negocio que sí está en el nav legacy | Agregarlo | **P3** |
| **E-25** | `opengraph-image.png` / `twitter-image.png` pesan 632.958 bytes cada uno | `apps/publico/app/` | Assets sin optimizar | Descargas innecesarias; y **CONTRADICE** el comentario de `app/layout.tsx` que dice que no hay imagen OG | Verificar cuál gana y optimizar/eliminar | **P3** |
| **E-26** | `CommuneRibbon` pierde el manejo de `prefers-reduced-motion` | `communeRibbon.css.ts` | Se simplificó a CSS puro | Accesibilidad de movimiento | Verificar el CSS y agregar la media query si falta — **NO VERIFICADO** | **P3** |

---

# 13. ARCHIVOS IMPORTANTES

Archivos que **no deben modificarse ni eliminarse sin revisar dependencias**. Para cada uno, por qué.

## 13.1 Moderno — núcleo de la arquitectura

| Archivo | Por qué es crítico |
|---|---|
| `packages/core/src/property.ts` | Es **el contrato de dominio**. Toda la app deriva de él. Cada campo está documentado con su columna real de Supabase, verificada contra producción. Agregar o renombrar un campo rompe `normalizeProperty`, `search`, `presentation` y los tests de fixtures. |
| `packages/core/src/normalizeProperty.ts` | **Normalizador único.** Es la pieza que resuelve el bug histórico de fotos/valores divergentes. Si se duplica su lógica en otro lugar, vuelve el bug. Es puro y determinista — mantenerlo así. |
| `packages/core/src/repository.ts` | Garantiza **1 consulta + 1 batch, nunca N+1**. La lista `PROPERTY_COLUMNS` es explícita a propósito (no `select('*')`). |
| `packages/core/src/search.ts` | **Motor puro.** El principio "búsqueda ≠ ranking" es una decisión de arquitectura aprobada. Meterle un filtro dentro de `rankProperties()` (como hace el legacy con `opportunity`) la revierte. |
| `packages/core/src/supabaseClient.ts` | Único punto de creación del cliente. Su contrato explícito es "nunca `service_role`". |
| `apps/publico/lib/images/resolvePropertyImageUrl.ts` | **Única función de resolución de imágenes** del sitio. Su encabezado contiene la auditoría real de las 190 filas y el plan A–E de migración a Storage. Si un componente resuelve URLs por su cuenta, vuelve el bug de fotos rotas. |
| `apps/publico/next.config.mjs` | Contiene el rewrite `/legacy-image/:path*` del que dependen el 96,8 % de las fotos, y los `remotePatterns` de `next/image`. **Borrar el rewrite deja el catálogo sin fotos.** |
| `apps/publico/lib/search/presentation.ts` | Único lugar donde se formatea (precio, superficie, ubicación). Si el formato se duplica, aparecen dos formatos de precio en el mismo sitio. |
| `apps/publico/lib/search/actions.ts` | Frontera `"use server"`. Es la garantía —aplicada por el compilador— de que Supabase y las variables de entorno nunca llegan al bundle del navegador. |
| `apps/publico/lib/search/supabaseSearchRepository.ts` | Adaptador Supabase ↔ Search Core. Es donde vive `createDefaultRepository()`. |
| `packages/ui/src/tokens/colors.ts` | Contiene los dos colores fijados por contraste (`#a8410f`, `#0f7a4f`) que el Plan Maestro §5 prohíbe explícitamente "mejorar a ojo". |
| `packages/ui/src/styles/GlobalStyles.tsx` | Inyecta todo el CSS del design system. Si un componente nuevo trae su `*.css.ts` y no se registra aquí, se renderiza sin estilos. |
| `pnpm-workspace.yaml` / `turbo.json` / `packages/config/tsconfig.base.json` | Estructura del monorepo. `pnpm-workspace.yaml` incluye `packages/valuation/*` como línea aparte — quitarla desconecta 3 paquetes. |
| `apps/publico/.env.local` / `.env.example` | Contienen las credenciales anon y la configuración. **No leer ni exponer `.env.local`.** |

## 13.2 Legacy — en producción, no tocar sin verificar

| Archivo | Por qué |
|---|---|
| `frontend-v2/index.html`, `parcela.html`, `cotizador.html`, y el resto de HTML | **Están sirviendo tráfico real ahora mismo.** El Plan Maestro §3 es explícito: `frontend-v2/` se conserva íntegro durante TODA la migración. |
| `frontend-v2/vercel.json` | **Es el `vercel.json` efectivo de producción** (Root Directory = `frontend-v2`). Contiene el `Cross-Origin-Resource-Policy: same-site` del que depende toda la arquitectura de imágenes del sitio nuevo. |
| `frontend-v2/image/**` (600+ archivos) | Fuente física del 96,8 % de las fotos del catálogo, **también del sitio nuevo**, vía el rewrite. |
| `frontend-v2/js/core/tpl-data-service.js` | Cliente único del sitio legacy. Cualquier método usado en código debe existir en la lista final `Object.freeze({...})` o falla en silencio. |
| `frontend-v2/js/core/tpl-property-view.js` | Normalizador único del legacy. Debe cargarse **antes** que `index.js`/`parcela.js`/`tpl-seo.js`. |
| `frontend-v2/casas.js`, `extras.js`, `parcelas.js` | Fuentes de datos estáticas activas. `parcelas.js` alimenta el home legacy. |
| `frontend-v2/js/core/valuation-engine.js` | Motor de tasación real. Su copia para Deno **se genera con `generar-motor-deno.mjs`, no se edita a mano.** |
| `supabase/migrations/**` | Historial. **No reescribir migraciones ya aplicadas.** |
| `supabase/functions/**` | 28 Edge Functions, varias en producción. Plan Maestro §6: "NO TOCAR". |
| `scripts/**` | Plan Maestro §6: "NO TOCAR". Hay ~8 scripts de sincronización vigentes (`sincronizar-catalogo-publico.mjs`, `sincronizar-precio-reserva.mjs`, `generar-sitemap.mjs`, `recalcular-*`…) más un `archive-legacy/`. **Antes de construir cualquier mecanismo de sincronización nuevo, revisar esta carpeta: probablemente ya existe uno parecido.** |
| `docs/TPL-MASTER-MIGRATION-PLAN.md` | Documento congelado con las 13 decisiones del dueño. No se modifica sin autorización. |
| `docs/TPL-FASE-0-AUDITORIA-CONTRATO.md` | Contrato de datos verificado contra producción. Referencia obligatoria antes de tocar cualquier tabla. |
| `docs/TPL-FASE-3-COEXISTENCIA-AUDITORIA.md` | Contiene la decisión aprobada de coexistencia (Opción D) y la evidencia de por qué middleware está descartado. |

---

# 14. DUPLICACIONES Y DEUDA TÉCNICA

## 14.1 Fuentes de datos duplicadas — con la divergencia ya medida

Este es el hallazgo más accionable de la sección. Comparación literal entre `frontend-v2/extras.js` y `packages/core/src/cotizador/catalog.ts`:

**Obras adicionales — Legacy tiene 16, Moderno tiene 5.**

| Obra (Legacy `extrasOpcionales`) | `base` | valor | ¿En `ADDITIONAL_WORKS`? |
|---|---|---|---|
| Instalación eléctrica incl/materiales | `casa_m2` | $15.000/m² | 🔴 **No** |
| Instalación piso cerámico | `casa_m2` | $32.000/m² | 🔴 **No** |
| Servicio pintura con materiales | `casa_m2` | $15.000/m² | 🔴 **No** |
| Instalación sanitaria | `casa_m2` | $18.000/m² | 🔴 **No** |
| Artefactos cocina | manual | $850.000 | 🔴 **No** |
| Artefactos baño | manual | $750.000 | 🔴 **No** |
| Fosa séptica | manual | $1.500.000 | ✅ Sí (maxQty 5 → **3**) |
| Pozo profundo | manual | $50.000/m | ✅ Sí (maxQty 100 → **80**) |
| Cierre perimetral | `parcela_perimetro` | $2.000/m | ⚠️ Sí, pero **pierde el `base`**: en Legacy la cantidad se estima desde los m² de la parcela; en Moderno es manual (default 100 → **200**, min 20 → **50**, max 500 → **600**) |
| Portón acceso | manual | $1.200.000 | ⚠️ Sí, **con id renombrado** `porton` → `porton_acceso` (maxQty 3 → **2**) |
| Empalme eléctrico | manual | $1.500.000 | ✅ Sí (maxQty 3 → **2**) |
| Maquinaria retroexcavadora | manual | $42.000/hora | 🔴 **No** |
| Piscina | manual | $200.000/m² | 🔴 **No** |
| Quincho | manual | $250.000/m² | 🔴 **No** |
| Terraza | manual | $200.000/m² | 🔴 **No** |

**Lo más grave no es que falten 10 obras.** Es que el tipo `AdditionalWorkItem` de `@tpl/core` **no tiene campo `base`**. El legacy distingue tres modos de cantidad (`manual`, `casa_m2`, `parcela_perimetro`); el moderno solo tiene `manual`. Aunque se agregaran las 10 obras faltantes, **las 4 que se cobran por m² de casa no podrían calcularse correctamente.** Es un cambio de contrato, no de datos.

Fundaciones: los 3 valores ($60.000 / $95.000 / $140.000 por m²) **coinciden**, pero los ids cambiaron (`Instalacion_+_base_pilotes_madera` → `pilotes_madera`, etc.) y la empresa pasó de `"nogales"` a `"Nogales Constructora"`.

Modelos de casa: `casas.js` tiene 20 entradas con `valorCasa`; `catalog.ts` tiene 26 entradas con `id:`. **No se hizo un diff campo por campo de los 20/26 modelos** — **NO VERIFICADO**. Es una tarea explícita del backlog (P1-05).

## 14.2 Lógica duplicada

| Duplicación | Dónde | Estado |
|---|---|---|
| Fórmula Haversine | `@tpl/core/search.ts:distanceKm()` **exportada y reutilizada** por `presentation.ts:computeDistanceKm()` | ✅ **Bien resuelto** — una sola fórmula, documentada como decisión |
| Normalización de región | `presentation.ts:normalizeRegionName()` (moderno) y `js/index.js:normalizarRegion()` (legacy) | ⚠️ Duplicación inevitable durante la coexistencia. Cuando el legacy se retire, desaparece sola. |
| Heurísticas `payment`/`services` | `@tpl/core/search.ts` (regex `LEGACY_PAYMENT_PATTERN`/`LEGACY_SERVICES_PATTERN`) copiadas de `js/index.js:hasPayment/hasServices` | ⚠️ **Honestamente documentado como réplica REDUCIDA**: el legacy mira además `detalle`/`entorno`/`servicios` y flags booleanos que `Property` excluyó del contrato. **Los resultados de esos dos criterios de orden NO son idénticos entre versiones.** |
| Llamada al catálogo completo | 5 funciones distintas en `actions.ts` llaman a `searchProperties({intent:"property"})` | 🔴 E-04/E-05 |
| Llamada a `tpl_propietario_resumen_por_token_v1` | `getOwnerPortalViewModel()` y `getOwnerPropertySummary()` | 🔴 E-12 |
| Número de WhatsApp | 6 archivos | 🔴 E-15 |

## 14.3 Componentes / archivos duplicados o solapados

| Caso | Nota |
|---|---|
| `@tpl/ui PropertyImage` (`<img>` plano) **vs** `next/image` en `PropertyGallery` | ⚠️ **Dos estrategias de imagen en el mismo sitio.** Está justificado en el comentario de `PropertyGallery` (la galería es donde más rinde la optimización), pero significa que las cards **no** pasan por el optimizador de Next. Decisión consciente, anotada como riesgo de inconsistencia de rendimiento. |
| `House` (`search.ts`) **vs** `HouseModel` (`cotizador/types.ts`) | Dos tipos de casa en el mismo paquete. No es un error (uno es mínimo para el combo, otro completo para el cotizador), pero exige un adaptador que hoy no existe. |
| `SearchProjectCombinationCard` | Compuesta a mano porque no hay `ProjectCard` en `@tpl/ui`. Temporal declarada. |
| `PropertyLocationCard` | Sustituto temporal del mapa. |

## 14.4 Código legacy que todavía se usa

- **`frontend-v2/` entero** — sirve el 100 % del tráfico. No es deuda, es el estado del proyecto.
- **`frontend-v2/image/**`** — lo consume también el sitio nuevo. Ver R2.
- **`frontend-v2/parcelas.js`** — catálogo estático que el home legacy usa como respaldo y que no se sincroniza solo.

## 14.5 Código moderno que ya no se usa

| Archivo / símbolo | Evidencia |
|---|---|
| `packages/core/src/types.ts` → `TplSupabaseClientPlaceholder` | Exportado desde `index.ts`, nadie lo importa. Describe un contrato "provisional de Fase 1" ya reemplazado. |
| `apps/publico/lib/search/houseAdapter.ts` → `adaptCasasToHouses` | Exportado desde `lib/search/index.ts`, ningún consumidor. |
| `apps/publico/lib/propietario/actions.ts` → `getOwnerPropertySummary` | Sin consumidores. |
| `apps/publico/lib/propietario/actions.ts` → `updateOwnerProperty` | Sin consumidores. **No borrar sin decidir antes si se construye el formulario** (E-11). |
| `packages/{ai,automations,valuation/{land,house,shared}}` | 5 paquetes con un solo `export const *_PLACEHOLDER = true`. **Correctos como andamiaje**, pero hoy `turbo` los construye y typechequea en cada corrida sin aportar nada. |
| `packages/ui` → `InfraestructuraPlaceholder` | Solo lo usan las dos apps placeholder. |

## 14.6 Otras deudas

- **Sin ISR en ninguna ruta** (R10).
- **Sin tests ejecutables** (R4).
- **Sin ESLint** (R5).
- **Sin CI.** No hay `.github/workflows` en el repositorio.
- **Sin `middleware.ts`** — correcto por decisión (Opción A descartada), pero significa que no hay ningún punto de control de request en `apps/publico`.
- **`tsconfig.tsbuildinfo` versionados** (141 KB en `apps/business`, `apps/crm`; 172 KB en `apps/publico`) — artefactos de build en el árbol. Revisar `.gitignore`.

---

# 15. DECISIONES YA TOMADAS

**Estas decisiones están congeladas. No proponer cambiarlas sin señalar primero que son decisiones existentes y por qué se tomaron.**

## 15.1 Decisiones del dueño (Plan Maestro §20, 2026-09-10)

| # | Decisión | Estado hoy |
|---|---|---|
| 1 | **Publicador v1 y v2 se consolidan en uno solo.** No quedan dos publicadores paralelos. | Pendiente (Fase 8) |
| 2 | **Las tres versiones de TPL Studio no se eligen: se construye un Studio nuevo sobre el AI Gateway**, reutilizando piezas funcionales antes de descartar. | Pendiente (Fase 12) |
| 3 | **Tabla `parcelas` = `LEGACY — NO USAR — PENDIENTE DE RETIRO`.** Prohibido crear dependencias nuevas, escribir datos o usarla como fallback. No se elimina todavía. | ✅ Respetado: el sitio nuevo no la toca |
| 4 | **Los 4 CSS-alias muertos** (`global-tokens.css`, `tpl-design-system.css`, `tpl-brand-system.css`, `tpl-identity-seo.css`) **se mantienen** durante la migración. | ✅ Respetado |
| 5 | **El propietario mantiene el acceso por token.** No se introducen cuentas obligatorias. La cuenta opcional queda para una fase posterior. | ✅ Respetado: `/mi-parcela/[token]` |
| 6 | **Marketplace de partners va DESPUÉS de estabilizar el AI Gateway y TPL Studio.** | ✅ Respetado (no se construyó) |
| 7 | **`crear-pago-contratacion`/`flow-webhook-contratacion` = BLOQUEADOR OPERATIVO**, no decisión de negocio. | Pendiente (Prerequisito B) |

## 15.2 Decisiones de arquitectura ya aprobadas

| Decisión | Documento | Estado |
|---|---|---|
| **Monorepo pnpm + Turborepo**, tres apps Next.js independientes | Plan Maestro §3 | ✅ Implementado |
| **`packages/valuation` NO mezcla las fórmulas de terreno y casa.** Un motor por tipo de activo, `shared/` solo para infraestructura común. | Plan Maestro §3 | Pendiente (los 3 son placeholders) |
| **Un artefacto generado no cuenta como segunda implementación.** La copia Deno del motor se genera por script, nunca se edita a mano. | Plan Maestro §3 | ✅ Respetado |
| **Ninguna pantalla pública recalcula una tasación.** Solo se leen los valores persistidos. | Plan Maestro §2 y §5 | ✅ Respetado estrictamente en `normalizeProperty` |
| **Coexistencia = Opción D (híbrido).** Desarrollo aislado en proyecto Vercel propio con subdominio `noindex`; corte de tráfico con `vercel routes` (rollback instantáneo ya probado en vivo). **Middleware descartado** para esta migración. | `TPL-FASE-3-COEXISTENCIA-AUDITORIA.md` (aprobada 2026-09-10) | Aprobada, **no implementada** |
| **Búsqueda ≠ ranking.** `searchProperties()` decide pertenencia, `rankProperties()` decide orden. Ninguna sabe de la otra. | `TPL-FASE-3-SEARCH-ESPECIFICACION-FINAL.md` §1 | ✅ Implementado |
| **`services` y `payment` NO son filtros estructurados.** Solo encontrables por búsqueda textual; se conservan como criterios de ranking mediante heurística de texto libre. | Search spec §3.3 | ✅ Implementado |
| **No se agrega ningún campo a `Property`/`Property.characteristics`.** | Search spec §4 | ✅ Respetado |
| **No se implementa FTS ni PostGIS en esta etapa.** El motor es client-side/in-memory. | Search spec §4 | ✅ Respetado |
| **`casas.js` se mantiene intacto, no se migra a `tpl_casas`.** | Search spec, encabezado | ⚠️ Respetado en la letra (`casas.js` no se tocó) e **incumplido en el espíritu**: se copió su contenido dentro de `@tpl/core` |
| **`TPLPropertyCard.js` no se porta ni se reconcilia.** Se usa el `PropertyCard` de `@tpl/ui`. | Fase 3 §Q-1 | ✅ Respetado |
| **El score de `property-analyzer.js` no se migra ni se recalcula.** Es capa comercial/marketing separada de la tasación. | Fase 3 §Q-2 | ✅ Respetado |
| **Las imágenes conservan sus URLs actuales.** No se migran a Storage todavía ni se inventan rutas nuevas. | Fase 3 §Q-3 | ✅ Respetado (rewrite en vez de copia) |
| **El ribbon de comunas empieza específico de `apps/publico`**, no como componente de `@tpl/ui`; se extrae solo si demuestra reutilización. | Fase 3 §Q-4 | ✅ Respetado |
| **Mapa: lazy loading obligatorio.** Sin Leaflet en el primer render. | Fase 3 §Q-5 | ✅ Respetado (`dynamic({ssr:false})` en `ParcelMapPicker`) |
| **Video: lazy/interactivo, nunca autoplay incondicional.** | Fase 3 §Q-6 | ✅ Respetado (no hay video) |
| **`@tpl/core` no lee variables de entorno por su cuenta.** Cada consumidor le pasa `url`/`anonKey`. | `supabaseClient.ts` | ✅ Implementado |
| **`@tpl/core` no importa `frontend-v2` en ningún caso.** | `houseAdapter.ts` | ✅ Respetado literalmente |
| **El experimento Fase 3-A/3-B fue revertido por completo** (middleware, Edge Config, reglas de ruta). Lo único que sobrevive es el conocimiento técnico. | Fase 3, nota del experimento | ✅ Revertido |
| **Bloque 1 — Data Foundation está aprobado y cerrado.** No se reabre. | Fase 3 §Q-8 | ✅ |
| **`subtype` se mantiene en `null` siempre en esta fase.** No se migran ni rellenan datos históricos. | Bloque 1.2, regla | ✅ Implementado |
| **El formateo de precio es responsabilidad del adaptador, no de `Property`.** `priceDisplay` no se agrega al dominio. | `normalizeProperty.ts:326-333` | ✅ Respetado — con una discrepancia entre bloques documentada y pendiente de decisión del dueño |
| **`JSON-LD` de la ficha usa `Product`, no un tipo inmobiliario**, porque soporta `offers.price` sin exigir `streetAddress`, que no se tiene con confianza. | `[codigo]/page.tsx:99-104` | ✅ Implementado — marcado en §12 como regresión a revisar, **no como error a corregir en silencio** |

## 15.3 Decisiones implícitas del código (no documentadas como decisión formal)

Estas **no** están registradas como decisiones del dueño. Se consignan aquí porque un agente futuro las encontrará y podría creer que sí lo son:

1. **El sitio nuevo no escribe nada en Supabase.** Todos los formularios terminan en WhatsApp. Es un patrón repetido en 4 lugares y documentado archivo por archivo como "fuera del alcance autorizado de este bloque". **Es una consecuencia acumulada de límites de alcance, no una decisión de producto.** Debe elevarse a decisión explícita.
2. **El catálogo de casas se copió a `@tpl/core`.** No hay documento que lo apruebe; los documentos disponibles dicen lo contrario.
3. **El catálogo territorial se hardcodeó** en `territoryCatalog.ts` en vez de leerse de `tpl_geoint_*`.
4. **No se configuró ISR en ninguna ruta**, pese a que el Plan Maestro §5 lo exige explícitamente para Fase 3.

---

# 16. LO QUE NO SE DEBE HACER

Lista de cambios peligrosos, con la razón concreta en este repositorio.

| # | No hacer | Por qué |
|---|---|---|
| 1 | **No reemplazar Supabase por datos locales** en ninguna ruta del sitio nuevo. | `tpl_propiedades` es la única fuente de verdad. Ya hay un precedente doloroso: `frontend-v2/parcelas.js` se desincroniza y muestra precios viejos. |
| 2 | **No crear una tercera fuente de verdad para las casas.** | Ya hay dos (`casas.js` y `catalog.ts`). Antes de tocar el cotizador, resolver cuál gana. |
| 3 | **No borrar `frontend-v2/image/` ni el rewrite `/legacy-image/`** hasta que las 184 filas de `tpl_propiedad_imagenes` apunten a Storage y estén verificadas una por una. | Deja el 96,8 % del catálogo sin fotos, **en ambos sitios**. |
| 4 | **No cambiar el Root Directory ni el Framework Preset del proyecto Vercel de producción (`tpl-prueba-nueva`).** | Hoy es un sitio estático "Other" con Root Directory `frontend-v2`. Cambiarlo altera qué `vercel.json` se aplica, y con ello la cabecera `Cross-Origin-Resource-Policy` de la que depende la arquitectura de imágenes del sitio nuevo. |
| 5 | **No apuntar `www.parcelalista.cl` al proyecto nuevo** sin ejecutar antes la Prueba técnica de coexistencia y el rollback real. | Plan Maestro §4: el cambio de dominio requiere 5 condiciones en orden y una aprobación explícita propia. **Ninguna aprobación anterior lo incluye.** |
| 6 | **No implementar middleware de Next.js como mecanismo de coexistencia.** | Descartado formalmente. Dos razones verificadas: el proyecto de producción no es Next.js, y el middleware no se ejecuta bajo el modo de despliegue `builds` legacy. |
| 7 | **No cambiar el esquema de Supabase para acomodar el frontend nuevo.** | Plan Maestro §6: "servicios Supabase: NO TOCAR". Ninguna fase de este plan cambia el modelo de datos salvo declaración explícita. |
| 8 | **No usar `service_role` en `apps/publico`**, en ninguna variable, en ninguna fase. | Plan Maestro §14, primer ítem del checklist de seguridad. `createSupabasePublicClient` está documentado para esto. |
| 9 | **No hacer `.from('tpl_actores').update(...)` ni `.from('tpl_proyectos').update(...)` desde el navegador.** | RLS habilitado con **cero policies**: afecta 0 filas **en silencio**, incluso siendo staff. Obliga a RPC `security definer`. |
| 10 | **No hacer ningún `update`/`delete` sin `.select('id')`.** | Sin representación, Supabase responde 200 / `error: null` con 0 filas afectadas. Este bug exacto ya causó el "eliminar no elimina" del CRM. |
| 11 | **No portar `analytics-tracker.js` tal cual.** | Solo cubre el home y el 100 % de sus eventos llega sin `parcela_id`, lo que deja vacío el módulo "Asesor Espía" del CRM. Reconstruir bien, no copiar. |
| 12 | **No portar `saveLead()` tal cual.** | Llama a `tpl_registrar_lead_v1`, que devuelve 404 en producción, con fallback a una tabla inexistente. Sanear la RPC primero. |
| 13 | **No recalcular la tasación en ninguna pantalla pública.** | Regla de oro del Plan Maestro, repetida en §2, §5 y Fase 3. La ficha pública es anónima y no puede leer `tpl_geoint_propiedad_contexto`; recalcular ahí daría un número inventado. |
| 14 | **No migrar el score de `property-analyzer.js` ni `tpl-market-intelligence.js`.** | Decisiones tomadas: el primero es capa comercial fuera de alcance; el segundo solo cubre 9 comunas hardcodeadas. |
| 15 | **No reescribir migraciones ya aplicadas.** | El historial no siempre coincide con producción (varias se editaron en el SQL Editor). Reescribir una aplicada produce divergencia silenciosa. |
| 16 | **No pegar una migración larga esperando que falle solo la parte mala.** | El SQL Editor de Supabase corre el script como **una transacción implícita**: si cualquier statement falla, TODO se revierte. El fix es corregir y correr el archivo COMPLETO de nuevo. |
| 17 | **No usar `CREATE OR REPLACE VIEW` sobre una vista con `tabla.*` o con cambio de tipo.** | Falla con `42P16`. Y `DROP VIEW` **no conserva los `GRANT`/`REVOKE` explícitos** — hay que repetir el `revoke` después de recrear. |
| 18 | **No eliminar `vercel.json` de la raíz ni `vercel.preview.json`** sin confirmar antes qué proyecto Vercel los lee. | Hoy parecen inertes, pero la evidencia es indirecta. |
| 19 | **No agregar campos a `Property` o a `Property.characteristics`** sin aprobación. | Decisión explícita de la especificación de Search. Un campo que necesita filtrarse debe promoverse conscientemente, no añadirse de paso. |
| 20 | **No meter filtrado dentro de `rankProperties()`.** | Revierte el principio arquitectónico central de Search Core. El legacy lo hace con `opportunity` y está documentado como divergencia deliberada. |
| 21 | **No borrar `updateOwnerProperty()`** antes de decidir si se construye el formulario del propietario. | Es la única puerta ya escrita hacia la escritura del portal. |
| 22 | **No expandir TPL Studio ni una función más** sobre la implementación actual de `veo-generar-video`. | Prerequisito crítico A. `verify_jwt: false`, sin autorización, con `GEMINI_API_KEY` del servidor: cualquier visitante puede generar video facturado a TPL. |
| 23 | **No desplegar `crear-pago-contratacion`/`flow-webhook-contratacion` sin auditarlas** con el mismo criterio que se aplicó a `veo-generar-video`. | Plan Maestro §14. |
| 24 | **No asumir que un archivo leído hace rato sigue igual.** | Hay trabajo concurrente confirmado en este repositorio (§ "Cómo leer este documento", punto 4). Re-stagear antes de editar. |

---

# 17. BACKLOG REAL

Formato por tarea: **tarea · motivo · archivos afectados · dependencias · criterio de terminado.**

## P0 — Bloquea producción

### P0-01 · Definir `NEXT_PUBLIC_SITE_URL` y fallar el build si falta
- **Motivo:** hoy todo canonical, OG, Twitter y el sitemap completo apuntan a `http://localhost:3000` (E-01). Si esa build se indexa, el daño de SEO es inmediato y difícil de revertir.
- **Archivos:** `apps/publico/lib/seo/site.ts`; variables de entorno del proyecto Vercel `tpl-publico-preview`.
- **Dependencias:** ninguna.
- **Terminado cuando:** `curl` sobre el deployment de preview devuelve un `<link rel="canonical">` con el dominio real, y un build sin la variable definida falla con un mensaje claro en vez de caer a localhost.

### P0-02 · Activar revalidación en Home y sitemap
- **Motivo:** ambas rutas son `○ Static` sin `revalidate` (E-02, E-03). Una parcela publicada no aparece nunca sin redeploy. Contradice el Plan Maestro §5, que exige SSG **+ ISR**.
- **Archivos:** `apps/publico/app/page.tsx`, `apps/publico/app/sitemap.ts`; evaluar `app/search-demo/page.tsx`.
- **Dependencias:** ninguna.
- **Terminado cuando:** publicar una parcela de prueba en Supabase la hace aparecer en `/` y en `/sitemap.xml` dentro del intervalo configurado, sin redeploy. Verificado con una parcela real.

### P0-03 · Sanear los 3 RPC rotos
- **Motivo:** `tpl_registrar_lead_v1`, `tpl_actualizar_uf_v1` y `manifestar_interes` devuelven 404 en producción. **Bloquean toda la recuperación de la captación** (P1-01, P1-02) y hoy están perdiendo leads en el sitio legacy.
- **Archivos:** `supabase/migrations/` (migración nueva); `frontend-v2/js/core/tpl-data-service.js:419,663`; `plataforma/tpl-business-v2/modules/partner-oportunidades/index.js:85`.
- **Dependencias:** ninguna. **Es la única tarea P0 que toca Supabase** — requiere autorización explícita del dueño según Plan Maestro §6.
- **Terminado cuando:** las 3 RPC responden correctamente contra producción, `tpl-data-service.js` deja de caer a la cola de `localStorage`, y se verifica que un lead de prueba llega a `tpl_oportunidades`.

### P0-04 · Decisión de producto: ¿el sitio nuevo escribe o no escribe?
- **Motivo:** no es una tarea de código, es la decisión que desbloquea todo el resto. Hoy la ausencia de escrituras es una consecuencia acumulada de límites de alcance, no una decisión. Mover tráfico sin resolverla apaga la captación.
- **Archivos:** ninguno — documento de decisión en `docs/`.
- **Dependencias:** ninguna. Requiere al dueño.
- **Terminado cuando:** existe una decisión escrita sobre qué formularios del sitio nuevo deben persistir en Supabase antes del corte de tráfico, y cuáles pueden seguir en WhatsApp.

## P1 — Funcionalidad importante

### P1-01 · Persistir el lead de "Agendar visita"
- **Motivo:** L-01. Es la conversión principal de la ficha.
- **Archivos:** `apps/publico/components/property/ScheduleVisitDialog.tsx`, nuevo `apps/publico/lib/leads/actions.ts`.
- **Dependencias:** P0-03, P0-04.
- **Terminado cuando:** enviar el formulario crea una fila real en la tabla que decida P0-03, **antes** de abrir WhatsApp, y el flujo sigue funcionando si la escritura falla (nunca bloquear el WhatsApp). Incluir el campo **fecha preferida**, que el legacy sí captura.

### P1-02 · Persistir la oportunidad del cotizador
- **Motivo:** L-02. Esta sí funciona en Legacy (`tpl_registrar_oportunidad_publica_v1`), así que es una pérdida neta real.
- **Archivos:** `apps/publico/components/cotizador/CotizadorWizard.tsx`, `lib/cotizador/actions.ts` (nuevo).
- **Dependencias:** P0-04.
- **Terminado cuando:** completar el cotizador crea la oportunidad y (opcionalmente) dispara `enviar-resumen-cotizacion`, verificado en el CRM.

### P1-03 · Alinear la precedencia de `recommendedValue`
- **Motivo:** E-06. Viola el criterio de aceptación "cero discrepancias de cifras" del Plan Maestro §18.
- **Archivos:** `packages/core/src/normalizeProperty.ts:190-204`, `packages/core/src/__tests__/normalizeProperty.fixtures.ts`.
- **Dependencias:** ninguna.
- **Terminado cuando:** para las 32-33 propiedades reales, los tres valores mostrados en `/propiedades/[codigo]` coinciden exactamente con los de `parcela.html?id=`, verificados **una por una** (es exactamente lo que exige el Plan Maestro para Fase 4).

### P1-04 · Encender el modo "project" del buscador
- **Motivo:** E-07. El motor está portado, probado y apagado. Es una función de producto diferenciadora ("combo de presupuesto terreno+casa") que el Plan Maestro y la auditoría de Fase 3 identifican explícitamente como valiosa.
- **Archivos:** `apps/publico/components/search/SearchWidget.tsx`, `SearchResults.tsx`, `lib/search/actions.ts`; adaptador `HouseModel → House`.
- **Dependencias:** P1-05 (decidir la fuente de casas primero, para no consolidar la duplicación).
- **Terminado cuando:** buscar con un presupuesto devuelve combinaciones reales, con el mismo margen de ±$5.000.000 y máximo 6 resultados del legacy.

### P1-05 · Resolver la doble fuente de verdad del catálogo de casas
- **Motivo:** R1 / D-01 / §14.1. Ya hay divergencia medida. Cada día que pasa la brecha crece.
- **Archivos:** `packages/core/src/cotizador/catalog.ts`, `frontend-v2/casas.js`, `frontend-v2/extras.js`, `apps/publico/lib/search/houseAdapter.ts`.
- **Dependencias:** decisión del dueño sobre cuál es la canónica. Tres opciones honestas: (a) `casas.js` sigue siendo canónica y `catalog.ts` se genera desde ella con un script (patrón ya usado para el motor Deno); (b) `catalog.ts` pasa a ser canónica y se genera `casas.js` desde ella; (c) ambas se reemplazan por `tpl_casas` en Supabase — **opción explícitamente descartada** por la especificación de Search.
- **Terminado cuando:** existe **un solo lugar** donde se edita el precio de una casa, y cambiarlo se refleja en ambos sitios. Además: las 11 obras faltantes están resueltas o explícitamente descartadas, y el campo `base` (`casa_m2` / `parcela_perimetro`) existe en `AdditionalWorkItem` o se documenta por qué no.

### P1-06 · Memoizar las consultas al catálogo
- **Motivo:** E-04, E-05. 6 round-trips por visita a `/propiedades`.
- **Archivos:** `apps/publico/lib/search/actions.ts`, `lib/search/supabaseSearchRepository.ts`.
- **Dependencias:** ninguna.
- **Terminado cuando:** una visita a `/propiedades` produce **una** consulta a `tpl_propiedades` y **una** a `tpl_propiedad_imagenes`, verificado con logging del lado servidor (mismo método con el que se descubrió la duplicación en `getPropertyDetail`).

### P1-07 · Recuperar el JSON-LD del sitio y revisar el tipo de schema de la ficha
- **Motivo:** L-23, L-24, E-09.
- **Archivos:** `apps/publico/app/layout.tsx` o `app/page.tsx`; `app/propiedades/[codigo]/page.tsx`.
- **Dependencias:** P0-01 (el JSON-LD lleva URLs).
- **Terminado cuando:** la Home emite `RealEstateAgent` + `WebSite`/`SearchAction` equivalentes a los de `index.html`, y se tomó una decisión explícita y documentada sobre `Product` vs `RealEstateListing` en la ficha.

### P1-08 · Tabla de redirects 301 y `/design-system` fuera del índice
- **Motivo:** E-10, E-08. Plan Maestro §13 exige una tabla de redirects revisada **antes de cada fase que toque rutas públicas**.
- **Archivos:** `apps/publico/next.config.mjs`, `apps/publico/app/robots.ts`, nuevo `docs/TPL-REDIRECTS.md`.
- **Dependencias:** ninguna.
- **Terminado cuando:** existe el documento con el mapeo completo Legacy→Moderno, los 301 están implementados y `/design-system` está bloqueado.

### P1-09 · Formulario de edición del portal del propietario
- **Motivo:** E-11, L-22. La acción ya está escrita; falta la UI. Es la funcionalidad de mayor valor por menor esfuerzo del backlog.
- **Archivos:** `apps/publico/app/mi-parcela/[token]/page.tsx`, nuevo componente cliente, `lib/propietario/actions.ts`.
- **Dependencias:** ninguna (la RPC existe y funciona).
- **Terminado cuando:** un propietario puede editar los mismos 11 campos que edita en `mi-parcela.html` y el cambio se ve en el CRM. **Recordar el efecto secundario conocido:** editar el precio por el portal **no** actualiza `frontend-v2/parcelas.js`; hay que correr `scripts/sincronizar-catalogo-publico.mjs`.

## P2 — Mejora

### P2-01 · Consultar `tpl_propiedad_videos` en el repositorio
- **Motivo:** L-10. `repository.ts` pasa `video: null` incondicionalmente y lo documenta como alcance pendiente, no como olvido.
- **Archivos:** `packages/core/src/repository.ts`, `apps/publico/app/propiedades/[codigo]/page.tsx`.
- **Dependencias:** ninguna.
- **Terminado cuando:** una propiedad con video `publicado_en_parcela = true` lo muestra en la ficha, con el mismo gate de visibilidad que aplica el legacy.

### P2-02 · Centralizar el número de WhatsApp
- **Motivo:** E-15. `.env.example` ya declara `NEXT_PUBLIC_WHATSAPP_PHONE` y ningún archivo la usa.
- **Archivos:** los 6 listados en E-15 + nuevo `apps/publico/lib/contact.ts`.
- **Terminado cuando:** `grep -rn "56988508361" apps/publico` devuelve 0 resultados.

### P2-03 · Limpiar el código muerto
- **Motivo:** E-12, E-13, E-14. Código con documentación extensa que describe una arquitectura que ya no es la real confunde al siguiente agente más que la ausencia de documentación.
- **Archivos:** `packages/core/src/types.ts` (+ su export), `apps/publico/lib/search/houseAdapter.ts`, `lib/propietario/actions.ts:getOwnerPropertySummary`.
- **Dependencias:** P1-04 decide el destino de `houseAdapter.ts`.
- **Terminado cuando:** cada símbolo exportado del monorepo tiene al menos un consumidor, o una nota explícita de por qué se conserva.

### P2-04 · Configurar ESLint
- **Motivo:** E-17. `turbo.json` define `lint` y no hay configuración.
- **Archivos:** `packages/config/` (nuevo `eslint.config.mjs`), `apps/*/package.json`.
- **Terminado cuando:** `pnpm next:lint` corre sin errores de configuración en los 3 apps.

### P2-05 · Hacer ejecutables los tests
- **Motivo:** R4, E-18. Hay 8 `*.test.ts` + 2 `*.smoke.ts` (incluidos `search.test.ts` de 23.844 bytes y `presentation.test.ts` de 15.484 bytes) que nadie corre.
- **Archivos:** `turbo.json` (tarea `test`), `package.json` de cada workspace.
- **Dependencias:** decisión sobre si se acepta instalar un runner. **Nota importante:** la ausencia de Vitest/Jest es deliberada y está documentada (`repository.smoke.ts`). Proponer instalarlo **es cambiar una decisión existente** y debe plantearse como tal. Alternativa sin dependencias nuevas: `node --test` sobre los archivos compilados con `tsc`.
- **Terminado cuando:** un solo comando ejecuta los 10 archivos y reporta resultados.

### P2-06 · Renumerar la migración duplicada
- **Motivo:** E-16.
- **Archivos:** uno de los dos `20260910020000_*.sql`.
- **Dependencias:** confirmar cuál ya se aplicó en producción antes de renombrar.

### P2-07 · Recuperar el "Radar de Mercado TPL"
- **Motivo:** L-08. Es una pieza de negocio, no de UI.
- **Archivos:** `apps/publico/components/search/SearchResults.tsx`.
- **Dependencias:** ninguna.
- **Terminado cuando:** el empty state con filtros activos muestra el copy del Radar y el CTA a WhatsApp con el mismo mensaje del legacy.

### P2-08 · Recuperar el botón "Hacer oferta" y el link a TPL Business
- **Motivo:** L-06, L-26. Dos recuperaciones de una línea cada una.
- **Archivos:** `app/propiedades/[codigo]/page.tsx`, `components/layout/siteNav.ts`.

### P2-09 · Paginación del catálogo
- **Motivo:** L-19. Con 33 propiedades no duele; el legacy traía hasta 300.
- **Archivos:** `components/search/SearchResults.tsx`, `searchState.ts`.

### P2-10 · Definir la estrategia de tracking del sitio nuevo
- **Motivo:** L-09 y §11. Antes de mover tráfico hay que saber si las etiquetas de GTM siguen disparando.
- **Archivos:** ninguno del repo — auditoría en la consola de GTM + eventual `dataLayer.push` en el sitio nuevo.
- **Dependencias:** acceso a GTM.
- **Terminado cuando:** existe un documento que lista cada etiqueta de `GTM-WK4M33H4`, si depende del DOM/URL de `frontend-v2`, y qué hay que cambiar.

## P3 — Limpieza

| ID | Tarea | Archivos |
|---|---|---|
| P3-01 | Migrar los hex inline a tokens de `@tpl/ui` (E-22) | `CotizadorWizard.tsx` (74), `mi-parcela/[token]/page.tsx` (42), `campo-chileno/page.tsx` (35) |
| P3-02 | Resolver `internalAccessHref="#crm"` (E-23) | `SiteChrome.tsx` |
| P3-03 | Optimizar o eliminar `opengraph-image.png` / `twitter-image.png` (633 KB c/u) y resolver la contradicción con el comentario de `layout.tsx` (E-25) | `apps/publico/app/` |
| P3-04 | Verificar `prefers-reduced-motion` en el ribbon (E-26) | `communeRibbon.css.ts` |
| P3-05 | Sacar los `tsconfig.tsbuildinfo` del árbol | `.gitignore` |
| P3-06 | Documentar que `vercel.json` (raíz) y `vercel.preview.json` son inertes (E-19, E-20) | ambos archivos |
| P3-07 | Añadir los puntos 15.3 (decisiones implícitas) al Plan Maestro como decisiones formales o revertirlos | `docs/TPL-MASTER-MIGRATION-PLAN.md` |

---

# 18. PLAN DE CONTINUACIÓN

20 acciones concretas, ordenadas por dependencia. **No propone rehacer arquitectura**: la arquitectura existente es buena y está bien documentada. El problema no es cómo está construido lo que hay; es lo que falta y lo que se duplicó.

### Fase A — Corregir bloqueadores (acciones 1-5)

1. **Definir `NEXT_PUBLIC_SITE_URL`** en el proyecto Vercel de preview y hacer que el build falle sin ella. *(P0-01)*
2. **Activar `revalidate` en `/` y `/sitemap.xml`.** *(P0-02)*
3. **Verificar con una parcela real** que publicarla la hace aparecer en la Home y en el sitemap sin redeploy. Es la prueba de que 2 funcionó.
4. **Llevar al dueño la decisión de escritura** (P0-04) junto con la evidencia de §10.1: hoy el sitio nuevo no captura ni un lead.
5. **Sanear los 3 RPC rotos** en una migración propia, con autorización explícita. *(P0-03)*

### Fase B — Recuperar funcionalidades perdidas de conversión (6-9)

6. **Persistir el lead de "Agendar visita"** con campo de fecha. *(P1-01)*
7. **Persistir la oportunidad del cotizador** y disparar `enviar-resumen-cotizacion`. *(P1-02)*
8. **Recuperar "Hacer oferta", el Radar de Mercado y el link a TPL Business.** Tres cambios pequeños, alto retorno. *(P2-07, P2-08)*
9. **Construir el formulario de edición del portal del propietario** sobre la acción ya escrita. *(P1-09)*

### Fase C — Completar la migración (10-13)

10. **Resolver la doble fuente de verdad de las casas**, incluyendo el campo `base` de las obras. *(P1-05)* — hacerlo **antes** de 11, para no consolidar la duplicación.
11. **Encender el modo "project"** del buscador. *(P1-04)*
12. **Consultar `tpl_propiedad_videos`** y mostrar el video en la ficha. *(P2-01)*
13. **Decidir el destino de `/proyecto`** (la única página pública legacy sin equivalente ni decisión registrada): migrar, retirar o posponer explícitamente.

### Fase D — Verificar datos (14-15)

14. **Alinear la precedencia de `recommendedValue`** y **verificar las 32-33 propiedades una por una**, comparando las cifras de `/propiedades/[codigo]` contra `parcela.html?id=`. Es literalmente el criterio de aceptación de la Fase 4 del Plan Maestro. *(P1-03)*
15. **Verificar las 190 imágenes**: que cada una resuelva a un HTTP 200 real desde el sitio nuevo, y anotar cuáles son las 18 repetidas para corregirlas a nivel de contenido.

### Fase E — Verificar UX (16)

16. **Revisión visual y de accesibilidad en navegador real** de las 14 rutas públicas, en desktop y móvil, comparando lado a lado con la página legacy equivalente. **Esta auditoría no lo pudo hacer** y es un vacío real: todo lo dicho en §9 es estructural, no visual.

### Fase F — Analytics y SEO (17-18)

17. **Auditar el contenedor GTM** y documentar qué etiquetas dependen del DOM o de las URLs de `frontend-v2`. *(P2-10)*
18. **Tabla de redirects 301, JSON-LD del sitio, `/design-system` fuera del índice.** *(P1-07, P1-08)*

### Fase G — Limpieza (19)

19. **Borrar el código muerto, configurar ESLint y hacer ejecutables los tests.** *(P2-03, P2-04, P2-05)*

### Fase H — Optimización (20)

20. **Memoizar las consultas al catálogo** y evaluar `generateStaticParams` + ISR para las fichas. *(P1-06)*

> **Y solo después de las 20:** implementar la coexistencia aprobada (subdominio `noindex` + `vercel routes`), probar el rollback **realmente**, y recién ahí pedir la autorización específica del dueño para el corte de tráfico. El Plan Maestro §4 es taxativo: ninguna aprobación anterior incluye ese paso.

---

# 19. CHECKLIST FINAL

Checklist operativo para el siguiente agente. Marcar a medida que se completa.

## Antes de tocar nada

- [ ] Leer `docs/TPL-MASTER-MIGRATION-PLAN.md` §5, §6, §14 y §20 (decisiones congeladas)
- [ ] Leer `docs/TPL-FASE-3-COEXISTENCIA-AUDITORIA.md` (la decisión de coexistencia ya está tomada)
- [ ] Leer `docs/TPL-FASE-3-SEARCH-ESPECIFICACION-FINAL.md` (el contrato de Search está congelado)
- [ ] Leer la §16 de este documento ("Lo que no se debe hacer") completa
- [ ] Re-listar `supabase/migrations/` para ver si hay migraciones nuevas
- [ ] Re-leer cualquier archivo antes de editarlo — hay trabajo concurrente confirmado

## P0 — Bloqueadores

- [ ] Definir `NEXT_PUBLIC_SITE_URL` en el proyecto Vercel de preview
- [ ] Hacer que el build falle si `NEXT_PUBLIC_SITE_URL` falta en producción
- [ ] Agregar `export const revalidate` a `app/page.tsx`
- [ ] Agregar `export const revalidate` a `app/sitemap.ts`
- [ ] Verificar con una parcela real que aparece sin redeploy
- [ ] Presentar al dueño la decisión "¿el sitio nuevo escribe o no escribe?"
- [ ] Sanear `tpl_registrar_lead_v1` (404 en producción)
- [ ] Sanear `tpl_actualizar_uf_v1` (404 en producción)
- [ ] Sanear `manifestar_interes` → `tpl_partner_manifestar_interes_v1(p_match_id, p_mensaje)`
- [ ] Verificar que `tpl-data-service.js` deja de caer a la cola de `localStorage`

## P1 — Funcionalidad

- [ ] Persistir el lead de "Agendar visita" antes de abrir WhatsApp
- [ ] Agregar el campo "fecha preferida" al diálogo de visita
- [ ] Persistir la oportunidad del cotizador (`tpl_registrar_oportunidad_publica_v1`)
- [ ] Disparar `enviar-resumen-cotizacion` desde el cotizador nuevo
- [ ] Decidir la fuente canónica del catálogo de casas (`casas.js` vs `catalog.ts`)
- [ ] Agregar el campo `base` (`manual`/`casa_m2`/`parcela_perimetro`) a `AdditionalWorkItem`
- [ ] Resolver las 11 obras adicionales faltantes (agregar o descartar explícitamente)
- [ ] Hacer un diff campo por campo de los 20 modelos de `casas.js` vs las 26 entradas de `catalog.ts`
- [ ] Encender el modo "project" del buscador
- [ ] Alinear la precedencia de `recommendedValue` con `js/parcela.js:valoracionGuardada()`
- [ ] Verificar las 32-33 propiedades una por una (cifras Legacy vs Moderno)
- [ ] Memoizar `searchProperties()` con `React.cache()`
- [ ] Construir el formulario de edición del portal del propietario
- [ ] Recuperar el JSON-LD `RealEstateAgent` + `WebSite`/`SearchAction` de la Home
- [ ] Decidir `Product` vs `RealEstateListing` para la ficha (y documentarlo)
- [ ] Crear `docs/TPL-REDIRECTS.md` con el mapeo completo Legacy→Moderno
- [ ] Implementar el 301 de `/politica-privacidad.html` → `/privacidad`
- [ ] Agregar `/design-system` al `disallow` de `robots.ts`

## P2 — Mejoras

- [ ] Consultar `tpl_propiedad_videos` con gate `publicado_en_parcela = true`
- [ ] Centralizar el número de WhatsApp en `lib/contact.ts` usando `NEXT_PUBLIC_WHATSAPP_PHONE`
- [ ] Borrar `TplSupabaseClientPlaceholder` y su export
- [ ] Borrar `getOwnerPropertySummary()` (duplicada)
- [ ] Decidir el destino de `adaptCasasToHouses()`
- [ ] Crear `packages/config/eslint.config.mjs`
- [ ] Añadir una tarea `test` ejecutable a `turbo.json`
- [ ] Renumerar una de las dos migraciones `20260910020000_*`
- [ ] Recuperar el empty state "Radar de Mercado TPL"
- [ ] Recuperar el botón "Hacer oferta"
- [ ] Agregar TPL Business a `siteNav.ts`
- [ ] Implementar paginación en el catálogo
- [ ] Auditar el contenedor GTM `GTM-WK4M33H4` y documentar dependencias del DOM/URL

## P3 — Limpieza

- [ ] Migrar los 74 hex de `CotizadorWizard.tsx` a tokens
- [ ] Migrar los 42 hex de `mi-parcela/[token]/page.tsx` a tokens
- [ ] Migrar los 35 hex de `campo-chileno/page.tsx` a tokens
- [ ] Resolver `internalAccessHref="#crm"`
- [ ] Optimizar/eliminar `opengraph-image.png` y `twitter-image.png` (633 KB c/u)
- [ ] Verificar `prefers-reduced-motion` en `communeRibbon.css.ts`
- [ ] Sacar los `tsconfig.tsbuildinfo` del control de versiones
- [ ] Documentar que `vercel.json` (raíz) y `vercel.preview.json` son inertes
- [ ] Elevar a decisión formal (o revertir) los 4 puntos de §15.3

## Verificación antes de cualquier corte de tráfico

- [ ] Revisión visual de las 14 rutas públicas en navegador real, desktop y móvil
- [ ] Core Web Vitals medidos y comparados contra `frontend-v2`
- [ ] Las 190 imágenes verificadas con HTTP 200 real desde el sitio nuevo
- [ ] Subdominio de prueba con `noindex` configurado
- [ ] `vercel routes` configurado y **rollback probado realmente**, no solo documentado
- [ ] Aprobación explícita y separada del dueño para el cambio de dominio

## Prerequisitos críticos del Plan Maestro (independientes, siguen abiertos)

- [ ] **Prerequisito A:** cerrar la seguridad de `veo-generar-video` / `veo-consultar-video` (10 puntos del checklist de Plan Maestro §14)
- [ ] **Prerequisito B:** auditar y desplegar `crear-pago-contratacion` y `flow-webhook-contratacion`

---

# PRÓXIMA TAREA RECOMENDADA

## Definir `NEXT_PUBLIC_SITE_URL` en el proyecto Vercel `tpl-publico-preview`, y hacer que el build falle si esa variable falta.

**Qué hay que cambiar exactamente:**

1. En Vercel, proyecto `tpl-publico-preview`, agregar la variable de entorno `NEXT_PUBLIC_SITE_URL` con el dominio real del entorno de preview.
2. En `apps/publico/lib/seo/site.ts`, reemplazar el fallback silencioso:

```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
```

por una versión que solo acepte el fallback en desarrollo y lance en cualquier otro entorno, de modo que un build de producción sin la variable **falle en el build, no en el índice de Google**.

**Por qué esta y no otra:**

Es la única tarea del backlog donde **no hacerla no deja las cosas como están, sino que empeora con el tiempo**. Hoy, cualquier build de `apps/publico` genera:

- un `<link rel="canonical" href="http://localhost:3000/...">` en cada página,
- etiquetas Open Graph y Twitter apuntando a localhost,
- y un `/sitemap.xml` completo —las 8 URLs fijas **más una entrada por cada parcela publicada**— con todas sus URLs apuntando a `http://localhost:3000`.

Mientras el proyecto de preview no tenga dominio y nadie lo visite, eso es inofensivo. Pero la decisión de coexistencia ya aprobada (Opción D) empieza precisamente por **asignar un subdominio de prueba a ese proyecto**. En el momento exacto en que ese subdominio exista, el sitio queda publicado con canonicals rotos y un sitemap que le declara a Google que el contenido canónico de Tu Parcela Lista vive en `localhost`. Un canonical incorrecto no es un bug que se arregla y desaparece: es una señal que Google ya procesó y que tarda semanas en corregirse.

Cuesta menos de treinta minutos. Es la única tarea que **desbloquea** el siguiente paso del plan aprobado en vez de competir con él. Y protege el activo más difícil de recuperar del proyecto: el posicionamiento orgánico de `www.parcelalista.cl`, que es exactamente lo que el criterio de aceptación del Plan Maestro §13 y §18 pone como condición para dar cualquier fase por terminada.

Después de esa tarea, el orden es el de §18: revalidación de la Home y el sitemap (P0-02), y la decisión de producto sobre escritura (P0-04), que es la que determina si el sitio nuevo puede recibir tráfico sin apagar la captación.

---

*Fin del reporte. Producido el 2026-09-12 mediante inspección directa del repositorio. Las afirmaciones marcadas NO VERIFICADO requieren acceso a un navegador, a la consola de GTM, o a una consulta viva a Supabase — ninguno disponible en la sesión que lo generó.*
