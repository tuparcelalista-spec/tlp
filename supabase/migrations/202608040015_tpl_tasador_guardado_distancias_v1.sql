-- TPL · Guardado completo desde Tasador CRM y distancias canónicas
begin;

create or replace function public.tpl_crm_guardar_datos_tasacion_v1(
  p_propiedad_id uuid,
  p_entrada jsonb default '{}'::jsonb,
  p_resultado jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house jsonb;
  v_metadata jsonb;
  v_row public.tpl_propiedades%rowtype;
  v_commune_m integer;
  v_city_m integer;
  v_route_m integer;
  v_pole_m integer;
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  select * into v_row from public.tpl_propiedades where id = p_propiedad_id for update;
  if not found then raise exception 'Propiedad no encontrada' using errcode = 'P0002'; end if;

  v_commune_m := greatest(0, round(coalesce(
    nullif(p_entrada->>'communeDistanceM','')::numeric,
    nullif(p_entrada->>'communeDistanceKm','')::numeric * 1000
  )))::integer;
  v_city_m := greatest(0, round(coalesce(
    nullif(p_entrada->>'majorCityDistanceM','')::numeric,
    nullif(p_entrada->>'majorCityDistanceKm','')::numeric * 1000,
    nullif(p_entrada->>'distanceKm','')::numeric * 1000
  )))::integer;
  v_route_m := greatest(0, round(coalesce(
    nullif(p_entrada->>'routeDistanceM','')::numeric,
    nullif(p_entrada->>'routeDistanceKm','')::numeric * 1000
  )))::integer;
  v_pole_m := greatest(0, round(nullif(p_entrada->>'electricityPoleDistanceM','')::numeric))::integer;

  v_house := coalesce(v_row.casa_datos, '{}'::jsonb);
  if coalesce(nullif(p_entrada->>'incluyeVivienda','')::boolean, false) then
    v_house := v_house || jsonb_strip_nulls(jsonb_build_object(
      'superficie_m2', nullif(p_entrada->>'areaCasa','')::numeric,
      'materialidad', nullif(p_entrada->>'materialCasa',''),
      'anio_construccion', nullif(p_entrada->>'anioConstruccion','')::integer,
      'anio_remodelacion', nullif(p_entrada->>'anioRemodelacion','')::integer,
      'estado', nullif(p_entrada->>'estadoCasa',''),
      'dormitorios', nullif(p_entrada->>'dormitorios','')::integer,
      'banos', nullif(p_entrada->>'banos','')::integer,
      'pisos', nullif(p_entrada->>'pisos','')::integer,
      'obras_adicionales', coalesce(p_entrada->'obrasAdicionales','{}'::jsonb),
      'caracteristica_diferenciadora', nullif(p_entrada->>'caracteristicaDiferenciadora','')
    ));
  end if;

  v_metadata := coalesce(v_row.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'ultima_actualizacion_tasador_crm_at', now(),
    'ultima_tasacion_modo', coalesce(p_entrada->>'mode','rapida'),
    'ultima_tasacion_tipo_activo', coalesce(p_entrada->>'tipoActivo', v_row.tipo),
    'distancia_centro_comuna_m', v_commune_m,
    'distancia_ciudad_principal_m', v_city_m,
    'distancia_ruta_principal_m', v_route_m,
    'distancia_poste_electrico_m', v_pole_m,
    'nivel_turismo', nullif(coalesce(p_entrada->>'tourism',p_entrada->>'tourismLevel'),''),
    'atributos_naturales', coalesce(p_entrada->'nature','[]'::jsonb),
    'valor_tpl_total', coalesce(nullif(p_resultado->>'valorTplTasador','')::numeric,nullif(p_resultado->>'ideal','')::numeric,nullif(p_resultado->>'recommended','')::numeric),
    'valor_tpl_tasador_comuna', nullif(p_resultado->>'valorTplTasadorComuna','')::numeric,
    'valor_comunal', nullif(p_resultado->>'valorComunal','')::numeric,
    'valor_venta_apuro', coalesce(nullif(p_resultado->>'valorVentaApuro','')::numeric,nullif(p_resultado->>'quick','')::numeric,nullif(p_resultado->>'agile','')::numeric),
    'tasacion_entrada_actual', p_entrada,
    'tasacion_resultado_resumen', p_resultado
  ));

  update public.tpl_propiedades set
    region = coalesce(nullif(p_entrada->>'region',''), region),
    comuna = coalesce(nullif(p_entrada->>'comuna',''), comuna),
    superficie_m2 = case when coalesce(p_entrada->>'tipoActivo','')='casa' then superficie_m2 else coalesce(nullif(p_entrada->>'area','')::numeric,superficie_m2) end,
    precio_publicado = coalesce(nullif(p_entrada->>'asking','')::bigint,precio_publicado),
    lat = coalesce(nullif(p_entrada->>'lat','')::numeric,lat),
    lng = coalesce(nullif(p_entrada->>'lng','')::numeric,lng),
    rol_situacion = coalesce(nullif(p_entrada->>'rol',''),rol_situacion),
    electricidad = coalesce(nullif(p_entrada->>'electricity',''),electricidad),
    agua = coalesce(nullif(p_entrada->>'water',''),agua),
    acceso = coalesce(nullif(p_entrada->>'access',''),acceso),
    topografia = coalesce(nullif(p_entrada->>'topography',''),topografia),
    suelo = coalesce(nullif(p_entrada->>'soil',''),suelo),
    exposicion = coalesce(nullif(p_entrada->>'exposure',''),exposicion),
    vista_principal = coalesce(nullif(p_entrada->>'view',''),vista_principal),
    vegetacion = coalesce(nullif(p_entrada->>'vegetation',''),vegetacion),
    cierre_perimetral = coalesce(nullif(p_entrada->>'fencing',''),cierre_perimetral),
    porton = coalesce(nullif(p_entrada->>'gate',''),porton),
    condominio = case
      when lower(coalesce(p_entrada->>'condominium','')) in ('si','sí','true','1') then true
      when lower(coalesce(p_entrada->>'condominium','')) in ('no','false','0') then false
      else condominio end,
    distancia_ruta_principal_km = coalesce(v_route_m::numeric/1000,distancia_ruta_principal_km),
    casa_datos = v_house,
    metadata = v_metadata,
    updated_at = now()
  where id=p_propiedad_id returning * into v_row;

  return jsonb_build_object('ok',true,'propiedad_id',v_row.id,'updated_at',v_row.updated_at,'datos_guardados',true,'distancias_m',jsonb_build_object('comuna',v_commune_m,'ciudad',v_city_m,'ruta',v_route_m,'poste',v_pole_m));
end;
$$;

revoke all on function public.tpl_crm_guardar_datos_tasacion_v1(uuid,jsonb,jsonb) from public;
grant execute on function public.tpl_crm_guardar_datos_tasacion_v1(uuid,jsonb,jsonb) to authenticated;

commit;
