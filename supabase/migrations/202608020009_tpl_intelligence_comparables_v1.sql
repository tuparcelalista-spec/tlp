-- TPL Intelligence · Mercado observado y comparables precisos
begin;
create extension if not exists pgcrypto;

create table if not exists public.tpl_comparables_mercado (
  id uuid primary key default gen_random_uuid(),
  fuente text not null,
  url text not null,
  id_externo text,
  fecha_captura timestamptz not null default now(),
  fecha_publicacion date,
  fecha_ultima_revision timestamptz not null default now(),
  region text,
  comuna text,
  sector text,
  tipo_activo text not null default 'parcela',
  operacion text not null default 'venta',
  moneda text not null default 'CLP',
  precio_publicado numeric,
  precio_clp bigint,
  superficie_terreno_m2 numeric,
  valor_terreno_m2 numeric,
  valor_hectarea numeric,
  tiene_casa boolean not null default false,
  superficie_construida_m2 numeric,
  dormitorios integer,
  banos integer,
  estacionamientos integer,
  materialidad text,
  antiguedad_anos integer,
  piscina boolean,
  quincho boolean,
  galpon boolean,
  bodega boolean,
  agua text,
  electricidad text,
  rol text,
  acceso text,
  condominio boolean,
  lat numeric,
  lng numeric,
  titulo text,
  descripcion text,
  atributos jsonb not null default '{}'::jsonb,
  datos_crudos jsonb not null default '{}'::jsonb,
  estado text not null default 'observado',
  calidad smallint not null default 50 check (calidad between 0 and 100),
  es_outlier boolean not null default false,
  hash_dedupe text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (url)
);
create unique index if not exists tpl_comparables_hash_unique on public.tpl_comparables_mercado(hash_dedupe) where hash_dedupe is not null;
create index if not exists tpl_comparables_busqueda_idx on public.tpl_comparables_mercado(region, comuna, tipo_activo, superficie_terreno_m2);
create index if not exists tpl_comparables_casa_idx on public.tpl_comparables_mercado(comuna, tiene_casa, superficie_construida_m2, dormitorios);

create table if not exists public.tpl_fuentes_mercado (
  id uuid primary key default gen_random_uuid(),
  fuente text not null,
  url text not null unique,
  region text,
  estado text not null default 'pendiente',
  ultima_revision timestamptz,
  observaciones text,
  created_at timestamptz not null default now()
);

insert into public.tpl_fuentes_mercado(fuente,url,region) values
('PortalTerreno','https://portalterreno.cl/terrenos-en-venta-en-biobio','Biobío'),
('PortalInmobiliario','https://www.portalinmobiliario.com/venta/parcela/biobio','Biobío'),
('Yapo','https://www.yapo.cl/searchresult/bienes-raices-venta-de-propiedades?q=keyword.parcela&regionslug=biobio','Biobío')
on conflict(url) do nothing;

create or replace function public.tpl_tipo_activo_por_superficie(p_m2 numeric)
returns text language sql immutable as $$
  select case when coalesce(p_m2,0)>=40000 then 'predio'
              when coalesce(p_m2,0)>=10000 then 'campo'
              else 'parcela' end;
$$;

create or replace function public.tpl_resumen_comparables_v1(p_entrada jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_comuna text:=coalesce(p_entrada->>'comuna','');
  v_area numeric:=nullif(p_entrada->>'superficie_terreno_m2','')::numeric;
  v_casa boolean:=coalesce((p_entrada->>'tiene_casa')::boolean,false);
  v_m2c numeric:=nullif(p_entrada->>'superficie_construida_m2','')::numeric;
  v_dorm integer:=nullif(p_entrada->>'dormitorios','')::integer;
  v_tipo text:=public.tpl_tipo_activo_por_superficie(v_area);
  v_result jsonb;
begin
  with base as (
    select *,
      case
        when v_casa and superficie_construida_m2 is not null and v_m2c is not null
          then abs(superficie_construida_m2-v_m2c)/greatest(v_m2c,1)
        else 0 end as distancia_casa,
      case when v_dorm is not null and dormitorios is not null then abs(dormitorios-v_dorm) else 0 end as distancia_dorm
    from public.tpl_comparables_mercado
    where estado in ('observado','validado') and not es_outlier
      and lower(unaccent(comuna))=lower(unaccent(v_comuna))
      and tipo_activo=v_tipo
      and tiene_casa=v_casa
      and superficie_terreno_m2 between v_area*.70 and v_area*1.30
      and (not v_casa or v_m2c is null or superficie_construida_m2 between greatest(20,v_m2c-20) and v_m2c+20)
      and (not v_casa or v_dorm is null or dormitorios is null or dormitorios between greatest(0,v_dorm-1) and v_dorm+1)
      and precio_clp>0
  ), stats as (
    select count(*) n,
      percentile_cont(.5) within group(order by precio_clp)::bigint mediana_total,
      percentile_cont(.25) within group(order by precio_clp)::bigint p25_total,
      percentile_cont(.75) within group(order by precio_clp)::bigint p75_total,
      percentile_cont(.5) within group(order by valor_terreno_m2)::numeric mediana_terreno_m2,
      percentile_cont(.5) within group(order by case when v_casa and superficie_construida_m2>0 then precio_clp/superficie_construida_m2 end)::numeric mediana_bruta_casa_m2
    from base
  )
  select jsonb_build_object(
    'ok',true,'comuna',v_comuna,'tipo_activo',v_tipo,'tiene_casa',v_casa,
    'criterios',jsonb_build_object('terreno_m2',v_area,'casa_m2',v_m2c,'dormitorios',v_dorm,'rango_casa_m2',case when v_casa then jsonb_build_array(greatest(20,v_m2c-20),v_m2c+20) end),
    'cantidad',n,'mediana_total',mediana_total,'p25_total',p25_total,'p75_total',p75_total,
    'mediana_terreno_m2',round(mediana_terreno_m2),
    'mediana_bruta_casa_m2',round(mediana_bruta_casa_m2),
    'confianza',case when n>=15 then 'alta' when n>=10 then 'media-alta' when n>=5 then 'media' when n>=3 then 'baja' else 'insuficiente' end,
    'peso_sugerido',case when n>=15 then .25 when n>=10 then .20 when n>=5 then .10 else 0 end
  ) into v_result from stats;
  return coalesce(v_result,jsonb_build_object('ok',true,'cantidad',0,'confianza','insuficiente','peso_sugerido',0));
end; $$;

grant execute on function public.tpl_resumen_comparables_v1(jsonb) to anon, authenticated;

create or replace view public.tpl_estadisticas_comunales as
select region,comuna,tipo_activo,tiene_casa,
 count(*) filter(where not es_outlier and precio_clp>0) cantidad,
 percentile_cont(.5) within group(order by valor_terreno_m2) filter(where not es_outlier and valor_terreno_m2>0) mediana_terreno_m2,
 percentile_cont(.25) within group(order by valor_terreno_m2) filter(where not es_outlier and valor_terreno_m2>0) p25_terreno_m2,
 percentile_cont(.75) within group(order by valor_terreno_m2) filter(where not es_outlier and valor_terreno_m2>0) p75_terreno_m2,
 percentile_cont(.5) within group(order by valor_hectarea) filter(where not es_outlier and valor_hectarea>0) mediana_hectarea,
 min(fecha_captura) primera_captura,max(fecha_captura) ultima_captura
from public.tpl_comparables_mercado
group by region,comuna,tipo_activo,tiene_casa;

grant select on public.tpl_estadisticas_comunales to authenticated;

alter table public.tpl_comparables_mercado enable row level security;
drop policy if exists tpl_comparables_staff_select on public.tpl_comparables_mercado;
create policy tpl_comparables_staff_select on public.tpl_comparables_mercado for select to authenticated using(public.tpl_es_staff());
grant select on public.tpl_comparables_mercado to authenticated;

commit;
