# TPL-CRM-UI-IMPLEMENTATION-AUDIT-v1.0

**Fecha:** 9 de agosto de 2026  
**Alcance:** Implementación CRM comercial sobre la arquitectura TPL existente.

## 1. Resultado

**🟢 APROBADO CON CORRECCIÓN ARQUITECTÓNICA PREVIA**

La implementación frontend fue realizada después de contrastar el código real del repositorio con las auditorías previas. Durante esa comparación se detectaron dos inconsistencias que impedían una integración correcta del Kanban y la agenda:

1. `tpl_crm_snapshot_v1` no exponía `tpl_oportunidades`, `tpl_actores` ni `tpl_visitas` al frontend.
2. `tpl_crm_actualizar_estado_oportunidad_v1` intentaba asignar el rol `cliente`, pero `tpl_actor_roles` no contempla ese rol. El modelo canónico utiliza `comprador` para representar al cliente comprador.

Estas discrepancias fueron corregidas mediante una nueva migración, sin crear entidades duplicadas.

## 2. Cambios realizados

### Backend
Nuevo archivo:

`supabase/migrations/202608090002_tpl_crm_snapshot_comercial_v1.sql`

Incluye:

- ampliación del snapshot existente para entregar:
  - `actores`
  - `oportunidades`
  - `visitas`
- resolución de relaciones:
  - oportunidad → actor
  - oportunidad → proyecto
  - proyecto → propiedad
  - visita → oportunidad
  - visita → ejecutivo actor
- corrección de conversión de oportunidad `vendida` para conservar el rol canónico `comprador`.
- no se creó una tabla de actividades.
- no se creó una tabla de clientes.
- no se creó una tabla de leads.
- no se creó una tabla de pipeline.

### Frontend

`frontend-v2/plataforma/crm-v2/index.html`

- incorporación de formulario de visita.
- incorporación de RUT al alta de actor.
- actualización de cache-busting de CSS/JS.

`frontend-v2/plataforma/crm-v2/crm-v2.js`

- módulo de actores.
- pipeline Kanban.
- Drag & Drop con rollback.
- selector alternativo de etapa.
- agenda de visitas.
- creación de actores mediante RPC.
- agendamiento mediante RPC.
- actualización de visitas mediante RPC.
- timeline comercial basado en `tpl_eventos`.
- manejo de errores de negocio.
- filtros de actores.

`frontend-v2/plataforma/crm-v2/crm-v2.css`

- estilos del Kanban.
- tarjetas de oportunidades.
- agenda.
- timeline.
- formularios comerciales.
- responsive para módulos nuevos.

## 3. Estructuras reutilizadas

Se mantienen como estructuras canónicas:

- `tpl_actores`
- `tpl_actor_roles`
- `tpl_oportunidades`
- `tpl_proyectos`
- `tpl_propiedades`
- `tpl_visitas`
- `tpl_eventos`
- `tpl_tareas`

No se introdujeron entidades paralelas para Cliente, Lead, Actividad o Pipeline.

## 4. Flujo del pipeline

El frontend utiliza exactamente los valores técnicos:

`nueva → contactada → calificada → agendada → negociacion → reservada → vendida`

También se respetan estados existentes de cierre:

- `perdida`
- `cancelada`
- `aceptada`
- `rechazada`

El cambio de estado pasa exclusivamente por:

`updateOpportunityStage()`

que invoca:

`tpl_crm_actualizar_estado_oportunidad_v1`

## 5. Agenda

La agenda utiliza:

`scheduleVisita()`

y:

`updateVisita()`

Las relaciones se resuelven desde `oportunidad_id`.

No se duplican:

- cliente;
- propiedad;
- proyecto.

## 6. Historial

El timeline comercial consume:

`tpl_eventos`

priorizando eventos de categoría `comercial` y eventos de oportunidad/CRM.

No se creó una tabla `tpl_actividades`.

## 7. Seguridad

Las mutaciones comerciales permanecen encapsuladas en las RPC existentes.

El frontend no ejecuta INSERT/UPDATE directo para:

- actores;
- oportunidades;
- visitas.

Los errores de negocio se propagan desde Supabase.

## 8. Pruebas estáticas realizadas

- Sintaxis JavaScript: **OK** mediante `node --check`.
- Existencia de wrappers: **OK**.
- Existencia de `tpl_visitas`: **OK**.
- Existencia de las cuatro RPC comerciales: **OK**.
- Coincidencia del parámetro `p_notas`: **OK**.
- Valores técnicos del pipeline: **OK** contra whitelist de la RPC.
- RUT incorporado al formulario: **OK**.
- Referencias de vistas nuevas: **OK**.

## 9. Pruebas que requieren entorno Supabase autenticado

Deben ejecutarse en el entorno real antes de declarar producción:

- creación de actor válido;
- conflicto RUT/email;
- cambio de etapa;
- rollback por error;
- Drag & Drop;
- agendamiento;
- colisión de horario;
- actualización de visita;
- bloqueo de transición terminal;
- persistencia tras recarga;
- verificación de portal público;
- verificación de Tasador;
- verificación de Publicador.

## 10. Observación importante

La implementación no considera como fuente de verdad las afirmaciones de auditorías anteriores cuando contradicen el código físico. El repositorio fue tratado como fuente de verdad y las discrepancias encontradas fueron documentadas y corregidas.

## 11. Veredicto

**🟢 APROBADO PARA PRUEBA INTEGRAL EN ENTORNO SUPABASE**

No se recomienda declarar producción hasta ejecutar las pruebas funcionales autenticadas indicadas en la sección 9.
