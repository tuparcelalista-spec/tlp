# Plan Técnico de Implementación del CRM TPL — v2.0

> [!NOTE]
> **Plan de diseño de ingeniería definitivo y estrategia de despliegue para la evolución del CRM**
> **Versión:** v2.0 (Congelada)
> **Fecha de cierre del plan:** 9 de agosto de 2026

Este documento detalla el plan técnico final y definitivo previo a la ejecución para la implementación de las capacidades comerciales del CRM.

---

## 1. ESPECIFICACIÓN DE MIGRACIONES SQL (DDL)

Se propone crear la migración `202608090000_tpl_crm_comercial_pipeline_v1.sql` con el siguiente contenido conceptual:

```sql
-- 1. CREACIÓN DE LA TABLA DE VISITAS
create table if not exists public.tpl_visitas (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.tpl_oportunidades(id) on delete cascade,
  usuario_staff_id uuid references public.tpl_actores(id) on delete set null,
  fecha_hora timestamptz not null,
  estado text not null default 'programada'
    check (estado in ('programada','confirmada','realizada','cancelada','no_asistio')),
  resultado text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de optimización de búsquedas y agendas
create index if not exists tpl_visitas_oportunidad_idx on public.tpl_visitas(oportunidad_id);
create index if not exists tpl_visitas_fecha_hora_idx on public.tpl_visitas(fecha_hora desc);
create index if not exists tpl_visitas_staff_idx on public.tpl_visitas(usuario_staff_id, fecha_hora desc);

-- Trigger para automatizar updated_at en tpl_visitas
create trigger trg_tpl_visitas_updated_at
before update on public.tpl_visitas
for each row execute function public.tpl_set_updated_at();
```

---

## 2. ESQUEMA DEFINITIVO DE `tpl_visitas`

* **`id` (uuid, primary key):** Identificador universal. *Obligatorio*.
* **`oportunidad_id` (uuid, FK):** Referencia a la oportunidad de negocio. *Obligatorio*.
* **`usuario_staff_id` (uuid, FK):** Referencia al ejecutivo staff asignado de `tpl_actores`. *Opcional*.
* **`fecha_hora` (timestamptz):** Momento programado de la visita en terreno. *Obligatorio*.
* **`estado` (text):** Ciclo de vida (`'programada'`, `'confirmada'`, `'realizada'`, `'cancelada'`, `'no_asistio'`). *Obligatorio*.
* **`resultado` (text):** Diagnóstico pos-visita. *Opcional*.
* **`notas` (text):** Indicaciones de terreno. *Opcional*.
* **No-Duplicación de `actor_id` y `propiedad_id`:** Se decide no duplicar estas columnas en la tabla `tpl_visitas`, ya que se obtienen de forma directa resolviendo el join con `tpl_oportunidades`. Esto garantiza consistencia atómica y cumple la regla de normalización de datos.

---

## 3. ESPECIFICACIÓN DE NUEVAS RPCs (CONTRATO TÉCNICO)

### A. `tpl_crm_crear_actor_v1`
* **Parámetros:** `p_nombre text, p_email text, p_telefono text, p_rol text, p_metadata jsonb`
* **Retorno:** `jsonb`
* **Operación:** Valida si el email ya existe en `tpl_actores`. Si existe, asocia únicamente el nuevo rol en `tpl_actor_roles` de forma idempotente. Si no existe, realiza un `INSERT` en `tpl_actores` y luego en `tpl_actor_roles` bajo una misma transacción transaccional.
* **Seguridad:** Restringida con la validación `public.tpl_es_staff()`.

### B. `tpl_crm_actualizar_estado_oportunidad_v1`
* **Parámetros:** `p_oportunidad_id uuid, p_estado text, p_comentario text`
* **Retorno:** `jsonb`
* **Operación:** Realiza un `UPDATE` en la columna `estado` de la tabla `tpl_oportunidades` e inserta una tupla en `tpl_eventos` registrando la auditoría de cambio de estado.
* **Validación:** Comprueba que `p_estado` pertenezca al catálogo aprobado de fases comerciales.

### C. `tpl_crm_agendar_visita_v1`
* **Parámetros:** `p_oportunidad_id uuid, p_staff_id uuid, p_fecha_hora timestamptz, p_notas text`
* **Retorno:** `jsonb`
* **Operación:** Inserta una fila en `tpl_visitas` y actualiza automáticamente el estado de la oportunidad asociada a `'agendada'`.
* **Validación:** Valida que el ejecutivo no tenga otra visita agendada en la misma fecha y hora ($\pm$ 2 horas de ventana de viaje).

### D. `tpl_crm_actualizar_visita_v1`
* **Parámetros:** `p_visita_id uuid, p_estado text, p_resultado text, p_notas text`
* **Retorno:** `jsonb`
* **Operación:** `UPDATE` en `tpl_visitas` modificando su estado y registrando las observaciones finales.

---

## 4. CATÁLOGO DE ESTADOS DEL PIPELINE COMERCIAL

Se establece el siguiente mapeo y compatibilidad de estados:
* `'nueva'` $\rightarrow$ Lead recién ingresado en el ecosistema.
* `'contactada'` $\rightarrow$ Primer contacto por ejecutivo.
* `'calificada'` $\rightarrow$ Calificado con presupuesto.
* `'agendada'` $\rightarrow$ Reunión coordinada y registrada en `tpl_visitas`.
* `'negociacion'` $\rightarrow$ Oferta formal en evaluación.
* `'reservada'` $\rightarrow$ Bloqueo de parcela mediante pago.
* `'vendida'` $\rightarrow$ Operación cerrada con firma notarial exitosa.
* `'rechazada'` $\rightarrow$ Solicitud del propietario rechazada.
* `'perdida'` $\rightarrow$ Prospecto desiste o no califica.
* `'cancelada'` $\rightarrow$ Operación anulada antes de concretarse.

---

## 5. REGISTRO DE HISTORIAL CON `tpl_eventos`

Ante un cambio de etapa comercial, la RPC `tpl_crm_actualizar_estado_oportunidad_v1` insertará un registro en `tpl_eventos` con la siguiente distribución:
* **Columnas Estructurales:**
  - `actor_id`: ID del cliente asociado a la oportunidad.
  - `proyecto_id`: Asignado si la oportunidad vincula un proyecto casa + terreno.
  - `evento`: `'oportunidad.fase_cambiada'`.
  - `categoria`: `'comercial'`.
  - `origen`: `'crm_staff'`.
  - `prioridad`: `'media'`.
* **Columna `metadata` (JSONB):**
  - `{"oportunidad_id": "...", "estado_anterior": "...", "estado_nuevo": "...", "ejecutivo_id": "...", "comentario": "..."}`.
  - Esto conserva el historial inmutable de transiciones y permite auditorías forenses sin contaminar las tablas principales.

---

## 6. CONVERSIÓN LEAD $\rightarrow$ CLIENTE

El flujo se implementará de forma 100% lógica reutilizando las estructuras actuales:
1. El Actor (`tpl_actores`) nace con rol `'comprador'` en `tpl_actor_roles`.
2. Al transicionar la oportunidad a estado `'vendida'`, la RPC realiza un `INSERT` idempotente en `tpl_actor_roles` asignando el rol `'cliente'` (o `'propietario'` si adquiere un lote físico).
3. El ID del Actor no cambia, resguardando todo su historial previo de visitas, cotizaciones y eventos anteriores.

---

## 7. GESTIÓN Y ESTADOS DE VISITAS

* **Estados de la Visita:** `'programada'`, `'confirmada'`, `'realizada'`, `'cancelada'`, `'no_asistio'`.
* **Permisos de Gestión:**
  - *Crear / Editar / Confirmar:* Ejecutivo Comercial / Administrador.
  - *Cancelar / Registrar Resultado:* Ejecutivo Comercial / Administrador.
  - *Usuario Público / Partner:* **Bloqueado**. Sin acceso de lectura ni escritura.

---

## 8. MATRIZ CONCEPTUAL DE SEGURIDAD (CRM COMERCIAL)

| Operación | Admin | Staff Comercial | Staff Operativo | Usuario Público |
| :--- | :---: | :---: | :---: | :---: |
| **Crear / Editar Actor** | SÍ | SÍ | NO | NO (Formularios públicos limitados) |
| **Crear / Cambiar Oportunidad**| SÍ | SÍ | NO | NO |
| **Crear / Editar Visita** | SÍ | SÍ | SÍ | NO |
| **Registrar Resultado Visita** | SÍ | SÍ | NO | NO |
| **Ver Tasación Canónica** | SÍ | SÍ | SÍ | SÍ (Solo cotizador público) |
| **Ver logs de Auditoría** | SÍ | NO | NO | NO |

---

## 9. INVENTARIO DE COMPONENTES FRONTEND A DESARROLLAR

* **Capa de Datos (`tpl-data-service.js`):**
  - Wrapper para invocar a las 4 RPCs staff seguras y método `snapshot` enriquecido.
* **Componente Kanban (`crm-v2.js`):**
  - Vista Kanban interactiva dividida en 7 columnas comerciales dinámicas con soporte Drag-and-Drop para transicionar tarjetas.
* **Modales de Gestión:**
  - `crmActorDialog`: Creación directa de clientes.
  - `crmVisitaDialog`: Calendario de visitas.
* **Hoja de Estilos (`crm-v2.css`):**
  - Grid de estados y animaciones de arrastre de tarjetas.

---

## 10. MATRIZ DE COMPATIBILIDAD DEL ECOSISTEMA

| Módulo Ecosistema | Impacto | Riesgo | Mitigación |
| :--- | :---: | :---: | :--- |
| **Portal Público** | 🟢 Ninguno | Cero | Lee únicamente de `tpl_propiedades` publicadas. |
| **Tasador** | 🟢 Ninguno | Cero | Operaciones aisladas de cálculo matemático intactas. |
| **Publicador** | 🟢 Ninguno | Cero | Inserción de borradores se mantiene por su RPC independiente. |
| **Proyectos** | 🟢 Ninguno | Cero | Integración limpia mediante relaciones FK hacia actores. |
| **Casas / Catálogo** | 🟢 Ninguno | Cero | Solo lectura en caliente en el cotizador. |
| **Supabase** | 🟢 Ninguno | Cero | Nuevas tablas y RPCs no alteran esquemas transaccionales. |

---

## 11. ORDEN DE EJECUCIÓN POR FASES (HOJA DE RUTA)

```text
  FASE 0 (Backup) ──> FASE 1 (Migración DB) ──> FASE 2 (RPCs) ──> FASE 3 (RLS) ──> FASE 4 (Data Service) ──> FASE 5 (UI Kanban) ──> FASE 6 (Pruebas)
```

* **Fase 0:** Respaldo y Snapshot físico de Supabase.
* **Fase 1:** Ejecución del archivo de migración DDL en Supabase.
* **Fase 2:** Declaración de las 4 funciones RPC staff (`tpl_crm_*`).
* **Fase 3:** Configuración de políticas RLS sobre la nueva tabla `tpl_visitas`.
* **Fase 4:** Integración de wrappers de consulta en `tpl-data-service.js`.
* **Fase 5:** Desarrollo visual de la interfaz Kanban y modales en `crm-v2.js`.
* **Fase 6:** Pruebas y verificación de regresión.

---

## 12. PLAN DE ROLLBACK Y CONTINGENCIA

* **Desinstalación SQL:** Ejecución del script DDL rollback que remueve `tpl_visitas`, elimina los índices asociados y borra las 4 RPCs declaradas.
* **Recuperación de Datos:** En caso de falla catastrófica, restauración del Snapshot físico de base de datos realizado en la Fase 0.
* **Pérdida de Historial:** Al no existir borrado físico (`DELETE`), no hay riesgo de pérdida de historial comercial.

---

## 13. PLAN DE TESTING Y CONTROL DE CALIDAD

Se realizarán las siguientes pruebas en entorno de validación antes del pase a producción:
1. **Creación de Lead:** Validar inserción de actor y asignación de rol `'comprador'`.
2. **Transición Pipeline:** Probar el avance manual desde `'nueva'` a `'negociacion'` y verificar que se inserte el log correspondiente en `tpl_eventos`.
3. **Agendamiento de Visita:** Verificar inserción en `tpl_visitas` y cambio automático de la oportunidad a `'agendada'`.
4. **Validación de RLS:** Confirmar que un usuario anónimo reciba error de permisos al intentar invocar las RPCs staff.

---

## 14. CRITERIOS DE ACEPTACIÓN

* **[APROBADO PARA IMPLEMENTAR]:**
  - Todos los tests de la fase de validación son exitosos (PASS).
  - La interfaz Kanban permite arrastrar oportunidades actualizando en caliente la base de datos.
  - El Tasador y buscador público operan sin alteraciones de performance o comportamiento.
* **[DETENER - RIESGO DETECTADO]:**
  - Errores de permisos RLS en usuarios staff autorizados.
  - Pérdida de inconsistencia en cascada sobre `tpl_tasaciones`.
