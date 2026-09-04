# Auditoría Post-Migración de la Fase 1 — v1.0

> [!NOTE]
> **Documento de auditoría técnica y control de calidad pos-migración de la Fase 1 del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla la validación física, relacional y de gobernanza de datos para la Fase 1 implementada (tabla `public.tpl_visitas`), evaluando su consistencia contra el esquema de Supabase y determinando las observaciones de arquitectura necesarias antes de avanzar a la Fase 2 y 3.

---

## 1. VALIDACIÓN FÍSICA DE LA TABLA `public.tpl_visitas`

Se certifica que la estructura de la tabla coincide con el archivo de migración `202608090000_tpl_crm_visitas_v1.sql`:

* **`id`:** uuid, PK autogenerado (`default gen_random_uuid()`). *Obligatorio*.
* **`oportunidad_id`:** uuid, Foreign Key referenciando a `public.tpl_oportunidades(id)`. *Obligatorio*.
* **`usuario_staff_id`:** uuid, Foreign Key referenciando a `public.tpl_actores(id)`. *Opcional*.
* **`fecha_hora`:** timestamptz. *Obligatorio*.
* **`estado`:** text, con valor por defecto `'programada'`. *Obligatorio*.
* **`resultado`:** text. *Opcional*.
* **`notas`:** text. *Opcional*.
* **Constraints de estado:** Restringido a `('programada', 'confirmada', 'realizada', 'cancelada', 'no_asistio')` mediante CHECK constraint de nivel de columna.
* **Timestamps:** `created_at` y `updated_at` con default `now()`.

---

## 2. INTEGRIDAD DE FOREIGN KEYS Y CASCADAS

* **`oportunidad_id` $\rightarrow$ `tpl_oportunidades(id)`:** Definido con la cláusula `ON DELETE CASCADE`.
* **`usuario_staff_id` $\rightarrow$ `tpl_actores(id)`:** Definido con la cláusula `ON DELETE SET NULL`.

### Punto Crítico de Gobierno: El impacto del `CASCADE`
* **Análisis Técnico:** Si se ejecuta un `DELETE` físico sobre una Oportunidad, la cláusula `ON DELETE CASCADE` eliminará físicamente las visitas históricas asociadas de forma automática.
* **Conflicto con la Trazabilidad:** Esto contradice el principio de inmutabilidad de los datos históricos comerciales.
* **Recomendación:** Dado que el frontend del CRM y las políticas de base de datos prohíben el borrado físico de oportunidades, el riesgo inmediato está mitigado. Sin embargo, para futuros mantenimientos a nivel de base de datos por parte de administradores, se recomienda cambiar la regla de cascada a `ON DELETE RESTRICT` o gestionar el borrado lógico a través de un estado `'archivado'`.

---

## 3. SEGURIDAD (RLS) Y TRIGGERS

* **RLS:** La tabla tiene la RLS habilitada mediante `alter table public.tpl_visitas enable row level security;`.
* **Política `tpl_visitas_staff_all`:**
  - Aplicada al rol de Supabase `authenticated`.
  - Las cláusulas `using` y `with check` ejecutan de forma segura el método `public.tpl_es_staff()`.
  - **Resultado:** No existen políticas adicionales que expongan los datos a accesos públicos no autorizados.
* **Trigger `trg_tpl_visitas_updated_at`:**
  - Existe y está asignado para dispararse antes de un `UPDATE`.
  - La función invocada `public.tpl_set_updated_at()` es compatible y coincide con el estándar del proyecto.

---

## 4. ÍNDICES Y DESEMPEÑO DE CONSULTAS

Se confirma la existencia de tres índices clave:
1. `tpl_visitas_oportunidad_idx` $\rightarrow$ Permite cargar rápidamente las visitas asociadas al historial de una Oportunidad.
2. `tpl_visitas_fecha_hora_idx` $\rightarrow$ Optimiza el ordenamiento cronológico para la agenda general del CRM.
3. `tpl_visitas_staff_idx` $\rightarrow$ Permite buscar las visitas agendadas de un ejecutivo en un rango de fecha/hora para prevenir sobreposiciones.

---

## 5. AUDITORÍA DE DATOS Y COMPATIBILIDAD

* **Registros Existentes:** Se certifica que la tabla `tpl_visitas` se encuentra vacía (`0` registros), lo cual es correcto tras el proceso de migración de la Fase 1.
* **Compatibilidad Estructural:** La creación de la tabla `tpl_visitas` no alteró los esquemas físicos ni las relaciones existentes de `tpl_propiedades`, `tpl_actores`, `tpl_proyectos` o `tpl_tasaciones`.
* **Diferenciación de Impacto:**
  - *Impacto Estructural Directo:* **Nulo**. No se alteró ninguna tabla de la base de datos de producción.
  - *Impacto Funcional Potencial:* **Bajo-Medio**. El único impacto es la futura ingesta de datos a través de joins que vinculan oportunidades y proyectos.

---

## 6. REVISIÓN ESPECIAL DE LA ASOCIACIÓN DE STAFF

* **Hallazgo de Arquitectura:** En Supabase existe la tabla `public.tpl_staff`, la cual mapea los usuarios con acceso al CRM mediante `user_id uuid primary key references auth.users(id)`.
* **Justificación de la FK hacia `tpl_actores`:** Referenciar `tpl_actores(id)` para la columna `usuario_staff_id` de la visita es la decisión correcta y coherente con el diseño de base de datos canónico. En TPL, entidades como `tpl_publicaciones` también referencian a `tpl_actores(id)` en su columna `responsable_actor_id` (para permitir que asesores o externos actúen como ejecutivos asignados sin requerir credenciales de login de Supabase en la tabla `tpl_staff`).

---

## 7. VEREDICTO DE LA AUDITORÍA DE FASE 1

### 🟡 APROBADA CON OBSERVACIONES

**Justificación:**
La tabla, índices, trigger y RLS fueron creados de manera exacta y segura. La única observación crítica a tener en cuenta para fases futuras es la cláusula `ON DELETE CASCADE` en `oportunidad_id`, la cual debe ser controlada prohibiendo estrictamente los `DELETE` físicos sobre la tabla `tpl_oportunidades` en la interfaz.

**Se autoriza la presentación de esta auditoría y se detiene el proceso a la espera de aprobación formal antes de continuar con la Fase 2 y 3.**
