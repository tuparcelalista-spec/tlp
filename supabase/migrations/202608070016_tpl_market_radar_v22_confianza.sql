-- ============================================================
-- TPL MARKET INTELLIGENCE · RADAR V2.2
-- Interpretación comercial condicionada por tamaño de muestra
-- Mantiene intactos V1, V2 y V2.1
-- ============================================================

create or replace function public.tpl_market_radar_v22(
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
with r as (
  select public.tpl_market_radar_v21(
    p_comuna,
    p_tipo_tpl,
    p_precio_clp,
    p_superficie_m2,
    p_zona,
    p_sector,
    p_tolerancia_superficie_pct,
    p_min_comparables
  ) as j
),
x as (
  select
    j,
    coalesce((j->>'comparables')::int,0) as n,
    (j->>'p25_clp')::numeric as p25,
    (j->>'p75_clp')::numeric as p75,
    (j->>'p90_clp')::numeric as p90,
    (j->>'minimo_clp')::numeric as minimo,
    (j->>'maximo_clp')::numeric as maximo
  from r
),
interpretacion as (
  select *,
    case
      when n < 3 then 'insuficiente'
      when n < 5 then 'baja'
      when n < 8 then 'media-baja'
      when n < 15 then 'media'
      when n < 30 then 'media-alta'
      else 'alta'
    end as confianza_v22,
    case
      when p_precio_clp is null or n=0 then null

      -- Con muestra reducida evitamos "económico/premium".
      when n < 5 and minimo is not null and p_precio_clp < minimo
        then 'bajo_rango_observado'
      when n < 5 and maximo is not null and p_precio_clp > maximo
        then 'sobre_rango_observado'
      when n < 5
        then 'dentro_rango_observado'

      -- Con 5+ comparables ya permitimos bandas descriptivas.
      when p25 is not null and p_precio_clp < p25
        then 'economico'
      when p75 is not null and p_precio_clp <= p75
        then 'intermedio'
      when p90 is not null and p_precio_clp <= p90
        then 'alto'
      else 'premium'
    end as clasificacion_v22,
    case
      when n < 3 then 'muestra_insuficiente'
      when n < 5 then 'muestra_reducida'
      when n < 8 then 'interpretar_con_cautela'
      else null
    end as advertencia_v22
  from x
)
select
  (j
    - 'version'
    - 'confianza'
    - 'clasificacion_precio')
  ||
  jsonb_build_object(
    'version','tpl_market_radar_v2.2',
    'confianza',confianza_v22,
    'clasificacion_precio',clasificacion_v22,
    'advertencia',advertencia_v22,
    'es_tasacion_definitiva',false,
    'naturaleza_resultado','posicionamiento_frente_a_publicaciones_comparables',
    'interpretacion',
      case
        when n < 3 then 'No hay suficientes comparables para interpretar el precio.'
        when n < 5 and clasificacion_v22='bajo_rango_observado'
          then 'El precio está bajo el rango observado, pero la muestra es reducida.'
        when n < 5 and clasificacion_v22='sobre_rango_observado'
          then 'El precio está sobre el rango observado, pero la muestra es reducida.'
        when n < 5
          then 'El precio está dentro del rango observado, pero la muestra es reducida.'
        when clasificacion_v22='economico'
          then 'El precio se ubica en la banda económica de las publicaciones comparables.'
        when clasificacion_v22='intermedio'
          then 'El precio se ubica en la banda intermedia de las publicaciones comparables.'
        when clasificacion_v22='alto'
          then 'El precio se ubica en la banda alta de las publicaciones comparables.'
        when clasificacion_v22='premium'
          then 'El precio se ubica en la banda premium de las publicaciones comparables.'
      end
  )
from interpretacion;
$$;

revoke all on function public.tpl_market_radar_v22(
  text,text,numeric,numeric,text,text,numeric,integer
) from public;

grant execute on function public.tpl_market_radar_v22(
  text,text,numeric,numeric,text,text,numeric,integer
) to authenticated,service_role;

-- ------------------------------------------------------------
-- Auditoría rápida del motor
-- ------------------------------------------------------------
create or replace function public.tpl_market_estado_radar_v22()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'version','tpl_market_radar_v2.2',
  'radar_v1',to_regprocedure('public.tpl_market_radar_v1(text,text,numeric,numeric,text,text,numeric)') is not null,
  'radar_v2',to_regprocedure('public.tpl_market_radar_v2(text,text,numeric,numeric,text,text,numeric,integer)') is not null,
  'radar_v21',to_regprocedure('public.tpl_market_radar_v21(text,text,numeric,numeric,text,text,numeric,integer)') is not null,
  'radar_v22',to_regprocedure('public.tpl_market_radar_v22(text,text,numeric,numeric,text,text,numeric,integer)') is not null,
  'duplicados_auditoria',to_regprocedure('public.tpl_market_auditoria_duplicados_v1()') is not null,
  'modo','RADAR_INTELIGENTE_ACTIVO',
  'generado_at',now()
);
$$;

revoke all on function public.tpl_market_estado_radar_v22() from public;
grant execute on function public.tpl_market_estado_radar_v22()
to authenticated,service_role;

-- ------------------------------------------------------------
-- Pruebas
-- ------------------------------------------------------------
select public.tpl_market_estado_radar_v22();

select public.tpl_market_radar_v22(
  'Chillán','parcela',40000000,5000,null,null,20,5
);

select public.tpl_market_radar_v22(
  'Chillán','parcela',40000000,5000,'Capilla Cox',null,20,3
);

select public.tpl_market_radar_v22(
  'Paine','parcela',60000000,5000,null,null,20,5
);
