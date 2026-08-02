-- TPL · Tasador como fuente canónica del ecosistema
begin;

create extension if not exists pgcrypto;

create table if not exists public.tpl_analisis_territoriales (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('AT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  propiedad_id uuid references public.tpl_propiedades(id) on delete cascade,
  tasacion_id uuid references public.tpl_tasaciones(id) on delete set null,
  proyecto_id uuid references public.tpl_proyectos(id) on delete set null,
  actor_id uuid references public.tpl_actores(id) on delete set null,
  origen text not null default 'tasador_publico',
  estado text not null default 'vigente' check (estado in ('borrador','vigente','reemplazado','archivado')),
  nivel_confianza text not null default 'orientativo',
  ubicacion jsonb not null default '{}'::jsonb,
  geometria jsonb not null default '{}'::jsonb,
  accesibilidad jsonb not null default '{}'::jsonb,
  entorno jsonb not null default '{}'::jsonb,
  infraestructura jsonb not null default '{}'::jsonb,
  distancias jsonb not null default '{}'::jsonb,
  riesgos jsonb not null default '{}'::jsonb,
  clima jsonb not null default '{}'::jsonb,
  indices_tpl jsonb not null default '{}'::jsonb,
  recomendaciones jsonb not null default '[]'::jsonb,
  resumen_publico jsonb not null default '{}'::jsonb,
  analisis_proyecto jsonb not null default '{}'::jsonb,
  informe_premium jsonb not null default '{}'::jsonb,
  entrada jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  version_motor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_analisis_territoriales_propiedad_idx
  on public.tpl_analisis_territoriales(propiedad_id, created_at desc);
create index if not exists tpl_analisis_territoriales_tasacion_idx
  on public.tpl_analisis_territoriales(tasacion_id, created_at desc);
create index if not exists tpl_analisis_territoriales_proyecto_idx
  on public.tpl_analisis_territoriales(proyecto_id, created_at desc);
create unique index if not exists tpl_analisis_territoriales_actual_propiedad_uq
  on public.tpl_analisis_territoriales(propiedad_id)
  where propiedad_id is not null and estado='vigente';

alter table public.tpl_propiedades
  add column if not exists analisis_territorial_actual_id uuid references public.tpl_analisis_territoriales(id) on delete set null;

alter table public.tpl_proyectos
  add column if not exists analisis_territorial_actual_id uuid references public.tpl_analisis_territoriales(id) on delete set null;

do $$
begin
  if to_regclass('public.tpl_ordenes_informe') is not null then
    alter table public.tpl_ordenes_informe
      add column if not exists propiedad_id uuid references public.tpl_propiedades(id) on delete set null;
  end if;
end $$;

create or replace function public.tpl_registrar_analisis_tasador_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_propiedad uuid;
  v_tasacion uuid;
  v_proyecto uuid;
  v_actor uuid;
  v_id uuid;
  v_origen text;
  v_codigo_prop text;
begin
  v_origen := left(coalesce(nullif(p_payload->>'origen',''),'tasador_publico'),60);
  v_codigo_prop := nullif(coalesce(p_payload->>'propiedad_codigo',p_payload#>>'{entrada,propiedad_codigo}',p_payload#>>'{entrada,codigo}'), '');

  begin v_propiedad := nullif(p_payload->>'propiedad_id','')::uuid; exception when others then v_propiedad:=null; end;
  begin v_tasacion := nullif(p_payload->>'tasacion_id','')::uuid; exception when others then v_tasacion:=null; end;
  begin v_proyecto := nullif(p_payload->>'proyecto_id','')::uuid; exception when others then v_proyecto:=null; end;

  if v_propiedad is null and v_codigo_prop is not null then
    select id into v_propiedad from public.tpl_propiedades
    where codigo=v_codigo_prop or id::text=v_codigo_prop limit 1;
  end if;
  if v_propiedad is null and v_tasacion is not null then
    select propiedad_id into v_propiedad from public.tpl_tasaciones where id=v_tasacion;
  end if;

  if auth.uid() is not null then
    select id into v_actor from public.tpl_actores where auth_user_id=auth.uid() limit 1;
  end if;

  if v_propiedad is not null then
    update public.tpl_analisis_territoriales
       set estado='reemplazado', updated_at=now()
     where propiedad_id=v_propiedad and estado='vigente';
  end if;

  insert into public.tpl_analisis_territoriales(
    propiedad_id,tasacion_id,proyecto_id,actor_id,origen,estado,nivel_confianza,
    ubicacion,geometria,accesibilidad,entorno,infraestructura,distancias,riesgos,clima,
    indices_tpl,recomendaciones,resumen_publico,analisis_proyecto,informe_premium,
    entrada,resultado,version_motor,metadata
  ) values (
    v_propiedad,v_tasacion,v_proyecto,v_actor,v_origen,'vigente',
    left(coalesce(nullif(p_payload->>'nivel_confianza',''),'orientativo'),40),
    coalesce(p_payload->'ubicacion','{}'::jsonb),
    coalesce(p_payload->'geometria','{}'::jsonb),
    coalesce(p_payload->'accesibilidad','{}'::jsonb),
    coalesce(p_payload->'entorno','{}'::jsonb),
    coalesce(p_payload->'infraestructura','{}'::jsonb),
    coalesce(p_payload->'distancias','{}'::jsonb),
    coalesce(p_payload->'riesgos','{}'::jsonb),
    coalesce(p_payload->'clima','{}'::jsonb),
    coalesce(p_payload->'indices_tpl','{}'::jsonb),
    coalesce(p_payload->'recomendaciones','[]'::jsonb),
    coalesce(p_payload->'resumen_publico','{}'::jsonb),
    coalesce(p_payload->'analisis_proyecto','{}'::jsonb),
    coalesce(p_payload->'informe_premium','{}'::jsonb),
    coalesce(p_payload->'entrada','{}'::jsonb),
    coalesce(p_payload->'resultado','{}'::jsonb),
    left(coalesce(p_payload->>'version_motor','tpl-land-engine-v2'),100),
    coalesce(p_payload->'metadata','{}'::jsonb)
  ) returning id into v_id;

  if v_propiedad is not null then
    update public.tpl_propiedades set analisis_territorial_actual_id=v_id, updated_at=now() where id=v_propiedad;
  end if;
  if v_proyecto is not null then
    update public.tpl_proyectos set analisis_territorial_actual_id=v_id, updated_at=now() where id=v_proyecto;
  end if;

  return jsonb_build_object('ok',true,'analisis_id',v_id,'propiedad_id',v_propiedad,'tasacion_id',v_tasacion,'proyecto_id',v_proyecto);
end;
$$;

revoke all on function public.tpl_registrar_analisis_tasador_v1(jsonb) from public;
grant execute on function public.tpl_registrar_analisis_tasador_v1(jsonb) to anon, authenticated;

create or replace function public.tpl_analisis_publico_propiedad_v1(p_identificador text)
returns jsonb
language sql
security definer
stable
set search_path=public
as $$
  select coalesce((
    select jsonb_build_object(
      'codigo',a.codigo,
      'created_at',a.created_at,
      'nivel_confianza',a.nivel_confianza,
      'ubicacion', jsonb_build_object(
        'region',a.ubicacion->'region','comuna',a.ubicacion->'comuna',
        'metodo',a.ubicacion->'metodo','precision',a.ubicacion->'precision'
      ),
      'accesibilidad',a.accesibilidad,
      'entorno',a.entorno,
      'infraestructura',a.infraestructura,
      'distancias',a.distancias,
      'indices_tpl',a.indices_tpl,
      'recomendaciones',a.recomendaciones,
      'resumen_publico',a.resumen_publico
    )
    from public.tpl_propiedades p
    join public.tpl_analisis_territoriales a on a.id=p.analisis_territorial_actual_id
    where (p.id::text=p_identificador or p.codigo=p_identificador)
      and p.estado_publicacion in ('publicada','activa','disponible')
    limit 1
  ), '{}'::jsonb);
$$;

grant execute on function public.tpl_analisis_publico_propiedad_v1(text) to anon, authenticated;

create or replace function public.tpl_analisis_proyecto_propiedad_v1(p_identificador text)
returns jsonb
language sql
security definer
stable
set search_path=public
as $$
  select coalesce((
    select jsonb_build_object(
      'codigo',a.codigo,'created_at',a.created_at,'nivel_confianza',a.nivel_confianza,
      'ubicacion',a.ubicacion,'geometria',a.geometria,'accesibilidad',a.accesibilidad,
      'entorno',a.entorno,'infraestructura',a.infraestructura,'distancias',a.distancias,
      'riesgos',a.riesgos,'clima',a.clima,'indices_tpl',a.indices_tpl,
      'recomendaciones',a.recomendaciones,'analisis_proyecto',a.analisis_proyecto
    )
    from public.tpl_propiedades p
    join public.tpl_analisis_territoriales a on a.id=p.analisis_territorial_actual_id
    where (p.id::text=p_identificador or p.codigo=p_identificador)
    limit 1
  ), '{}'::jsonb);
$$;

grant execute on function public.tpl_analisis_proyecto_propiedad_v1(text) to anon, authenticated;

alter table public.tpl_analisis_territoriales enable row level security;
drop policy if exists tpl_analisis_staff_select on public.tpl_analisis_territoriales;
create policy tpl_analisis_staff_select on public.tpl_analisis_territoriales for select to authenticated
using (exists(select 1 from public.tpl_staff s where s.auth_user_id=auth.uid() and s.activo=true));

grant select on public.tpl_analisis_territoriales to authenticated;

commit;
