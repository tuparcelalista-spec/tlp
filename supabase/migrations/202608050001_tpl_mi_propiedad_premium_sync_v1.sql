-- TPL · Mi Propiedad Premium + sincronización de Ficha Maestra
create or replace function public.tpl_propietario_actualizar_por_token_v1(p_token text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_link public.tpl_links_propietario;
  v_old public.tpl_propiedades%rowtype;
  v_new public.tpl_propiedades%rowtype;
  v_clean jsonb;
  v_fields text[]:=array[]::text[];
  v_info numeric:=0;
  v_quality numeric:=0;
  v_conf numeric:=0;
  v_fotos jsonb:=coalesce(p_payload->'fotos','[]'::jsonb);
begin
  select * into v_link from public.tpl_links_propietario
  where token_hash=encode(extensions.digest(convert_to(coalesce(trim(p_token),''),'UTF8'),'sha256'),'hex')
    and estado='activo' and expires_at>now() for update;
  if v_link.id is null then return jsonb_build_object('ok',false,'error','Enlace inválido o vencido'); end if;

  select * into v_old from public.tpl_propiedades where id=v_link.propiedad_id for update;
  v_clean:=jsonb_strip_nulls(jsonb_build_object(
    'titulo',nullif(trim(p_payload->>'titulo'),''),'descripcion',nullif(trim(p_payload->>'descripcion'),''),
    'precio_publicado',case when (p_payload->>'precio_publicado')~'^\d+$' then (p_payload->>'precio_publicado')::bigint else null end,
    'superficie_m2',case when (p_payload->>'superficie_m2')~'^\d+(\.\d+)?$' then (p_payload->>'superficie_m2')::numeric else null end,
    'agua',nullif(trim(p_payload->>'agua'),''),'electricidad',nullif(trim(p_payload->>'electricidad'),''),'acceso',nullif(trim(p_payload->>'acceso'),''),
    'topografia',nullif(trim(p_payload->>'topografia'),''),'rol_situacion',nullif(trim(p_payload->>'rol_situacion'),''),
    'cierre_perimetral',nullif(trim(p_payload->>'cierre_perimetral'),''),'porton',nullif(trim(p_payload->>'porton'),'')));
  select coalesce(array_agg(key),'{}') into v_fields from jsonb_object_keys(v_clean) key;

  update public.tpl_propiedades set
    titulo=coalesce(v_clean->>'titulo',titulo), descripcion=coalesce(v_clean->>'descripcion',descripcion),
    precio_publicado=coalesce((v_clean->>'precio_publicado')::bigint,precio_publicado), superficie_m2=coalesce((v_clean->>'superficie_m2')::numeric,superficie_m2),
    agua=coalesce(v_clean->>'agua',agua), electricidad=coalesce(v_clean->>'electricidad',electricidad), acceso=coalesce(v_clean->>'acceso',acceso),
    topografia=coalesce(v_clean->>'topografia',topografia), rol_situacion=coalesce(v_clean->>'rol_situacion',rol_situacion),
    cierre_perimetral=coalesce(v_clean->>'cierre_perimetral',cierre_perimetral), porton=coalesce(v_clean->>'porton',porton),
    metadata=metadata || jsonb_build_object('propietario_contacto',coalesce(p_payload->'contacto','{}'::jsonb),'fotos_revision_pendiente',v_fotos,'ultima_actualizacion_propietario',now()),
    version_actual=coalesce(version_actual,0)+1, updated_at=now()
  where id=v_link.propiedad_id returning * into v_new;

  insert into public.tpl_activo_terreno(propiedad_id,superficie_util_m2,agua_tipo,electricidad_tipo,acceso_invierno,rol_tipo,atributos)
  values(v_new.id,v_new.superficie_m2,v_new.agua,v_new.electricidad,v_new.acceso,v_new.rol_situacion,
    jsonb_build_object('topografia',v_new.topografia,'cierre_perimetral',v_new.cierre_perimetral,'porton',v_new.porton,'origen_ultima_actualizacion','link_propietario'))
  on conflict(propiedad_id) do update set
    superficie_util_m2=excluded.superficie_util_m2,agua_tipo=excluded.agua_tipo,electricidad_tipo=excluded.electricidad_tipo,
    acceso_invierno=excluded.acceso_invierno,rol_tipo=excluded.rol_tipo,
    atributos=coalesce(public.tpl_activo_terreno.atributos,'{}'::jsonb)||excluded.atributos,updated_at=now();

  v_info := round((
    (case when nullif(v_new.titulo,'') is not null then 1 else 0 end)+
    (case when nullif(v_new.descripcion,'') is not null then 1 else 0 end)+
    (case when coalesce(v_new.precio_publicado,0)>0 then 1 else 0 end)+
    (case when coalesce(v_new.superficie_m2,0)>0 then 1 else 0 end)+
    (case when nullif(v_new.agua,'') is not null then 1 else 0 end)+
    (case when nullif(v_new.electricidad,'') is not null then 1 else 0 end)+
    (case when nullif(v_new.acceso,'') is not null then 1 else 0 end)+
    (case when nullif(v_new.topografia,'') is not null then 1 else 0 end)+
    (case when nullif(v_new.rol_situacion,'') is not null then 1 else 0 end)+
    (case when nullif(v_new.cierre_perimetral,'') is not null then 1 else 0 end)
  )*10,0);
  v_quality := least(100, round(v_info*.65 + (case when length(coalesce(v_new.descripcion,''))>=180 then 20 else 8 end) + (case when jsonb_array_length(v_fotos)>0 then 15 else 0 end),0));
  v_conf := least(100, round(v_info*.8 + (case when nullif(v_new.rol_situacion,'') is not null then 10 else 0 end),0));

  insert into public.tpl_activo_scores(propiedad_id,nivel_informacion,calidad_anuncio,confianza_tasacion,estado_comercial,explicacion,calculado_at,version_motor)
  values(v_new.id,v_info,v_quality,v_conf,'actualizado_propietario',jsonb_build_object('origen','link_propietario','campos_modificados',v_fields),now(),'mi-propiedad-premium-v1')
  on conflict(propiedad_id) do update set nivel_informacion=excluded.nivel_informacion,calidad_anuncio=excluded.calidad_anuncio,
    confianza_tasacion=excluded.confianza_tasacion,estado_comercial=excluded.estado_comercial,
    explicacion=coalesce(public.tpl_activo_scores.explicacion,'{}'::jsonb)||excluded.explicacion,calculado_at=now(),version_motor=excluded.version_motor;

  insert into public.tpl_actualizaciones_propietario(propiedad_id,link_id,datos_anteriores,datos_nuevos,campos_modificados,fotos_pendientes)
  values(v_new.id,v_link.id,to_jsonb(v_old),v_clean,v_fields,v_fotos);

  insert into public.tpl_eventos(propiedad_id,evento,categoria,origen,prioridad,descripcion,metadata)
  values(v_new.id,'propiedad.actualizada_propietario','activo','mi_propiedad','media','El propietario actualizó su ficha y se recalcularon sus indicadores.',jsonb_build_object('campos_modificados',v_fields,'version',v_new.version_actual));

  if ('precio_publicado'=any(v_fields) or 'superficie_m2'=any(v_fields) or 'agua'=any(v_fields) or 'electricidad'=any(v_fields) or 'acceso'=any(v_fields)) then
    insert into public.tpl_tareas(propiedad_id,titulo,detalle,tipo,prioridad,estado,metadata)
    select v_new.id,'Revisar actualización y tasación','Cambió información relevante para la valoración. Confirmar si corresponde generar una nueva tasación.','revision_tasacion','alta','pendiente',jsonb_build_object('origen','link_propietario','campos',v_fields)
    where not exists(select 1 from public.tpl_tareas where propiedad_id=v_new.id and tipo='revision_tasacion' and estado in ('pendiente','en_progreso'));
  end if;

  return jsonb_build_object('ok',true,'propiedad_id',v_new.id,'codigo',v_new.codigo,'campos_modificados',v_fields,
    'fotos_pendientes_revision',jsonb_array_length(v_fotos),'indicadores_actualizados',true,'nivel_informacion',v_info,'calidad_anuncio',v_quality,'confianza_tasacion',v_conf);
end $$;

grant execute on function public.tpl_propietario_actualizar_por_token_v1(text,jsonb) to anon,authenticated;
