-- ------------------------------------------------------------
-- FASE 3: RPCs COMERCIALES PARA EL CRM TPL
-- ------------------------------------------------------------

-- 1. RPC: CREAR ACTOR (IDEMPOTENTE Y CON PREVENCIÓN DE DUPLICADOS)
create or replace function public.tpl_crm_crear_actor_v1(
  p_nombre text,
  p_email text,
  p_telefono text,
  p_rol text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rut text;
  v_actor_id uuid;
  v_actor_existente public.tpl_actores;
begin
  -- 1. Barrera de Seguridad Staff
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  -- 2. Validaciones básicas
  if trim(p_nombre) = '' then
    raise exception 'NOMBRE_VACIO';
  end if;

  if p_rol not in ('comprador', 'propietario', 'corredor', 'partner', 'empresa_casas', 'contratista', 'proveedor', 'asesor_tpl', 'administrador') then
    raise exception 'ROL_INVALIDO';
  end if;

  v_rut := trim(coalesce(p_metadata->>'rut', ''));

  -- Lock preventivo para concurrencia
  perform 1 from public.tpl_actores for update;

  -- 3. Buscar por RUT
  if v_rut <> '' then
    select * into v_actor_existente from public.tpl_actores where rut = v_rut limit 1;
    if v_actor_existente.id is not null then
      -- Validar si el email coincide
      if p_email is not null and p_email <> '' and lower(v_actor_existente.email) <> lower(p_email) then
        raise exception 'CONFLICTO_IDENTIFICADORES_PROSPECTO' using detail = 'El RUT ya existe asociado a otro correo electrónico';
      end if;
      v_actor_id := v_actor_existente.id;
    end if;
  end if;

  -- 4. Buscar por Email si no se encontró por RUT
  if v_actor_id is null and p_email is not null and p_email <> '' then
    select * into v_actor_existente from public.tpl_actores where lower(email) = lower(p_email) limit 1;
    if v_actor_existente.id is not null then
      -- Validar RUT
      if v_rut <> '' and coalesce(v_actor_existente.rut, '') <> v_rut then
        raise exception 'CONFLICTO_IDENTIFICADORES_PROSPECTO' using detail = 'El correo ya existe asociado a otro RUT';
      end if;
      v_actor_id := v_actor_existente.id;
    end if;
  end if;

  -- 5. Insertar o recuperar Actor
  if v_actor_id is null then
    insert into public.tpl_actores(nombre, email, telefono, rut, metadata)
    values (p_nombre, p_email, p_telefono, nullif(v_rut, ''), p_metadata)
    returning id into v_actor_id;
  else
    -- Actualizar datos adicionales respetando los existentes
    update public.tpl_actores
    set
      telefono = coalesce(telefono, p_telefono),
      metadata = metadata || p_metadata,
      updated_at = now()
    where id = v_actor_id;
  end if;

  -- 6. Insertar Rol de forma idempotente
  insert into public.tpl_actor_roles(actor_id, rol)
  values (v_actor_id, p_rol)
  on conflict (actor_id, rol) do nothing;

  -- 7. Registro de auditoría
  insert into public.tpl_eventos(actor_id, evento, categoria, origen, descripcion, metadata)
  values (v_actor_id, 'crm.actor_creado', 'comercial', 'crm_staff', 'Actor registrado o actualizado con nuevo rol en CRM', jsonb_build_object('rol', p_rol));

  return jsonb_build_object('ok', true, 'actor_id', v_actor_id);
end $$;

revoke all on function public.tpl_crm_crear_actor_v1(text, text, text, text, jsonb) from public;
grant execute on function public.tpl_crm_crear_actor_v1(text, text, text, text, jsonb) to authenticated;


-- 2. RPC: ACTUALIZAR ESTADO DE OPORTUNIDAD (PIPELINE)
create or replace function public.tpl_crm_actualizar_estado_oportunidad_v1(
  p_oportunidad_id uuid,
  p_estado text,
  p_comentario text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oportunidad public.tpl_oportunidades;
  v_estado_previo text;
begin
  -- 1. Barrera de Seguridad Staff
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  -- 2. Whitelist de estados comerciales
  if p_estado not in ('nueva', 'contactada', 'calificada', 'agendada', 'negociacion', 'reservada', 'vendida', 'perdida', 'cancelada', 'aceptada', 'rechazada') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  -- 3. Lock y validación de existencia
  select * into v_oportunidad from public.tpl_oportunidades where id = p_oportunidad_id for update;
  if v_oportunidad.id is null then
    raise exception 'OPORTUNIDAD_INEXISTENTE';
  end if;

  v_estado_previo := v_oportunidad.estado;

  -- 4. Ejecutar transición
  update public.tpl_oportunidades
  set
    estado = p_estado,
    updated_at = now()
  where id = p_oportunidad_id;

  -- 5. Si la oportunidad se cierra como vendida, asegurar el rol cliente/propietario
  if p_estado = 'vendida' then
    insert into public.tpl_actor_roles(actor_id, rol)
    values (v_oportunidad.actor_cliente_id, 'cliente')
    on conflict (actor_id, rol) do nothing;
  end if;

  -- 6. Auditoría inmutable de transiciones comerciales
  insert into public.tpl_eventos(actor_id, proyecto_id, evento, categoria, origen, descripcion, metadata)
  values (v_oportunidad.actor_cliente_id, v_oportunidad.proyecto_id, 'oportunidad.fase_cambiada', 'comercial', 'crm_staff', coalesce(p_comentario, 'Transición de estado del negocio'), jsonb_build_object('oportunidad_id', p_oportunidad_id, 'estado_anterior', v_estado_previo, 'estado_nuevo', p_estado, 'comentario', p_comentario));

  return jsonb_build_object('ok', true, 'oportunidad_id', p_oportunidad_id, 'estado_anterior', v_estado_previo, 'estado_nuevo', p_estado);
end $$;

revoke all on function public.tpl_crm_actualizar_estado_oportunidad_v1(uuid, text, text) from public;
grant execute on function public.tpl_crm_actualizar_estado_oportunidad_v1(uuid, text, text) to authenticated;


-- 3. RPC: AGENDAR VISITA (CON VERIFICACIÓN DE COLISIÓN DE AGENDA STAFF)
create or replace function public.tpl_crm_agendar_visita_v1(
  p_oportunidad_id uuid,
  p_staff_id uuid,
  p_fecha_hora timestamptz,
  p_notas text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oportunidad public.tpl_oportunidades;
  v_visita_id uuid;
begin
  -- 1. Barrera de Seguridad Staff
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  -- 2. Validar que la oportunidad existe
  select * into v_oportunidad from public.tpl_oportunidades where id = p_oportunidad_id for update;
  if v_oportunidad.id is null then
    raise exception 'OPORTUNIDAD_INEXISTENTE';
  end if;

  -- 3. Validar ejecutivo staff existente
  if not exists(select 1 from public.tpl_actores where id = p_staff_id) then
    raise exception 'EJECUTIVO_INEXISTENTE';
  end if;

  -- 4. Validar colisión horaria (ventana fija de +- 2 horas)
  if exists(
    select 1 from public.tpl_visitas
    where usuario_staff_id = p_staff_id
      and estado not in ('cancelada')
      and fecha_hora between p_fecha_hora - interval '2 hours' and p_fecha_hora + interval '2 hours'
  ) then
    raise exception 'COLISION_HORARIO_EJECUTIVO';
  end if;

  -- 5. Insertar visita
  insert into public.tpl_visitas(oportunidad_id, usuario_staff_id, fecha_hora, estado, notas)
  values (p_oportunidad_id, p_staff_id, p_fecha_hora, 'programada', p_notas)
  returning id into v_visita_id;

  -- 6. Actualizar fase comercial de la oportunidad
  update public.tpl_oportunidades
  set estado = 'agendada', updated_at = now()
  where id = p_oportunidad_id;

  -- 7. Registrar evento
  insert into public.tpl_eventos(actor_id, proyecto_id, evento, categoria, origen, descripcion, metadata)
  values (v_oportunidad.actor_cliente_id, v_oportunidad.proyecto_id, 'oportunidad.visita_agendada', 'comercial', 'crm_staff', 'Visita a terreno agendada y registrada en calendario', jsonb_build_object('visita_id', v_visita_id, 'oportunidad_id', p_oportunidad_id, 'fecha_hora', p_fecha_hora));

  return jsonb_build_object('ok', true, 'visita_id', v_visita_id);
end $$;

revoke all on function public.tpl_crm_agendar_visita_v1(uuid, uuid, timestamptz, text) from public;
grant execute on function public.tpl_crm_agendar_visita_v1(uuid, uuid, timestamptz, text) to authenticated;


-- 4. RPC: ACTUALIZAR VISITA (CON CONTROL DE TRANSICIONES IRREVERSIBLES)
create or replace function public.tpl_crm_actualizar_visita_v1(
  p_visita_id uuid,
  p_estado text,
  p_resultado text default null,
  p_notas text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visita public.tpl_visitas;
  v_oportunidad public.tpl_oportunidades;
begin
  -- 1. Barrera de Seguridad Staff
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  -- 2. Whitelist de estados de visita
  if p_estado not in ('programada', 'confirmada', 'realizada', 'cancelada', 'no_asistio') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  -- 3. Lock y validación
  select * into v_visita from public.tpl_visitas where id = p_visita_id for update;
  if v_visita.id is null then
    raise exception 'VISITA_INEXISTENTE';
  end if;

  -- 4. Control de transiciones irreversibles (Terminales)
  if v_visita.estado in ('realizada', 'cancelada', 'no_asistio') and p_estado in ('programada', 'confirmada') then
    raise exception 'TRANSICION_TERMINAL_BLOQUEADA' using detail = 'No se puede reabrir una visita que ya ha sido realizada, cancelada o marcada como inasistencia';
  end if;

  -- 5. Actualizar visita
  update public.tpl_visitas
  set
    estado = p_estado,
    resultado = coalesce(p_resultado, resultado),
    notas = coalesce(p_notas, notas),
    updated_at = now()
  where id = p_visita_id;

  -- 6. Obtener datos de oportunidad para logs
  select * into v_oportunidad from public.tpl_oportunidades where id = v_visita.oportunidad_id;

  -- 7. Registrar auditoría
  insert into public.tpl_eventos(actor_id, proyecto_id, evento, categoria, origen, descripcion, metadata)
  values (v_oportunidad.actor_cliente_id, v_oportunidad.proyecto_id, 'oportunidad.visita_actualizada', 'comercial', 'crm_staff', 'Visita actualizada en CRM', jsonb_build_object('visita_id', p_visita_id, 'estado_anterior', v_visita.estado, 'estado_nuevo', p_estado, 'resultado', p_resultado));

  return jsonb_build_object('ok', true, 'visita_id', p_visita_id, 'estado_anterior', v_visita.estado, 'estado_nuevo', p_estado);
end $$;

revoke all on function public.tpl_crm_actualizar_visita_v1(uuid, text, text, text) from public;
grant execute on function public.tpl_crm_actualizar_visita_v1(uuid, text, text, text) to authenticated;
