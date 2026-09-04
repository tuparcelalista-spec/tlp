-- TPL · Revisión de publicaciones: aprobar o rechazar con aviso al propietario
--
-- Hasta ahora existía tpl_aprobar_publicacion_v1, que solo aprueba y no avisa a
-- nadie. No había forma de rechazar con motivo, así que la bandeja de revisión
-- del CRM tenía un botón "Revisar" que solo hacía console.log.
--
-- Esta función resuelve las dos decisiones en un solo lugar y encola el correo
-- correspondiente, que es lo que cierra el circuito con quien publicó.

create or replace function public.tpl_revisar_publicacion_v1(
  p_publicacion_id uuid,
  p_decision text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop public.tpl_propiedades%rowtype;
  v_pub public.tpl_publicaciones%rowtype;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_email text;
  v_nombre text;
  v_sitio text := 'https://www.parcelalista.cl';
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso no autorizado' using errcode = '42501';
  end if;

  if v_decision not in ('aprobar', 'rechazar') then
    raise exception 'Decisión inválida: usa aprobar o rechazar';
  end if;

  -- Rechazar sin explicar por qué deja a la persona sin nada que corregir.
  if v_decision = 'rechazar' and v_motivo is null then
    raise exception 'Para rechazar hay que indicar el motivo';
  end if;

  select * into v_pub from public.tpl_publicaciones where id = p_publicacion_id;
  if v_pub.id is null then
    raise exception 'No encontramos esa publicación';
  end if;

  select * into v_prop from public.tpl_propiedades where publicacion_id = p_publicacion_id limit 1;
  if v_prop.id is null then
    raise exception 'No se encontró la propiedad asociada';
  end if;

  -- El correo de contacto se guardó en la metadata al publicar.
  v_email := nullif(lower(trim(coalesce(
    v_prop.metadata->>'contacto_email',
    v_pub.datos#>>'{contacto,email}'
  ))), '');
  v_nombre := nullif(trim(coalesce(
    v_prop.metadata->>'contacto_nombre',
    v_pub.datos#>>'{contacto,nombre}'
  )), '');

  if v_decision = 'aprobar' then
    update public.tpl_publicaciones
       set estado = 'aprobada', aprobada_at = now(), revisada_at = now(), motivo_revision = null, updated_at = now()
     where id = p_publicacion_id;

    update public.tpl_propiedades
       set estado = 'publicada', publicada_at = coalesce(publicada_at, now()), updated_at = now()
     where id = v_prop.id;
  else
    update public.tpl_publicaciones
       set estado = 'rechazada', revisada_at = now(), motivo_revision = left(v_motivo, 2000), updated_at = now()
     where id = p_publicacion_id;

    -- La propiedad NO se borra: queda fuera del catálogo para que la persona
    -- pueda corregir lo señalado y volver a enviarla.
    update public.tpl_propiedades
       set estado = 'rechazada', updated_at = now()
     where id = v_prop.id;
  end if;

  insert into public.tpl_eventos(propiedad_id, evento, categoria, origen, prioridad, descripcion, metadata)
  values (
    v_prop.id,
    case when v_decision = 'aprobar' then 'publicacion.aprobada' else 'publicacion.rechazada' end,
    'publicacion', 'crm',
    case when v_decision = 'aprobar' then 'media' else 'alta' end,
    case when v_decision = 'aprobar'
         then 'Publicación aprobada y habilitada en el catálogo público.'
         else 'Publicación rechazada: ' || coalesce(v_motivo, 'sin motivo') end,
    jsonb_build_object('publicacion_id', p_publicacion_id, 'staff_user_id', auth.uid(), 'motivo', v_motivo)
  );

  -- Aviso por correo. La clave de idempotencia impide duplicar el mensaje si
  -- alguien aprieta dos veces el botón.
  if v_email is not null then
    insert into public.tpl_comunicaciones_cola(canal, destinatario, plantilla, asunto, payload)
    values (
      'email',
      v_email,
      case when v_decision = 'aprobar' then 'publicacion_aprobada' else 'publicacion_rechazada' end,
      case when v_decision = 'aprobar'
           then 'Tu propiedad ya está publicada en Tu Parcela Lista'
           else 'Necesitamos un ajuste en tu publicación' end,
      jsonb_build_object(
        'nombre', coalesce(v_nombre, ''),
        'titulo', coalesce(v_prop.titulo, v_prop.codigo, 'tu propiedad'),
        'codigo', coalesce(v_prop.codigo, ''),
        'comuna', coalesce(v_prop.comuna, ''),
        'motivo', coalesce(v_motivo, ''),
        'correo', v_email,
        'continuar_url', case when v_decision = 'aprobar'
          then v_sitio || '/plataforma/tpl-business-v2/index.html#registro?correo=' || replace(v_email, '@', '%40')
          else v_sitio || '/plataforma/publicar-v2/index.html' end,
        'idempotency_key', 'revision-' || p_publicacion_id::text || '-' || v_decision
      )
    )
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'decision', v_decision,
    'publicacion_id', p_publicacion_id,
    'propiedad_id', v_prop.id,
    'estado_propiedad', case when v_decision = 'aprobar' then 'publicada' else 'rechazada' end,
    'correo_encolado', v_email is not null,
    'destinatario', v_email
  );
end;
$$;

revoke all on function public.tpl_revisar_publicacion_v1(uuid, text, text) from public, anon;
grant execute on function public.tpl_revisar_publicacion_v1(uuid, text, text) to authenticated;

-- Detalle completo de una publicación para la pantalla de revisión del CRM.
-- Sin esto la bandeja solo mostraba código, tipo y fecha: no había con qué
-- decidir si aprobar o rechazar.
create or replace function public.tpl_publicacion_detalle_v1(p_publicacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop public.tpl_propiedades%rowtype;
  v_pub public.tpl_publicaciones%rowtype;
  v_fotos jsonb := '[]'::jsonb;
  v_tasacion jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso no autorizado' using errcode = '42501';
  end if;

  select * into v_pub from public.tpl_publicaciones where id = p_publicacion_id;
  if v_pub.id is null then
    return jsonb_build_object('ok', false, 'error', 'No encontramos esa publicación');
  end if;

  select * into v_prop from public.tpl_propiedades where publicacion_id = p_publicacion_id limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'storage_path', i.storage_path, 'url', i.url,
           'orden', i.orden, 'metadata', i.metadata
         ) order by i.orden), '[]'::jsonb)
    into v_fotos
  from public.tpl_propiedad_imagenes i
  where i.propiedad_id = v_prop.id;

  select coalesce(to_jsonb(t), '{}'::jsonb) into v_tasacion
  from public.tpl_tasaciones t
  where t.propiedad_id = v_prop.id
  order by t.created_at desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'publicacion', to_jsonb(v_pub),
    'propiedad', to_jsonb(v_prop),
    'fotos', v_fotos,
    'tasacion', v_tasacion
  );
end;
$$;

revoke all on function public.tpl_publicacion_detalle_v1(uuid) from public, anon;
grant execute on function public.tpl_publicacion_detalle_v1(uuid) to authenticated;
