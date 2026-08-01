# Implementación arquitectura comercial TPL — 2026-08-01

## Objetivo aplicado
Cerrar la primera parte del circuito comercial:

Tasación → solicitud de informe premium → orden pendiente de pago → trazabilidad CRM/Supabase.

También se dejó preparado el modelo de planes, suscripciones y versiones de publicación.

## Cambios realizados

### Frontend
- El informe visible antes del pago se identifica como **vista previa**.
- Se agregó un formulario real de solicitud del informe premium.
- Nombre, correo, teléfono, tasación, entrada, resultado y versión del motor se envían a Supabase.
- Si Supabase no está actualizado o no responde, la solicitud queda respaldada localmente como pendiente de sincronización.
- Se eliminó el antiguo flujo que solo mostraba un `alert` y guardaba una intención simple en `localStorage`.
- El servicio central admite configuración externa mediante `window.TPL_CONFIG`, evitando crear nuevos clientes Supabase por módulo.
- Se corrigió el panel de tasaciones para usar `tpl_tasaciones`, la tabla canónica, mediante `TPLDataService.listMyValuations()`.

### Supabase
Nueva migración:

`supabase/migrations/202608010001_tpl_productos_planes_informes_v1.sql`

Crea:
- `tpl_planes_comerciales`
- `tpl_suscripciones`
- `tpl_ordenes_informe`
- `tpl_informes_tasacion`
- `tpl_publicacion_versiones`
- Campos de control de edición en `tpl_publicaciones`
- RPC `tpl_crear_orden_informe_v1`
- RPC `tpl_listar_planes_publicos_v1`

Planes iniciales registrados:
- Publicación Gratis
- Plan Básico
- Plan Profesional
- Administración TPL

Los precios mensuales de los planes pagados quedan `NULL` hasta que sean definidos comercialmente.

## Acción necesaria en Supabase
Ejecutar en el SQL Editor, después de las migraciones canónicas existentes:

`202608010001_tpl_productos_planes_informes_v1.sql`

No hace falta modificar manualmente tablas ni políticas.

## Lo que deliberadamente no se activó
- Cobro real mediante Flow.
- Webhook de confirmación de pago.
- Generación del PDF definitivo en servidor.
- Envío automático por correo.
- Creación automática de usuario Auth mediante invitación.

Estos procesos requieren Edge Functions y secretos privados. No deben ejecutarse desde el navegador.

## Próxima implementación segura
1. Edge Function `crear-pago-informe`.
2. Webhook `flow-webhook` con validación de firma.
3. Cambio de orden a `pagado`.
4. Generación del PDF definitivo.
5. Storage privado y URL firmada.
6. Correo de entrega.
7. Invitación automática a la Agenda Virtual del Propietario.

## Validaciones realizadas
- Todos los archivos JavaScript pasan `node --check`.
- No se introdujeron IDs HTML duplicados en Publicador, Tasador ni CRM V2.
- Los cambios reutilizan `TPLDataService` y no crean un cliente Supabase adicional.
