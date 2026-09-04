-- TPL · T2B · Informe visual del Tasador Canónico
-- Expone solo al poseedor de un enlace propietario válido la propiedad, la última tasación y su historial.
create or replace function public.tpl_propietario_informe_tasacion_por_token_v1(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_link public.tpl_links_propietario;
  v_prop public.tpl_propiedades%rowtype;
  v_meta jsonb := '{}'::jsonb;
  v_latest jsonb := '{}'::jsonb;
  v_versions jsonb := '[]'::jsonb;
  v_total integer := 0;
begin
  v_hash:=public.tpl_token_hash_seguro_v1(p_token);
  if v_hash is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  select * into v_link from public.tpl_links_propietario
    where token_hash=v_hash and estado='activo' and expires_at>now() limit 1;
  if v_link.id is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  select * into v_prop from public.tpl_propiedades where id=v_link.propiedad_id;
  if v_prop.id is null then return jsonb_build_object('ok',false,'error','ACTIVO_NO_ENCONTRADO'); end if;
  v_meta:=coalesce(v_prop.metadata,'{}'::jsonb);

  select count(*) into v_total from public.tpl_tasaciones where propiedad_id=v_prop.id;
  select jsonb_build_object(
    'id',t.id,'version',v_total,'tipo',t.tipo,'superficie_m2',t.superficie_m2,
    'valor_tpl_oficial',t.valor_tpl_total,'valor_tpl_m2',t.valor_tpl_m2,
    'precio_publicado',t.precio_publicado,'precio_publicado_m2',t.precio_publicado_m2,
    'referencia_comunal_m2',t.referencia_comunal_m2,
    'referencia_comunal_total',coalesce(nullif(t.resultado->>'referencia_comunal_total','')::bigint,nullif(t.resultado->>'valorComunal','')::bigint,case when coalesce(t.referencia_comunal_m2,0)>0 and coalesce(t.superficie_m2,0)>0 then round(t.referencia_comunal_m2*t.superficie_m2)::bigint end),
    'valor_venta_apuro',coalesce(nullif(t.resultado->>'valorVentaApuro','')::bigint,nullif(t.resultado->>'valor_venta_apuro','')::bigint,nullif(t.resultado->>'quick','')::bigint,round(t.valor_tpl_total*0.93)::bigint),
    'diferencia_publicado_vs_tpl_pct',t.diferencia_publicado_vs_tpl_pct,
    'clasificacion',t.clasificacion,'es_oportunidad',t.es_oportunidad,
    'factores',coalesce(t.factores,'[]'::jsonb),'entrada',coalesce(t.entrada,'{}'::jsonb),
    'resultado',coalesce(t.resultado,'{}'::jsonb),'version_motor',t.version_motor,'created_at',t.created_at
  ) into v_latest
  from public.tpl_tasaciones t where t.propiedad_id=v_prop.id order by t.created_at desc,t.id desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'version',q.version,'valor_tpl_oficial',q.valor_tpl_total,'valor_tpl_m2',q.valor_tpl_m2,
    'clasificacion',q.clasificacion,'version_motor',q.version_motor,'created_at',q.created_at
  ) order by q.created_at desc,q.id desc),'[]'::jsonb) into v_versions
  from (
    select t.*,row_number() over(order by t.created_at,t.id) as version
    from public.tpl_tasaciones t where t.propiedad_id=v_prop.id
  ) q;

  update public.tpl_links_propietario set last_used_at=now(),usos=least(usos+1,2147483647) where id=v_link.id;
  return jsonb_build_object(
    'ok',true,'expires_at',v_link.expires_at,'total_versiones',v_total,
    'propiedad',jsonb_build_object(
      'id',v_prop.id,'codigo',v_prop.codigo,'tipo',v_prop.tipo,'estado',v_prop.estado,
      'titulo',v_prop.titulo,'descripcion',v_prop.descripcion,'region',v_prop.region,'comuna',v_prop.comuna,'sector',v_prop.sector,
      'superficie_m2',v_prop.superficie_m2,'precio_publicado',v_prop.precio_publicado,
      'rol_situacion',v_prop.rol_situacion,'agua',v_prop.agua,'electricidad',v_prop.electricidad,'acceso',v_prop.acceso,
      'topografia',v_prop.topografia,'suelo',v_prop.suelo,'exposicion',v_prop.exposicion,'vista_principal',v_prop.vista_principal,
      'vegetacion',v_prop.vegetacion,'cierre_perimetral',v_prop.cierre_perimetral,'porton',v_prop.porton,
      'lat',coalesce(v_prop.lat,nullif(v_meta->>'lat','')::numeric),'lng',coalesce(v_prop.lng,nullif(v_meta->>'lng','')::numeric),
      'tasador_entrada',coalesce(v_meta->'tasador_entrada','{}'::jsonb),
      'imagen_principal',coalesce(v_meta->>'imagen_principal',v_meta->>'imagen',v_meta#>>'{imagenes,0}',null),
      'tasacion_recalculo_pendiente',coalesce((v_meta->>'tasacion_recalculo_pendiente')::boolean,false),
      'updated_at',v_prop.updated_at
    ),
    'tasacion',coalesce(v_latest,'{}'::jsonb),'versiones',v_versions
  );
exception when invalid_text_representation then
  return jsonb_build_object('ok',false,'error','DATOS_INTERNOS_INVALIDOS');
end;
$$;
revoke all on function public.tpl_propietario_informe_tasacion_por_token_v1(text) from public;
grant execute on function public.tpl_propietario_informe_tasacion_por_token_v1(text) to anon,authenticated;
comment on function public.tpl_propietario_informe_tasacion_por_token_v1(text) is 'Informe visual propietario basado exclusivamente en historial canónico tpl_tasaciones.';
