-- TPL Agenda Virtual del Propietario v1
-- Ejecutar después de 202608010002_tpl_pagos_informes_v1.sql

create table if not exists public.tpl_documentos_actor (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  propiedad_id uuid references public.tpl_propiedades(id) on delete cascade,
  tipo text not null default 'otro',
  nombre text not null,
  estado text not null default 'disponible' check (estado in ('pendiente','en_revision','disponible','rechazado','vencido','archivado')),
  storage_bucket text,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tpl_notificaciones_actor (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  propiedad_id uuid references public.tpl_propiedades(id) on delete cascade,
  tipo text not null default 'informativa',
  titulo text not null,
  mensaje text not null,
  accion_url text,
  leida_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tpl_documentos_actor_idx on public.tpl_documentos_actor(actor_id,created_at desc);
create index if not exists tpl_notificaciones_actor_idx on public.tpl_notificaciones_actor(actor_id,leida_at,created_at desc);

create or replace function public.tpl_actor_actual_id()
returns uuid
language sql
stable
security definer
set search_path=public,auth
as $$
  select a.id
  from public.tpl_actores a
  join auth.users u on u.id=auth.uid()
  where lower(a.email)=lower(u.email)
  order by a.created_at asc
  limit 1
$$;

create or replace function public.tpl_agenda_propietario_resumen_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sesión requerida.'; end if;
  v_actor := public.tpl_actor_actual_id();
  if v_actor is null then
    return jsonb_build_object('ok',false,'sin_actor',true,'mensaje','Tu cuenta todavía no está vinculada a un perfil de propietario.');
  end if;

  select jsonb_build_object(
    'ok',true,
    'actor',(select jsonb_build_object('id',a.id,'nombre',a.nombre,'email',a.email,'telefono',a.telefono,'comuna',a.comuna) from public.tpl_actores a where a.id=v_actor),
    'resumen',jsonb_build_object(
      'propiedades',(select count(*) from public.tpl_propiedades p where p.propietario_actor_id=v_actor),
      'publicadas',(select count(*) from public.tpl_propiedades p where p.propietario_actor_id=v_actor and p.estado='publicada'),
      'tasaciones',(select count(*) from public.tpl_tasaciones t where t.actor_id=v_actor or exists(select 1 from public.tpl_propiedades p where p.id=t.propiedad_id and p.propietario_actor_id=v_actor)),
      'informes',(select count(*) from public.tpl_ordenes_informe o where o.actor_id=v_actor or lower(o.contacto->>'email')=(select lower(email) from public.tpl_actores where id=v_actor)),
      'notificaciones_no_leidas',(select count(*) from public.tpl_notificaciones_actor n where n.actor_id=v_actor and n.leida_at is null)
    ),
    'propiedades',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'codigo',p.codigo,'titulo',coalesce(p.titulo,'Propiedad sin título'),'tipo',p.tipo,'estado',p.estado,
      'comuna',p.comuna,'sector',p.sector,'superficie_m2',p.superficie_m2,'precio_publicado',p.precio_publicado,
      'publicada_at',p.publicada_at,'updated_at',p.updated_at,
      'indice_comercial',least(100,greatest(0,
        25 + case when p.precio_publicado is not null then 15 else 0 end
           + case when p.superficie_m2 is not null then 10 else 0 end
           + case when p.descripcion is not null and length(p.descripcion)>80 then 15 else 0 end
           + case when p.rol_situacion is not null then 10 else 0 end
           + case when p.agua is not null then 8 else 0 end
           + case when p.electricidad is not null then 7 else 0 end
           + case when p.estado='publicada' then 10 else 0 end))
    ) order by p.updated_at desc) from public.tpl_propiedades p where p.propietario_actor_id=v_actor),'[]'::jsonb),
    'tasaciones',coalesce((select jsonb_agg(jsonb_build_object(
      'id',t.id,'propiedad_id',t.propiedad_id,'tipo',t.tipo,'valor_tpl_total',t.valor_tpl_total,'valor_tpl_m2',t.valor_tpl_m2,
      'precio_publicado',t.precio_publicado,'clasificacion',t.clasificacion,'version_motor',t.version_motor,'created_at',t.created_at
    ) order by t.created_at desc) from public.tpl_tasaciones t where t.actor_id=v_actor or exists(select 1 from public.tpl_propiedades p where p.id=t.propiedad_id and p.propietario_actor_id=v_actor)),'[]'::jsonb),
    'informes',coalesce((select jsonb_agg(jsonb_build_object(
      'id',o.id,'codigo',o.codigo,'estado',o.estado,'monto_clp',o.monto_clp,'created_at',o.created_at,'disponible_at',o.disponible_at,
      'tipo_informe',o.tipo_informe
    ) order by o.created_at desc) from public.tpl_ordenes_informe o where o.actor_id=v_actor or lower(o.contacto->>'email')=(select lower(email) from public.tpl_actores where id=v_actor)),'[]'::jsonb),
    'documentos',coalesce((select jsonb_agg(to_jsonb(d) - 'storage_path' order by d.created_at desc) from public.tpl_documentos_actor d where d.actor_id=v_actor),'[]'::jsonb),
    'notificaciones',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'tipo',n.tipo,'titulo',n.titulo,'mensaje',n.mensaje,'accion_url',n.accion_url,'leida_at',n.leida_at,'created_at',n.created_at) order by n.created_at desc) from public.tpl_notificaciones_actor n where n.actor_id=v_actor limit 30),'[]'::jsonb),
    'planes',coalesce((select jsonb_agg(jsonb_build_object('codigo',p.codigo,'nombre',p.nombre,'descripcion',p.descripcion,'nivel',p.nivel,'precio_mensual_clp',p.precio_mensual_clp,'dias_prueba',p.dias_prueba,'caracteristicas',p.caracteristicas) order by p.nivel) from public.tpl_planes_comerciales p where p.activo),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.tpl_agenda_marcar_notificacion_v1(p_notificacion_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_actor uuid;
begin
  if auth.uid() is null then raise exception 'Sesión requerida.'; end if;
  v_actor:=public.tpl_actor_actual_id();
  update public.tpl_notificaciones_actor set leida_at=coalesce(leida_at,now()) where id=p_notificacion_id and actor_id=v_actor;
  return found;
end;
$$;

alter table public.tpl_documentos_actor enable row level security;
alter table public.tpl_notificaciones_actor enable row level security;
revoke all on public.tpl_documentos_actor,public.tpl_notificaciones_actor from anon,authenticated;
grant execute on function public.tpl_actor_actual_id() to authenticated;
grant execute on function public.tpl_agenda_propietario_resumen_v1() to authenticated;
grant execute on function public.tpl_agenda_marcar_notificacion_v1(uuid) to authenticated;
