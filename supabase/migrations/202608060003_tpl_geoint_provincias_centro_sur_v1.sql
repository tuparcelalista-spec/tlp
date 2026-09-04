-- ============================================================
-- TPL GEOINT · G1.2 BLOQUE 2 · PROVINCIAS CENTRO-SUR v1
-- Cobertura: Maule, Ñuble, Biobío y La Araucanía.
-- Requiere:
--   202608060001_tpl_geoint_core_activos_v1.sql
--   202608060002_tpl_geoint_regiones_centro_sur_v1.sql
-- No modifica Tasador, worker, CRM ni propiedades.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Catálogo provincial canónico.
create table if not exists public.tpl_geoint_provincias (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.tpl_geoint_regiones(id)
    on update cascade on delete restrict,
  pais_codigo text not null default 'CL',
  codigo text not null,
  codigo_ine text not null,
  nombre text not null,
  nombre_normalizado text not null,
  capital_nombre text not null,
  capital_lat numeric,
  capital_lng numeric,
  vocacion_principal text,
  vocaciones_secundarias jsonb not null default '[]'::jsonb,
  confianza smallint not null default 100
    check (confianza between 0 and 100),
  activo boolean not null default true,
  version_geoint text not null default 'geoint-v1-core',
  fuente_nombre text,
  fuente_url text,
  fuente_fecha date,
  aliases jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tpl_geoint_provincias_codigo_unique unique (codigo),
  constraint tpl_geoint_provincias_codigo_ine_unique
    unique (pais_codigo, codigo_ine),
  constraint tpl_geoint_provincias_region_nombre_unique
    unique (region_id, nombre_normalizado),
  constraint tpl_geoint_provincias_coordenadas_check check (
    (capital_lat is null and capital_lng is null)
    or
    (capital_lat between -90 and 90 and capital_lng between -180 and 180)
  )
);

create index if not exists tpl_geoint_provincias_region_activo_idx
  on public.tpl_geoint_provincias(region_id, activo, nombre_normalizado);

-- 2) Timestamp.
drop trigger if exists trg_tpl_geoint_provincias_updated_at
  on public.tpl_geoint_provincias;

create trigger trg_tpl_geoint_provincias_updated_at
before update on public.tpl_geoint_provincias
for each row execute function public.tpl_geoint_touch_updated_at_v1();

-- 3) Carga canónica de las 12 provincias.
with regiones as (
  select id, codigo
  from public.tpl_geoint_regiones
  where codigo in ('CL-ML','CL-NB','CL-BI','CL-AR')
),
datos (
  region_codigo, codigo, codigo_ine, nombre, nombre_normalizado,
  capital_nombre, capital_lat, capital_lng,
  vocacion_principal, vocaciones_secundarias, aliases, metadata
) as (
  values
    -- Maule
    ('CL-ML','CL-ML-TAL','071','Talca','talca',
      'Talca',-35.4264,-71.6554,
      'servicios_regionales',
      '["agroindustrial","educacion","comercio"]'::jsonb,
      '["Provincia de Talca","Talca"]'::jsonb,
      '{"orden_regional":1}'::jsonb),

    ('CL-ML','CL-ML-CAU','072','Cauquenes','cauquenes',
      'Cauquenes',-35.9671,-72.3225,
      'agroforestal',
      '["vitivinicola","rural","costera"]'::jsonb,
      '["Provincia de Cauquenes","Cauquenes"]'::jsonb,
      '{"orden_regional":2}'::jsonb),

    ('CL-ML','CL-ML-CUR','073','Curicó','curico',
      'Curicó',-34.9828,-71.2394,
      'agroindustrial',
      '["vitivinicola","logistica","comercio"]'::jsonb,
      '["Provincia de Curicó","Curico","Curicó"]'::jsonb,
      '{"orden_regional":3}'::jsonb),

    ('CL-ML','CL-ML-LIN','074','Linares','linares',
      'Linares',-35.8464,-71.5931,
      'agroindustrial',
      '["agricola","turismo_naturaleza","servicios"]'::jsonb,
      '["Provincia de Linares","Linares"]'::jsonb,
      '{"orden_regional":4}'::jsonb),

    -- Ñuble
    ('CL-NB','CL-NB-DIG','161','Diguillín','diguillin',
      'Bulnes',-36.7423,-72.2985,
      'agroindustrial',
      '["servicios_regionales","turismo","agricola"]'::jsonb,
      '["Provincia de Diguillín","Diguillin","Diguillín"]'::jsonb,
      '{"orden_regional":1}'::jsonb),

    ('CL-NB','CL-NB-ITA','162','Itata','itata',
      'Quirihue',-36.2816,-72.5410,
      'vitivinicola',
      '["rural","forestal","turismo_costero"]'::jsonb,
      '["Provincia de Itata","Itata"]'::jsonb,
      '{"orden_regional":2}'::jsonb),

    ('CL-NB','CL-NB-PUN','163','Punilla','punilla',
      'San Carlos',-36.4248,-71.9580,
      'agricola',
      '["agroindustrial","servicios","turismo_naturaleza"]'::jsonb,
      '["Provincia de Punilla","Punilla"]'::jsonb,
      '{"orden_regional":3}'::jsonb),

    -- Biobío
    ('CL-BI','CL-BI-CON','081','Concepción','concepcion',
      'Concepción',-36.8201,-73.0444,
      'metropolitano',
      '["portuario","industrial","servicios","educacion"]'::jsonb,
      '["Provincia de Concepción","Concepcion","Concepción"]'::jsonb,
      '{"orden_regional":1}'::jsonb),

    ('CL-BI','CL-BI-ARA','082','Arauco','arauco',
      'Lebu',-37.6083,-73.6536,
      'forestal',
      '["costero","portuario","turismo_naturaleza"]'::jsonb,
      '["Provincia de Arauco","Arauco"]'::jsonb,
      '{"orden_regional":2}'::jsonb),

    ('CL-BI','CL-BI-BIO','083','Biobío','biobio',
      'Los Ángeles',-37.4697,-72.3537,
      'agroindustrial',
      '["forestal","servicios_provinciales","logistica"]'::jsonb,
      '["Provincia de Biobío","Provincia del Biobío","Biobío","Biobio"]'::jsonb,
      '{"orden_regional":3}'::jsonb),

    -- La Araucanía
    ('CL-AR','CL-AR-CAU','091','Cautín','cautin',
      'Temuco',-38.7359,-72.5904,
      'servicios_regionales',
      '["agroindustrial","turismo","educacion","comercio"]'::jsonb,
      '["Provincia de Cautín","Cautin","Cautín"]'::jsonb,
      '{"orden_regional":1}'::jsonb),

    ('CL-AR','CL-AR-MAL','092','Malleco','malleco',
      'Angol',-37.7983,-72.7084,
      'agroforestal',
      '["agricola","forestal","turismo_naturaleza"]'::jsonb,
      '["Provincia de Malleco","Malleco"]'::jsonb,
      '{"orden_regional":2}'::jsonb)
)
insert into public.tpl_geoint_provincias (
  region_id, pais_codigo, codigo, codigo_ine,
  nombre, nombre_normalizado,
  capital_nombre, capital_lat, capital_lng,
  vocacion_principal, vocaciones_secundarias,
  confianza, activo, version_geoint,
  fuente_nombre, fuente_url, aliases, metadata
)
select
  r.id, 'CL', d.codigo, d.codigo_ine,
  d.nombre, d.nombre_normalizado,
  d.capital_nombre, d.capital_lat, d.capital_lng,
  d.vocacion_principal, d.vocaciones_secundarias,
  100, true, 'geoint-v1-core',
  'BCN SIIT / INE Chile',
  'https://www.bcn.cl/siit/nuestropais/nuestropais/div_pol-adm.htm',
  d.aliases, d.metadata
from datos d
join regiones r on r.codigo = d.region_codigo
on conflict (codigo) do update set
  region_id = excluded.region_id,
  codigo_ine = excluded.codigo_ine,
  nombre = excluded.nombre,
  nombre_normalizado = excluded.nombre_normalizado,
  capital_nombre = excluded.capital_nombre,
  capital_lat = excluded.capital_lat,
  capital_lng = excluded.capital_lng,
  vocacion_principal = excluded.vocacion_principal,
  vocaciones_secundarias = excluded.vocaciones_secundarias,
  confianza = excluded.confianza,
  activo = excluded.activo,
  version_geoint = excluded.version_geoint,
  fuente_nombre = excluded.fuente_nombre,
  fuente_url = excluded.fuente_url,
  aliases = excluded.aliases,
  metadata = public.tpl_geoint_provincias.metadata || excluded.metadata,
  updated_at = now();

-- 4) Resolver provincia tolerando acentos y aliases.
create or replace function public.tpl_geoint_provincia_por_texto_v1(
  p_provincia text,
  p_region text default null
)
returns public.tpl_geoint_provincias
language sql
stable
security definer
set search_path = public
as $$
  select p
  from public.tpl_geoint_provincias p
  join public.tpl_geoint_regiones r on r.id = p.region_id
  where p.activo = true
    and (
      p.nombre_normalizado =
        public.tpl_geoint_normalizar_texto_v1(p_provincia)
      or public.tpl_geoint_normalizar_texto_v1(p.nombre) =
        public.tpl_geoint_normalizar_texto_v1(p_provincia)
      or exists (
        select 1
        from jsonb_array_elements_text(p.aliases) a(alias)
        where public.tpl_geoint_normalizar_texto_v1(a.alias) =
          public.tpl_geoint_normalizar_texto_v1(p_provincia)
      )
    )
    and (
      nullif(public.tpl_geoint_normalizar_texto_v1(p_region),'') is null
      or r.nombre_normalizado =
        public.tpl_geoint_normalizar_texto_v1(p_region)
      or r.codigo = p_region
      or exists (
        select 1
        from jsonb_array_elements_text(r.aliases) a(alias)
        where public.tpl_geoint_normalizar_texto_v1(a.alias) =
          public.tpl_geoint_normalizar_texto_v1(p_region)
      )
    )
  order by p.nombre_normalizado
  limit 1;
$$;

-- 5) Auditoría del bloque.
create or replace function public.tpl_geoint_auditoria_provincias_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generado_at', now(),
    'provincias_activas', count(*) filter (where p.activo),
    'provincias_objetivo', count(*) filter (
      where p.activo and r.codigo in ('CL-ML','CL-NB','CL-BI','CL-AR')
    ),
    'con_capital', count(*) filter (
      where p.activo and nullif(p.capital_nombre,'') is not null
    ),
    'con_coordenadas_capital', count(*) filter (
      where p.activo
        and p.capital_lat is not null
        and p.capital_lng is not null
    ),
    'por_region', coalesce(
      jsonb_object_agg(resumen.region_codigo, resumen.cantidad),
      '{}'::jsonb
    )
  )
  from public.tpl_geoint_provincias p
  join public.tpl_geoint_regiones r on r.id = p.region_id
  cross join lateral (
    select r.codigo as region_codigo,
      count(*) over (partition by r.codigo) as cantidad
  ) resumen;
$$;

-- Reemplazar la auditoría anterior por una versión sin duplicación
-- de claves en jsonb_object_agg.
create or replace function public.tpl_geoint_auditoria_provincias_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with resumen as (
    select r.codigo as region_codigo, count(*)::int as cantidad
    from public.tpl_geoint_provincias p
    join public.tpl_geoint_regiones r on r.id = p.region_id
    where p.activo
      and r.codigo in ('CL-ML','CL-NB','CL-BI','CL-AR')
    group by r.codigo
  ),
  total as (
    select
      count(*) filter (where p.activo) as provincias_activas,
      count(*) filter (
        where p.activo and r.codigo in ('CL-ML','CL-NB','CL-BI','CL-AR')
      ) as provincias_objetivo,
      count(*) filter (
        where p.activo and nullif(p.capital_nombre,'') is not null
      ) as con_capital,
      count(*) filter (
        where p.activo
          and p.capital_lat is not null
          and p.capital_lng is not null
      ) as con_coordenadas_capital
    from public.tpl_geoint_provincias p
    join public.tpl_geoint_regiones r on r.id = p.region_id
  )
  select jsonb_build_object(
    'generado_at', now(),
    'provincias_activas', total.provincias_activas,
    'provincias_objetivo', total.provincias_objetivo,
    'con_capital', total.con_capital,
    'con_coordenadas_capital', total.con_coordenadas_capital,
    'por_region', coalesce(
      (select jsonb_object_agg(region_codigo, cantidad) from resumen),
      '{}'::jsonb
    )
  )
  from total;
$$;

-- 6) Seguridad.
alter table public.tpl_geoint_provincias enable row level security;

revoke all on public.tpl_geoint_provincias from anon, authenticated;
grant select on public.tpl_geoint_provincias to authenticated;
grant all on public.tpl_geoint_provincias to service_role;

revoke all on function public.tpl_geoint_provincia_por_texto_v1(text,text)
  from public;
grant execute on function public.tpl_geoint_provincia_por_texto_v1(text,text)
  to authenticated, service_role;

revoke all on function public.tpl_geoint_auditoria_provincias_v1()
  from public;
grant execute on function public.tpl_geoint_auditoria_provincias_v1()
  to authenticated, service_role;

-- 7) Registrar cobertura.
insert into public.tpl_geoint_versiones(
  codigo,nombre,estado,cobertura,fuentes,notas
)
values(
  'geoint-v1-provincias-centro-sur',
  'TPL GEOINT v1 · Provincias Centro-Sur',
  'validacion',
  '{
    "regiones":["Maule","Ñuble","Biobío","La Araucanía"],
    "provincias":12,
    "bloque":"G1.2-2"
  }'::jsonb,
  '[{"nombre":"BCN SIIT"},{"nombre":"INE Chile"}]'::jsonb,
  'Catálogo provincial canónico. Las vocaciones son metadatos TPL descriptivos y no alteran todavía el Tasador.'
)
on conflict(codigo) do update set
  nombre = excluded.nombre,
  estado = excluded.estado,
  cobertura = excluded.cobertura,
  fuentes = excluded.fuentes,
  notas = excluded.notas;
