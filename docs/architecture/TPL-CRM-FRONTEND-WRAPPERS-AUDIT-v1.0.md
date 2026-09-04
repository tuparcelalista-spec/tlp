# Auditoría de Wrappers Frontend del CRM TPL — v1.0

> [!NOTE]
> **Documento de auditoría técnica y control de calidad de wrappers JS del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla la auditoría de los 4 wrappers JS agregados a `tpl-data-service.js` para consumir de forma segura y consistente las nuevas RPCs de Supabase.

---

## 1. DETALLE DE WRAPPERS CREADOS

### A. `saveCrmActor`
* **Invocación RPC:** `tpl_crm_crear_actor_v1`
* **Parámetros:** `{ p_nombre, p_email, p_telefono, p_rol, p_metadata }`
* **Retorno:** Objeto JSON conteniendo `{ ok: true, actor_id: "..." }`.
* **Manejo de Errores:** Propaga el objeto `error` nativo de Supabase sin enmascarar, permitiendo que la UI capture códigos de error semánticos específicos como `'CONFLICTO_IDENTIFICADORES_PROSPECTO'`.

### B. `updateOpportunityStage`
* **Invocación RPC:** `tpl_crm_actualizar_estado_oportunidad_v1`
* **Parámetros:** `{ p_oportunidad_id, p_estado, p_comentario }`
* **Retorno:** `{ ok: true, oportunidad_id: "...", estado_anterior: "...", estado_nuevo: "..." }`.

### C. `scheduleVisita`
* **Invocación RPC:** `tpl_crm_agendar_visita_v1`
* **Parámetros:** `{ p_oportunidad_id, p_staff_id, p_fecha_hora, p_notes }` (Mapea notas a `p_notes` en la firma de la base de datos).
* **Retorno:** `{ ok: true, visita_id: "..." }`.

### D. `updateVisita`
* **Invocación RPC:** `tpl_crm_actualizar_visita_v1`
* **Parámetros:** `{ p_visita_id, p_estado, p_resultado, p_notas }`
* **Retorno:** `{ ok: true, visita_id: "...", estado_anterior: "...", estado_nuevo: "..." }`.

---

## 2. MATRIZ DE ARCHIVOS AFECTADOS

* **Archivos Modificados:**
  - `frontend-v2/js/core/tpl-data-service.js` (adición de las 4 funciones e inclusión de sus nombres en la declaración `Object.freeze` de exportación global).
* **Archivos NO Modificados:**
  - `crm-v2.js`
  - `crm-v2.css`
  - HTML del CRM.
  - Ninguna migración, SQL o RLS.

---

## 3. VERIFICACIÓN DE CALIDAD DE INTEGRACIÓN

1. **Sintaxis JS:** **Validada**. No existen errores de llaves, comas o declaraciones.
2. **Duplicidad de Funciones:** **Nula**. No se identificó ninguna función homóloga previa en el servicio de datos.
3. **Firmas y Parámetros:** Coincidencia exacta de tipos de datos, nulabilidad y nombres de argumentos con las RPCs del backend Supabase.
4. **Propagación de Errores:** Garantizada al ejecutar `if (error) throw error;` en la capa del cliente Supabase.

---

## 4. VEREDICTO DE LA AUDITORÍA

### 🟢 wrappers LISTOS PARA INTEGRACIÓN UI

**Se autoriza la presentación de esta auditoría y se detiene el proceso a la espera de la aprobación formal antes de continuar con la Fase 5 (Integración visual en `crm-v2.js`).**
