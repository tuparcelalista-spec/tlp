begin;

create or replace function public.tpl_crm_bandeja_operativa_v1()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_staff public.tpl_staff;
  v_items jsonb := '[]'::jsonb;
  v_extra jsonb;
begin
  select * into v_staff
  from public.tpl_staff
  where user_id=auth.uid() and activo=true
  limit 1;

  if v_staff.user_id is null then raise exception 'NO_AUTORIZADO'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.prioridad_orden, x.fecha_relevante), '[]'::jsonb)
    into v_items
  from (
    select
      'publicacion'::text as tipo,
      p.id::text as id,
      coalesce(p.codigo,'Publicación')::text as titulo,
      case when p.estado='requiere_correccion' then 'Requiere correcciones' else 'Revisar y publicar' end::text as detalle,
      case when p.estado='requiere_correccion' then 'alta' else 'media' end::text as prioridad,
      case when p.estado='requiere_correccion' then 1 else 2 end as prioridad_orden,
      coalesce(p.enviada_at,p.created_at) as fecha_relevante,
      'revision'::text as destino,
      p.id::text as referencia_id,
      jsonb_build_object('estado',p.estado,'codigo',p.codigo,'motivo_revision',p.motivo_revision) as metadata
    from public.tpl_publicaciones p
    where p.estado in ('enviada','pendiente_revision','requiere_correccion')

    union all

    select
      'tarea', t.id::text, coalesce(t.titulo,'Tarea pendiente'), coalesce(t.detalle,'Sin detalle'),
      coalesce(t.prioridad,'media'),
      case coalesce(t.prioridad,'media') when 'urgente' then 0 when 'alta' then 1 when 'media' then 2 else 3 end,
      coalesce(t.vence_at,t.created_at), 'tareas', t.id::text,
      jsonb_build_object('estado',t.estado,'tipo',t.tipo,'propiedad_id',t.propiedad_id,'actor_id',t.actor_id,'proyecto_id',t.proyecto_id)
    from public.tpl_tareas t
    where t.estado in ('pendiente','en_progreso','esperando')

    union all

    select
      'partner', p.id::text,
      coalesce(p.nombre_comercial,p.razon_social,p.codigo,'Postulación Partner'),
      'Revisar postulación y antecedentes',
      case when p.estado='requiere_cambios' then 'alta' else 'media' end,
      case when p.estado='requiere_cambios' then 1 else 2 end,
      coalesce(p.updated_at,p.created_at), 'partners', p.id::text,
      jsonb_build_object('estado',p.estado,'correo',p.correo,'telefono',p.telefono,'codigo',p.codigo)
    from public.tpl_partner_postulaciones p
    where p.estado in ('pendiente','en_revision','requiere_cambios')

    union all

    select
      'actualizacion_propietario', a.id::text,
      coalesce(pr.titulo,pr.codigo,'Actualización de propiedad'),
      case when jsonb_array_length(coalesce(a.fotos_pendientes,'[]'::jsonb))>0
        then concat(jsonb_array_length(coalesce(a.fotos_pendientes,'[]'::jsonb)),' fotografías pendientes de revisión')
        else 'Revisar cambios enviados por propietario' end,
      case when jsonb_array_length(coalesce(a.fotos_pendientes,'[]'::jsonb))>0 then 'alta' else 'media' end,
      case when jsonb_array_length(coalesce(a.fotos_pendientes,'[]'::jsonb))>0 then 1 else 2 end,
      a.created_at, 'parcelas', pr.id::text,
      jsonb_build_object('propiedad_id',pr.id,'codigo',pr.codigo,'campos_modificados',a.campos_modificados,'fotos_pendientes',a.fotos_pendientes)
    from public.tpl_actualizaciones_propietario a
    join public.tpl_propiedades pr on pr.id=a.propiedad_id
    where a.created_at > now()-interval '60 days'
      and (jsonb_array_length(coalesce(a.fotos_pendientes,'[]'::jsonb))>0 or cardinality(coalesce(a.campos_modificados,'{}'))>0)

    union all

    select
      'comunicacion', c.id::text,
      coalesce(c.asunto,'Comunicación pendiente'),
      concat('Destinatario: ',c.destinatario),
      case when c.estado='error' then 'alta' else 'media' end,
      case when c.estado='error' then 1 else 2 end,
      coalesce(c.programado_at,c.created_at), 'mensajes', c.id::text,
      jsonb_build_object('estado',c.estado,'tipo',c.tipo,'intentos',c.intentos,'ultimo_error',c.ultimo_error)
    from public.tpl_comunicaciones_pendientes c
    where c.estado in ('pendiente','procesando','error')

    union all

    select
      'informe', o.id::text,
      coalesce(o.codigo,'Informe pendiente'),
      concat('Estado: ',o.estado),
      case when o.estado='pagada' then 'alta' else 'media' end,
      case when o.estado='pagada' then 1 else 2 end,
      o.created_at, 'tasaciones', o.id::text,
      jsonb_build_object('estado',o.estado,'propiedad_id',o.propiedad_id,'actor_id',o.actor_id)
    from public.tpl_ordenes_informe o
    where o.estado in ('creada','pendiente_pago','pagada','generando')
  ) x;

  if to_regclass('public.tpl_partner_borradores') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
        'tipo','borrador_partner','id',id::text,'titulo',coalesce(payload->>'nombre_comercial',correo),
        'detalle',concat('Perfil en construcción · ',porcentaje_completitud,'% completo'),
        'prioridad',case when updated_at<now()-interval '7 days' then 'alta' else 'media' end,
        'fecha_relevante',updated_at,'destino','partners','referencia_id',id::text,
        'metadata',jsonb_build_object('correo',correo,'porcentaje',porcentaje_completitud,'campos_pendientes',campos_pendientes)
      ) order by updated_at), '[]'::jsonb)
      from public.tpl_partner_borradores
      where estado='borrador' and expires_at>now() and porcentaje_completitud<100
    $q$ into v_extra;
    v_items := v_items || coalesce(v_extra,'[]'::jsonb);
  end if;

  if to_regclass('public.tpl_publicador_borradores') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
        'tipo','borrador_publicador','id',id::text,'titulo',coalesce(payload#>>'{propiedad,titulo}',payload#>>'{ubicacion,comuna}',email),
        'detalle','Diagnóstico de propiedad sin finalizar',
        'prioridad',case when updated_at<now()-interval '3 days' then 'alta' else 'media' end,
        'fecha_relevante',updated_at,'destino','parcelas','referencia_id',id::text,
        'metadata',jsonb_build_object('email',email,'expires_at',expires_at)
      ) order by updated_at), '[]'::jsonb)
      from public.tpl_publicador_borradores
      where estado='borrador' and expires_at>now()
    $q$ into v_extra;
    v_items := v_items || coalesce(v_extra,'[]'::jsonb);
  end if;

  return jsonb_build_object(
    'items',v_items,
    'totales',jsonb_build_object(
      'total',jsonb_array_length(v_items),
      'urgentes',(select count(*) from jsonb_array_elements(v_items) i where i->>'prioridad'='urgente'),
      'altas',(select count(*) from jsonb_array_elements(v_items) i where i->>'prioridad'='alta'),
      'publicaciones',(select count(*) from jsonb_array_elements(v_items) i where i->>'tipo'='publicacion'),
      'partners',(select count(*) from jsonb_array_elements(v_items) i where i->>'tipo' in ('partner','borrador_partner')),
      'propiedades',(select count(*) from jsonb_array_elements(v_items) i where i->>'tipo' in ('actualizacion_propietario','borrador_publicador'))
    ),
    'generado_at',now()
  );
end;
$$;

revoke all on function public.tpl_crm_bandeja_operativa_v1() from public,anon;
grant execute on function public.tpl_crm_bandeja_operativa_v1() to authenticated;

commit;
