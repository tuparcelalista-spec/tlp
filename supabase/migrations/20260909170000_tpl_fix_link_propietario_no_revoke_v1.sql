-- Corrige la generación de enlaces de propietario para no revocar links activos inadvertidamente.
-- Permite que los enlaces compartidos al propietario sigan vigentes hasta su expiración (30 días).

create extension if not exists pgcrypto with schema extensions;

create or replace function public.tpl_crm_generar_link_propietario_v1(
  p_propiedad_id uuid,
  p_dias integer default 30,
  p_forzar_revocacion boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_link public.tpl_links_propietario;
  v_dias integer;
begin
  if auth.uid() is null or not coalesce(public.tpl_es_admin(), false) then
    raise exception 'NO_AUTORIZADO';
  end if;

  if p_propiedad_id is null
     or not exists (
       select 1
       from public.tpl_propiedades
       where id = p_propiedad_id
     ) then
    raise exception 'PROPIEDAD_INEXISTENTE';
  end if;

  v_dias := greatest(1, least(coalesce(p_dias, 30), 90));

  -- Solo revocar si se pide explícitamente; de lo contrario solo limpiar los ya expirados.
  if coalesce(p_forzar_revocacion, false) then
    update public.tpl_links_propietario
    set estado = 'revocado',
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object('revocado_at', now(), 'revocado_por', auth.uid())
    where propiedad_id = p_propiedad_id
      and estado = 'activo';
  else
    update public.tpl_links_propietario
    set estado = 'revocado'
    where propiedad_id = p_propiedad_id
      and estado = 'activo'
      and expires_at < now();
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.tpl_links_propietario (
    propiedad_id,
    token_hash,
    expires_at,
    created_by,
    metadata
  ) values (
    p_propiedad_id,
    encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex'),
    now() + make_interval(days => v_dias),
    auth.uid(),
    jsonb_build_object(
      'origen', 'crm',
      'dias_vigencia', v_dias,
      'generado_at', now()
    )
  )
  returning * into v_link;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'link_id', v_link.id,
    'expires_at', v_link.expires_at,
    'propiedad_id', p_propiedad_id,
    'dias_vigencia', v_dias
  );
end;
$$;

revoke all on function public.tpl_crm_generar_link_propietario_v1(uuid, integer, boolean) from public, anon;
grant execute on function public.tpl_crm_generar_link_propietario_v1(uuid, integer, boolean) to authenticated;

-- Asegurar compatibilidad con llamadas anteriores de 2 argumentos
-- (drop previo: la versión existente tenía p_dias con default, y
-- create or replace no permite quitar el default de un parámetro)
drop function if exists public.tpl_crm_generar_link_propietario_v1(uuid, integer);
create or replace function public.tpl_crm_generar_link_propietario_v1(
  p_propiedad_id uuid,
  p_dias integer
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return public.tpl_crm_generar_link_propietario_v1(p_propiedad_id, p_dias, false);
end;
$$;

revoke all on function public.tpl_crm_generar_link_propietario_v1(uuid, integer) from public, anon;
grant execute on function public.tpl_crm_generar_link_propietario_v1(uuid, integer) to authenticated;

comment on function public.tpl_crm_generar_link_propietario_v1(uuid, integer, boolean)
is 'Genera un enlace privado temporal para el propietario sin invalidar enlaces activos previos (a menos que se fuerce).';
