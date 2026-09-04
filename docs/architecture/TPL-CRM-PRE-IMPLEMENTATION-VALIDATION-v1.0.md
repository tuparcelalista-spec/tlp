# Validación Pre-Implementación del CRM TPL — v1.0

> [!NOTE]
> **Documento de validación técnica y análisis forense del modelo de datos de Tu Parcela Lista (TPL)**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de validación:** 9 de agosto de 2026

Este documento detalla la validación técnica final y compatibilidad hacia atrás para la evolución comercial del CRM, analizando exhaustivamente la columna `estado` de `tpl_oportunidades`, las relaciones relacionales de visitas, actividades y el control de integridad de Supabase.

---

## 1. ANÁLISIS DE LA COLUMNA `tpl_oportunidades.estado`

### A. Definición y Estructura Actual (Evidencia SQL)
* **Archivo de Origen:** [202608020003_tpl_ecosistema_consolidado_v1.sql](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202608020003_tpl_ecosistema_consolidado_v1.sql#L68)
* **Definición Física:** `estado text not null default 'nueva'`
* **CHECK Constraint:** **INEXISTENTE**. No existe ninguna restricción tipo CHECK limitando los estados válidos de la columna `estado` en la tabla `tpl_oportunidades`.
* **Valores Utilizados Actuales:**
  - `'nueva'` (definido como valor default al cotizar o postular).
  - `'aceptada'`, `'rechazada'`, `'contactada'` (actualizados en la RPC de ofertas: `202608050005_tpl_ofertas_propiedad_y_activacion_postcompra_v1.sql:82`).

### B. Consumidores de `estado` (JS/HTML/RPC)
* **Frontend:** No hay comparaciones directas sobre el valor de `tpl_oportunidades.estado` en `crm-v2.js`. La UI actual solo lee el conteo total de oportunidades agregadas en el snapshot general y lista tablas de otras entidades.
* **Backend (RPC):**
  - La función `tpl_crear_proyecto_desde_cotizador_v1` inserta oportunidades con `estado = 'nueva'` ([202608050015_tpl_cerebro_supabase_proyectos_solicitudes_v1.sql:102](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202608050015_tpl_cerebro_supabase_proyectos_solicitudes_v1.sql#L102)).
  - La función `tpl_registrar_solicitud_proyecto_v1` inserta oportunidades con `estado = 'nueva'` ([202608050015_tpl_cerebro_supabase_proyectos_solicitudes_v1.sql:142](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202608050015_tpl_cerebro_supabase_proyectos_solicitudes_v1.sql#L142)).
* **Impacto de la Ampliación:** **Cero riesgo de incompatibilidad**. Dado que no existe una restricción CHECK en Supabase, podemos escribir cualquier estado del pipeline comercial en esta columna sin alterar ni romper la lógica transaccional pública existente.

---

## 2. NORMALIZACIÓN Y REVISIÓN DE LOS ESTADOS TARGET

### Matriz de Compatibilidad de Estados

| Estado Target | Existe Actualmente | Uso Actual | Uso Objetivo (Pipeline CRM) | Conflicto |
| :--- | :---: | :--- | :--- | :--- |
| **`nuevo_lead`** | SÍ | `'nueva'` (default al cotizar) | Entrada inicial de oportunidades | Ninguno (Se mapea `'nueva'` como `nuevo_lead` en UI) |
| **`contactado`** | SÍ | `'contactada'` (actualización de oferta) | Primer contacto telefónico/email | Ninguno |
| **`calificado`** | NO | Ninguno | Lead calificado con presupuesto | Ninguno |
| **`agendado`**   | NO | Ninguno | Visita agendada en calendario | Ninguno |
| **`negociacion`**| NO | Ninguno | Oferta comercial recibida | Ninguno |
| **`reservado`**  | NO | Ninguno | Lote reservado temporariamente | Ninguno |
| **`vendido`**    | NO | Ninguno | Operación comercial cerrada exitosa | Ninguno |
| **`perdido`**    | NO | Ninguno | Oportunidad descartada por pérdida | Ninguno |
| **`cancelado`**  | NO | Ninguno | Oportunidad anulada | Ninguno |

### Transiciones del Pipeline:
Las transiciones permitidas se controlarán exclusivamente a nivel del servicio frontend (`tpl-data-service.js`) y por medio de la RPC staff `tpl_crm_actualizar_fase_oportunidad_v1` para evitar inconsistencias lógicas. Se permite el retroceso voluntario de etapas, y la transición directa hacia `'perdido'` o `'cancelado'` desde cualquier fase.

---

## 3. RELACIONES E INTEGRIDAD RELACIONAL

### A. Oportunidad $\rightarrow$ Actor (Cliente)
* **FK Real:** `actor_cliente_id uuid references public.tpl_actores(id) on delete set null`.
* **Roles:** El actor mantiene su identificador único. Si realiza una compra, se le añade el rol `'comprador'` o `'cliente'` en `tpl_actor_roles` sin duplicar el registro maestro de `tpl_actores` ni perder su historial de postulaciones y cotizaciones previas.

### B. Oportunidad $\rightarrow$ Parcela
* **FK Real:** `catalogo_item_id uuid references public.tpl_catalogo_items(id) on delete set null` (en `tpl_oportunidades`).
* **Relación con Proyecto:** Si la cotización proviene del cotizador de casas, se asocia opcionalmente a un proyecto mediante `proyecto_id uuid references public.tpl_proyectos(id) on delete set null`. Esto permite cotizaciones con o sin parcelas físicas directas.

### C. Oportunidad $\rightarrow$ Proyecto
* **FK Real:** `proyecto_id uuid references public.tpl_proyectos(id) on delete set null`.
* **Estado:** **EXISTE** y está plenamente implementada en el esquema real ([202608020003_tpl_ecosistema_consolidado_v1.sql:66](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202608020003_tpl_ecosistema_consolidado_v1.sql#L66)).

---

## 4. ANÁLISIS DE LA TABLA `tpl_visitas` (BÚSQUEDA EXHAUSTIVA)

Se realizó una búsqueda minuciosa en la base de datos de Supabase y el código fuente. Se confirma que:
* **No existe ninguna estructura, tabla, vista, RPC ni metadato que represente visitas o agendas actualmente en el sistema.**
* Por lo tanto, la creación de la tabla relacional `tpl_visitas` es la única vía técnica e inevitable para implementar el módulo de calendario del CRM sin duplicar datos ni corromper el modelo relacional.

### Diseño de la tabla `tpl_visitas`:
* `id` (uuid, primary key, default gen_random_uuid()). *Obligatorio*.
* `oportunidad_id` (uuid references `tpl_oportunidades(id)` on delete cascade). *Obligatorio (FK)*.
* `actor_cliente_id` (uuid references `tpl_actores(id)` on delete set null). *Opcional (FK, desnormalizado por rendimiento)*.
* `propiedad_id` (uuid references `tpl_propiedades(id)` on delete set null). *Opcional (FK, desnormalizado)*.
* `responsable_actor_id` (uuid references `tpl_actores(id)` on delete set null). *Opcional (FK)*.
* `fecha_hora` (timestamptz). *Obligatorio*.
* `estado` (text, check `estado in ('programada','confirmada','realizada','cancelada','no_asistio')`). *Obligatorio*.
* `resultado` (text). *Opcional*.
* `observaciones` (text). *Opcional*.

---

## 5. AUDITORÍA DE `tpl_eventos` Y `metadata`

### A. Tabla `tpl_eventos`
* **Propósito:** Log técnico de auditoría y auditoría inmutable de transacciones.
* **Estructura:** Posee columnas `actor_id`, `propiedad_id`, `proyecto_id`, `evento`, `categoria`, `origen`, `pagina`, `prioridad`, `descripcion`, y `metadata`.
* **Uso para Historial:** **SÍ, es adecuado.** Su estructura relacional permite reconstruir detalladamente la transición de estados comerciales del pipeline (ej. guardando eventos como `'oportunidad.fase_cambiada'`).

### B. Uso de `metadata` (JSONB)
* **🟢 Adecuado para bitácoras operativas:** Almacenar notas rápidas del ejecutivo comercial, recordatorios informales y metadatos de UTM dentro del JSONB `metadata` de `tpl_actores` o `tpl_oportunidades` es una práctica correcta que evita la creación de tablas redundantes y mantiene el principio de no-duplicación.

---

## 6. VEREDICTO DE GOBIERNO Y DECISIÓN FINAL

### Matriz de Decisión Definitiva

| Elemento | Decisión | Justificación |
| :--- | :--- | :--- |
| `tpl_actores` | 🟢 REUTILIZAR | Maestro único de personas y empresas. |
| `tpl_actor_roles` | 🟢 REUTILIZAR | Permite la asignación multi-rol (Partner, Cliente, Lead). |
| `tpl_oportunidades` | 🟢 REUTILIZAR | Centraliza las cotizaciones comerciales y proyectos. |
| `tpl_oportunidades.estado`| 🟢 REUTILIZAR | **No tiene CHECK constraint en DB**. Totalmente viable para el pipeline. |
| `tpl_eventos` | 🟢 REUTILIZAR | Ideal para registrar el histórico inmutable de auditoría. |
| `tpl_propiedades` | 🟢 REUTILIZAR | Ficha de características físicas y estado operativo. |
| `tpl_proyectos` | 🟢 REUTILIZAR | Centralización física de compras casa + terreno. |
| `tpl_casas` | 🟢 REUTILIZAR | Catálogo canónico de modelos de viviendas prefabricadas. |
| `tpl_tasaciones` | 🟢 REUTILIZAR | Historial inmutable de tasaciones calculadas. |
| `tpl_visitas` | 🔴 NUEVA ESTRUCTURA | Inevitable para resolver la agenda y calendario. |
| `fase_comercial` | ❌ NO CREAR | Redundante con `tpl_oportunidades.estado`. |
| Tabla de Leads | ❌ NO CREAR | Duplicaría e invalidaría el maestro de `tpl_actores`. |
| Tabla de Clientes | ❌ NO CREAR | Duplicaría `tpl_actores`. |
| Tabla de Actividades | ❌ NO CREAR | Se utiliza `tpl_eventos` + `metadata` en actores. |

---

## Respuestas al Cuestionario de Validación:

1. **¿Podemos reutilizar `tpl_oportunidades.estado`?** Sí.
2. **¿Modificar su CHECK es seguro?** Sí, de hecho no existe un CHECK constraint en la base de datos actual sobre esta columna.
3. **¿Existe riesgo de romper estados actuales?** No, los estados existentes (`'nueva'`, `'contactada'`) se mantienen completamente compatibles.
4. **¿`tpl_eventos` sirve para historial de pipeline?** Sí, es la estructura ideal para auditorías inmutables de transiciones.
5. **¿`metadata` debe utilizarse para actividades comerciales?** Sí, únicamente para notas de seguimiento e interacciones operativas informales.
6. **¿`tpl_visitas` is realmente inevitable?** Sí, debido a su naturaleza de relación cruzada N-a-N.
7. **¿Existe alguna RPC que podamos reutilizar?** No, las acciones de creación y actualización del pipeline del staff requieren RPCs dedicadas protegidas con privilegios.
8. **¿Existe alguna tabla que estemos a punto de duplicar?** Ninguna.
9. **¿Qué cambios son estrictamente necesarios?** Agregar la tabla `tpl_visitas`, registrar las 3 RPCs y expandir la lógica visual del Kanban en frontend.
10. **¿Cuál es el mínimo modelo necesario?** Mantener a las personas en `tpl_actores`, los negocios en `tpl_oportunidades` (usando `estado` para fases) y las agendas de terreno en `tpl_visitas`.
