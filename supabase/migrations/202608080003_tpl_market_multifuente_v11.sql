-- ============================================================
-- TPL MARKET INTELLIGENCE · MULTIFUENTE V1.1
-- Matching inmobiliario explicable entre portales
-- 2026-08-08
-- Mantiene intacto Multifuente V1
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------------------
-- 1) Vista de diagnóstico detallado de pares entre fuentes
-- ------------------------------------------------------------
create or replace view public.tpl_market_matches_multifuente_v11 as
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
    a.url as url_a,
    b.url as url_b,

    case
      when greatest(a.superficie_m2,b.superficie_m2)>0
      then abs(a.superficie_m2-b.superficie_m2)
           / greatest(a.superficie_m2,b.superficie_m2)
      else 1
    end as diff_superficie_ratio,

    case
      when greatest(a.precio_clp,b.precio_clp)>0
      then abs(a.precio_clp-b.precio_clp)
           / greatest(a.precio_clp,b.precio_clp)
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
select
  *,
  round((40 * greatest(0,1-diff_superficie_ratio))::numeric,1) as score_superficie,
  round((25 * greatest(0,1-diff_precio_ratio))::numeric,1) as score_precio,
  round((15 * misma_zona)::numeric,1) as score_zona,
  round((10 * mismo_sector)::numeric,1) as score_sector,
  round((10 * greatest(0,least(1,similitud_titulo)))::numeric,1) as score_titulo,
  round((
      40 * greatest(0,1-diff_superficie_ratio)
    + 25 * greatest(0,1-diff_precio_ratio)
    + 15 * misma_zona
    + 10 * mismo_sector
    + 10 * greatest(0,least(1,similitud_titulo))
  )::numeric,1) as score_match,
  case
    when (
      40 * greatest(0,1-diff_superficie_ratio)
    + 25 * greatest(0,1-diff_precio_ratio)
    + 15 * misma_zona
    + 10 * mismo_sector
    + 10 * greatest(0,least(1,similitud_titulo))
    ) >= 90 then 'muy_fuerte'
    when (
      40 * greatest(0,1-diff_superficie_ratio)
    + 25 * greatest(0,1-diff_precio_ratio)
    + 15 * misma_zona
    + 10 * mismo_sector
    + 10 * greatest(0,least(1,similitud_titulo))
    ) >= 80 then 'probable'
    when (
      40 * greatest(0,1-diff_superficie_ratio)
    + 25 * greatest(0,1-diff_precio_ratio)
    + 15 * misma_zona
    + 10 * mismo_sector
    + 10 * greatest(0,least(1,similitud_titulo))
    ) >= 65 then 'revisar'
    else 'bajo'
  end as nivel_match
from pares
where diff_superficie_ratio <= 0.15
  and diff_precio_ratio <= 0.35;

-- ------------------------------------------------------------
-- 2) Auditoría V1.1
-- ------------------------------------------------------------
create or replace function public.tpl_market_auditoria_multifuente_v11()
returns jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
select jsonb_build_object(
  'generado_at',now(),
  'publicaciones_totales',(select count(*) from public.tpl_market_publicaciones),
  'propiedades_canonicas',(select count(*) from public.tpl_market_propiedades),
  'fuentes_activas',(select count(*) from public.tpl_market_fuentes where activo=true),
  'pares_evaluados',(select count(*) from public.tpl_market_matches_multifuente_v11),
  'muy_fuertes',(select count(*) from public.tpl_market_matches_multifuente_v11 where nivel_match='muy_fuerte'),
  'probables',(select count(*) from public.tpl_market_matches_multifuente_v11 where nivel_match='probable'),
  'revisar',(select count(*) from public.tpl_market_matches_multifuente_v11 where nivel_match='revisar'),
  'modo','MATCHING_EXPLICABLE_NO_FUSIONA'
);
$$;

-- ------------------------------------------------------------
-- 3) Sugerencias explicables
-- ------------------------------------------------------------
create or replace function public.tpl_market_sugerencias_canonizacion_v11(
  p_score_min numeric default 65,
  p_limite integer default 100
)
returns jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
select jsonb_build_object(
  'score_min',p_score_min,
  'limite',p_limite,
  'candidatos',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'nivel_match',nivel_match,
        'score_match',score_match,
        'publicacion_a_id',publicacion_a_id,
        'publicacion_b_id',publicacion_b_id,
        'propiedad_a_id',propiedad_a_id,
        'propiedad_b_id',propiedad_b_id,
        'fuente_a',fuente_a,
        'fuente_b',fuente_b,
        'comuna',comuna,
        'zona_a',zona_a,
        'zona_b',zona_b,
        'sector_a',sector_a,
        'sector_b',sector_b,
        'superficie_a_m2',superficie_a_m2,
        'superficie_b_m2',superficie_b_m2,
        'precio_a_clp',precio_a_clp,
        'precio_b_clp',precio_b_clp,
        'titulo_a',titulo_a,
        'titulo_b',titulo_b,
        'url_a',url_a,
        'url_b',url_b,
        'diagnostico',
          jsonb_build_object(
            'score_superficie',score_superficie,
            'score_precio',score_precio,
            'score_zona',score_zona,
            'score_sector',score_sector,
            'score_titulo',score_titulo,
            'diff_superficie_pct',round((diff_superficie_ratio*100)::numeric,1),
            'diff_precio_pct',round((diff_precio_ratio*100)::numeric,1),
            'similitud_titulo',round((similitud_titulo*100)::numeric,1)
          )
      )
      order by score_match desc
    ),
    '[]'::jsonb
  )
)
from (
  select *
  from public.tpl_market_matches_multifuente_v11
  where score_match>=p_score_min
  order by score_match desc
  limit greatest(p_limite,1)
) q;
$$;

-- ------------------------------------------------------------
-- 4) Seguridad
-- ------------------------------------------------------------
revoke all on function public.tpl_market_auditoria_multifuente_v11() from public;
revoke all on function public.tpl_market_sugerencias_canonizacion_v11(numeric,integer) from public;

grant execute on function public.tpl_market_auditoria_multifuente_v11()
to authenticated,service_role;

grant execute on function public.tpl_market_sugerencias_canonizacion_v11(numeric,integer)
to authenticated,service_role;

grant select on public.tpl_market_matches_multifuente_v11
to authenticated,service_role;

-- ------------------------------------------------------------
-- 5) Pruebas
-- ------------------------------------------------------------
select public.tpl_market_auditoria_multifuente_v11();

select public.tpl_market_sugerencias_canonizacion_v11(65,50);

select public.tpl_market_sugerencias_canonizacion_v11(80,50);
