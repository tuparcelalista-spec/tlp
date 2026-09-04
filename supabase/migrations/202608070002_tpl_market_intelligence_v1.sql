
create extension if not exists pgcrypto;

create table if not exists public.tpl_market_fuentes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo text not null check (tipo in ('portal','red_corretaje','fuente_tpl','fuente_publica','otro')),
  dominio text,
  prioridad smallint not null default 50 check (prioridad between 0 and 100),
  calidad_datos smallint not null default 50 check (calidad_datos between 0 and 100),
  permite_actor_publico boolean not null default true,
  activo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tpl_market_fuentes(codigo,nombre,tipo,dominio,prioridad,calidad_datos,metadata)
values
('mercadolibre_inmuebles','Mercado Libre Inmuebles / Portal Inmobiliario','portal','listado.mercadolibre.cl',100,80,'{"rol":"volumen_mercado"}'),
('yapo','Yapo','portal','yapo.cl',85,65,'{"rol":"particulares_y_corredores_pequenos"}'),
('portalterreno','PortalTerreno','portal','portalterreno.cl',90,80,'{"rol":"parcelas_loteos_proyectos"}'),
('remax','RE/MAX Chile','red_corretaje','remax.cl',95,95,'{"rol":"alta_calidad_datos","identificador_preferente":"MLS"}'),
('tpl','Tu Parcela Lista','fuente_tpl','parcelalista.cl',100,100,'{"rol":"fuente_interna_canonica"}')
on conflict(codigo) do update set
 nombre=excluded.nombre,tipo=excluded.tipo,dominio=excluded.dominio,
 prioridad=excluded.prioridad,calidad_datos=excluded.calidad_datos,
 metadata=public.tpl_market_fuentes.metadata||excluded.metadata,activo=true,updated_at=now();

create table if not exists public.tpl_market_cobertura_regional (
  id uuid primary key default gen_random_uuid(),
  fuente_id uuid not null references public.tpl_market_fuentes(id) on delete cascade,
  region_codigo text not null,
  region_nombre text not null,
  categoria text not null default 'parcelas',
  cantidad_observada integer,
  fecha_observacion date not null,
  url_consulta text,
  estado text not null default 'iniciada'
    check (estado in ('pendiente','iniciada','parcial','completa','validada')),
  confianza smallint not null default 50 check (confianza between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(fuente_id,region_codigo,categoria,fecha_observacion)
);

with f as (select id from public.tpl_market_fuentes where codigo='mercadolibre_inmuebles'),
d(region_codigo,region_nombre,cantidad,url_consulta,confianza,metadata) as (
 values
 ('CL-RM','Región Metropolitana de Santiago',3865,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/',90,'{"origen":"filtro_regional"}'::jsonb),
 ('CL-LI','Región del Libertador General Bernardo O''Higgins',1037,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/',90,'{"origen":"filtro_regional"}'::jsonb),
 ('CL-ML','Región del Maule',912,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/maule/',95,'{"origen":"resultado_regional"}'::jsonb),
 ('CL-NB','Región de Ñuble',516,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/nuble/',95,'{"origen":"resultado_regional"}'::jsonb),
 ('CL-BI','Región del Biobío',475,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/biobio/',85,'{"origen":"enlace_TPL"}'::jsonb),
 ('CL-AR','Región de La Araucanía',1578,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/la-araucania/',95,'{"origen":"filtro_regional"}'::jsonb),
 ('CL-LR','Región de Los Ríos',659,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/los-rios/',95,'{"origen":"resultado_regional"}'::jsonb),
 ('CL-LL','Región de Los Lagos',3124,'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/los-lagos/',95,'{"origen":"filtro_regional"}'::jsonb)
)
insert into public.tpl_market_cobertura_regional
(fuente_id,region_codigo,region_nombre,categoria,cantidad_observada,fecha_observacion,url_consulta,estado,confianza,metadata)
select f.id,d.region_codigo,d.region_nombre,'parcelas',d.cantidad,date '2026-08-07',d.url_consulta,'iniciada',d.confianza,d.metadata
from f cross join d
on conflict(fuente_id,region_codigo,categoria,fecha_observacion) do update set
 cantidad_observada=excluded.cantidad_observada,url_consulta=excluded.url_consulta,
 estado=excluded.estado,confianza=excluded.confianza,
 metadata=public.tpl_market_cobertura_regional.metadata||excluded.metadata,updated_at=now();

create table if not exists public.tpl_market_misiones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  fuente_id uuid not null references public.tpl_market_fuentes(id) on delete restrict,
  region_codigo text,
  region_nombre text,
  comuna text,
  categoria text not null,
  tipo_tpl_objetivo text,
  url_inicial text,
  query_text text,
  patron_paginacion text,
  paso_paginacion integer,
  resultados_declarados integer,
  resultados_capturados integer not null default 0,
  nuevos integer not null default 0,
  actualizados integer not null default 0,
  duplicados integer not null default 0,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','en_curso','parcial','completa','error','bloqueada')),
  ultima_revision timestamptz,
  error_ultimo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

with regiones(codigo,nombre) as (
 values ('CL-ML','Maule'),('CL-NB','Ñuble'),('CL-BI','Biobío'),('CL-AR','La Araucanía'),
        ('CL-LR','Los Ríos'),('CL-LL','Los Lagos'),('CL-LI','O''Higgins'),('CL-RM','Metropolitana')
),
fuentes as (
 select id,codigo from public.tpl_market_fuentes
 where codigo in ('mercadolibre_inmuebles','yapo','portalterreno','remax')
)
insert into public.tpl_market_misiones
(codigo,fuente_id,region_codigo,region_nombre,categoria,tipo_tpl_objetivo,url_inicial,query_text,patron_paginacion,paso_paginacion,estado,metadata)
select
 'MKT-'||replace(r.codigo,'CL-','')||'-'||
 case f.codigo when 'mercadolibre_inmuebles' then 'ML' when 'portalterreno' then 'PT'
               when 'remax' then 'RX' when 'yapo' then 'YP' end||'-PARCELAS-202608',
 f.id,r.codigo,r.nombre,'parcelas','parcela_campo',
 case
   when f.codigo='mercadolibre_inmuebles' and r.codigo='CL-ML' then 'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/maule/'
   when f.codigo='mercadolibre_inmuebles' and r.codigo='CL-NB' then 'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/nuble/'
   when f.codigo='mercadolibre_inmuebles' and r.codigo='CL-BI' then 'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/biobio/'
   when f.codigo='mercadolibre_inmuebles' and r.codigo='CL-AR' then 'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/la-araucania/'
   when f.codigo='mercadolibre_inmuebles' and r.codigo='CL-LR' then 'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/los-rios/'
   when f.codigo='mercadolibre_inmuebles' and r.codigo='CL-LL' then 'https://listado.mercadolibre.cl/inmuebles/parcelas/venta/los-lagos/'
   else null
 end,
 'Parcelas en venta · '||r.nombre||' · '||f.codigo,
 case when f.codigo='mercadolibre_inmuebles' then '_Desde_{N}_NoIndex_True' end,
 case when f.codigo='mercadolibre_inmuebles' then 48 end,
 'pendiente','{"mes_base":"2026-08","captura":"TPL Market Intelligence v1"}'
from regiones r cross join fuentes f
on conflict(codigo) do nothing;

create table if not exists public.tpl_market_zonas (
 id uuid primary key default gen_random_uuid(),
 region_codigo text, comuna text not null, zona text not null, microzona text,
 nombre_normalizado text not null, lat numeric, lng numeric,
 fuente_definicion text not null default 'mercado',
 confianza smallint not null default 50 check(confianza between 0 and 100),
 activo boolean not null default true, metadata jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(comuna,nombre_normalizado)
);

create table if not exists public.tpl_market_actores (
 id uuid primary key default gen_random_uuid(),
 nombre text, nombre_normalizado text, empresa text, empresa_normalizada text,
 tipo_actor text not null default 'desconocido'
   check(tipo_actor in ('particular','corredor','inmobiliaria','desarrollador','oficina','desconocido')),
 sitio_web text, oficina text, mls_agente_id text,
 primera_vez_visto timestamptz, ultima_vez_visto timestamptz,
 confianza smallint not null default 50 check(confianza between 0 and 100),
 activo boolean not null default true, metadata jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.tpl_market_actor_contactos (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references public.tpl_market_actores(id) on delete cascade,
 tipo text not null check(tipo in ('telefono','email','whatsapp','otro')),
 valor text not null, valor_normalizado text,
 fuente_id uuid references public.tpl_market_fuentes(id) on delete set null,
 url_origen text, visible_publicamente boolean not null default true,
 uso text not null default 'identificacion_y_gestion_comercial_interna',
 primera_vez_visto timestamptz not null default now(), ultima_vez_visto timestamptz not null default now(),
 activo boolean not null default true, metadata jsonb not null default '{}',
 unique(actor_id,tipo,valor)
);

create table if not exists public.tpl_market_propiedades (
 id uuid primary key default gen_random_uuid(),
 fingerprint text unique,
 tipo_tpl text not null default 'desconocido'
   check(tipo_tpl in ('sitio_urbano','terreno_urbano','terreno_urbano_grande','parcela','campo','parcela_con_casa','casa_urbana','agricola','industrial','desconocido')),
 region_codigo text, region text, provincia text, comuna text,
 zona_id uuid references public.tpl_market_zonas(id) on delete set null,
 zona_texto text, sector text, localidad text, direccion_publica text,
 lat numeric, lng numeric, superficie_terreno_m2 numeric, superficie_construida_m2 numeric,
 dormitorios integer, banos integer, tiene_vivienda boolean,
 rol_publicado boolean, agua_estado text, electricidad_estado text,
 cercada boolean, porton boolean, condominio boolean, topografia text, acceso_tipo text,
 atributos_naturales jsonb not null default '[]',
 descripcion_normalizada text, confianza smallint not null default 50 check(confianza between 0 and 100),
 primera_vez_vista timestamptz, ultima_vez_vista timestamptz, activa_observada boolean not null default true,
 metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists tpl_market_propiedades_geo_idx on public.tpl_market_propiedades(region_codigo,comuna,zona_texto,sector);
create index if not exists tpl_market_propiedades_tipo_area_idx on public.tpl_market_propiedades(tipo_tpl,superficie_terreno_m2);

create table if not exists public.tpl_market_publicaciones (
 id uuid primary key default gen_random_uuid(),
 propiedad_id uuid references public.tpl_market_propiedades(id) on delete set null,
 fuente_id uuid not null references public.tpl_market_fuentes(id) on delete restrict,
 actor_id uuid references public.tpl_market_actores(id) on delete set null,
 mision_id uuid references public.tpl_market_misiones(id) on delete set null,
 fuente_publicacion_id text, codigo_mls text, url text not null, titulo text, tipo_fuente text,
 estado text not null default 'activa' check(estado in ('activa','pausada','retirada','vendida','desconocida')),
 publicada_at timestamptz, primera_captura_at timestamptz not null default now(),
 ultima_captura_at timestamptz not null default now(), ultima_vista_activa_at timestamptz,
 metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists tpl_market_publicacion_fuente_id_uq on public.tpl_market_publicaciones(fuente_id,fuente_publicacion_id) where fuente_publicacion_id is not null;
create unique index if not exists tpl_market_publicacion_fuente_url_uq on public.tpl_market_publicaciones(fuente_id,url);

create table if not exists public.tpl_market_publicacion_snapshots (
 id uuid primary key default gen_random_uuid(),
 publicacion_id uuid not null references public.tpl_market_publicaciones(id) on delete cascade,
 capturado_at timestamptz not null default now(), fecha_valor date not null default current_date,
 moneda text not null default 'CLP' check(moneda in ('CLP','UF','USD','OTRA')),
 precio_publicado numeric, precio_clp numeric, precio_uf numeric, uf_clp numeric,
 superficie_m2 numeric,
 precio_m2_clp numeric generated always as (
   case when coalesce(superficie_m2,0)>0 and precio_clp is not null then precio_clp/superficie_m2 end
 ) stored,
 zona_texto text, sector text, descripcion text,
 atributos jsonb not null default '{}', raw_resumen jsonb not null default '{}',
 hash_contenido text, activo_en_fuente boolean not null default true, metadata jsonb not null default '{}'
);
create index if not exists tpl_market_snapshots_pub_fecha_idx on public.tpl_market_publicacion_snapshots(publicacion_id,capturado_at desc);

create or replace view public.tpl_market_publicaciones_actuales_v1 as
select pb.id publicacion_id,pb.propiedad_id,f.codigo fuente_codigo,f.nombre fuente_nombre,
 pb.fuente_publicacion_id,pb.codigo_mls,pb.url,pb.titulo,pb.estado,pb.actor_id,
 s.capturado_at,s.moneda,s.precio_publicado,s.precio_clp,s.precio_uf,s.uf_clp,
 s.superficie_m2,s.precio_m2_clp,p.tipo_tpl,p.region_codigo,p.region,p.provincia,p.comuna,
 coalesce(p.zona_texto,s.zona_texto) zona,coalesce(p.sector,s.sector) sector,p.lat,p.lng,
 p.rol_publicado,p.agua_estado,p.electricidad_estado,p.cercada,p.porton,p.condominio,
 p.topografia,p.atributos_naturales,s.atributos atributos_snapshot
from public.tpl_market_publicaciones pb
join public.tpl_market_fuentes f on f.id=pb.fuente_id
left join public.tpl_market_propiedades p on p.id=pb.propiedad_id
left join lateral (
 select ss.* from public.tpl_market_publicacion_snapshots ss
 where ss.publicacion_id=pb.id order by ss.capturado_at desc limit 1
) s on true;

create table if not exists public.tpl_market_estadisticas (
 id uuid primary key default gen_random_uuid(),
 periodo date not null, region_codigo text, comuna text, zona text, sector text,
 tipo_tpl text not null, superficie_desde_m2 numeric, superficie_hasta_m2 numeric,
 cantidad integer not null default 0,
 precio_min_clp numeric,precio_p25_clp numeric,precio_mediana_clp numeric,
 precio_promedio_clp numeric,precio_p75_clp numeric,precio_premium_clp numeric,precio_max_clp numeric,
 precio_m2_mediana_clp numeric,precio_m2_promedio_clp numeric,
 confianza smallint not null default 0 check(confianza between 0 and 100),
 fuentes jsonb not null default '[]', metadata jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create unique index if not exists tpl_market_estadisticas_scope_uq on public.tpl_market_estadisticas(
 periodo,coalesce(region_codigo,''),coalesce(comuna,''),coalesce(zona,''),coalesce(sector,''),
 tipo_tpl,coalesce(superficie_desde_m2,-1),coalesce(superficie_hasta_m2,-1)
);

create or replace function public.tpl_market_tipo_tpl_v1(p_superficie_m2 numeric,p_tiene_vivienda boolean default false,p_urbano boolean default false)
returns text language sql immutable as $$
select case
 when coalesce(p_tiene_vivienda,false) and coalesce(p_urbano,false) then 'casa_urbana'
 when coalesce(p_tiene_vivienda,false) and coalesce(p_superficie_m2,0)>=5000 then 'parcela_con_casa'
 when coalesce(p_urbano,false) and coalesce(p_superficie_m2,0)<=600 then 'sitio_urbano'
 when coalesce(p_urbano,false) and coalesce(p_superficie_m2,0)<2000 then 'terreno_urbano'
 when coalesce(p_urbano,false) and coalesce(p_superficie_m2,0)<5000 then 'terreno_urbano_grande'
 when coalesce(p_superficie_m2,0)>=10000 then 'campo'
 when coalesce(p_superficie_m2,0)>=5000 then 'parcela'
 else 'desconocido' end;
$$;

create or replace function public.tpl_market_auditoria_v1()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'generado_at',now(),
 'fuentes_activas',(select count(*) from public.tpl_market_fuentes where activo),
 'regiones_con_fotografia',(select count(distinct region_codigo) from public.tpl_market_cobertura_regional),
 'misiones',(select count(*) from public.tpl_market_misiones),
 'misiones_pendientes',(select count(*) from public.tpl_market_misiones where estado='pendiente'),
 'propiedades',(select count(*) from public.tpl_market_propiedades),
 'publicaciones',(select count(*) from public.tpl_market_publicaciones),
 'snapshots',(select count(*) from public.tpl_market_publicacion_snapshots),
 'actores',(select count(*) from public.tpl_market_actores),
 'contactos_publicos',(select count(*) from public.tpl_market_actor_contactos where visible_publicamente),
 'zonas',(select count(*) from public.tpl_market_zonas),
 'modo','INFRAESTRUCTURA_LISTA_PARA_INGESTA'
);
$$;

alter table public.tpl_market_fuentes enable row level security;
alter table public.tpl_market_cobertura_regional enable row level security;
alter table public.tpl_market_misiones enable row level security;
alter table public.tpl_market_zonas enable row level security;
alter table public.tpl_market_actores enable row level security;
alter table public.tpl_market_actor_contactos enable row level security;
alter table public.tpl_market_propiedades enable row level security;
alter table public.tpl_market_publicaciones enable row level security;
alter table public.tpl_market_publicacion_snapshots enable row level security;
alter table public.tpl_market_estadisticas enable row level security;

revoke all on public.tpl_market_actor_contactos from anon,authenticated;
grant all on public.tpl_market_fuentes,public.tpl_market_cobertura_regional,public.tpl_market_misiones,
 public.tpl_market_zonas,public.tpl_market_actores,public.tpl_market_actor_contactos,
 public.tpl_market_propiedades,public.tpl_market_publicaciones,
 public.tpl_market_publicacion_snapshots,public.tpl_market_estadisticas to service_role;
grant select on public.tpl_market_fuentes,public.tpl_market_cobertura_regional,public.tpl_market_misiones,
 public.tpl_market_zonas,public.tpl_market_propiedades,public.tpl_market_publicaciones,
 public.tpl_market_publicacion_snapshots,public.tpl_market_estadisticas to authenticated;
grant select on public.tpl_market_publicaciones_actuales_v1 to authenticated,service_role;
revoke all on function public.tpl_market_auditoria_v1() from public;
grant execute on function public.tpl_market_auditoria_v1() to authenticated,service_role;
