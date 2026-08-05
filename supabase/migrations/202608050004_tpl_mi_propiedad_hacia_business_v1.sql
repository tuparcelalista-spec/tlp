-- P5: continuidad segura Mi Propiedad -> TPL Business sin duplicar datos.
create or replace function public.tpl_propietario_preparar_business_v1(
  p_token text,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_link public.tpl_links_propietario%rowtype;
  v_prop public.tpl_propiedades%rowtype;
  v_proyecto public.tpl_proyectos%rowtype;
  v_accion text := coalesce(nullif(trim(p_payload->>'accion'),''),'preparar_proyecto');
  v_necesidad_id uuid;
  v_servicio_id uuid;
  v_codigo text;
begin
  select * into v_link
  from public.tpl_links_propietario
  where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and estado='activo' and expires_at>now()
  for update;

  if v_link.id is null then
    return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO');
  end if;

  select * into v_prop from public.tpl_propiedades where id=v_link.propiedad_id;
  if v_prop.id is null then return jsonb_build_object('ok',false,'error','PROPIEDAD_NO_ENCONTRADA'); end if;

  select * into v_proyecto
  from public.tpl_proyectos
  where propiedad_id=v_prop.id
    and metadata->>'origen'='mi_propiedad'
    and estado not in ('finalizado','cancelado')
  order by updated_at desc
  limit 1;

  if v_proyecto.id is null then
    v_codigo := 'TPL-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    insert into public.tpl_proyectos(
      codigo, propiedad_id, tipo, nombre, estado, presupuesto_objetivo,
      valor_estimado, configuracion, metadata
    ) values (
      v_codigo,
      v_prop.id,
      'comercial',
      'Proyecto de ' || coalesce(v_prop.titulo,v_prop.codigo,'propiedad TPL'),
      'guardado',
      case when (p_payload->>'presupuesto_objetivo') ~ '^\d+$' then (p_payload->>'presupuesto_objetivo')::bigint else null end,
      v_prop.precio_publicado,
      jsonb_build_object(
        'propiedad_snapshot',jsonb_build_object(
          'titulo',v_prop.titulo,'comuna',v_prop.comuna,'region',v_prop.region,
          'superficie_m2',v_prop.superficie_m2,'precio_publicado',v_prop.precio_publicado
        ),
        'objetivo',coalesce(p_payload->>'objetivo','mejorar_propiedad')
      ),
      jsonb_build_object(
        'origen','mi_propiedad','link_propietario_id',v_link.id,
        'activacion_partner','solo_al_confirmar_compra_o_ejecucion',
        'solicitado_at',now()
      )
    ) returning * into v_proyecto;

    if v_prop.propietario_actor_id is not null then
      insert into public.tpl_proyecto_actores(proyecto_id,actor_id,rol_en_proyecto,estado_participacion,proxima_accion,metadata)
      values(v_proyecto.id,v_prop.propietario_actor_id,'propietario','activo','Completar alcance del proyecto',jsonb_build_object('origen','mi_propiedad'))
      on conflict (proyecto_id,actor_id,rol_en_proyecto) do update set updated_at=now();
    end if;
  else
    update public.tpl_proyectos
    set configuracion=configuracion || jsonb_strip_nulls(jsonb_build_object(
          'objetivo',p_payload->>'objetivo',
          'nota_propietario',p_payload->>'nota'
        )),
        presupuesto_objetivo=coalesce(
          case when (p_payload->>'presupuesto_objetivo') ~ '^\d+$' then (p_payload->>'presupuesto_objetivo')::bigint else null end,
          presupuesto_objetivo
        ),
        updated_at=now()
    where id=v_proyecto.id returning * into v_proyecto;
  end if;

  if v_accion='solicitar_servicio' and nullif(trim(p_payload->>'servicio_codigo'),'') is not null then
    select id into v_servicio_id from public.tpl_servicios where codigo=p_payload->>'servicio_codigo' and activo=true;
    if v_servicio_id is not null then
      select id into v_necesidad_id
      from public.tpl_necesidades_proyecto
      where proyecto_id=v_proyecto.id and servicio_id=v_servicio_id
        and estado not in ('completada','descartada')
      limit 1;
      if v_necesidad_id is null then
        insert into public.tpl_necesidades_proyecto(
          proyecto_id,propiedad_id,servicio_id,origen,prioridad,estado,detalle,metadata
        ) values (
          v_proyecto.id,v_prop.id,v_servicio_id,'cliente','media','agregada',
          nullif(trim(p_payload->>'detalle'),''),
          jsonb_build_object('origen','mi_propiedad','partner_notificado',false,
            'regla_activacion','al_confirmar_compra_o_inicio_de_ejecucion')
        ) returning id into v_necesidad_id;
      end if;
    end if;
  end if;

  insert into public.tpl_eventos(actor_id,propiedad_id,proyecto_id,evento,categoria,origen,prioridad,descripcion,metadata)
  values(v_prop.propietario_actor_id,v_prop.id,v_proyecto.id,'mi_propiedad.proyecto_preparado','proyecto','mi_propiedad','media',
         'El propietario preparó la continuidad hacia TPL Business.',
         jsonb_build_object('accion',v_accion,'origen','link_propietario'));

  return jsonb_build_object(
    'ok',true,'proyecto_id',v_proyecto.id,'proyecto_codigo',v_proyecto.codigo,
    'estado',v_proyecto.estado,'necesidad_id',v_necesidad_id,
    'business_url','plataforma/tpl-business/?proyecto='||v_proyecto.id::text||'&propiedad='||v_prop.id::text||'&origen=mi-propiedad'
  );
end $$;

revoke all on function public.tpl_propietario_preparar_business_v1(text,jsonb) from public;
grant execute on function public.tpl_propietario_preparar_business_v1(text,jsonb) to anon,authenticated;
