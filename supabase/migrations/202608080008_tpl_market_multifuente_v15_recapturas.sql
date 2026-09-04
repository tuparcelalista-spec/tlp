-- ============================================================
-- TPL MARKET INTELLIGENCE · MULTIFUENTE V1.5
-- Identificadores reales + recapturas intrafuente
-- 2026-08-08
-- Mantiene V1..V1.4
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------------------
-- 1) Identificadores específicos, excluyendo números que son superficie
-- ------------------------------------------------------------
create or replace function public.tpl_market_identificadores_v15(
  p_texto text,
  p_superficie_m2 numeric default null
)
returns text[]
language plpgsql
immutable
set search_path=public,extensions
as $$
declare
  v text;
  r text;
  out_ids text[] := '{}'::text[];
  n numeric;
begin
  v := lower(public.tpl_market_normalizar_texto_v1(coalesce(p_texto,'')));

  -- Identificadores compactos tipo L109, L44-5.
  for r in
    select distinct lower(x[1])
    from regexp_matches(v,'(^|[^a-z0-9])(l[0-9]+(?:-[0-9]+)?)([^a-z0-9]|$)','g') x
  loop
    r := regexp_replace(r,'^.*?(l[0-9]+(?:-[0-9]+)?).*$','\1');
    if r is not null and r<>'' and not (r=any(out_ids)) then
      out_ids := array_append(out_ids,r);
    end if;
  end loop;

  -- Identificadores explícitos "lote 12", "parcela 7", "sitio 3", "unidad B4".
  for r in
    select distinct lower(x[1])
    from regexp_matches(
      v,
      '((?:lote|parcela|sitio|unidad)[[:space:]#._-]*[a-z]?[0-9]+(?:-[0-9]+)?)',
      'g'
    ) x
  loop
    -- Extrae la porción numérica principal.
    begin
      n := nullif(regexp_replace(r,'[^0-9].*$','','g'),'')::numeric;
    exception when others then
      n := null;
    end;

    -- No considerar como identificador números que coinciden con la superficie
    -- o valores típicos de superficie expresados en el título.
    if p_superficie_m2 is not null then
      if regexp_replace(r,'[^0-9]','','g') = round(p_superficie_m2)::bigint::text then
        continue;
      end if;
    end if;

    if regexp_replace(r,'[^0-9]','','g') in ('5000','5001','4999','10000','1000') then
      continue;
    end if;

    if r is not null and r<>'' and not (r=any(out_ids)) then
      out_ids := array_append(out_ids,r);
    end if;
  end loop;

  return out_ids;
end;
$$;

create or replace function public.tpl_market_conflicto_identificador_v15(
  p_texto_a text,
  p_superficie_a numeric,
  p_texto_b text,
  p_superficie_b numeric
)
returns boolean
language sql
immutable
as $$
with x as (
  select
    public.tpl_market_identificadores_v15(p_texto_a,p_superficie_a) a,
    public.tpl_market_identificadores_v15(p_texto_b,p_superficie_b) b
)
select cardinality(a)>0 and cardinality(b)>0 and not (a && b)
from x;
$$;

-- ------------------------------------------------------------
-- 2) Detecta recapturas probables dentro de la MISMA fuente.
--    No elimina nada: solo identifica representante.
-- ------------------------------------------------------------
create or replace view public.tpl_market_recapturas_intrafuente_v15 as
with p as (
  select *
  from public.tpl_market_publicaciones_multifuente_v1
  where coalesce(superficie_m2,0)>0
    and coalesce(precio_clp,0)>0
),
pares as (
  select
    a.publicacion_id as publicacion_a_id,
    b.publicacion_id as publicacion_b_id,
    a.fuente_codigo,
    a.comuna,
    a.zona as zona_a,
    b.zona as zona_b,
    a.superficie_m2 as superficie_a_m2,
    b.superficie_m2 as superficie_b_m2,
    a.precio_clp as precio_a_clp,
    b.precio_clp as precio_b_clp,
    a.titulo as titulo_a,
    b.titulo as titulo_b,
    extensions.similarity(
      public.tpl_market_normalizar_texto_v1(coalesce(a.titulo,'')),
      public.tpl_market_normalizar_texto_v1(coalesce(b.titulo,''))
    ) as similitud_titulo
  from p a
  join p b
    on a.publicacion_id < b.publicacion_id
   and a.fuente_codigo=b.fuente_codigo
   and public.tpl_market_normalizar_texto_v1(a.comuna)
       = public.tpl_market_normalizar_texto_v1(b.comuna)
   and a.tipo_tpl=b.tipo_tpl
   and public.tpl_market_normalizar_texto_v1(coalesce(a.zona,''))
       = public.tpl_market_normalizar_texto_v1(coalesce(b.zona,''))
   and abs(a.superficie_m2-b.superficie_m2)<=50
   and abs(a.precio_clp-b.precio_clp)<=greatest(100000,0.01*greatest(a.precio_clp,b.precio_clp))
)
select *,
  case
    when similitud_titulo>=0.45 then true
    else false
  end as recaptura_probable
from pares;

-- Publicaciones no dominadas por otra recaptura probable de la misma fuente.
create or replace view public.tpl_market_publicaciones_multifuente_v15_base as
select p.*
from public.tpl_market_publicaciones_multifuente_v1 p
where not exists (
  select 1
  from public.tpl_market_recapturas_intrafuente_v15 r
  where r.recaptura_probable=true
    and r.publicacion_b_id=p.publicacion_id
);

-- ------------------------------------------------------------
-- 3) Matching V1.5 desde base intrafuente depurada
-- ------------------------------------------------------------
create or replace view public.tpl_market_matches_multifuente_v15 as
with p as (
  select *
  from public.tpl_market_publicaciones_multifuente_v15_base
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
    public.tpl_market_microtexto_v13(a.comuna,a.zona,a.sector) as microtexto_a,
    public.tpl_market_microtexto_v13(b.comuna,b.zona,b.sector) as microtexto_b,
    public.tpl_market_similitud_microzona_v13(
      a.comuna,a.zona,a.sector,b.zona,b.sector
    ) as similitud_microzona,
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
    extensions.similarity(
      public.tpl_market_normalizar_texto_v1(coalesce(a.titulo,'')),
      public.tpl_market_normalizar_texto_v1(coalesce(b.titulo,''))
    ) as similitud_titulo
  from p a
  join p b
    on a.publicacion_id < b.publicacion_id
   and a.fuente_codigo<>b.fuente_codigo
   and public.tpl_market_normalizar_texto_v1(a.comuna)
       = public.tpl_market_normalizar_texto_v1(b.comuna)
   and a.tipo_tpl=b.tipo_tpl
),
scored as (
  select *,
    public.tpl_market_identificadores_v15(
      concat_ws(' ',zona_a,sector_a,titulo_a),superficie_a_m2
    ) as identificadores_a,
    public.tpl_market_identificadores_v15(
      concat_ws(' ',zona_b,sector_b,titulo_b),superficie_b_m2
    ) as identificadores_b,
    public.tpl_market_conflicto_identificador_v15(
      concat_ws(' ',zona_a,sector_a,titulo_a),superficie_a_m2,
      concat_ws(' ',zona_b,sector_b,titulo_b),superficie_b_m2
    ) as conflicto_identificador,
    round((
        40*similitud_microzona
      + 30*greatest(0,1-diff_precio_ratio)
      + 20*greatest(0,1-diff_superficie_ratio)
      + 10*greatest(0,least(1,similitud_titulo))
    )::numeric,1) as score_base
  from pares
  where diff_superficie_ratio<=0.15
    and diff_precio_ratio<=0.35
),
ajuste as (
  select *,
    case
      when conflicto_identificador then greatest(0,score_base-40)
      when cardinality(identificadores_a)>0 and cardinality(identificadores_b)=0
        then least(score_base,74)
      when cardinality(identificadores_b)>0 and cardinality(identificadores_a)=0
        then least(score_base,74)
      else score_base
    end::numeric as score_match
  from scored
)
select *,
  case
    when conflicto_identificador then 'bajo'
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
  end as nivel_match
from ajuste;

create or replace view public.tpl_market_matches_multifuente_v15_revisables as
select m.*
from public.tpl_market_matches_multifuente_v15 m
left join public.tpl_market_match_feedback f
  on f.publicacion_a_id=least(m.publicacion_a_id,m.publicacion_b_id)
 and f.publicacion_b_id=greatest(m.publicacion_a_id,m.publicacion_b_id)
where coalesce(f.resultado,'')<>'distinta'
  and m.nivel_match in ('revisar','probable','muy_fuerte');

-- ------------------------------------------------------------
-- 4) Auditoría V1.5
-- ------------------------------------------------------------
create or replace function public.tpl_market_auditoria_multifuente_v15()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'version','1.5',
  'modo','IDENTIFICADORES_REALES_RECAPTURAS_INTRAFUENTE',
  'generado_at',now(),
  'recapturas_intrafuente_probables',
    (select count(*) from public.tpl_market_recapturas_intrafuente_v15 where recaptura_probable=true),
  'publicaciones_base_multifuente',
    (select count(*) from public.tpl_market_publicaciones_multifuente_v15_base),
  'pares_evaluados',
    (select count(*) from public.tpl_market_matches_multifuente_v15),
  'conflictos_identificador',
    (select count(*) from public.tpl_market_matches_multifuente_v15 where conflicto_identificador),
  'revisar',
    (select count(*) from public.tpl_market_matches_multifuente_v15_revisables where nivel_match='revisar'),
  'probables',
    (select count(*) from public.tpl_market_matches_multifuente_v15_revisables where nivel_match='probable'),
  'muy_fuertes',
    (select count(*) from public.tpl_market_matches_multifuente_v15_revisables where nivel_match='muy_fuerte'),
  'feedback_mismas',
    (select count(*) from public.tpl_market_match_feedback where resultado='misma'),
  'feedback_distintas',
    (select count(*) from public.tpl_market_match_feedback where resultado='distinta')
);
$$;

create or replace function public.tpl_market_sugerencias_canonizacion_v15(
  p_nivel text default 'probable',
  p_limite integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
with q as (
  select *,
    case nivel_match
      when 'muy_fuerte' then 3
      when 'probable' then 2
      else 1
    end as r
  from public.tpl_market_matches_multifuente_v15_revisables
  where case p_nivel
    when 'muy_fuerte' then nivel_match='muy_fuerte'
    when 'probable' then nivel_match in ('muy_fuerte','probable')
    else true
  end
  order by r desc,score_match desc
  limit greatest(p_limite,1)
)
select jsonb_build_object(
  'version','1.5','nivel_min',p_nivel,'limite',p_limite,
  'candidatos',
  coalesce(jsonb_agg(jsonb_build_object(
    'nivel',nivel_match,
    'score',score_match,
    'comuna',comuna,
    'zona_a',zona_a,'zona_b',zona_b,
    'identificadores_a',identificadores_a,
    'identificadores_b',identificadores_b,
    'conflicto_identificador',conflicto_identificador,
    'precio_a_clp',precio_a_clp,'precio_b_clp',precio_b_clp,
    'superficie_a_m2',superficie_a_m2,'superficie_b_m2',superficie_b_m2,
    'fuente_a',fuente_a,'fuente_b',fuente_b,
    'titulo_a',titulo_a,'titulo_b',titulo_b,
    'url_a',url_a,'url_b',url_b,
    'publicacion_a_id',publicacion_a_id,
    'publicacion_b_id',publicacion_b_id
  ) order by r desc,score_match desc),'[]'::jsonb)
)
from q;
$$;

revoke all on function public.tpl_market_auditoria_multifuente_v15() from public;
revoke all on function public.tpl_market_sugerencias_canonizacion_v15(text,integer) from public;

grant execute on function public.tpl_market_auditoria_multifuente_v15()
to authenticated,service_role;
grant execute on function public.tpl_market_sugerencias_canonizacion_v15(text,integer)
to authenticated,service_role;

grant select on
  public.tpl_market_recapturas_intrafuente_v15,
  public.tpl_market_publicaciones_multifuente_v15_base,
  public.tpl_market_matches_multifuente_v15,
  public.tpl_market_matches_multifuente_v15_revisables
to authenticated,service_role;

-- TESTS
select public.tpl_market_auditoria_multifuente_v15();
select public.tpl_market_sugerencias_canonizacion_v15('probable',50);
