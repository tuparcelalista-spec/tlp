# TPL — Plan Maestro de Migración a Next.js

**Estado: FASE 0 AUDITADA Y APROBADA — plan corregido y congelado con las decisiones del dueño del 2026-09-10. Ninguna fase de código se ha ejecutado.**
Este documento combina la auditoría de arquitectura actual, el diseño de arquitectura objetivo, y el informe de auditoría de Fase 0 (`docs/TPL-FASE-0-AUDITORIA-CONTRATO.md`) ya revisado y aprobado por el dueño del proyecto, con las 13 decisiones que congelan el rumbo de la migración. No se ha escrito código de migración, no se ha instalado ninguna dependencia nueva, no se ha tocado ningún archivo existente del sitio, no se ha modificado Supabase.

Fecha de la última corrección: 2026-09-10. Todas las cifras y hallazgos están verificados contra el código y la base de producción reales — donde no se pudo verificar algo con certeza, queda marcado explícitamente como **pendiente de verificación**, nunca inventado.

---

## Índice

1. [Arquitectura actual](#1-arquitectura-actual)
2. [Arquitectura objetivo](#2-arquitectura-objetivo)
3. [Arquitectura del repositorio](#3-arquitectura-del-repositorio)
4. [Estrategia de coexistencia](#4-estrategia-de-coexistencia)
5. [Roadmap](#5-roadmap)
6. [Dependencias — qué se migra y qué se conserva](#6-dependencias--qué-se-migra-y-qué-se-conserva)
7. [Contrato de datos](#7-contrato-de-datos)
8. [Autenticación y roles](#8-autenticación-y-roles)
9. [Arquitectura de IA](#9-arquitectura-de-ia)
10. [TPL Studio](#10-tpl-studio)
11. [CRM](#11-crm)
12. [Media / imágenes](#12-media--imágenes)
13. [SEO](#13-seo)
14. [Seguridad](#14-seguridad)
15. [Estrategia Git](#15-estrategia-git)
16. [Testing](#16-testing)
17. [Rollback](#17-rollback)
18. [Criterios de aceptación](#18-criterios-de-aceptación)
19. [Riesgos](#19-riesgos)
20. [Decisiones pendientes](#20-decisiones-pendientes)

**[PRIMERA FASE A EJECUTAR](#primera-fase-a-ejecutar-no-ejecutada-todavía)** (al final — no ejecutada todavía)
**[CHECKLIST DE APROBACIÓN PRE-FASE 1](#checklist-de-aprobación-pre-fase-1)** (al final del todo)

---

## 1. Arquitectura actual

Resumen de la auditoría ya aprobada; el detalle completo queda en `docs/architecture/` como referencia histórica de cómo se llegó a este diagnóstico.

- **No es una SPA ni tiene bundler en el sitio principal.** Es un sitio multi-página estático (357 archivos de código en `frontend-v2/`, 18 páginas HTML sueltas en la raíz) servido por Vercel sin `rewrites` ni `redirects` en `vercel.json` — solo reglas de `headers`. Existen reglas de headers para rutas cortas (`/plataforma/tasador/...`, `/red-partner-v2/...`) sin carpeta real detrás; probablemente un plan de URLs limpias que nunca se completó.
- **Tres silos reales que casi no comparten código:** sitio público, CRM (`plataforma/crm-tpl-v1/`, router propio por hash, 15 módulos: `actores, casas, catastro, comparables, cotizador, dashboard, eventos, map, operaciones, parcelas, pipeline, revision, simulador, tasaciones, visitas`), y TPL Business (`plataforma/tpl-business-v2/`, mismo patrón de router, 10 módulos: `acceso, auth, campanas, informe, landing, partner-ejecucion, partner-oportunidades, propietario-dashboard, registro, studio`).
- **Tres modelos de autenticación distintos**, no uno: sitio público sin sesión (clave `anon`), Portal Propietario por enlace firmado (`?token=` + RPC `tpl_propietario_resumen_por_token_v1`), CRM + TPL Business con Supabase Auth real gateado por `tpl_es_staff()` / `tpl_es_admin()` y la tabla `tpl_actor_roles`.
- **Un solo motor de tasación** (`js/core/valuation-engine.js`) cuya copia para Supabase se *genera* con un script (`generar-motor-deno.mjs`), no se edita a mano — riesgo de divergencia si alguien la edita sin regenerar.
- **4 puntos de conexión directa a Supabase**, con **3 nombres globales distintos** para lo que debería ser un único cliente: `window.supabaseClient`, `window.tplCoreSupabase`, `window.tplSupabase`.
- **25 variables `window.*`** detectadas en `frontend-v2/` (sin contar CRM ni TPL Business, que tienen las suyas) — el mayor punto real de fricción contra React/Next.js, más que el volumen de código.
- **Duplicación de flujos completos, no solo de código:** publicador (`publicar/` v1 y `publicar-v2/` conviviendo, ambos sirviendo tráfico), y "TPL Studio" en tres implementaciones (`studio-mark-ii/`, `modules/studio/`, `studio/` — la consola de Veo).
- **Hallazgo de seguridad activo:** la edge function `veo-generar-video` (ACTIVE, `verify_jwt: false`, sin chequeo de autorización en el código) usa por defecto la clave `GEMINI_API_KEY` del servidor (confirmada activa). Cualquier visitante puede generar video real facturado a TPL. **Este hallazgo bloquea el inicio de cualquier trabajo sobre TPL Studio** (ver §14).
- **Tabla `parcelas` — clasificación oficial del dueño (2026-09-10): `LEGACY — NO USAR — PENDIENTE DE RETIRO`.** Existe en Supabase (32 filas, columnas `estado_publicacion`, `legacy_id` — el mismo esquema antiguo que causó un bug real en una migración que asumía esa columna en `tpl_propiedades`). La auditoría de Fase 0 confirmó que ningún código en producción la consulta y que ninguna migración rastreada la creó ni la referencia — pero no se elimina ni se archiva todavía: queda prohibido crear nuevas dependencias, escribir datos nuevos en ella, o usarla como *fallback*. Su retiro definitivo es una tarea posterior, tras un período de verificación con posibilidad de rollback.
- **Contrato de datos ampliado en la Fase 0:** el código real usa 45+ tablas (no ~15) y llama activamente decenas de las 206 funciones RPC definidas en migraciones (el plan original no listaba ninguna). Tres de esas llamadas están rotas en producción (`404` confirmado): `tpl_registrar_lead_v1`, `tpl_actualizar_uf_v1`, `manifestar_interes` — ver §6 y §7.
- **Bloqueador operativo confirmado (no decisión de negocio):** `crear-pago-contratacion` y `flow-webhook-contratacion` están completas y ya conectadas desde el frontend (`publicar-v2/js/modules/planes.js`, `tpl-business-v2/studio/studio.js`), pero nunca se desplegaron — hoy, cualquier intento de pagar un plan de contratación falla. Ver §14 y §20.

## 2. Arquitectura objetivo

Resumen del diseño a 5 años ya aprobado:

- **Monorepo con tres aplicaciones Next.js independientes** — Sitio Público, TPL Business, CRM/Admin — formalizando la separación que ya existe de hecho hoy, no inventando una nueva.
- **Un paquete de diseño compartido** (`@tpl/ui`) construido sobre `tpl-foundation.css`, ya unificado hoy.
- **Servicios compartidos sin UI** (`packages/`): Motor de Tasación (`packages/valuation`, con sub-paquetes `land/`, `house/` y `shared/` — ver §3), Servicio de Comunicaciones, **AI Gateway** (fachada única para Gemini/Veo), Servicio de Geointeligencia, Servicio de Pagos, Servicio de Automatizaciones.
- **Regla de oro que no cambia:** el navegador nunca alcanza un proveedor de IA o de pago directamente — solo Edge Functions con `service_role`, nunca desde un Route Handler con la clave expuesta al cliente.
- **TPL Studio no consolida las tres versiones actuales.** Decisión del dueño (2026-09-10): se construye un Studio nuevo sobre el AI Gateway, reutilizando las piezas funcionales de `studio-mark-ii`, `modules/studio` y `studio/` que sirvan, antes de descartar código existente — ver §10.
- **Marketplace de partners** (nuevo — hoy Red Partner no tiene directorio buscable) conectado al mismo motor de video de TPL Studio. Decisión del dueño: se construye **después** de estabilizar el AI Gateway y TPL Studio, para no duplicar infraestructura de IA/video entre ambos.
- **Automatizaciones formalizadas** generalizando el patrón que ya funciona bien en `tpl_confirmar_contratacion_servicio_v1` (evento → tarea/etiqueta/oportunidad en una sola transacción idempotente).
- **Lo que no cambia nunca:** Supabase como única fuente de verdad; ninguna pantalla pública recalcula una tasación; Studio no publica ni gasta presupuesto sin aprobación humana explícita; el modelo de actores con múltiples roles de "Cerebro TPL" se mantiene.

## 3. Arquitectura del repositorio

### Decisión: monorepo con pnpm workspaces + Turborepo

Evalué las alternativas contra el código real, no contra una plantilla:

| Opción | Veredicto | Por qué |
|---|---|---|
| Repos separados por app | **Descartado** | Los tres silos ya comparten Supabase, tipos de datos y (en el futuro) el paquete de diseño — separarlos en repos distintos duplicaría la sincronización de esos contratos |
| Un solo Next.js con carpetas por rol | **Descartado** | Es exactamente lo que la auditoría desaconsejó: mezclar el riesgo del CRM (uso diario, cero downtime tolerable) con el del sitio público (SEO, tráfico anónimo alto) en un mismo deploy |
| **Monorepo · pnpm workspaces · Turborepo** | **Recomendado** | pnpm workspaces resuelve el árbol de dependencias entre `apps/` y `packages/` sin duplicar `node_modules`; Turborepo cachea build/test por paquete, crítico cuando `apps/crm` no debería reconstruirse por un cambio en `apps/publico` |

### Estructura de carpetas (adaptada al código real, no genérica)

```
tpl/
├── apps/
│   ├── publico/              # Next.js — catálogo, ficha, marketplace (SSG/ISR, sin auth)
│   ├── business/              # Next.js — publicador, planes, Studio, portafolio (SSR + sesión)
│   └── crm/                   # Next.js — los 15 módulos del CRM (SSR + sesión staff)
│
├── packages/
│   ├── ui/                    # @tpl/ui — Header, Footer, PropertyCard, MapView, ValuationPanel...
│   ├── core/                  # cliente Supabase ÚNICO (reemplaza los 3 nombres globales de hoy), tipos generados
│   ├── valuation/
│   │   ├── land/               # motor de terrenos/parcelas — conserva la lógica actual de valuation-engine.js
│   │   ├── house/               # motor de casas — conserva la lógica actual de tpl-house-engine.js
│   │   └── shared/               # utilidades/infraestructura común a ambos (sin mezclar fórmulas)
│   ├── ai/                    # AI Gateway: cliente interno hacia Gemini/Veo, cuotas, costo, historial
│   ├── automations/            # el motor de reglas evento→acción (generaliza tpl_confirmar_contratacion_servicio_v1)
│   └── config/                 # ESLint, TSConfig, Tailwind config compartidos
│
├── supabase/                   # se conserva tal cual está hoy (migrations/, functions/) — no se mueve
├── docs/                       # se conserva tal cual está hoy
├── frontend-v2/                # el sitio HTML actual — se conserva íntegro durante TODA la migración
├── scripts/                    # se conserva tal cual está hoy (mantenimiento de datos, no se toca)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                 # raíz del monorepo, nuevo — no reemplaza el package.json actual de frontend-v2
```

### Decisión del dueño sobre `packages/valuation` (2026-09-10)

`packages/valuation` es la única capa de valoración compartida, pero **no mezcla las fórmulas de terrenos y casas en un único algoritmo**. El motor de terrenos (`land/`) conserva su lógica actual (`valuation-engine.js` + su copia generada para Deno); el motor de casas (`house/`) conserva la lógica actual de `tpl-house-engine.js`. Ambos comparten infraestructura/utilidades vía `shared/` cuando corresponda (traducción de vocabulario, formato de salida, etc.), pero cada uno mantiene su propio conjunto de reglas. La migración debe garantizar que no queden dos implementaciones activas del mismo motor (por ejemplo, dos copias de la lógica de terrenos) — una implementación por tipo de activo, no una implementación total.

**Precisión importante:** hay una sola *fuente de verdad* por motor (`packages/valuation/land/`, `packages/valuation/house/`) y, aparte, **artefactos generados** a partir de esa fuente para donde no puede ejecutarse TypeScript/Node directamente (hoy, la copia para Deno de las Edge Functions). Un artefacto generado **no cuenta como una segunda implementación independiente** — es una salida mecánica de la única fuente, regenerada por script, nunca editada a mano. La condición de "una sola implementación" se mide sobre la fuente, no sobre cuántos archivos existen en el repositorio.

**Nota importante de convivencia:** `frontend-v2/` y `apps/` conviven en el mismo repositorio durante toda la migración (ver §4). No se borra ni se mueve nada de `frontend-v2/` hasta que la fase correspondiente esté aceptada en producción.

## 4. Estrategia de coexistencia

**El sitio actual nunca debe quedar inutilizado por una fase de migración — esto es una restricción dura, no una preferencia.**

### Dominios

| Dominio | Sirve |
|---|---|
| `www.parcelalista.cl` (o el dominio productivo actual) | El dominio real de cara al público, siempre — nunca cambia durante la migración |
| `next-preview.parcelalista.cl` (subdominio nuevo, temporal) | Vista previa de cada fase de Next.js antes de tocar producción — se retira cuando la migración termina |

No se recomienda repartir tráfico real entre subdominios distintos por app (`business.parcelalista.cl`, `crm.parcelalista.cl`) salvo que el propio diseño objetivo lo pida más adelante — hoy el corte se hace por **ruta**, no por dominio, para no romper SEO ni sesiones compartidas.

### Rewrites / redirects (el mecanismo real del corte gradual)

Vercel permite tener el proyecto Next.js como **el proyecto "de arriba"** y usar `rewrites` en `next.config.js` para reenviar cualquier ruta NO migrada todavía hacia el sitio estático actual (servido desde el mismo repo, en `frontend-v2/`, como un segundo "output" o como un proyecto Vercel satélite). Ruta por ruta:

- Ruta migrada → Next.js la sirve directamente.
- Ruta no migrada → `rewrite` transparente hacia el HTML actual — el usuario nunca ve la diferencia, la URL no cambia.

Esto invierte el problema real de `vercel.json` detectado en la auditoría (headers para rutas que no tienen rewrite) convirtiéndolo en la base del mecanismo de coexistencia: cada fase migrada agrega una entrada al mapa de rewrites, nunca se improvisa.

### Feature flags

**Decisión técnica pendiente, no resuelta todavía.** El mecanismo exacto (tabla `tpl_feature_flags` en Supabase, el sistema de flags de Vercel/Edge Config, u otra alternativa) debe permitir:
- Activar una ruta migrada solo para el equipo TPL primero (staff), luego para un % de tráfico público, luego para todos.
- Apagar instantáneamente una fase sin hacer un deploy — condición necesaria para que el rollback sea real y no solo teórico.

**Restricción explícita:** durante la Fase 1 no se crea una tabla en Supabase solo para resolver feature flags si existe una alternativa adecuada del lado de Vercel/Next.js — no se justifica una migración de base de datos si no hace falta. Si más adelante se decide de todas formas crear `tpl_feature_flags`, esa creación es una **migración de Supabase explícita, documentada y reversible como cualquier otra**, nunca una tabla asumida de antemano.

### Rollback

Cada fase se revierte en dos niveles, del más rápido al más lento:
1. **Apagar el feature flag** (segundos) — la ruta vuelve a servirse desde `frontend-v2/` sin redeploy.
2. **Revertir el rewrite** en `next.config.js` (minutos, un deploy) si el flag no fuera suficiente.

Ninguna fase de frontend requiere revertir nada en Supabase — el backend no cambia en ninguna fase de este plan salvo que una fase lo declare explícitamente (ver §5).

### Estrategia de producción

- `main` de `frontend-v2/` sigue siendo la rama que hoy despliega a producción — no se toca su pipeline.
- El monorepo Next.js se despliega como **un proyecto Vercel adicional**, en preview, hasta que la Fase 1 esté aprobada para producción.
- **El mecanismo exacto de cómo el proyecto Next.js eventualmente "pasa a ser el de arriba" no está definido todavía** — se determina y se demuestra en la Prueba técnica de coexistencia (§5, antes de Fase 3), no se asume de antemano.
- **`www.parcelalista.cl` no se mueve en la Fase 1**, ni la aprobación de la Fase 1 equivale a cambiar el proyecto Vercel de producción. El cambio de dominio solo puede ocurrir después de, en orden: (1) coexistencia demostrada en la prueba técnica, (2) al menos una ruta Next.js aceptada en producción con su criterio de §18 cumplido, (3) rollback probado realmente (no solo documentado), (4) criterios de SEO/funcionalidad de §13/§18 cumplidos, y (5) aprobación explícita del dueño para ese paso específico — ninguna aprobación anterior lo incluye implícitamente.

## 5. Roadmap

Quince fases (0 a 14), más dos **Prerequisitos críticos** entre la Fase 0 y la Fase 1 que no rompen la numeración pero sí bloquean el avance real hasta resolverse. El orden Fase 9 (Red Partner) → Fase 12 (TPL Studio) → Fase 13 (Marketplace) es intencional: el Marketplace nunca se numera antes de Studio porque depende de él. Las fases 0–4 están detalladas al nivel de ejecución porque son las próximas; las fases 8–14 se detallarán con la misma profundidad cuando se acerquen.

> Formato por fase: **Objetivo · Módulos · Dependencias · Resultado esperado · Riesgo · Pruebas · Criterio de aceptación · Rollback · Cuándo se considera terminada.**

---

### Fase 0 — Congelar el contrato de datos
- **Objetivo:** documentar qué RPC/tabla usa cada pantalla hoy, antes de que exista una versión Next.js que pueda desviarse en silencio.
- **Módulos:** ninguno de código — es el §7 de este documento, ampliado y mantenido vivo.
- **Dependencias:** ninguna.
- **Resultado esperado:** el contrato de datos (§7) queda versionado en `docs/` y es la referencia obligatoria para cualquier fase siguiente.
- **Riesgo:** bajo — es documentación.
- **Pruebas:** ninguna (no hay código).
- **Criterio de aceptación:** el dueño del proyecto confirma que el contrato de datos de §7 es correcto y completo para las tablas que usa a diario.
- **Rollback:** N/A.
- **Terminada cuando:** el documento está aprobado, no cuando está "escrito".

### Prerequisitos críticos (entre Fase 0 y Fase 1)

No son fases numeradas — son bloqueadores que deben resolverse antes de que el trabajo de fases posteriores tenga sentido, aunque la Fase 1 (infraestructura vacía) pueda empezar en paralelo sin esperarlos.

#### Prerequisito crítico A — Seguridad de `veo-generar-video` / `veo-consultar-video`
- **Objetivo:** cerrar el hallazgo crítico confirmado en la Fase 0 antes de expandir TPL Studio ni un módulo más.
- **Qué exige, como mínimo:** exigir autenticación/autorización real; validar actor y rol; validar permisos del plan contratado; aplicar cuotas por usuario/plan; aplicar límites de costo; impedir uso anónimo; impedir que el navegador suministre una clave de API arbitraria; mantener la clave (`GEMINI_API_KEY`) exclusivamente en el servidor; registrar consumo y costo por llamada; aplicar el mismo estándar a `veo-consultar-video`.
- **Bloquea:** Fase 12 (TPL Studio nuevo) por completo, y cualquier trabajo de producto adicional sobre Studio.
- **No se corrige en esta tarea de actualización del plan** — queda incorporado como prerequisito, a ejecutar en su propia tarea/fase de seguridad.

#### Prerequisito crítico B — Despliegue/saneamiento de Flow contrataciones
- **Objetivo:** resolver que `crear-pago-contratacion` y `flow-webhook-contratacion` — confirmadas completas y ya conectadas desde el frontend — no estén desplegadas.
- **Clasificación:** **BLOQUEADOR OPERATIVO**, no decisión de negocio — el código está listo, falta un paso de despliegue/verificación.
- **Bloquea:** Fase 8 (Publicador consolidado) y cualquier trabajo que dependa del flujo de contratación de planes.
- **No se despliega en esta tarea de actualización del plan** — queda incorporado como prerequisito, a ejecutar en su propia tarea de verificación y despliegue.

### Fase 1 — Infraestructura Next.js en paralelo
- **Objetivo:** tener el monorepo (`apps/`, `packages/`) desplegado en un subdominio de preview, sin quitar nada del sitio actual.
- **Módulos:** ninguno de `frontend-v2/` se toca; se crea `apps/publico` vacío con el layout base y `packages/ui` con el primer componente (Header) portado.
- **Dependencias:** Fase 0 aprobada.
- **Resultado esperado:** `next-preview.parcelalista.cl` responde con una página de layout mínima, funcional, sin afectar producción.
- **Riesgo:** bajo — no hay tráfico real todavía.
- **Pruebas:** build verde en CI, Lighthouse básico, revisión visual del layout.
- **Criterio de aceptación:** el proyecto de preview es accesible y estable durante al menos una semana sin cambios reactivos.
- **Rollback:** apagar el proyecto de preview — cero impacto en producción.
- **Terminada cuando:** el equipo puede iterar en `apps/publico` sin que nadie del negocio lo note.

### Fase 2 — Design system (`@tpl/ui`)
- **Objetivo:** portar `tpl-foundation.css` + `tpl-shell.js` a componentes React — Header, Footer, MobileMenu — porque son lo único que **todas** las páginas comparten hoy: máximo apalancamiento, mínimo riesgo de romper una sola pantalla.
- **Módulos:** `packages/ui`.
- **Dependencias:** Fase 1.
- **Resultado esperado:** los tres componentes renderizan pixel-a-pixel equivalentes al HTML actual, con los mismos tokens de color (`--tpl-navy-*`, `--tpl-orange-*`, incluyendo los dos valores fijados por contraste que no se deben "mejorar a ojo": `#a8410f` y `#0f7a4f`).
- **Riesgo:** bajo-medio — un error de contraste o de espaciado aquí se replica a cada página migrada después.
- **Pruebas:** comparación visual contra el HTML actual (mismas resoluciones, mismos breakpoints), verificación de contraste AA en los dos colores fijados.
- **Criterio de aceptación:** el design system se ve y se comporta igual que hoy, no "parecido".
- **Rollback:** el paquete no se consume todavía en producción — no hay nada que revertir fuera de `apps/`.
- **Terminada cuando:** un segundo componente (PropertyCard, ya semi-listo como `TPLPropertyCard.js`) se porta sin tener que tocar el Header de nuevo.

### Prueba técnica de coexistencia (antes de Fase 3)
- **Objetivo:** demostrar, sin mover tráfico real, el mecanismo concreto de coexistencia entre el proyecto Next.js, el proyecto legacy (`frontend-v2/`), Vercel y el dominio productivo — sin inventar una implementación ni asumir una de antemano.
- **Qué debe quedar demostrado, concretamente:**
  - Si la coexistencia se resuelve con **dos proyectos Vercel separados** (uno para `frontend-v2/`, otro para el monorepo Next.js) con `rewrites`/proxy entre ellos, o con **un solo proyecto Vercel** sirviendo ambos desde el mismo repositorio.
  - Qué mecanismo exacto de Vercel resuelve el reenvío ruta por ruta (`rewrites` de `vercel.json`, `rewrites` de `next.config.js`, o Middleware de Vercel) — se elige y se documenta aquí, no se asume en abstracto.
  - Cómo se comporta el dominio productivo durante la prueba (se prueba en `next-preview.parcelalista.cl` u otro subdominio de prueba — **nunca** en `www.parcelalista.cl`).
- **Explícito:** la Fase 1 **no mueve `www.parcelalista.cl`** bajo ninguna circunstancia, y **aprobar la Fase 1 no equivale a cambiar el proyecto Vercel de producción**. Ese cambio de dominio es un paso aparte, con su propia aprobación explícita (ver §4 y el Checklist de aprobación pre-Fase 1).
- **Dependencias:** Fase 1.
- **Resultado esperado:** un mecanismo concreto, probado y documentado — no una descripción teórica — de cómo una ruta migrada y una ruta no migrada conviven bajo el mismo dominio eventual, verificado en un entorno sin tráfico real.
- **Criterio de aceptación:** el mecanismo elegido se demuestra funcionando en el subdominio de prueba, con al menos una ruta migrada (ficticia o de prueba) y una ruta reenviada al HTML actual.

### Fase 3 — Landing (`index.html` → `apps/publico`)
- **Objetivo:** primera ruta real migrada y servida a tráfico real, empezando por la de menor riesgo (sin auth, sin escritura, ya usa `TPLPropertyCard`).
- **Módulos:** `apps/publico` (home), consumiendo `packages/ui`, `packages/core` (cliente Supabase único) y el catálogo vía RPC/tabla pública.
- **Dependencias:** Fases 1 y 2.
- **Resultado esperado:** `/` se sirve desde Next.js (SSG + ISR) para el 100% del tráfico, con rewrite de vuelta a `frontend-v2/index.html` detrás de un feature flag.
- **Riesgo:** medio — es la primera ruta con tráfico real y SEO en juego.
- **Pruebas:** paridad de Core Web Vitals contra el HTML actual, verificación de metadata/OG (ver §13), prueba de carga del catálogo con datos reales.
- **Criterio de aceptación:** sin regresión de SEO según la definición de §13 (caída técnica/de indexación/de rendimiento atribuible a la migración, sostenida y confirmada — no una fluctuación normal de Google).
- **Rollback:** apagar el feature flag — la ruta `/` vuelve a `frontend-v2/index.html` sin deploy.
- **Terminada cuando:** el flag lleva dos semanas al 100% sin incidentes y sin necesidad de revertir.

### Fase 4 — Ficha de Parcela (`parcela.html`)
- **Objetivo:** migrar la página más compleja del sitio público (mapa, clima, video, tasación, galería) manteniéndola de solo lectura y anónima.
- **Módulos:** `apps/publico` (ruta de ficha), componentes nuevos en `packages/ui` (MapView, ValuationPanel, VideoPlayer, WeatherBadge).
- **Dependencias:** Fase 3 aceptada (reutiliza su infraestructura de rewrites/flags).
- **Resultado esperado:** la ficha muestra exactamente los tres valores vigentes — **Valor TPL Técnico**, **Valor TPL Promedio Comunal** y **Valor Recomendado** —, el video Veo si está publicado, y el mapa. **Next.js no recalcula la tasación en el navegador bajo ninguna circunstancia**: los tres valores se leen desde la fuente persistida correspondiente en Supabase (`tpl_propiedades.metadata` / `tpl_tasaciones`), igual que hoy.
- **Riesgo:** medio-alto — es 1600+ líneas de JS acoplado al DOM en el archivo actual; el mayor riesgo es perder un caso borde no documentado.
- **Pruebas:** recorrer las 32 fichas reales una por una comparando cifras mostradas contra `tpl_propiedades.metadata`; probar el caso "sin tasación guardada" (debe declararlo, nunca inventar un valor).
- **Criterio de aceptación:** cero discrepancias de cifras entre la versión HTML y la versión Next.js para las 32 propiedades reales.
- **Rollback:** feature flag por propiedad o global, igual que Fase 3.
- **Terminada cuando:** las 32 fichas están migradas y verificadas una por una, no solo "el template funciona".

### Fase 5 — Resto del catálogo público
- **Objetivo:** `proyecto.html`, `cotizador.html`, `campo-chileno.html`, `casas.js`, `como-comprar.html` — reusando los componentes de las Fases 2–4.
- **Dependencias:** Fase 4.
- **Riesgo:** medio — depende de cuánto reutilicen realmente los componentes ya hechos vs. cuánto sea lógica nueva por página.
- **Resto de campos:** mismo patrón que Fases 3–4 (flag por ruta, rollback instantáneo, criterio de aceptación = paridad funcional + SEO).

### Fase 6 — Portal Propietario (autenticación por token)
- **Objetivo:** primer ensayo de "sesión" (aunque sea por token, no login) — puente antes de la Fase 7.
- **Dependencias:** Fase 5.
- **Riesgo:** medio — el token vive en la URL, hay que preservar exactamente ese mecanismo (RPC `tpl_propietario_resumen_por_token_v1`) sin empezar a pedir contraseña todavía (ver §8 sobre no cambiar el modelo de roles sin justificarlo).

### Fase 7 — Autenticación real para Staff y Partner (infraestructura, sin pantallas nuevas)
- **Objetivo:** Supabase Auth + middleware de Next.js para los roles **staff y partner**, listo para las fases 8–11 que lo necesitan. **El propietario mantiene el acceso actual por token — no se convierte a Supabase Auth obligatorio en esta fase ni en ninguna otra sin una decisión nueva del dueño.** La cuenta real opcional para propietarios (decisión ya registrada en §20) queda para una fase posterior, sin fecha fijada.
- **Dependencias:** Fase 6.
- **Riesgo:** alto si se apresura — es la base de todo el acceso administrativo; se prueba a fondo antes de que cualquier módulo dependa de ella.

### Fase 8 — Publicador consolidado *(decisión del dueño ya tomada — 2026-09-10)*
- **Objetivo:** consolidar `publicar/` (v1) y `publicar-v2/` en un único flujo moderno — no se mantienen dos publicadores como productos paralelos. Debe preservar toda funcionalidad que hoy genere ingresos o sea necesaria para publicar propiedades (los 4 planes de `tpl_planes_servicio`, y cualquier pieza de v1 sin equivalente en v2, como la recuperación de contraseña).
- **Prerequisito:** Prerequisito crítico B (Flow contrataciones) resuelto — el publicador depende del mismo flujo de pago.
- **Riesgo:** alto — es el flujo que hoy genera ingresos; cualquier regresión afecta ventas directamente.

### Fase 9 — Red Partner (formulario y perfil, sin Marketplace)
- **Objetivo:** migrar el formulario y el perfil actuales de Red Partner tal como existen hoy. **El Marketplace no se construye en esta fase** — depende de que TPL Studio esté estabilizado, ver Fase 13. No se numera el Marketplace antes de Studio porque conceptualmente depende de él.

### Fase 10 — TPL Business v2 *(detalle a profundizar más cerca de la fase)*
- **Objetivo:** los 10 módulos del panel logueado de propietario/partner.
- **Riesgo:** alto — multi-rol, planes y pagos embebidos.

### Fase 11 — CRM, módulo por módulo *(ver §11, detalle propio)*
- **Objetivo:** migrar los 15 módulos de a uno, nunca de una vez, con feature flag por módulo y sin interrumpir el trabajo diario del equipo.

### Fase 12 — TPL Studio nuevo sobre el AI Gateway *(bloqueada por el Prerequisito crítico A)*
- **Objetivo:** decisión del dueño (2026-09-10) — no se elige una de las tres versiones actuales (`studio-mark-ii`, `modules/studio`, `studio/`) como producto final. Se construye un TPL Studio nuevo sobre el AI Gateway (§9), reutilizando antes las piezas funcionales de las tres implementaciones que sirvan. Debe quedar preparado para Gemini, Veo, generación de texto y video, análisis de propiedades, futuros proveedores de IA, control de costos, cuotas por usuario/plan y aprobación humana antes de publicar o generar gasto.
- **No avanza** sobre la implementación actual de Veo hasta resolver el Prerequisito crítico A.

### Fase 13 — Marketplace de Red Partner *(depende de que la Fase 12 esté aceptada — no antes)*
- **Objetivo:** construir el directorio de partners buscable por especialidad, conectado al mismo motor de video de TPL Studio (§2 y Fase 12). La secuencia **AI Gateway → TPL Studio → Marketplace** es intencional y sin excepción: el Marketplace reutiliza la infraestructura de IA/video que Studio deja lista, en vez de duplicarla.
- **Dependencias:** Fase 12 aceptada en producción.

### Fase 14 — Optimización
- **Objetivo:** SSG/ISR fino del catálogo, `next/image` sobre las 600+ fotos (ver §12), metadata API para SEO técnico (ver §13).

## 6. Dependencias — qué se migra y qué se conserva

| Módulo | Clasificación | Nota |
|---|---|---|
| index (landing) | **MIGRAR** | Fase 3 — menor riesgo, mayor apalancamiento del design system |
| parcela | **MIGRAR** | Fase 4 — requiere verificación fila por fila (32 propiedades) |
| proyecto | **MIGRAR** | Fase 5 |
| casas | **MIGRAR** | Fase 5 |
| cotizador | **MIGRAR** | Fase 5 |
| publicar (v1) | **REFACTORIZAR ANTES DE MIGRAR** | Decisión del dueño (2026-09-10): consolidar con v2 en un único flujo moderno — no quedan dos publicadores como productos paralelos. Ver Fase 8 |
| publicar-v2 | **REFACTORIZAR ANTES DE MIGRAR** | Absorbe lo mejor de v1 (recuperación de contraseña, si aplica) y se convierte en el único publicador — ver Fase 8 |
| tasador (standalone) | **MANTENER TEMPORALMENTE** | Evaluar si sigue siendo necesario una vez el publicador consolidado cubra lo mismo; no migrar hasta esa decisión |
| propietario | **MIGRAR** | Fase 6 — se mantiene el acceso por token; no se introducen cuentas reales obligatorias todavía (decisión del dueño). La cuenta opcional queda para una fase posterior |
| Red Partner (formulario y perfil) | **MIGRAR** | Fase 9 |
| Marketplace de Red Partner | **CONSTRUIR (nuevo)** | No existe hoy. Fase 13 — depende de que TPL Studio (Fase 12) esté aceptado en producción; nunca antes |
| CRM | **MIGRAR (módulo por módulo)** | Fase 11 — nunca de una vez, ver §11 |
| TPL Business | **MIGRAR** | Fase 10 |
| TPL Studio | **REFACTORIZAR ANTES DE MIGRAR** | Decisión del dueño: no se consolida ninguna de las tres versiones actuales como producto final — se construye un Studio nuevo sobre el AI Gateway, reutilizando piezas funcionales antes de descartar código (ver Fase 12). Bloqueado por el Prerequisito crítico A (seguridad de Veo) hasta resolverlo |
| Edge Functions | **NO TOCAR** (salvo los dos Prerequisitos críticos: seguridad de Veo y despliegue de Flow contrataciones) | No se "migran" a Next.js — Next.js las sigue consumiendo igual |
| RPC rotos (`tpl_registrar_lead_v1`, `tpl_actualizar_uf_v1`, `manifestar_interes`) | **SANEAR (tarea posterior)** | Confirmados no disponibles o con nombre/parámetros incorrectos en producción (Fase 0). No se corrigen en esta actualización del plan — tarea de saneamiento explícita antes de migrar `tpl-data-service.js` y `partner-oportunidades/index.js` |
| scripts/ | **NO TOCAR** | Herramientas internas de mantenimiento de datos, fuera del alcance de esta migración |
| imágenes (`frontend-v2/image/`) | **MIGRAR A STORAGE** | Ver §12 — con URLs preservadas |
| CSS (`tpl-foundation.css`) | **MIGRAR** | Base del design system, Fase 2 |
| CSS (4 alias muertos: `global-tokens.css`, `tpl-design-system.css`, `tpl-brand-system.css`, `tpl-identity-seo.css`) | **MANTENER TEMPORALMENTE** | Decisión del dueño: no se eliminan todavía, para evitar referencias externas inesperadas. Tarea posterior: localizar referencias, confirmar que no son necesarios, eliminarlos, verificar regresión |
| tabla `parcelas` (Supabase) | **MANTENER TEMPORALMENTE — `LEGACY — NO USAR — PENDIENTE DE RETIRO`** | Clasificación oficial del dueño (2026-09-10). Prohibido crear nuevas dependencias, escribir datos nuevos, o usarla como *fallback*. Retiro definitivo es tarea posterior, con período de verificación y rollback — ver §1 y §7 |
| bucket `informes-tasacion` (Storage) | **MANTENER TEMPORALMENTE — LEGACY/HUÉRFANO PENDIENTE DE VERIFICACIÓN** | Sin referencias de código encontradas; no se elimina todavía — ver §7 |
| Edge Functions `crear-pago-contratacion` / `flow-webhook-contratacion` | **BLOQUEADOR OPERATIVO** — desplegar/verificar antes de usar | Código completo, conectado desde el frontend, no desplegadas. No se despliegan en esta actualización del plan — ver Prerequisito crítico B |
| servicios Supabase (tablas, RPC, RLS) | **NO TOCAR** | Es la fuente de verdad; ninguna fase de este plan cambia el modelo de datos salvo que se declare explícitamente |

## 7. Contrato de datos

Reemplazado por completo tras la auditoría de Fase 0 (`docs/TPL-FASE-0-AUDITORIA-CONTRATO.md`) — la versión anterior de esta sección listaba ~15 tablas y ningún RPC; el código real usa 45+ tablas y llama activamente decenas de las 206 funciones definidas en migraciones. Todo lo listado aquí fue verificado directamente contra la base de producción (`hwyscirbycojwndyzozn`) — no se lista de memoria, y nada se inventó.

### Tablas núcleo de propiedades y catálogo

| Tabla | Uso | Estado |
|---|---|---|
| **`tpl_propiedades`** | Todas las apps | Activa, fuente de verdad. Columna de estado es **`estado`**, no `estado_publicacion` |
| **`parcelas`** | Ninguna app activa | **`LEGACY — NO USAR — PENDIENTE DE RETIRO`** (decisión del dueño, ver §N de la auditoría de Fase 0). 32 filas, esquema anterior a `tpl_propiedades`. No confundir con el archivo estático `frontend-v2/parcelas.js` — son dos objetos distintos |
| `tpl_propiedad_imagenes` | Sitio público, CRM, TPL Business, Edge Functions | Activa (190 filas) |
| `tpl_propiedad_videos` | Sitio público (lectura), TPL Studio (escritura vía Edge Function) | Activa. Lectura pública solo si `publicado_en_parcela = true` |
| `tpl_publicaciones` | Edge Functions | Activa (67 filas) |
| `tpl_casas` | CRM | Activa (14 filas) |
| `crm_parcelas_resumen` | CRM (grilla principal) | Activa (34 filas — vista/resumen) |

### Actores, roles, CRM y oportunidades

| Tabla | Uso | Estado |
|---|---|---|
| `tpl_actores` | Todas | Activa — identidad única, multi-rol |
| `tpl_actor_roles` | Todas | Activa — relación actor↔rol (propietario, corredor, partner, administrador, etc.) |
| `tpl_staff` | Edge Functions | Activa (1 fila) |
| `tpl_oportunidades` | CRM | Activa (3 filas) |
| `tpl_crm_oportunidades` | Referenciada solo como *fallback* en `tpl-data-service.js:432` | **No existe** (`404`) — el fallback que la usa también está roto (ver §6, fila "RPC rotos") |
| `tpl_proyectos` | CRM (modelo "Cerebro TPL") | Activa |
| `tpl_visitas`, `tpl_notificaciones_actor` | CRM, Edge Functions | Existen, 0 filas — construidas, sin uso real todavía |
| **`profiles`** | — | **No existe** (`404`) — la identidad vive enteramente en `tpl_actores` + `tpl_actor_roles` |
| **`proyectos`** | — | No existe con ese nombre; la tabla real es `tpl_proyectos` |

### Comercial (planes, contrataciones, pagos)

| Tabla | Uso | Estado |
|---|---|---|
| `tpl_planes_servicio` | publicar-v2 (pantalla de planes) | Activa |
| `tpl_contrataciones_servicio` | Edge Functions `crear-pago-contratacion`/`flow-webhook-contratacion` | Esquema activo; flujo de escritura bloqueado por el Prerequisito crítico B |
| `tpl_planes_comerciales` | Edge Functions (`crear-pago-suscripcion`) | Activa (5 filas) |
| `tpl_suscripciones` / `tpl_ordenes_suscripcion` | Edge Functions | Existen, 0 filas |
| `tpl_ordenes_informe` | Edge Functions (informe premium, reservas) | Activa |

### Tasación y geointeligencia

| Tabla | Uso | Estado |
|---|---|---|
| `tpl_tasaciones` | Sitio público, CRM, Edge Functions | Activa |
| `tpl_tasador_referencias` | Sitio público, CRM | Activa |
| `tpl_geoint_propiedad_contexto` | Sitio público, Edge Functions | Activa |
| `tpl_catastro_mercado` | Sitio público, CRM | Activa |
| `tpl_informes_tasacion` | Edge Functions | Existe, 0 filas — relación exacta con `tpl_ordenes_informe` pendiente de verificar |

### Studio, marketing y onboarding

| Tabla | Uso | Estado |
|---|---|---|
| `tpl_studio_drafts` | Sitio público | Existe, 0 filas — relación con `tpl_studio_proyectos` pendiente de verificar |
| `studio_campaigns` | Edge Functions | Existe, 0 filas — nombre sin prefijo `tpl_`, inconsistente con el resto del esquema |
| `tpl_onboarding_partner` / `tpl_onboarding_propietario` | Edge Functions | Existen, 0 filas |
| `tpl_landing_borradores` | TPL Business | Activa |
| `tpl_web_analytics` | Sitio público, CRM | Activa (794 filas) |

### Sin cambios respecto a versiones anteriores del plan

`tpl_eventos`, `tpl_tareas`, `tpl_comunicaciones_cola` — todas activas.

### RPC (inventario nuevo — no existía en versiones anteriores del plan)

**Rotos, verificados con `404` directo contra producción:**

| RPC llamada | Archivo:línea | Impacto |
|---|---|---|
| `tpl_registrar_lead_v1` | `js/core/tpl-data-service.js:419` | Tiene *fallback* a `insert` en `tpl_crm_oportunidades`, que tampoco existe — cae a una cola local del navegador |
| `tpl_actualizar_uf_v1` | `js/core/tpl-data-service.js:663` | Sin *fallback* visible; disparador exacto en UI sin identificar |
| `manifestar_interes` | `tpl-business-v2/modules/partner-oportunidades/index.js:85` | Nombre y parámetros equivocados — la real es `tpl_partner_manifestar_interes_v1(p_match_id, p_mensaje)`. Un partner que intente manifestar interés recibe error |

**Verificados como correctos y en producción:** `tpl_es_staff`, `tpl_es_admin` (responden `false` sin sesión), `tpl_obtener_uf_v1` (responde con la UF real vigente). El resto de RPC llamados desde el CRM (12) y desde Edge Functions (17) tienen definición encontrada en migraciones, sin drift adicional.

### Edge Functions activas (verificado con `supabase functions list`)

`procesar-comunicaciones, activar-partner-aprobado, activar-propietario-gratis, crear-pago-informe, estado-informe, flow-webhook, generar-informe-premium, subir-foto-propietario, procesar-recalculo-tasador, gemini-tasacion-summary, enviar-dossier-parcela, crear-pago-suscripcion, tpl-seo-proxy, gemini-metodo-trabajo, gemini-buscador-parcelas, enviar-resumen-cotizacion, gemini-redactar-aviso, gemini-analisis-mercado, veo-generar-video, veo-consultar-video`.

**Escritas, completas, pero NO desplegadas — BLOQUEADOR OPERATIVO (no decisión de negocio):** `crear-pago-contratacion`, `flow-webhook-contratacion`. Ambas ya están conectadas desde el frontend (`publicar-v2/js/modules/planes.js`, `tpl-business-v2/studio/studio.js`); su ausencia de despliegue causa una falla activa en producción hoy. Ver Prerequisito crítico B.

### Storage buckets confirmados (5, no 3)

| Bucket | Público | Estado |
|---|---|---|
| `tpl-propiedades-videos` | Sí | Activo — videos de TPL Studio/Veo |
| `tpl-informes-tasacion` | No | Activo — el que realmente usa `generar-informe-premium` |
| `informes-tasacion` | No | **LEGACY / HUÉRFANO PENDIENTE DE VERIFICACIÓN** — sin referencias de código encontradas |
| `partner-postulaciones-v2` | No | Activo |
| `tpl-propiedades-propietario` | Sí | Existe; qué función lo escribe queda pendiente de verificar |

### RLS — patrón general observado (verificado en migraciones leídas)

- Tablas de negocio sensible (`tpl_contrataciones_servicio`, `tpl_actores`) → **sin policies públicas**, acceso solo por RPC `security definer` con chequeo interno de `auth.uid()` / `tpl_es_staff()`.
- Tablas de catálogo público (`tpl_propiedades`, `tpl_planes_servicio`) → policy de lectura para `anon` cuando el registro está activo/publicado.
- Tablas operativas del CRM (`tpl_etiquetas`, `tpl_actor_etiquetas`) → policy de lectura solo `authenticated` + `tpl_es_staff()`.

### Pendiente de verificación explícita

- Relación exacta entre `tpl_studio_drafts` y `tpl_studio_proyectos`.
- Relación exacta entre `tpl_informes_tasacion` y `tpl_ordenes_informe`.
- Qué función escribe en el bucket `tpl-propiedades-propietario`.
- Si `frontend-v2/casas.js` cumple el mismo rol de catálogo/*fallback* estático que `parcelas.js` — **sigue pendiente de verificación, no confirmado**. No confundir con el motor de valoración de casas: `casas.js` (de ser catálogo) sería un archivo de datos de respaldo del frontend, mientras que el motor de cálculo de casas (`tpl-house-engine.js`) es lógica de valoración y sí forma parte de `packages/valuation/house/` (§3) — comparten la palabra "casas" pero son dos cosas distintas.
- Cualquier tabla no listada aquí que aparezca en fases posteriores se agrega a este contrato antes de que una fase la consuma — no se asume su forma sin verificarla primero.

## 8. Autenticación y roles

**No se cambia el modelo de roles existente.** `tpl_actores` + `tpl_actor_roles` ya resuelve correctamente que una persona sea propietaria y partner a la vez — cambiarlo ahora introduciría riesgo sin necesidad real. Lo que cambia es la puerta de entrada en Next.js, no el modelo de datos.

| Rol | Hoy | En la arquitectura objetivo | App que lo sirve |
|---|---|---|---|
| Comprador | Sin cuenta | Igual — nunca se le exige cuenta para mirar | `apps/publico` |
| Propietario | Enlace con token (`?token=`) | Igual, más cuenta real *opcional* para ver histórico completo | `apps/publico` (token) + `apps/business` (cuenta) |
| Partner | Supabase Auth | Igual | `apps/business` |
| Staff / Administrador | Supabase Auth + `tpl_es_staff()` / `tpl_es_admin()` | Igual, expresado como middleware de Next.js en vez de chequeo por pantalla | `apps/crm` |

**Middleware:** cada app de Next.js implementa su propio middleware de sesión (no uno compartido entre las tres, para no acoplar el riesgo del CRM al del sitio público). El middleware valida la sesión de Supabase Auth y redirige antes de renderizar — la validación de rol específico (`tpl_es_staff`, etc.) se sigue haciendo en el RPC, nunca solo en el cliente.

**RLS sigue siendo la última línea de defensa**, no el middleware — un error en el middleware de Next.js no debe poder exponer datos que RLS no permitiría de todas formas.

## 9. Arquitectura de IA

### El AI Gateway (mencionado en la arquitectura objetivo, aquí se detalla)

Hoy cada necesidad de IA es su propia Edge Function con su propio prompt embebido (5+ funciones `gemini-*` sueltas, más `veo-generar-video`/`veo-consultar-video`). El AI Gateway consolida esto en un **paquete (`packages/ai`) + una Edge Function única de entrada**, no en Next.js.

**Aclaración explícita de alcance:** el AI Gateway es la puerta de entrada para las **capacidades nuevas** de IA y el destino de una **migración progresiva** de las capacidades existentes — **no significa reemplazar masivamente todas las Edge Functions `gemini-*` durante la Fase 1** ni en ninguna fase temprana. Cada función `gemini-*` existente permanece exactamente como está hasta que tenga su propia estrategia explícita de migración o retiro, decidida y documentada caso por caso, no de una vez.

Estructura del AI Gateway:

| Aspecto | Dónde vive | Diseño |
|---|---|---|
| Recepción de la solicitud | Edge Function (`ai-gateway`, nueva) | Único punto de entrada para Gemini y Veo — nunca directo desde el navegador ni desde un Route Handler con la clave expuesta |
| Prompts | `packages/ai` (versionados en el repo) | Cada tipo de generación (redactar aviso, analizar mercado, generar video) tiene su prompt versionado, no embebido suelto en cada función |
| Cuotas | Supabase (tabla nueva `tpl_ai_cuotas`, por actor y por plan) | Un propietario del plan gratuito no genera el mismo volumen que uno de Marketing Inmobiliario — se valida ANTES de llamar al proveedor |
| Costos | Supabase (tabla nueva `tpl_ai_uso`, un registro por llamada) | Hoy no existe forma de saber cuánto cuesta un video Veo hasta la factura de Google — el Gateway lo registra por contratación |
| Historial / auditoría | Supabase | Cada generación queda trazada: quién la pidió, para qué propiedad, con qué prompt, qué costó |
| Jobs asíncronos | Edge Function + tabla de estado (`tpl_propiedad_videos.estado_generacion` ya existe con este propósito) | Generar un video es lento — se encola, se responde de inmediato, el resultado se consulta después (patrón que `veo-generar-video`/`veo-consultar-video` ya usa correctamente) |
| Errores y reintentos | Edge Function | Reintento con backoff ante error del proveedor; el estado `fallido` ya existe en el esquema de `tpl_propiedad_videos` |
| **Aprobación humana** | Supabase (estado `borrador` obligatorio) | **No se automatiza nunca la publicación.** Cualquier salida de IA nace en estado borrador; publicar es una acción humana explícita — principio ya escrito en el proyecto ("Studio no publica ni gasta presupuesto sin aprobación explícita") y que este plan preserva sin excepción |
| Storage del resultado | Supabase Storage | Igual que hoy — buckets ya existentes, sin cambios |

**Corrección de seguridad incluida en este diseño, no aparte:** el AI Gateway es, por construcción, la respuesta al hallazgo de `veo-generar-video` — al existir un solo punto de entrada con validación de cuota y sesión, la vulnerabilidad actual (cualquiera factura a nombre de TPL) deja de ser posible estructuralmente, no solo parcheada.

## 10. TPL Studio

Diseño del flujo, disponible para propietario, partner y administrador:

```
Propiedad (o perfil de partner)
        │  contexto automático: fotos, descripción, ubicación,
        │  superficie, atributos — ya están en tpl_propiedades
        ▼
   TPL Studio (apps/business)
        │  arma el prompt con el contexto + preferencias del usuario
        ▼
   AI Gateway (§9) → Gemini (texto) / Veo (video)
        │  respeta cuota del plan, registra costo
        ▼
   Estado: BORRADOR
        │  el propietario/partner/admin revisa el resultado
        ▼
   Revisión y edición (texto: editable; video: aceptar o regenerar)
        │
        ▼
   Aprobación explícita (clic humano, sin excepción)
        │
        ▼
   PUBLICACIÓN
        ├── en la ficha pública (parcela.html / apps/publico) si es de una propiedad
        └── en el perfil del marketplace (§2) si es de un partner
```

- **Quién puede generar qué:** propietario y partner generan contenido para SU propia propiedad/perfil (autorización por propiedad — ver checklist de seguridad §14); administrador puede generar para cualquier propiedad, igual que hoy en la consola de Veo.
- **Decisión del dueño (2026-09-10):** no se elige una de las tres implementaciones actuales (`studio-mark-ii`, `modules/studio`, `studio/`) como base única. Se construye un Studio **nuevo** sobre el AI Gateway, reutilizando las piezas funcionales de cada una que sirvan antes de descartar código existente (ver §6, Fase 12).
- **Prerequisito crítico, no negociable:** no se expande ni una función más de TPL Studio sobre la implementación actual de `veo-generar-video` hasta resolver su seguridad — exigir autenticación/autorización, validar actor/rol y permisos del plan, aplicar cuotas y límites de costo, impedir uso anónimo, impedir que el navegador suministre una clave arbitraria, mantener la clave exclusivamente en servidor, registrar consumo/costo, y aplicar el mismo estándar a `veo-consultar-video`. Ver Prerequisito crítico A (§5) y §14.

## 11. CRM

**No se migra completo. Se migra módulo por módulo, con feature flag por módulo, sin interrumpir el trabajo diario.**

Orden sugerido (de menor a mayor uso diario/riesgo, a confirmar con el equipo que lo usa a diario):

1. `dashboard` — el más leído, el menos escrito; buen primer ensayo
2. `eventos` — bitácora, de solo lectura
3. `visitas`, `simulador`, `comparables` — módulos acotados, bajo acoplamiento con el resto
4. `map`, `catastro` — dependen de datos geoespaciales, requieren `MapView` de `packages/ui` ya maduro
5. `cotizador`, `casas` — comparten lógica con el sitio público (`casas.js`), buena oportunidad de reutilizar componentes
6. `actores`, `operaciones`, `revision` — más escritura, más riesgo
7. `pipeline`, `tasaciones`, `parcelas` — el corazón operativo diario del equipo; se migran al final, cuando el patrón ya está probado en los seis grupos anteriores

Cada módulo migrado convive con el router hash actual del CRM hasta que su flag pasa a 100% — el CRM real de hoy sigue funcionando durante toda la Fase 11.

## 12. Media / imágenes

Más de 600 imágenes hoy versionadas en `frontend-v2/image/` (pesan en cada clon y cada deploy).

| Qué | Decisión |
|---|---|
| Destino | Supabase Storage — **bucket propuesto** (ej. `tpl-catalogo-imagenes`), sujeto a diseño técnico y aprobación en la propia fase de migración de media; no es un bucket ya creado ni una decisión cerrada. No un CDN de terceros — mantiene todo el activo dentro del mismo backend que ya es la fuente de verdad |
| Preservar URLs existentes | Sí, obligatorio — se sube cada imagen manteniendo la misma ruta relativa como metadata, y `next.config.js` mapea las rutas antiguas (`/frontend-v2/image/...`) a la URL pública de Storage vía rewrite, para no romper ningún enlace ya indexado |
| `next/image` | Se activa solo para las páginas ya migradas (Fase 3 en adelante) — apuntando a Supabase Storage como `remotePatterns`, nunca reintroduciendo las imágenes al bundle de Next.js |
| Cómo migrar sin romper fichas | Por lotes, por comuna/captador (ya están organizadas así: `eric_arrepol/`, `wladimir_galaz/`, etc.), verificando cada lote contra la ficha pública antes de continuar con el siguiente |
| Cuándo | En paralelo a la Fase 4 (Ficha de Parcela) — no antes, porque recién ahí existe el componente `Gallery` que las consume en Next.js; no después, porque la Fase 4 ya necesita decidir el origen de las imágenes |

## 13. SEO

| Elemento | Estrategia |
|---|---|
| URLs de parcelas | Se preservan exactamente — la ruta `parcela.html?id=...` de hoy se recrea como ruta dinámica de Next.js con el mismo parámetro, o se introduce una URL más limpia con **redirect 301** desde la antigua, nunca un simple cambio silencioso |
| Metadata | Next.js Metadata API reemplaza las etiquetas manuales de hoy — mejora automática, no requiere mantenerlas a mano por página |
| Canonical | Se define explícitamente por página migrada, sobre todo mientras conviven `/frontend-v2/parcela.html?id=X` y la nueva ruta, para no competir contra sí mismo en el índice de Google |
| Sitemap | Se regenera desde Next.js (`sitemap.ts`) leyendo el mismo catálogo de Supabase — reemplaza al `sitemap.xml` estático actual, sin perder ninguna URL ya indexada |
| Open Graph | Se preserva y se completa por Metadata API — hoy ya existe `js/tpl-seo.js`, se porta su lógica, no se reinventa |
| Schema.org | Oportunidad de mejora real: hoy no hay evidencia de datos estructurados por propiedad — se agrega `RealEstateListing`/`Product` schema durante la Fase 4, es una mejora neta sobre el estado actual |
| Redirects | Toda URL que cambie de forma (no solo de tecnología) lleva un 301 explícito, documentado en una tabla de redirects que se revisa antes de cada fase que toque rutas públicas |

**Criterio de regresión SEO (corregido):** no se define como "cualquier indicador cae durante dos semanas" — una fluctuación normal de Google no bloquea por sí sola una fase. Se considera regresión de SEO solo una **caída técnica, de indexación o de rendimiento atribuible a la migración**, sostenida y confirmada por las métricas correspondientes (errores de rastreo nuevos, páginas des-indexadas, Core Web Vitals que empeoran de forma consistente — no un solo día de ruido). Ver también §18 y §19.

## 14. Seguridad

### Prerequisito crítico A — `veo-generar-video` / `veo-consultar-video`

> **Clasificación: BLOQUEADOR.** Confirmado y reconfirmado en la Fase 0: `verify_jwt: false`, sin chequeo de autorización en el código, usa `GEMINI_API_KEY` del servidor por defecto (confirmada activa). Cualquier visitante público puede generar video real facturado a TPL. **No se corrige en esta actualización del plan** — queda incorporado como prerequisito bloqueante de la Fase 12, a resolver en su propia tarea de seguridad antes de expandir TPL Studio un paso más. Debe cubrir, como mínimo:

- [ ] Exigir autenticación/autorización real (no `verify_jwt: false` sin chequeo interno).
- [ ] Validar actor y rol de quien llama.
- [ ] Validar permisos del plan contratado (no cualquier propietario/partner genera cualquier cosa).
- [ ] Aplicar cuotas por usuario/plan.
- [ ] Aplicar límites de costo.
- [ ] Impedir uso anónimo por completo.
- [ ] Impedir que el navegador suministre una clave de API arbitraria (`tpl_veo_custom_api_key` hoy se acepta desde `localStorage` sin validar).
- [ ] Mantener `GEMINI_API_KEY` exclusivamente en el servidor.
- [ ] Registrar consumo y costo por llamada.
- [ ] Aplicar el mismo estándar a `veo-consultar-video`.

### Prerequisito crítico B — Flow contrataciones

> **Clasificación: BLOQUEADOR OPERATIVO, no decisión de negocio.** `crear-pago-contratacion` y `flow-webhook-contratacion` están completas y ya conectadas desde el frontend, pero no están desplegadas. **No se despliegan en esta actualización del plan** — queda como tarea de despliegue/verificación explícita antes de la Fase 8.

### Checklist de seguridad para la migración

- [ ] `service_role` **nunca** en una variable de entorno pública de Next.js (`NEXT_PUBLIC_*`) ni en el navegador, en ninguna fase.
- [ ] Toda llamada a Gemini o Veo pasa por el AI Gateway (§9) — nunca directo desde un Route Handler con la clave del lado del servidor expuesta indirectamente vía un endpoint sin auth.
- [ ] `crear-pago-contratacion` y `flow-webhook-contratacion` se auditan con el mismo criterio que se aplicó a `veo-generar-video` antes de desplegarlas (Prerequisito crítico B).
- [ ] Todo webhook de Flow verifica firma/origen antes de confirmar un pago — confirmar que el patrón ya usado en `flow-webhook` se replica igual en cualquier webhook nuevo.
- [ ] RLS se revisa tabla por tabla migrada — un middleware de Next.js mal escrito nunca debe ser la única barrera.
- [ ] Autorización por propiedad en TPL Studio: un propietario/partner solo genera contenido para una propiedad/perfil que le pertenece — se valida en la Edge Function, no solo en la UI.
- [ ] Storage: buckets públicos (`tpl-propiedades-videos`, imágenes) siguen siendo de solo lectura pública — ninguna escritura sin sesión válida.
- [ ] Todo secreto (`GEMINI_API_KEY`, `FLOW_API_KEY`/`FLOW_SECRET_KEY` cuando se configuren, `RESEND_API_KEY`) vive únicamente como secreto de Supabase, nunca duplicado en variables de Vercel salvo que una Edge Function específica lo requiera y quede documentado por qué.
- [ ] Revisión de CORS/`verify_jwt` de cada Edge Function existente — ya hecha en la Fase 0 para las funciones críticas, pendiente para el resto según se toquen.
- [ ] Saneamiento de los 3 RPC rotos (`tpl_registrar_lead_v1`, `tpl_actualizar_uf_v1`, `manifestar_interes`) antes de migrar el código que los llama.

## 15. Estrategia Git

| Elemento | Estrategia |
|---|---|
| Ramas | `main` sigue siendo la de `frontend-v2/` en producción; el monorepo crece en `feat/nextjs-<fase>` por fase, nunca una rama única "migración" que viva meses |
| Commits | Un commit no mezcla dos fases; el mensaje referencia la fase (`fase-3: landing en Next.js`) para que el historial narre el roadmap |
| Tags | Un tag por fase aceptada en producción (`nextjs-fase-3`) — permite volver a un estado conocido sin depurar commits sueltos |
| Releases | Cada fase aceptada es una release documentada: qué se migró, qué feature flag la controla, cómo revertirla |
| Rollback | Revertir un flag (§4) es la primera línea; revertir un merge de rama es la segunda; nunca se depende de un `git revert` como único mecanismo de rollback en producción |
| Backups | Antes de cada fase que toque datos (ninguna en este plan debería, salvo que se declare), snapshot de la tabla afectada — igual que ya es práctica en este proyecto |
| Deploy preview | Cada PR de una fase se previsualiza en un deploy de Vercel antes de mergear — el equipo aprueba viendo la fase funcionando, no leyendo el diff |
| Producción | Solo se promueve a producción una fase con su criterio de aceptación (§18) ya cumplido y su flag probado en preview durante el tiempo mínimo definido por fase |

## 16. Testing

| Tipo de prueba | Cuándo aplica |
|---|---|
| Comparación visual/funcional contra el HTML actual | Toda fase de UI (2 a 6, 9 a 13) |
| Paridad de datos (cifras, estados) contra Supabase real | Toda fase que muestre datos de negocio (tasación, planes, videos) |
| Prueba de carga / Core Web Vitals | Toda fase del sitio público (SEO en juego) |
| Prueba de autorización (quién puede ver/hacer qué) | Fases 6, 7, 8, 10, 11, 12, 13 — todo lo que tiene sesión |
| Prueba de rollback real (no solo teórica) | Al menos una vez por fase, antes de aceptarla: apagar el flag y confirmar que el HTML actual responde sin errores |
| Regresión sobre las 32 propiedades reales | Fase 4 específicamente, por ser el caso de mayor complejidad de datos |

## 17. Rollback

Mecanismo general (detallado en §4), resumido como referencia rápida:

1. Feature flag apagado → vuelve a `frontend-v2/` sin deploy (segundos).
2. Revertir el `rewrite` en `next.config.js` → deploy rápido (minutos).
3. Revertir el merge de la rama de la fase → último recurso, documentado en la release de esa fase (§15).

Ninguna fase de este plan requiere revertir datos en Supabase, porque ninguna fase de frontend cambia el modelo de datos.

## 18. Criterios de aceptación

Generales para toda fase (además del criterio específico de cada una en §5):

- Paridad funcional total contra la versión HTML equivalente — no "casi igual".
- Cero discrepancias de cifras de negocio (tasación, precios, montos) entre ambas versiones.
- Sin regresión de SEO según la definición de §13 — una caída técnica/de indexación/de rendimiento atribuible a la migración y confirmada por las métricas correspondientes, no cualquier fluctuación normal de Google (fases del sitio público).
- Sin regresión de autorización — nadie ve o hace algo que no podía hacer antes (fases con sesión).
- El rollback de la fase se probó realmente, no solo se documentó.
- El dueño del proyecto la aprueba explícitamente antes de subir el flag al 100%.

## 19. Riesgos

| Riesgo | Fase(s) más expuestas | Mitigación |
|---|---|---|
| Divergencia entre el motor de tasación de Next.js y el actual | 4, 8 | Una sola implementación en `packages/valuation`, consumida por ambos lados — elimina la causa raíz, no solo el síntoma |
| Regresión de SEO al migrar URLs públicas | 3, 4, 5, 13 | Redirects 301 documentados, comparación de posición en dos semanas antes de aceptar |
| Exposición de secretos de IA/pago | 8, 12, 13 (Studio y Marketplace comparten la misma infraestructura de IA/video) | AI Gateway como único punto de entrada; checklist de §14 antes de cada fase que toque IA o pagos |
| Coexistencia Vercel/rewrites se implementa "sobre la marcha" sin validar | antes de Fase 3 | Prueba técnica de coexistencia obligatoria (§5) antes de mover cualquier ruta a tráfico real |
| Se interpreta la aprobación de la Fase 1 como autorización para mover el dominio productivo | 1 | Explícito en §4 y en el Checklist de aprobación pre-Fase 1: `www.parcelalista.cl` no se toca en la Fase 1 bajo ninguna interpretación |
| Interrupción del trabajo diario del CRM | 11 | Migración módulo por módulo con flag, empezando por los de menor uso/riesgo |
| Consolidación de publicar v1/v2 introduce un bug en un flujo que ya genera ingresos | 8 | Decisión ya tomada por el dueño; se ejecuta solo tras resolver el Prerequisito crítico B, con las pruebas de §16 |
| Tabla `parcelas` se confunde con `tpl_propiedades` durante el desarrollo | Cualquiera que toque datos | Clasificada explícitamente como `LEGACY — NO USAR — PENDIENTE DE RETIRO` en §7; prohibido crear nuevas dependencias sobre ella |
| Flujo de pago de contrataciones permanece sin desplegar y bloquea la Fase 8 | 8 | Reclasificado como Prerequisito crítico B (bloqueador operativo, no decisión de negocio) — tarea de despliegue/verificación explícita antes de la Fase 8 |
| Se expande TPL Studio sobre la implementación insegura de Veo | 12 | Prerequisito crítico A bloquea la Fase 12 por completo hasta resolverse |
| Repartir tráfico entre `frontend-v2/` y Next.js genera una ventana de inconsistencia de caché/CDN | 3 en adelante | Rewrites a nivel de Vercel (no DNS), feature flags con purga de caché controlada |

## 20. Decisiones del dueño (2026-09-10) y lo que queda abierto

Las 7 decisiones de negocio que bloqueaban el plan ya fueron tomadas por el dueño del proyecto. Se registran aquí como referencia congelada — no se vuelven a abrir sin una razón explícita nueva.

1. **Publicador v1 vs. v2 — DECIDIDO:** se consolidan en un único flujo moderno. No quedan dos publicadores como productos paralelos. Ver Fase 8.
2. **Las tres versiones de TPL Studio — DECIDIDO:** no se elige ninguna como base única. Se construye un Studio nuevo sobre el AI Gateway, reutilizando piezas funcionales de las tres antes de descartar código. Ver Fase 12 y §10.
3. **Tabla `parcelas` — DECIDIDO:** se clasifica oficialmente como `LEGACY — NO USAR — PENDIENTE DE RETIRO`. No se elimina ni se archiva todavía; el retiro definitivo queda como tarea posterior, tras un período de verificación con rollback.
4. **Los 4 CSS-alias muertos — DECIDIDO:** se mantienen durante la migración, para evitar referencias externas inesperadas. Tarea posterior: localizar referencias, confirmar que no son necesarios, eliminarlos, verificar regresión.
5. **Modelo de cuentas para propietarios — DECIDIDO:** se mantiene el acceso actual por token; no se introducen cuentas reales obligatorias todavía. La cuenta opcional queda para una fase posterior.
6. **Marketplace de partners — DECIDIDO:** primero se construye el AI Gateway y se estabiliza TPL Studio; el Marketplace avanza después, para no duplicar infraestructura de IA/video entre ambos.
7. **`crear-pago-contratacion` / `flow-webhook-contratacion` — DECIDIDO:** se reclasifican como **BLOQUEADOR OPERATIVO**, no decisión de negocio. Se agrega una tarea de despliegue/verificación antes de cualquier fase que dependa de contratación/pago (Prerequisito crítico B). No se despliegan en esta actualización del plan.

### Lo que sigue abierto (no son bloqueadores, son detalles de ejecución)

- Fecha/disparador exacto para ejecutar el Prerequisito crítico A (seguridad de Veo) y el Prerequisito crítico B (despliegue de Flow contrataciones) — ambos ya aprobados en principio, falta agendarlos.
- Momento exacto de la tarea de saneamiento de los 3 RPC rotos.
- Momento exacto de la tarea de retiro definitivo de `parcelas` y del bucket `informes-tasacion`.
- Relación exacta entre `tpl_studio_drafts`/`tpl_studio_proyectos` y entre `tpl_informes_tasacion`/`tpl_ordenes_informe` — pendiente de verificación técnica, no de decisión.

---

## PRIMERA FASE A EJECUTAR (no ejecutada todavía)

> Esta sección describe únicamente **qué se haría** si se aprueba. No se ha tocado ningún archivo del sitio, no se ha instalado ninguna dependencia, no se ha creado ningún directorio nuevo del monorepo, no se ha tocado Supabase. Se ejecuta solo después de la aprobación explícita del dueño.

### Fase 0 — COMPLETADA (2026-09-10)

El contrato de datos fue auditado contra el repositorio y contra producción real (`docs/TPL-FASE-0-AUDITORIA-CONTRATO.md`), y las 13 decisiones del dueño quedaron incorporadas a este documento (§1–§20). No se creó `apps/`, no se creó `packages/`, no se instaló `pnpm`/`turborepo`/Next.js, no se tocó `frontend-v2/`, no se tocó Supabase.

### Antes de la Fase 1: los dos Prerequisitos críticos siguen sin ejecutarse

Ninguno de los dos bloquea técnicamente crear un monorepo vacío en la Fase 1, pero **sí deben resolverse antes de mover tráfico real** en cualquier fase posterior:

- **Prerequisito crítico A** — seguridad de `veo-generar-video`/`veo-consultar-video` (§14).
- **Prerequisito crítico B** — despliegue/verificación de `crear-pago-contratacion`/`flow-webhook-contratacion` (§14).

**Siguiente paso:** se solicitará autorización explícita y por separado para (a) ejecutar los Prerequisitos críticos y/o (b) iniciar la Fase 1 (infraestructura Next.js en paralelo, cero impacto en producción). Ninguna de las dos queda autorizada por la aprobación de esta actualización del plan.

---

## CHECKLIST DE APROBACIÓN PRE-FASE 1

- [x] Fase 0 aprobada.
- [x] Decisiones del dueño congeladas (§20).
- [x] Seguridad de Veo identificada como Prerequisito crítico A (§5, §14) — no corregida todavía.
- [x] Flow contratación identificado como Prerequisito crítico B (§5, §14) — no desplegado todavía.
- [x] Supabase sin cambios — ninguna tabla, RPC, RLS o Edge Function modificada durante la elaboración de este plan.
- [x] `frontend-v2/` intacto — ningún archivo del sitio actual fue tocado.
- [x] Ningún código de migración ejecutado.
- [x] Ninguna dependencia nueva instalada (`pnpm`, `Turborepo`, Next.js).
- [ ] Estrategia de coexistencia pendiente de prueba técnica antes de Fase 3 (§5, "Prueba técnica de coexistencia") — no se ha ejecutado.
- [x] La Fase 1, tal como está descrita, será únicamente infraestructura paralela (monorepo vacío, sin tráfico real).
- [x] `www.parcelalista.cl` no se toca en la Fase 1, bajo ninguna interpretación de su aprobación (§4).

Todo lo marcado `[x]` refleja el estado documental de este plan a la fecha; no implica que la Fase 1 ya esté autorizada a ejecutarse — esa autorización se pide aparte, como ya señala la sección anterior.
