-- ============================================================
-- TPL MARKET INTELLIGENCE · MULTIFUENTE V1.3
-- Microtopónimos: la comuna NO cuenta como coincidencia de ubicación
-- 2026-08-08
-- Mantiene V1, V1.1 y V1.2
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- 1) Limpia ubicación quitando comuna y términos demasiado genéricos.
create or replace function public.tpl_market_microtexto_v13(
  p_comuna text,
  p_zona text,
  p_sector text
)
returns text
language plpgsql
immutable
set search_path=public,extensions
as $$
declare
  v text;
  c text;
begin
  v := public.tpl_market_normalizar_texto_v1(
         trim(concat_ws(' ',coalesce(p_zona,''),coalesce(p_sector,'')))
       );
  c := public.tpl_market_normalizar_texto_v1(coalesce(p_comuna,''));

  if coalesce(c,'') <> '' then
    v := regexp_replace(v, '(^|[[:space:]])' || c || '([[:space:]]|$)', ' ', 'g');
  end if;

  -- Términos genéricos que no identifican una microzona.
  v := regexp_replace(
    v,
    '(^|[[:space:]])(parcela|parcelas|terreno|terrenos|venta|vende|sector|comuna|region|lote|lotes|etapa|limite)([[:space:]]|$)',
    ' ',
    'g'
  );

  -- "ruta" o "camino" solos no sirven; sus números/nombres permanecen.
  v := regexp_replace(v, '(^|[[:space:]])(ruta|camino)([[:space:]]|$)', ' ', 'g');

  v := regexp_replace(v,'[[:space:]]+',' ','g');
  return nullif(trim(v),'');
end;
$$;

-- 2) Similitud de micro-ubicación sin contaminar por comuna.
create or replace function public.tpl_market_similitud_microzona_v13(
  p_comuna text,
  p_zona_a text,
  p_sector_a text,
  p_zona_b text,
  p_sector_b text
)
returns numeric
language sql
immutable
set search_path=public,extensions
as $$
with x as (
  select
    public.tpl_market_microtexto_v13(p_comuna,p_zona_a,p_sector_a) as a,
    public.tpl_market_microtexto_v13(p_comuna,p_zona_b,p_sector_b) as b
)
select case
  when a is null or b is null then 0
  when a=b then 1
  else greatest(
    extensions.similarity(a,b),
    -- Inclusión parcial ayuda con "Paso Hondo" vs "El Guanaco Paso Hondo",
    -- pero ya sin permitir que la comuna genere ese 75%.
    case
      when length(a)>=5 and length(b)>=5
       and (position(a in b)>0 or position(b in a)>0)
      then 0.82
      else 0
    end
  )
end::numeric
from x;
$$;

-- 3) Matching V1.3.
create or replace view public.tpl_market_matches_multifuente_v13 as
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
    public.tpl_market_microtexto_v13(a.comuna,a.zona,a.sector) as microtexto_a,
    public.tpl_market_microtexto_v13(b.comuna,b.zona,b.sector) as microtexto_b,
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

    public.tpl_market_similitud_microzona_v13(
      a.comuna,a.zona,a.sector,b.zona,b.sector
    ) as similitud_microzona,

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
),
scored as (
  select *,
    round((40 * similitud_microzona)::numeric,1) as score_microzona,
    round((30 * greatest(0,1-diff_precio_ratio))::numeric,1) as score_precio,
    round((20 * greatest(0,1-diff_superficie_ratio))::numeric,1) as score_superficie,
    round((10 * greatest(0,least(1,similitud_titulo)))::numeric,1) as score_titulo,
    round((
        40 * similitud_microzona
      + 30 * greatest(0,1-diff_precio_ratio)
      + 20 * greatest(0,1-diff_superficie_ratio)
      + 10 * greatest(0,least(1,similitud_titulo))
    )::numeric,1) as score_match
  from pares
  where diff_superficie_ratio <= 0.15
    and diff_precio_ratio <= 0.35
)
select *,
  case
    -- Sin microzona útil en ambos avisos NO puede ser match fuerte.
    when microtexto_a is null or microtexto_b is null then 'bajo'
    when score_match>=90
      and similitud_microzona>=0.90
      and diff_precio_ratio<=0.08
      and diff_superficie_ratio<=0.03
      then 'muy_fuerte'
    when score_match>=82
      and similitud_microzona>=0.78
      and diff_precio_ratio<=0.12
      and diff_superficie_ratio<=0.05
      then 'probable'
    when score_match>=68
      and similitud_microzona>=0.55
      then 'revisar'
    else 'bajo'
  end as nivel_match,
  case
    when microtexto_a is null or microtexto_b is null
      then 'sin_microzona_especifica_en_ambos'
    when similitud_microzona<0.55
      then 'microzona_no_coincidente'
    when diff_precio_ratio>0.12
      then 'precio_no_suficientemente_cercano_para_match_fuerte'
    when diff_superficie_ratio>0.05
      then 'superficie_no_suficientemente_cercana_para_match_fuerte'
    else 'sin_alerta_principal'
  end as alerta_principal
from scored;

-- 4) Aplica feedback humano previo: pares confirmados como distintos no reaparecen.
create or replace view public.tpl_market_matches_multifuente_v13_revisables as
select m.*
from public.tpl_market_matches_multifuente_v13 m
left join public.tpl_market_match_feedback f
  on f.publicacion_a_id=least(m.publicacion_a_id,m.publicacion_b_id)
 and f.publicacion_b_id=greatest(m.publicacion_a_id,m.publicacion_b_id)
where coalesce(f.resultado,'') <> 'distinta'
  and m.nivel_match in ('revisar','probable','muy_fuerte');

-- 5) Auditoría.
create or replace function public.tpl_market_auditoria_multifuente_v13()
returns jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
select jsonb_build_object(
  'version','1.3',
  'generado_at',now(),
  'pares_evaluados',(select count(*) from public.tpl_market_matches_multifuente_v13),
  'pares_sin_microzona',(select count(*) from public.tpl_market_matches_multifuente_v13 where microtexto_a is null or microtexto_b is null),
  'revisar',(select count(*) from public.tpl_market_matches_multifuente_v13_revisables where nivel_match='revisar'),
  'probables',(select count(*) from public.tpl_market_matches_multifuente_v13_revisables where nivel_match='probable'),
  'muy_fuertes',(select count(*) from public.tpl_market_matches_multifuente_v13_revisables where nivel_match='muy_fuerte'),
  'feedback_distintas',(select count(*) from public.tpl_market_match_feedback where resultado='distinta'),
  'feedback_mismas',(select count(*) from public.tpl_market_match_feedback where resultado='misma'),
  'modo','MICROTOPONIMOS_SIN_COMUNA_NO_FUSIONA'
);
$$;

-- 6) Sugerencias explicables.
create or replace function public.tpl_market_sugerencias_canonizacion_v13(
  p_nivel_min text default 'revisar',
  p_limite integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
with minimo as (
  select case p_nivel_min
    when 'muy_fuerte' then 3
    when 'probable' then 2
    else 1
  end as min_rank
),
seleccion as (
  select
    m.*,
    case m.nivel_match
      when 'muy_fuerte' then 3
      when 'probable' then 2
      when 'revisar' then 1
      else 0
    end as nivel_rank
  from public.tpl_market_matches_multifuente_v13_revisables m
  cross join minimo x
  where (
    case m.nivel_match
      when 'muy_fuerte' then 3
      when 'probable' then 2
      when 'revisar' then 1
      else 0
    end
  ) >= x.min_rank
  order by
    case m.nivel_match
      when 'muy_fuerte' then 3
      when 'probable' then 2
      when 'revisar' then 1
      else 0
    end desc,
    m.score_match desc
  limit greatest(p_limite,1)
),
objetos as (
  select
    nivel_rank,
    score_match,
    jsonb_build_object(
      'nivel_match',nivel_match,
      'score_match',score_match,
      'alerta_principal',alerta_principal,
      'publicacion_a_id',publicacion_a_id,
      'publicacion_b_id',publicacion_b_id,
      'fuente_a',fuente_a,
      'fuente_b',fuente_b,
      'comuna',comuna,
      'zona_a',zona_a,
      'zona_b',zona_b,
      'sector_a',sector_a,
      'sector_b',sector_b,
      'microtexto_a',microtexto_a,
      'microtexto_b',microtexto_b,
      'superficie_a_m2',superficie_a_m2,
      'superficie_b_m2',superficie_b_m2,
      'precio_a_clp',precio_a_clp,
      'precio_b_clp',precio_b_clp,
      'titulo_a',titulo_a,
      'titulo_b',titulo_b,
      'url_a',url_a,
      'url_b',url_b,
      'diagnostico',jsonb_build_object(
        'score_microzona',score_microzona,
        'score_precio',score_precio,
        'score_superficie',score_superficie,
        'score_titulo',score_titulo,
        'similitud_microzona_pct',round((similitud_microzona*100)::numeric,1),
        'diff_precio_pct',round((diff_precio_ratio*100)::numeric,1),
        'diff_superficie_pct',round((diff_superficie_ratio*100)::numeric,1)
      )
    ) as obj
  from seleccion
)
select jsonb_build_object(
  'version','1.3',
  'nivel_min',p_nivel_min,
  'limite',p_limite,
  'candidatos',
  coalesce(
    jsonb_agg(obj order by nivel_rank desc, score_match desc),
    '[]'::jsonb
  )
)
from objetos;
$$;

revoke all on function public.tpl_market_microtexto_v13(text,text,text) from public;
revoke all on function public.tpl_market_similitud_microzona_v13(text,text,text,text,text) from public;
revoke all on function public.tpl_market_auditoria_multifuente_v13() from public;
revoke all on function public.tpl_market_sugerencias_canonizacion_v13(text,integer) from public;

grant execute on function public.tpl_market_microtexto_v13(text,text,text)
to authenticated,service_role;
grant execute on function public.tpl_market_similitud_microzona_v13(text,text,text,text,text)
to authenticated,service_role;
grant execute on function public.tpl_market_auditoria_multifuente_v13()
to authenticated,service_role;
grant execute on function public.tpl_market_sugerencias_canonizacion_v13(text,integer)
to authenticated,service_role;

grant select on
  public.tpl_market_matches_multifuente_v13,
  public.tpl_market_matches_multifuente_v13_revisables
to authenticated,service_role;

-- Pruebas
select public.tpl_market_auditoria_multifuente_v13();
select public.tpl_market_sugerencias_canonizacion_v13('revisar',50);
select public.tpl_market_sugerencias_canonizacion_v13('probable',50);
