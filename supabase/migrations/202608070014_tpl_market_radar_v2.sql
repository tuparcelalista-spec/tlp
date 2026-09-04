-- ============================================================
-- TPL MARKET INTELLIGENCE · RADAR V2
-- Comparables inteligentes por territorio + superficie + precio/m2
-- 2026-08-07
-- Mantiene intacto tpl_market_radar_v1
-- ============================================================

create or replace function public.tpl_market_radar_v2(
  p_comuna text,
  p_tipo_tpl text,
  p_precio_clp numeric,
  p_superficie_m2 numeric,
  p_zona text default null,
  p_sector text default null,
  p_tolerancia_superficie_pct numeric default 20,
  p_min_comparables integer default 5
)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
with base as (
  select
    a.*,
    case
      when p_superficie_m2 > 0 and a.superficie_m2 > 0
        then abs(a.superficie_m2 - p_superficie_m2) / p_superficie_m2
      else null
    end as diferencia_superficie_ratio,
    case
      when a.superficie_m2 > 0 and a.precio_clp > 0
        then a.precio_clp / a.superficie_m2
      else null
    end as precio_m2
  from public.tpl_market_publicaciones_actuales_v1 a
  where a.estado='activa'
    and coalesce(a.precio_clp,0)>0
    and public.tpl_market_normalizar_texto_v1(a.comuna)
        = public.tpl_market_normalizar_texto_v1(p_comuna)
    and a.tipo_tpl=p_tipo_tpl
),
segmento_estricto as (
  select *
  from base
  where (
    coalesce(p_superficie_m2,0)<=0
    or coalesce(superficie_m2,0)<=0
    or superficie_m2 between
      p_superficie_m2*(1-p_tolerancia_superficie_pct/100.0)
      and
      p_superficie_m2*(1+p_tolerancia_superficie_pct/100.0)
  )
  and (
    nullif(public.tpl_market_normalizar_texto_v1(p_zona),'') is null
    or public.tpl_market_normalizar_texto_v1(coalesce(zona,''))
       = public.tpl_market_normalizar_texto_v1(p_zona)
  )
  and (
    nullif(public.tpl_market_normalizar_texto_v1(p_sector),'') is null
    or public.tpl_market_normalizar_texto_v1(coalesce(sector,''))
       = public.tpl_market_normalizar_texto_v1(p_sector)
  )
),
segmento_comuna as (
  select *
  from base
  where (
    coalesce(p_superficie_m2,0)<=0
    or coalesce(superficie_m2,0)<=0
    or superficie_m2 between
      p_superficie_m2*(1-p_tolerancia_superficie_pct/100.0)
      and
      p_superficie_m2*(1+p_tolerancia_superficie_pct/100.0)
  )
),
seleccion as (
  select *
  from segmento_estricto
  where (select count(*) from segmento_estricto) >= p_min_comparables

  union all

  select *
  from segmento_comuna
  where (select count(*) from segmento_estricto) < p_min_comparables
),
stats_pre as (
  select
    count(*)::int n,
    percentile_cont(0.25) within group(order by precio_m2) p25_m2,
    percentile_cont(0.50) within group(order by precio_m2) mediana_m2,
    percentile_cont(0.75) within group(order by precio_m2) p75_m2
  from seleccion
  where precio_m2 is not null
),
iqr as (
  select
    n,
    p25_m2,
    mediana_m2,
    p75_m2,
    (p75_m2-p25_m2) as rango_iqr
  from stats_pre
),
depurados as (
  select s.*
  from seleccion s
  cross join iqr
  where
    iqr.n < 4
    or s.precio_m2 is null
    or iqr.rango_iqr is null
    or iqr.rango_iqr = 0
    or s.precio_m2 between
       greatest(0, iqr.p25_m2 - 1.5*iqr.rango_iqr)
       and
       iqr.p75_m2 + 1.5*iqr.rango_iqr
),
stats as (
  select
    count(*)::int n,
    min(precio_clp) minimo,
    percentile_cont(0.25) within group(order by precio_clp) p25,
    percentile_cont(0.50) within group(order by precio_clp) mediana,
    avg(precio_clp) promedio,
    percentile_cont(0.75) within group(order by precio_clp) p75,
    max(precio_clp) maximo,
    percentile_cont(0.50) within group(order by precio_m2) mediana_m2,
    avg(precio_m2) promedio_m2,
    count(*) filter(where precio_clp < p_precio_clp)::int mas_baratas
  from depurados
),
scope as (
  select case
    when (select count(*) from segmento_estricto) >= p_min_comparables
      then 'zona_sector'
    else 'comuna'
  end as alcance
)
select jsonb_build_object(
  'version','tpl_market_radar_v2',
  'comuna',p_comuna,
  'zona',p_zona,
  'sector',p_sector,
  'tipo_tpl',p_tipo_tpl,
  'alcance_usado',(select alcance from scope),
  'comparables_pre_filtro',(select count(*) from seleccion),
  'comparables_descartados',(select count(*) from seleccion)-(select count(*) from depurados),
  'comparables',n,
  'minimo_clp',round(minimo),
  'p25_clp',round(p25),
  'mediana_clp',round(mediana),
  'promedio_clp',round(promedio),
  'p75_clp',round(p75),
  'maximo_clp',round(maximo),
  'mediana_m2_clp',round(mediana_m2),
  'promedio_m2_clp',round(promedio_m2),
  'posicion_por_precio',
    case when p_precio_clp>0 then mas_baratas+1 end,
  'total_incluyendo_consultada',
    case when p_precio_clp>0 then n+1 end,
  'diferencia_vs_mediana_pct',
    case
      when coalesce(mediana,0)>0 and p_precio_clp>0
      then round((((p_precio_clp-mediana)/mediana)*100)::numeric,1)
    end,
  'confianza',
    case
      when n>=30 then 'alta'
      when n>=15 then 'media-alta'
      when n>=8 then 'media'
      when n>=5 then 'media-baja'
      when n>=3 then 'baja'
      else 'insuficiente'
    end,
  'criterio',
    jsonb_build_object(
      'misma_comuna',true,
      'mismo_tipo_tpl',true,
      'tolerancia_superficie_pct',p_tolerancia_superficie_pct,
      'zona_sector_prioritario',true,
      'fallback_comuna',true,
      'depuracion','IQR sobre precio_m2 dentro del segmento'
    )
)
from stats;
$$;

revoke all on function public.tpl_market_radar_v2(
  text,text,numeric,numeric,text,text,numeric,integer
) from public;

grant execute on function public.tpl_market_radar_v2(
  text,text,numeric,numeric,text,text,numeric,integer
) to authenticated,service_role;

-- Pruebas recomendadas:
-- Chillán 5.000 m², sin zona
select public.tpl_market_radar_v2(
  'Chillán','parcela',40000000,5000,null,null,20,5
);

-- Chillán 5.000 m², zona Capilla Cox
select public.tpl_market_radar_v2(
  'Chillán','parcela',40000000,5000,'Capilla Cox',null,20,3
);

-- Pichilemu 5.000 m²
select public.tpl_market_radar_v2(
  'Pichilemu','parcela',70000000,5000,null,null,20,5
);

-- Paine 5.000 m²
select public.tpl_market_radar_v2(
  'Paine','parcela',60000000,5000,null,null,20,5
);
