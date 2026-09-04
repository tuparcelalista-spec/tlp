-- Corrige la causa REAL por la que ninguna foto subida por un propietario o
-- por el publicador se ha visto nunca en ningún lado (ni CRM, ni sitio
-- público): la función que registra la foto nunca llenó la columna `url` de
-- tpl_propiedad_imagenes (solo guardaba storage_path), y el bucket de
-- Storage donde quedan los archivos (tpl-propiedades-propietario) se creó
-- como privado. Con url siempre NULL, cualquier <img src="..."> que lea esa
-- columna (incluida la vista crm_parcelas_resumen que se corrigió en
-- 20260903040000) sale vacío y cae al placeholder. Esto no es nuevo de la
-- parcela de Los Ángeles: nunca funcionó para NINGUNA propiedad que haya
-- recibido fotos por este camino.
--
-- Las fotos de una parcela en venta son material de marketing público (se
-- ven en la ficha pública igual que las 32 parcelas sembradas, cuyas URLs sí
-- son públicas desde el principio) — no hay razón para mantenerlas detrás de
-- una URL firmada que expira. Por eso se opta por hacer público el bucket y
-- guardar la URL pública directa, en vez de generar URLs firmadas al vuelo.
begin;

-- 1) Bucket público: las imágenes de una propiedad son material de
--    marketing, igual que las 32 parcelas sembradas (que ya usan URLs
--    públicas). No hay dato sensible en un storage_path de foto de campo.
update storage.buckets
   set public = true
 where id = 'tpl-propiedades-propietario';

-- 2) tpl_registrar_foto_propietario_v1: mismo cuerpo que
--    202608050016_tpl_sincronizacion_total_tasador_v1.sql, ahora completando
--    también la columna `url` con la URL pública del objeto recién subido.
create or replace function public.tpl_registrar_foto_propietario_v1(
  p_propiedad_id uuid,
  p_storage_path text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_order int;
  v_url text;
begin
  if auth.role() <> 'service_role' then raise exception 'NO_AUTORIZADO'; end if;

  select coalesce(max(orden), -1) + 1 into v_order
  from public.tpl_propiedad_imagenes
  where propiedad_id = p_propiedad_id;

  v_url := 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/'
           || p_storage_path;

  insert into public.tpl_propiedad_imagenes(
    propiedad_id, storage_path, url, tipo, orden, es_portada, alt, metadata
  ) values (
    p_propiedad_id, left(p_storage_path, 500), v_url, 'foto', v_order, false,
    'Fotografía aportada por el propietario',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('origen', 'link_propietario', 'estado_revision', 'pendiente')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.tpl_registrar_foto_propietario_v1(uuid,text,jsonb) from public;
grant execute on function public.tpl_registrar_foto_propietario_v1(uuid,text,jsonb) to service_role;

-- 3) Backfill: todas las fotos ya subidas que se quedaron con url=NULL.
update public.tpl_propiedad_imagenes
   set url = 'https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/' || storage_path
 where url is null
   and storage_path is not null;

-- 4) El staff del CRM necesita ver TODAS las fotos de una propiedad (para
--    poder gestionarlas desde el editor), no solo las de propiedades ya
--    publicadas como permite tpl_propiedad_imagenes_public_read.
drop policy if exists tpl_propiedad_imagenes_staff_select on public.tpl_propiedad_imagenes;
create policy tpl_propiedad_imagenes_staff_select
on public.tpl_propiedad_imagenes
for select
to authenticated
using (public.tpl_es_staff());

commit;
