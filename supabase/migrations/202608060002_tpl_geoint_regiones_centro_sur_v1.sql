-- ============================================================
-- TPL GEOINT · G1.2 BLOQUE 1 · REGIONES CENTRO-SUR v1
-- Cobertura: Maule, Ñuble, Biobío y La Araucanía.
-- Migración pequeña, aditiva e independiente del Tasador.
-- Requiere G1.1 GEOINT Core instalado.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Catálogo regional canónico.
create table if not exists public.tpl_geoint_regiones (
  id uuid primary key default gen_random_uuid(),
  pais_codigo text not null default 'CL',
  codigo text not null,
  codigo_ine text not null,
  nombre text not null,
  nombre_normalizado text not null,
  capital_nombre text not null,
  capital_lat numeric,
  capital_lng numeric,
  macrozona text not null default 'centro_sur'
    check (macrozona in ('norte','centro','centro_sur','sur','austral')),
  orden_geografico smallint,
  activo boolean not null default true,
  version_geoint text not null default 'geoint-v1-core',
  fuente_nombre text,
  fuente_url text,
  fuente_fecha date,
  aliases jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tpl_geoint_regiones_codigo_unique unique (codigo),
  constraint tpl_geoint_regiones_codigo_ine_unique unique (pais_codigo,codigo_ine),
  constraint tpl_geoint_regiones_nombre_normalizado_unique unique (pais_codigo,nombre_normalizado),
  constraint tpl_geoint_regiones_coordenadas_check check (
    (capital_lat is null and capital_lng is null)
    or
    (capital_lat between -90 and 90 and capital_lng between -180 and 180)
  )
);

create index if not exists tpl_geoint_regiones_activo_orden_idx
  on public.tpl_geoint_regiones(activo,orden_geografico);

-- 2) Timestamp consistente sin depender de triggers globales.
create or replace function public.tpl_geoint_touch_updated_at_v1()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tpl_geoint_regiones_updated_at
  on public.tpl_geoint_regiones;
create trigger trg_tpl_geoint_regiones_updated_at
before update on public.tpl_geoint_regiones
for each row execute function public.tpl_geoint_touch_updated_at_v1();

-- 3) Carga canónica inicial.
-- Códigos regionales INE/CUT: Maule 07, Biobío 08,
-- La Araucanía 09 y Ñuble 16.
insert into public.tpl_geoint_regiones (
  pais_codigo,
  codigo,
  codigo_ine,
  nombre,
  nombre_normalizado,
  capital_nombre,
  capital_lat,
  capital_lng,
  macrozona,
  orden_geografico,
  activo,
  version_geoint,
  fuente_nombre,
  fuente_url,
  aliases,
  metadata
)
values
  (
    'CL','CL-ML','07','Región del Maule','maule','Talca',
    -35.4264,-71.6554,'centro_sur',1,true,'geoint-v1-core',
    'INE Chile / BCN SIIT',
    'https://regiones.ine.gob.cl/',
    '["Maule","Región del Maule","VII Región"]'::jsonb,
    '{"capital_tipo":"regional","cobertura_g1":true}'::jsonb
  ),
  (
    'CL','CL-NB','16','Región de Ñuble','nuble','Chillán',
    -36.6066,-72.1034,'centro_sur',2,true,'geoint-v1-core',
    'INE Chile / BCN SIIT',
    'https://regiones.ine.gob.cl/',
    '["Ñuble","Nuble","Región de Ñuble","Región del Ñuble","XVI Región"]'::jsonb,
    '{"capital_tipo":"regional","cobertura_g1":true}'::jsonb
  ),
  (
    'CL','CL-BI','08','Región del Biobío','biobio','Concepción',
    -36.8201,-73.0444,'centro_sur',3,true,'geoint-v1-core',
    'INE Chile / BCN SIIT',
    'https://regiones.ine.gob.cl/',
    '["Biobío","Biobio","Bío-Bío","Región del Biobío","VIII Región"]'::jsonb,
    '{"capital_tipo":"regional","cobertura_g1":true}'::jsonb
  ),
  (
    'CL','CL-AR','09','Región de La Araucanía','la araucania','Temuco',
    -38.7359,-72.5904,'centro_sur',4,true,'geoint-v1-core',
    'INE Chile / BCN SIIT',
    'https://regiones.ine.gob.cl/',
    '["La Araucanía","Araucanía","La Araucania","Araucania","Región de La Araucanía","IX Región"]'::jsonb,
    '{"capital_tipo":"regional","cobertura_g1":true}'::jsonb
  )
on conflict (codigo) do update set
  codigo_ine = excluded.codigo_ine,
  nombre = excluded.nombre,
  nombre_normalizado = excluded.nombre_normalizado,
  capital_nombre = excluded.capital_nombre,
  capital_lat = excluded.capital_lat,
  capital_lng = excluded.capital_lng,
  macrozona = excluded.macrozona,
  orden_geografico = excluded.orden_geografico,
  activo = excluded.activo,
  version_geoint = excluded.version_geoint,
  fuente_nombre = excluded.fuente_nombre,
  fuente_url = excluded.fuente_url,
  aliases = excluded.aliases,
  metadata = public.tpl_geoint_regiones.metadata || excluded.metadata,
  updated_at = now();

-- 4) Resolver región tolerando nombres históricos y acentos.
create or replace function public.tpl_geoint_region_por_texto_v1(p_region text)
returns public.tpl_geoint_regiones
language sql
stable
security definer
set search_path = public
as $$
  select r
  from public.tpl_geoint_regiones r
  where r.activo = true
    and (
      r.nombre_normalizado = public.tpl_geoint_normalizar_texto_v1(p_region)
      or public.tpl_geoint_normalizar_texto_v1(r.nombre) = public.tpl_geoint_normalizar_texto_v1(p_region)
      or exists (
        select 1
        from jsonb_array_elements_text(r.aliases) a(alias)
        where public.tpl_geoint_normalizar_texto_v1(a.alias)
            = public.tpl_geoint_normalizar_texto_v1(p_region)
      )
    )
  order by r.orden_geografico
  limit 1;
$$;

-- 5) Auditoría pequeña para validar este bloque antes de provincias.
create or replace function public.tpl_geoint_auditoria_regiones_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generado_at', now(),
    'regiones_activas', count(*) filter (where activo),
    'regiones_objetivo', count(*) filter (
      where codigo in ('CL-ML','CL-NB','CL-BI','CL-AR') and activo
    ),
    'con_capital', count(*) filter (
      where activo and capital_nombre is not null and capital_nombre <> ''
    ),
    'con_coordenadas_capital', count(*) filter (
      where activo and capital_lat is not null and capital_lng is not null
    ),
    'codigos', coalesce(
      jsonb_agg(codigo order by orden_geografico) filter (where activo),
      '[]'::jsonb
    )
  )
  from public.tpl_geoint_regiones;
$$;

-- 6) Seguridad: catálogo legible, edición solo servidor.
alter table public.tpl_geoint_regiones enable row level security;

revoke all on public.tpl_geoint_regiones from anon, authenticated;
grant select on public.tpl_geoint_regiones to authenticated;
grant all on public.tpl_geoint_regiones to service_role;

revoke all on function public.tpl_geoint_region_por_texto_v1(text) from public;
grant execute on function public.tpl_geoint_region_por_texto_v1(text)
  to authenticated, service_role;

revoke all on function public.tpl_geoint_auditoria_regiones_v1() from public;
grant execute on function public.tpl_geoint_auditoria_regiones_v1()
  to authenticated, service_role;

-- 7) Registrar cobertura del bloque en GEOINT Core.
insert into public.tpl_geoint_versiones(
  codigo,nombre,estado,cobertura,fuentes,notas
)
values(
  'geoint-v1-regiones-centro-sur',
  'TPL GEOINT v1 · Regiones Centro-Sur',
  'validacion',
  '{"regiones":["Maule","Ñuble","Biobío","La Araucanía"],"bloque":"G1.2-1"}'::jsonb,
  '[{"nombre":"INE Chile"},{"nombre":"BCN SIIT"}]'::jsonb,
  'Catálogo regional canónico. No modifica el Tasador, worker, CRM ni propiedades.'
)
on conflict(codigo) do update set
  nombre = excluded.nombre,
  estado = excluded.estado,
  cobertura = excluded.cobertura,
  fuentes = excluded.fuentes,
  notas = excluded.notas;
