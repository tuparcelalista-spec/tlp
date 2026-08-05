-- ============================================================
-- TPL CORE — MOTOR DE NECESIDADES Y SERVICIOS POR ACTIVO v1
-- Fecha: 2026-08-04
-- Recomienda capacidades según la ficha real de cada propiedad.
-- No expone datos privados ni empresas específicas.
-- ============================================================

insert into public.tpl_servicios(codigo,nombre,categoria,unidad,descripcion,requiere_visita_tecnica)
values
('paneles_solares','Paneles solares y respaldo energético','electricidad','proyecto','Diseño e instalación de energía solar para proyectos rurales.',true),
('topografia','Topografía y levantamiento','tecnico','proyecto','Levantamiento, deslindes, niveles y apoyo para diseño o subdivisión.',true),
('arquitectura_rural','Arquitectura y diseño rural','construccion','proyecto','Diseño de vivienda y planificación del proyecto de campo.',true),
('casa_prefabricada','Casa prefabricada','construccion','m2','Diseño, fabricación e instalación de vivienda para parcela.',true),
('drenaje_terreno','Drenaje y manejo de aguas lluvia','terreno','proyecto','Soluciones de drenaje para accesos, pendientes o zonas húmedas.',true),
('internet_rural','Internet y conectividad rural','conectividad','proyecto','Evaluación e instalación de conectividad para zonas rurales.',true)
on conflict (codigo) do update set
  nombre=excluded.nombre,
  categoria=excluded.categoria,
  unidad=excluded.unidad,
  descripcion=excluded.descripcion,
  requiere_visita_tecnica=excluded.requiere_visita_tecnica,
  activo=true;

create or replace function public.tpl_servicios_recomendados_activo_v1(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p public.tpl_propiedades%rowtype;
  t public.tpl_activo_terreno%rowtype;
  v public.tpl_activo_vivienda%rowtype;
  result jsonb := '[]'::jsonb;
  item jsonb;
  partner_count integer;
  normalized text;
  add_codes text[] := '{}';
  code text;
  reason text;
  level text;
  kind text;
begin
  normalized:=nullif(trim(coalesce(p_identifier,'')),'');
  if normalized is null then return jsonb_build_object('ok',false,'error','identifier_required'); end if;

  select * into p from public.tpl_propiedades
  where id::text=normalized or lower(coalesce(codigo,''))=lower(normalized) or lower(coalesce(metadata->>'source_legacy_id',''))=lower(normalized)
  order by updated_at desc limit 1;
  if p.id is null then return jsonb_build_object('ok',false,'error','not_found'); end if;

  select * into t from public.tpl_activo_terreno where propiedad_id=p.id;
  select * into v from public.tpl_activo_vivienda where propiedad_id=p.id;

  -- Necesidades confirmadas.
  if coalesce(lower(p.agua),'') in ('','no','sin agua','no disponible','por confirmar')
     and coalesce(lower(t.agua_tipo),'') in ('','no','sin agua','por confirmar') then
    add_codes:=array_append(add_codes,'solucion_agua');
  end if;
  if coalesce(lower(p.electricidad),'') in ('','no','sin luz','no disponible','por confirmar')
     and coalesce(lower(t.electricidad_tipo),'') in ('','no','sin electricidad','por confirmar') then
    add_codes:=array_append(add_codes,'paneles_solares');
    add_codes:=array_append(add_codes,'instalacion_electrica');
  end if;
  if coalesce(lower(p.cierre_perimetral),'') in ('','no','sin cierre','incompleto','parcial','por confirmar') then
    add_codes:=array_append(add_codes,'cerco_perimetral');
  end if;
  if coalesce(lower(p.porton),'') in ('','no','sin portón','sin porton','por confirmar') then
    add_codes:=array_append(add_codes,'porton_acceso');
  end if;
  if coalesce(lower(p.acceso),'') ~ '(malo|difícil|dificil|barro|huella|por mejorar)' or coalesce(lower(t.acceso_invierno),'') ~ '(malo|no|difícil|dificil)' then
    add_codes:=array_append(add_codes,'mejora_camino');
  end if;
  if coalesce(t.pendiente_pct,0)>=8 or coalesce(lower(p.topografia),'') ~ '(pendiente|irregular|quebrada)' then
    add_codes:=array_append(add_codes,'topografia');
    add_codes:=array_append(add_codes,'drenaje_terreno');
  end if;
  if coalesce(p.superficie_m2,0)>=10000 or coalesce(t.subdivisible,false) then
    add_codes:=array_append(add_codes,'topografia');
  end if;
  if coalesce(lower(t.internet),'') in ('','no','sin señal','sin senal','por confirmar') then
    add_codes:=array_append(add_codes,'internet_rural');
  end if;

  -- Mejoras sugeridas según tipo de activo.
  if p.tipo in ('parcela','campo','sitio_urbano') and v.propiedad_id is null then
    add_codes:=array_append(add_codes,'arquitectura_rural');
    add_codes:=array_append(add_codes,'casa_prefabricada');
    add_codes:=array_append(add_codes,'fosa_septica');
  end if;
  if coalesce(lower(p.vegetacion),'') ~ '(densa|matorral|bosque)' then
    add_codes:=array_append(add_codes,'limpieza_terreno');
  end if;

  -- Quitar duplicados conservando orden y limitar a 6.
  for code in select x from unnest(add_codes) with ordinality u(x,ord) group by x order by min(ord) loop
    exit when jsonb_array_length(result)>=6;
    select count(*) into partner_count
      from public.tpl_partner_servicios ps
      join public.tpl_servicios s on s.id=ps.servicio_id
      where s.codigo=code and ps.activo=true and ps.disponibilidad<>'no_disponible'
        and (cardinality(ps.comunas)=0 or p.comuna=any(ps.comunas) or cardinality(ps.regiones)=0 or p.region=any(ps.regiones));

    select case code
      when 'solucion_agua' then 'La ficha no confirma una solución de agua operativa.'
      when 'paneles_solares' then 'La propiedad no registra electricidad disponible; la energía solar puede evaluarse como alternativa o respaldo.'
      when 'instalacion_electrica' then 'Conviene evaluar empalme, tablero o extensión eléctrica según la distancia disponible.'
      when 'cerco_perimetral' then 'No se confirma un cierre perimetral completo.'
      when 'porton_acceso' then 'No se registra portón de acceso.'
      when 'mejora_camino' then 'El acceso informado podría requerir estabilización o mejora para uso permanente.'
      when 'topografia' then 'La superficie o pendiente hace recomendable contar con un levantamiento actualizado.'
      when 'drenaje_terreno' then 'La pendiente o condición del acceso hace conveniente revisar escurrimientos y drenajes.'
      when 'internet_rural' then 'La conectividad todavía no está confirmada.'
      when 'arquitectura_rural' then 'El terreno puede planificarse antes de definir ubicación, orientación y etapas de construcción.'
      when 'casa_prefabricada' then 'La propiedad no registra vivienda y puede complementarse con una solución habitacional.'
      when 'fosa_septica' then 'Una futura vivienda rural necesitará resolver su sistema sanitario.'
      when 'limpieza_terreno' then 'La vegetación informada puede requerir despeje planificado antes de construir.'
      else 'Servicio compatible con las características declaradas de esta propiedad.' end into reason;

    kind:=case when code in ('arquitectura_rural','casa_prefabricada','internet_rural','limpieza_terreno') then 'mejora_sugerida' else 'necesidad_detectada' end;
    level:=case when code in ('solucion_agua','instalacion_electrica','mejora_camino','topografia','drenaje_terreno') then 'alta' else 'media' end;

    select jsonb_build_object(
      'codigo',s.codigo,'nombre',s.nombre,'categoria',s.categoria,'descripcion',s.descripcion,
      'motivo',reason,'tipo',kind,'prioridad',level,'especialistas_disponibles',partner_count,
      'requiere_visita_tecnica',s.requiere_visita_tecnica
    ) into item from public.tpl_servicios s where s.codigo=code and s.activo=true;
    if item is not null then result:=result||jsonb_build_array(item); end if;
  end loop;

  return jsonb_build_object(
    'ok',true,'propiedad_id',p.id,'codigo',p.codigo,'comuna',p.comuna,
    'titulo','Para que esta propiedad sea aún mejor',
    'explicacion','TPL muestra únicamente capacidades relacionadas con los antecedentes actuales de esta propiedad.',
    'recomendaciones',result
  );
end;
$$;

revoke all on function public.tpl_servicios_recomendados_activo_v1(text) from public;
grant execute on function public.tpl_servicios_recomendados_activo_v1(text) to anon, authenticated;
