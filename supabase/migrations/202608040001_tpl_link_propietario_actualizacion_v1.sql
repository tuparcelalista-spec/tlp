-- Mi Parcela TPL: enlaces seguros sin contraseña para propietarios.
create extension if not exists pgcrypto;

create table if not exists public.tpl_links_propietario (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  token_hash text not null unique,
  estado text not null default 'activo' check (estado in ('activo','revocado','vencido')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  usos integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists tpl_links_propietario_propiedad_idx
  on public.tpl_links_propietario(propiedad_id, estado, expires_at desc);

create table if not exists public.tpl_actualizaciones_propietario (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  link_id uuid references public.tpl_links_propietario(id) on delete set null,
  datos_anteriores jsonb not null default '{}'::jsonb,
  datos_nuevos jsonb not null default '{}'::jsonb,
  campos_modificados text[] not null default '{}',
  fotos_pendientes jsonb not null default '[]'::jsonb,
  origen text not null default 'link_propietario',
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.tpl_links_propietario enable row level security;
alter table public.tpl_actualizaciones_propietario enable row level security;
revoke all on public.tpl_links_propietario from anon, authenticated;
revoke all on public.tpl_actualizaciones_propietario from anon, authenticated;

create or replace function public.tpl_crm_generar_link_propietario_v1(
  p_propiedad_id uuid,
  p_dias integer default 30
) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare
  v_token text;
  v_link public.tpl_links_propietario;
begin
  if not public.es_administrador_activo() then raise exception 'No autorizado'; end if;
  if not exists(select 1 from public.tpl_propiedades where id=p_propiedad_id) then raise exception 'Propiedad inexistente'; end if;
  update public.tpl_links_propietario set estado='revocado'
   where propiedad_id=p_propiedad_id and estado='activo';
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.tpl_links_propietario(propiedad_id,token_hash,expires_at,created_by)
  values(p_propiedad_id,encode(digest(v_token,'sha256'),'hex'),now() + make_interval(days=>greatest(1,least(coalesce(p_dias,30),90))),auth.uid())
  returning * into v_link;
  return jsonb_build_object('ok',true,'token',v_token,'link_id',v_link.id,'expires_at',v_link.expires_at,'propiedad_id',p_propiedad_id);
end $$;

create or replace function public.tpl_propietario_resumen_por_token_v1(p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_link public.tpl_links_propietario; v_prop public.tpl_propiedades%rowtype; v_tas jsonb;
begin
  select * into v_link from public.tpl_links_propietario
   where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') and estado='activo' and expires_at>now();
  if v_link.id is null then return jsonb_build_object('ok',false,'error','Enlace inválido o vencido'); end if;
  update public.tpl_links_propietario set last_used_at=now(),usos=usos+1 where id=v_link.id;
  select * into v_prop from public.tpl_propiedades where id=v_link.propiedad_id;
  select jsonb_build_object('valor_tpl_total',t.valor_tpl_total,'valor_tpl_m2',t.valor_tpl_m2,'clasificacion',t.clasificacion,'resultado',t.resultado,'created_at',t.created_at)
    into v_tas from public.tpl_tasaciones t where t.propiedad_id=v_prop.id order by t.created_at desc limit 1;
  return jsonb_build_object('ok',true,'expires_at',v_link.expires_at,'propiedad',jsonb_build_object(
    'id',v_prop.id,'codigo',v_prop.codigo,'titulo',v_prop.titulo,'descripcion',v_prop.descripcion,'region',v_prop.region,'comuna',v_prop.comuna,'sector',v_prop.sector,
    'superficie_m2',v_prop.superficie_m2,'precio_publicado',v_prop.precio_publicado,'estado',v_prop.estado,'agua',v_prop.agua,'electricidad',v_prop.electricidad,
    'acceso',v_prop.acceso,'topografia',v_prop.topografia,'rol_situacion',v_prop.rol_situacion,'cierre_perimetral',v_prop.cierre_perimetral,'porton',v_prop.porton,
    'metadata',v_prop.metadata,'updated_at',v_prop.updated_at),'tasacion',coalesce(v_tas,'{}'::jsonb));
end $$;

create or replace function public.tpl_propietario_actualizar_por_token_v1(p_token text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_link public.tpl_links_propietario; v_old public.tpl_propiedades%rowtype; v_new public.tpl_propiedades%rowtype; v_clean jsonb; v_fields text[]:=array[]::text[];
begin
  select * into v_link from public.tpl_links_propietario
   where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') and estado='activo' and expires_at>now() for update;
  if v_link.id is null then return jsonb_build_object('ok',false,'error','Enlace inválido o vencido'); end if;
  select * into v_old from public.tpl_propiedades where id=v_link.propiedad_id for update;
  v_clean := jsonb_strip_nulls(jsonb_build_object(
    'titulo',nullif(trim(p_payload->>'titulo'),''),'descripcion',nullif(trim(p_payload->>'descripcion'),''),
    'precio_publicado',case when (p_payload->>'precio_publicado')~'^\d+$' then (p_payload->>'precio_publicado')::bigint else null end,
    'superficie_m2',case when (p_payload->>'superficie_m2')~'^\d+(\.\d+)?$' then (p_payload->>'superficie_m2')::numeric else null end,
    'agua',nullif(trim(p_payload->>'agua'),''),'electricidad',nullif(trim(p_payload->>'electricidad'),''),'acceso',nullif(trim(p_payload->>'acceso'),''),
    'topografia',nullif(trim(p_payload->>'topografia'),''),'rol_situacion',nullif(trim(p_payload->>'rol_situacion'),''),
    'cierre_perimetral',nullif(trim(p_payload->>'cierre_perimetral'),''),'porton',nullif(trim(p_payload->>'porton'),'')));
  select coalesce(array_agg(key),'{}') into v_fields from jsonb_object_keys(v_clean) key;
  update public.tpl_propiedades set
    titulo=coalesce(v_clean->>'titulo',titulo), descripcion=coalesce(v_clean->>'descripcion',descripcion),
    precio_publicado=coalesce((v_clean->>'precio_publicado')::bigint,precio_publicado), superficie_m2=coalesce((v_clean->>'superficie_m2')::numeric,superficie_m2),
    agua=coalesce(v_clean->>'agua',agua), electricidad=coalesce(v_clean->>'electricidad',electricidad), acceso=coalesce(v_clean->>'acceso',acceso),
    topografia=coalesce(v_clean->>'topografia',topografia), rol_situacion=coalesce(v_clean->>'rol_situacion',rol_situacion),
    cierre_perimetral=coalesce(v_clean->>'cierre_perimetral',cierre_perimetral), porton=coalesce(v_clean->>'porton',porton),
    metadata=metadata || jsonb_build_object('propietario_contacto',coalesce(p_payload->'contacto','{}'::jsonb),'fotos_revision_pendiente',coalesce(p_payload->'fotos','[]'::jsonb),'ultima_actualizacion_propietario',now())
   where id=v_link.propiedad_id returning * into v_new;
  insert into public.tpl_actualizaciones_propietario(propiedad_id,link_id,datos_anteriores,datos_nuevos,campos_modificados,fotos_pendientes)
  values(v_new.id,v_link.id,to_jsonb(v_old),v_clean,v_fields,coalesce(p_payload->'fotos','[]'::jsonb));
  return jsonb_build_object('ok',true,'propiedad_id',v_new.id,'codigo',v_new.codigo,'campos_modificados',v_fields,'fotos_pendientes_revision',jsonb_array_length(coalesce(p_payload->'fotos','[]'::jsonb)));
end $$;

grant execute on function public.tpl_crm_generar_link_propietario_v1(uuid,integer) to authenticated;
grant execute on function public.tpl_propietario_resumen_por_token_v1(text) to anon,authenticated;
grant execute on function public.tpl_propietario_actualizar_por_token_v1(text,jsonb) to anon,authenticated;
