begin;

-- Bucket privado y límites explícitos para postulaciones Partner.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'partner-postulaciones-v2',
  'partner-postulaciones-v2',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[];

-- Elimina políticas previas del bucket para evitar permisos acumulados.
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname like 'tpl_partner_postulaciones_%'
  loop
    execute format('drop policy if exists %I on storage.objects',r.policyname);
  end loop;
end $$;

-- Un anónimo solo puede insertar en la carpeta exacta
-- postulacion_id/upload_token/archivo, y únicamente mientras la postulación exista.
create policy tpl_partner_postulaciones_anon_insert
on storage.objects
for insert
to anon
with check (
  bucket_id='partner-postulaciones-v2'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and exists (
    select 1
    from public.tpl_partner_postulaciones p
    where p.id=((storage.foldername(name))[1])::uuid
      and p.upload_token=((storage.foldername(name))[2])::uuid
      and p.estado in ('borrador','recibida','pendiente','en_revision')
      and p.created_at>now()-interval '24 hours'
  )
);

-- Nadie anónimo puede listar, leer, reemplazar o borrar postulaciones.
create policy tpl_partner_postulaciones_staff_select
on storage.objects
for select
to authenticated
using (
  bucket_id='partner-postulaciones-v2'
  and public.tpl_es_staff()
);

create policy tpl_partner_postulaciones_staff_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id='partner-postulaciones-v2'
  and public.tpl_es_admin()
);

-- La confirmación de archivos existente se conserva sin cambios para evitar incompatibilidades.

commit;
