# Validación de Consistencia UI ↔ Backend del CRM — v1.0

> [!NOTE]
> **Documento de validación técnica y consistencia final previo a la maquetación visual**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla la validación física de consistencia entre la interfaz del CRM y el ecosistema de base de datos Supabase, certificando que todas las vistas, componentes y flujos de negocio coinciden exactamente con los contratos y restricciones físicas de backend.

---

## 1. MÓDULO DE ACTORES Y ROLES

* **Consumo de Datos en UI:** El CRM obtiene los actores a través de la función `TPLDataService.getCrmSnapshot()`, la cual invoca internamente la RPC `tpl_crm_snapshot_v1`.
* **Identificación de Roles:**
  - Los roles se asocian de forma atómica en la tabla `tpl_actor_roles` (`actor_id`, `rol`).
  - El snapshot retorna los registros mapeados por rol. La UI determina visualmente si un contacto es `'comprador'`, `'propietario'` o `'partner'` evaluando el arreglo de roles asociados.
* **Lead como Condición Comercial:** Un Actor es considerado un "Lead" si tiene una cotización/oportunidad activa vinculada en la tabla `tpl_oportunidades` en estado no terminal (diferente de `'vendida'`, `'perdida'` o `'cancelada'`).
* **Prevención de Duplicados:** La UI consumirá exclusivamente `saveCrmActor()` para las inserciones, la cual implementa la desduplicación física por RUT y Email en la base de datos Postgres.

---

## 2. PIPELINE COMERCIAL (KANBAN)

* **Estados Técnicos en `tpl_oportunidades`:** `'nueva'`, `'contactada'`, `'calificada'`, `'agendada'`, `'negociacion'`, `'reservada'`, `'vendida'`, `'perdida'`, `'cancelada'`, `'aceptada'`, `'rechazada'`.
* **Estados en el Kanban Visual:**
  - `Nuevo Lead` $\rightarrow$ `'nueva'`
  - `Contactado` $\rightarrow$ `'contactada'`
  - `Calificado` $\rightarrow$ `'calificada'`
  - `Agendado` $\rightarrow$ `'agendada'`
  - `Negociación` $\rightarrow$ `'negociacion'`
  - `Reservado` $\rightarrow$ `'reservada'`
  - `Vendido` $\rightarrow$ `'vendida'`
* **Rollback Visual:** Si la llamada a `updateOpportunityStage()` falla (por RLS, pérdida de red o transición inválida), el frontend capturará el error y devolverá la tarjeta a su columna y estado original guardado en `state.snapshot.operaciones`.

---

## 3. AGENDA DE VISITAS

* **Esquema Físico de `tpl_visitas`:**
  - `oportunidad_id` (uuid, FK obligatoria a `tpl_oportunidades`).
  - `usuario_staff_id` (uuid, FK opcional a `tpl_actores` para ejecutivo staff).
  - `fecha_hora` (timestamptz, obligatoria).
  - `estado` (text, obligatoria, check `('programada','confirmada','realizada','cancelada','no_asistio')`).
* **Colisiones Horarias:** Controladas en el backend por `tpl_crm_agendar_visita_v1` mediante un margen de $\pm$ 2 horas para el mismo ejecutivo. Ante error, el frontend mostrará el mensaje técnico `'COLISION_HORARIO_EJECUTIVO'`.
* **Estados Terminales:** La UI bloqueará la edición de notas o estados de visitas que ya cuenten con estado `'realizada'`, `'cancelada'` o `'no_asistio'`.

---

## 4. TIMELINE DE EVENTOS (HISTORIAL)

* **Reutilización de `tpl_eventos`:**
  - No se creará una tabla de actividades paralela.
  - La UI utilizará los registros con `categoria = 'comercial'` para mostrar la trazabilidad.
  - El timeline extraerá el ejecutivo, estado anterior y nuevo desde el JSONB `metadata` para mostrar la bitácora cronológica del negocio.

---

## 5. COMPARACIÓN DE WRAPPERS FRONTEND ↔ RPCs

* **`saveCrmActor`** $\rightarrow$ `tpl_crm_crear_actor_v1(p_nombre, p_email, p_telefono, p_rol, p_metadata)` (Consistente).
* **`updateOpportunityStage`** $\rightarrow$ `tpl_crm_actualizar_estado_oportunidad_v1(p_oportunidad_id, p_estado, p_comentario)` (Consistente).
* **`scheduleVisita`** $\rightarrow$ `tpl_crm_agendar_visita_v1(p_oportunidad_id, p_staff_id, p_fecha_hora, p_notas)` (Consistente con la corrección a `p_notas`).
* **`updateVisita`** $\rightarrow$ `tpl_crm_actualizar_visita_v1(p_visita_id, p_estado, p_resultado, p_notas)` (Consistente).

---

## 6. MATRIZ DE COMPONENTES DE UI

| Componente UI | Backend Utilizado | Existe Actualmente | Reutilizar | Modificar | Crear | Riesgo |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Ficha Actores** | `tpl_crm_crear_actor_v1` | SÍ | SÍ | SÍ | NO | Bajo |
| **Pipeline Kanban**| `tpl_crm_actualizar_estado_oportunidad_v1` | NO | NO | NO | SÍ | Bajo |
| **Agenda Visitas** | `tpl_crm_agendar_visita_v1` | NO | NO | NO | SÍ | Bajo |
| **Timeline Eventos**| `tpl_eventos` | SÍ | SÍ | SÍ | NO | Bajo |

---

## 7. VEREDICTO DE CONSISTENCIA

### 🟢 APROBADO PARA IMPLEMENTACIÓN

**Justificación:**
Todos los contratos de wrappers, parámetros de base de datos, whitelists de estados e integridad relacional coinciden al 100% con las RPCs y esquemas físicos de Supabase.

**Se detiene el proceso a la espera de tu aprobación formal de esta consistencia antes de proceder con el desarrollo visual en `crm-v2.js` y `crm-v2.css`.**
