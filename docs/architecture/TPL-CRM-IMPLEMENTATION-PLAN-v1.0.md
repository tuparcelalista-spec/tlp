# Plan Técnico de Implementación del CRM TPL — v1.0

> [!NOTE]
> **Plan de diseño de ingeniería y estrategia de despliegue para la evolución del CRM**
> **Versión:** v1.0 (Congelada)
> **Fecha de cierre del plan:** 9 de agosto de 2026

Este documento detalla el plan técnico paso a paso para implementar la evolución del CRM de TPL sin romper el modelo relacional actual ni interrumpir la operación de producción de Supabase y el portal público.

---

## 1. ANÁLISIS DE IMPACTO Y DISEÑO TÉCNICO DE IMPLEMENTACIÓN (22 PUNTOS)

### 1. Archivos Frontend a Modificar
* **[frontend-v2/plataforma/crm-v2/crm-v2.js](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/crm-v2.js):**
  - Implementación visual de la interfaz Kanban del pipeline comercial.
  - Adición de modales y formularios de alta manual de actores (`tpl_actores`) y agendamiento de visitas (`tpl_visitas`).
* **[frontend-v2/plataforma/crm-v2/crm-v2.css](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/plataforma/crm-v2/crm-v2.css):**
  - Estilos responsivos de las tarjetas Kanban y grids de calendario.
* **[frontend-v2/js/core/tpl-data-service.js](file:///d:/BIOTV%20MARKETING/NUEVO%20BIOTV/P%C3%81GINAS%20WEB/TPL%20PAGINA%20MALA/TPL%20PRUEBA%20NUEVA/frontend-v2/js/core/tpl-data-service.js):**
  - Incorporación de los métodos JavaScript encapsulados para invocar las nuevas RPCs (`tpl_crm_crear_actor_v1`, `tpl_crm_actualizar_fase_oportunidad_v1`, `tpl_crm_agendar_visita_v1`).

### 2. Archivos Backend/Supabase a Modificar
* **Nuevas migraciones en `supabase/migrations/`:**
  - Archivo de migración estructurado con sentencias DDL idempotentes para alterar restricciones y declarar la nueva tabla.

### 3. Nuevas RPCs Requeridas
* **`tpl_crm_crear_actor_v1`:** Registro atómico y validado de datos en `tpl_actores` y `tpl_actor_roles`.
* **`tpl_crm_actualizar_fase_oportunidad_v1`:** Transiciones del pipeline de ventas.
* **`tpl_crm_agendar_visita_v1`:** Registro en la agenda.

### 4. RPCs Existentes a Reutilizar
* **`tpl_crm_snapshot_v1`:** Reutilizada para cargar el estado del CRM, pero ampliando su consulta JSONB para incluir el listado consolidado de visitas agendadas.

### 5. Tablas Existentes a Ampliar
* **`tpl_oportunidades`:** Ampliada a nivel de su restricción CHECK de `estado` para validar las nuevas transiciones.

### 6. Columnas Nuevas Requeridas
* Ninguna columna nueva en tablas existentes. Se decide reutilizar `tpl_oportunidades.estado` y el campo JSONB `metadata` de `tpl_actores`.

### 7. Justificación de la Tabla `tpl_visitas`
* **Sí, es necesaria.** La relación cruzada (N-a-N) entre un prospecto cliente, un ejecutivo responsable staff, una propiedad geográfica del inventario, y una fecha/hora específicas con su respectivo resultado requiere una entidad relacional independiente en Supabase para evitar sobrecargar e invalidar esquemas transaccionales.

### 8. Justificación de la Entidad `Actividad`
* **No es necesaria una tabla física.** Las bitácoras de llamadas y notas de seguimiento operativo comercial se guardarán de forma flexible como un historial de registros en el JSONB `metadata` del Actor o la Oportunidad.

### 9. Cambios en `tpl_oportunidades`
* Modificación de la restricción CHECK sobre la columna `estado` para permitir las etapas completas: `'nueva'`, `'contactado'`, `'calificado'`, `'agendado'`, `'negociacion'`, `'reservado'`, `'vendido'`, `'perdido'`, `'aceptada'`, `'rechazada'`.

### 10. Cambios en `tpl_actor_roles`
* Ninguno. Se mantiene intacto para soportar múltiples roles de forma simultánea.

### 11. Cambios en `tpl_eventos`
* Ninguno a nivel de estructura. Se le agregan registros históricos en caliente mediante triggers de inserción inmutables al transicionar etapas comerciales.

### 12. Cambios en el Sistema de Permisos (RLS)
* Las políticas RLS del backend restringirán la ejecución de las RPCs a usuarios identificados como `staff` o `admin` mediante el método `public.tpl_es_staff()`.

### 13. Impacto sobre el Portal Público
* **🟢 Sin Impacto:** El buscador público y fichas no consumen `tpl_oportunidades` ni `tpl_visitas`.

### 14. Impacto sobre el Tasador
* **🟢 Sin Impacto:** El Tasador conserva su lógica de cálculo aislada.

### 15. Impacto sobre Publicaciones
* **🟢 Sin Impacto:** La bandeja de revisión sigue su flujo normal e independiente.

### 16. Impacto sobre Proyectos
* **🟢 Sin Impacto:** Las obras avanzan leyendo de `tpl_proyectos` y relacionándose con el actor definitivo sin interferir con las visitas preliminares.

### 17. Estrategia de Migración sin Pérdida de Datos
* Migraciones idempotentes con sentencias SQL `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` seguidas de `ADD CONSTRAINT`. No se ejecutan `DROP TABLE` ni `DELETE` de datos comerciales.

### 18. Estrategia de Compatibilidad hacia Atrás
* Todos los estados existentes en producción (como las solicitudes de oportunidades del owner que se marcan como `'aceptada'` o `'rechazada'`) permanecen válidos y funcionales gracias a su inclusión en el nuevo check constraint.

### 19. Orden Exacto de Implementación por Fases
1. Ejecución de migraciones DDL e inserción de RPCs de backend en Supabase.
2. Integración de métodos en la clase `tpl-data-service.js`.
3. Desarrollo e integración del Kanban visual y modales en `crm-v2.js` y `crm-v2.css`.

### 20. Riesgos Técnicos de cada Fase
* *Fase DB:* Bloqueos temporales de tablas si la base de datos se encuentra transaccionando. Se mitiga aplicando migraciones en ventanas de mantenimiento.
* *Fase UI:* Lentitud al renderizar decenas de tarjetas en el Kanban. Mitigado mediante paginación de snapshots.

### 21. Plan de Pruebas antes de Producción
* Validar transiciones de etapas comerciales y asegurar que usuarios externos sin permisos staff reciban excepciones de seguridad.

### 22. Plan de Rollback
* Scripts SQL preparados para restaurar las restricciones check previas de `tpl_oportunidades` y borrar las funciones SQL declaradas.

---

## 2. VALIDACIÓN PRE-IMPLEMENTACIÓN (RESPUESTAS DEFINITIVAS)

### 1. ¿Reutilizamos `estado` o creamos `fase_comercial`?
* **🟢 REUTILIZAR `estado`**
* **Justificación:** Evita la duplicación de datos semánticos dentro de `tpl_oportunidades`. La base de datos actual ya cuenta con lógica y llamadas del motor de ofertas sobre `estado`, por lo que ampliar sus valores permitidos vía CHECK constraint es la estrategia más limpia y mantenible.

### 2. ¿`tpl_visitas` es realmente necesaria?
* **Sí**. Representa una relación N-a-N compleja (Ejecutivo Staff, Cliente, Lote, Fecha/Hora, Estado y Bitácora). Su desglose relacional es indispensable para consultas de agenda y calendarios.

### 3. ¿Necesitamos una entidad `Actividad`?
* **No**. Se descarta la creación de una tabla de actividades operativas. Todo registro de llamadas, notas y seguimientos comerciales se almacena de forma estructurada dentro del campo JSONB `metadata` del Actor o la Oportunidad.

### 4. ¿Qué RPC son realmente necesarias?
* `tpl_crm_crear_actor_v1` (alta manual y segura de actores con rol).
* `tpl_crm_actualizar_fase_oportunidad_v1` (transición de fases del pipeline).
* `tpl_crm_agendar_visita_v1` (registro de citas en terreno).

### 5. ¿Qué tablas serán modificadas?
* `tpl_oportunidades` (adición del nuevo constraint check de estados).

### 6. ¿Qué tablas NO deben tocarse?
* `tpl_tasaciones`, `tpl_propiedades` (excepto Soft-Delete de estados), `tpl_proyectos` y `tpl_eventos`.

### 7. ¿Cuál es el riesgo de cada cambio?
* Bloqueos en base de datos al alterar el constraint o corrupción del historial si no se pasa a través de las RPCs autorizadas. Para mitigarlo, la manipulación de estados comerciales pasa estrictamente por funciones `SECURITY DEFINER` protegidas por RLS.

### 8. ¿Cómo hacemos rollback?
* Ejecución de un script SQL rollback que reinstala las restricciones originales y borra la tabla `tpl_visitas` junto con las RPCs añadidas.

### 9. ¿Cómo garantizamos compatibilidad con el ecosistema actual?
* Todos los módulos externos (Buscador, Tasador y Publicador) continúan su lectura pública inalterada sobre las tablas maestras, ignorando las transiciones comerciales del pipeline del staff.
