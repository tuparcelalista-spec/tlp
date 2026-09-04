-- ============================================================
-- TPL MARKET INTELLIGENCE · RADAR V2.1 + DUPLICADOS
-- 2026-08-07
-- Mantiene intactos radar_v1 y radar_v2
-- ============================================================

-- ------------------------------------------------------------
-- 1) Firma de similitud de mercado
--    No elimina registros. Solo crea una clave para detectar avisos
--    que podrían representar el mismo proyecto/lote repetido.
-- ------------------------------------------------------------
create or replace function public.tpl_market_firma_comparable_v1(
  p_comuna text,
  p_zona text,
  p_sector text,
  p_superficie_m2 numeric,
  p_precio_clp numeric,
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
  coalesce(round(coalesce(p_superficie_m2,0)/100.0)*100,0)::text || '|' ||
  coalesce(round(coalesce(p_precio_clp,0)/500000.0)*500000,0)::text || '|' ||
  left(public.tpl_market_normalizar_texto_v1(coalesce(p_titulo,'')),80);
$$;

-- ------------------------------------------------------------
-- 2) Auditoría de duplicados/similitudes
-- ------------------------------------------------------------
create or replace view public.tpl_market_duplicados_probables_v1 as
with x as (
  select
    a.*,
    public.tpl_market_firma_comparable_v1(
      a.comuna,a.zona,a.sector,a.superficie_m2,a.precio_clp,a.titulo
    ) as firma
  from public.tpl_market_publicaciones_actuales_v1 a
  where a.estado='activa'
    and coalesce(a.precio_clp,0)>0
    and coalesce(a.superficie_m2,0)>0
)
select
  firma,
  comuna,
  zona,
  sector,
  tipo_tpl,
  count(*)::int as cantidad,
  min(precio_clp) as precio_min_clp,
  max(precio_clp) as precio_max_clp,
  min(superficie_m2) as superficie_min_m2,
  max(superficie_m2) as superficie_max_m2,
  jsonb_agg(
    jsonb_build_object(
      'publicacion_id',publicacion_id,
      'fuente',fuente_codigo,
      'titulo',titulo,
      'precio_clp',precio_clp,
      'superficie_m2',superficie_m2,
      'url',url
    )
    order by fuente_codigo,titulo
  ) as publicaciones
from x
group by firma,comuna,zona,sector,tipo_tpl
having count(*) > 1;

-- ------------------------------------------------------------
-- 3) Resumen de auditoría de duplicados
-- ------------------------------------------------------------
create or replace function public.tpl_market_auditoria_duplicados_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'generado_at',now(),
  'grupos_probables',(select count(*) from public.tpl_market_duplicados_probables_v1),
  'publicaciones_en_grupos',
    coalesce((select sum(cantidad) from public.tpl_market_duplicados_probables_v1),0),
  'exceso_potencial',
    coalesce((select sum(cantidad-1) from public.tpl_market_duplicados_probables_v1),0),
  'modo','AUDITORIA_NO_ELIMINA_REGISTROS'
);
$$;

-- ------------------------------------------------------------
-- 4) Radar V2.1
--    - misma comuna + tipo
--    - superficie similar
--    - zona/sector si hay muestra suficiente
--    - colapsa duplicados probables a 1 peso de mercado
--    - IQR sobre precio/m2 dentro del segmento
--    - bandas económicas/intermedias/altas
-- ------------------------------------------------------------
create or replace function public.tpl_market_radar_v21(
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
      when a.superficie_m2>0 and a.precio_clp>0
      then a.precio_clp/a.superficie_m2
    end as precio_m2,
    public.tpl_market_firma_comparable_v1(
      a.comuna,a.zona,a.sector,a.superficie_m2,a.precio_clp,a.titulo
    ) as firma
  from public.tpl_market_publicaciones_actuales_v1 a
  where a.estado='activa'
    and coalesce(a.precio_clp,0)>0
    and public.tpl_market_normalizar_texto_v1(a.comuna)
        = public.tpl_market_normalizar_texto_v1(p_comuna)
    and a.tipo_tpl=p_tipo_tpl
    and (
      coalesce(p_superficie_m2,0)<=0
      or coalesce(a.superficie_m2,0)<=0
      or a.superficie_m2 between
        p_superficie_m2*(1-p_tolerancia_superficie_pct/100.0)
        and
        p_superficie_m2*(1+p_tolerancia_superficie_pct/100.0)
    )
),
zona_exacta as (
  select *
  from base
  where nullif(public.tpl_market_normalizar_texto_v1(p_zona),'') is not null
    and public.tpl_market_normalizar_texto_v1(coalesce(zona,''))
        = public.tpl_market_normalizar_texto_v1(p_zona)
    and (
      nullif(public.tpl_market_normalizar_texto_v1(p_sector),'') is null
      or public.tpl_market_normalizar_texto_v1(coalesce(sector,''))
          = public.tpl_market_normalizar_texto_v1(p_sector)
    )
),
scope_choice as (
  select case
    when nullif(public.tpl_market_normalizar_texto_v1(p_zona),'') is not null
         and (select count(*) from zona_exacta)>=p_min_comparables
      then 'zona_sector'
    else 'comuna'
  end alcance
),
seleccion_bruta as (
  select * from zona_exacta
  where (select alcance from scope_choice)='zona_sector'
  union all
  select * from base
  where (select alcance from scope_choice)='comuna'
),
-- Un grupo de publicaciones casi idénticas pesa una vez.
seleccion_unica as (
  select distinct on (firma)
    *
  from seleccion_bruta
  order by firma,capturado_at desc nulls last,publicacion_id
),
stats_pre as (
  select
    count(*)::int n,
    percentile_cont(0.25) within group(order by precio_m2) p25_m2,
    percentile_cont(0.50) within group(order by precio_m2) mediana_m2,
    percentile_cont(0.75) within group(order by precio_m2) p75_m2
  from seleccion_unica
  where precio_m2 is not null
),
iqr as (
  select n,p25_m2,mediana_m2,p75_m2,(p75_m2-p25_m2) rango_iqr
  from stats_pre
),
depurados as (
  select s.*
  from seleccion_unica s
  cross join iqr
  where
    iqr.n<4
    or s.precio_m2 is null
    or iqr.rango_iqr is null
    or iqr.rango_iqr=0
    or s.precio_m2 between
      greatest(0,iqr.p25_m2-1.5*iqr.rango_iqr)
      and iqr.p75_m2+1.5*iqr.rango_iqr
),
stats as (
  select
    count(*)::int n,
    min(precio_clp) minimo,
    percentile_cont(0.10) within group(order by precio_clp) p10,
    percentile_cont(0.25) within group(order by precio_clp) p25,
    percentile_cont(0.50) within group(order by precio_clp) mediana,
    avg(precio_clp) promedio,
    percentile_cont(0.75) within group(order by precio_clp) p75,
    percentile_cont(0.90) within group(order by precio_clp) p90,
    max(precio_clp) maximo,
    percentile_cont(0.50) within group(order by precio_m2) mediana_m2,
    avg(precio_m2) promedio_m2,
    count(*) filter(where precio_clp<p_precio_clp)::int mas_baratas
  from depurados
),
dup_stats as (
  select
    count(*)::int publicaciones_brutas,
    count(distinct firma)::int comparables_unicos
  from seleccion_bruta
)
select jsonb_build_object(
  'version','tpl_market_radar_v2.1',
  'comuna',p_comuna,
  'zona',p_zona,
  'sector',p_sector,
  'tipo_tpl',p_tipo_tpl,
  'alcance_usado',(select alcance from scope_choice),
  'publicaciones_brutas',(select publicaciones_brutas from dup_stats),
  'comparables_unicos_pre_filtro',(select comparables_unicos from dup_stats),
  'duplicados_colapsados',
    (select publicaciones_brutas-comparables_unicos from dup_stats),
  'comparables_descartados_por_iqr',
    (select count(*) from seleccion_unica)-(select count(*) from depurados),
  'comparables',n,
  'minimo_clp',round(minimo),
  'p10_clp',round(p10),
  'p25_clp',round(p25),
  'mediana_clp',round(mediana),
  'promedio_clp',round(promedio),
  'p75_clp',round(p75),
  'p90_clp',round(p90),
  'maximo_clp',round(maximo),
  'mediana_m2_clp',round(mediana_m2),
  'promedio_m2_clp',round(promedio_m2),
  'bandas',
    jsonb_build_object(
      'economica_hasta_clp',round(p25),
      'intermedia_desde_clp',round(p25),
      'intermedia_hasta_clp',round(p75),
      'alta_desde_clp',round(p75),
      'premium_referencia_clp',round(p90)
    ),
  'posicion_por_precio',
    case when p_precio_clp>0 then mas_baratas+1 end,
  'total_incluyendo_consultada',
    case when p_precio_clp>0 then n+1 end,
  'diferencia_vs_mediana_pct',
    case when coalesce(mediana,0)>0 and p_precio_clp>0
      then round((((p_precio_clp-mediana)/mediana)*100)::numeric,1)
    end,
  'clasificacion_precio',
    case
      when p_precio_clp is null or n=0 then null
      when p_precio_clp < p25 then 'económico'
      when p_precio_clp <= p75 then 'intermedio'
      when p_precio_clp <= p90 then 'alto'
      else 'premium'
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
      'zona_sector_solo_si_hay_muestra',true,
      'duplicados_colapsados',true,
      'depuracion','IQR precio_m2 posterior a segmentación'
    )
)
from stats;
$$;

-- ------------------------------------------------------------
-- 5) Seguridad
-- ------------------------------------------------------------
revoke all on function public.tpl_market_firma_comparable_v1(text,text,text,numeric,numeric,text) from public;
revoke all on function public.tpl_market_auditoria_duplicados_v1() from public;
revoke all on function public.tpl_market_radar_v21(text,text,numeric,numeric,text,text,numeric,integer) from public;

grant execute on function public.tpl_market_firma_comparable_v1(text,text,text,numeric,numeric,text)
  to authenticated,service_role;
grant execute on function public.tpl_market_auditoria_duplicados_v1()
  to authenticated,service_role;
grant execute on function public.tpl_market_radar_v21(text,text,numeric,numeric,text,text,numeric,integer)
  to authenticated,service_role;
grant select on public.tpl_market_duplicados_probables_v1
  to authenticated,service_role;

-- ------------------------------------------------------------
-- 6) Pruebas de control
-- ------------------------------------------------------------
select public.tpl_market_auditoria_duplicados_v1();

select public.tpl_market_radar_v21(
  'Chillán','parcela',40000000,5000,null,null,20,5
);

select public.tpl_market_radar_v21(
  'Chillán','parcela',40000000,5000,'Capilla Cox',null,20,3
);

select public.tpl_market_radar_v21(
  'Paine','parcela',60000000,5000,null,null,20,5
);
