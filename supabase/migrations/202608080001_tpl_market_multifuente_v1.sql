create extension if not exists pg_trgm with schema extensions;

-- TPL MARKET INTELLIGENCE · MULTIFUENTE V1
-- 2026-08-08

create or replace function public.tpl_market_firma_multifuente_v1(
  p_comuna text,
  p_zona text,
  p_sector text,
  p_superficie_m2 numeric,
  p_tipo_tpl text,
  p_titulo text
)
returns text
language sql
immutable
as $$
select
  public.tpl_market_normalizar_texto_v1(coalesce(p_comuna,'')) || '|' ||
  public.tpl_market_normalizar_texto_v1(coalesce(p_zona,'')) || '|' ||
  public.tpl_market_normalizar_texto_v1(coalesce(p_sector,'')) || '|' ||
  coalesce(round(coalesce(p_superficie_m2,0)/250.0)*250,0)::text || '|' ||
  public.tpl_market_normalizar_texto_v1(coalesce(p_tipo_tpl,'')) || '|' ||
  left(public.tpl_market_normalizar_texto_v1(coalesce(p_titulo,'')),60);
$$;

drop view if exists public.tpl_market_matches_multifuente_v1 cascade;
drop view if exists public.tpl_market_publicaciones_multifuente_v1 cascade;

create or replace view public.tpl_market_publicaciones_multifuente_v1 as
select
  a.*,
  public.tpl_market_firma_multifuente_v1(
    a.comuna,
    a.zona,
    a.sector,
    a.superficie_m2,
    a.tipo_tpl,
    a.titulo
  ) as firma_multifuente
from public.tpl_market_publicaciones_actuales_v1 a;

create or replace view public.tpl_market_matches_multifuente_v1 as
with p as (
  select *
  from public.tpl_market_publicaciones_multifuente_v1
  where estado='activa'
    and coalesce(superficie_m2,0)>0
    and coalesce(precio_clp,0)>0
),
pares as (
  select
    a.publicacion_id as publicacion_a_id,
    b.publicacion_id as publicacion_b_id,
    a.propiedad_id as propiedad_a_id,
    b.propiedad_id as propiedad_b_id,
    a.fuente_codigo as fuente_a,
    b.fuente_codigo as fuente_b,
    a.comuna,
    a.zona as zona_a,
    b.zona as zona_b,
    a.sector as sector_a,
    b.sector as sector_b,
    a.superficie_m2 as superficie_a_m2,
    b.superficie_m2 as superficie_b_m2,
    a.precio_clp as precio_a_clp,
    b.precio_clp as precio_b_clp,
    a.titulo as titulo_a,
    b.titulo as titulo_b,
    case
      when greatest(a.superficie_m2,b.superficie_m2)>0
      then abs(a.superficie_m2-b.superficie_m2)/greatest(a.superficie_m2,b.superficie_m2)
      else 1
    end as diff_superficie_ratio,
    case
      when greatest(a.precio_clp,b.precio_clp)>0
      then abs(a.precio_clp-b.precio_clp)/greatest(a.precio_clp,b.precio_clp)
      else 1
    end as diff_precio_ratio,
    case
      when public.tpl_market_normalizar_texto_v1(coalesce(a.zona,''))
         = public.tpl_market_normalizar_texto_v1(coalesce(b.zona,''))
       and nullif(public.tpl_market_normalizar_texto_v1(coalesce(a.zona,'')),'') is not null
      then 1 else 0
    end as misma_zona,
    case
      when public.tpl_market_normalizar_texto_v1(coalesce(a.sector,''))
         = public.tpl_market_normalizar_texto_v1(coalesce(b.sector,''))
       and nullif(public.tpl_market_normalizar_texto_v1(coalesce(a.sector,'')),'') is not null
      then 1 else 0
    end as mismo_sector,
    extensions.similarity(
      public.tpl_market_normalizar_texto_v1(coalesce(a.titulo,'')),
      public.tpl_market_normalizar_texto_v1(coalesce(b.titulo,''))
    ) as similitud_titulo
  from p a
  join p b
    on a.publicacion_id < b.publicacion_id
   and a.fuente_codigo <> b.fuente_codigo
   and public.tpl_market_normalizar_texto_v1(a.comuna)
       = public.tpl_market_normalizar_texto_v1(b.comuna)
   and a.tipo_tpl=b.tipo_tpl
)
select *,
  round((
    35 * greatest(0,1-diff_superficie_ratio) +
    25 * greatest(0,1-diff_precio_ratio) +
    15 * misma_zona +
    10 * mismo_sector +
    15 * greatest(0,least(1,similitud_titulo))
  )::numeric,1) as score_match
from pares
where diff_superficie_ratio <= 0.10
  and diff_precio_ratio <= 0.25;
