-- TPL MARKET MULTIFUENTE V1.4 · IDENTIFICADORES ESPECIFICOS
create or replace function public.tpl_market_identificadores_v14(p_texto text)
returns text[] language sql immutable as $$
with t as (select lower(public.tpl_market_normalizar_texto_v1(coalesce(p_texto,''))) s),
m as (
 select distinct lower(x[1]) id from t,
 lateral regexp_matches(s,'((?:lote|parcela|sitio|unidad|l)[[:space:]#._-]*[a-z]?[0-9]+(?:-[0-9]+)?)','g') x
)
select coalesce(array_agg(id order by id),'{}'::text[]) from m;
$$;

create or replace function public.tpl_market_conflicto_identificador_v14(p_texto_a text,p_texto_b text)
returns boolean language sql immutable as $$
with x as (
 select public.tpl_market_identificadores_v14(p_texto_a) a,
        public.tpl_market_identificadores_v14(p_texto_b) b
)
select cardinality(a)>0 and cardinality(b)>0 and not (a && b) from x;
$$;

create or replace view public.tpl_market_matches_multifuente_v14 as
select m.*,
 public.tpl_market_identificadores_v14(concat_ws(' ',m.zona_a,m.sector_a,m.titulo_a)) identificadores_a,
 public.tpl_market_identificadores_v14(concat_ws(' ',m.zona_b,m.sector_b,m.titulo_b)) identificadores_b,
 public.tpl_market_conflicto_identificador_v14(
   concat_ws(' ',m.zona_a,m.sector_a,m.titulo_a),
   concat_ws(' ',m.zona_b,m.sector_b,m.titulo_b)) conflicto_identificador,
 case
  when public.tpl_market_conflicto_identificador_v14(
   concat_ws(' ',m.zona_a,m.sector_a,m.titulo_a),
   concat_ws(' ',m.zona_b,m.sector_b,m.titulo_b)) then greatest(0,m.score_match-35)
  when cardinality(public.tpl_market_identificadores_v14(concat_ws(' ',m.zona_a,m.sector_a,m.titulo_a)))>0
   and cardinality(public.tpl_market_identificadores_v14(concat_ws(' ',m.zona_b,m.sector_b,m.titulo_b)))=0 then least(m.score_match,79)
  when cardinality(public.tpl_market_identificadores_v14(concat_ws(' ',m.zona_b,m.sector_b,m.titulo_b)))>0
   and cardinality(public.tpl_market_identificadores_v14(concat_ws(' ',m.zona_a,m.sector_a,m.titulo_a)))=0 then least(m.score_match,79)
  else m.score_match
 end::numeric score_match_v14
from public.tpl_market_matches_multifuente_v13 m;

create or replace view public.tpl_market_matches_multifuente_v14_clasificados as
select *,
 case
  when conflicto_identificador then 'bajo'
  when score_match_v14>=90 and similitud_microzona>=0.90 and diff_precio_ratio<=0.08 and diff_superficie_ratio<=0.03 then 'muy_fuerte'
  when score_match_v14>=82 and similitud_microzona>=0.78 and diff_precio_ratio<=0.12 and diff_superficie_ratio<=0.05 then 'probable'
  when score_match_v14>=68 and similitud_microzona>=0.55 then 'revisar'
  else 'bajo'
 end nivel_match_v14
from public.tpl_market_matches_multifuente_v14;

create or replace view public.tpl_market_matches_multifuente_v14_revisables as
select m.* from public.tpl_market_matches_multifuente_v14_clasificados m
left join public.tpl_market_match_feedback f
 on f.publicacion_a_id=least(m.publicacion_a_id,m.publicacion_b_id)
and f.publicacion_b_id=greatest(m.publicacion_a_id,m.publicacion_b_id)
where coalesce(f.resultado,'')<>'distinta'
and m.nivel_match_v14 in ('revisar','probable','muy_fuerte');

create or replace function public.tpl_market_registrar_feedback_v14(
 p_publicacion_a uuid,p_publicacion_b uuid,p_resultado text,p_nota text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a uuid; b uuid;
begin
 if p_resultado not in ('misma','distinta','incierta') then raise exception 'resultado invalido'; end if;
 a:=least(p_publicacion_a,p_publicacion_b); b:=greatest(p_publicacion_a,p_publicacion_b);
 if a=b then raise exception 'publicaciones identicas'; end if;
 insert into public.tpl_market_match_feedback(publicacion_a_id,publicacion_b_id,resultado,origen,nota)
 values(a,b,p_resultado,'revision_humana',p_nota)
 on conflict(publicacion_a_id,publicacion_b_id) do update
 set resultado=excluded.resultado,origen=excluded.origen,nota=excluded.nota,created_at=now();
 return jsonb_build_object('ok',true,'a',a,'b',b,'resultado',p_resultado);
end $$;

create or replace view public.tpl_market_matches_confirmados_v14 as
select
 f.publicacion_a_id,
 f.publicacion_b_id,
 f.resultado,
 f.nota,
 pa.propiedad_id as propiedad_a_id,
 pb.propiedad_id as propiedad_b_id,
 fa.codigo as fuente_a,
 fb.codigo as fuente_b
from public.tpl_market_match_feedback f
join public.tpl_market_publicaciones pa
  on pa.id=f.publicacion_a_id
join public.tpl_market_publicaciones pb
  on pb.id=f.publicacion_b_id
join public.tpl_market_fuentes fa
  on fa.id=pa.fuente_id
join public.tpl_market_fuentes fb
  on fb.id=pb.fuente_id
where f.resultado='misma';

create or replace function public.tpl_market_auditoria_multifuente_v14()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'version','1.4','modo','IDENTIFICADORES_ESPECIFICOS_CANONIZACION_CONTROLADA','generado_at',now(),
 'pares_evaluados',(select count(*) from public.tpl_market_matches_multifuente_v14_clasificados),
 'conflictos_identificador',(select count(*) from public.tpl_market_matches_multifuente_v14_clasificados where conflicto_identificador),
 'revisar',(select count(*) from public.tpl_market_matches_multifuente_v14_revisables where nivel_match_v14='revisar'),
 'probables',(select count(*) from public.tpl_market_matches_multifuente_v14_revisables where nivel_match_v14='probable'),
 'muy_fuertes',(select count(*) from public.tpl_market_matches_multifuente_v14_revisables where nivel_match_v14='muy_fuerte'),
 'feedback_mismas',(select count(*) from public.tpl_market_match_feedback where resultado='misma'),
 'feedback_distintas',(select count(*) from public.tpl_market_match_feedback where resultado='distinta'));
$$;

create or replace function public.tpl_market_sugerencias_canonizacion_v14(p_nivel text default 'probable',p_limite integer default 50)
returns jsonb language sql stable security definer set search_path=public as $$
with q as (
 select *,case nivel_match_v14 when 'muy_fuerte' then 3 when 'probable' then 2 else 1 end r
 from public.tpl_market_matches_multifuente_v14_revisables
 where case p_nivel when 'muy_fuerte' then nivel_match_v14='muy_fuerte'
                    when 'probable' then nivel_match_v14 in ('muy_fuerte','probable')
                    else true end
 order by r desc,score_match_v14 desc limit greatest(p_limite,1)
)
select jsonb_build_object('version','1.4','nivel_min',p_nivel,'limite',p_limite,
 'candidatos',coalesce(jsonb_agg(jsonb_build_object(
 'nivel',nivel_match_v14,'score',score_match_v14,'comuna',comuna,
 'zona_a',zona_a,'zona_b',zona_b,'identificadores_a',identificadores_a,'identificadores_b',identificadores_b,
 'conflicto_identificador',conflicto_identificador,'precio_a_clp',precio_a_clp,'precio_b_clp',precio_b_clp,
 'superficie_a_m2',superficie_a_m2,'superficie_b_m2',superficie_b_m2,
 'fuente_a',fuente_a,'fuente_b',fuente_b,'titulo_a',titulo_a,'titulo_b',titulo_b,
 'url_a',url_a,'url_b',url_b,'publicacion_a_id',publicacion_a_id,'publicacion_b_id',publicacion_b_id
 ) order by r desc,score_match_v14 desc),'[]'::jsonb)) from q;
$$;

revoke all on function public.tpl_market_registrar_feedback_v14(uuid,uuid,text,text) from public;
grant execute on function public.tpl_market_registrar_feedback_v14(uuid,uuid,text,text) to authenticated,service_role;
grant execute on function public.tpl_market_auditoria_multifuente_v14() to authenticated,service_role;
grant execute on function public.tpl_market_sugerencias_canonizacion_v14(text,integer) to authenticated,service_role;
grant select on public.tpl_market_matches_multifuente_v14,public.tpl_market_matches_multifuente_v14_clasificados,
 public.tpl_market_matches_multifuente_v14_revisables,public.tpl_market_matches_confirmados_v14 to authenticated,service_role;

select public.tpl_market_auditoria_multifuente_v14();
select public.tpl_market_sugerencias_canonizacion_v14('probable',50);
