-- ============================================================
-- TPL MARKET INTELLIGENCE v1.2
-- BACKUP + PREPARACIÓN INGESTA MASIVA
-- 2026-08-07
-- ============================================================

-- 1) Vistas de exportación estables para backup.
create or replace view public.tpl_market_backup_propiedades_v1 as
select *
from public.tpl_market_propiedades;

create or replace view public.tpl_market_backup_publicaciones_v1 as
select *
from public.tpl_market_publicaciones;

create or replace view public.tpl_market_backup_snapshots_v1 as
select *
from public.tpl_market_publicacion_snapshots;

create or replace view public.tpl_market_backup_actores_v1 as
select
  id,nombre,nombre_normalizado,empresa,empresa_normalizada,tipo_actor,
  sitio_web,oficina,mls_agente_id,primera_vez_visto,ultima_vez_visto,
  confianza,activo,metadata,created_at,updated_at
from public.tpl_market_actores;

create or replace view public.tpl_market_backup_contactos_v1 as
select
  id,actor_id,tipo,valor,valor_normalizado,fuente_id,url_origen,
  visible_publicamente,uso,primera_vez_visto,ultima_vez_visto,
  activo,metadata
from public.tpl_market_actor_contactos;

create or replace view public.tpl_market_backup_zonas_v1 as
select *
from public.tpl_market_zonas;

create or replace view public.tpl_market_backup_estadisticas_v1 as
select *
from public.tpl_market_estadisticas;

create or replace view public.tpl_market_backup_misiones_v1 as
select *
from public.tpl_market_misiones;

create or replace view public.tpl_market_backup_fuentes_v1 as
select *
from public.tpl_market_fuentes;

create or replace view public.tpl_market_backup_cobertura_v1 as
select *
from public.tpl_market_cobertura_regional;

-- 2) Manifiesto del backup.
create or replace function public.tpl_market_backup_manifest_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'generado_at',now(),
  'version','tpl-market-intelligence-v1.2',
  'propiedades',(select count(*) from public.tpl_market_propiedades),
  'publicaciones',(select count(*) from public.tpl_market_publicaciones),
  'snapshots',(select count(*) from public.tpl_market_publicacion_snapshots),
  'actores',(select count(*) from public.tpl_market_actores),
  'contactos',(select count(*) from public.tpl_market_actor_contactos),
  'zonas',(select count(*) from public.tpl_market_zonas),
  'estadisticas',(select count(*) from public.tpl_market_estadisticas),
  'misiones',(select count(*) from public.tpl_market_misiones),
  'fuentes',(select count(*) from public.tpl_market_fuentes),
  'regiones_con_cobertura',(select count(distinct region_codigo) from public.tpl_market_cobertura_regional)
);
$$;

-- 3) Métricas rápidas para preparar ingesta masiva.
create or replace function public.tpl_market_estado_ingesta_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'generado_at',now(),
  'publicaciones_totales',(select count(*) from public.tpl_market_publicaciones),
  'publicaciones_activas',(select count(*) from public.tpl_market_publicaciones where estado='activa'),
  'snapshots_totales',(select count(*) from public.tpl_market_publicacion_snapshots),
  'propiedades_canonicas',(select count(*) from public.tpl_market_propiedades),
  'actores',(select count(*) from public.tpl_market_actores),
  'misiones_pendientes',(select count(*) from public.tpl_market_misiones where estado='pendiente'),
  'misiones_en_curso',(select count(*) from public.tpl_market_misiones where estado='en_curso'),
  'misiones_completas',(select count(*) from public.tpl_market_misiones where estado='completa'),
  'modo','PREPARADO_PARA_INGESTA_MASIVA_Y_BACKUP'
);
$$;

-- 4) Índices adicionales para escalar.
create index if not exists tpl_market_publicaciones_estado_idx
  on public.tpl_market_publicaciones(estado);

create index if not exists tpl_market_publicaciones_fuente_idx
  on public.tpl_market_publicaciones(fuente_id);

create index if not exists tpl_market_snapshots_fecha_idx
  on public.tpl_market_publicacion_snapshots(fecha_valor);

create index if not exists tpl_market_propiedades_comuna_tipo_idx
  on public.tpl_market_propiedades(comuna,tipo_tpl);

create index if not exists tpl_market_propiedades_region_idx
  on public.tpl_market_propiedades(region_codigo);

create index if not exists tpl_market_actores_empresa_idx
  on public.tpl_market_actores(empresa_normalizada);

-- 5) Seguridad.
revoke all on function public.tpl_market_backup_manifest_v1() from public;
revoke all on function public.tpl_market_estado_ingesta_v1() from public;

grant execute on function public.tpl_market_backup_manifest_v1()
  to authenticated,service_role;

grant execute on function public.tpl_market_estado_ingesta_v1()
  to authenticated,service_role;

grant select on
  public.tpl_market_backup_propiedades_v1,
  public.tpl_market_backup_publicaciones_v1,
  public.tpl_market_backup_snapshots_v1,
  public.tpl_market_backup_actores_v1,
  public.tpl_market_backup_zonas_v1,
  public.tpl_market_backup_estadisticas_v1,
  public.tpl_market_backup_misiones_v1,
  public.tpl_market_backup_fuentes_v1,
  public.tpl_market_backup_cobertura_v1
to authenticated,service_role;

-- Contactos solo backend administrativo.
revoke all on public.tpl_market_backup_contactos_v1 from anon,authenticated;
grant select on public.tpl_market_backup_contactos_v1 to service_role;
