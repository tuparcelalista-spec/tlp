-- TPL · Registro canónico de tasaciones vinculadas desde CRM
begin;

create or replace function public.tpl_registrar_tasacion_v1(
  p_entrada jsonb,
  p_resultado jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_propiedad_id uuid;
  v_id uuid;
  v_superficie numeric;
  v_precio bigint;
  v_valor bigint;
  v_quick bigint;
  v_patient bigint;
  v_valor_m2 bigint;
  v_precio_m2 bigint;
  v_ref_m2 bigint;
  v_diff numeric;
  v_class text;
  v_tipo text;
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  begin
    v_propiedad_id := nullif(coalesce(
      p_entrada->>'propiedadId',
      p_entrada->>'propiedad_id'
    ), '')::uuid;
  exception when others then
    v_propiedad_id := null;
  end;

  if v_propiedad_id is null then
    raise exception 'La tasación no recibió propiedad_id.';
  end if;

  if not exists(select 1 from public.tpl_propiedades where id = v_propiedad_id) then
    raise exception 'La propiedad vinculada no existe.';
  end if;

  v_superficie := nullif(coalesce(p_entrada->>'area', p_entrada->>'superficie'), '')::numeric;
  if v_superficie is null or v_superficie <= 0 then
    raise exception 'La superficie debe ser mayor que 0.';
  end if;

  if nullif(trim(coalesce(p_entrada->>'region','')), '') is null
     or nullif(trim(coalesce(p_entrada->>'comuna','')), '') is null then
    raise exception 'La tasación requiere región y comuna.';
  end if;

  v_precio := coalesce(nullif(p_entrada->>'asking','')::numeric, 0)::bigint;
  v_valor := coalesce(
    nullif(p_resultado->>'recommended','')::numeric,
    nullif(p_resultado->>'ideal','')::numeric,
    nullif(p_resultado->>'market','')::numeric,
    nullif(p_resultado#>>'{landResult,ideal}','')::numeric
  )::bigint;

  if v_valor is null or v_valor <= 0 then
    raise exception 'El motor no entregó un Valor TPL válido.';
  end if;

  v_quick := coalesce(nullif(p_resultado->>'quick','')::numeric, nullif(p_resultado->>'agile','')::numeric, v_valor * 0.93)::bigint;
  v_patient := coalesce(nullif(p_resultado->>'patient','')::numeric, nullif(p_resultado->>'technicalPotential','')::numeric, v_valor * 1.08)::bigint;
  v_valor_m2 := round(v_valor::numeric / v_superficie)::bigint;
  if v_precio > 0 then v_precio_m2 := round(v_precio::numeric / v_superficie)::bigint; end if;
  v_ref_m2 := coalesce(
    nullif(p_resultado#>>'{marketReference,medianM2}','')::numeric,
    nullif(p_resultado#>>'{landResult,marketReference,medianM2}','')::numeric,
    nullif(p_resultado#>>'{marketReference,median_m2}','')::numeric
  )::bigint;
  if v_precio > 0 then v_diff := round(((v_precio-v_valor)::numeric/v_valor)*100,2); end if;
  v_class := left(coalesce(p_resultado#>>'{priceAnalysis,classification}', p_resultado#>>'{landResult,priceAnalysis,classification}', ''),160);
  v_tipo := case when coalesce(p_entrada->>'mode','') = 'precisa' then 'precisa' else 'rapida' end;

  insert into public.tpl_tasaciones(
    propiedad_id,tipo,superficie_m2,precio_publicado,precio_publicado_m2,
    valor_tpl_total,valor_tpl_m2,referencia_comunal_m2,
    diferencia_publicado_vs_tpl_pct,clasificacion,es_oportunidad,
    factores,entrada,resultado,version_motor
  ) values (
    v_propiedad_id,v_tipo,v_superficie,nullif(v_precio,0),v_precio_m2,
    v_valor,v_valor_m2,v_ref_m2,v_diff,nullif(v_class,''),
    coalesce(v_diff <= -5,false),
    coalesce(p_resultado->'breakdown',p_resultado->'desglose','[]'::jsonb),
    p_entrada,
    p_resultado || jsonb_build_object('quick',v_quick,'patient',v_patient),
    left(coalesce(p_resultado->>'engineVersion',p_resultado->>'method','tpl-land-engine-v2'),80)
  ) returning id into v_id;

  return jsonb_build_object('ok',true,'tasacion_id',v_id,'propiedad_id',v_propiedad_id);
end;
$$;

revoke all on function public.tpl_registrar_tasacion_v1(jsonb,jsonb) from public;
grant execute on function public.tpl_registrar_tasacion_v1(jsonb,jsonb) to authenticated;

commit;
