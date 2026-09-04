-- ============================================================
-- TPL MARKET INTELLIGENCE · MULTIFUENTE V1.2
-- Matching calibrado con revisión humana real
-- 2026-08-08
-- Mantiene intactos V1 y V1.1
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------------------
-- 1) Helper de similitud de ubicación
-- ------------------------------------------------------------
create or replace function public.tpl_market_similitud_ubicacion_v12(
  p_zona_a text,
  p_sector_a text,
  p_zona_b text,
  p_sector_b text
)
returns numeric
language sql
immutable
as $$
with x as (
  select
    public.tpl_market_normalizar_texto_v1(
      trim(concat_ws(' ',coalesce(p_zona_a,''),coalesce(p_sector_a,'')))
    ) as a,
    public.tpl_market_normalizar_texto_v1(
      trim(concat_ws(' ',coalesce(p_zona_b,''),coalesce(p_sector_b,'')))
    ) as b
)
select case
  when nullif(a,'') is null or nullif(b,'') is null then 0
  when a=b then 1
  else greatest(
    extensions.similarity(a,b),
    case when position(a in b)>0 or position(b in a)>0 then 0.75 else 0 end
  )
end::numeric
from x;
$$;

-- ------------------------------------------------------------
-- 2) Matching V1.2
--    PESOS:
--    ubicación exacta/similar = 35
--    precio                  = 30
--    superficie              = 20
--    título                  = 5
--    sector exacto           = 5
--    zona exacta             = 5
-- ------------------------------------------------------------
create or replace view public.tpl_market_matches_multifuente_v12 as
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

    public.tpl_market_similitud_ubicacion_v12(
      a.zona,a.sector,b.zona,b.sector
    ) as similitud_ubicacion,

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
),
scored as (
  select *,
    round((35 * similitud_ubicacion)::numeric,1) as score_ubicacion,
    round((30 * greatest(0,1-diff_precio_ratio))::numeric,1) as score_precio,
    round((20 * greatest(0,1-diff_superficie_ratio))::numeric,1) as score_superficie,
    round((5 * greatest(0,least(1,similitud_titulo)))::numeric,1) as score_titulo,
    round((5 * misma_zona)::numeric,1) as score_zona_exacta,
    round((5 * mismo_sector)::numeric,1) as score_sector_exacto,

    round((
        35 * similitud_ubicacion
      + 30 * greatest(0,1-diff_precio_ratio)
      + 20 * greatest(0,1-diff_superficie_ratio)
      + 5  * greatest(0,least(1,similitud_titulo))
      + 5  * misma_zona
      + 5  * mismo_sector
    )::numeric,1) as score_match
  from pares
  where diff_superficie_ratio <= 0.15
    and diff_precio_ratio <= 0.35
)
select *,
  case
    -- Reglas fuertes: no basta superficie+precio si ubicación es débil.
    when score_match >= 90
         and similitud_ubicacion >= 0.85
         and diff_precio_ratio <= 0.10
      then 'muy_fuerte'
    when score_match >= 82
         and similitud_ubicacion >= 0.70
         and diff_precio_ratio <= 0.15
      then 'probable'
    when score_match >= 68
         and similitud_ubicacion >= 0.45
      then 'revisar'
    else 'bajo'
  end as nivel_match,

  case
    when similitud_ubicacion < 0.45
      then 'ubicacion_no_suficientemente_coincidente'
    when diff_precio_ratio > 0.15
      then 'precio_demasiado_distinto_para_match_fuerte'
    when diff_superficie_ratio > 0.05
      then 'superficie_no_exacta'
    else 'sin_alerta_principal'
  end as alerta_principal
from scored;

-- ------------------------------------------------------------
-- 3) Caso humano negativo conocido
--    Se registra como calibración, NO modifica datos originales.
-- ------------------------------------------------------------
create table if not exists public.tpl_market_match_feedback (
  id uuid primary key default gen_random_uuid(),
  publicacion_a_id uuid not null references public.tpl_market_publicaciones(id) on delete cascade,
  publicacion_b_id uuid not null references public.tpl_market_publicaciones(id) on delete cascade,
  resultado text not null check (resultado in ('misma','distinta','incierta')),
  origen text not null default 'revision_humana',
  nota text,
  created_at timestamptz not null default now(),
  unique(publicacion_a_id,publicacion_b_id)
);

insert into public.tpl_market_match_feedback(
  publicacion_a_id,publicacion_b_id,resultado,origen,nota
)
select
  least(publicacion_a_id,publicacion_b_id),
  greatest(publicacion_a_id,publicacion_b_id),
  'distinta',
  'revision_humana',
  'Caso Paso Hondo revisado visualmente: no corresponde a la misma propiedad.'
from public.tpl_market_matches_multifuente_v11
where (
       (url_a='https://portalterreno.cl/propiedad/17358-terreno-en-venta-en-yumbel'
        and url_b='urn:yapo:32671439')
    or (url_b='https://portalterreno.cl/propiedad/17358-terreno-en-venta-en-yumbel'
        and url_a='urn:yapo:32671439')
)
on conflict(publicacion_a_id,publicacion_b_id) do update
set resultado=excluded.resultado,
    origen=excluded.origen,
    nota=excluded.nota;

-- ------------------------------------------------------------
-- 4) Vista final V1.2 excluyendo falsos positivos humanos
-- ------------------------------------------------------------
create or replace view public.tpl_market_matches_multifuente_v12_revisables as
select m.*
from public.tpl_market_matches_multifuente_v12 m
left join public.tpl_market_match_feedback f
  on f.publicacion_a_id=least(m.publicacion_a_id,m.publicacion_b_id)
 and f.publicacion_b_id=greatest(m.publicacion_a_id,m.publicacion_b_id)
where coalesce(f.resultado,'') <> 'distinta'
  and m.nivel_match in ('revisar','probable','muy_fuerte');

-- ------------------------------------------------------------
-- 5) Auditoría V1.2
-- ------------------------------------------------------------
create or replace function public.tpl_market_auditoria_multifuente_v12()
returns jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
select jsonb_build_object(
  'generado_at',now(),
  'pares_evaluados',(select count(*) from public.tpl_market_matches_multifuente_v12),
  'revisar',(select count(*) from public.tpl_market_matches_multifuente_v12_revisables where nivel_match='revisar'),
  'probables',(select count(*) from public.tpl_market_matches_multifuente_v12_revisables where nivel_match='probable'),
  'muy_fuertes',(select count(*) from public.tpl_market_matches_multifuente_v12_revisables where nivel_match='muy_fuerte'),
  'feedback_distintas',(select count(*) from public.tpl_market_match_feedback where resultado='distinta'),
  'feedback_mismas',(select count(*) from public.tpl_market_match_feedback where resultado='misma'),
  'modo','MATCHING_V12_UBICACION_PRECIO_PRIORITARIOS'
);
$$;

-- ------------------------------------------------------------
-- 6) Sugerencias V1.2
-- ------------------------------------------------------------
create or replace function public.tpl_market_sugerencias_canonizacion_v12(
  p_nivel_min text default 'revisar',
  p_limite integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path=public,extensions
as $$
with ranked as (
  select *,
    case nivel_match
      when 'muy_fuerte' then 3
      when 'probable' then 2
      when 'revisar' then 1
      else 0
    end as nivel_rank
  from public.tpl_market_matches_multifuente_v12_revisables
),
limite as (
  select case p_nivel_min
    when 'muy_fuerte' then 3
    when 'probable' then 2
    else 1
  end as min_rank
)
select jsonb_build_object(
  'nivel_min',p_nivel_min,
  'limite',p_limite,
  'candidatos',
  coalesce(
    jsonb_agg(
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
        'superficie_a_m2',superficie_a_m2,
        'superficie_b_m2',superficie_b_m2,
        'precio_a_clp',precio_a_clp,
        'precio_b_clp',precio_b_clp,
        'titulo_a',titulo_a,
        'titulo_b',titulo_b,
        'url_a',url_a,
        'url_b',url_b,
        'diagnostico',jsonb_build_object(
          'score_ubicacion',score_ubicacion,
          'score_precio',score_precio,
          'score_superficie',score_superficie,
          'score_titulo',score_titulo,
          'score_zona_exacta',score_zona_exacta,
          'score_sector_exacto',score_sector_exacto,
          'similitud_ubicacion_pct',round((similitud_ubicacion*100)::numeric,1),
          'diff_precio_pct',round((diff_precio_ratio*100)::numeric,1),
          'diff_superficie_pct',round((diff_superficie_ratio*100)::numeric,1)
        )
      )
      order by nivel_rank desc, score_match desc
    ),
    '[]'::jsonb
  )
)
from (
  select r.*
  from ranked r
  cross join limite l
  where r.nivel_rank>=l.min_rank
  order by r.nivel_rank desc,r.score_match desc
  limit greatest(p_limite,1)
) q;
$$;

revoke all on function public.tpl_market_similitud_ubicacion_v12(text,text,text,text) from public;
revoke all on function public.tpl_market_auditoria_multifuente_v12() from public;
revoke all on function public.tpl_market_sugerencias_canonizacion_v12(text,integer) from public;

grant execute on function public.tpl_market_similitud_ubicacion_v12(text,text,text,text)
to authenticated,service_role;
grant execute on function public.tpl_market_auditoria_multifuente_v12()
to authenticated,service_role;
grant execute on function public.tpl_market_sugerencias_canonizacion_v12(text,integer)
to authenticated,service_role;

grant select on
  public.tpl_market_matches_multifuente_v12,
  public.tpl_market_matches_multifuente_v12_revisables,
  public.tpl_market_match_feedback
to authenticated,service_role;

-- Validación
select public.tpl_market_auditoria_multifuente_v12();
select public.tpl_market_sugerencias_canonizacion_v12('revisar',50);
select public.tpl_market_sugerencias_canonizacion_v12('probable',50);
