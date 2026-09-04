# Auditoría de Factibilidad y Diseño Funcional Objetivo del CRM TPL — v1.1

Este documento constituye la validación técnica y de factibilidad arquitectónica para la evolución comercial del CRM de **Tu Parcela Lista (TPL)**. Este análisis contrasta las propuestas del target funcional con el esquema real de base de datos, políticas y RPCs de Supabase certificadas en la auditoría `TPL-CRUD-AUDIT-DEFINITIVA v1.0`.

---

## 1. MATRIZ DE FACTIBILIDAD POR MÓDULO TARGET

| Funcionalidad Target | ¿Ya Existe? | ¿Existe Parcialmente? | ¿No Existe? | Evidencia Técnica & Respuestas del Modelo | Dependencias | Riesgo |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **1. Lead** | NO | SÍ | NO | **Existe Parcialmente:** Los prospectos se almacenan en `tpl_actores` con tipo `comprador` o `propietario`. Falta columna de sub-estado comercial (`caliente`, `frio`) o tabla de leads aislada. | `tpl_actores` | Bajo |
| **2. Cliente** | NO | SÍ | NO | **Existe Parcialmente:** Registrados en `tpl_actores` (evidencia: vista `crm_compradores` y `crm_duenos` consultados en snapshot). Falta formulario interno de creación/alta manual en CRM. | `tpl_actores`, RPC snapshot | Bajo |
| **3. Partner** | NO | SÍ | NO | **Existe Parcialmente:** Almacenados en `tpl_actores` (filtrado en vista `crm_partners`). Falta capacidad de edición y cambio de estados desde CRM. | `tpl_actores`, `tpl_partner_perfiles` | Bajo |
| **4. Oportunidad** | NO | SÍ | NO | **Existe Parcialmente:** Tabla `tpl_oportunidades` almacena cotizaciones básicas. Falta control de fases del embudo comercial en CRM. | `tpl_oportunidades` | Medio |
| **5. Proyecto** | NO | SÍ | NO | **Existe Parcialmente:** Tabla `tpl_proyectos` y vista `crm_operaciones_activas` leen el estado. Falta interfaz de carga e hitos en CRM. | `tpl_proyectos` | Bajo |
| **6. Visita** | NO | NO | SÍ | **No Existe:** No hay tabla `tpl_visitas` ni agenda de visitas en Supabase. | Ninguna (Requiere nueva tabla) | Medio (Requiere schema update) |
| **7. Actividad** | NO | SÍ | NO | **Existe Parcialmente:** Eventos del sistema se registran en `tpl_eventos`. Falta capacidad de agregar notas y comentarios manuales de seguimiento por el ejecutivo. | `tpl_eventos` | Bajo |
| **8. Pipeline / Kanban** | NO | NO | SÍ | **No Existe:** Interfaz visual inexistente en frontend. El backend requiere columnas de estado comercial en `tpl_oportunidades`. | `tpl_oportunidades` (Requiere estados) | Medio |
| **9. Agenda / Calendario** | NO | NO | SÍ | **No Existe:** No hay componente de agenda ni lógica de citas en el frontend ni backend. | `tpl_visitas` (Futura) | Medio |
| **10. Publicación** | SÍ | NO | NO | **Ya Existe:** Sincronizada directamente mediante el campo `estado` de la tabla `tpl_propiedades` administrado desde el CRM. | `tpl_propiedades` | Bajo |
| **11. Tasación** | SÍ | NO | NO | **Ya Existe:** Registro de historial inmutable en `tpl_tasaciones` vía RPC `tpl_registrar_tasacion_crm_canonica_v1`. | `tpl_tasaciones` | Bajo |

---

## 2. MATRIZ DE DEPENDENCIAS Y NUEVAS ESTRUCTURAS

| Funcionalidad Futura | Tablas Existentes Involucradas | RPC Existentes | Nuevas Estructuras Potenciales (Propuesta) | Impacto / Esfuerzo |
| :--- | :--- | :--- | :--- | :--- |
| **Alta Manual de Actores** | `tpl_actores` | Ninguna para CRM | RPC `tpl_crm_crear_actor_v1` | Bajo (Solo inserción segura) |
| **Pipeline Comercial** | `tpl_oportunidades` | Ninguna | Campo `estado_comercial` en `tpl_oportunidades` and RPC de actualización | Medio (Requiere alteración de tabla) |
| **Agenda de Visitas** | Ninguna | Ninguna | Nueva tabla `tpl_visitas` y RPC de agendamiento | Alto (Esquema nuevo completo) |
| **Bitácora de Notas** | `tpl_eventos` | `tpl_registrar_evento_publico_v1` | Nueva tabla `tpl_crm_comentarios` o ampliación de eventos | Medio (Evita contaminar logs técnicos) |

---

## 3. EVOLUCIÓN SOBRE EL MODELO ACTUAL (EVALUABILIDAD)

Para evitar sistemas paralelos, el CRM comercial objetivo debe estructurarse reutilizando las siguientes entidades existentes:

* **`tpl_actores` (Entidad existente / capacidad CRM faltante):** Debe expandir sus roles y permitir inserción directa (Crear/Editar Clientes/Partners) mediante RPC staff.
* **`tpl_oportunidades` (Entidad existente / capacidad CRM faltante):** Debe ser la base del embudo comercial (Pipeline), requiriendo columnas de transición de fases.
* **`tpl_proyectos` (Entidad existente / capacidad CRM faltante):** Debe integrarse al CRM para visualizar el avance físico de obras vinculadas a la compra de parcelas.
* **`tpl_eventos` (Entidad existente):** Se mantiene para auditoría inmutable de transiciones y logs técnicos de sistema.

---

## 4. VEREDICTO DE FACTIBILIDAD

### Clasificación por Módulo Target

🟢 **LISTO PARA DISEÑO TÉCNICO**
* **Catálogo de Parcelas y Casas:** Totalmente soportado por el esquema y RPCs existentes.
* **Historial de Tasaciones:** Funcional e inmutable.
* **Gestión de Proyectos (Solo Lectura):** Soportado por la tabla `tpl_proyectos`.

🟡 **REQUIERE DEFINICIÓN**
* **Gestión de Partners y Clientes:** Requiere definir la RPC de alta manual segura (`tpl_crm_crear_actor_v1`) y políticas RLS para edición por operadores staff.
* **Pipeline Comercial (Embudo):** Requiere definir los estados comerciales exactos del ciclo de venta y cómo mapear la tabla `tpl_oportunidades`.

🔴 **REQUIERE CAMBIO ARQUITECTÓNICO**
* **Módulo de Visitas y Agenda:** Requiere la creación de una nueva tabla `tpl_visitas` en Supabase, lo cual altera el esquema relacional básico actual.

---

## 5. RESPUESTAS A PREGUNTAS CLAVE DE GOBIERNO

### ¿Podemos construir el CRM comercial sobre la arquitectura actual sin romper el modelo existente?
**Sí**. La arquitectura de datos de Supabase está altamente normalizada y desacoplada mediante RPCs. Al añadir nuevas tablas o campos no disruptivos (como la agenda de visitas o estados en oportunidades) e interactuar únicamente por medio de nuevas RPCs seguras de escritura, la lógica existente del portal público y el Tasador no sufrirá impacto alguno.

### ¿Qué debemos reutilizar?
* La tabla `tpl_actores` para todos los perfiles de personas (Partners, Clientes, Leads).
* La tabla `tpl_oportunidades` para el pipeline del embudo de ventas.
* Las tablas `tpl_propiedades` y `tpl_tasaciones` para la trazabilidad física y valoración del activo.

### ¿Qué debemos ampliar?
* Añadir columnas de sub-estado comercial en `tpl_oportunidades` y `tpl_actores`.
* Crear nuevas RPCs staff seguras para inserción y actualización de registros (evitando accesos directos por API REST).

### ¿Qué debemos evitar duplicar?
* No crear tablas de leads separadas de `tpl_actores`. Todo prospecto debe ser un actor con un rol calificado.
* No duplicar datos físicos de las parcelas en las cotizaciones; usar siempre referencias por llaves foráneas (`propiedad_id`).

### ¿Cuál debería ser el orden correcto de implementación?
1. **Fase 1 (Seguridad & Alta):** Implementación de RPCs de creación y edición segura de actores (`tpl_actores`) y parcelas (`tpl_propiedades`) para dar de alta registros desde el CRM.
2. **Fase 2 (Embudo):** Incorporación de campos de estado comercial en `tpl_oportunidades` y desarrollo del Kanban visual en el frontend.
3. **Fase 3 (Agenda & Seguimiento):** Creación de la tabla `tpl_visitas` y el calendario del ejecutivo en el CRM.
