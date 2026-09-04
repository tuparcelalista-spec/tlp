-- TPL GEOINT G1.2 BLOQUE 4A · CATÁLOGO DE FUENTES v1
create extension if not exists pgcrypto;

create table if not exists public.tpl_geoint_fuentes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  organismo text,
  tipo text not null check(tipo in ('oficial','abierta','interna_tpl','derivada')),
  ambito text,
  url text,
  licencia text,
  frecuencia_actualizacion text,
  confianza smallint not null default 100 check(confianza between 0 and 100),
  activa boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_geoint_fuentes_updated_at on public.tpl_geoint_fuentes;
create trigger trg_tpl_geoint_fuentes_updated_at before update on public.tpl_geoint_fuentes
for each row execute function public.tpl_geoint_touch_updated_at_v1();

insert into public.tpl_geoint_fuentes(codigo,nombre,organismo,tipo,ambito,url,licencia,frecuencia_actualizacion,confianza,metadata)
values
 ('bcn_siit_dpa','División político-administrativa de Chile','Biblioteca del Congreso Nacional','oficial','regiones_provincias_comunas','https://www.bcn.cl/siit/nuestropais/nuestropais/div_pol-adm.htm',null,'cuando cambia la DPA',100,'{}'),
 ('ine_dpa','Códigos territoriales y división político-administrativa','Instituto Nacional de Estadísticas','oficial','codigos_ine','https://www.ine.gob.cl',null,'cuando cambia la DPA',100,'{}'),
 ('ine_censo_2024','Censo de Población y Vivienda 2024','Instituto Nacional de Estadísticas','oficial','demografia_vivienda','https://censo2024.ine.gob.cl',null,'censal',100,'{}'),
 ('dmc_normales','Normales climatológicas','Dirección Meteorológica de Chile','oficial','clima','https://climatologia.meteochile.gob.cl',null,'según publicación DMC',100,'{}'),
 ('sernatur_destinos','Destinos turísticos e intensidad turística','SERNATUR / Subsecretaría de Turismo','oficial','turismo','https://www.subturismo.gob.cl',null,'según publicación oficial',95,'{}'),
 ('osm','OpenStreetMap','OpenStreetMap contributors','abierta','coordenadas_servicios_rutas','https://www.openstreetmap.org','ODbL','continua',85,'{}'),
 ('tpl_catalogo_nacional_2026q3','TPL National Catalog 2026-Q3','Tu Parcela Lista','interna_tpl','coordenadas_comunales_hubs','interno:frontend-v2/plataforma/publicar/tpl-national-catalog.mjs',null,'versionada',90,'{"version":"2026-Q3-canonica-v2"}'),
 ('tpl_reglas_geoint_v1','Reglas territoriales GEOINT v1','Tu Parcela Lista','derivada','perfiles_hubs_turismo','interno:GEOINT',null,'por versión',85,'{}')
on conflict(codigo) do update set
 nombre=excluded.nombre,organismo=excluded.organismo,tipo=excluded.tipo,ambito=excluded.ambito,url=excluded.url,
 licencia=excluded.licencia,frecuencia_actualizacion=excluded.frecuencia_actualizacion,confianza=excluded.confianza,
 activa=true,metadata=public.tpl_geoint_fuentes.metadata||excluded.metadata,updated_at=now();

alter table public.tpl_geoint_referencias add column if not exists fuente_id uuid references public.tpl_geoint_fuentes(id);
alter table public.tpl_geoint_comunas add column if not exists fuente_id uuid references public.tpl_geoint_fuentes(id);
alter table public.tpl_geoint_comuna_perfiles add column if not exists fuente_id uuid references public.tpl_geoint_fuentes(id);

update public.tpl_geoint_comunas c set fuente_id=f.id
from public.tpl_geoint_fuentes f where f.codigo='bcn_siit_dpa' and c.fuente_id is null;

alter table public.tpl_geoint_fuentes enable row level security;
revoke all on public.tpl_geoint_fuentes from anon,authenticated;
grant select on public.tpl_geoint_fuentes to authenticated;
grant all on public.tpl_geoint_fuentes to service_role;

create or replace function public.tpl_geoint_auditoria_fuentes_v1()
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('generado_at',now(),'fuentes_activas',count(*) filter(where activa),
 'oficiales',count(*) filter(where activa and tipo='oficial'),
 'internas_tpl',count(*) filter(where activa and tipo='interna_tpl'),
 'derivadas',count(*) filter(where activa and tipo='derivada'))
 from public.tpl_geoint_fuentes;
$$;
grant execute on function public.tpl_geoint_auditoria_fuentes_v1() to authenticated,service_role;
