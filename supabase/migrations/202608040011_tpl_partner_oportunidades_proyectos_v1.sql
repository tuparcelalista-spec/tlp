-- TPL Partner — oportunidades compatibles y paso a solicitud/proyecto v1
create table if not exists public.tpl_matches_partner (
  id uuid primary key default gen_random_uuid(),
  necesidad_id uuid not null references public.tpl_necesidades_proyecto(id) on delete cascade,
  partner_actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  servicio_id uuid not null references public.tpl_servicios(id) on delete cascade,
  puntaje integer not null default 0 check (puntaje between 0 and 100),
  motivos jsonb not null default '[]'::jsonb,
  estado text not null default 'sugerido' check (estado in ('sugerido','visto','interesado','descartado','convertido')),
  solicitud_id uuid references public.tpl_partner_solicitudes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(necesidad_id,partner_actor_id)
);
create index if not exists tpl_matches_partner_actor_idx on public.tpl_matches_partner(partner_actor_id,estado,puntaje desc);
create index if not exists tpl_matches_partner_necesidad_idx on public.tpl_matches_partner(necesidad_id,puntaje desc);
alter table public.tpl_matches_partner enable row level security;

create or replace function public.tpl_refrescar_matches_necesidad_v1(p_necesidad_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare n public.tpl_necesidades_proyecto%rowtype; p public.tpl_propiedades%rowtype; inserted integer:=0;
begin
  select * into n from public.tpl_necesidades_proyecto where id=p_necesidad_id;
  if n.id is null then return 0; end if;
  select * into p from public.tpl_propiedades where id=n.propiedad_id;
  insert into public.tpl_matches_partner(necesidad_id,partner_actor_id,servicio_id,puntaje,motivos)
  select n.id,ps.partner_actor_id,n.servicio_id,
    least(100,
      35
      + case when ps.disponibilidad='disponible' then 15 when ps.disponibilidad='limitada' then 5 else 0 end
      + case when cardinality(ps.comunas)=0 or p.comuna=any(ps.comunas) then 20 else 0 end
      + case when cardinality(ps.regiones)=0 or p.region=any(ps.regiones) then 10 else 0 end
      + least(10,coalesce(ps.trabajos_completados,0))
      + least(10,round(coalesce(ps.rating,0)*2)::int)
    ),
    jsonb_build_array(
      case when ps.disponibilidad='disponible' then 'Disponibilidad informada' else 'Disponibilidad limitada' end,
      case when cardinality(ps.comunas)=0 or p.comuna=any(ps.comunas) then 'Cobertura compatible con la comuna' else 'Cobertura regional compatible' end,
      case when coalesce(ps.trabajos_completados,0)>0 then coalesce(ps.trabajos_completados,0)||' trabajos registrados' else 'Empresa nueva en TPL' end
    )
  from public.tpl_partner_servicios ps
  where ps.servicio_id=n.servicio_id and ps.activo=true and ps.disponibilidad<>'no_disponible'
    and (p.id is null or cardinality(ps.comunas)=0 or p.comuna=any(ps.comunas) or cardinality(ps.regiones)=0 or p.region=any(ps.regiones))
  on conflict(necesidad_id,partner_actor_id) do update set
    puntaje=excluded.puntaje,motivos=excluded.motivos,updated_at=now()
  where public.tpl_matches_partner.estado in ('sugerido','visto');
  get diagnostics inserted=row_count;
  return inserted;
end $$;

create or replace function public.tpl_partner_oportunidades_v1()
returns jsonb language sql stable security definer set search_path=public as $$
with actor as (
  select id from public.tpl_actores where lower(email)=lower(coalesce(auth.jwt()->>'email','')) order by created_at limit 1
), rows as (
  select m.id,m.puntaje,m.motivos,m.estado,m.created_at,
    n.id necesidad_id,n.prioridad,n.detalle,n.estimacion_referencial,n.cantidad,n.unidad,
    s.codigo servicio_codigo,s.nombre servicio_nombre,s.categoria,
    p.codigo propiedad_codigo,p.titulo propiedad_titulo,p.region,p.comuna,p.sector,p.superficie_m2
  from public.tpl_matches_partner m
  join actor a on a.id=m.partner_actor_id
  join public.tpl_necesidades_proyecto n on n.id=m.necesidad_id
  join public.tpl_servicios s on s.id=m.servicio_id
  left join public.tpl_propiedades p on p.id=n.propiedad_id
  where m.estado in ('sugerido','visto','interesado') and n.estado in ('detectada','sugerida','agregada','cotizando')
  order by m.puntaje desc,m.created_at desc limit 50
)
select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) from rows;
$$;

create or replace function public.tpl_partner_manifestar_interes_v1(p_match_id uuid,p_mensaje text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.tpl_matches_partner%rowtype; n public.tpl_necesidades_proyecto%rowtype; p public.tpl_propiedades%rowtype; actor_id uuid; sol uuid;
begin
  select id into actor_id from public.tpl_actores where lower(email)=lower(coalesce(auth.jwt()->>'email','')) order by created_at limit 1;
  select * into m from public.tpl_matches_partner where id=p_match_id and partner_actor_id=actor_id for update;
  if m.id is null then raise exception 'OPORTUNIDAD_NO_DISPONIBLE'; end if;
  if m.solicitud_id is not null then return jsonb_build_object('ok',true,'solicitud_id',m.solicitud_id,'reutilizada',true); end if;
  select * into n from public.tpl_necesidades_proyecto where id=m.necesidad_id;
  select * into p from public.tpl_propiedades where id=n.propiedad_id;
  insert into public.tpl_partner_solicitudes(partner_actor_id,servicio_id,estado,nombre_cliente,comuna,descripcion,presupuesto_referencial,origen,metadata)
  values(actor_id,m.servicio_id,'nueva','Cliente TPL',p.comuna,
    coalesce(nullif(trim(p_mensaje),''),coalesce(n.detalle,'Necesidad detectada por TPL')),
    n.estimacion_referencial,'motor_oportunidades',jsonb_build_object('match_id',m.id,'necesidad_id',n.id,'propiedad_id',p.id))
  returning id into sol;
  update public.tpl_matches_partner set estado='interesado',solicitud_id=sol,updated_at=now() where id=m.id;
  update public.tpl_necesidades_proyecto set estado='cotizando',updated_at=now() where id=n.id and estado in ('detectada','sugerida','agregada');
  insert into public.tpl_eventos(evento,metadata) values('partner_interes_oportunidad',jsonb_build_object('match_id',m.id,'solicitud_id',sol,'partner_actor_id',actor_id,'necesidad_id',n.id));
  return jsonb_build_object('ok',true,'solicitud_id',sol,'reutilizada',false);
end $$;

create or replace function public.tpl_crm_oportunidades_partner_v1()
returns jsonb language sql stable security definer set search_path=public as $$
select case when public.tpl_es_admin() then coalesce(jsonb_agg(to_jsonb(x) order by x.puntaje desc,x.created_at desc),'[]'::jsonb) else '[]'::jsonb end
from (
  select m.id,m.estado,m.puntaje,m.motivos,m.created_at,m.solicitud_id,
    a.nombre partner_nombre,a.email partner_email,
    s.nombre servicio_nombre,n.prioridad,n.estado necesidad_estado,n.estimacion_referencial,
    p.codigo propiedad_codigo,p.titulo propiedad_titulo,p.region,p.comuna
  from public.tpl_matches_partner m
  join public.tpl_actores a on a.id=m.partner_actor_id
  join public.tpl_servicios s on s.id=m.servicio_id
  join public.tpl_necesidades_proyecto n on n.id=m.necesidad_id
  left join public.tpl_propiedades p on p.id=n.propiedad_id
  order by m.created_at desc limit 200
) x;
$$;

revoke all on function public.tpl_refrescar_matches_necesidad_v1(uuid) from public;
revoke all on function public.tpl_partner_oportunidades_v1() from public;
revoke all on function public.tpl_partner_manifestar_interes_v1(uuid,text) from public;
revoke all on function public.tpl_crm_oportunidades_partner_v1() from public;
grant execute on function public.tpl_partner_oportunidades_v1() to authenticated;
grant execute on function public.tpl_partner_manifestar_interes_v1(uuid,text) to authenticated;
grant execute on function public.tpl_crm_oportunidades_partner_v1() to authenticated;

-- Generar matches iniciales para necesidades activas.
do $$ declare r record; begin
  for r in select id from public.tpl_necesidades_proyecto where estado in ('detectada','sugerida','agregada','cotizando') loop
    perform public.tpl_refrescar_matches_necesidad_v1(r.id);
  end loop;
end $$;
