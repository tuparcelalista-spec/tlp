begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.tpl_partner_intentos_publicos (
  id uuid primary key default gen_random_uuid(),
  correo_hash text not null,
  tipo text not null default 'postulacion',
  created_at timestamptz not null default now()
);
create index if not exists tpl_partner_intentos_publicos_hash_idx
  on public.tpl_partner_intentos_publicos(correo_hash, created_at desc);
alter table public.tpl_partner_intentos_publicos enable row level security;
revoke all on public.tpl_partner_intentos_publicos from anon, authenticated;

create or replace function public.tpl_validar_envio_partner_publico_v2(p_correo text)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_mail text := lower(trim(coalesce(p_correo,'')));
  v_hash text;
  v_recent integer;
begin
  if v_mail !~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then
    raise exception 'CORREO_INVALIDO';
  end if;

  v_hash := encode(extensions.digest(convert_to(v_mail,'UTF8'),'sha256'),'hex');

  select count(*) into v_recent
  from public.tpl_partner_intentos_publicos
  where correo_hash=v_hash and created_at>now()-interval '24 hours';

  if v_recent >= 5 then
    raise exception 'LIMITE_INTENTOS_PARTNER';
  end if;

  insert into public.tpl_partner_intentos_publicos(correo_hash,tipo)
  values(v_hash,'postulacion');

  delete from public.tpl_partner_intentos_publicos
  where created_at<now()-interval '30 days';

  return jsonb_build_object('ok',true,'intentos_24h',v_recent+1);
end $$;

grant execute on function public.tpl_validar_envio_partner_publico_v2(text) to anon, authenticated;

create or replace function public.tpl_encolar_continuacion_partner_v1(p_token text,p_base_url text)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v public.tpl_partner_borradores;
  v_url text;
  v_exists boolean;
begin
  select * into v
  from public.tpl_partner_borradores
  where token_hash=encode(extensions.digest(convert_to(trim(p_token),'UTF8'),'sha256'),'hex')
    and estado='borrador'
    and expires_at>now();

  if v.id is null then raise exception 'BORRADOR_NO_DISPONIBLE'; end if;

  select exists(
    select 1 from public.tpl_comunicaciones_pendientes
    where destinatario=v.correo
      and plantilla='partner_continuar_registro'
      and created_at>now()-interval '15 minutes'
      and estado in ('pendiente','procesando','enviado')
  ) into v_exists;

  if v_exists then
    return jsonb_build_object('ok',true,'encolado',false,'motivo','CORREO_RECIENTE_EXISTENTE');
  end if;

  v_url := regexp_replace(coalesce(p_base_url,''),'[?&]continuar=[^&]+','','g') || '?continuar=' || p_token;
  insert into public.tpl_comunicaciones_pendientes(tipo,destinatario,asunto,plantilla,variables)
  values('email',v.correo,'Continúa tu registro en TPL Pro Network','partner_continuar_registro',
    jsonb_build_object('borrador_id',v.id,'continuar_url',v_url,'porcentaje',v.porcentaje_completitud,
      'campos_pendientes',v.campos_pendientes,'expires_at',v.expires_at));
  return jsonb_build_object('ok',true,'encolado',true);
end $$;

grant execute on function public.tpl_encolar_continuacion_partner_v1(text,text) to anon, authenticated;

create or replace function public.tpl_cargar_borrador_partner_v1(p_token text)
returns jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
  select coalesce((
    select jsonb_build_object('ok',true,'id',id,'payload',payload,'paso_actual',paso_actual,
      'porcentaje',porcentaje_completitud,'campos_pendientes',campos_pendientes,'expires_at',expires_at)
    from public.tpl_partner_borradores
    where token_hash=encode(extensions.digest(convert_to(trim(p_token),'UTF8'),'sha256'),'hex')
      and estado='borrador' and expires_at>now()
    limit 1
  ), jsonb_build_object('ok',false,'error','BORRADOR_NO_DISPONIBLE'));
$$;

grant execute on function public.tpl_cargar_borrador_partner_v1(text) to anon, authenticated;

create or replace function public.tpl_marcar_borrador_partner_enviado_v1(p_token text,p_postulacion_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
begin
  update public.tpl_partner_borradores
  set estado='enviado',enviado_at=now(),updated_at=now(),
      payload=payload||jsonb_build_object('postulacion_id',p_postulacion_id)
  where token_hash=encode(extensions.digest(convert_to(trim(p_token),'UTF8'),'sha256'),'hex')
    and estado='borrador';
  return found;
end $$;

grant execute on function public.tpl_marcar_borrador_partner_enviado_v1(text,uuid) to anon, authenticated;

commit;
