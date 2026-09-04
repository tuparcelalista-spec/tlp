-- ============================================================
-- TPL MARKET INTELLIGENCE · V1.6
-- Canonización segura, reversible + historial multifuente
-- 2026-08-08
-- RE/MAX queda preparado como fuente complementaria; no se fuerza ingesta.
-- ============================================================

-- 1) Limpieza final del extractor V1.5: nunca devolver elementos vacíos.
create or replace function public.tpl_market_identificadores_v16(
  p_texto text,
  p_superficie_m2 numeric default null
)
returns text[]
language sql
immutable
as $$
with ids as (
  select unnest(public.tpl_market_identificadores_v15(p_texto,p_superficie_m2)) as id
),
clean as (
  select distinct trim(id) as id
  from ids
  where nullif(trim(id),'') is not null
)
select coalesce(array_agg(id order by id),'{}'::text[])
from clean;
$$;

-- 2) Grupos canónicos: una identidad de mercado puede contener N publicaciones.
create table if not exists public.tpl_market_grupos_canonicos (
  id uuid primary key default gen_random_uuid(),
  propiedad_representante_id uuid references public.tpl_market_propiedades(id) on delete set null,
  estado text not null default 'activo'
    check (estado in ('activo','revertido','revision')),
  origen text not null default 'revision_humana',
  confianza numeric(5,2),
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tpl_market_grupo_publicaciones (
  grupo_id uuid not null references public.tpl_market_grupos_canonicos(id) on delete cascade,
  publicacion_id uuid not null references public.tpl_market_publicaciones(id) on delete cascade,
  es_representante boolean not null default false,
  added_at timestamptz not null default now(),
  primary key(grupo_id,publicacion_id)
);

-- Una publicación solo puede pertenecer a un grupo canónico activo.
create unique index if not exists tpl_market_grupo_publicacion_unica_v16
on public.tpl_market_grupo_publicaciones(publicacion_id);

-- 3) Historial inmutable de observaciones de mercado.
create table if not exists public.tpl_market_historial_multifuente (
  id bigint generated always as identity primary key,
  grupo_id uuid references public.tpl_market_grupos_canonicos(id) on delete set null,
  publicacion_id uuid not null references public.tpl_market_publicaciones(id) on delete cascade,
  fuente_id uuid references public.tpl_market_fuentes(id) on delete set null,
  precio_clp numeric,
  superficie_m2 numeric,
  estado_publicacion text,
  url text,
  observado_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists tpl_market_historial_grupo_fecha_v16
on public.tpl_market_historial_multifuente(grupo_id,observado_at desc);

create index if not exists tpl_market_historial_publicacion_fecha_v16
on public.tpl_market_historial_multifuente(publicacion_id,observado_at desc);

-- 4) Canonización HUMANA de un par confirmado.
-- No borra ni modifica publicaciones originales.
create or replace function public.tpl_market_canonizar_par_v16(
  p_publicacion_a uuid,
  p_publicacion_b uuid,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  a uuid := least(p_publicacion_a,p_publicacion_b);
  b uuid := greatest(p_publicacion_a,p_publicacion_b);
  ga uuid;
  gb uuid;
  g uuid;
  prop uuid;
begin
  if a=b then raise exception 'Las publicaciones deben ser distintas'; end if;

  if not exists(select 1 from public.tpl_market_publicaciones where id=a)
     or not exists(select 1 from public.tpl_market_publicaciones where id=b) then
    raise exception 'Publicacion inexistente';
  end if;

  -- Requiere feedback humano "misma".
  if not exists (
    select 1 from public.tpl_market_match_feedback f
    where f.publicacion_a_id=a and f.publicacion_b_id=b and f.resultado='misma'
  ) then
    raise exception 'Primero registre feedback humana como misma';
  end if;

  select grupo_id into ga from public.tpl_market_grupo_publicaciones where publicacion_id=a;
  select grupo_id into gb from public.tpl_market_grupo_publicaciones where publicacion_id=b;

  if ga is not null and gb is not null and ga<>gb then
    raise exception 'Las publicaciones ya pertenecen a grupos canonicos distintos; requiere revision manual';
  end if;

  g := coalesce(ga,gb);

  if g is null then
    select propiedad_id into prop
    from public.tpl_market_publicaciones
    where id=a;

    insert into public.tpl_market_grupos_canonicos(
      propiedad_representante_id,estado,origen,confianza,nota
    ) values(prop,'activo','revision_humana',100,p_nota)
    returning id into g;
  end if;

  insert into public.tpl_market_grupo_publicaciones(grupo_id,publicacion_id,es_representante)
  values(g,a,not exists(select 1 from public.tpl_market_grupo_publicaciones where grupo_id=g))
  on conflict(publicacion_id) do nothing;

  insert into public.tpl_market_grupo_publicaciones(grupo_id,publicacion_id,es_representante)
  values(g,b,false)
  on conflict(publicacion_id) do nothing;

  update public.tpl_market_grupos_canonicos
  set updated_at=now(), nota=coalesce(p_nota,nota)
  where id=g;

  return jsonb_build_object(
    'ok',true,'grupo_id',g,'publicacion_a_id',a,'publicacion_b_id',b,
    'accion','CANONIZACION_REVERSIBLE_SIN_BORRAR_PUBLICACIONES'
  );
end;
$$;

-- 5) Reversión completa del grupo.
create or replace function public.tpl_market_revertir_grupo_v16(
  p_grupo_id uuid,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.tpl_market_grupos_canonicos
  set estado='revertido',
      nota=concat_ws(' | ',nota,p_nota),
      updated_at=now()
  where id=p_grupo_id;

  if not found then raise exception 'Grupo canonico inexistente'; end if;

  return jsonb_build_object('ok',true,'grupo_id',p_grupo_id,'estado','revertido');
end;
$$;

-- 6) Vista: identidad efectiva para Radar.
-- Si está en grupo activo => grupo; si no => propiedad original.
create or replace view public.tpl_market_identidad_efectiva_v16 as
select
  p.id as publicacion_id,
  p.propiedad_id,
  gp.grupo_id,
  case
    when g.estado='activo' then 'grupo:'||g.id::text
    else 'propiedad:'||p.propiedad_id::text
  end as identidad_mercado,
  case when g.estado='activo' then true else false end as canonizada
from public.tpl_market_publicaciones p
left join public.tpl_market_grupo_publicaciones gp on gp.publicacion_id=p.id
left join public.tpl_market_grupos_canonicos g on g.id=gp.grupo_id;

-- 7) Vista de publicaciones + fuente + identidad.
create or replace view public.tpl_market_publicaciones_canonicas_v16 as
select
  p.*,
  f.codigo as fuente_codigo,
  i.grupo_id,
  i.identidad_mercado,
  i.canonizada
from public.tpl_market_publicaciones p
join public.tpl_market_fuentes f on f.id=p.fuente_id
join public.tpl_market_identidad_efectiva_v16 i on i.publicacion_id=p.id;

-- 8) Resumen por grupo, preservando todos los portales.
create or replace view public.tpl_market_grupos_resumen_v16 as
select
  g.id as grupo_id,
  g.estado,
  g.confianza,
  g.propiedad_representante_id,
  count(gp.publicacion_id) as publicaciones,
  count(distinct a.fuente_codigo) as fuentes,
  array_agg(distinct a.fuente_codigo order by a.fuente_codigo) as fuentes_codigo,
  min(a.precio_clp) as precio_min_clp,
  max(a.precio_clp) as precio_max_clp,
  g.created_at as canonizado_at
from public.tpl_market_grupos_canonicos g
join public.tpl_market_grupo_publicaciones gp
  on gp.grupo_id=g.id
join public.tpl_market_publicaciones_actuales_v1 a
  on a.publicacion_id=gp.publicacion_id
group by
  g.id,
  g.estado,
  g.confianza,
  g.propiedad_representante_id,
  g.created_at;

-- 9) Snapshot del historial actual.
create or replace function public.tpl_market_snapshot_historial_v16()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare n integer;
begin
  insert into public.tpl_market_historial_multifuente(
    grupo_id,publicacion_id,fuente_id,precio_clp,superficie_m2,
    estado_publicacion,url,metadata
  )
  select
    i.grupo_id,
    p.id,
    p.fuente_id,
    a.precio_clp,
    a.superficie_m2,
    a.estado,
    a.url,
    jsonb_build_object(
      'identidad_mercado',i.identidad_mercado,
      'canonizada',i.canonizada,
      'fuente_codigo',a.fuente_codigo
    )
  from public.tpl_market_publicaciones p
  join public.tpl_market_publicaciones_actuales_v1 a
    on a.publicacion_id=p.id
  join public.tpl_market_identidad_efectiva_v16 i
    on i.publicacion_id=p.id;

  get diagnostics n = row_count;
  return jsonb_build_object('ok',true,'snapshots_insertados',n,'generado_at',now());
end;
$$;

-- 10) Auditoría.
create or replace function public.tpl_market_auditoria_canonizacion_v16()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'version','1.6',
  'modo','CANONIZACION_SEGURA_REVERSIBLE',
  'generado_at',now(),
  'grupos_activos',(select count(*) from public.tpl_market_grupos_canonicos where estado='activo'),
  'grupos_revision',(select count(*) from public.tpl_market_grupos_canonicos where estado='revision'),
  'grupos_revertidos',(select count(*) from public.tpl_market_grupos_canonicos where estado='revertido'),
  'publicaciones_canonizadas',(
    select count(*) from public.tpl_market_identidad_efectiva_v16 where canonizada
  ),
  'identidades_mercado',(
    select count(distinct identidad_mercado) from public.tpl_market_identidad_efectiva_v16
  ),
  'historial_observaciones',(select count(*) from public.tpl_market_historial_multifuente),
  'feedback_mismas',(select count(*) from public.tpl_market_match_feedback where resultado='misma'),
  'feedback_distintas',(select count(*) from public.tpl_market_match_feedback where resultado='distinta')
);
$$;

-- 11) Fuente RE/MAX: solo asegurar catálogo si todavía no existe.
-- No inventa publicaciones ni hace scraping.
insert into public.tpl_market_fuentes(codigo,nombre,tipo,activo,metadata)
select
  'remax',
  'RE/MAX',
  'corredora',
  true,
  jsonb_build_object(
    'rol','fuente_complementaria',
    'uso','validacion_multifuente',
    'ingesta','solo_evidencia_real'
  )
where not exists (
  select 1 from public.tpl_market_fuentes where lower(codigo)='remax'
);

-- Permisos
revoke all on function public.tpl_market_canonizar_par_v16(uuid,uuid,text) from public;
revoke all on function public.tpl_market_revertir_grupo_v16(uuid,text) from public;
revoke all on function public.tpl_market_snapshot_historial_v16() from public;
revoke all on function public.tpl_market_auditoria_canonizacion_v16() from public;

grant execute on function public.tpl_market_canonizar_par_v16(uuid,uuid,text)
to authenticated,service_role;
grant execute on function public.tpl_market_revertir_grupo_v16(uuid,text)
to authenticated,service_role;
grant execute on function public.tpl_market_snapshot_historial_v16()
to authenticated,service_role;
grant execute on function public.tpl_market_auditoria_canonizacion_v16()
to authenticated,service_role;

grant select on
  public.tpl_market_grupos_canonicos,
  public.tpl_market_grupo_publicaciones,
  public.tpl_market_historial_multifuente,
  public.tpl_market_identidad_efectiva_v16,
  public.tpl_market_publicaciones_canonicas_v16,
  public.tpl_market_grupos_resumen_v16
to authenticated,service_role;

-- No canoniza automáticamente.
select public.tpl_market_auditoria_canonizacion_v16();
