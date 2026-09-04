-- ============================================================
-- TPL GEOINT · G1.2 BLOQUE 3 · COMUNAS + FICHA MAESTRA v1
-- Cobertura: Maule, Ñuble, Biobío y La Araucanía (116 comunas).
-- Requiere bloques de Regiones y Provincias ya instalados.
-- No modifica Tasador, worker, CRM ni propiedades.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Identidad comunal estable.
create table if not exists public.tpl_geoint_comunas (
  id uuid primary key default gen_random_uuid(),
  provincia_id uuid not null references public.tpl_geoint_provincias(id)
    on update cascade on delete restrict,
  region_id uuid not null references public.tpl_geoint_regiones(id)
    on update cascade on delete restrict,
  pais_codigo text not null default 'CL',
  codigo_ine text not null,
  codigo text not null,
  nombre text not null,
  nombre_normalizado text not null,
  capital_comunal text not null,
  capital_lat numeric,
  capital_lng numeric,
  superficie_km2 numeric,
  altitud_media_m numeric,
  clasificacion_territorial text,
  activo boolean not null default true,
  confianza smallint not null default 100 check (confianza between 0 and 100),
  version_geoint text not null default 'geoint-v1-core',
  fuente_nombre text,
  fuente_url text,
  fuente_fecha date,
  aliases jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tpl_geoint_comunas_codigo_unique unique (codigo),
  constraint tpl_geoint_comunas_codigo_ine_unique unique (pais_codigo,codigo_ine),
  constraint tpl_geoint_comunas_provincia_nombre_unique
    unique (provincia_id,nombre_normalizado),
  constraint tpl_geoint_comunas_coordenadas_check check (
    (capital_lat is null and capital_lng is null)
    or
    (capital_lat between -90 and 90 and capital_lng between -180 and 180)
  )
);

create index if not exists tpl_geoint_comunas_region_idx
  on public.tpl_geoint_comunas(region_id,activo,nombre_normalizado);

create index if not exists tpl_geoint_comunas_provincia_idx
  on public.tpl_geoint_comunas(provincia_id,activo,nombre_normalizado);

drop trigger if exists trg_tpl_geoint_comunas_updated_at
  on public.tpl_geoint_comunas;

create trigger trg_tpl_geoint_comunas_updated_at
before update on public.tpl_geoint_comunas
for each row execute function public.tpl_geoint_touch_updated_at_v1();

-- 2) Perfil comunal histórico y versionado.
create table if not exists public.tpl_geoint_comuna_perfiles (
  id uuid primary key default gen_random_uuid(),
  comuna_id uuid not null references public.tpl_geoint_comunas(id)
    on update cascade on delete cascade,
  anio_referencia integer not null check (anio_referencia between 1900 and 2200),
  periodo_referencia text,
  estado_dato text not null default 'borrador'
    check (estado_dato in ('borrador','validado','reemplazado')),
  poblacion_total bigint,
  viviendas_total bigint,
  hogares_total bigint,
  poblacion_urbana bigint,
  poblacion_rural bigint,
  ruralidad_pct numeric,
  densidad_hab_km2 numeric,
  indice_envejecimiento numeric,
  crecimiento_poblacional_pct numeric,
  clima_predominante text,
  clasificacion_koppen text,
  temperatura_media_anual_c numeric,
  precipitacion_anual_mm numeric,
  meses_secos numeric,
  dias_helada_anuales numeric,
  riesgo_heladas text,
  humedad_media_pct numeric,
  zona_agroclimatica text,
  vocacion_economica_principal text,
  vocaciones_economicas jsonb not null default '[]'::jsonb,
  indice_desarrollo_comunal numeric,
  indice_ruralidad numeric,
  indice_conectividad numeric,
  indice_servicios numeric,
  confianza smallint not null default 0 check (confianza between 0 and 100),
  fuentes jsonb not null default '[]'::jsonb,
  metodologia text,
  observaciones text,
  version_geoint text not null default 'geoint-v1-perfil-comunal',
  metadata jsonb not null default '{}'::jsonb,
  validado_at timestamptz,
  validado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tpl_geoint_comuna_perfiles_unique
    unique (comuna_id,anio_referencia,periodo_referencia,version_geoint),
  constraint tpl_geoint_comuna_perfiles_porcentajes_check check (
    (ruralidad_pct is null or ruralidad_pct between 0 and 100)
    and (humedad_media_pct is null or humedad_media_pct between 0 and 100)
  )
);

create index if not exists tpl_geoint_comuna_perfiles_comuna_anio_idx
  on public.tpl_geoint_comuna_perfiles(comuna_id,anio_referencia desc);

drop trigger if exists trg_tpl_geoint_comuna_perfiles_updated_at
  on public.tpl_geoint_comuna_perfiles;

create trigger trg_tpl_geoint_comuna_perfiles_updated_at
before update on public.tpl_geoint_comuna_perfiles
for each row execute function public.tpl_geoint_touch_updated_at_v1();

-- 3) Carga canónica de 116 comunas.
with datos(region_codigo,provincia_codigo,codigo_ine,nombre,nombre_normalizado) as (
  values
    ('CL-ML','CL-ML-TAL','07101','Talca','talca'),
    ('CL-ML','CL-ML-TAL','07102','Constitución','constitucion'),
    ('CL-ML','CL-ML-TAL','07103','Curepto','curepto'),
    ('CL-ML','CL-ML-TAL','07104','Empedrado','empedrado'),
    ('CL-ML','CL-ML-TAL','07105','Maule','maule'),
    ('CL-ML','CL-ML-TAL','07106','Pelarco','pelarco'),
    ('CL-ML','CL-ML-TAL','07107','Pencahue','pencahue'),
    ('CL-ML','CL-ML-TAL','07108','Río Claro','rio_claro'),
    ('CL-ML','CL-ML-TAL','07109','San Clemente','san_clemente'),
    ('CL-ML','CL-ML-TAL','07110','San Rafael','san_rafael'),
    ('CL-ML','CL-ML-CAU','07201','Cauquenes','cauquenes'),
    ('CL-ML','CL-ML-CAU','07202','Chanco','chanco'),
    ('CL-ML','CL-ML-CAU','07203','Pelluhue','pelluhue'),
    ('CL-ML','CL-ML-CUR','07301','Curicó','curico'),
    ('CL-ML','CL-ML-CUR','07302','Hualañé','hualane'),
    ('CL-ML','CL-ML-CUR','07303','Licantén','licanten'),
    ('CL-ML','CL-ML-CUR','07304','Molina','molina'),
    ('CL-ML','CL-ML-CUR','07305','Rauco','rauco'),
    ('CL-ML','CL-ML-CUR','07306','Romeral','romeral'),
    ('CL-ML','CL-ML-CUR','07307','Sagrada Familia','sagrada_familia'),
    ('CL-ML','CL-ML-CUR','07308','Teno','teno'),
    ('CL-ML','CL-ML-CUR','07309','Vichuquén','vichuquen'),
    ('CL-ML','CL-ML-LIN','07401','Linares','linares'),
    ('CL-ML','CL-ML-LIN','07402','Colbún','colbun'),
    ('CL-ML','CL-ML-LIN','07403','Longaví','longavi'),
    ('CL-ML','CL-ML-LIN','07404','Parral','parral'),
    ('CL-ML','CL-ML-LIN','07405','Retiro','retiro'),
    ('CL-ML','CL-ML-LIN','07406','San Javier','san_javier'),
    ('CL-ML','CL-ML-LIN','07407','Villa Alegre','villa_alegre'),
    ('CL-ML','CL-ML-LIN','07408','Yerbas Buenas','yerbas_buenas'),
    ('CL-NB','CL-NB-DIG','16101','Chillán','chillan'),
    ('CL-NB','CL-NB-DIG','16102','Bulnes','bulnes'),
    ('CL-NB','CL-NB-DIG','16103','Chillán Viejo','chillan_viejo'),
    ('CL-NB','CL-NB-DIG','16104','El Carmen','el_carmen'),
    ('CL-NB','CL-NB-DIG','16105','Pemuco','pemuco'),
    ('CL-NB','CL-NB-DIG','16106','Pinto','pinto'),
    ('CL-NB','CL-NB-DIG','16107','Quillón','quillon'),
    ('CL-NB','CL-NB-DIG','16108','San Ignacio','san_ignacio'),
    ('CL-NB','CL-NB-DIG','16109','Yungay','yungay'),
    ('CL-NB','CL-NB-ITA','16201','Quirihue','quirihue'),
    ('CL-NB','CL-NB-ITA','16202','Cobquecura','cobquecura'),
    ('CL-NB','CL-NB-ITA','16203','Coelemu','coelemu'),
    ('CL-NB','CL-NB-ITA','16204','Ninhue','ninhue'),
    ('CL-NB','CL-NB-ITA','16205','Portezuelo','portezuelo'),
    ('CL-NB','CL-NB-ITA','16206','Ránquil','ranquil'),
    ('CL-NB','CL-NB-ITA','16207','Treguaco','treguaco'),
    ('CL-NB','CL-NB-PUN','16301','San Carlos','san_carlos'),
    ('CL-NB','CL-NB-PUN','16302','Coihueco','coihueco'),
    ('CL-NB','CL-NB-PUN','16303','Ñiquén','niquen'),
    ('CL-NB','CL-NB-PUN','16304','San Fabián','san_fabian'),
    ('CL-NB','CL-NB-PUN','16305','San Nicolás','san_nicolas'),
    ('CL-BI','CL-BI-CON','08101','Concepción','concepcion'),
    ('CL-BI','CL-BI-CON','08102','Coronel','coronel'),
    ('CL-BI','CL-BI-CON','08103','Chiguayante','chiguayante'),
    ('CL-BI','CL-BI-CON','08104','Florida','florida'),
    ('CL-BI','CL-BI-CON','08105','Hualqui','hualqui'),
    ('CL-BI','CL-BI-CON','08106','Lota','lota'),
    ('CL-BI','CL-BI-CON','08107','Penco','penco'),
    ('CL-BI','CL-BI-CON','08108','San Pedro de la Paz','san_pedro_de_la_paz'),
    ('CL-BI','CL-BI-CON','08109','Santa Juana','santa_juana'),
    ('CL-BI','CL-BI-CON','08110','Talcahuano','talcahuano'),
    ('CL-BI','CL-BI-CON','08111','Tomé','tome'),
    ('CL-BI','CL-BI-CON','08112','Hualpén','hualpen'),
    ('CL-BI','CL-BI-ARA','08201','Lebu','lebu'),
    ('CL-BI','CL-BI-ARA','08202','Arauco','arauco'),
    ('CL-BI','CL-BI-ARA','08203','Cañete','canete'),
    ('CL-BI','CL-BI-ARA','08204','Contulmo','contulmo'),
    ('CL-BI','CL-BI-ARA','08205','Curanilahue','curanilahue'),
    ('CL-BI','CL-BI-ARA','08206','Los Álamos','los_alamos'),
    ('CL-BI','CL-BI-ARA','08207','Tirúa','tirua'),
    ('CL-BI','CL-BI-BIO','08301','Los Ángeles','los_angeles'),
    ('CL-BI','CL-BI-BIO','08302','Antuco','antuco'),
    ('CL-BI','CL-BI-BIO','08303','Cabrero','cabrero'),
    ('CL-BI','CL-BI-BIO','08304','Laja','laja'),
    ('CL-BI','CL-BI-BIO','08305','Mulchén','mulchen'),
    ('CL-BI','CL-BI-BIO','08306','Nacimiento','nacimiento'),
    ('CL-BI','CL-BI-BIO','08307','Negrete','negrete'),
    ('CL-BI','CL-BI-BIO','08308','Quilaco','quilaco'),
    ('CL-BI','CL-BI-BIO','08309','Quilleco','quilleco'),
    ('CL-BI','CL-BI-BIO','08310','San Rosendo','san_rosendo'),
    ('CL-BI','CL-BI-BIO','08311','Santa Bárbara','santa_barbara'),
    ('CL-BI','CL-BI-BIO','08312','Tucapel','tucapel'),
    ('CL-BI','CL-BI-BIO','08313','Yumbel','yumbel'),
    ('CL-BI','CL-BI-BIO','08314','Alto Biobío','alto_biobio'),
    ('CL-AR','CL-AR-CAU','09101','Temuco','temuco'),
    ('CL-AR','CL-AR-CAU','09102','Carahue','carahue'),
    ('CL-AR','CL-AR-CAU','09103','Cunco','cunco'),
    ('CL-AR','CL-AR-CAU','09104','Curarrehue','curarrehue'),
    ('CL-AR','CL-AR-CAU','09105','Freire','freire'),
    ('CL-AR','CL-AR-CAU','09106','Galvarino','galvarino'),
    ('CL-AR','CL-AR-CAU','09107','Gorbea','gorbea'),
    ('CL-AR','CL-AR-CAU','09108','Lautaro','lautaro'),
    ('CL-AR','CL-AR-CAU','09109','Loncoche','loncoche'),
    ('CL-AR','CL-AR-CAU','09110','Melipeuco','melipeuco'),
    ('CL-AR','CL-AR-CAU','09111','Nueva Imperial','nueva_imperial'),
    ('CL-AR','CL-AR-CAU','09112','Padre Las Casas','padre_las_casas'),
    ('CL-AR','CL-AR-CAU','09113','Perquenco','perquenco'),
    ('CL-AR','CL-AR-CAU','09114','Pitrufquén','pitrufquen'),
    ('CL-AR','CL-AR-CAU','09115','Pucón','pucon'),
    ('CL-AR','CL-AR-CAU','09116','Saavedra','saavedra'),
    ('CL-AR','CL-AR-CAU','09117','Teodoro Schmidt','teodoro_schmidt'),
    ('CL-AR','CL-AR-CAU','09118','Toltén','tolten'),
    ('CL-AR','CL-AR-CAU','09119','Vilcún','vilcun'),
    ('CL-AR','CL-AR-CAU','09120','Villarrica','villarrica'),
    ('CL-AR','CL-AR-CAU','09121','Cholchol','cholchol'),
    ('CL-AR','CL-AR-MAL','09201','Angol','angol'),
    ('CL-AR','CL-AR-MAL','09202','Collipulli','collipulli'),
    ('CL-AR','CL-AR-MAL','09203','Curacautín','curacautin'),
    ('CL-AR','CL-AR-MAL','09204','Ercilla','ercilla'),
    ('CL-AR','CL-AR-MAL','09205','Lonquimay','lonquimay'),
    ('CL-AR','CL-AR-MAL','09206','Los Sauces','los_sauces'),
    ('CL-AR','CL-AR-MAL','09207','Lumaco','lumaco'),
    ('CL-AR','CL-AR-MAL','09208','Purén','puren'),
    ('CL-AR','CL-AR-MAL','09209','Renaico','renaico'),
    ('CL-AR','CL-AR-MAL','09210','Traiguén','traiguen'),
    ('CL-AR','CL-AR-MAL','09211','Victoria','victoria')
)
insert into public.tpl_geoint_comunas(
  provincia_id,region_id,pais_codigo,codigo_ine,codigo,
  nombre,nombre_normalizado,capital_comunal,
  activo,confianza,version_geoint,
  fuente_nombre,fuente_url,aliases,metadata
)
select
  p.id,
  r.id,
  'CL',
  d.codigo_ine,
  'CL-' || d.codigo_ine,
  d.nombre,
  d.nombre_normalizado,
  d.nombre,
  true,
  100,
  'geoint-v1-core',
  'BCN SIIT / INE Chile',
  'https://www.bcn.cl/siit/nuestropais/nuestropais/div_pol-adm.htm',
  jsonb_build_array(d.nombre),
  jsonb_build_object(
    'region_codigo',d.region_codigo,
    'provincia_codigo',d.provincia_codigo,
    'carga','G1.2-3'
  )
from datos d
join public.tpl_geoint_regiones r on r.codigo=d.region_codigo
join public.tpl_geoint_provincias p
  on p.codigo=d.provincia_codigo and p.region_id=r.id
on conflict (codigo) do update set
  provincia_id=excluded.provincia_id,
  region_id=excluded.region_id,
  codigo_ine=excluded.codigo_ine,
  nombre=excluded.nombre,
  nombre_normalizado=excluded.nombre_normalizado,
  capital_comunal=excluded.capital_comunal,
  activo=excluded.activo,
  confianza=excluded.confianza,
  version_geoint=excluded.version_geoint,
  fuente_nombre=excluded.fuente_nombre,
  fuente_url=excluded.fuente_url,
  aliases=excluded.aliases,
  metadata=public.tpl_geoint_comunas.metadata || excluded.metadata,
  updated_at=now();

-- 4) Perfil actual preferente, sin borrar historia.
create or replace view public.tpl_geoint_comuna_perfil_actual as
select distinct on (p.comuna_id)
  p.*
from public.tpl_geoint_comuna_perfiles p
where p.estado_dato in ('validado','borrador')
order by
  p.comuna_id,
  case when p.estado_dato='validado' then 0 else 1 end,
  p.anio_referencia desc,
  p.updated_at desc;

-- 5) Resolución tolerante de comuna.
create or replace function public.tpl_geoint_comuna_por_texto_v1(
  p_comuna text,
  p_region text default null
)
returns public.tpl_geoint_comunas
language sql
stable
security definer
set search_path=public
as $$
  select c
  from public.tpl_geoint_comunas c
  join public.tpl_geoint_regiones r on r.id=c.region_id
  where c.activo=true
    and (
      c.nombre_normalizado=public.tpl_geoint_normalizar_texto_v1(p_comuna)
      or public.tpl_geoint_normalizar_texto_v1(c.nombre)
        =public.tpl_geoint_normalizar_texto_v1(p_comuna)
      or exists(
        select 1
        from jsonb_array_elements_text(c.aliases) a(alias)
        where public.tpl_geoint_normalizar_texto_v1(a.alias)
          =public.tpl_geoint_normalizar_texto_v1(p_comuna)
      )
    )
    and (
      nullif(public.tpl_geoint_normalizar_texto_v1(p_region),'') is null
      or r.nombre_normalizado=public.tpl_geoint_normalizar_texto_v1(p_region)
      or r.codigo=p_region
      or exists(
        select 1
        from jsonb_array_elements_text(r.aliases) a(alias)
        where public.tpl_geoint_normalizar_texto_v1(a.alias)
          =public.tpl_geoint_normalizar_texto_v1(p_region)
      )
    )
  order by c.nombre_normalizado
  limit 1;
$$;

-- 6) Auditoría.
create or replace function public.tpl_geoint_auditoria_comunas_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  with resumen as (
    select r.codigo as region_codigo,count(*)::int as cantidad
    from public.tpl_geoint_comunas c
    join public.tpl_geoint_regiones r on r.id=c.region_id
    where c.activo
      and r.codigo in ('CL-ML','CL-NB','CL-BI','CL-AR')
    group by r.codigo
  ),
  total as (
    select
      count(*) filter(where c.activo) as comunas_activas,
      count(*) filter(
        where c.activo and r.codigo in ('CL-ML','CL-NB','CL-BI','CL-AR')
      ) as comunas_objetivo,
      count(*) filter(where c.activo and nullif(c.codigo_ine,'') is not null)
        as con_codigo_ine,
      count(*) filter(
        where c.activo and c.capital_lat is not null and c.capital_lng is not null
      ) as con_coordenadas_capital,
      count(*) filter(
        where c.activo and exists(
          select 1 from public.tpl_geoint_comuna_perfiles pf
          where pf.comuna_id=c.id
        )
      ) as con_perfil_historico
    from public.tpl_geoint_comunas c
    join public.tpl_geoint_regiones r on r.id=c.region_id
  )
  select jsonb_build_object(
    'generado_at',now(),
    'comunas_activas',total.comunas_activas,
    'comunas_objetivo',total.comunas_objetivo,
    'con_codigo_ine',total.con_codigo_ine,
    'con_coordenadas_capital',total.con_coordenadas_capital,
    'con_perfil_historico',total.con_perfil_historico,
    'por_region',coalesce(
      (select jsonb_object_agg(region_codigo,cantidad) from resumen),
      '{}'::jsonb
    )
  )
  from total;
$$;

-- 7) Seguridad.
alter table public.tpl_geoint_comunas enable row level security;
alter table public.tpl_geoint_comuna_perfiles enable row level security;

revoke all on public.tpl_geoint_comunas from anon,authenticated;
revoke all on public.tpl_geoint_comuna_perfiles from anon,authenticated;
grant select on public.tpl_geoint_comunas to authenticated;
grant select on public.tpl_geoint_comuna_perfiles to authenticated;
grant select on public.tpl_geoint_comuna_perfil_actual to authenticated;
grant all on public.tpl_geoint_comunas to service_role;
grant all on public.tpl_geoint_comuna_perfiles to service_role;

revoke all on function public.tpl_geoint_comuna_por_texto_v1(text,text) from public;
grant execute on function public.tpl_geoint_comuna_por_texto_v1(text,text)
  to authenticated,service_role;

revoke all on function public.tpl_geoint_auditoria_comunas_v1() from public;
grant execute on function public.tpl_geoint_auditoria_comunas_v1()
  to authenticated,service_role;

-- 8) Versionado.
insert into public.tpl_geoint_versiones(
  codigo,nombre,estado,cobertura,fuentes,notas
)
values(
  'geoint-v1-comunas-centro-sur',
  'TPL GEOINT v1 · Comunas y Ficha Maestra Centro-Sur',
  'validacion',
  '{
    "regiones":["Maule","Ñuble","Biobío","La Araucanía"],
    "comunas":116,
    "bloque":"G1.2-3"
  }'::jsonb,
  '[{"nombre":"BCN SIIT"},{"nombre":"INE Chile"},{"nombre":"Censo 2024"},{"nombre":"Dirección Meteorológica de Chile"}]'::jsonb,
  'La identidad comunal queda separada de población, clima y ruralidad, que se guardan como perfiles históricos. Estos perfiles aún no alteran el Tasador.'
)
on conflict(codigo) do update set
  nombre=excluded.nombre,
  estado=excluded.estado,
  cobertura=excluded.cobertura,
  fuentes=excluded.fuentes,
  notas=excluded.notas;
