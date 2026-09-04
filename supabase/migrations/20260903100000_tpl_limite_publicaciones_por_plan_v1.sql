-- Tu Parcela Lista
-- Límite de publicaciones activas por plan (incluido en el plan, no cobro por anuncio)
-- Fecha: 2026-09-03
--
-- QUÉ HACE
--   El usuario decidió que publicar más anuncios no se cobra por separado:
--   va incluido según el plan (gratis=1, profesional=5, premium=sin límite).
--   Hasta ahora tpl_planes_comerciales.limites.publicaciones_activas existía
--   solo como dato — nada en el sistema lo leía ni lo aplicaba.
--
--   Esta migración:
--   1) Carga el límite real en los planes (gratis ya tenía 1; se agrega
--      profesional=5; premium queda sin la clave, es decir sin límite
--      práctico — es intermediación gestionada por un asesor, no
--      autoservicio de publicar N anuncios).
--   2) Extiende tpl_revisar_publicacion_v1 (se reproduce COMPLETA, tal como
--      queda desplegada hoy, más el agregado): al APROBAR, si el propietario/
--      corredor queda sobre el límite de su plan, NO se bloquea la
--      aprobación (un asesor puede necesitar aprobar igual por razones
--      comerciales) pero se registra un evento de alta prioridad para que
--      el equipo comercial ofrezca subir de plan — es un gatillo de venta,
--      no un candado técnico. Todo lo demás de la función (el correo de
--      aprobación/rechazo vía tpl_comunicaciones_cola, el evento de
--      auditoría, el jsonb de retorno) queda exactamente igual que antes.
--
-- RIESGOS
--   Bajo. No cambia el comportamiento de aprobar/rechazar ni el correo que
--   ya se enviaba, solo agrega un evento adicional cuando corresponde. Si
--   algo falla al calcular el límite, se atrapa la excepción y no afecta ni
--   la aprobación ni el correo.

update public.tpl_planes_comerciales
   set limites = limites || jsonb_build_object('publicaciones_activas', 5), updated_at = now()
 where codigo = 'profesional';

update public.tpl_planes_comerciales
   set limites = limites - 'publicaciones_activas', updated_at = now()
 where codigo = 'premium';

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
  v_dueno_id uuid;
  v_limite integer;
  v_activas integer;
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

    -- Gatillo comercial (agregado 2026-09-03): si esto deja al dueño sobre
    -- el límite de su plan, avisar al equipo comercial. No bloquea nada.
    begin
      v_dueno_id := coalesce(v_prop.propietario_actor_id, v_prop.corredor_actor_id);
      if v_dueno_id is not null then
        select (pl.limites->>'publicaciones_activas')::integer into v_limite
          from public.tpl_suscripciones s
          join public.tpl_planes_comerciales pl on pl.id = s.plan_id
         where s.actor_id = v_dueno_id and s.estado in ('activa','prueba') and s.propiedad_id is null
         order by pl.nivel desc
         limit 1;

        if v_limite is null then
          select (limites->>'publicaciones_activas')::integer into v_limite
            from public.tpl_planes_comerciales where codigo = 'gratis';
        end if;

        if v_limite is not null then
          select count(*) into v_activas
            from public.tpl_propiedades
           where estado = 'publicada'
             and (propietario_actor_id = v_dueno_id or corredor_actor_id = v_dueno_id);

          if v_activas > v_limite then
            insert into public.tpl_eventos(actor_id, propiedad_id, evento, categoria, origen, prioridad, descripcion, metadata)
            values (
              v_dueno_id, v_prop.id, 'limite_plan_excedido', 'comercial', 'crm', 'alta',
              'El propietario/corredor superó el límite de publicaciones activas de su plan actual. Oportunidad de ofrecer upgrade.',
              jsonb_build_object('publicaciones_activas', v_activas, 'limite_plan', v_limite)
            );
          end if;
        end if;
      end if;
    exception when others then
      raise warning 'tpl_revisar_publicacion_v1 (chequeo de límite): %', sqlerrm;
    end;
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
