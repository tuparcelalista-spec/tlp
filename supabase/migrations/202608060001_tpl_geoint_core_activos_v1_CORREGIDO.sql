-- ============================================================
-- TPL GEOINT · G1.1 CORE MULTIACTIVO v1
-- Cobertura prevista: Biobío, Ñuble, Maule y La Araucanía.
-- No modifica fórmulas del Tasador ni elimina tablas existentes.
-- Compatible con parcela/campo, parcela con casa y casa urbana.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Versionado explícito de GEOINT.
create table if not exists public.tpl_geoint_versiones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  estado text not null default 'borrador'
    check (estado in ('borrador','validacion','activa','retirada')),
  cobertura jsonb not null default '{}'::jsonb,
  fuentes jsonb not null default '[]'::jsonb,
  notas text,
  activada_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2) Referencias geográficas reutilizables.
-- Una referencia puede ser centro comunal, hub económico,
-- destino turístico u otra referencia secundaria.
create table if not exists public.tpl_geoint_referencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo text not null check (tipo in (
    'centro_comunal',
    'hub_metropolitano',
    'hub_regional',
    'hub_provincial',
    'hub_agroindustrial',
    'hub_portuario',
    'hub_turistico',
    'destino_turistico',
    'referencia_secundaria'
  )),
  pais_codigo text not null default 'CL',
  region text not null,
  provincia text,
  comuna text,
  localidad text,
  lat numeric not null,
  lng numeric not null,
  prioridad smallint not null default 50 check (prioridad between 0 and 100),
  nivel_turismo text not null default 'sin_clasificar'
    check (nivel_turismo in (
      'sin_clasificar','sin_influencia','local','regional',
      'nacional','internacional'
    )),
  activo boolean not null default true,
  fuente_nombre text,
  fuente_url text,
  fuente_fecha date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_geoint_referencias_region_tipo_idx
  on public.tpl_geoint_referencias(region,tipo,activo);
create index if not exists tpl_geoint_referencias_comuna_idx
  on public.tpl_geoint_referencias(lower(comuna)) where comuna is not null;

-- 3) Perfil territorial canónico por comuna/localidad.
-- Define qué centro comunal, hub y destino corresponde usar.
create table if not exists public.tpl_geoint_perfiles (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  provincia text,
  comuna text not null,
  localidad text,
  comuna_normalizada text not null,
  localidad_normalizada text not null default '',
  centro_comunal_id uuid not null
    references public.tpl_geoint_referencias(id),
  hub_principal_id uuid
    references public.tpl_geoint_referencias(id),
  destino_turistico_id uuid
    references public.tpl_geoint_referencias(id),
  hub_secundario_id uuid
    references public.tpl_geoint_referencias(id),
  turismo_reemplaza_hub boolean not null default false,
  aplica_a jsonb not null default '["parcela","campo","sitio_urbano","casa","casa_sola","casa_con_terreno","parcela_con_casa","proyecto_inmobiliario"]'::jsonb,
  activo boolean not null default true,
  geoint_version text not null default 'geoint-v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(comuna_normalizada,localidad_normalizada)
);

create index if not exists tpl_geoint_perfiles_region_idx
  on public.tpl_geoint_perfiles(region,activo);

-- 4) Contexto GEOINT calculado por propiedad.
-- Es independiente del tipo de activo: describe dónde está.
create table if not exists public.tpl_geoint_propiedad_contexto (
  propiedad_id uuid primary key
    references public.tpl_propiedades(id) on delete cascade,
  perfil_id uuid references public.tpl_geoint_perfiles(id),
  tipo_activo text not null,
  valoracion_suelo_aplica boolean not null default true,
  valoracion_vivienda_aplica boolean not null default false,
  contexto_urbano boolean not null default false,
  centro_comunal_id uuid references public.tpl_geoint_referencias(id),
  hub_principal_id uuid references public.tpl_geoint_referencias(id),
  destino_turistico_id uuid references public.tpl_geoint_referencias(id),
  hub_secundario_id uuid references public.tpl_geoint_referencias(id),
  distancia_centro_comunal_km numeric,
  distancia_hub_principal_km numeric,
  distancia_destino_turistico_km numeric,
  distancia_hub_secundario_km numeric,
  hub_efectivo_id uuid references public.tpl_geoint_referencias(id),
  hub_efectivo_tipo text,
  hub_efectivo_nombre text,
  distancia_hub_efectivo_km numeric,
  nivel_turismo text not null default 'sin_clasificar',
  turismo_reemplaza_hub boolean not null default false,
  confianza numeric(5,2) not null default 0 check (confianza between 0 and 100),
  origen text not null default 'geoint_calculado',
  resultado jsonb not null default '{}'::jsonb,
  geoint_version text not null default 'geoint-v1',
  calculado_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_geoint_contexto_hub_idx
  on public.tpl_geoint_propiedad_contexto(hub_efectivo_id);
create index if not exists tpl_geoint_contexto_tipo_idx
  on public.tpl_geoint_propiedad_contexto(tipo_activo,contexto_urbano);

-- 5) Normalización compartida.
create or replace function public.tpl_geoint_normalizar_texto_v1(p_text text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    translate(lower(coalesce(p_text,'')),
      'áéíóúüñÁÉÍÓÚÜÑ',
      'aeiouunAEIOUUN'),
    '[^a-z0-9]+',' ','g'));
$$;

-- 6) Distancia geodésica referencial. No equivale a distancia vial.
create or replace function public.tpl_geoint_haversine_km_v1(
  p_lat1 numeric,p_lng1 numeric,p_lat2 numeric,p_lng2 numeric
)
returns numeric
language sql
immutable
as $$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians((p_lat2-p_lat1)::double precision)/2),2) +
    cos(radians(p_lat1::double precision)) *
    cos(radians(p_lat2::double precision)) *
    power(sin(radians((p_lng2-p_lng1)::double precision)/2),2)
  )))::numeric,2);
$$;

-- 7) Clasificación multiactivo: GEOINT describe el entorno,
-- mientras Valuation decide qué componentes monetizar.
create or replace function public.tpl_geoint_clasificar_activo_v1(p_tipo text)
returns jsonb
language sql
immutable
as $$
  select case lower(coalesce(p_tipo,'parcela'))
    when 'parcela' then jsonb_build_object(
      'tipo','parcela','suelo',true,'vivienda',false,'urbano',false)
    when 'campo' then jsonb_build_object(
      'tipo','campo','suelo',true,'vivienda',false,'urbano',false)
    when 'sitio_urbano' then jsonb_build_object(
      'tipo','sitio_urbano','suelo',true,'vivienda',false,'urbano',true)
    when 'casa' then jsonb_build_object(
      'tipo','casa','suelo',true,'vivienda',true,'urbano',true)
    when 'casa_sola' then jsonb_build_object(
      'tipo','casa_sola','suelo',true,'vivienda',true,'urbano',true)
    when 'casa_con_terreno' then jsonb_build_object(
      'tipo','casa_con_terreno','suelo',true,'vivienda',true,'urbano',false)
    when 'parcela_con_casa' then jsonb_build_object(
      'tipo','parcela_con_casa','suelo',true,'vivienda',true,'urbano',false)
    when 'proyecto_inmobiliario' then jsonb_build_object(
      'tipo','proyecto_inmobiliario','suelo',true,'vivienda',false,'urbano',false)
    else jsonb_build_object(
      'tipo',lower(coalesce(p_tipo,'parcela')),
      'suelo',true,'vivienda',false,'urbano',false)
  end;
$$;

-- 8) Resolver perfil por localidad primero y luego por comuna.
create or replace function public.tpl_geoint_buscar_perfil_v1(
  p_comuna text,
  p_localidad text default null
)
returns public.tpl_geoint_perfiles
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v public.tpl_geoint_perfiles%rowtype;
  v_comuna text := public.tpl_geoint_normalizar_texto_v1(p_comuna);
  v_localidad text := public.tpl_geoint_normalizar_texto_v1(p_localidad);
begin
  if v_localidad <> '' then
    select * into v
    from public.tpl_geoint_perfiles
    where activo=true
      and comuna_normalizada=v_comuna
      and localidad_normalizada=v_localidad
    limit 1;
    if found then return v; end if;
  end if;

  select * into v
  from public.tpl_geoint_perfiles
  where activo=true
    and comuna_normalizada=v_comuna
    and localidad_normalizada=''
  limit 1;

  return v;
end;
$$;

-- 9) Resolver y persistir contexto GEOINT de una propiedad.
create or replace function public.tpl_geoint_resolver_propiedad_v1(
  p_propiedad_id uuid,
  p_forzar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p public.tpl_propiedades%rowtype;
  perfil public.tpl_geoint_perfiles%rowtype;
  centro public.tpl_geoint_referencias%rowtype;
  hub public.tpl_geoint_referencias%rowtype;
  destino public.tpl_geoint_referencias%rowtype;
  secundario public.tpl_geoint_referencias%rowtype;
  clasificacion jsonb;
  d_centro numeric;
  d_hub numeric;
  d_destino numeric;
  d_secundario numeric;
  hub_efectivo public.tpl_geoint_referencias%rowtype;
  d_hub_efectivo numeric;
  confianza numeric := 0;
  v_resultado jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'NO_AUTORIZADO';
  end if;

  select * into p from public.tpl_propiedades
  where id=p_propiedad_id;
  if not found then raise exception 'PROPIEDAD_NO_EXISTE'; end if;

  if p.lat is null or p.lng is null then
    return jsonb_build_object('ok',false,'error','COORDENADAS_INCOMPLETAS');
  end if;

  perfil := public.tpl_geoint_buscar_perfil_v1(
    p.comuna,
    coalesce(nullif(p.sector,''), nullif(p.metadata->>'localidad',''), nullif(p.metadata->>'sector',''))
  );
  if perfil.id is null then
    return jsonb_build_object(
      'ok',false,'error','PERFIL_GEOINT_NO_CONFIGURADO',
      'comuna',p.comuna,
      'localidad',coalesce(nullif(p.sector,''), nullif(p.metadata->>'localidad',''), nullif(p.metadata->>'sector','')));
  end if;

  select * into centro from public.tpl_geoint_referencias
    where id=perfil.centro_comunal_id and activo=true;
  if centro.id is null then
    return jsonb_build_object('ok',false,'error','CENTRO_COMUNAL_NO_CONFIGURADO');
  end if;

  if perfil.hub_principal_id is not null then
    select * into hub from public.tpl_geoint_referencias
      where id=perfil.hub_principal_id and activo=true;
  end if;
  if perfil.destino_turistico_id is not null then
    select * into destino from public.tpl_geoint_referencias
      where id=perfil.destino_turistico_id and activo=true;
  end if;
  if perfil.hub_secundario_id is not null then
    select * into secundario from public.tpl_geoint_referencias
      where id=perfil.hub_secundario_id and activo=true;
  end if;

  d_centro := public.tpl_geoint_haversine_km_v1(p.lat,p.lng,centro.lat,centro.lng);
  if hub.id is not null then
    d_hub := public.tpl_geoint_haversine_km_v1(p.lat,p.lng,hub.lat,hub.lng);
  end if;
  if destino.id is not null then
    d_destino := public.tpl_geoint_haversine_km_v1(p.lat,p.lng,destino.lat,destino.lng);
  end if;
  if secundario.id is not null then
    d_secundario := public.tpl_geoint_haversine_km_v1(p.lat,p.lng,secundario.lat,secundario.lng);
  end if;

  -- Turismo nacional/internacional puede reemplazar al hub económico.
  if perfil.turismo_reemplaza_hub and destino.id is not null then
    hub_efectivo := destino;
    d_hub_efectivo := d_destino;
  else
    hub_efectivo := hub;
    d_hub_efectivo := d_hub;
  end if;

  clasificacion := public.tpl_geoint_clasificar_activo_v1(p.tipo);
  confianza := case
    when centro.id is not null and hub_efectivo.id is not null then 100
    when centro.id is not null then 70
    else 0
  end;

  v_resultado := jsonb_build_object(
    'ok',true,
    'propiedad_id',p.id,
    'tipo_activo',clasificacion->>'tipo',
    'valoracion_suelo_aplica',(clasificacion->>'suelo')::boolean,
    'valoracion_vivienda_aplica',(clasificacion->>'vivienda')::boolean,
    'contexto_urbano',(clasificacion->>'urbano')::boolean,
    'centro_comunal',jsonb_build_object(
      'id',centro.id,'nombre',centro.nombre,'tipo',centro.tipo,
      'distance_km',d_centro),
    'hub_principal',case when hub.id is null then null else jsonb_build_object(
      'id',hub.id,'nombre',hub.nombre,'tipo',hub.tipo,
      'distance_km',d_hub) end,
    'destino_turistico',case when destino.id is null then null else jsonb_build_object(
      'id',destino.id,'nombre',destino.nombre,'tipo',destino.tipo,
      'nivel',destino.nivel_turismo,'distance_km',d_destino) end,
    'hub_efectivo',case when hub_efectivo.id is null then null else jsonb_build_object(
      'id',hub_efectivo.id,'nombre',hub_efectivo.nombre,
      'tipo',hub_efectivo.tipo,'distance_km',d_hub_efectivo) end,
    'confianza',confianza,
    'geoint_version',perfil.geoint_version,
    'distance_method','haversine_referencial'
  );

  insert into public.tpl_geoint_propiedad_contexto(
    propiedad_id,perfil_id,tipo_activo,
    valoracion_suelo_aplica,valoracion_vivienda_aplica,contexto_urbano,
    centro_comunal_id,hub_principal_id,destino_turistico_id,hub_secundario_id,
    distancia_centro_comunal_km,distancia_hub_principal_km,
    distancia_destino_turistico_km,distancia_hub_secundario_km,
    hub_efectivo_id,hub_efectivo_tipo,hub_efectivo_nombre,
    distancia_hub_efectivo_km,nivel_turismo,turismo_reemplaza_hub,
    confianza,origen,resultado,geoint_version,calculado_at,updated_at
  ) values (
    p.id,perfil.id,clasificacion->>'tipo',
    (clasificacion->>'suelo')::boolean,
    (clasificacion->>'vivienda')::boolean,
    (clasificacion->>'urbano')::boolean,
    centro.id,hub.id,destino.id,secundario.id,
    d_centro,d_hub,d_destino,d_secundario,
    hub_efectivo.id,hub_efectivo.tipo,hub_efectivo.nombre,
    d_hub_efectivo,coalesce(destino.nivel_turismo,'sin_clasificar'),
    perfil.turismo_reemplaza_hub,
    confianza,'geoint_calculado',v_resultado,perfil.geoint_version,now(),now()
  )
  on conflict(propiedad_id) do update set
    perfil_id=excluded.perfil_id,
    tipo_activo=excluded.tipo_activo,
    valoracion_suelo_aplica=excluded.valoracion_suelo_aplica,
    valoracion_vivienda_aplica=excluded.valoracion_vivienda_aplica,
    contexto_urbano=excluded.contexto_urbano,
    centro_comunal_id=excluded.centro_comunal_id,
    hub_principal_id=excluded.hub_principal_id,
    destino_turistico_id=excluded.destino_turistico_id,
    hub_secundario_id=excluded.hub_secundario_id,
    distancia_centro_comunal_km=excluded.distancia_centro_comunal_km,
    distancia_hub_principal_km=excluded.distancia_hub_principal_km,
    distancia_destino_turistico_km=excluded.distancia_destino_turistico_km,
    distancia_hub_secundario_km=excluded.distancia_hub_secundario_km,
    hub_efectivo_id=excluded.hub_efectivo_id,
    hub_efectivo_tipo=excluded.hub_efectivo_tipo,
    hub_efectivo_nombre=excluded.hub_efectivo_nombre,
    distancia_hub_efectivo_km=excluded.distancia_hub_efectivo_km,
    nivel_turismo=excluded.nivel_turismo,
    turismo_reemplaza_hub=excluded.turismo_reemplaza_hub,
    confianza=excluded.confianza,
    origen=excluded.origen,
    resultado=excluded.resultado,
    geoint_version=excluded.geoint_version,
    calculado_at=excluded.calculado_at,
    updated_at=now();

  return v_resultado;
end;
$$;

-- 10) Auditoría de cobertura; aún no recalcula ni toca tasaciones.
create or replace function public.tpl_geoint_auditoria_cobertura_v1()
returns jsonb
language sql
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'generado_at',now(),
    'propiedades',count(*),
    'parcelas_campos',count(*) filter(where tipo in ('parcela','campo','sitio_urbano','proyecto_inmobiliario')),
    'activos_con_vivienda',count(*) filter(where tipo in ('casa','casa_sola','casa_con_terreno','parcela_con_casa')),
    'casas_urbanas',count(*) filter(where tipo in ('casa','casa_sola')),
    'con_coordenadas',count(*) filter(where lat is not null and lng is not null),
    'con_perfil_geoint',count(*) filter(where exists(
      select 1 from public.tpl_geoint_perfiles g
      where g.activo=true
        and g.comuna_normalizada=public.tpl_geoint_normalizar_texto_v1(tpl_propiedades.comuna)
        and g.localidad_normalizada in ('',public.tpl_geoint_normalizar_texto_v1(coalesce(nullif(tpl_propiedades.sector,''), nullif(tpl_propiedades.metadata->>'localidad',''), nullif(tpl_propiedades.metadata->>'sector',''))))
    )),
    'con_contexto_calculado',count(*) filter(where exists(
      select 1 from public.tpl_geoint_propiedad_contexto c
      where c.propiedad_id=tpl_propiedades.id
    )),
    'sin_perfil_geoint',count(*) filter(where not exists(
      select 1 from public.tpl_geoint_perfiles g
      where g.activo=true
        and g.comuna_normalizada=public.tpl_geoint_normalizar_texto_v1(tpl_propiedades.comuna)
        and g.localidad_normalizada in ('',public.tpl_geoint_normalizar_texto_v1(coalesce(nullif(tpl_propiedades.sector,''), nullif(tpl_propiedades.metadata->>'localidad',''), nullif(tpl_propiedades.metadata->>'sector',''))))
    ))
  )
  from public.tpl_propiedades
  where coalesce(estado,'') in ('publicada','activa','disponible');
$$;

-- 11) Seguridad: escritura solo servidor. Lectura autenticada de contexto.
alter table public.tpl_geoint_versiones enable row level security;
alter table public.tpl_geoint_referencias enable row level security;
alter table public.tpl_geoint_perfiles enable row level security;
alter table public.tpl_geoint_propiedad_contexto enable row level security;

revoke all on public.tpl_geoint_versiones from anon,authenticated;
revoke all on public.tpl_geoint_referencias from anon,authenticated;
revoke all on public.tpl_geoint_perfiles from anon,authenticated;
revoke all on public.tpl_geoint_propiedad_contexto from anon,authenticated;

grant all on public.tpl_geoint_versiones to service_role;
grant all on public.tpl_geoint_referencias to service_role;
grant all on public.tpl_geoint_perfiles to service_role;
grant all on public.tpl_geoint_propiedad_contexto to service_role;
grant select on public.tpl_geoint_propiedad_contexto to authenticated;

revoke all on function public.tpl_geoint_resolver_propiedad_v1(uuid,boolean) from public;
grant execute on function public.tpl_geoint_resolver_propiedad_v1(uuid,boolean) to service_role;
grant execute on function public.tpl_geoint_auditoria_cobertura_v1() to authenticated;

insert into public.tpl_geoint_versiones(codigo,nombre,estado,cobertura,notas)
values(
  'geoint-v1-core',
  'TPL GEOINT Core multiactivo v1',
  'validacion',
  '{"regiones_objetivo":["Biobío","Ñuble","Maule","La Araucanía"],"activos":["parcela","campo","sitio_urbano","parcela_con_casa","casa_con_terreno","casa","casa_sola"]}'::jsonb,
  'Fundación no destructiva. No modifica todavía el worker ni las fórmulas de tasación.'
)
on conflict(codigo) do update set
  nombre=excluded.nombre,
  estado=excluded.estado,
  cobertura=excluded.cobertura,
  notas=excluded.notas;