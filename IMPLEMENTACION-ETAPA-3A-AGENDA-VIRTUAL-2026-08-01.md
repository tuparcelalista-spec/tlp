# Etapa 3A — Agenda Virtual del Propietario

## Implementado
- Corrección de la portada de TPL Business que apuntaba a Studio Mark II.
- Login Supabase unificado y recuperación de contraseña.
- Vinculación segura por correo entre `auth.users` y `tpl_actores`.
- Dashboard con propiedades, publicaciones, tasaciones, informes y notificaciones.
- Índice Comercial TPL inicial calculado con completitud de datos.
- Secciones Mis propiedades, Tasaciones e informes, Documentos, Notificaciones y Planes.
- Nuevas tablas de documentos y notificaciones por actor.
- RPC única para cargar el dashboard sin exponer tablas internas.

## Supabase
Ejecutar `supabase/migrations/202608010003_tpl_agenda_propietario_v1.sql`.

## Acceso
`/plataforma/tpl-business/`

La cuenta de Supabase Auth debe utilizar el mismo correo registrado en `tpl_actores.email`.
