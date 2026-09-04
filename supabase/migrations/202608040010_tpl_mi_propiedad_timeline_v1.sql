-- TPL 1.0 · Mi Propiedad + timeline unificado
-- Amplía la respuesta segura por token sin exponer datos administrativos.

create index if not exists tpl_actualizaciones_propietario_propiedad_fecha_idx
  on public.tpl_actualizaciones_propietario(propiedad_id, created_at desc);

create or replace function public.tpl_propietario_resumen_por_token_v1(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link public.tpl_links_propietario;
  v_prop public.tpl_propiedades%rowtype;
  v_tas jsonb := '{}'::jsonb;
  v_scores jsonb := '{}'::jsonb;
  v_comercial jsonb := '{}'::jsonb;
  v_timeline jsonb := '[]'::jsonb;
  v_tareas jsonb := '[]'::jsonb;
  v_actualizaciones jsonb := '[]'::jsonb;
  v_necesidades jsonb := '[]'::jsonb;
  v_fotos integer := 0;
begin
  select * into v_link
  from public.tpl_links_propietario
  where token_hash = encode(
    extensions.digest(convert_to(coalesce(trim(p_token), ''), 'UTF8'), 'sha256'),
    'hex'
  )
    and estado = 'activo'
    and expires_at > now()
  limit 1;

  if v_link.id is null then
    return jsonb_build_object('ok', false, 'error', 'Enlace inválido o vencido');
  end if;

  update public.tpl_links_propietario
     set last_used_at = now(), usos = usos + 1
   where id = v_link.id;

  select * into v_prop
  from public.tpl_propiedades
  where id = v_link.propiedad_id;

  select coalesce(to_jsonb(t), '{}'::jsonb)
    into v_tas
  from public.tpl_tasaciones t
  where t.propiedad_id = v_prop.id
  order by t.created_at desc
  limit 1;

  select coalesce(to_jsonb(s) - 'propiedad_id', '{}'::jsonb)
    into v_scores
  from public.tpl_activo_scores s
  where s.propiedad_id = v_prop.id;

  select coalesce(to_jsonb(c) - 'propiedad_id', '{}'::jsonb)
    into v_comercial
  from public.tpl_activo_comercial c
  where c.propiedad_id = v_prop.id;

  select count(*)::integer into v_fotos
  from public.tpl_propiedad_imagenes i
  where i.propiedad_id = v_prop.id and i.tipo = 'foto';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'evento', e.evento,
    'categoria', e.categoria,
    'origen', e.origen,
    'prioridad', e.prioridad,
    'descripcion', e.descripcion,
    'metadata', e.metadata,
    'created_at', e.created_at
  ) order by e.created_at desc), '[]'::jsonb)
  into v_timeline
  from (
    select * from public.tpl_eventos
    where propiedad_id = v_prop.id
    order by created_at desc
    limit 40
  ) e;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'titulo', t.titulo,
    'detalle', t.detalle,
    'tipo', t.tipo,
    'prioridad', t.prioridad,
    'estado', t.estado,
    'vence_at', t.vence_at,
    'created_at', t.created_at
  ) order by coalesce(t.vence_at, t.created_at) asc), '[]'::jsonb)
  into v_tareas
  from (
    select * from public.tpl_tareas
    where propiedad_id = v_prop.id
      and estado in ('pendiente','en_progreso','esperando')
    order by coalesce(vence_at, created_at) asc
    limit 20
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'campos_modificados', a.campos_modificados,
    'fotos_pendientes', a.fotos_pendientes,
    'created_at', a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_actualizaciones
  from (
    select * from public.tpl_actualizaciones_propietario
    where propiedad_id = v_prop.id
    order by created_at desc
    limit 15
  ) a;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'prioridad', n.prioridad,
    'estado', n.estado,
    'detalle', n.detalle,
    'servicio', s.nombre,
    'servicio_codigo', s.codigo
  ) order by case n.prioridad when 'critica' then 1 when 'alta' then 2 when 'media' then 3 else 4 end), '[]'::jsonb)
  into v_necesidades
  from public.tpl_necesidades_proyecto n
  join public.tpl_servicios s on s.id = n.servicio_id
  where n.propiedad_id = v_prop.id
    and n.estado not in ('completada','descartada');

  return jsonb_build_object(
    'ok', true,
    'expires_at', v_link.expires_at,
    'propiedad', jsonb_build_object(
      'id', v_prop.id,
      'codigo', v_prop.codigo,
      'tipo', v_prop.tipo,
      'titulo', v_prop.titulo,
      'descripcion', v_prop.descripcion,
      'region', v_prop.region,
      'comuna', v_prop.comuna,
      'sector', v_prop.sector,
      'superficie_m2', v_prop.superficie_m2,
      'precio_publicado', v_prop.precio_publicado,
      'estado', v_prop.estado,
      'agua', v_prop.agua,
      'electricidad', v_prop.electricidad,
      'acceso', v_prop.acceso,
      'topografia', v_prop.topografia,
      'rol_situacion', v_prop.rol_situacion,
      'cierre_perimetral', v_prop.cierre_perimetral,
      'porton', v_prop.porton,
      'plan_codigo', v_prop.plan_codigo,
      'contacto_publico_modo', v_prop.contacto_publico_modo,
      'completitud_pct', v_prop.completitud_pct,
      'salud_anuncio_pct', v_prop.salud_anuncio_pct,
      'version_actual', v_prop.version_actual,
      'metadata', v_prop.metadata,
      'updated_at', v_prop.updated_at
    ),
    'tasacion', v_tas,
    'scores', v_scores,
    'comercial', v_comercial,
    'timeline', v_timeline,
    'tareas', v_tareas,
    'actualizaciones', v_actualizaciones,
    'necesidades', v_necesidades,
    'resumen', jsonb_build_object(
      'fotografias', v_fotos,
      'eventos', jsonb_array_length(v_timeline),
      'pendientes', jsonb_array_length(v_tareas),
      'necesidades', jsonb_array_length(v_necesidades)
    )
  );
end;
$$;

grant execute on function public.tpl_propietario_resumen_por_token_v1(text) to anon, authenticated;
