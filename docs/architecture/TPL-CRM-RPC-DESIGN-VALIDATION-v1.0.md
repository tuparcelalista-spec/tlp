# Diseño y Validación de RPCs del CRM TPL — v1.0

> [!NOTE]
> **Documento de especificación conceptual, contratos y auditoría de seguridad para RPCs del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre de auditoría:** 9 de agosto de 2026

Este documento detalla el diseño de contratos y validación de seguridad de las 4 RPCs propuestas para la evolución del CRM comercial, garantizando consistencia semántica del pipeline, control estricto de accesos y la inmutabilidad de los datos maestros.

---

## 1. ANÁLISIS CONCEPTUAL Y DE SEGURIDAD POR RPC

### RPC 1: `public.tpl_crm_crear_actor_v1`
* **Propósito Exacto:** Ingesta manual y segura de nuevos prospectos o partners en caliente desde la interfaz staff del CRM.
* **Parámetros:** `p_nombre text, p_email text, p_telefono text, p_rol text, p_metadata jsonb`
* **Lectura:** `public.tpl_actores`, `public.tpl_actor_roles`.
* **Escritura (INSERT):** `public.tpl_actores` (actor maestro), `public.tpl_actor_roles` (su rol).
* **Validaciones Obligatorias e Idempotencia:**
  - Si el `p_email` ya existe, la función **no crea una nueva fila** en `tpl_actores`, sino que asocia de forma idempotente el rol en `tpl_actor_roles` si no estuviera asignado.
  - Prioridad de desduplicación: RUT (si se ingresa) $\rightarrow$ Email $\rightarrow$ Teléfono.
* **Seguridad y RLS:** `SECURITY DEFINER` con `search_path=public`. Se añade cláusula explícita `if not public.tpl_es_staff() then raise exception ...` en la cabecera del cuerpo PL/pgSQL.
* **Auditoría:** Inserta un log en `tpl_eventos` con evento `'crm.actor_creado'`.
* **Lo que NO debe permitir:** No debe duplicar registros por email ni sobrescribir perfiles de otros roles silenciosamente.

### RPC 2: `public.tpl_crm_actualizar_estado_oportunidad_v1`
* **Propósito Exacto:** Gestionar las transiciones de fases comerciales en el pipeline de ventas.
* **Parámetros:** `p_oportunidad_id uuid, p_estado text, p_comentario text`
* **Lectura:** `public.tpl_oportunidades`.
* **Escritura (UPDATE):** Columna `estado` en `public.tpl_oportunidades`.
* **Validaciones:**
  - Comprueba que la oportunidad existe.
  - Valida que `p_estado` pertenezca al catálogo aprobado de estados comerciales y de soporte transaccional heredados.
* **Auditoría:** Inserta una tupla en `public.tpl_eventos` con las fases `'estado_anterior'` y `'estado_nuevo'` en la columna JSONB `metadata` para resguardar la inmutabilidad.
* **Lo que NO debe permitir:** No permite transiciones de estado a oportunidades inexistentes.

### RPC 3: `public.tpl_crm_agendar_visita_v1`
* **Propósito Exacto:** Planificar y registrar visitas físicas a terreno coordinadas por ejecutivos staff.
* **Parámetros:** `p_oportunidad_id uuid, p_staff_id uuid, p_fecha_hora timestamptz, p_notas text`
* **Lectura:** `public.tpl_oportunidades`, `public.tpl_actores`.
* **Escritura (INSERT):** `public.tpl_visitas`.
* **Validaciones:**
  - Comprueba que la Oportunidad existe.
  - Verifica que el ejecutivo (`p_staff_id`) existe en `tpl_actores`.
  - Valida colisiones de horario: Si el ejecutivo ya posee otra visita programada en una ventana de $\pm$ 2 horas, la RPC levanta excepción `'COLLISION_DE_HORARIO_EJECUTIVO'`. Sin embargo, dos ejecutivos distintos sí pueden visitar el mismo lote a la misma hora sin disparar falsos positivos.
* **Efecto Secundario:** Actualiza automáticamente el estado de la oportunidad a `'agendada'`.

### RPC 4: `public.tpl_crm_actualizar_visita_v1`
* **Propósito Exacto:** Actualizar el estado y observaciones del resultado de la visita a terreno.
* **Parámetros:** `p_visita_id uuid, p_estado text, p_resultado text, p_notas text`
* **Lectura:** `public.tpl_visitas`.
* **Escritura (UPDATE):** `public.tpl_visitas`.
* **Validaciones:**
  - Valida que la visita existe y que `p_estado` coincide con `'programada'`, `'confirmada'`, `'realizada'`, `'cancelada'` o `'no_asistio'`.
  - Si el estado transiciona a `'cancelada'` o `'no_asistio'`, actualiza la oportunidad para que el ejecutivo decida su retroceso comercial.

---

## 2. VALIDACIÓN DEL PIPELINE DE ESTADOS

Se confirma que el pipeline comercial se mapea de forma segura sobre los estados existentes:
* **Estados en uso en producción:** `'nueva'` (ingreso de cotizaciones) y `'contactada'` (actualización de oferta).
* **Solución de Normalización:** Se reutilizan de manera directa. `'nueva'` se etiqueta visualmente en el frontend como `Nuevo Lead` y `'contactada'` como `Contactado`. Los nuevos estados se agregan sin colisión ni ambigüedad funcional.

---

## 3. ESPECIFICACIÓN DEL HISTORIAL EN `tpl_eventos`

Para asegurar la inmutabilidad y reconstrucción de la línea de tiempo del cliente, cada cambio de estado comercial registrará un evento en `tpl_eventos` con la siguiente distribución:

* **Columnas Estructurales (Búsquedas & Join frecuentes):**
  - `actor_id` $\rightarrow$ ID del cliente (`actor_cliente_id` de la oportunidad).
  - `propiedad_id` $\rightarrow$ ID de la parcela asociada.
  - `proyecto_id` $\rightarrow$ ID del proyecto (si corresponde).
  - `evento` $\rightarrow$ `'oportunidad.fase_cambiada'`.
  - `categoria` $\rightarrow$ `'comercial'`.
* **Columna `metadata` (JSONB - Información complementaria):**
  - `{"estado_anterior": "...", "estado_nuevo": "...", "ejecutivo_id": "...", "comentario": "..."}`.
* **Resultado:** El historial del pipeline es 100% auditable y reconstruible cronológicamente.

---

## 4. VEREDICTO DE DISEÑO DE RPCs

| RPC | Diseño | Seguridad | Integridad | Historial | Riesgo | Veredicto |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `tpl_crm_crear_actor_v1` | 🟢 Correcto | 🟢 Staff-only | 🟢 Idempotente | 🟢 Evento | Bajo | 🟢 LISTA PARA IMPLEMENTAR |
| `tpl_crm_actualizar_estado_oportunidad_v1`| 🟢 Correcto | 🟢 Staff-only | 🟢 Consistente | 🟢 Evento | Bajo | 🟢 LISTA PARA IMPLEMENTAR |
| `tpl_crm_agendar_visita_v1` | 🟢 Correcto | 🟢 Staff-only | 🟢 Valida colisiones | 🟢 Evento | Bajo | 🟢 LISTA PARA IMPLEMENTAR |
| `tpl_crm_actualizar_visita_v1` | 🟢 Correcto | 🟢 Staff-only | 🟢 Consistente | 🟢 Evento | Bajo | 🟢 LISTA PARA IMPLEMENTAR |

---

## 5. CONCLUSIONES DE GOBIERNO DE SEGURIDAD

* **Ninguna de las RPCs implementará sentencias de borrado físico (`DELETE`).**
* Todas las funciones se declararán como `SECURITY DEFINER` para permitir la inserción segura en tablas protegidas por RLS, pero con una verificación estricta de privilegios basada en `public.tpl_es_staff()` en la primera línea de ejecución del código PL/pgSQL.
