-- TPL pagos manuales, comprobantes y cierre financiero v1
-- Ejecutar después de 202608040012_tpl_partner_ejecucion_avances_v1.sql

alter table public.tpl_pagos
  add column if not exists informado_por_actor_id uuid references public.tpl_actores(id) on delete set null,
  add column if not exists revisado_por_actor_id uuid references public.tpl_actores(id) on delete set null,
  add column if not exists revision_comentario text,
  add column if not exists revisado_at timestamptz;

create index if not exists tpl_pagos_orden_estado_idx
  on public.tpl_pagos(orden_servicio_id, estado, created_at desc);

create or replace function public.tpl_cliente_informar_pago_v1(
  p_pago_id uuid,
  p_medio_pago text,
  p_referencia text default null,
  p_comprobante_storage_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public as $$
declare
  v_actor uuid;
  v_pago public.tpl_pagos;
  v_orden public.tpl_ordenes_servicio;
  v_partner_email text;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  v_actor:=public.tpl_actor_actual_id();

  select * into v_pago from public.tpl_pagos where id=p_pago_id for update;
  if v_pago.id is null then raise exception 'PAGO_NO_ENCONTRADO'; end if;
  if v_pago.orden_servicio_id is null or not public.tpl_actor_puede_ver_orden_v1(v_actor,v_pago.orden_servicio_id) then
    raise exception 'PAGO_NO_AUTORIZADO';
  end if;
  if v_pago.receptor_actor_id=v_actor then raise exception 'RECEPTOR_NO_PUEDE_INFORMAR_PAGO'; end if;
  if v_pago.estado not in ('pendiente','rechazado') then raise exception 'PAGO_NO_INFORMABLE'; end if;
  if length(trim(coalesce(p_medio_pago,'')))<3 then raise exception 'MEDIO_PAGO_REQUERIDO'; end if;
  if nullif(trim(coalesce(p_referencia,'')),'') is null and nullif(trim(coalesce(p_comprobante_storage_path,'')),'') is null then
    raise exception 'REFERENCIA_O_COMPROBANTE_REQUERIDO';
  end if;

  update public.tpl_pagos
  set estado='informado',
      medio_pago=left(trim(p_medio_pago),80),
      referencia=nullif(left(trim(coalesce(p_referencia,'')),180),''),
      comprobante_storage_path=nullif(trim(coalesce(p_comprobante_storage_path,'')),''),
      informado_por_actor_id=v_actor,
      informado_at=now(),
      revisado_por_actor_id=null,
      revision_comentario=null,
      revisado_at=null,
      updated_at=now()
  where id=p_pago_id;

  select * into v_orden from public.tpl_ordenes_servicio where id=v_pago.orden_servicio_id;

  insert into public.tpl_notificaciones_actor(actor_id,tipo,titulo,mensaje,accion_url,metadata)
  values(v_pago.receptor_actor_id,'pago_informado','Pago informado por el cliente',
    'El cliente informó un pago de '||to_char(v_pago.monto,'FM999G999G999G990')||' CLP. Revisa la referencia o comprobante.',
    '/plataforma/tpl-business/?view=trabajos',
    jsonb_build_object('pago_id',p_pago_id,'orden_id',v_pago.orden_servicio_id));

  select email into v_partner_email from public.tpl_actores where id=v_pago.receptor_actor_id;
  insert into public.tpl_comunicaciones_cola(actor_id,canal,destinatario,plantilla,asunto,payload)
  values(v_pago.receptor_actor_id,'email',v_partner_email,'pago_informado_proyecto','Nuevo pago informado en TPL',
    jsonb_build_object('pago_id',p_pago_id,'orden_id',v_pago.orden_servicio_id,'monto',v_pago.monto));

  insert into public.tpl_eventos(actor_id,proyecto_id,orden_servicio_id,evento,categoria,origen,descripcion,metadata)
  values(v_actor,v_pago.proyecto_id,v_pago.orden_servicio_id,'cliente.pago_informado','pago','tpl_business_propietario',
    'El cliente informó una transferencia o pago manual.',jsonb_build_object('pago_id',p_pago_id,'monto',v_pago.monto,'medio_pago',p_medio_pago));

  return jsonb_build_object('ok',true,'pago_id',p_pago_id,'estado','informado');
end $$;

create or replace function public.tpl_partner_revisar_pago_v1(
  p_pago_id uuid,
  p_decision text,
  p_comentario text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public as $$
declare
  v_actor uuid;
  v_pago public.tpl_pagos;
  v_cliente_email text;
  v_avance_id uuid;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  v_actor:=public.tpl_actor_actual_id();
  select * into v_pago from public.tpl_pagos where id=p_pago_id for update;
  if v_pago.id is null then raise exception 'PAGO_NO_ENCONTRADO'; end if;
  if v_pago.receptor_actor_id is distinct from v_actor then raise exception 'PAGO_NO_AUTORIZADO'; end if;
  if v_pago.estado not in ('informado','en_revision') then raise exception 'PAGO_YA_REVISADO'; end if;
  if p_decision not in ('confirmar','rechazar') then raise exception 'DECISION_INVALIDA'; end if;
  if p_decision='rechazar' and length(trim(coalesce(p_comentario,'')))<8 then raise exception 'MOTIVO_RECHAZO_REQUERIDO'; end if;

  if p_decision='confirmar' then
    update public.tpl_pagos
    set estado='confirmado',
        confirmado_at=now(),
        revisado_por_actor_id=v_actor,
        revision_comentario=nullif(trim(coalesce(p_comentario,'')),''),
        revisado_at=now(),
        updated_at=now()
    where id=p_pago_id;

    v_avance_id:=nullif(v_pago.metadata->>'avance_id','')::uuid;
    if v_avance_id is not null then
      update public.tpl_avances_trabajo set estado='pagado',updated_at=now() where id=v_avance_id and estado='aprobado_cliente';
      update public.tpl_hitos_orden_servicio h set estado='pagado',updated_at=now()
      from public.tpl_avances_trabajo a where a.id=v_avance_id and h.id=a.hito_id;
    end if;
  else
    update public.tpl_pagos
    set estado='rechazado',
        revisado_por_actor_id=v_actor,
        revision_comentario=trim(p_comentario),
        revisado_at=now(),
        updated_at=now()
    where id=p_pago_id;
  end if;

  insert into public.tpl_notificaciones_actor(actor_id,tipo,titulo,mensaje,accion_url,metadata)
  values(v_pago.pagador_actor_id,'revision_pago',
    case when p_decision='confirmar' then 'Pago confirmado por la empresa' else 'Pago rechazado por la empresa' end,
    case when p_decision='confirmar' then 'La empresa confirmó la recepción del pago.' else trim(p_comentario) end,
    '/plataforma/tpl-business/?view=proyectos',
    jsonb_build_object('pago_id',p_pago_id,'orden_id',v_pago.orden_servicio_id,'decision',p_decision));

  select email into v_cliente_email from public.tpl_actores where id=v_pago.pagador_actor_id;
  insert into public.tpl_comunicaciones_cola(actor_id,canal,destinatario,plantilla,asunto,payload)
  values(v_pago.pagador_actor_id,'email',v_cliente_email,'revision_pago_proyecto',
    case when p_decision='confirmar' then 'Pago confirmado en TPL' else 'Pago rechazado en TPL' end,
    jsonb_build_object('pago_id',p_pago_id,'orden_id',v_pago.orden_servicio_id,'decision',p_decision,'comentario',p_comentario));

  insert into public.tpl_eventos(actor_id,proyecto_id,orden_servicio_id,evento,categoria,origen,descripcion,metadata)
  values(v_actor,v_pago.proyecto_id,v_pago.orden_servicio_id,
    case when p_decision='confirmar' then 'partner.pago_confirmado' else 'partner.pago_rechazado' end,
    'pago','tpl_business_partner',
    case when p_decision='confirmar' then 'La empresa confirmó la recepción del pago.' else 'La empresa rechazó el pago informado.' end,
    jsonb_build_object('pago_id',p_pago_id,'monto',v_pago.monto,'comentario',p_comentario));

  return jsonb_build_object('ok',true,'pago_id',p_pago_id,'estado',case when p_decision='confirmar' then 'confirmado' else 'rechazado' end);
end $$;

create or replace function public.tpl_resumen_financiero_orden_v1(p_orden_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public as $$
declare v_actor uuid;
begin
  if auth.uid() is null then raise exception 'SESION_REQUERIDA'; end if;
  v_actor:=public.tpl_actor_actual_id();
  if not public.tpl_actor_puede_ver_orden_v1(v_actor,p_orden_id) then raise exception 'ORDEN_NO_AUTORIZADA'; end if;
  return jsonb_build_object(
    'orden_id',p_orden_id,
    'total_solicitado',coalesce((select sum(monto) from public.tpl_pagos where orden_servicio_id=p_orden_id and estado<>'anulado'),0),
    'total_confirmado',coalesce((select sum(monto) from public.tpl_pagos where orden_servicio_id=p_orden_id and estado='confirmado'),0),
    'total_pendiente',coalesce((select sum(monto) from public.tpl_pagos where orden_servicio_id=p_orden_id and estado in ('pendiente','informado','en_revision','rechazado')),0),
    'pagos',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.tpl_pagos p where p.orden_servicio_id=p_orden_id),'[]'::jsonb)
  );
end $$;

grant execute on function public.tpl_cliente_informar_pago_v1(uuid,text,text,text) to authenticated;
grant execute on function public.tpl_partner_revisar_pago_v1(uuid,text,text) to authenticated;
grant execute on function public.tpl_resumen_financiero_orden_v1(uuid) to authenticated;
