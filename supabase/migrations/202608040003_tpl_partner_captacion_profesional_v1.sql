-- TPL Pro Network: captación profesional, borradores y casos prácticos.
create extension if not exists pgcrypto;

create table if not exists public.tpl_partner_borradores (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  token_hash text not null unique,
  estado text not null default 'borrador' check (estado in ('borrador','enviado','vencido','revocado')),
  paso_actual integer not null default 1,
  porcentaje_completitud integer not null default 0 check (porcentaje_completitud between 0 and 100),
  payload jsonb not null default '{}'::jsonb,
  campos_pendientes text[] not null default '{}',
  expires_at timestamptz not null default (now() + interval '30 days'),
  ultimo_acceso_at timestamptz,
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tpl_partner_borradores_correo_idx on public.tpl_partner_borradores(lower(correo), estado, updated_at desc);

create table if not exists public.tpl_partner_casos_practicos (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid references public.tpl_partner_postulaciones(id) on delete cascade,
  perfil_id uuid references public.tpl_partner_perfiles(id) on delete cascade,
  servicio_codigo text not null,
  titulo text not null,
  escenario text not null,
  respuesta_libre text not null,
  solucion_resumida text,
  alcance jsonb not null default '{}'::jsonb,
  forma_cobro jsonb not null default '{}'::jsonb,
  forma_pago jsonb not null default '{}'::jsonb,
  incluye jsonb not null default '[]'::jsonb,
  no_incluye jsonb not null default '[]'::jsonb,
  plazos jsonb not null default '{}'::jsonb,
  garantias jsonb not null default '{}'::jsonb,
  variables_precio jsonb not null default '{}'::jsonb,
  estado text not null default 'declarado' check (estado in ('borrador','declarado','verificado','publicado','archivado')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tpl_partner_caso_owner check (postulacion_id is not null or perfil_id is not null)
);
create index if not exists tpl_partner_casos_servicio_idx on public.tpl_partner_casos_practicos(servicio_codigo, estado, created_at desc);

alter table public.tpl_partner_servicios
  add column if not exists descripcion_comercial text,
  add column if not exists descripcion_tecnica text,
  add column if not exists unidad_cobro text,
  add column if not exists precio_desde bigint,
  add column if not exists cobra_traslado boolean not null default false,
  add column if not exists radio_incluido_km numeric,
  add column if not exists valor_km_extra bigint,
  add column if not exists incluye jsonb not null default '[]'::jsonb,
  add column if not exists no_incluye jsonb not null default '[]'::jsonb,
  add column if not exists proceso jsonb not null default '[]'::jsonb,
  add column if not exists condiciones_pago jsonb not null default '{}'::jsonb,
  add column if not exists garantia jsonb not null default '{}'::jsonb,
  add column if not exists plazo_referencial text,
  add column if not exists evidencia_requerida jsonb not null default '[]'::jsonb,
  add column if not exists nivel_verificacion text not null default 'declarado'
    check (nivel_verificacion in ('declarado','documental','trabajos_verificados','auditado'));

alter table public.tpl_partner_borradores enable row level security;
alter table public.tpl_partner_casos_practicos enable row level security;

revoke all on public.tpl_partner_borradores from anon, authenticated;
revoke all on public.tpl_partner_casos_practicos from anon, authenticated;

grant select, insert, update, delete on public.tpl_partner_casos_practicos to authenticated;

create or replace function public.tpl_guardar_borrador_partner_v1(
  p_token text,
  p_payload jsonb,
  p_paso integer default 1,
  p_campos_pendientes text[] default '{}'
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_token text := nullif(trim(coalesce(p_token,'')), '');
  v_hash text;
  v_mail text := lower(trim(coalesce(p_payload->>'correo','')));
  v_id uuid;
  v_raw_token text;
  v_score integer := greatest(0, least(100, coalesce((p_payload->>'puntaje_completitud_inicial')::int,0)));
begin
  if v_mail = '' or position('@' in v_mail) < 2 then raise exception 'CORREO_INVALIDO'; end if;
  if v_token is null then
    v_raw_token := encode(gen_random_bytes(32),'hex');
    v_hash := encode(digest(v_raw_token,'sha256'),'hex');
    insert into public.tpl_partner_borradores(correo,token_hash,paso_actual,porcentaje_completitud,payload,campos_pendientes)
    values(v_mail,v_hash,greatest(1,p_paso),v_score,coalesce(p_payload,'{}'),coalesce(p_campos_pendientes,'{}'))
    returning id into v_id;
  else
    v_hash := encode(digest(v_token,'sha256'),'hex');
    update public.tpl_partner_borradores
       set correo=v_mail,payload=coalesce(p_payload,'{}'),paso_actual=greatest(1,p_paso),
           porcentaje_completitud=v_score,campos_pendientes=coalesce(p_campos_pendientes,'{}'),
           ultimo_acceso_at=now(),updated_at=now(),expires_at=now()+interval '30 days'
     where token_hash=v_hash and estado='borrador' and expires_at>now()
     returning id into v_id;
    if v_id is null then raise exception 'BORRADOR_NO_DISPONIBLE'; end if;
    v_raw_token := v_token;
  end if;
  return jsonb_build_object('ok',true,'id',v_id,'token',v_raw_token,'porcentaje',v_score,'expires_at',now()+interval '30 days');
end $$;

grant execute on function public.tpl_guardar_borrador_partner_v1(text,jsonb,integer,text[]) to anon, authenticated;

create or replace function public.tpl_cargar_borrador_partner_v1(p_token text)
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((
    select jsonb_build_object('ok',true,'id',id,'payload',payload,'paso_actual',paso_actual,
      'porcentaje',porcentaje_completitud,'campos_pendientes',campos_pendientes,'expires_at',expires_at)
    from public.tpl_partner_borradores
    where token_hash=encode(digest(trim(p_token),'sha256'),'hex') and estado='borrador' and expires_at>now()
    limit 1
  ), jsonb_build_object('ok',false,'error','BORRADOR_NO_DISPONIBLE'));
$$;
grant execute on function public.tpl_cargar_borrador_partner_v1(text) to anon, authenticated;

create or replace function public.tpl_marcar_borrador_partner_enviado_v1(p_token text,p_postulacion_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.tpl_partner_borradores set estado='enviado',enviado_at=now(),updated_at=now(),
    payload=payload||jsonb_build_object('postulacion_id',p_postulacion_id)
  where token_hash=encode(digest(trim(p_token),'sha256'),'hex') and estado='borrador';
  return found;
end $$;
grant execute on function public.tpl_marcar_borrador_partner_enviado_v1(text,uuid) to anon, authenticated;

create or replace function public.tpl_casos_sugeridos_servicio_v1(p_tipo_servicio text)
returns jsonb language sql stable security definer set search_path=public as $$
select case
 when lower(coalesce(p_tipo_servicio,'')) like '%solar%' or lower(coalesce(p_tipo_servicio,'')) like '%eléct%' then jsonb_build_array(
   jsonb_build_object('codigo','familia_5_solar','titulo','Familia de cinco personas','escenario','Una familia de cinco personas vivirá todo el año en una casa rural. Explica qué sistema recomendarías, cómo dimensionas paneles, inversor y baterías, qué incluye, cómo cobras, qué anticipo pides y qué variables pueden cambiar el precio.'),
   jsonb_build_object('codigo','uso_fin_semana_solar','titulo','Casa de uso de fin de semana','escenario','Una pareja usará una casa pequeña solo fines de semana. Explica la solución mínima razonable y cómo evitarías sobredimensionar el sistema.')
 )
 when lower(coalesce(p_tipo_servicio,'')) like '%pozo%' or lower(coalesce(p_tipo_servicio,'')) like '%agua%' then jsonb_build_array(
   jsonb_build_object('codigo','familia_agua_rural','titulo','Agua para vivienda permanente','escenario','Una familia necesita agua para vivir permanentemente en una parcela sin red pública. Explica cómo evalúas la alternativa, etapas, cobro, profundidad o variables técnicas, anticipo, riesgos y garantía.'),
   jsonb_build_object('codigo','riego_pequeno','titulo','Agua para vivienda y riego','escenario','El cliente necesita agua para vivienda y un pequeño huerto. Explica cómo cambia el diseño y el presupuesto.')
 )
 when lower(coalesce(p_tipo_servicio,'')) like '%constru%' then jsonb_build_array(
   jsonb_build_object('codigo','casa_rural_100m2','titulo','Casa rural de 100 m²','escenario','Una familia quiere construir una casa de 100 m². Explica sistema constructivo, etapas, materiales, plazos, pagos, qué incluye, qué no incluye y cómo manejas cambios de obra.'),
   jsonb_build_object('codigo','terreno_pendiente','titulo','Construcción en terreno con pendiente','escenario','El terreno tiene pendiente y acceso rural. Explica cómo evalúas fundaciones, logística, sobrecostos y riesgos.')
 )
 else jsonb_build_array(
   jsonb_build_object('codigo','caso_cliente_tipico','titulo','Cliente típico','escenario','Describe un caso cotidiano de un cliente que necesita tu servicio: qué información pides, cómo lo resuelves, cuánto puede tardar, cómo cobras, qué anticipo solicitas y qué garantía entregas.'),
   jsonb_build_object('codigo','caso_presupuesto_acotado','titulo','Cliente con presupuesto acotado','escenario','Explica qué alternativas ofreces cuando el cliente tiene un presupuesto limitado y cómo aclaras las diferencias de calidad y alcance.')
 ) end;
$$;
grant execute on function public.tpl_casos_sugeridos_servicio_v1(text) to anon, authenticated;

create table if not exists public.tpl_comunicaciones_pendientes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  destinatario text not null,
  asunto text,
  plantilla text,
  variables jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente','procesando','enviado','error','cancelado')),
  intentos integer not null default 0,
  ultimo_error text,
  programado_at timestamptz not null default now(),
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tpl_comunicaciones_pendientes_estado_idx on public.tpl_comunicaciones_pendientes(estado, programado_at);
alter table public.tpl_comunicaciones_pendientes enable row level security;
revoke all on public.tpl_comunicaciones_pendientes from anon, authenticated;

create or replace function public.tpl_encolar_continuacion_partner_v1(p_token text,p_base_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v public.tpl_partner_borradores; v_url text;
begin
  select * into v from public.tpl_partner_borradores
   where token_hash=encode(digest(trim(p_token),'sha256'),'hex') and estado='borrador' and expires_at>now();
  if v.id is null then raise exception 'BORRADOR_NO_DISPONIBLE'; end if;
  v_url := regexp_replace(coalesce(p_base_url,''),'[?&]continuar=[^&]+','','g') || '?continuar=' || p_token;
  insert into public.tpl_comunicaciones_pendientes(tipo,destinatario,asunto,plantilla,variables)
  values('email',v.correo,'Continúa tu registro en TPL Pro Network','partner_continuar_registro',
    jsonb_build_object('borrador_id',v.id,'continuar_url',v_url,'porcentaje',v.porcentaje_completitud,'campos_pendientes',v.campos_pendientes,'expires_at',v.expires_at));
  return jsonb_build_object('ok',true,'encolado',true);
end $$;
grant execute on function public.tpl_encolar_continuacion_partner_v1(text,text) to anon, authenticated;

create or replace function public.tpl_guardar_caso_postulacion_partner_v1(
  p_postulacion_id uuid,
  p_upload_token uuid,
  p_caso jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_exists boolean; v_id uuid;
begin
  select exists(select 1 from public.tpl_partner_postulaciones where id=p_postulacion_id and upload_token=p_upload_token) into v_exists;
  if not v_exists then raise exception 'TOKEN_POSTULACION_INVALIDO'; end if;
  if length(trim(coalesce(p_caso->>'respuesta',''))) < 80 then raise exception 'RESPUESTA_CASO_MUY_CORTA'; end if;
  insert into public.tpl_partner_casos_practicos(postulacion_id,servicio_codigo,titulo,escenario,respuesta_libre,metadata)
  values(p_postulacion_id,coalesce(nullif(p_caso->>'codigo',''),'caso_cliente_tipico'),
    coalesce(nullif(p_caso->>'titulo',''),'Caso práctico declarado'),coalesce(p_caso->>'escenario',''),trim(p_caso->>'respuesta'),
    jsonb_build_object('origen','postulacion_publica')) returning id into v_id;
  update public.tpl_partner_postulaciones set metadata=metadata||jsonb_build_object('caso_practico_id',v_id),updated_at=now() where id=p_postulacion_id;
  return jsonb_build_object('ok',true,'id',v_id);
end $$;
grant execute on function public.tpl_guardar_caso_postulacion_partner_v1(uuid,uuid,jsonb) to anon, authenticated;
