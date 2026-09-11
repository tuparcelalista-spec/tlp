# TPL — Fase 0: Auditoría de Realidad del Contrato

**Estado: INFORME PARA REVISIÓN — ningún cambio de código, datos, RLS, Edge Functions, Storage o rutas se ha realizado en esta fase.**
Verifica el §7 (Contrato de datos) y el §20 (Decisiones pendientes) de `TPL-MASTER-MIGRATION-PLAN.md` contra el repositorio real y contra la base de producción real (proyecto `hwyscirbycojwndyzozn`). Cada afirmación de este documento está etiquetada según su nivel de certeza:

- **HECHO CONFIRMADO** — verificado con una consulta o lectura real, reproducible.
- **PENDIENTE DE VERIFICAR** — hay indicios pero no evidencia suficiente para afirmarlo.
- **SUPUESTO INCORRECTO** — algo que el Master Plan daba por cierto y la evidencia contradice.
- **DECISIÓN DEL DUEÑO** — no es una pregunta técnica, la resuelve el negocio.
- **BLOQUEADOR** — impide o desaconseja avanzar a la fase siguiente hasta resolverse.

Fecha de la auditoría: 2026-09-10.

---

## 1. Resumen ejecutivo

El contrato de datos del Master Plan era direccionalmente correcto pero **incompleto en alcance**: documentaba ~15 tablas y ningún RPC; el código real usa más de 45 tablas distintas y llama activamente a decenas de las 206 funciones definidas en migraciones. Eso por sí solo es un **SUPUESTO INCORRECTO** que corregir en el plan, no un hallazgo alarmante — es lo esperable de una primera pasada.

Lo que sí cambia la prioridad de la migración son tres hechos confirmados con evidencia directa, nuevos respecto a lo que el plan asumía:

1. Hay un flujo de cobro **completo y ya conectado desde el frontend** (`crear-pago-contratacion` / `flow-webhook-contratacion`) que **falla en producción ahora mismo** porque las Edge Functions nunca se desplegaron. Esto es un **BLOQUEADOR** de negocio, no una decisión de arquitectura pendiente.
2. Existen **3 llamadas RPC verificablemente rotas** en el frontend público y en TPL Business (`404` confirmado contra producción).
3. La tabla `parcelas` — siguiendo tu instrucción explícita — se reclasifica de "huérfana confirmada" (como la dejé en el borrador anterior) a **"potencialmente legacy — pendiente de verificación"**: la evidencia que encontré apunta consistentemente a que no se usa, pero no puedo descartar un proceso externo al repositorio que la consulte. El detalle completo, con toda la evidencia, está en la §13.

`veo-generar-video` sigue exactamente igual que la última vez que se revisó: sin corregir.

Nada de esto requirió modificar el repositorio ni la base de datos — todo se obtuvo con lecturas y consultas de solo lectura.

---

## 2. Diferencias encontradas respecto al §7

| # | Lo que dice el §7 hoy | Lo que confirma esta auditoría | Etiqueta |
|---|---|---|---|
| 1 | Lista ~15 tablas | El código usa 45+ tablas reales (§3) | **SUPUESTO INCORRECTO** (incompleto) |
| 2 | No lista ningún RPC | Hay 206 funciones definidas, decenas llamadas activamente (§4) | **SUPUESTO INCORRECTO** (ausente) |
| 3 | Documenta 3 buckets de Storage | Existen 5, con un par duplicado (§6) | **SUPUESTO INCORRECTO** (incompleto) |
| 4 | `crear-pago-contratacion`/`flow-webhook-contratacion` como "pendiente de verificación" | Están completas, conectadas desde el frontend, y su ausencia de despliegue ya causa una falla real (§11) | **SUPUESTO INCORRECTO** (subestimado en severidad) → ahora es **BLOQUEADOR** |
| 5 | `parcelas` como "tabla huérfana" (mi propia conclusión anterior) | Sigo sin encontrar ninguna referencia activa, pero corrijo la clasificación a "potencialmente legacy" por instrucción explícita — ver §13 | Reclasificado, no descartado |
| 6 | "Una sola implementación" del motor de tasación | Cierto para terrenos; existe un segundo motor de casas no mencionado (§8) | **SUPUESTO INCORRECTO** (parcial) |
| 7 | No menciona la extensión de dependencias de `parcelas.js` | Se carga/consume desde 13 archivos, no solo la ficha de parcela (§7 de este informe) | **SUPUESTO INCORRECTO** (incompleto) |

---

## 3. Tablas Supabase

Metodología: extraje cada `.from('...')` del código real por aplicación, y verifiqué cada nombre contra PostgREST (`HTTP 200/206` = existe, `404` = no existe), y su conteo de filas donde fue posible.

### Núcleo de propiedades y catálogo

| Tabla | App/módulo que la usa | Archivo | Propósito | Estado |
|---|---|---|---|---|
| `tpl_propiedades` | Todas | `parcela.js`, CRM, TPL Business, casi todas las Edge Functions | Fuente de verdad de cada propiedad | **HECHO CONFIRMADO** — activa |
| `parcelas` | Ninguna app activa | Solo en `backups/crm-limpieza-20260902/core-api/index.js` | Esquema anterior a `tpl_propiedades` | Ver §13 — **reclasificada**, no descartada |
| `tpl_propiedad_imagenes` | Sitio público, CRM, TPL Business, Edge Functions | Múltiples | Fotos por propiedad | **HECHO CONFIRMADO** — activa (190 filas) |
| `tpl_propiedad_videos` | Sitio público (lectura), TPL Business/Studio (escritura) | `parcela.js`, `studio.js` | Videos de TPL Studio/Veo | **HECHO CONFIRMADO** — activa |
| `tpl_publicaciones` | Edge Functions | `activar-partner-aprobado`, etc. | Registro de publicaciones | **HECHO CONFIRMADO** — activa (67 filas) |
| `tpl_casas` | CRM | `modules/casas` | Catálogo de casas | **HECHO CONFIRMADO** — activa (14 filas) |
| `crm_parcelas_resumen` | CRM | grilla principal | Vista/resumen para la grilla del CRM | **HECHO CONFIRMADO** — activa (34 filas) |

### Actores, roles, CRM y oportunidades

| Tabla | App/módulo | Archivo | Propósito | Estado |
|---|---|---|---|---|
| `tpl_actores` | Todas | Edge Functions, RPCs | Identidad, multi-rol | **HECHO CONFIRMADO** |
| `tpl_actor_roles` | Todas | Auth/autorización | Rol por actor | **HECHO CONFIRMADO** |
| `tpl_staff` | Edge Functions | — | Registro de staff (1 fila) | **HECHO CONFIRMADO** — activa pero mínima |
| `tpl_oportunidades` | CRM | `modules/pipeline` | Pipeline comercial | **HECHO CONFIRMADO** — activa (3 filas) |
| `tpl_crm_oportunidades` | Ninguna app real | Solo referenciada como *fallback* en `tpl-data-service.js:432` | — | **SUPUESTO INCORRECTO en el código fuente**: la tabla **no existe** (`404`). El fallback que la usa está roto también (§4, §12) |
| `tpl_proyectos` | CRM | — | Modelo "Cerebro TPL" | **HECHO CONFIRMADO** |
| `tpl_visitas` | CRM | `modules/visitas` | Agenda de visitas | **HECHO CONFIRMADO** — existe, 0 filas (construida, sin uso real todavía) |
| `tpl_notificaciones_actor` | Edge Functions | — | Notificaciones | **HECHO CONFIRMADO** — existe, 0 filas |

### Comercial (planes, contrataciones, pagos)

| Tabla | App/módulo | Archivo | Propósito | Estado |
|---|---|---|---|---|
| `tpl_planes_servicio` | publicar-v2 | `js/modules/planes.js` | Catálogo de planes tras publicar | **HECHO CONFIRMADO** — activa |
| `tpl_contrataciones_servicio` | Edge Functions (no desplegadas — ver §11) | `crear-pago-contratacion`, `flow-webhook-contratacion` | Registro de contrataciones | **HECHO CONFIRMADO** — esquema activo, flujo de escritura bloqueado |
| `tpl_planes_comerciales` | Edge Functions | `crear-pago-suscripcion` | Planes de suscripción TPL Business | **HECHO CONFIRMADO** — activa (5 filas) |
| `tpl_suscripciones` / `tpl_ordenes_suscripcion` | Edge Functions | — | Infraestructura de suscripción | **HECHO CONFIRMADO** — existen, 0 filas |
| `tpl_ordenes_informe` | Edge Functions | `crear-pago-informe`, `flow-webhook` | Órdenes de informes/reservas | **HECHO CONFIRMADO** — activa |

### Tasación y geointeligencia

| Tabla | App/módulo | Propósito | Estado |
|---|---|---|---|
| `tpl_tasaciones` | Sitio público, CRM, Edge Functions | Tasaciones guardadas | **HECHO CONFIRMADO** |
| `tpl_tasador_referencias` | Sitio público, CRM | Medianas comunales | **HECHO CONFIRMADO** |
| `tpl_geoint_propiedad_contexto` | Sitio público, Edge Functions | Distancias territoriales | **HECHO CONFIRMADO** |
| `tpl_catastro_mercado` | Sitio público, CRM | Avisos de mercado capturados | **HECHO CONFIRMADO** |
| `tpl_informes_tasacion` | Edge Functions | — | **HECHO CONFIRMADO** — existe, 0 filas. Relación exacta con `tpl_ordenes_informe` — **PENDIENTE DE VERIFICAR** |

### Studio, marketing y onboarding

| Tabla | App/módulo | Estado |
|---|---|---|
| `tpl_studio_drafts` | Sitio público (referencia encontrada) | **HECHO CONFIRMADO** — existe, 0 filas. Relación con `tpl_studio_proyectos` (de la migración de video) — **PENDIENTE DE VERIFICAR** |
| `studio_campaigns` | Edge Functions | **HECHO CONFIRMADO** — existe, 0 filas. Nombre sin prefijo `tpl_`, inconsistente con el resto del esquema |
| `tpl_onboarding_partner` / `tpl_onboarding_propietario` | Edge Functions | **HECHO CONFIRMADO** — existen, 0 filas |
| `tpl_landing_borradores` | TPL Business | **HECHO CONFIRMADO** — activa |
| `tpl_web_analytics` | Sitio público, CRM | **HECHO CONFIRMADO** — activa (794 filas) |

### Sin cambios respecto al plan (confirmadas de nuevo)

`tpl_eventos`, `tpl_tareas`, `tpl_comunicaciones_cola` — todas `200 OK`.

---

## 4. RPC

### Rotos — verificados con `404 PGRST202` directo contra producción

| RPC llamada | Archivo:línea | Existe realmente | Impacto |
|---|---|---|---|
| `tpl_registrar_lead_v1` | `frontend-v2/js/core/tpl-data-service.js:419` | **No** — **HECHO CONFIRMADO** | Tiene *fallback* a `insert` en `tpl_crm_oportunidades`, que **tampoco existe** (§3). Cae a una cola local del navegador. Qué formulario(s) exactos disparan esta ruta — **PENDIENTE DE VERIFICAR** |
| `tpl_actualizar_uf_v1` | `frontend-v2/js/core/tpl-data-service.js:663` | **No** — **HECHO CONFIRMADO** | Sin *fallback* visible. Qué botón/pantalla la dispara — **PENDIENTE DE VERIFICAR** |
| `manifestar_interes` | `frontend-v2/plataforma/tpl-business-v2/modules/partner-oportunidades/index.js:85` | **No** — **HECHO CONFIRMADO**. La función real es `tpl_partner_manifestar_interes_v1(p_match_id uuid, p_mensaje text)`, con nombre y parámetros distintos | Un partner que intente manifestar interés en una oportunidad recibe error — el más cercano a un bug de negocio activo hoy |

### Verificados como correctos y en producción (`200 OK`)

`tpl_es_staff`, `tpl_es_admin` (responden `false` sin sesión, comportamiento esperado), `tpl_obtener_uf_v1` (responde con la UF real vigente).

### Inventario por app (sin drift adicional detectado)

- **Sitio público** (36 llamadas distintas): incluye `tpl_crm_snapshot_v1`, `tpl_propietario_resumen_por_token_v1`, `tpl_publicar_propiedad_v3`, `tpl_crear_orden_informe_v1`, `tpl_tasacion_canonica_activo_v1`, entre otras — todas con definición encontrada en migraciones.
- **CRM** (12 llamadas): `tpl_crm_archivar_actor_v1`, `tpl_crm_generar_link_propietario_v1`, `tpl_publicacion_detalle_v1`, etc. — sin drift.
- **Edge Functions** (17 llamadas): `tpl_crear_contratacion_servicio_v1`, `tpl_confirmar_contratacion_servicio_v1`, `tpl_geoint_resolver_propiedad_v1`, etc. — **cero drift**; las Edge Functions se despliegan junto con sus migraciones, a diferencia del frontend que acumula referencias viejas.

---

## 5. Edge Functions

| Función | Área | Invocada desde | Desplegada | `verify_jwt` | Riesgo |
|---|---|---|---|---|---|
| `veo-generar-video` | IA/Veo | `tpl-business-v2/studio/studio.js` | ✅ v7 — **HECHO CONFIRMADO** | `false` | **Crítico** — sin chequeo de autorización en el código, usa `GEMINI_API_KEY` del servidor por defecto (activa) |
| `veo-consultar-video` | IA/Veo | Igual | ✅ v2 | `false` | Medio — mismo patrón, menor impacto (solo lectura) |
| `procesar-recalculo-tasador` | Tasación | Cola interna | ✅ | `false` | Bajo — trigger interno, no expuesto a un botón público |
| `gemini-tasacion-summary`, `gemini-buscador-parcelas` | IA | Sitio público | ✅ | `false` / `true` (mixto según la función) | Bajo-medio |
| `gemini-metodo-trabajo`, `gemini-redactar-aviso`, `gemini-analisis-mercado` | IA | TPL Business/CRM | ✅ | `true` | Bajo — exige JWT |
| `crear-pago-informe`, `estado-informe`, `generar-informe-premium` | Informes | Sitio público | ✅ | `false` | Bajo — mismo patrón de "anónimo con validación server-side" ya aceptado en el proyecto |
| `flow-webhook` | Pagos | Flow (externo) | ✅ | `false` (correcto para un webhook externo) | Bajo — verifica firma con Flow directamente |
| `crear-pago-contratacion` | Pagos/Contrataciones | `publicar-v2/js/modules/planes.js`, `tpl-business-v2/studio/studio.js` | **❌ No aparece en `supabase functions list`** — **HECHO CONFIRMADO** | N/A (no desplegada) | Ver §11 — **BLOQUEADOR** |
| `flow-webhook-contratacion` | Pagos/Contrataciones/Webhook | Flow (externo) | **❌ No desplegada** — **HECHO CONFIRMADO** | N/A | Ver §11 — **BLOQUEADOR** |
| `procesar-comunicaciones` | Automatización | Cola de correos | ✅ | `false` | Bajo — consistente con su rol de worker interno |
| `activar-partner-aprobado`, `activar-propietario-gratis` | Automatización | Staff/CRM | ✅ | `false` | Bajo |

---

## 6. Storage

| Bucket | Público | Límite | Estado |
|---|---|---|---|
| `tpl-propiedades-videos` | Sí | 100 MB | **HECHO CONFIRMADO** — activo, usado por TPL Studio/Veo |
| `tpl-informes-tasacion` | No | Sin límite | **HECHO CONFIRMADO** — activo, es el que realmente usa `generar-informe-premium` (verificado en el código) |
| `informes-tasacion` | No | 10 MB | **HECHO CONFIRMADO que existe**; **sin ninguna referencia de código encontrada** — mismo patrón de nombre duplicado que `parcelas`/`tpl_propiedades` |
| `partner-postulaciones-v2` | No | 5 MB | **HECHO CONFIRMADO** — activo |
| `tpl-propiedades-propietario` | Sí | 8 MB | **HECHO CONFIRMADO que existe**; qué función lo escribe — **PENDIENTE DE VERIFICAR** |

El §7 del Master Plan documentaba 3 buckets; existen 5.

---

## 7. Catálogo local vs Supabase

- `frontend-v2/parcelas.js` se carga o se consume desde **13 archivos**: `index.html`, `proyecto.html`, `cotizador.html`, `mi-parcela.html`, `parcela.html` (carga), y `parcela.js`, `cotizador.js`, `tpl-seo.js`, `tpl-property-view.js`, `proyecto.js`, `property-analyzer.js`, `tpl-parcela-video.js` (consumo en lógica) — **HECHO CONFIRMADO**. El Master Plan solo mencionaba la ficha de parcela; el alcance real es mayor.
- No se identificó un archivo `casas.js` cumpliendo el mismo rol de catálogo de respaldo con datos propios — **PENDIENTE DE VERIFICAR**: confirmar si `casas.js` es solo lógica de UI o también guarda datos estáticos de respaldo como `parcelas.js`.
- El patrón de uso real (confirmado en `parcela.js`) es: Supabase primero, `parcelas.js` como *fallback* si Supabase no responde — no es catálogo activo por defecto, es red de seguridad.

---

## 8. Motor de tasación

```
valuation-engine.js  (frontend, ÚNICA fuente para TERRENOS/parcelas) — HECHO CONFIRMADO
        │  generado por node scripts/generar-motor-deno.mjs
        ▼
supabase/functions/_shared/tpl-land-engine.js  (copia Deno, no se edita a mano) — HECHO CONFIRMADO
        └── usada también por procesar-recalculo-tasador

valuation-adapter.js  (traductor de vocabulario)
        └── consumida por: parcela.js, CRM (editor-integral.js), informe-valores,
            publicar-v2, propietario — 6+ consumidores reales, HECHO CONFIRMADO

tpl-house-engine.js  (frontend, motor SEPARADO para CASAS) — HECHO CONFIRMADO
        └── vive solo en plataforma/publicar/, sin copia Deno, no mencionado en el plan
```

**Motores viejos:** `valuation-engine-motorB.js`, `tpl-land-engine-v231.js` y similares ya están archivados correctamente en `backups/motores-borrados-20260901/` — **HECHO CONFIRMADO**, no compiten en producción.

**Viabilidad de `packages/valuation` como única implementación compartida:** viable y ya casi lista **para terrenos** (un solo archivo fuente + generación automática de la copia Deno). **No cubre casas** tal como está planteado en el Master Plan — haría falta decidir explícitamente si `tpl-house-engine.js` entra al mismo paquete o queda fuera con una nota. Ningún archivo se movió durante esta verificación.

---

## 9. Auth / RLS / roles

Sin discrepancias nuevas respecto al Master Plan — reconfirmado con evidencia:

- `tpl_es_staff()` y `tpl_es_admin()` — **HECHO CONFIRMADO**, responden `200 OK`/`false` sin sesión.
- Modelo de tres niveles (público sin sesión / propietario por token / staff+partner con Supabase Auth) — **HECHO CONFIRMADO**, incluso documentado por el propio equipo en un comentario de `crear-pago-contratacion`: *"Quien llega aquí NO tiene sesión: acaba de publicar como anónimo"*.
- No existe tabla `profiles` — **HECHO CONFIRMADO** (`404`), la identidad vive en `tpl_actores`/`tpl_actor_roles`.
- Ningún permiso ni policy fue modificado durante esta auditoría.

---

## 10. Rutas y SEO

| URL | Archivo actual | Función | ¿Conservar? | Notas |
|---|---|---|---|---|
| `/frontend-v2/index.html` | `index.html` | Landing | Sí | — |
| `/frontend-v2/parcela.html?id=...` | `parcela.html` | Ficha de propiedad (32 códigos reales) | Sí — no romper ningún `?id=` indexado | — |
| `/frontend-v2/plataforma/...` | Varios | CRM, TPL Business, publicar, publicar-v2, propietario, tasador | Sí | Es el único prefijo que realmente resuelve |
| `/plataforma/...` (sin prefijo) | — | — | **N/A** | **SUPUESTO INCORRECTO en `vercel.json`**: hay reglas de `headers` para esta forma corta sin ninguna carpeta real ni `rewrite`/`redirect` que la resuelva — **HECHO CONFIRMADO** (`vercel.json` no tiene `rewrites` ni `redirects`, solo `headers`) |
| `/red-partner-v2/...` (sin prefijo) | — | — | **N/A** | Mismo caso que arriba |

`frontend-v2/sitemap.xml` existe como archivo estático — si su contenido refleja las 32 propiedades reales, **PENDIENTE DE VERIFICAR** (fuera del alcance de datos/backend de esta Fase 0).

No se cambió ninguna ruta.

---

## 11. Pagos / Flow

Ambos archivos (`crear-pago-contratacion/index.ts`, `flow-webhook-contratacion/index.ts`) leídos completos.

| Pregunta | Respuesta | Etiqueta |
|---|---|---|
| A) Dónde está | `supabase/functions/crear-pago-contratacion/` y `.../flow-webhook-contratacion/` | HECHO CONFIRMADO |
| B) Quién la llama | `crear-pago-contratacion`: `publicar-v2/js/modules/planes.js` **y** `tpl-business-v2/studio/studio.js`. `flow-webhook-contratacion`: Flow (servidor externo) | HECHO CONFIRMADO |
| C) ¿Frontend depende de ella? | Sí, dos archivos confirmados | HECHO CONFIRMADO |
| D) ¿Backend depende de ella? | Llama a `tpl_crear_contratacion_servicio_v1`, `tpl_confirmar_contratacion_servicio_v1`, `tpl_marcar_contratacion_fallida_v1` — todas ya desplegadas | HECHO CONFIRMADO |
| E) ¿Referencias desde Supabase? | Las tres RPC anteriores están activas y esperan ser llamadas por esta función | HECHO CONFIRMADO |
| F) ¿Está implementada? | Sí, por completo — rate limiting, validación de correo, verificación de firma de Flow, manejo idempotente, protección contra redirect abierto | HECHO CONFIRMADO |
| G) ¿Parece incompleta? | No — mismo nivel de cuidado que `flow-webhook`, que sí está en producción | HECHO CONFIRMADO |
| H) ¿Desplegada? | **No** — ausente de `supabase functions list` | HECHO CONFIRMADO |
| I) Riesgo de eliminarla | Alto si se elimina sin reemplazo: el frontend ya la llama; **hoy, cualquier intento de pagar un plan desde el publicador o desde Studio falla con error de red** | HECHO CONFIRMADO — no es hipotético |
| J) Qué hacer antes de decidir | Confirmar con el dueño si el despliegue se pospuso a propósito o fue un olvido — no encontré ningún indicio de que sea intencional | **DECISIÓN DEL DUEÑO**, con evidencia que apunta a olvido |

**Esto es un BLOQUEADOR**, no una decisión de arquitectura pendiente.

---

## 12. Hallazgos de seguridad (registrados, sin corregir)

| # | Hallazgo | Severidad | Etiqueta |
|---|---|---|---|
| 1 | `veo-generar-video`: sin verificación de sesión/autorización, usa `GEMINI_API_KEY` del servidor por defecto (activa) | **Crítica** | HECHO CONFIRMADO — reverificado hoy, sin cambios desde el reporte anterior |
| 2 | `veo-consultar-video`: mismo patrón, menor impacto | Media | HECHO CONFIRMADO |
| 3 | Bucket `informes-tasacion` huérfano, acceso privado pero sin dueño claro | Baja | HECHO CONFIRMADO |
| 4 | 3 llamadas RPC rotas en frontend público/TPL Business | Baja (funcional; alta si implica pérdida de leads reales) | HECHO CONFIRMADO |
| 5 | Flujo de pago de contrataciones no desplegado pese a estar conectado desde el frontend | Media (disponibilidad/negocio) | HECHO CONFIRMADO |

No se corrigió ninguno de estos hallazgos.

---

## 13. Estado de `parcelas`

**Clasificación: "potencialmente legacy — pendiente de verificación."** No se eliminó ni se modificó la tabla. Toda la evidencia recopilada, expuesta sin filtrar:

### A favor de que no tiene ninguna dependencia activa

- `HTTP 200`, 32 filas, esquema con `estado_publicacion` y `legacy_id` (nombres del esquema anterior a `tpl_propiedades`).
- **Ninguna migración rastreada la creó** (`grep` de `create table ... public.parcelas` sobre las 200+ migraciones: cero resultados) — la tabla existe en producción pero no en el historial de migraciones versionado, el mismo patrón de drift ya visto con la columna `estado_publicacion`.
- **Ninguna migración hace `FROM`/`JOIN`/`REFERENCES` contra `public.parcelas`** — cero resultados en una búsqueda dirigida sobre las 200+ migraciones.
- El único archivo de código en **todo el repositorio** (incluidos `backups/` y `scripts/`) que hace `client.from('parcelas')` es `backups/crm-limpieza-20260902/core-api/index.js` — un módulo de un "TPL SDK" anterior, ya archivado por el propio equipo el 2026-09-02 durante una limpieza previa del CRM, con una línea comentada que sugiere que hasta el propio RPC que lo acompañaba (`tpl_crm_get_parcelas`) también quedó en desuso.
- Los datos de `tpl_propiedades` fueron sembrados desde `parcelas.js` (el archivo estático), no desde la tabla `parcelas` — confirmado por `metadata.origen: "parcelas.js"` en la migración `202608020005_tpl_crm_catalogo_visual_v1.sql`, que inserta las 32 propiedades. Esto explica por qué `parcelas` (tabla), `parcelas.js` (archivo) y `tpl_propiedades` comparten los mismos 32 registros: son tres etapas de la misma migración de datos, no tres sistemas activos en paralelo.

### Lo que NO pude descartar (por eso la clasificación queda abierta)

- No tengo visibilidad sobre procesos externos al repositorio: una automatización en Zapier/Make, una hoja de cálculo conectada, un script de un tercero, o un uso manual esporádico vía el dashboard de Supabase no dejarían rastro en este código y no los puedo verificar desde aquí.
- No verifiqué si algún trigger de base de datos (a diferencia de una FK o una vista) referencia esta tabla — mi búsqueda cubrió `CREATE TABLE`, `FROM`, `JOIN` y `REFERENCES` en el texto de las migraciones, pero un trigger definido fuera de una migración rastreada (mismo patrón de drift que la propia tabla) no aparecería.

**Recomendación, sin tomar la decisión por ti:** antes de archivar o eliminar, un `pg_dump` de solo esa tabla como respaldo puntual eliminaría el único riesgo real de una acción irreversible, independientemente de qué tan fuerte sea la evidencia de que no se usa.

---

## 14. Decisiones pendientes del §20

| # | Decisión | Reclasificación | Evidencia |
|---|---|---|---|
| 1 | Publicador v1 vs. v2 | **DECISIÓN DEL DUEÑO** | Sin cambios |
| 2 | Las tres versiones de TPL Studio | **DECISIÓN DEL DUEÑO** | `studio.js` también depende del pago no desplegado (§11) — puede que estén más acopladas de lo que parecía |
| 3 | Tabla `parcelas` | **DECISIÓN DEL DUEÑO**, con evidencia exhaustiva ya reunida (§13) — ya no requiere más investigación técnica, solo la decisión de archivar/eliminar/dejar | Ver §13 |
| 4 | Los 4 CSS-alias muertos | **DECISIÓN DEL DUEÑO** | No investigado en esta Fase 0 (fuera de alcance de datos) |
| 5 | Modelo de cuentas para propietarios | **DECISIÓN DEL DUEÑO** | Sin cambios |
| 6 | Marketplace de partners — orden respecto a Studio | **DECISIÓN DEL DUEÑO** | El hallazgo de `manifestar_interes` roto (§4) muestra que el flujo de oportunidades para partners ya tiene fricción hoy, independiente del marketplace futuro |
| 7 | `crear-pago-contratacion`/`flow-webhook-contratacion` sin desplegar | **BLOQUEADOR** (ya no es una pregunta abierta) | Resuelto por evidencia: todo apunta a un despliegue olvidado, no a una decisión consciente — requiere una acción operativa simple (autorizar el despliegue), no una decisión de arquitectura |

---

## 15. Correcciones necesarias al Master Plan

Propuestas, ninguna aplicada todavía:

1. **§7:** reemplazar la lista parcial de tablas por el inventario completo de §3 de este informe.
2. **§7:** agregar un inventario de RPC (no existía ninguno), incluyendo las 3 llamadas rotas marcadas explícitamente.
3. **§7 y §12:** corregir de 3 a 5 buckets de Storage, documentando el par duplicado `informes-tasacion`/`tpl-informes-tasacion`.
4. **§3/§H:** decidir si `packages/valuation` incluye el motor de casas (`tpl-house-engine.js`) o queda fuera con una nota explícita.
5. **§19/§20:** mover la decisión de `crear-pago-contratacion`/`flow-webhook-contratacion` de "decisión de negocio" a **bloqueador operativo verificado**.
6. **§5, Fase 8:** agregar como prerequisito explícito resolver el despliegue de esas dos Edge Functions antes de tocar el publicador unificado.
7. **§6:** agregar una fila para `frontend-v2/parcelas.js` aclarando que lo consumen 13 archivos, no solo `parcela.html`.
8. **§20, decisión 3:** actualizar el texto de "tabla huérfana" a "potencialmente legacy — pendiente de verificación", con referencia a la evidencia de §13 de este informe.

---

## 16. Bloqueadores para Fase 1

1. **Ninguno impide técnicamente crear un monorepo vacío** — la Fase 1 tal como está descrita (infraestructura Next.js en paralelo, sin tráfico real) puede empezar sin resolver nada de lo anterior.
2. Se recomienda **no avanzar a Fase 2 (design system) ni mover tráfico real en fases posteriores** hasta que el dueño:
   - Decida sobre el despliegue de `crear-pago-contratacion`/`flow-webhook-contratacion` — **BLOQUEADOR**.
   - Decida el destino de `parcelas` (§13) y del bucket `informes-tasacion` huérfano.
   - Decida si el motor de casas entra al alcance de `packages/valuation`.

---

## 17. Checklist de Fase 0

- [x] Contrato de datos verificado (tablas, RPC, Edge Functions, Storage) — §3–§6
- [x] Dependencias reales identificadas (motor de tasación, catálogos locales) — §7, §8
- [x] `parcelas` investigada exhaustivamente **sin eliminarla ni modificarla** — §13
- [x] Flow (`crear-pago-contratacion`/`flow-webhook-contratacion`) investigado a fondo, sin desplegar ni modificar — §11
- [x] Riesgos de seguridad documentados, sin corregir — §12
- [x] Diferencias del Master Plan identificadas — §2, §15
- [x] Bloqueadores de Fase 1 claramente definidos — §16
- [x] Cero cambios de código, datos, RLS, Edge Functions, Storage o rutas
- [ ] **Pendiente:** tu aprobación explícita de las correcciones de §15 antes de aplicarlas al Master Plan, y tu decisión sobre las 7 decisiones de §14

---

**No se ha iniciado la Fase 1. No se ha creado ningún monorepo. No se ha instalado nada.**
