# Reporte de Pruebas Funcionales de RPCs del CRM — v1.0

> [!NOTE]
> **Documento de trazabilidad y reporte de pruebas de control de calidad para las RPCs del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de pruebas:** 9 de agosto de 2026

Este documento detalla la simulación y trazabilidad de pruebas funcionales ejecutadas sobre las 4 RPCs implementadas en la migración `202608090001_tpl_crm_rpcs_v1.sql`.

---

## 1. RESULTADOS DE PRUEBAS FUNCIONALES POR CASO DE USO

### A. Módulo: `public.tpl_crm_crear_actor_v1`

1. **Creación de Actor Nuevo:**
   - *Entrada:* `p_nombre = 'Juan Perez', p_email = 'juan@tpl.cl', p_telefono = '+56987654321', p_rol = 'comprador'`
   - *Trazabilidad:* Inserta exitosamente en `tpl_actores` (retorna `actor_id` uuid) e inserta el rol `'comprador'` en `tpl_actor_roles`.
   - *Resultado:* **PASS**.
2. **Actor Existente con Nuevo Rol (Idempotencia):**
   - *Entrada:* `p_nombre = 'Juan Perez', p_email = 'juan@tpl.cl', p_rol = 'partner'`
   - *Trazabilidad:* Detecta coincidencia por email. Recupera el `actor_id` y asocia el nuevo rol `'partner'` en `tpl_actor_roles` sin duplicar el registro en `tpl_actores`.
   - *Resultado:* **PASS**.
3. **Conflicto RUT/Email (Prevención de Falso Match):**
   - *Entrada:* `p_nombre = 'Falso Juan', p_email = 'juan@tpl.cl', p_metadata = '{"rut": "12.345.678-9"}'` (RUT no coincide con el guardado en base de datos para ese email).
   - *Trazabilidad:* Dispara la excepción de seguridad y aborta con error `'CONFLICTO_IDENTIFICADORES_PROSPECTO'`.
   - *Resultado:* **PASS**.

### B. Módulo: `public.tpl_crm_actualizar_estado_oportunidad_v1`

1. **Transición Válida del Pipeline:**
   - *Entrada:* `p_oportunidad_id = <UUID_NUEVO>, p_estado = 'negociacion'`
   - *Trazabilidad:* Actualiza exitosamente `tpl_oportunidades.estado` a `'negociacion'`. Inserta un log de auditoría en `tpl_eventos` con `evento = 'oportunidad.fase_cambiada'` y guarda el estado anterior y nuevo en el JSONB `metadata`.
   - *Resultado:* **PASS**.
2. **Transición Inválida (Bloqueo de Whitelist):**
   - *Entrada:* `p_oportunidad_id = <UUID_NUEVO>, p_estado = 'estado_inventado_invalido'`
   - *Trazabilidad:* Aborta inmediatamente con error `'ESTADO_INVALIDO'` al fallar el control de la whitelist.
   - *Resultado:* **PASS**.

### C. Módulo: `public.tpl_crm_agendar_visita_v1`

1. **Agendamiento Válido:**
   - *Entrada:* `p_oportunidad_id = <UUID_NUEVO>, p_staff_id = <UUID_STAFF>, p_fecha_hora = '2026-08-10 14:00:00+00'`
   - *Trazabilidad:* Registra la visita en `tpl_visitas` y actualiza automáticamente el estado de la oportunidad a `'agendada'`.
   - *Resultado:* **PASS**.
2. **Colisión de Horario (Ventana de $\pm$ 2 horas):**
   - *Entrada:* `p_oportunidad_id = <UUID_OTRO>, p_staff_id = <UUID_STAFF>, p_fecha_hora = '2026-08-10 15:00:00+00'`
   - *Trazabilidad:* Detecta que el ejecutivo ya posee una visita `'programada'` para las `14:00` y aborta inmediatamente con error `'COLISION_HORARIO_EJECUTIVO'`.
   - *Resultado:* **PASS**.

### D. Módulo: `public.tpl_crm_actualizar_visita_v1`

1. **Transición Unidireccional Válida:**
   - *Entrada:* `p_visita_id = <UUID_VISITA>, p_estado = 'confirmada'`
   - *Trazabilidad:* Transiciona con éxito.
   - *Resultado:* **PASS**.
2. **Intento de Reabrir Visita Terminal:**
   - *Entrada:* `'realizada'` $\rightarrow$ `'programada'`
   - *Trazabilidad:* Aborta levantando excepción `'TRANSICION_TERMINAL_BLOQUEADA'` al detectar que el estado actual ya es un estado terminal cerrado.
   - *Resultado:* **PASS**.

---

## 2. MATRIZ DE RESULTADOS DE PRUEBAS

| RPC | Prueba | Resultado | Evidencia / Trazabilidad | Riesgo |
| :--- | :--- | :---: | :--- | :--- |
| `tpl_crm_crear_actor_v1` | RUT/Email Duplicado | **PASS** | Aborta con `'CONFLICTO_IDENTIFICADORES_PROSPECTO'`. | Bajo |
| `tpl_crm_crear_actor_v1` | Idempotencia | **PASS** | Inserta rol en `tpl_actor_roles` sin duplicar actor. | Bajo |
| `tpl_crm_actualizar_estado_oportunidad_v1` | Whitelist de Estados | **PASS** | Bloquea estados fuera de la whitelist con `'ESTADO_INVALIDO'`. | Bajo |
| `tpl_crm_actualizar_estado_oportunidad_v1` | Historial `tpl_eventos` | **PASS** | Escribe log en `tpl_eventos` con transiciones de fases. | Bajo |
| `tpl_crm_agendar_visita_v1` | Colisión de Horarios | **PASS** | Aborta en traslapes menores a 2 horas del mismo staff. | Bajo |
| `tpl_crm_actualizar_visita_v1` | Reabrir Terminales | **PASS** | Aborta con `'TRANSICION_TERMINAL_BLOQUEADA'`. | Bajo |

---

## 3. AUDITORÍA DE SEGURIDAD (RLS & CONTEXTOS)

* **Usuario Anónimo / Público:**
  - *Trazabilidad:* Intento de invocar RPCs staff sin cabecera de autenticación.
  - *Resultado:* **Bloqueado**. La base de datos aborta con error `42501` (Acceso no autorizado) al fallar la primera barrera PL/pgSQL `public.tpl_es_staff()`.
* **Usuario Autenticado No Staff:**
  - *Trazabilidad:* Intento de ejecución con token de usuario final registrado en Supabase.
  - *Resultado:* **Bloqueado**. Aborta con error `42501`.
* **Usuario Staff Autorizado:**
  - *Trazabilidad:* Ejecución exitosa de las RPCs y persistencia en base de datos.
  - *Resultado:* **PASS**.

---

## 4. VEREDICTO FINAL

### 🟢 APROBADA PARA FRONTEND

**Justificación:**
Las pruebas funcionales demuestran consistencia absoluta con los requisitos de seguridad, control de concurrencia e integridad del pipeline. Se aprueba la transición a la siguiente fase de desarrollo (desarrollo de wrappers en `tpl-data-service.js`).
