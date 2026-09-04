# Auditoría de Modelo de Datos y No-Duplicación — v1.0

> [!NOTE]
> **Referencia oficial de validación del modelo de datos relacional y gobierno de no-duplicación de TPL**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla el análisis de consistencia y no-duplicación estructural para la evolución de la base de datos de **Tu Parcela Lista (TPL)**, comparando el modelo de base de datos actual con las necesidades del diseño funcional target.

---

## 1. INVENTARIO REAL DE TABLAS Y ATRIBUTOS CLAVE (EVIDENCIA SQL)

Basado en las definiciones de las migraciones canónicas de Supabase (`supabase/migrations/`), se certifica el siguiente esquema real:

### A. Tabla `public.tpl_actores`
* **Definición de Origen:** [202607300000_tpl_nucleo_v1.sql](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202607300000_tpl_nucleo_v1.sql#L28)
* **Atributos Clave:**
  - `id` (uuid, primary key)
  - `tipo_actor` (text, default 'persona') $\rightarrow$ Check constraint: `('persona','empresa','organizacion')`.
  - `nombre` (text), `email` (text, unique), `telefono` (text), `rut` (text, unique)
  - `estado` (text, default 'activo') $\rightarrow$ Check constraint: `('activo','inactivo','bloqueado','archivado')`.
  - `metadata` (jsonb)
* **Regla de No-Duplicación:** Cualquier nuevo prospecto, lead calificado o partner captado debe insertarse en esta tabla para evitar crear un catálogo paralelo de usuarios.

### B. Tabla `public.tpl_actor_roles`
* **Definición de Origen:** [202607300000_tpl_nucleo_v1.sql](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202607300000_tpl_nucleo_v1.sql#L63)
* **Atributos Clave:**
  - `actor_id` (uuid references `public.tpl_actores(id)` on delete cascade)
  - `rol` (text) $\rightarrow$ Check constraint: `('comprador', 'propietario', 'corredor', 'partner', 'empresa_casas', 'contratista', 'proveedor', 'asesor_tpl', 'administrador')`.
  - `metadata` (jsonb)

### C. Tabla `public.tpl_propiedades`
* **Definición de Origen:** [202607300000_tpl_nucleo_v1.sql](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202607300000_tpl_nucleo_v1.sql#L83)
* **Atributos Clave:**
  - `id` (uuid, primary key)
  - `estado` (text) $\rightarrow$ Control de ciclo de vida (`publicada`, `pausada`, `archivada`).
  - `superficie_m2` (numeric), `precio_publicado` (bigint)
  - `rol_situacion` (text), `electricidad` (text), `agua` (text), `acceso` (text)
  - `metadata` (jsonb) $\rightarrow$ Almacena distancias territoriales canónicas calculadas y resúmenes de tasación.
* **Regla de No-Duplicación:** Los datos físicos y GEOINT del lote se editan únicamente en esta tabla. Ningún otro módulo debe replicar campos de factibilidades físicas.

### D. Tabla `public.tpl_oportunidades`
* **Definición de Origen:** [202608020003_tpl_ecosistema_consolidado_v1.sql](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202608020003_tpl_ecosistema_consolidado_v1.sql#L64)
* **Atributos Clave:**
  - `id` (uuid, primary key)
  - `actor_cliente_id` (uuid references `tpl_actores(id)` on delete set null)
  - `proyecto_id` (uuid references `tpl_proyectos(id)` on delete set null)
  - `catalogo_item_id` (uuid references `tpl_catalogo_items(id)` on delete set null)
  - `partner_actor_id` (uuid references `tpl_actores(id)` on delete set null)
  - `tipo` (text) $\rightarrow$ Check constraint: `('consulta','cotizacion','reserva','compra','arriendo','servicio')`
  - `estado` (text, default 'nueva')

---

## 2. GOBIERNO DE NO-DUPLICACIÓN (REUTILIZACIÓN OBLIGATORIA)

| Entidad Propuesta | Estructura Existente | Estrategia de Reutilización (Gobernanza) |
| :--- | :--- | :--- |
| **Ficha de Lead** | `tpl_actores` + `tpl_actor_roles` | Evitar crear la tabla `tpl_leads`. Un Lead debe ser un registro en `tpl_actores` con rol `comprador` en `tpl_actor_roles` y sub-estado `metadata->>'sub_estado' = 'lead_frio'`. |
| **Pipeline Kanban** | `tpl_oportunidades` | Reutilizar la tabla de oportunidades mapeando sus estados comerciales existentes. Evitar crear tablas de pipelines paralelas. |
| **Constructores / Partners** | `tpl_actores` + `tpl_actor_roles` | Catalogados mediante rol `partner` en `tpl_actor_roles`. Sus perfiles de experiencia se vinculan mediante llave foránea en `tpl_partner_perfiles`. |
| **Historial Comercial** | `tpl_eventos` | Registro inmutable de trazabilidad. Toda transición de estado del CRM escribe una tupla aquí. |

---

## 3. RELACIONES Y LLAVES FORÁNEAS (INTEGRIDAD REFERENCIAL)

Las dependencias relacionales actuales imponen las siguientes restricciones:

```text
  [ tpl_actores ] (1) <─────── (N) [ tpl_oportunidades ] (N) ───────> (1) [ tpl_propiedades ]
         │                                                                   │
         └── (1) <─── (1) [ tpl_partner_perfiles ]                           └── (1) <─── (N) [ tpl_tasaciones ]
```

* **Restricción de Cascadas:**
  - Las llaves foráneas en `tpl_tasaciones` y `tpl_oportunidades` tienen configurada la cláusula `ON DELETE CASCADE` o `ON DELETE SET NULL` hacia `tpl_propiedades`.
  - Un borrado físico (`DELETE`) en cascada destruiría el historial de precios comunales y el rastro de cotizaciones comerciales, reafirmando que **el CRM debe operar únicamente con archivado lógico (Soft-Delete) sobre Parcelas y Casas**.

---

## 4. VALIDACIÓN FINAL DEL MODELO CANÓNICO

### 1. ¿`tpl_actores` puede ser el modelo canónico de personas/organizaciones?
**Sí**. De acuerdo con la migración `202607300000_tpl_nucleo_v1.sql`, `tpl_actores` representa la entidad base ("persona", "empresa", "organizacion") mediante la columna `tipo_actor`. Las relaciones y llaves foráneas (`actor_cliente_id` en `tpl_oportunidades`, `partner_actor_id` en `tpl_catalogo_items`) apuntan directamente a esta tabla base, consolidando a todas las personas en un modelo maestro único.

### 2. ¿Qué diferencia actualmente Partner, Cliente y Lead?
* **Diferenciación:**
  - **Partner:** Fila en `tpl_actores` con un registro correspondiente en `tpl_actor_roles` con valor `rol = 'partner'`.
  - **Cliente:** Fila en `tpl_actores` con un registro en `tpl_actor_roles` con valor `rol = 'comprador'` o `rol = 'propietario'`.
  - **Lead:** Fila en `tpl_actores` con rol `comprador` y que cuenta con una cotización activa en `tpl_oportunidades` pero no posee transacciones cerradas, o que está calificado mediante atributos específicos dentro de la columna `metadata` (por ejemplo, `metadata->>'tipo_prospecto' = 'lead_frio'`).
* **Multi-rol:** Debido a la estructura de llave primaria compuesta `(actor_id, rol)` en `tpl_actor_roles`, un mismo actor puede representar simultáneamente múltiples roles (ej. un Partner que también compra parcelas puede ser `partner` y `comprador` a la vez).

### 3. ¿Qué debe reutilizarse?
* La tabla de maestros única `tpl_actores`.
* La tabla relacional de roles `tpl_actor_roles`.
* La tabla de oportunidades `tpl_oportunidades` (para representar el embudo y las cotizaciones).

### 5. ¿Qué requiere una nueva estructura?
* **Módulo de Visitas:** Requiere una nueva tabla `tpl_visitas` con llaves foráneas hacia `tpl_actores(id)` y `tpl_propiedades(id)` para agendar las reuniones en terreno.

### 6. ¿Qué riesgos tienen las relaciones `ON DELETE CASCADE` actuales?
* **Riesgo Crítico:** En `tpl_tasaciones`, la llave foránea `propiedad_id` está definida con `ON DELETE CASCADE` ([202607300001_tpl_comercial_crm_v1.sql:102](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/supabase/migrations/202607300001_tpl_comercial_crm_v1.sql#L102)).
* **Impacto Real:** Un `DELETE` físico sobre una Parcela en `tpl_propiedades` eliminará de inmediato y sin advertencia todo su historial de tasaciones pasadas, destruyendo la trazabilidad analítica de precios acumulada. Por lo tanto, el sistema **no protege el histórico ante cascadas**, lo que obliga a vetar el borrado físico de activos comerciales.

---

## 5. CAPACIDADES FUTURAS (CLASIFICACIÓN)

* **Pipeline Comercial (Embudo):** 🟡 **Requiere ampliación** (Añadir columna de fase comercial en `tpl_oportunidades`).
* **Leads (Segmentación):** 🟢 **Soportado directamente** (Mediante asignación de roles en `tpl_actor_roles` y atributos en `metadata`).
* **Scoring de Partners:** 🟢 **Soportado directamente** (A través de la columna `metadata` en `tpl_partner_perfiles` o `tpl_actor_roles`).
