# Especificación de Hardening de Seguridad de RPCs del CRM TPL — v1.0

> [!NOTE]
> **Documento de especificación de hardening, contramedidas y blindaje de funciones SECURITY DEFINER**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla el plan de hardening de seguridad para las 4 RPCs del CRM de TPL antes de su implementación en Supabase. Establece los controles contra inyección de rutas, escalamiento de privilegios y colisiones transaccionales.

---

## 1. HARDENING DE SEGURIDAD GENERAL DE RPCs

Todas las RPCs staff del CRM seguirán de forma estricta las siguientes contramedidas:
* **`SECURITY DEFINER`:** Requerido para interactuar de forma segura sobre tablas protegidas por RLS (`tpl_visitas`, `tpl_actores`, `tpl_actor_roles`) bajo el contexto privilegios del creador de la base de datos.
* **Resolución de Rutas Seguras:** Se configurará explícitamente `SET search_path = public` en la definición de cada función PL/pgSQL para evitar ataques de secuestro de esquemas (search path hijacking).
* **Restricción de Privilegios (`EXECUTE`):**
  ```sql
  REVOKE ALL ON FUNCTION public.tpl_crm_... FROM public;
  GRANT EXECUTE ON FUNCTION public.tpl_crm_... TO authenticated;
  ```
  Esto bloquea la ejecución de usuarios anónimos (`anon`) o externos sin estar autenticados.
* **Primera Barrera PL/pgSQL:** Se valida de forma mandatoria la existencia de credenciales staff al inicio de cada función:
  ```sql
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;
  ```

---

## 2. ANÁLISIS DE HARDENING ESPECÍFICO POR RPC

### RPC 1: `tpl_crm_crear_actor_v1`
* **Idempotencia y Desduplicación Segura:**
  - *Prioridad:* RUT $\rightarrow$ Email.
  - *Contramedida:* Si se ingresa un email que coincide con una cuenta existente, pero el RUT es diferente o no coincide, la función abortará con un error `'CONFLICTO_IDENTIFICADORES_PROSPECTO'`. No se fusionarán perfiles automáticamente si existe sospecha de falso match.
* **Campos Modificables (Whitelist):**
  - Solo permite insertar en `nombre`, `email`, `telefono`, `rut`, `region`, `comuna` y `metadata`.
  - Queda prohibido ingresar o alterar `id`, `created_at` o `updated_at` manualmente.

### RPC 2: `tpl_crm_actualizar_estado_oportunidad_v1`
* **Catálogo de Valores Técnicos Estables (Whitelist):**
  - Se prohíbe el uso de etiquetas visuales en base de datos. Se guardarán únicamente valores técnicos normalizados: `'nueva'`, `'contactada'`, `'calificada'`, `'agendada'`, `'negociacion'`, `'reservada'`, `'vendida'`, `'perdida'`, `'cancelada'`.
  - *Validación:* La RPC comprueba que el nuevo estado pertenezca a la whitelist y que la oportunidad exista en `tpl_oportunidades`.
* **Transaccionalidad del Historial:**
  - El cambio de estado y la inserción del log `'oportunidad.fase_cambiada'` en `tpl_eventos` se ejecutan dentro del mismo bloque transaccional (`BEGIN ... COMMIT`). Si falla la escritura en el log de auditoría, se ejecuta un rollback completo de la transacción.

### RPC 3: `tpl_crm_agendar_visita_v1`
* **Validación de Ejecutivo y Lote:**
  - Comprueba que la oportunidad existe y que el ejecutivo (`p_staff_id`) cuenta con rol staff o asesor registrado.
* **Ventana de Colisión de Horarios:**
  - *Ventana de tiempo:* Fija en $\pm$ 2 horas para asegurar traslados físicos razonables entre terrenos.
  - *Contramedida:* La RPC ejecuta un `SELECT 1 FROM public.tpl_visitas WHERE usuario_staff_id = p_staff_id AND fecha_hora BETWEEN p_fecha_hora - interval '2 hours' AND p_fecha_hora + interval '2 hours' AND estado != 'cancelada'`. Si existe coincidencia, la agenda se cancela inmediatamente con error `'COLISION_HORARIO_EJECUTIVO'`.

### RPC 4: `tpl_crm_actualizar_visita_v1`
* **Transiciones de Estado Controladas (Whitelist):**
  - Solo se permiten transiciones lógicas unidireccionales:
    - `'programada'` $\rightarrow$ `'confirmada'` o `'cancelada'`.
    - `'confirmada'` $\rightarrow$ `'realizada'`, `'cancelada'` o `'no_asistio'`.
  - Queda prohibido revertir una visita `'realizada'` o `'cancelada'` a estado `'programada'`.

---

## 3. CONTROL DE CONCURRENCIA

Para evitar colisiones por escrituras simultáneas (ej. dos ejecutivos asignándose la misma visita a la misma hora), se aplicará bloqueo optimista mediante la cláusula:
```sql
select 1 from public.tpl_oportunidades where id = p_oportunidad_id for update;
```
Esto previene condiciones de carrera a nivel de fila durante la transacción.

---

## 4. MATRIZ DE SEGURIDAD FINAL

| RPC | Autorización | SECURITY DEFINER | Search Path | Whitelist | Transacciones | Concurrencia | Historial | Veredicto |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `tpl_crm_crear_actor_v1` | Staff | SÍ | SET public | SÍ | SÍ (Actor+Rol) | `unique_index` | SÍ | 🟢 IMPLEMENTAR CON AJUSTES |
| `tpl_crm_actualizar_estado_oportunidad_v1` | Staff | SÍ | SET public | SÍ | SÍ (Oportunidad+Log) | `FOR UPDATE` | SÍ | 🟢 IMPLEMENTAR CON AJUSTES |
| `tpl_crm_agendar_visita_v1` | Staff | SÍ | SET public | SÍ | SÍ (Visita+Oportunidad)| `FOR UPDATE` | SÍ | 🟢 IMPLEMENTAR CON AJUSTES |
| `tpl_crm_actualizar_visita_v1` | Staff | SÍ | SET public | SÍ | SÍ | `FOR UPDATE` | SÍ | 🟢 IMPLEMENTAR CON AJUSTES |
