-- TPL · Clasificación premium de necesidades por activo
create or replace function public.tpl_servicios_recomendados_activo_v1(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p public.tpl_propiedades%rowtype; t public.tpl_activo_terreno%rowtype; v public.tpl_activo_vivienda%rowtype;
  result jsonb:='[]'::jsonb; item jsonb; partner_count integer; normalized text;
  entries jsonb:='[]'::jsonb; e jsonb; code text; reason text; level text; kind text;
begin
  normalized:=nullif(trim(coalesce(p_identifier,'')),'');
  if normalized is null then return jsonb_build_object('ok',false,'error','identifier_required'); end if;
  select * into p from public.tpl_propiedades where id::text=normalized or lower(coalesce(codigo,''))=lower(normalized) or lower(coalesce(metadata->>'source_legacy_id',''))=lower(normalized) order by updated_at desc limit 1;
  if p.id is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  select * into t from public.tpl_activo_terreno where propiedad_id=p.id;
  select * into v from public.tpl_activo_vivienda where propiedad_id=p.id;

  -- Información desconocida: pedir confirmación, no presentarla como defecto.
  if nullif(trim(coalesce(p.agua,t.agua_tipo,'')),'') is null or lower(coalesce(p.agua,t.agua_tipo,'')) in ('por confirmar','desconocido') then entries:=entries||jsonb_build_array(jsonb_build_object('code','solucion_agua','kind','informacion_pendiente','level','media','reason','Todavía no se confirma la situación de agua.'));
  elsif lower(coalesce(p.agua,t.agua_tipo,'')) in ('no','sin agua','no disponible') then entries:=entries||jsonb_build_array(jsonb_build_object('code','solucion_agua','kind','necesidad_detectada','level','alta','reason','La ficha confirma que la propiedad no cuenta con una solución de agua operativa.')); end if;

  if nullif(trim(coalesce(p.electricidad,t.electricidad_tipo,'')),'') is null or lower(coalesce(p.electricidad,t.electricidad_tipo,'')) in ('por confirmar','desconocido') then entries:=entries||jsonb_build_array(jsonb_build_object('code','instalacion_electrica','kind','informacion_pendiente','level','media','reason','Todavía no se confirma empalme, poste cercano o solución energética.'));
  elsif lower(coalesce(p.electricidad,t.electricidad_tipo,'')) in ('no','sin luz','sin electricidad','no disponible') then entries:=entries||jsonb_build_array(jsonb_build_object('code','paneles_solares','kind','necesidad_detectada','level','alta','reason','La ficha confirma que la propiedad no dispone de electricidad. Puede evaluarse conexión o energía solar.')); end if;

  if nullif(trim(coalesce(p.cierre_perimetral,'')),'') is null or lower(p.cierre_perimetral) in ('por confirmar','desconocido') then entries:=entries||jsonb_build_array(jsonb_build_object('code','cerco_perimetral','kind','informacion_pendiente','level','baja','reason','Todavía no se confirma si el cierre perimetral es completo, parcial o inexistente.'));
  elsif lower(p.cierre_perimetral) in ('no','sin cierre','incompleto','parcial') then entries:=entries||jsonb_build_array(jsonb_build_object('code','cerco_perimetral','kind','necesidad_detectada','level','media','reason','La ficha indica que el cierre perimetral no está completo.')); end if;

  if nullif(trim(coalesce(p.porton,'')),'') is null or lower(p.porton) in ('por confirmar','desconocido') then entries:=entries||jsonb_build_array(jsonb_build_object('code','porton_acceso','kind','informacion_pendiente','level','baja','reason','Todavía no se confirma si la propiedad cuenta con portón de acceso.'));
  elsif lower(p.porton) in ('no','sin portón','sin porton') then entries:=entries||jsonb_build_array(jsonb_build_object('code','porton_acceso','kind','necesidad_detectada','level','media','reason','La ficha indica que la propiedad no cuenta con portón de acceso.')); end if;

  if nullif(trim(coalesce(p.acceso,t.acceso_invierno,'')),'') is null or lower(coalesce(p.acceso,t.acceso_invierno,'')) in ('por confirmar','desconocido') then entries:=entries||jsonb_build_array(jsonb_build_object('code','mejora_camino','kind','informacion_pendiente','level','media','reason','Falta confirmar el estado del acceso durante todo el año.'));
  elsif lower(coalesce(p.acceso,t.acceso_invierno,'')) ~ '(malo|difícil|dificil|barro|huella|por mejorar)' then entries:=entries||jsonb_build_array(jsonb_build_object('code','mejora_camino','kind','necesidad_detectada','level','alta','reason','El acceso informado podría requerir estabilización, ripio o drenaje.')); end if;

  if coalesce(t.pendiente_pct,0)>=8 or lower(coalesce(p.topografia,''))~'(pendiente|irregular|quebrada)' then entries:=entries||jsonb_build_array(jsonb_build_object('code','topografia','kind','necesidad_detectada','level','alta','reason','La pendiente o forma del terreno hace recomendable un levantamiento topográfico actualizado.')); end if;
  if coalesce(p.superficie_m2,0)>=10000 or coalesce(t.subdivisible,false) then entries:=entries||jsonb_build_array(jsonb_build_object('code','topografia','kind','mejora_sugerida','level','media','reason','Por su superficie, una topografía puede facilitar planificación, deslindes o subdivisión.')); end if;
  if p.tipo in ('parcela','campo','sitio_urbano') and v.propiedad_id is null then entries:=entries||jsonb_build_array(jsonb_build_object('code','arquitectura_rural','kind','mejora_sugerida','level','media','reason','La propiedad puede planificarse antes de definir ubicación, orientación y etapas de construcción.')); end if;

  for e in select value from jsonb_array_elements(entries) loop
    code:=e->>'code'; kind:=e->>'kind'; level:=e->>'level'; reason:=e->>'reason';
    if exists(select 1 from jsonb_array_elements(result) r where r->>'codigo'=code and r->>'tipo'=kind) then continue; end if;
    select count(*) into partner_count from public.tpl_partner_servicios ps join public.tpl_servicios s on s.id=ps.servicio_id where s.codigo=code and ps.activo=true and ps.disponibilidad<>'no_disponible' and (cardinality(ps.comunas)=0 or p.comuna=any(ps.comunas) or cardinality(ps.regiones)=0 or p.region=any(ps.regiones));
    select jsonb_build_object('codigo',s.codigo,'nombre',s.nombre,'categoria',s.categoria,'descripcion',s.descripcion,'motivo',reason,'tipo',kind,'prioridad',level,'especialistas_disponibles',partner_count,'requiere_visita_tecnica',s.requiere_visita_tecnica) into item from public.tpl_servicios s where s.codigo=code and s.activo=true;
    if item is not null then result:=result||jsonb_build_array(item); end if;
    exit when jsonb_array_length(result)>=8;
  end loop;
  return jsonb_build_object('ok',true,'propiedad_id',p.id,'codigo',p.codigo,'comuna',p.comuna,'diagnostico_actualizado_at',p.updated_at,'titulo','Para que esta propiedad sea aún mejor','explicacion','TPL separa necesidades confirmadas, información pendiente y mejoras opcionales según la ficha más reciente.','recomendaciones',result);
end $$;
revoke all on function public.tpl_servicios_recomendados_activo_v1(text) from public;
grant execute on function public.tpl_servicios_recomendados_activo_v1(text) to anon,authenticated;
