-- ------------------------------------------------------------
-- FASE 6: CONSOLIDACIÓN DE DATOS PARA CRM COMERCIAL
-- Solo expone en el snapshot estructuras ya existentes.
-- Corrige además la conversión de oportunidad vendida a rol canónico comprador.
-- ------------------------------------------------------------

create or replace function public.tpl_crm_snapshot_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso CRM no autorizado' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    'actores', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.nombre nulls last)
      from (
        select
          a.id, a.tipo_actor, a.nombre, a.rut, a.email, a.telefono,
          a.region, a.comuna, a.direccion, a.origen, a.estado,
          a.metadata, a.created_at, a.updated_at,
          coalesce(
            (select jsonb_agg(ar.rol order by ar.rol)
             from public.tpl_actor_roles ar
             where ar.actor_id = a.id),
            '[]'::jsonb
          ) as roles
        from public.tpl_actores a
      ) x
    ), '[]'::jsonb),

    'oportunidades', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from (
        select
          o.*,
          a.nombre as actor_nombre,
          a.email as actor_email,
          a.telefono as actor_telefono,
          p.codigo as propiedad_codigo,
          p.titulo as propiedad_titulo,
          p.comuna as propiedad_comuna,
          p.region as propiedad_region,
          p.superficie_m2 as propiedad_superficie_m2,
          p.precio_publicado as propiedad_precio,
          pr.codigo as proyecto_codigo,
          pr.estado as proyecto_estado
        from public.tpl_oportunidades o
        left join public.tpl_actores a on a.id=o.actor_cliente_id
        left join public.tpl_proyectos pr on pr.id=o.proyecto_id
        left join public.tpl_propiedades p on p.id=pr.propiedad_id
      ) x
    ), '[]'::jsonb),

    'visitas', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.fecha_hora asc)
      from (
        select
          v.*,
          o.codigo as oportunidad_codigo,
          o.estado as oportunidad_estado,
          o.actor_cliente_id,
          a.nombre as actor_nombre,
          a.email as actor_email,
          staff.nombre as staff_nombre,
          pr.codigo as proyecto_codigo,
          p.id as propiedad_id,
          p.codigo as propiedad_codigo,
          p.titulo as propiedad_titulo,
          p.comuna as propiedad_comuna,
          p.region as propiedad_region
        from public.tpl_visitas v
        join public.tpl_oportunidades o on o.id=v.oportunidad_id
        left join public.tpl_actores a on a.id=o.actor_cliente_id
        left join public.tpl_actores staff on staff.id=v.usuario_staff_id
        left join public.tpl_proyectos pr on pr.id=o.proyecto_id
        left join public.tpl_propiedades p on p.id=pr.propiedad_id
      ) x
    ), '[]'::jsonb),

    'compradores', coalesce((select jsonb_agg(to_jsonb(x) order by x.nombre nulls last) from public.crm_compradores x),'[]'::jsonb),
    'duenos', coalesce((select jsonb_agg(to_jsonb(x) order by x.nombre nulls last) from public.crm_duenos x),'[]'::jsonb),
    'parcelas', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from public.crm_parcelas x),'[]'::jsonb),
    'parcelas_casas', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from public.crm_parcelas_casas x),'[]'::jsonb),
    'casas', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from public.crm_casas x),'[]'::jsonb),
    'operaciones', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from public.crm_operaciones_activas x),'[]'::jsonb),
    'revision', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from public.crm_operaciones_revision x),'[]'::jsonb),
    'tareas', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.tpl_tareas x where x.estado in ('pendiente','en_progreso','esperando') limit 300),'[]'::jsonb),
    'alertas', coalesce((select jsonb_agg(to_jsonb(x) order by x.fecha_relevante desc) from public.crm_alertas x),'[]'::jsonb),
    'publicaciones_revision', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.tpl_publicaciones x where x.estado in ('enviada','pendiente_revision','requiere_correccion')),'[]'::jsonb),
    'partners', coalesce((select jsonb_agg(to_jsonb(x)) from public.crm_partners x),'[]'::jsonb),
    'tasaciones', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.tpl_tasaciones x limit 300),'[]'::jsonb),
    'analytics_diario', coalesce((select jsonb_agg(to_jsonb(x) order by x.dia desc) from public.crm_analytics_diario x limit 300),'[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.tpl_eventos x limit 500),'[]'::jsonb),
    'mensajes_pendientes', coalesce((select jsonb_agg(to_jsonb(x) order by x.creado_at desc) from public.tpl_mensajes_salida x where x.estado in ('pendiente','error') limit 300),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.tpl_crm_snapshot_v1() from public, anon;
grant execute on function public.tpl_crm_snapshot_v1() to authenticated;

-- La representación canónica de un comprador que cierra una operación
-- continúa siendo el rol comprador; no existe un rol físico 'cliente'.
create or replace function public.tpl_crm_actualizar_estado_oportunidad_v1(
  p_oportunidad_id uuid,
  p_estado text,
  p_comentario text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oportunidad public.tpl_oportunidades;
  v_estado_previo text;
begin
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode='42501';
  end if;

  if p_estado not in (
    'nueva','contactada','calificada','agendada',
    'negociacion','reservada','vendida','perdida',
    'cancelada','aceptada','rechazada'
  ) then
    raise exception 'ESTADO_INVALIDO';
  end if;

  select * into v_oportunidad
  from public.tpl_oportunidades
  where id=p_oportunidad_id
  for update;

  if v_oportunidad.id is null then
    raise exception 'OPORTUNIDAD_INEXISTENTE';
  end if;

  v_estado_previo := v_oportunidad.estado;

  update public.tpl_oportunidades
  set estado=p_estado, updated_at=now()
  where id=p_oportunidad_id;

  if p_estado='vendida' and v_oportunidad.actor_cliente_id is not null then
    insert into public.tpl_actor_roles(actor_id,rol)
    values(v_oportunidad.actor_cliente_id,'comprador')
    on conflict(actor_id,rol) do nothing;
  end if;

  insert into public.tpl_eventos(
    actor_id, proyecto_id, evento, categoria, origen, descripcion, metadata
  )
  values(
    v_oportunidad.actor_cliente_id,
    v_oportunidad.proyecto_id,
    'oportunidad.fase_cambiada',
    'comercial',
    'crm_staff',
    coalesce(p_comentario,'Transición de estado del negocio'),
    jsonb_build_object(
      'oportunidad_id',p_oportunidad_id,
      'estado_anterior',v_estado_previo,
      'estado_nuevo',p_estado,
      'comentario',p_comentario
    )
  );

  return jsonb_build_object(
    'ok',true,
    'oportunidad_id',p_oportunidad_id,
    'estado_anterior',v_estado_previo,
    'estado_nuevo',p_estado
  );
end;
$$;

revoke all on function public.tpl_crm_actualizar_estado_oportunidad_v1(uuid,text,text) from public, anon;
grant execute on function public.tpl_crm_actualizar_estado_oportunidad_v1(uuid,text,text) to authenticated;
