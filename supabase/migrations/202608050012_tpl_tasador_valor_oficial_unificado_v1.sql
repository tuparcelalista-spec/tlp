-- TPL · Valor oficial unificado del Tasador
-- La última fila de tpl_tasaciones y su valor_tpl_total son la fuente canónica.
begin;

create or replace function public.tpl_tasacion_canonica_activo_v1(p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop public.tpl_propiedades;
  v_tas public.tpl_tasaciones;
  v_total integer;
  v_ref_total bigint;
  v_apuro bigint;
begin
  select * into v_prop
  from public.tpl_propiedades p
  where p.id::text = trim(p_identificador)
     or p.codigo = trim(p_identificador)
     or p.metadata->>'source_legacy_id' = trim(p_identificador)
  order by case when p.id::text=trim(p_identificador) then 0 when p.codigo=trim(p_identificador) then 1 else 2 end
  limit 1;

  if v_prop.id is null then
    return jsonb_build_object('ok',false,'error','ACTIVO_NO_ENCONTRADO');
  end if;

  select * into v_tas
  from public.tpl_tasaciones t
  where t.propiedad_id=v_prop.id
  order by t.created_at desc,t.id desc
  limit 1;

  select count(*) into v_total from public.tpl_tasaciones where propiedad_id=v_prop.id;

  if v_tas.id is null then
    return jsonb_build_object('ok',true,'propiedad_id',v_prop.id,'codigo',v_prop.codigo,'tiene_tasacion',false,'total_versiones',0);
  end if;

  v_ref_total := coalesce(
    nullif(v_tas.resultado->>'referencia_comunal_total','')::bigint,
    nullif(v_tas.resultado->>'valorComunal','')::bigint,
    case when coalesce(v_tas.referencia_comunal_m2,0)>0 and coalesce(v_tas.superficie_m2,0)>0
      then round(v_tas.referencia_comunal_m2*v_tas.superficie_m2)::bigint else null end
  );
  v_apuro := coalesce(
    nullif(v_tas.resultado->>'valorVentaApuro','')::bigint,
    nullif(v_tas.resultado->>'valor_venta_apuro','')::bigint,
    nullif(v_tas.resultado->>'quick','')::bigint,
    round(v_tas.valor_tpl_total*0.93)::bigint
  );

  return jsonb_build_object(
    'ok',true,
    'propiedad_id',v_prop.id,
    'codigo',v_prop.codigo,
    'tipo_activo',v_prop.tipo,
    'tiene_tasacion',true,
    'total_versiones',v_total,
    'fuente_oficial','tpl_tasaciones.valor_tpl_total',
    'valor_tpl_oficial',v_tas.valor_tpl_total,
    'referencia_comunal_total',v_ref_total,
    'valor_venta_apuro',v_apuro,
    'tasacion',jsonb_build_object(
      'id',v_tas.id,
      'tipo',v_tas.tipo,
      'superficie_m2',v_tas.superficie_m2,
      'valor_tpl_total',v_tas.valor_tpl_total,
      'valor_tpl_oficial',v_tas.valor_tpl_total,
      'valor_tpl_m2',v_tas.valor_tpl_m2,
      'precio_publicado',v_tas.precio_publicado,
      'precio_publicado_m2',v_tas.precio_publicado_m2,
      'referencia_comunal_m2',v_tas.referencia_comunal_m2,
      'referencia_comunal_total',v_ref_total,
      'valor_venta_apuro',v_apuro,
      'diferencia_publicado_vs_tpl_pct',v_tas.diferencia_publicado_vs_tpl_pct,
      'clasificacion',v_tas.clasificacion,
      'es_oportunidad',v_tas.es_oportunidad,
      'factores',v_tas.factores,
      'resultado',v_tas.resultado,
      'version_motor',v_tas.version_motor,
      'created_at',v_tas.created_at
    )
  );
end;
$$;

revoke all on function public.tpl_tasacion_canonica_activo_v1(text) from public;
grant execute on function public.tpl_tasacion_canonica_activo_v1(text) to anon, authenticated;

comment on function public.tpl_tasacion_canonica_activo_v1(text) is
'Fuente única del Valor TPL: última tpl_tasaciones.valor_tpl_total. La referencia comunal se informa separada y no se promedia automáticamente.';

commit;
