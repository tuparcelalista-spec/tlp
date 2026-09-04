# Auditoría Post-Implementación de RPCs del CRM TPL — v1.0

> [!NOTE]
> **Documento de auditoría técnica y control de calidad pos-implementación de la Fase 3 del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla la validación física, firmas, parámetros, privilegios, control de concurrencia y auditoría para las 4 RPCs implementadas en el archivo de migración `202608090001_tpl_crm_rpcs_v1.sql`.

---

## 1. INVENTARIO DE RPCs Y VERIFICACIÓN DE FIRMAS

### RPC 1: `public.tpl_crm_crear_actor_v1`
* **Firma Exacta:** `public.tpl_crm_crear_actor_v1(p_nombre text, p_email text, p_telefono text, p_rol text, p_metadata jsonb default '{}'::jsonb)`
* **Retorno:** `jsonb`
* **Tablas Afectadas:** `tpl_actores` (INSERT/UPDATE), `tpl_actor_roles` (INSERT), `tpl_eventos` (INSERT).
* **Ausencia de DELETE:** **Garantizado**. No contiene sentencias destructivas.
* **Seguridad:** `SECURITY DEFINER SET search_path = public`.
* **Grants/Revokes:** `REVOKE ALL` a `public` y `anon`. `GRANT EXECUTE` únicamente a `authenticated`.

### RPC 2: `public.tpl_crm_actualizar_estado_oportunidad_v1`
* **Firma Exacta:** `public.tpl_crm_actualizar_estado_oportunidad_v1(p_oportunidad_id uuid, p_estado text, p_comentario text default null)`
* **Retorno:** `jsonb`
* **Tablas Afectadas:** `tpl_oportunidades` (UPDATE), `tpl_actor_roles` (INSERT - al pasar a `'vendida'`), `tpl_eventos` (INSERT).
* **Ausencia de DELETE:** **Garantizado**.
* **Seguridad:** `SECURITY DEFINER SET search_path = public`.
* **Grants/Revokes:** `REVOKE ALL` a `public` y `anon`. `GRANT EXECUTE` únicamente a `authenticated`.

### RPC 3: `public.tpl_crm_agendar_visita_v1`
* **Firma Exacta:** `public.tpl_crm_agendar_visita_v1(p_oportunidad_id uuid, p_staff_id uuid, p_fecha_hora timestamptz, p_notas text default null)`
* **Retorno:** `jsonb`
* **Tablas Afectadas:** `tpl_visitas` (INSERT), `tpl_oportunidades` (UPDATE), `tpl_eventos` (INSERT).
* **Ausencia de DELETE:** **Garantizado**.
* **Seguridad:** `SECURITY DEFINER SET search_path = public`.
* **Grants/Revokes:** `REVOKE ALL` a `public` y `anon`. `GRANT EXECUTE` únicamente a `authenticated`.

### RPC 4: `public.tpl_crm_actualizar_visita_v1`
* **Firma Exacta:** `public.tpl_crm_actualizar_visita_v1(p_visita_id uuid, p_estado text, p_resultado text default null, p_notas text default null)`
* **Retorno:** `jsonb`
* **Tablas Afectadas:** `tpl_visitas` (UPDATE), `tpl_eventos` (INSERT).
* **Ausencia de DELETE:** **Garantizado**.
* **Seguridad:** `SECURITY DEFINER SET search_path = public`.
* **Grants/Revokes:** `REVOKE ALL` a `public` y `anon`. `GRANT EXECUTE` únicamente a `authenticated`.

---

## 2. AUDITORÍA DE ESCENARIOS Y CASOS DE PRUEBA (HARDENING)

### A. Escenario Actor:
* *Actor Nuevo:* El motor inserta la tupla en `tpl_actores` y asocia el rol de forma limpia.
* *Actor Existente / Rol Nuevo:* Si coincide por RUT o Email, se recupera el `id` y se asocia el rol dinámicamente en `tpl_actor_roles` sin duplicar la persona.
* *Conflicto RUT/Email:* Si se intenta crear un actor con un Email existente pero asociado a otro RUT en Supabase, la RPC aborta de forma segura arrojando la excepción `CONFLICTO_IDENTIFICADORES_PROSPECTO`.
* *Datos Insuficientes:* Se rechaza la operación si `p_nombre` viene vacío o si `p_rol` no pertenece a la whitelist de roles autorizados.

### B. Escenario Oportunidad (Pipeline):
* *Transición Válida:* Cambia el estado de `'nueva'` a `'negociacion'` y registra la auditoría `'oportunidad.fase_cambiada'` en `tpl_eventos`.
* *Transición Inválida:* Bloquea e impide escribir estados que no pertenezcan a la whitelist semántica.
* *Usuario no Autorizado:* Si un usuario que no sea staff intenta invocar la RPC, la primera barrera PL/pgSQL levanta la excepción `'Acceso CRM no autorizado'` (código `42501`).
* *Concurrencia:* Bloqueo preventivo mediante la cláusula `FOR UPDATE` a nivel de fila sobre la oportunidad en evaluación para evitar condiciones de carrera.

### C. Escenario Visitas:
* *Visita Válida:* Inserta en `tpl_visitas` y actualiza la fase comercial de la oportunidad a `'agendada'`.
* *Staff no Autorizado / Inexistente:* Aborta si `p_staff_id` no existe en la tabla de actores.
* *Colisión de Horario:* Valida que el ejecutivo no tenga otra visita agendada que se traslape en una ventana fija de $\pm$ 2 horas, abortando con error `'COLISION_HORARIO_EJECUTIVO'`.
* *Intento de Reabrir Visita Terminal:* Bloquea transiciones que intenten revertir visitas `'realizada'`, `'cancelada'` o `'no_asistio'` a estados activos como `'programada'` o `'confirmada'`.

---

## 3. VEREDICTO DE AUDITORÍA POST-RPC

### 🟢 APROBADA SIN OBSERVACIONES

**Justificación:**
Las cuatro RPCs implementadas cumplen con todos los requisitos del Hardening de Seguridad v1.0. Se configuraron adecuadamente los esquemas de resolución de rutas (`SET search_path = public`), la barrera PL/pgSQL `public.tpl_es_staff()`, la prevención de colisiones en la agenda de visitas, el control de idempotencia sin falsos matches de actores, y la inmutabilidad de los registros de auditoría mediante `tpl_eventos`.

**Se autoriza la presentación de esta auditoría y se detiene el proceso a la espera de la aprobación formal antes de continuar con la Fase 4 (Data Service).**
