-- TPL Partner ejecución de proyectos, avances y revisión del cliente v1
-- Ejecutar después del núcleo TPL y de TPL Business Partner.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.tpl_hitos_orden_servicio (
  id uuid primary key default gen_random_uuid(),
  orden_servicio_id uuid not null references public.tpl_ordenes_servicio(id) on delete cascade,
  numero integer not null,
  titulo text not null,
  descripcion text,
  porcentaje_objetivo numeric(5,2) not null check (porcentaje_objetivo > 0 and porcentaje_objetivo <= 100),
  monto_estimado bigint,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_ejecucion','presentado','observado','aprobado','pagado','cerrado')),
  fecha_inicio_estimada date,
  fecha_termino_estimada date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orden_servicio_id, numero)
);

alter table public.tpl_avances_trabajo
  add column if not exists hito_id uuid references public.tpl_hitos_orden_servicio(id) on delete set null,
  add column if not exists titulo text,
  add column if not exists porcentaje_anterior numeric(5,2),
  add column if not exists proxima_actividad text,
  add column if not exists fecha_avance date,
  add column if not exists cliente_actor_id uuid references public.tpl_actores(id) on delete set null,
  add column if not exists revisado_por_actor_id uuid references public.tpl_actores(id) on delete set null,
  add column if not exists revision_comentario text,
  add column if not exists aprobado_at timestamptz,
  add column if not exists observado_at timestamptz;

create table if not exists public.tpl_comunicaciones_cola (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.tpl_actores(id) on delete set null,
  canal text not null default 'email' check (canal in ('email','whatsapp','interno')),
  destinatario text,
  plantilla text not null,
  asunto text,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente','procesando','enviado','error','cancelado')),
  intentos integer not null default 0,
  ultimo_error text,
  procesar_desde timestamptz not null default now(),
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_hitos_orden_idx on public.tpl_hitos_orden_servicio(orden_servicio_id,numero);
create index if not exists tpl_avances_orden_fecha_idx on public.tpl_avances_trabajo(orden_servicio_id,created_at desc);
create index if not exists tpl_avances_estado_idx on public.tpl_avances_trabajo(estado,created_at desc);
create index if not exists tpl_comunicaciones_pendientes_idx on public.tpl_comunicaciones_cola(estado,procesar_desde,created_at);

alter table public.tpl_hitos_orden_servicio enable row level security;
alter table public.tpl_comunicaciones_cola enable row level security;
revoke all on public.tpl_hitos_orden_servicio, public.tpl_comunicaciones_cola from anon, authenticated;

create or replace function public.tpl_actor_puede_ver_orden_v1(p_actor uuid,p_orden uuid)
returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1
    from public.tpl_ordenes_servicio o
    join public.tpl_proyectos pr on pr.id=o.proyecto_id
    left join public.tpl_propiedades prop on prop.id=pr.propiedad_id
    where o.id=p_orden and (
      o.partner_actor_id=p_actor or
      pr.comprador_actor_id=p_actor or
      prop.propietario_actor_id=p_actor or
      exists(select 1 from public.tpl_proyecto_actores pa where pa.proyecto_id=pr.id and pa.actor_id=p_actor and pa.estado_participacion='activo')
    )
  )
$$;

create or replace function public.tpl_actor_cliente_orden_v1(p_orden uuid)
returns uuid
language sql stable security definer set search_path=public as $$
  select coalesce(pr.comprador_actor_id,prop.propietario_actor_id,
    (select pa.actor_id from public.tpl_proyecto_actores pa where pa.proyecto_id=pr.id and pa.rol_en_proyecto in ('cliente','propietario','comprador') and pa.estado_participacion='activo' order by pa.created_at limit 1))
  from public.tpl_ordenes_servicio o
  join public.tpl_proyectos pr on pr.id=o.proyecto_id
  left join public.tpl_propiedades prop on prop.id=pr.propiedad_id
  where o.id=p_orden
$$;

create or replace function public.tpl_partner_guardar_hitos_v1(p_orden_id uuid,p_hitos jsonb)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_actor uuid; v_item jsonb; v_num integer:=0; v_total numeric:=0;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  v_actor:=public.tpl_actor_actual_id();
  if not exists(select 1 from public.tpl_ordenes_servicio where id=p_orden_id and partner_actor_id=v_actor and estado in ('aceptada_partner','esperando_cliente','contratada','en_ejecucion','pausada')) then raise exception 'ORDEN_NO_AUTORIZADA'; end if;
  if jsonb_typeof(coalesce(p_hitos,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_hitos,'[]'::jsonb))=0 then raise exception 'HITOS_REQUERIDOS'; end if;
  delete from public.tpl_hitos_orden_servicio where orden_servicio_id=p_orden_id and estado='pendiente';
  for v_item in select * from jsonb_array_elements(p_hitos) loop
    v_num:=v_num+1;
    v_total:=v_total+coalesce((v_item->>'porcentaje_objetivo')::numeric,0);
    insert into public.tpl_hitos_orden_servicio(orden_servicio_id,numero,titulo,descripcion,porcentaje_objetivo,monto_estimado,fecha_inicio_estimada,fecha_termino_estimada,metadata)
    values(p_orden_id,v_num,left(trim(coalesce(v_item->>'titulo','Hito '||v_num)),120),nullif(trim(v_item->>'descripcion'),''),coalesce((v_item->>'porcentaje_objetivo')::numeric,0),nullif(v_item->>'monto_estimado','')::bigint,nullif(v_item->>'fecha_inicio_estimada','')::date,nullif(v_item->>'fecha_termino_estimada','')::date,coalesce(v_item->'metadata','{}'::jsonb));
  end loop;
  if abs(v_total-100)>0.01 then raise exception 'LOS_HITOS_DEBEN_SUMAR_100'; end if;
  insert into public.tpl_eventos(actor_id,proyecto_id,orden_servicio_id,evento,categoria,origen,descripcion,metadata)
  select v_actor,o.proyecto_id,o.id,'partner.hitos_definidos','proyecto','tpl_business_partner','La empresa definió el plan de hitos del trabajo.',jsonb_build_object('cantidad',v_num)
  from public.tpl_ordenes_servicio o where o.id=p_orden_id;
  return jsonb_build_object('ok',true,'cantidad',v_num);
end $$;

create or replace function public.tpl_partner_registrar_avance_v1(p_orden_id uuid,p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid; v_cliente uuid; v_orden public.tpl_ordenes_servicio; v_anterior numeric:=0; v_porcentaje numeric; v_id uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  v_actor:=public.tpl_actor_actual_id();
  select * into v_orden from public.tpl_ordenes_servicio where id=p_orden_id for update;
  if v_orden.id is null or v_orden.partner_actor_id is distinct from v_actor then raise exception 'ORDEN_NO_AUTORIZADA'; end if;
  if v_orden.estado not in ('contratada','en_ejecucion','pausada') then raise exception 'ORDEN_NO_EJECUTABLE'; end if;
  select coalesce(max(porcentaje),0) into v_anterior from public.tpl_avances_trabajo where orden_servicio_id=p_orden_id and estado in ('enviado','aprobado_cliente','aprobado_tpl','pagado');
  v_porcentaje:=coalesce((p_payload->>'porcentaje')::numeric,0);
  if v_porcentaje<=v_anterior or v_porcentaje>100 then raise exception 'PORCENTAJE_INVALIDO'; end if;
  if length(trim(coalesce(p_payload->>'descripcion','')))<20 then raise exception 'DESCRIPCION_INSUFICIENTE'; end if;
  v_cliente:=public.tpl_actor_cliente_orden_v1(p_orden_id);
  insert into public.tpl_avances_trabajo(orden_servicio_id,partner_actor_id,hito_id,titulo,porcentaje_anterior,porcentaje,descripcion,evidencias,monto_solicitado,estado,proxima_actividad,fecha_avance,cliente_actor_id,enviado_at,metadata)
  values(p_orden_id,v_actor,nullif(p_payload->>'hito_id','')::uuid,left(trim(coalesce(p_payload->>'titulo','Avance de trabajo')),140),v_anterior,v_porcentaje,trim(p_payload->>'descripcion'),coalesce(p_payload->'evidencias','[]'::jsonb),nullif(p_payload->>'monto_solicitado','')::bigint,'enviado',nullif(trim(p_payload->>'proxima_actividad'),''),coalesce(nullif(p_payload->>'fecha_avance','')::date,current_date),v_cliente,now(),jsonb_build_object('origen','tpl_business_partner')) returning id into v_id;
  update public.tpl_ordenes_servicio set estado='en_ejecucion',updated_at=now() where id=p_orden_id and estado<>'en_ejecucion';
  update public.tpl_hitos_orden_servicio set estado='presentado',updated_at=now() where id=nullif(p_payload->>'hito_id','')::uuid;
  if v_cliente is not null then
    insert into public.tpl_notificaciones_actor(actor_id,propiedad_id,tipo,titulo,mensaje,accion_url,metadata)
    select v_cliente,pr.propiedad_id,'avance_trabajo','Nuevo avance de tu proyecto',coalesce(p_payload->>'titulo','La empresa registró un nuevo avance')||' · '||trim(to_char(v_porcentaje,'FM990D00'))||'% completado.','/plataforma/tpl-business/?view=proyectos',jsonb_build_object('avance_id',v_id,'orden_id',p_orden_id)
    from public.tpl_proyectos pr where pr.id=v_orden.proyecto_id;
    select email into v_email from public.tpl_actores where id=v_cliente;
    insert into public.tpl_comunicaciones_cola(actor_id,canal,destinatario,plantilla,asunto,payload)
    values(v_cliente,'email',v_email,'nuevo_avance_proyecto','Nuevo avance en tu proyecto TPL',jsonb_build_object('avance_id',v_id,'orden_id',p_orden_id,'porcentaje',v_porcentaje));
  end if;
  insert into public.tpl_eventos(actor_id,proyecto_id,orden_servicio_id,evento,categoria,origen,descripcion,metadata)
  values(v_actor,v_orden.proyecto_id,p_orden_id,'partner.avance_enviado','proyecto','tpl_business_partner','La empresa registró un avance de trabajo.',jsonb_build_object('avance_id',v_id,'porcentaje',v_porcentaje,'cliente_actor_id',v_cliente));
  return jsonb_build_object('ok',true,'avance_id',v_id,'porcentaje',v_porcentaje,'cliente_notificado',v_cliente is not null);
end $$;

create or replace function public.tpl_cliente_revisar_avance_v1(p_avance_id uuid,p_decision text,p_comentario text default null)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid; v_avance public.tpl_avances_trabajo; v_orden public.tpl_ordenes_servicio; v_partner_email text; v_pago uuid;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  v_actor:=public.tpl_actor_actual_id();
  select * into v_avance from public.tpl_avances_trabajo where id=p_avance_id for update;
  if v_avance.id is null or not public.tpl_actor_puede_ver_orden_v1(v_actor,v_avance.orden_servicio_id) then raise exception 'AVANCE_NO_AUTORIZADO'; end if;
  if v_avance.partner_actor_id=v_actor then raise exception 'PARTNER_NO_PUEDE_REVISAR_SU_AVANCE'; end if;
  if v_avance.estado not in ('enviado','observado_cliente') then raise exception 'AVANCE_YA_REVISADO'; end if;
  if p_decision not in ('aprobar','observar') then raise exception 'DECISION_INVALIDA'; end if;
  select * into v_orden from public.tpl_ordenes_servicio where id=v_avance.orden_servicio_id;
  if p_decision='aprobar' then
    update public.tpl_avances_trabajo set estado='aprobado_cliente',revisado_por_actor_id=v_actor,revision_comentario=nullif(trim(p_comentario),''),revisado_at=now(),aprobado_at=now(),updated_at=now() where id=p_avance_id;
    update public.tpl_hitos_orden_servicio set estado='aprobado',updated_at=now() where id=v_avance.hito_id;
    if coalesce(v_avance.monto_solicitado,0)>0 and not exists(select 1 from public.tpl_pagos where metadata->>'avance_id'=p_avance_id::text and estado<>'anulado') then
      insert into public.tpl_pagos(proyecto_id,orden_servicio_id,pagador_actor_id,receptor_actor_id,tipo,monto,estado,metadata)
      values(v_orden.proyecto_id,v_orden.id,v_actor,v_orden.partner_actor_id,'hito',v_avance.monto_solicitado,'pendiente',jsonb_build_object('avance_id',p_avance_id,'habilitado_por_aprobacion',true)) returning id into v_pago;
    end if;
    if v_avance.porcentaje>=100 then
      update public.tpl_ordenes_servicio set estado='completada',terminada_at=now(),updated_at=now() where id=v_orden.id;
    end if;
  else
    if length(trim(coalesce(p_comentario,'')))<10 then raise exception 'OBSERVACION_REQUERIDA'; end if;
    update public.tpl_avances_trabajo set estado='observado_cliente',observacion_cliente=trim(p_comentario),revisado_por_actor_id=v_actor,revision_comentario=trim(p_comentario),revisado_at=now(),observado_at=now(),updated_at=now() where id=p_avance_id;
    update public.tpl_hitos_orden_servicio set estado='observado',updated_at=now() where id=v_avance.hito_id;
  end if;
  insert into public.tpl_notificaciones_actor(actor_id,tipo,titulo,mensaje,accion_url,metadata)
  values(v_orden.partner_actor_id,'revision_avance',case when p_decision='aprobar' then 'Avance aprobado por el cliente' else 'El cliente observó un avance' end,case when p_decision='aprobar' then 'El avance fue aprobado y el hito quedó habilitado para pago.' else trim(p_comentario) end,'/plataforma/tpl-business/?view=trabajos',jsonb_build_object('avance_id',p_avance_id,'orden_id',v_orden.id,'decision',p_decision));
  select email into v_partner_email from public.tpl_actores where id=v_orden.partner_actor_id;
  insert into public.tpl_comunicaciones_cola(actor_id,canal,destinatario,plantilla,asunto,payload)
  values(v_orden.partner_actor_id,'email',v_partner_email,'revision_avance_proyecto',case when p_decision='aprobar' then 'Tu avance fue aprobado' else 'Tu avance recibió una observación' end,jsonb_build_object('avance_id',p_avance_id,'orden_id',v_orden.id,'decision',p_decision,'comentario',p_comentario));
  insert into public.tpl_eventos(actor_id,proyecto_id,orden_servicio_id,evento,categoria,origen,descripcion,metadata)
  values(v_actor,v_orden.proyecto_id,v_orden.id,case when p_decision='aprobar' then 'cliente.avance_aprobado' else 'cliente.avance_observado' end,'proyecto','tpl_business_propietario',case when p_decision='aprobar' then 'El cliente aprobó el avance.' else 'El cliente solicitó correcciones al avance.' end,jsonb_build_object('avance_id',p_avance_id,'comentario',p_comentario,'pago_id',v_pago));
  return jsonb_build_object('ok',true,'estado',case when p_decision='aprobar' then 'aprobado_cliente' else 'observado_cliente' end,'pago_id',v_pago);
end $$;

create or replace function public.tpl_ejecucion_resumen_v1()
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_actor uuid;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  v_actor:=public.tpl_actor_actual_id();
  return jsonb_build_object(
    'actor_id',v_actor,
    'ordenes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.id,'codigo',o.codigo,'estado',o.estado,'proyecto_id',o.proyecto_id,'proyecto_nombre',pr.nombre,'propiedad_id',pr.propiedad_id,
        'servicio',jsonb_build_object('id',s.id,'codigo',s.codigo,'nombre',s.nombre,'categoria',s.categoria),
        'partner_actor_id',o.partner_actor_id,'es_partner',o.partner_actor_id=v_actor,'es_cliente',o.partner_actor_id is distinct from v_actor,
        'monto_estimado',o.monto_estimado,'monto_acordado',o.monto_acordado,'descripcion_alcance',o.descripcion_alcance,'inicio_estimado',o.inicio_estimado,'termino_estimado',o.termino_estimado,
        'porcentaje_actual',coalesce((select max(a.porcentaje) from public.tpl_avances_trabajo a where a.orden_servicio_id=o.id and a.estado in ('enviado','aprobado_cliente','observado_cliente','aprobado_tpl','pagado')),0),
        'hitos',coalesce((select jsonb_agg(to_jsonb(h) order by h.numero) from public.tpl_hitos_orden_servicio h where h.orden_servicio_id=o.id),'[]'::jsonb),
        'avances',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from public.tpl_avances_trabajo a where a.orden_servicio_id=o.id),'[]'::jsonb),
        'pagos',coalesce((select jsonb_agg(to_jsonb(pg) order by pg.created_at desc) from public.tpl_pagos pg where pg.orden_servicio_id=o.id),'[]'::jsonb)
      ) order by o.updated_at desc)
      from public.tpl_ordenes_servicio o
      join public.tpl_proyectos pr on pr.id=o.proyecto_id
      join public.tpl_servicios s on s.id=o.servicio_id
      where public.tpl_actor_puede_ver_orden_v1(v_actor,o.id)
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.tpl_actor_puede_ver_orden_v1(uuid,uuid) to authenticated;
grant execute on function public.tpl_actor_cliente_orden_v1(uuid) to authenticated;
grant execute on function public.tpl_partner_guardar_hitos_v1(uuid,jsonb) to authenticated;
grant execute on function public.tpl_partner_registrar_avance_v1(uuid,jsonb) to authenticated;
grant execute on function public.tpl_cliente_revisar_avance_v1(uuid,text,text) to authenticated;
grant execute on function public.tpl_ejecucion_resumen_v1() to authenticated;
