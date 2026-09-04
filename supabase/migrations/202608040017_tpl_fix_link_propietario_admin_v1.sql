-- Corrige la generación del enlace privado del propietario desde CRM.
-- La versión inicial llamaba a es_administrador_activo(), helper que no existe
-- en el núcleo canónico. TPL utiliza public.tpl_es_admin().

create extension if not exists pgcrypto with schema extensions;

create or replace function public.tpl_crm_generar_link_propietario_v1(
  p_propiedad_id uuid,
  p_dias integer default 30
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

  -- Cada nueva generación invalida enlaces anteriores para evitar accesos paralelos.
  update public.tpl_links_propietario
  set estado = 'revocado',
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('revocado_at', now(), 'revocado_por', auth.uid())
  where propiedad_id = p_propiedad_id
    and estado = 'activo';

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

revoke all on function public.tpl_crm_generar_link_propietario_v1(uuid, integer) from public, anon;
grant execute on function public.tpl_crm_generar_link_propietario_v1(uuid, integer) to authenticated;

comment on function public.tpl_crm_generar_link_propietario_v1(uuid, integer)
is 'Genera un enlace privado temporal para que el propietario actualice su ficha. Solo administradores TPL autenticados.';
