-- P3: CRM crea una ficha mínima Partner y envía el mismo enlace seguro del formulario existente.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.tpl_crm_crear_link_partner_v1(
  p_payload jsonb,
  p_dias integer default 30,
  p_base_url text default 'https://www.parcelalista.cl/red-partner-v2/postular.html'
) returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_token text;
  v_hash text;
  v_id uuid;
  v_mail text := lower(trim(coalesce(p_payload->>'correo','')));
  v_name text := trim(coalesce(p_payload->>'nombre_comercial',''));
  v_days integer := greatest(1,least(coalesce(p_dias,30),90));
  v_expires timestamptz := now() + make_interval(days => greatest(1,least(coalesce(p_dias,30),90)));
  v_url text;
  v_payload jsonb;
begin
  if not public.tpl_es_admin() then raise exception 'NO_AUTORIZADO'; end if;
  if v_name='' then raise exception 'NOMBRE_PARTNER_REQUERIDO'; end if;
  if v_mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'CORREO_INVALIDO'; end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_hash := encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex');
  v_payload := coalesce(p_payload,'{}'::jsonb)
    || jsonb_build_object(
      'correo',v_mail,
      'nombre_comercial',v_name,
      'puntaje_completitud_inicial',20,
      'metadata',coalesce(p_payload->'metadata','{}'::jsonb)||jsonb_build_object('origen','crm','creado_por_tpl',true,'created_at',now())
    );

  insert into public.tpl_partner_borradores(
    correo,token_hash,estado,paso_actual,porcentaje_completitud,payload,campos_pendientes,expires_at,ultimo_acceso_at
  ) values(
    v_mail,v_hash,'borrador',1,20,v_payload,
    array['especialidades','comunas atendidas','forma de cobro','garantías','caso práctico','fotografías'],
    v_expires,now()
  ) returning id into v_id;

  v_url := regexp_replace(trim(trailing '/' from coalesce(nullif(trim(p_base_url),''),'https://www.parcelalista.cl/red-partner-v2/postular.html')),'[?&]continuar=[^&]+','','g')
    || '?continuar=' || v_token;

  insert into public.tpl_comunicaciones_cola(canal,destinatario,plantilla,asunto,payload,estado,procesar_desde)
  values(
    'email',v_mail,'partner_continuar_registro','Completa la ficha de tu empresa en Tu Parcela Lista',
    jsonb_build_object(
      'nombre',v_name,'continuar_url',v_url,'porcentaje',20,'borrador_id',v_id,
      'idempotency_key','crm-partner-invite-'||v_id::text
    ),'pendiente',now()
  );

  return jsonb_build_object('ok',true,'id',v_id,'token',v_token,'url',v_url,'expires_at',v_expires,'correo_encolado',true);
end $$;

revoke all on function public.tpl_crm_crear_link_partner_v1(jsonb,integer,text) from public,anon;
grant execute on function public.tpl_crm_crear_link_partner_v1(jsonb,integer,text) to authenticated;

comment on function public.tpl_crm_crear_link_partner_v1(jsonb,integer,text) is
'Permite al CRM crear una ficha mínima Partner, generar token seguro y enviar el enlace del formulario existente.';
