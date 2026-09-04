# Auditoría de Regresión de Wrappers Frontend — v1.0

> [!NOTE]
> **Documento de auditoría técnica y control de regresión de la capa intermedia JS del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla la verificación pos-implementación de los wrappers de `tpl-data-service.js`, la detección y resolución de discrepancias en los argumentos, y el análisis de compatibilidad del objeto global expuesto.

---

## 1. DETECCIÓN Y CORRECCIÓN DE INCIDENCIAS (HALLAZGO CRÍTICO)

Durante la auditoría de regresión física, se detectó una discrepancia de firma en el wrapper `scheduleVisita`:
* **Causa:** La llamada pasaba el parámetro como `p_notes` en lugar de `p_notas` (que es el nombre exacto del argumento en la firma PostgreSQL de `public.tpl_crm_agendar_visita_v1`).
* **Acción:** Se procedió a corregir la línea en caliente a `p_notas: notas` antes de autorizar cualquier avance al frontend, eliminando un error inminente de ejecución por parámetro desconocido en Supabase.

---

## 2. COMPARACIÓN CONTRATOS RPC ↔ JS (VALIDACIÓN FINAL)

| Wrapper | RPC Invocada | Parámetros Enviados | Retorno Esperado | Tratamiento de Error | Resultado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `saveCrmActor` | `tpl_crm_crear_actor_v1` | `p_nombre, p_email, p_telefono, p_rol, p_metadata` | `{ ok, actor_id }` | Propaga `throw error` nativo | 🟢 CORRECTO |
| `updateOpportunityStage` | `tpl_crm_actualizar_estado_oportunidad_v1` | `p_oportunidad_id, p_estado, p_comentario` | `{ ok, oportunidad_id, ... }` | Propaga `throw error` nativo | 🟢 CORRECTO |
| `scheduleVisita` | `tpl_crm_agendar_visita_v1` | `p_oportunidad_id, p_staff_id, p_fecha_hora, p_notas` | `{ ok, visita_id }` | Propaga `throw error` nativo | 🟢 CORRECTO |
| `updateVisita` | `tpl_crm_actualizar_visita_v1` | `p_visita_id, p_estado, p_resultado, p_notas` | `{ ok, visita_id, ... }` | Propaga `throw error` nativo | 🟢 CORRECTO |

---

## 3. VALIDACIÓN DE `throw error`

Se confirma que todos los wrappers ejecutan la sentencia `if (error) throw error;` de manera limpia.
* **Propagación del Objeto de Error:** Los atributos nativos del cliente Supabase (`error.code`, `error.message`, `error.details` y `error.hint`) se propagan sin enmascaramiento ni alteración semántica hacia la UI.
* **Beneficio:** Esto permite al frontend reaccionar específicamente ante errores semánticos como `'CONFLICTO_IDENTIFICADORES_PROSPECTO'` y `'COLISION_HORARIO_EJECUTIVO'`.

---

## 4. VALIDACIÓN DE `window.TPLDataService` (`Object.freeze`)

* **Inclusión de Funciones:** Se verificó que las 4 nuevas funciones se agregaron correctamente en la declaración de exportación.
* **Integridad del Servicio:** Ninguna de las funciones previas de `TPLDataService` (como `getCrmSnapshot`, `saveCrmHouse`, `generateOwnerLink` o `trackEvent`) fue modificada, renombrada o eliminada.
* **Inmutabilidad:** `Object.freeze()` continúa operando correctamente sobre el servicio expuesto a nivel global sin incompatibilidades de inicialización.

---

## 5. AUDITORÍA DE REGRESIÓN Y DUPLICIDAD

* **Duplicación de Código:** **Nula**. No existe ninguna otra función en el frontend de TPL encargada de agendar visitas, modificar oportunidades comerciales de pipeline o dar de alta actores staff.
* **Compatibilidad de Métodos de Pruebas:**
  - El buscador de parcelas, cotizador público y publicador externo se cargaron de forma limpia sin reportar referencias rotas ni errores de consola en la inicialización del objeto global del servicio.

---

## 6. VEREDICTO DE LA AUDITORÍA

### 🟢 APROBADO PARA UI

**El código JS intermedio de wrappers es consistente, seguro y compatible con Supabase. Se detiene el proceso a la espera de la aprobación formal antes de continuar con la Fase 5 (UI en `crm-v2.js`).**
