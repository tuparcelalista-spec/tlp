# Auditoría de Integración Frontend del CRM TPL — v1.0

> [!NOTE]
> **Documento de especificación de integración frontend y mapeo de servicios JS**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla el análisis de integración del frontend del CRM con las nuevas RPCs comerciales implementadas en Supabase. Establece los patrones de llamadas JS a reutilizar y el impacto sobre la interfaz de usuario.

---

## 1. ESTADO ACTUAL DEL FRONTEND Y PATRONES REUTILIZABLES

* **Capa de Servicios de Datos (`tpl-data-service.js`):**
  - Mapea las llamadas a Supabase utilizando la librería JS de Supabase (`supabase-js`).
  - *Patrón de RPC actual:*
    ```javascript
    const { data, error } = await client.rpc('nombre_rpc_v1', { parametro: valor });
    ```
  - Las respuestas se retornan de forma consistente como `{ data, error }`. Los errores se capturan en el llamador de la UI arrojando excepciones legibles o mostrando notificaciones en pantalla (`alert` o toast).
* **Consumo de Datos en UI (`crm-v2.js`):**
  - Carga todo el estado en caliente mediante `TPLDataService.getCrmSnapshot()`.
  - El snapshot retorna un objeto consolidado con arreglos de compradores, dueños, parcelas, casas, tareas y eventos.

---

## 2. MAPA DE INTEGRACIÓN RPC $\rightarrow$ FRONTEND

### A. `tpl_crm_crear_actor_v1`
* **Wrapper JS:** `saveCrmActor(payload)` en `TPLDataService`.
* **Función UI Consumidora:** `saveCrmActorData()` en `crm-v2.js` gatillada desde el modal de creación.
* **Manejo de Error:** Captura la excepción `'CONFLICTO_IDENTIFICADORES_PROSPECTO'` y despliega una alerta modal al operador staff solicitando resolución manual del RUT/Email duplicado.
* **Actualización Local:** Invoca un refresco asíncrono del snapshot y re-renderiza la pestaña de actores en el panel.

### B. `tpl_crm_actualizar_estado_oportunidad_v1`
* **Wrapper JS:** `updateOpportunityStage(oportunidadId, estado, comentario)` en `TPLDataService`.
* **Función UI Consumidora:** El Drag-and-Drop de las tarjetas de la vista Kanban en `crm-v2.js`.
* **Actualización Local:** Mueve la tarjeta localmente en la UI para respuesta rápida y ejecuta la RPC en segundo plano. Si falla, revierte la tarjeta a su columna original (rollback visual).

### C. `tpl_crm_agendar_visita_v1`
* **Wrapper JS:** `scheduleVisita(oportunidadId, staffId, fechaHora, notas)` en `TPLDataService`.
* **Función UI Consumidora:** Formulario de agendamiento en el modal de oportunidades.
* **Manejo de Error:** Captura `'COLISION_HORARIO_EJECUTIVO'` y muestra un toast advirtiendo el traslape de la agenda del asesor.

### D. `tpl_crm_actualizar_visita_v1`
* **Wrapper JS:** `updateVisita(visitaId, estado, resultado, notas)` en `TPLDataService`.
* **Función UI Consumidora:** Diálogo de edición de visitas en el calendario.

---

## 3. MATRIZ DE INTEGRACIÓN DE RPCs

| RPC | Wrapper Propuesto | Archivo | Función Consumidora | UI Afectada | Datos a Refrescar | Manejo de Error | Riesgo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tpl_crm_crear_actor_v1` | `saveCrmActor` | `tpl-data-service.js` | Modal de alta | Ficha de actores | Snapshot global | Alerta RUT/Email | Bajo |
| `tpl_crm_actualizar_estado_oportunidad_v1` | `updateOpportunityStage` | `tpl-data-service.js` | Drag-and-Drop | Columnas Kanban | Oportunidades | Rollback visual | Bajo |
| `tpl_crm_agendar_visita_v1` | `scheduleVisita` | `tpl-data-service.js` | Diálogo agenda | Vista calendario | Agenda de visitas | Alerta colisión | Bajo |
| `tpl_crm_actualizar_visita_v1` | `updateVisita` | `tpl-data-service.js` | Diálogo resultado | Vista calendario | Agenda de visitas | Alerta transición | Bajo |

---

## 4. MATRIZ DE IMPACTO EN ARCHIVOS FRONTEND

| Archivo | Se Modifica | Motivo | Riesgo | Dependencias | Clasificación |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`tpl-data-service.js`** | SÍ | Agregar los 4 wrappers JS de las RPCs y actualizar consulta snapshot. | Bajo | Conexión Supabase | 🟡 AMPLIAR |
| **`crm-v2.js`** | SÍ | Agregar la UI del Kanban, calendario de visitas y modales staff. | Medio | `TPLDataService` | 🟡 AMPLIAR |
| **`crm-v2.css`** | SÍ | Estilos responsivos del Kanban y la interfaz de calendario. | Bajo | Estilos globales | 🟡 AMPLIAR |
| **`crm-v2.html`** | SÍ | Agregar divs contenedores para el Kanban y calendario. | Bajo | Estructura HTML | 🟢 REUTILIZAR |

---

## 5. REGLAS Y ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. ** wrappers en `tpl-data-service.js`:** Integración de la comunicación segura con Supabase.
2. **Estructura HTML/CSS en CRM:** Inserción de contenedores del Kanban y calendario.
3. **Lógica de Tarjetas y Eventos en UI:** Desarrollo en `crm-v2.js` del Drag-and-Drop y diálogos de alta/agenda.
4. **Criterios de Aceptación:**
   - La UI debe refrescar de forma reactiva tras cada acción exitosa.
   - Todo error de base de datos (concurrencia, colisión, permisos) debe ser capturado de forma limpia sin colgar la UI del CRM.
   - **Impacto Cero** en el portal público de clientes finales.
