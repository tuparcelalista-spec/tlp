-- Catastro de mercado: los contactos de los vendedores salen del alcance de anon
--
-- QUÉ HACE
--   1) Revoca el SELECT del rol anon sobre public.tpl_catastro_mercado y le
--      devuelve, columna por columna, solo las de mercado (id, parcela_id,
--      titulo, comuna, precio_clp, superficie_m2, lat, lng).
--   2) Crea public.vw_catastro_mercado_publico con esas mismas columnas, como
--      contrato explícito de lo que las páginas públicas pueden leer, y le da
--      SELECT a anon y a authenticated.
--   3) Revoca INSERT / UPDATE / DELETE de anon sobre la tabla base.
--   No borra datos, no toca ninguna política RLS y no cambia nada del acceso
--   de authenticated ni de service_role.
--
-- POR QUÉ
--   Verificado en producción el 2026-09-02 con la clave publicable del sitio
--   (rol anon, sin sesión), la que ya viaja dentro del JavaScript público:
--
--     GET /rest/v1/tpl_catastro_mercado
--         ?select=titulo,contacto_nombre,contacto_telefono,contacto_email
--     -> HTTP 200 y las 562 filas de la tabla.
--
--   O sea, cualquiera que abriera el sitio podía descargar la agenda completa
--   de vendedores: 407 filas con nombre, 80 con teléfono y 6 con correo
--   (82 filas con teléfono o correo). Son datos personales de terceros
--   capturados desde portales inmobiliarios, no clientes de TPL: ninguna
--   pantalla pública los muestra y nadie dio permiso para publicarlos.
--
--   Se cierra la tabla entera y se abre solo la lista corta de columnas, en vez
--   de tapar únicamente las tres columnas de contacto, porque la tabla también
--   entregaba al anon el cuerpo del aviso (descripcion, texto_original,
--   metadata, analisis_profundo), donde el teléfono del vendedor suele venir
--   escrito dentro del texto, y la traza de auditoría de la captura
--   (capture_id, captured_at, captured_by).
--
--   El punto 3 cierra un segundo hallazgo de la misma revisión: el rol anon
--   todavía tenía privilegio de INSERT sobre la tabla. Se comprobó enviando un
--   POST con la clave publicable, que llegó a ejecutar el trigger
--   trg_tpl_catastro_mercado_set_captura (falló dentro de él, en
--   gen_random_bytes) -- el chequeo de privilegios ocurre antes del trigger, así
--   que el privilegio estaba concedido. Hoy lo frena una política RLS, no la
--   ausencia de permiso. Desde 20260831020000 ningún cliente anónimo escribe
--   aquí: la extensión y el bookmarklet entregan la captura al CRM y la guarda
--   un asesor con sesión.
--
--   Consumidores revisados uno por uno antes de revocar:
--     - frontend-v2/js/core/valuation-adapter.js (analizarCatastro): lee con la
--       clave anon en páginas públicas y ya pedía exactamente estas columnas.
--       Se repunta a la vista en el mismo cambio; aunque el despliegue del
--       frontend llegue después que esta migración, sigue funcionando gracias
--       al GRANT por columna del punto 1.
--     - frontend-v2/js/core/tpl-data-service.js (getOwnerValuationReport): lee
--       con la clave anon y pedía select('*'), que a partir de ahora sería
--       "permission denied". Se repunta a la vista.
--     - frontend-v2/plataforma/informe-valores/: no consulta la tabla; recibe
--       los comparables ya calculados desde valuation-adapter.js.
--     - frontend-v2/plataforma/crm-tpl-v1/ (catastro, comparables,
--       premium-report y la suscripción realtime): corre detrás del login del
--       CRM, es decir con el rol authenticated, que no se toca. El CRM sigue
--       viendo la tabla completa, contactos incluidos.
--     - chrome-extension-catastro/: no lee la tabla y ya no escribe con la
--       clave anon.
--     - public.vw_buscador_comparables (creada fuera de migraciones por
--       scripts/supabase_vista_comparables.sql): no la consume ningún archivo
--       del repositorio y no expone columnas de contacto. Se deja como está; si
--       es una vista security_invoker dejará de responderle al rol anon, porque
--       pide columnas del catastro que ya no están en el GRANT (url, fuente,
--       region, precio_uf, created_at).
--
-- TABLAS AFECTADAS
--   public.tpl_catastro_mercado         privilegios del rol anon (SELECT pasa a
--                                       ser por columna; INSERT/UPDATE/DELETE
--                                       se revocan). Sin cambios de datos, de
--                                       políticas RLS, ni para authenticated y
--                                       service_role.
--   public.vw_catastro_mercado_publico  vista nueva, solo lectura.
--
-- REVERSIÓN
--   begin;
--     revoke select on public.tpl_catastro_mercado from anon;
--     grant select, insert, update, delete on public.tpl_catastro_mercado to anon;
--     drop view if exists public.vw_catastro_mercado_publico;
--     notify pgrst, 'reload schema';
--   commit;
--   Y devolver valuation-adapter.js y tpl-data-service.js a
--   from('tpl_catastro_mercado').

begin;

-- 1) SELECT por columna para el rol anon.
--    El "revoke" primero borra el permiso de tabla completa (que incluye toda
--    columna futura); el "grant" siguiente vuelve a abrir solo la lista corta.
--    Queda anotado en el catálogo, así que una columna nueva en la tabla nace
--    invisible para el anon, sin depender de que alguien se acuerde de taparla.
revoke select on public.tpl_catastro_mercado from anon;

grant select (
  id,
  parcela_id,
  titulo,
  comuna,
  precio_clp,
  superficie_m2,
  lat,
  lng
) on public.tpl_catastro_mercado to anon;

-- 2) Vista pública: el contrato explícito de lo que puede salir a las páginas
--    sin sesión. Deliberadamente NO incluye contacto_nombre, contacto_telefono
--    ni contacto_email; tampoco descripcion, texto_original, metadata,
--    analisis_profundo ni atributos, que son texto libre del aviso y arrastran
--    teléfonos escritos dentro del anuncio; ni capture_id, captured_at o
--    captured_by, que son auditoría interna de quién capturó la ficha.
--    parcela_id sí va: es la llave interna que amarra un aviso con una parcela
--    TPL, no dice nada de ninguna persona, y getOwnerValuationReport filtra por
--    ella.
--    security_invoker = true a propósito: la vista lee con los permisos de quien
--    la consulta, no con los del dueño. Así el GRANT por columna del punto 1 y
--    las políticas RLS de la tabla siguen mandando, y la vista no se convierte
--    en una puerta lateral que las saltee.
create or replace view public.vw_catastro_mercado_publico
with (security_invoker = true) as
select
  m.id,
  m.parcela_id,
  m.titulo,
  m.comuna,
  m.precio_clp,
  m.superficie_m2,
  m.lat,
  m.lng
from public.tpl_catastro_mercado m;

comment on view public.vw_catastro_mercado_publico is
  'Catastro de mercado sin datos de contacto: lo unico que el rol anon puede leer del catastro. Ver migracion 20260902060000.';

grant select on public.vw_catastro_mercado_publico to anon, authenticated;

-- 3) El rol anon no escribe en el catastro. Las capturas entran por el CRM con
--    un asesor logueado (rol authenticated), que conserva sus permisos.
revoke insert, update, delete on public.tpl_catastro_mercado from anon;

-- PostgREST tiene que ver la vista nueva sin esperar al refresco automático.
notify pgrst, 'reload schema';

commit;
