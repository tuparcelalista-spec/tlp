-- TPL · T2A · Mi Propiedad como editor del Tasador Canónico
-- Mantiene el Valor TPL vigente hasta que el motor registre una nueva versión.

create or replace function public.tpl_propietario_resumen_por_token_v1(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_link public.tpl_links_propietario;
  v_prop public.tpl_propiedades%rowtype;
  v_tas jsonb := '{}'::jsonb;
  v_meta jsonb := '{}'::jsonb;
begin
  v_hash := public.tpl_token_hash_seguro_v1(p_token);
  if v_hash is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  select * into v_link from public.tpl_links_propietario
   where token_hash=v_hash and estado='activo' and expires_at>now() limit 1;
  if v_link.id is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  select * into v_prop from public.tpl_propiedades where id=v_link.propiedad_id;
  if v_prop.id is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  update public.tpl_links_propietario set last_used_at=now(),usos=least(usos+1,2147483647) where id=v_link.id;

  select jsonb_build_object(
    'id',t.id,'valor_tpl_oficial',t.valor_tpl_total,'valor_tpl_total',t.valor_tpl_total,
    'valor_tpl_m2',t.valor_tpl_m2,'referencia_comunal_m2',t.referencia_comunal_m2,
    'clasificacion',t.clasificacion,'resultado',t.resultado,'version_motor',t.version_motor,
    'created_at',t.created_at,
    'version',(select count(*) from public.tpl_tasaciones x where x.propiedad_id=v_prop.id and (x.created_at<t.created_at or (x.created_at=t.created_at and x.id<=t.id)))
  ) into v_tas
  from public.tpl_tasaciones t where t.propiedad_id=v_prop.id order by t.created_at desc,t.id desc limit 1;

  v_meta := coalesce(v_prop.metadata,'{}'::jsonb);
  return jsonb_build_object(
    'ok',true,'expires_at',v_link.expires_at,
    'propiedad',jsonb_build_object(
      'id',v_prop.id,'codigo',v_prop.codigo,'titulo',v_prop.titulo,'descripcion',v_prop.descripcion,
      'region',v_prop.region,'comuna',v_prop.comuna,'sector',v_prop.sector,
      'superficie_m2',v_prop.superficie_m2,'precio_publicado',v_prop.precio_publicado,'estado',v_prop.estado,
      'agua',v_prop.agua,'electricidad',v_prop.electricidad,'acceso',v_prop.acceso,'topografia',v_prop.topografia,
      'rol_situacion',v_prop.rol_situacion,'cierre_perimetral',v_prop.cierre_perimetral,'porton',v_prop.porton,
      'lat',coalesce(v_prop.lat,(v_meta->>'lat')::numeric),'lng',coalesce(v_prop.lng,(v_meta->>'lng')::numeric),
      'tasador_entrada',coalesce(v_meta->'tasador_entrada','{}'::jsonb),
      'propietario_contacto',coalesce(v_meta->'propietario_contacto','{}'::jsonb),
      'tasacion_recalculo_pendiente',coalesce((v_meta->>'tasacion_recalculo_pendiente')::boolean,false),
      'updated_at',v_prop.updated_at
    ),
    'tasacion',coalesce(v_tas,'{}'::jsonb)
  );
exception when invalid_text_representation then
  return jsonb_build_object('ok',false,'error','DATOS_INTERNOS_INVALIDOS');
end;
$$;

create or replace function public.tpl_propietario_actualizar_por_token_v1(p_token text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text; v_link public.tpl_links_propietario; v_old public.tpl_propiedades%rowtype; v_new public.tpl_propiedades%rowtype;
  v_clean jsonb; v_tasador jsonb := '{}'::jsonb; v_contacto jsonb := '{}'::jsonb; v_fotos jsonb := '[]'::jsonb;
  v_fields text[] := array[]::text[]; v_recalculo boolean := false;
begin
  v_hash:=public.tpl_token_hash_seguro_v1(p_token);
  if v_hash is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>160000 then return jsonb_build_object('ok',false,'error','DATOS_INVALIDOS'); end if;
  select * into v_link from public.tpl_links_propietario where token_hash=v_hash and estado='activo' and expires_at>now() for update;
  if v_link.id is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  select * into v_old from public.tpl_propiedades where id=v_link.propiedad_id for update;
  if v_old.id is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;

  if jsonb_typeof(p_payload->'fotos')='array' then select coalesce(jsonb_agg(value),'[]'::jsonb) into v_fotos from (select value from jsonb_array_elements(p_payload->'fotos') limit 20) f; end if;
  if jsonb_typeof(p_payload->'contacto')='object' then
    v_contacto:=jsonb_strip_nulls(jsonb_build_object(
      'nombre',left(nullif(trim(p_payload->'contacto'->>'nombre'),''),120),
      'email',left(lower(nullif(trim(coalesce(p_payload->'contacto'->>'email',p_payload->'contacto'->>'correo')),'')),254),
      'whatsapp',left(nullif(trim(coalesce(p_payload->'contacto'->>'whatsapp',p_payload->'contacto'->>'telefono')),''),40),
      'tipo',left(nullif(trim(p_payload->'contacto'->>'tipo'),''),30)
    ));
  end if;

  if jsonb_typeof(p_payload->'tasador_entrada')='object' then
    v_tasador:=jsonb_strip_nulls(jsonb_build_object(
      'asking',case when (p_payload->'tasador_entrada'->>'asking')~'^\d{1,12}([.]\d{1,2})?$' then (p_payload->'tasador_entrada'->>'asking')::numeric else null end,
      'region',left(nullif(trim(p_payload->'tasador_entrada'->>'region'),''),100),'comuna',left(nullif(trim(p_payload->'tasador_entrada'->>'comuna'),''),100),
      'lat',case when (p_payload->'tasador_entrada'->>'lat')~'^-?\d{1,3}([.]\d+)?$' then (p_payload->'tasador_entrada'->>'lat')::numeric else null end,
      'lng',case when (p_payload->'tasador_entrada'->>'lng')~'^-?\d{1,3}([.]\d+)?$' then (p_payload->'tasador_entrada'->>'lng')::numeric else null end,
      'commune_distance',case when (p_payload->'tasador_entrada'->>'commune_distance')~'^\d{1,5}([.]\d+)?$' then (p_payload->'tasador_entrada'->>'commune_distance')::numeric else null end,
      'route_distance',case when (p_payload->'tasador_entrada'->>'route_distance')~'^\d{1,5}([.]\d+)?$' then (p_payload->'tasador_entrada'->>'route_distance')::numeric else null end,
      'electricity_pole_distance',case when (p_payload->'tasador_entrada'->>'electricity_pole_distance')~'^\d{1,5}([.]\d+)?$' then (p_payload->'tasador_entrada'->>'electricity_pole_distance')::numeric else null end,
      'access',left(nullif(trim(p_payload->'tasador_entrada'->>'access'),''),120),'topography',left(nullif(trim(p_payload->'tasador_entrada'->>'topography'),''),120),
      'soil',left(nullif(trim(p_payload->'tasador_entrada'->>'soil'),''),120),'exposure',left(nullif(trim(p_payload->'tasador_entrada'->>'exposure'),''),120),
      'view',left(nullif(trim(p_payload->'tasador_entrada'->>'view'),''),120),'tourism',left(nullif(trim(p_payload->'tasador_entrada'->>'tourism'),''),120),
      'water',left(nullif(trim(p_payload->'tasador_entrada'->>'water'),''),120),'electricity',left(nullif(trim(p_payload->'tasador_entrada'->>'electricity'),''),120),
      'fencing',left(nullif(trim(p_payload->'tasador_entrada'->>'fencing'),''),120),'gate',left(nullif(trim(p_payload->'tasador_entrada'->>'gate'),''),120),
      'condominium',left(nullif(trim(p_payload->'tasador_entrada'->>'condominium'),''),120),'vegetation',left(nullif(trim(p_payload->'tasador_entrada'->>'vegetation'),''),120),
      'nature',case when jsonb_typeof(p_payload->'tasador_entrada'->'nature')='array' then p_payload->'tasador_entrada'->'nature' else '[]'::jsonb end,
      'area_casa',case when (p_payload->'tasador_entrada'->>'area_casa')~'^\d{1,6}([.]\d+)?$' then (p_payload->'tasador_entrada'->>'area_casa')::numeric else null end,
      'material_casa',left(nullif(trim(p_payload->'tasador_entrada'->>'material_casa'),''),120),
      'anio_construccion',case when (p_payload->'tasador_entrada'->>'anio_construccion')~'^\d{4}$' then (p_payload->'tasador_entrada'->>'anio_construccion')::int else null end,
      'estado_casa',left(nullif(trim(p_payload->'tasador_entrada'->>'estado_casa'),''),80),
      'anio_remodelacion',case when (p_payload->'tasador_entrada'->>'anio_remodelacion')~'^\d{4}$' then (p_payload->'tasador_entrada'->>'anio_remodelacion')::int else null end,
      'dormitorios',case when (p_payload->'tasador_entrada'->>'dormitorios')~'^\d{1,2}$' then (p_payload->'tasador_entrada'->>'dormitorios')::int else null end,
      'banos',case when (p_payload->'tasador_entrada'->>'banos')~'^\d{1,2}$' then (p_payload->'tasador_entrada'->>'banos')::int else null end,
      'pisos',case when (p_payload->'tasador_entrada'->>'pisos')~'^\d{1,2}$' then (p_payload->'tasador_entrada'->>'pisos')::int else null end,
      'differentiator',left(nullif(trim(p_payload->'tasador_entrada'->>'differentiator'),''),300),
      'works',case when jsonb_typeof(p_payload->'tasador_entrada'->'works')='object' then p_payload->'tasador_entrada'->'works' else '{}'::jsonb end,
      'actualizado_por','propietario','actualizado_at',now()
    ));
  end if;
  v_recalculo:=coalesce((p_payload->>'solicitar_recalculo')::boolean,false);
  v_clean:=jsonb_strip_nulls(jsonb_build_object(
    'titulo',left(nullif(trim(p_payload->>'titulo'),''),160),'descripcion',left(nullif(trim(p_payload->>'descripcion'),''),5000),
    'precio_publicado',case when (p_payload->>'precio_publicado')~'^\d{1,12}$' then (p_payload->>'precio_publicado')::bigint else null end,
    'superficie_m2',case when (p_payload->>'superficie_m2')~'^\d{1,9}([.]\d{1,2})?$' then (p_payload->>'superficie_m2')::numeric else null end,
    'agua',left(nullif(trim(p_payload->>'agua'),''),120),'electricidad',left(nullif(trim(p_payload->>'electricidad'),''),120),
    'acceso',left(nullif(trim(p_payload->>'acceso'),''),160),'topografia',left(nullif(trim(p_payload->>'topografia'),''),120),
    'rol_situacion',left(nullif(trim(p_payload->>'rol_situacion'),''),160),'cierre_perimetral',left(nullif(trim(p_payload->>'cierre_perimetral'),''),120),'porton',left(nullif(trim(p_payload->>'porton'),''),120)
  ));
  select coalesce(array_agg(key order by key),'{}') into v_fields from jsonb_object_keys(v_clean||v_tasador) key;
  update public.tpl_propiedades set
    titulo=coalesce(v_clean->>'titulo',titulo),descripcion=coalesce(v_clean->>'descripcion',descripcion),precio_publicado=coalesce((v_clean->>'precio_publicado')::bigint,precio_publicado),superficie_m2=coalesce((v_clean->>'superficie_m2')::numeric,superficie_m2),
    agua=coalesce(v_clean->>'agua',agua),electricidad=coalesce(v_clean->>'electricidad',electricidad),acceso=coalesce(v_clean->>'acceso',acceso),topografia=coalesce(v_clean->>'topografia',topografia),rol_situacion=coalesce(v_clean->>'rol_situacion',rol_situacion),cierre_perimetral=coalesce(v_clean->>'cierre_perimetral',cierre_perimetral),porton=coalesce(v_clean->>'porton',porton),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('propietario_contacto',v_contacto,'fotos_revision_pendiente',v_fotos,'tasador_entrada',v_tasador,'tasacion_recalculo_pendiente',v_recalculo,'tasacion_recalculo_solicitado_at',case when v_recalculo then now() else null end,'ultima_actualizacion_propietario',now()),updated_at=now()
  where id=v_link.propiedad_id returning * into v_new;
  insert into public.tpl_actualizaciones_propietario(propiedad_id,link_id,datos_anteriores,datos_nuevos,campos_modificados,fotos_pendientes)
  values(v_new.id,v_link.id,to_jsonb(v_old)-'metadata',v_clean||jsonb_build_object('tasador_entrada',v_tasador),v_fields,v_fotos);
  update public.tpl_links_propietario set last_used_at=now(),usos=least(usos+1,2147483647) where id=v_link.id;
  return jsonb_build_object('ok',true,'propiedad_id',v_new.id,'codigo',v_new.codigo,'campos_modificados',v_fields,'fotos_pendientes_revision',jsonb_array_length(v_fotos),'recalculo_pendiente',v_recalculo);
end;
$$;

revoke all on function public.tpl_propietario_resumen_por_token_v1(text) from public;
revoke all on function public.tpl_propietario_actualizar_por_token_v1(text,jsonb) from public;
grant execute on function public.tpl_propietario_resumen_por_token_v1(text) to anon,authenticated;
grant execute on function public.tpl_propietario_actualizar_por_token_v1(text,jsonb) to anon,authenticated;
