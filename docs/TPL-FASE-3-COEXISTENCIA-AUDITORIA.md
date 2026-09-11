# TPL — Auditoría Técnica de Coexistencia (Fase 3)

**Estado: DOCUMENTO DE TRABAJO — SOLO AUDITORÍA. Ninguna recomendación de
este documento autoriza implementación, despliegue ni cambios en Vercel,
Supabase, `frontend-v2`, `apps/publico`, `packages/core` o `@tpl/ui`.**

Fecha de la auditoría: 2026-09-10. Este documento es independiente de
`TPL-FASE-3-AUDITORIA-ARQUITECTURA.md` (auditoría de la homepage y
propuesta de arquitectura) — no lo reemplaza ni lo modifica. Cubre
exclusivamente el mecanismo técnico de coexistencia entre la homepage
actual (`frontend-v2`, en producción) y la nueva homepage (`apps/publico`,
en desarrollo).

**Metodología:** toda la evidencia de este documento proviene de comandos
de solo lectura contra la cuenta real de Vercel (`vercel project
inspect`, `vercel ls`, `vercel inspect`, `vercel domains inspect`,
`vercel env ls`, `vercel edge-config ls`, `vercel routes ls`) y de los
archivos de configuración ya existentes en el repositorio
(`vercel.json`, `.vercel/project.json`). No se ejecutó ningún comando de
escritura (`deploy`, `env add`, `routes add`, `domains add`, `git
connect`, etc.). Cada afirmación usa la misma etiqueta de certeza que
`TPL-FASE-0-AUDITORIA-CONTRATO.md`:

- **HECHO CONFIRMADO** — verificado con un comando real, reproducible.
- **PENDIENTE DE VERIFICAR** — hay indicios pero no evidencia suficiente.
- **NO IMPLEMENTADO EN ESTA AUDITORÍA** — se describe una posibilidad
  técnica, explícitamente no probada ni construida ahora.

---

## 1. Arquitectura Vercel actual — producción (`tpl-prueba-nueva`)

| Campo | Valor | Certeza |
|---|---|---|
| Proyecto | `tpl-prueba-nueva` | HECHO CONFIRMADO (`vercel project ls`) |
| Dominio de producción | `www.parcelalista.cl` (+ `parcelalista.cl` apex) | HECHO CONFIRMADO (`vercel domains inspect parcelalista.cl`) |
| Root Directory | `frontend-v2` | HECHO CONFIRMADO (`vercel project inspect tpl-prueba-nueva`) |
| Framework Preset | **Other** (sitio estático, no Next.js) | HECHO CONFIRMADO |
| Build Command | `npm run vercel-build` o `npm run build` (fallback por defecto, sin override explícito visible) | HECHO CONFIRMADO |
| Output Directory | `public` si existe, o `.` | HECHO CONFIRMADO |
| DNS | Gestionado por Vercel (`ns1/ns2.vercel-dns.com`, ambos verificados `√`) | HECHO CONFIRMADO |
| `vercel.json` efectivo | `frontend-v2/vercel.json` (porque Root Directory = `frontend-v2`) — solo bloque `headers` (CSP, HSTS, cache-control por ruta de plataforma). **Sin `builds`, sin `routes`, sin `rewrites`.** | HECHO CONFIRMADO (leído directamente) |
| Variables de entorno | 0 (`vercel env ls` → "No Environment Variables found") | HECHO CONFIRMADO |
| Edge Config | 0 (`vercel edge-config ls` → "0 Global Configs found") | HECHO CONFIRMADO |
| Rutas nativas (`vercel routes`) | 0 (`vercel routes ls` → "0 Routes found") | HECHO CONFIRMADO |
| Método de deploy | CLI manual (`vercel --prod`), mismo usuario (`tuparcelalista-spec`) en cada deployment de la lista reciente; sin indicio de bot/Git Action | HECHO CONFIRMADO por patrón observado |
| Git integration (auto-deploy on push) | Sin evidencia de que exista — no hay subcomando de solo lectura en esta versión de CLI para confirmarlo directamente (`vercel git` solo admite `connect`/`disconnect`, ambos de escritura, no ejecutados) | PENDIENTE DE VERIFICAR |

**Hallazgo clave para la comparación de mecanismos (§5):** producción hoy
**no es un proyecto Next.js**. Es un sitio estático servido desde
`frontend-v2` con Framework Preset "Other". Esto es un dato nuevo,
confirmado en esta auditoría, no solo un hallazgo heredado del
experimento anterior.

---

## 2. Proyecto `tpl-publico-preview`

| Campo | Valor | Certeza |
|---|---|---|
| Proyecto | `tpl-publico-preview` | HECHO CONFIRMADO |
| Dominio | Ninguno propio — solo URLs `*.vercel.app` generadas por deployment | HECHO CONFIRMADO (`vercel domains ls` solo lista `parcelalista.cl`, asociado únicamente a `tpl-prueba-nueva`) |
| Root Directory (según `vercel project inspect`) | `.` (raíz del repo, no `apps/publico`) | HECHO CONFIRMADO |
| Framework Preset | Next.js | HECHO CONFIRMADO |
| Variables de entorno | 0 | HECHO CONFIRMADO |
| Edge Config | 0 (compartido con la cuenta completa) | HECHO CONFIRMADO |
| Rutas nativas (`vercel routes`) | 0 | HECHO CONFIRMADO |
| Configuración que permitió que `/` funcionara | El log del deployment más reciente (`7h` de antigüedad al momento de esta auditoría, `dpl_Aj8mQ5GFXN7nGvPC3n5QTnEknBRj`, estado Ready) muestra: *"WARNING! Due to `builds` existing in your configuration file, the Build and Development Settings defined in your Project Settings will not apply."*, seguido de una instalación pnpm exitosa de **12 workspace projects** y un build de Next.js 15.5.25 sobre `apps/publico` (`@tpl/publico@0.0.0 build`), con salida final: rutas `/`, `/_not-found`, `/design-system` generadas como estáticas. | HECHO CONFIRMADO (log real leído con `vercel inspect --logs`) |
| ¿Ese `vercel.json` con `builds` existe hoy en el repositorio? | **No.** Se buscó en todo el repositorio (`grep -r "builds"` sobre archivos `vercel.json`, incluyendo `apps/publico/vercel.json`, que no existe) y no se encontró ningún archivo con esa clave. | HECHO CONFIRMADO la ausencia actual; la explicación más consistente con la evidencia es que ese deployment (o su caché de build reutilizada) se generó antes de que el `vercel.json` de coexistencia del experimento Fase 3-A/3-B se eliminara del árbol de trabajo local — pero eso es una inferencia, no una confirmación. **PENDIENTE DE VERIFICACIÓN MEDIANTE UN FUTURO DEPLOY CONTROLADO**: solo un nuevo deploy (no ejecutado en esta auditoría, ni autorizado todavía) puede confirmar si el proyecto se construye hoy sin esa configuración `builds`. No se hizo ese deploy aquí porque esta etapa fue exclusivamente de auditoría, sin modificar el entorno. |
| ¿Puede mantenerse como entorno aislado? | Sí, con evidencia a favor: no tiene dominio propio, no tiene variables de entorno, no tiene Edge Config ni rutas activas — no hay ningún canal por el que pueda afectar producción hoy. | HECHO CONFIRMADO (ausencia de todo canal de conexión) |

---

## 3. Middleware — qué se sabe, sin volver a probarlo

Esta auditoría **no reimplementó ni volvió a probar** middleware —
instrucción explícita. Lo siguiente es la síntesis de lo ya documentado
en `TPL-FASE-3-AUDITORIA-ARQUITECTURA.md` (nota sobre el experimento
Fase 3-A/3-B, ya verificado en su momento de forma directa) más un
hallazgo nuevo de esta auditoría:

- **Qué se probó antes:** una regla de rewrite incondicional en
  `apps/publico/middleware.ts` sobre el proyecto de prueba aislado.
- **Resultado:** el middleware **no se ejecutó** bajo el modo de
  despliegue `builds` legacy que usa ese proyecto (confirmado de forma
  directa en su momento).
- **¿Depende de `builds` legacy / Root Directory?** Parcialmente — el
  hallazgo histórico ata la falla específicamente a ese modo de
  despliegue. Sigue **PENDIENTE DE VERIFICAR** si una configuración de
  Root Directory distinta (por ejemplo, apuntando literalmente a
  `apps/publico` en vez de a la raíz del repo, algo que requiere el
  dashboard de Vercel, no esta versión de CLI) resolvería la ejecución
  de middleware en un proyecto de solo Next.js.
- **Hallazgo nuevo de esta auditoría (§1):** incluso si esa
  configuración se resolviera, middleware es una función de **Next.js**
  — y el proyecto de **producción** (`tpl-prueba-nueva`) hoy no es un
  proyecto Next.js, es un sitio estático con Framework Preset "Other".
  Middleware no puede ejecutarse en el dominio de producción tal como
  está configurado ese proyecto hoy, independientemente de lo que pase
  en el proyecto de prueba aislado. Usar middleware como mecanismo de
  coexistencia con el dominio real exigiría primero convertir el
  proyecto de producción en un proyecto Next.js (o mover el dominio a
  uno) — eso es un cambio de plataforma, no solo un mecanismo de
  coexistencia.
- **¿Existe una configuración alternativa técnicamente viable?**
  PENDIENTE DE VERIFICAR — no descartada en absoluto, pero no probada, y
  requeriría como mínimo resolver los dos puntos anteriores antes de
  intentarse.

---

## 4. `vercel routes` — qué se sabe, sin volver a probarlo

Tampoco se reimplementó en esta auditoría. Síntesis de lo ya
documentado y verificado en vivo durante el experimento (ver nota en
`TPL-FASE-3-AUDITORIA-ARQUITECTURA.md`):

- **Qué se probó:** una regla de rewrite a nivel de proyecto usando el
  sistema nativo `vercel routes`, apuntando desde el proyecto de prueba
  hacia el sitio de producción real.
- **Qué funcionó:** el rewrite se sirvió en vivo (confirmado contra el
  `<title>` real de la página servida); y tanto activar como desactivar
  la regla (`publish`) surtió efecto de inmediato en ambas direcciones —
  rollback probado, no solo teórico.
- **Tipo de rewrite/rollback permitido:** a nivel de proyecto Vercel
  (plataforma), no a nivel de código de la aplicación — no depende de
  que el proyecto objetivo sea Next.js, ni de su Root Directory, ni de
  su configuración `builds`. Esto es una ventaja estructural real frente
  a middleware, dado el hallazgo de producción del §1.
- **Limitaciones no probadas en esta auditoría (PENDIENTE DE
  VERIFICAR):** no se verificó en el experimento original ni en esta
  auditoría si `vercel routes` admite condiciones más finas que un
  rewrite incondicional — por ejemplo, un porcentaje de tráfico,
  segmentación por cookie/header, o exclusión de bots/crawlers. Sin esa
  confirmación, no se puede asumir que sirva para un split de tráfico
  gradual; sí está confirmado que sirve para un rewrite total
  encendido/apagado con rollback instantáneo.
- **¿Adecuado para producción?** Para un rewrite total (todo o nada) con
  rollback instantáneo, sí, con evidencia a favor. Para un split
  gradual de tráfico real, PENDIENTE DE VERIFICAR.
- **Configuración que requeriría:** una regla de `vercel routes` en el
  proyecto donde se quiera aplicar el rewrite (producción, si el
  destino final es `www.parcelalista.cl`) apuntando al proyecto/URL de
  la nueva homepage — sin tocar `vercel.json`, sin middleware, sin Edge
  Config.

---

## 5. Comparación de alternativas (ninguna implementada)

| Criterio | A. Middleware + Next/Vercel moderno | B. `vercel routes` | C. Dos proyectos + subdominio de prueba | D. Híbrido: C para desarrollo, B para el corte de tráfico |
|---|---|---|---|---|
| **Seguridad** (aislamiento de producción durante la prueba) | Media — el mecanismo vive dentro del código de la app que sirve producción | Media-alta — regla a nivel de plataforma, no de código de app | Alta — producción no se toca en absoluto | Alta durante desarrollo (como C); media en el corte (como B) |
| **Reversibilidad** | Teórica, no probada bajo la configuración actual | Probada en vivo, en ambas direcciones | Total — no hay nada que revertir en producción hasta el corte final | Total durante desarrollo; probada en el corte (hereda B) |
| **Complejidad** | Alta — exige resolver primero que producción sea Next.js, y luego el propio middleware | Baja — una regla de plataforma | Muy baja — agregar un dominio a un proyecto ya existente | Baja a media — dos pasos simples en vez de uno complejo |
| **Riesgo para producción** | Alto — el mecanismo corre dentro del proyecto que sirve el dominio real | Medio — toca el enrutamiento del proyecto de producción, pero con rollback probado | Ninguno hasta el corte deliberado | Ninguno durante desarrollo; medio y acotado en el corte |
| **Compatibilidad con arquitectura actual** | Baja — producción no es Next.js hoy (hallazgo §1) | Alta — no depende del framework del proyecto destino | Alta — no exige cambiar nada de lo existente | Alta en ambas etapas |
| **Facilidad de rollback** | No probada bajo la configuración actual | Probada, instantánea | No aplica (nada que revertir hasta el corte) | Hereda la garantía probada de B en el momento del corte |
| **Dependencia de Root Directory** | Alta — el hallazgo histórico de middleware está directamente atado a esto | Ninguna | Ninguna | Ninguna |
| **Dependencia de `builds` (legacy)** | Alta — es la causa documentada de que middleware no se ejecute hoy | Ninguna | La que ya tenga `tpl-publico-preview` para construirse (ya funciona, confirmado en §2) — irrelevante para el mecanismo de coexistencia en sí | Igual que C en desarrollo; ninguna en el corte |
| **Impacto SEO** | Manejable si se implementa como rewrite (no redirect), pero sin evidencia de que sea viable hoy | Manejable — ya es un rewrite, no redirect, según lo probado | Requiere `noindex`/robots.txt en el subdominio de prueba para evitar contenido duplicado — patrón estándar, bien entendido | Igual que C en desarrollo; igual que B en el corte |
| **Impacto sobre `www.parcelalista.cl`** | Directo — el dominio real ejecutaría el mecanismo | Directo pero acotado a una regla de enrutamiento, con rollback probado | Ninguno hasta que se decida el corte final | Ninguno durante desarrollo; el mismo impacto acotado de B en el corte |

---

## 6. Recomendación (pendiente de aprobación — ver cierre)

- **Mecanismo preferido:** **D — híbrido**. Usar un subdominio de prueba
  (opción C) apuntando a `tpl-publico-preview` (o un proyecto equivalente)
  durante todo el desarrollo y prueba de `apps/publico`, sin tocar
  producción en absoluto. Cuando la arquitectura de homepage esté
  aprobada y probada en ese subdominio, usar `vercel routes` (opción B
  — ya probado en vivo, con rollback instantáneo confirmado en ambas
  direcciones) para el corte de tráfico real hacia `www.parcelalista.cl`,
  en vez de saltar directamente a un mecanismo sin resolver.
- **Mecanismo alternativo:** **B sola**, sin subdominio intermedio, si se
  prefiere probar directamente sobre el dominio real desde antes —
  sacrifica el aislamiento total de C a cambio de probar en el dominio
  definitivo desde el principio.
- **Mecanismo descartado por ahora:** **A — Middleware**. No por ser
  técnicamente inferior en su diseño, sino porque depende de dos
  condiciones no resueltas hoy: (1) que el proyecto de producción sea
  Next.js (hoy es un sitio estático "Other" — hallazgo confirmado en
  §1), y (2) que se resuelva la causa por la que middleware no se
  ejecutó bajo el modo de despliegue actual del proyecto de prueba
  (§3). Ninguna de las dos está descartada de forma permanente — ambas
  siguen como **PENDIENTE DE VERIFICAR** si en algún momento se decide
  investigarlas específicamente.

---

## 7. Criterio de aceptación — evaluado contra el mecanismo preferido (D)

| # | Criterio | ¿D lo cumple? |
|---|---|---|
| 1 | `www.parcelalista.cl` sigue funcionando con la homepage actual | Sí — no se toca en la etapa de desarrollo; en el corte, `vercel routes` ya probó rollback instantáneo si algo falla |
| 2 | Desarrollar y probar `apps/publico` aisladamente | Sí — subdominio propio, sin dominio ni variables ni rutas compartidas con producción (confirmado en §2) |
| 3 | Enviar tráfico de prueba a la nueva homepage | Sí, de forma deliberada/opt-in vía el subdominio; un split aleatorio de tráfico real anónimo (ej. 5%) sigue **PENDIENTE DE VERIFICAR** si `vercel routes` lo soporta (§4) |
| 4 | Volver inmediatamente a la homepage actual | Sí en la etapa de desarrollo (nada que revertir); sí en el corte, con rollback ya probado en vivo (§4) |
| 5 | No modificar Supabase para lograrlo | Sí — ningún mecanismo de los evaluados toca Supabase; todos operan a nivel de Vercel/routing |
| 6 | No depender de una migración destructiva | Sí — agregar un dominio y, después, una regla de enrutamiento son ambas operaciones aditivas y reversibles, no migraciones |
| 7 | Permitir una migración progresiva posterior | Sí — es exactamente el propósito de separar desarrollo (C) del corte de tráfico (B) en dos pasos independientes |

---

## DECISIÓN DE ARQUITECTURA — OPCIÓN D (HÍBRIDO) APROBADA; IMPLEMENTACIÓN PENDIENTE

**Fecha de aprobación: 2026-09-10.** El dueño del proyecto aprobó
formalmente la **Opción D** de este documento como mecanismo de
coexistencia para esta migración:

1. **Desarrollo y pruebas:** `apps/publico` se desarrollará y validará
   de forma aislada en un proyecto Vercel independiente, asociado
   posteriormente a un subdominio de prueba con `noindex`.
   `www.parcelalista.cl` permanece completamente intacto durante esta
   etapa.
2. **Corte de tráfico real:** una vez que la nueva homepage esté
   implementada, validada y aprobada, se usará `vercel routes` como
   mecanismo de conmutación, aprovechando el rollback instantáneo ya
   probado en vivo (§4).
3. **Middleware (Opción A) queda descartado para esta migración** —
   por las restricciones confirmadas en esta auditoría (Root Directory,
   proyecto de producción estático, coexistencia con configuración
   legacy). No se investigará ni implementará salvo autorización futura
   específica.

**Esta es una aprobación de arquitectura, no de implementación.**
Ninguna parte de esta aprobación autoriza ejecutar todavía: crear el
proyecto o subdominio de prueba, configurar DNS, aplicar `noindex`,
crear reglas de `vercel routes`, aplicar rewrites, cambiar Root
Directory o Framework de ningún proyecto, ni modificar producción de
ninguna forma. La implementación de coexistencia se realizará como una
etapa separada y explícitamente autorizada, cuando corresponda.

Hasta esa autorización, sigue vigente todo lo verificado en esta
auditoría (§1–§7): 0 dominios adicionales, 0 variables de entorno, 0
Edge Configs y 0 rutas activas en ambos proyectos; `www.parcelalista.cl`
sin modificaciones.

