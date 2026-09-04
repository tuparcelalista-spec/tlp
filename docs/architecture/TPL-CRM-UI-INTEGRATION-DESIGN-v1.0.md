# Diseño de Integración de UI del CRM TPL — v1.0

> [!NOTE]
> **Documento de especificación de diseño visual, componentes e interacción de usuario del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla la planificación del frontend y el diseño de la interfaz de usuario para la integración del Kanban, calendario de visitas e historial comercial en el CRM de TPL sin crear duplicados.

---

## 1. AUDITAR EL CRM ACTUAL

* **Estado de la UI (`frontend-v2/plataforma/crm-v2/`):**
  - **JS:** `crm-v2.js` controla toda la inicialización, carga el snapshot a través de `TPLDataService.getCrmSnapshot()`, administra los filtros de parcelas y renders de tablas.
  - **HTML:** `index.html` contiene paneles laterales y divs contenedores para mostrar información de tasaciones y publicaciones.
  - **CSS:** `crm-v2.css` aplica temas oscuros/claros, bordes redondeados y grids de control.
* **Componentes Reutilizables Identificados:**
  - El modal de edición rápida de propiedades y los botones de control de navegación lateral son ideales para inyectar la navegación del pipeline y la agenda.

---

## 2. PROPUESTA DE INTEGRACIÓN DE ACTORES

* Se descarta la creación de listados paralelos.
* **Solución de Normalización UI:** La vista de clientes/leads y partners consumirá el mismo snapshot de `tpl_actores`. El filtrado de roles se realizará dinámicamente en memoria en `crm-v2.js` basándose en el arreglo `tpl_actor_roles`.
* **Diálogo de Alta:** Se integrará un modal simple reutilizando la estructura CSS de formularios para gatillar `TPLDataService.saveCrmActor()`.

---

## 3. PIPELINE COMERCIAL (KANBAN)

* **Ubicación:** Se creará una sección `#crmPipelineSection` (Kanban) oculta/visible mediante los tabs de control del CRM.
* **Renderizado de Estados:** Se dibujarán 7 columnas visuales ordenadas cronológicamente mapping los estados técnicos de `tpl_oportunidades.estado`.
* **Drag-and-Drop y Rollback:**
  - Al arrastrar una tarjeta, la UI actualizará la columna local de inmediato para ofrecer respuesta instantánea.
  - Si la RPC `TPLDataService.updateOpportunityStage()` retorna error, se captura la excepción, se muestra un toast y la tarjeta regresa de forma animada a su columna original.

---

## 4. AGENDA DE VISITAS

* **Resolución Relacional:** No se guardarán copias locales de datos del actor ni de parcelas. La visita mapea de manera atómica a `oportunidad_id`, resolviendo por join el cliente y propiedad en tiempo de renderizado.
* **UI:** Se integrará un panel `#crmAgendaSection` listando las próximas visitas en orden cronológico descendente.

---

## 5. HISTORIAL DE ACTIVIDADES (`tpl_eventos`)

* Se reutilizará el log inmutable de `tpl_eventos` filtrado por `categoria = 'comercial'`.
* Se mostrará en una línea de tiempo (timeline) vertical en la ficha del cliente, diferenciando visualmente eventos técnicos de eventos de fase comercial.

---

## 6. MATRIZ DE COMPONENTES DE UI

| Funcionalidad | Componente Existente | Reutilizar | Ampliar | Nuevo Componente | Archivo | Riesgo |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Actores** | Tabla de contactos | SÍ | SÍ | NO | `crm-v2.js` | Bajo |
| **Pipeline** | N/A (Nuevo Tab) | NO | NO | SÍ (`#pipeline`) | `crm-v2.js` | Bajo |
| **Visitas** | N/A (Nuevo Tab) | NO | NO | SÍ (`#agenda`) | `crm-v2.js` | Bajo |
| **Historial**| Tab de eventos | SÍ | SÍ | NO | `crm-v2.js` | Bajo |

---

## 7. MATRIZ DE IMPACTO EN ARCHIVOS

| Archivo | Cambio Previsto | Motivo | Dependencias | Clasificación |
| :--- | :--- | :--- | :--- | :--- |
| **`crm-v2.js`** | Agregar renders de Kanban, Drag-and-Drop, diálogos de alta. | Permitir flujos staff interactivos. | `TPLDataService` | 🟡 AMPLIAR |
| **`crm-v2.css`** | Clases CSS del Kanban (columnas, tarjetas, hover effects). | Estética moderna y fluida. | N/A | 🟡 AMPLIAR |
| **`index.html`** | Divs estructurales para el pipeline y calendario. | Contenedores base. | N/A | 🟢 REUTILIZAR |

---

## 8. ORDEN DE IMPLEMENTACIÓN PROPUESTO

```text
Estructura HTML/CSS ──> wrappers JS ──> Kanban UI ──> Agenda/Visitas UI ──> Modales/Dialogs ──> timeline Historial
```

---

## 9. CRITERIOS DE ACEPTACIÓN

* La interfaz Kanban permite arrastrar tarjetas actualizando base de datos reactivamente.
* Todo error de base de datos es capturado, mostrando toast al operador y revirtiendo el estado visual de la tarjeta de forma consistente.
* **Cero duplicación de datos** en la interfaz.

---

**Se da por finalizado el diseño conceptual de la UI y me detengo en espera de tu aprobación antes de proceder.**
