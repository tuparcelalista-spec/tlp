-- TPL: la reserva pagada de una parcela ahora activa un proyecto real en el
-- CRM y dispara el matching automático de la Red Partner por zona.
--
-- CONTEXTO / QUÉ ESTABA ROTO
--   tpl_crear_orden_reserva_v1() (migración 20260903020000) crea la orden de
--   pago y bloquea la parcela, pero nunca crea una fila en tpl_proyectos. El
--   pago se confirma en flow-webhook, que hoy solo sabe manejar dos casos
--   (informe de tasación / plan de marketing) — para tipo_informe =
--   'reserva_parcela' caía en la rama de "plan de marketing pagado", lo cual
--   además de no crear nada, registraba un evento con la descripción
--   equivocada. Resultado: "los proyectos no existen para solo parcela" y no
--   había ningún mecanismo que buscara un partner por zona ni que avisara al
--   comprador cuando pasa a cliente.
--
-- QUÉ HACE ESTA MIGRACIÓN
--   1. Amplía el estado de tpl_proyectos con 3 etapas del flujo de venta de
--      parcela sola (reserva -> solicitud_info -> notaria_escritura ->
--      visita_escritura -> finalizado), sin tocar los estados existentes que
--      ya usan los proyectos de casa+parcela.
--   2. tpl_confirmar_reserva_pagada_v1(orden_id): se llama desde
--      flow-webhook cuando Flow confirma el pago de una reserva. Es
--      idempotente (reintentos del webhook no duplican nada). Crea/actualiza
--      el actor comprador, crea el proyecto (estado='reserva'), lo conecta a
--      tpl_proyecto_actores, busca el mejor partner publicado cuya cobertura
--      incluya la comuna o región de la parcela (ordenado por años de
--      experiencia y reputación), lo dejar "sugerido" en el proyecto y le
--      encola un aviso para que se prepare. También crea la oportunidad
--      comercial (estado='reservada', visible en azul en el pipeline) y una
--      tarea de seguimiento para el staff.
--   3. tpl_avanzar_etapa_proyecto_v1(proyecto_id, estado): botón "Avanzar
--      etapa" del CRM para mover un proyecto de parcela por la secuencia
--      reserva -> solicitud_info -> notaria_escritura -> visita_escritura ->
--      finalizado (o cancelado desde cualquier punto). Solo staff.
--   4. Trigger en tpl_oportunidades: cuando una oportunidad con partner
--      sugerido pasa a estado='vendida', ofrece automáticamente el servicio
--      del partner al comprador (correo al comprador con los datos del
--      partner, correo al partner avisando que el cliente está confirmado).
--      Es idempotente vía metadata->>'partner_ofrecido_at'.
--   5. crm_operaciones_activas ahora expone también el nombre del comprador
--      y el del partner sugerido, para que "Operaciones Activas" en el CRM
--      pueda mostrarlos sin otra consulta.
--
-- RIESGOS / DECISIONES
--   - tpl_partner_perfiles no tiene CREATE TABLE en el historial de
--     migraciones (fue creada fuera de control de versiones), así que el
--     matching de partners va envuelto en su propio bloque con EXCEPTION:
--     si esa tabla no tiene exactamente la forma esperada, la reserva de
--     todas formas se confirma y crea su proyecto/oportunidad — el matching
--     de partner queda en null y se puede asignar a mano desde el CRM.
--   - El patrón de creación de actor replica exactamente el usado en
--     tpl_crear_proyecto_desde_cotizador_v1 (columna "tipo", no
--     "tipo_actor") porque es el patrón más reciente ya probado en
--     producción para esta misma tabla.
--   - Los avisos se encolan en tpl_comunicaciones_cola (no en
--     tpl_comunicaciones_pendientes, que 202608040014_tpl_comunicaciones_
--     reales_v1 ya migró y dejó obsoleta) para que procesar-comunicaciones
--     los envíe de verdad, igual que el trigger de "interés en propiedad".
--
-- REVERSIÓN
--   drop trigger if exists trg_tpl_oportunidades_ofrecer_partner on public.tpl_oportunidades;
--   drop function if exists public.tpl_trg_ofrecer_partner_al_vender_v1();
--   drop function if exists public.tpl_avanzar_etapa_proyecto_v1(uuid,text);
--   drop function if exists public.tpl_confirmar_reserva_pagada_v1(uuid);
--   (el CHECK ampliado y la vista actualizada se pueden dejar: son
--   compatibles con todo lo anterior)

-- 1) Etapas del flujo de venta de parcela sola sobre tpl_proyectos.estado
do $$
declare v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.tpl_proyectos'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%estado%'
    and pg_get_constraintdef(oid) ilike '%aprobado%';
  if v_conname is not null then
    execute format('alter table public.tpl_proyectos drop constraint %I', v_conname);
  end if;
end $$;

alter table public.tpl_proyectos add constraint tpl_proyectos_estado_check check (estado in (
  'simulacion','guardado','interes','visita','negociacion','reserva',
  'solicitud_info','notaria_escritura','visita_escritura',
  'aprobado','contrato','esperando_pago','activo','en_ejecucion',
  'finalizado','cancelado'
));

comment on column public.tpl_proyectos.estado is
'Para proyectos de casa+parcela: simulacion..en_ejecucion. Para reserva de parcela sola: reserva -> solicitud_info -> notaria_escritura -> visita_escritura -> finalizado (ver tpl_avanzar_etapa_proyecto_v1).';


-- 2) Confirma el pago de una reserva: crea proyecto + oportunidad + matching de partner
create or replace function public.tpl_confirmar_reserva_pagada_v1(p_orden_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden public.tpl_ordenes_informe;
  v_propiedad public.tpl_propiedades;
  v_actor_id uuid;
  v_project uuid;
  v_oportunidad uuid;
  v_codigo_proyecto text;
  v_codigo_oportunidad text;
  v_nombre text;
  v_email text;
  v_telefono text;
  v_partner_actor_id uuid;
  v_partner_nombre text;
  v_partner_correo text;
  v_partner_anos int;
begin
  select * into v_orden from public.tpl_ordenes_informe
   where id = p_orden_id and tipo_informe = 'reserva_parcela'
   for update;

  if v_orden.id is null then
    return jsonb_build_object('ok', false, 'motivo', 'ORDEN_NO_ENCONTRADA');
  end if;
  if v_orden.estado <> 'pagado' then
    return jsonb_build_object('ok', false, 'motivo', 'ORDEN_NO_PAGADA');
  end if;

  -- Idempotente: si flow-webhook reintenta la confirmación, no duplica nada.
  if coalesce(v_orden.metadata->>'proyecto_id', '') <> '' then
    return jsonb_build_object(
      'ok', true, 'ya_procesada', true,
      'proyecto_id', (v_orden.metadata->>'proyecto_id')::uuid,
      'oportunidad_id', nullif(v_orden.metadata->>'oportunidad_id','')::uuid
    );
  end if;

  select * into v_propiedad from public.tpl_propiedades where id = v_orden.propiedad_id;
  if v_propiedad.id is null then
    return jsonb_build_object('ok', false, 'motivo', 'PROPIEDAD_NO_ENCONTRADA');
  end if;

  v_nombre := trim(coalesce(v_orden.contacto->>'nombre', ''));
  v_email := lower(trim(coalesce(v_orden.contacto->>'email', '')));
  v_telefono := trim(coalesce(v_orden.contacto->>'telefono', ''));

  -- Encuentra o crea el actor comprador (mismo patrón que
  -- tpl_crear_proyecto_desde_cotizador_v1: primero por correo, luego por
  -- teléfono normalizado).
  if v_email <> '' then
    select id into v_actor_id from public.tpl_actores where lower(email) = v_email limit 1;
  end if;
  if v_actor_id is null and v_telefono <> '' then
    select id into v_actor_id from public.tpl_actores
     where regexp_replace(coalesce(telefono,''),'[^0-9]','','g') = regexp_replace(v_telefono,'[^0-9]','','g')
     order by updated_at desc limit 1;
  end if;
  if v_actor_id is null then
    insert into public.tpl_actores(tipo, nombre, email, telefono, comuna, metadata)
    values('persona', nullif(v_nombre,''), nullif(v_email,''), nullif(v_telefono,''), v_propiedad.comuna,
      jsonb_build_object('origen','reserva_parcela'))
    returning id into v_actor_id;
  else
    update public.tpl_actores
       set nombre = coalesce(nullif(v_nombre,''), nombre),
           email = coalesce(nullif(v_email,''), email),
           telefono = coalesce(nullif(v_telefono,''), telefono),
           updated_at = now()
     where id = v_actor_id;
  end if;

  insert into public.tpl_actor_roles(actor_id, rol, estado, metadata)
  values(v_actor_id, 'comprador', 'activo', jsonb_build_object('origen','reserva_parcela'))
  on conflict (actor_id, rol) do update set estado = 'activo';

  -- Matching de partner por zona (comuna o región) y experiencia. Va en su
  -- propio bloque protegido: tpl_partner_perfiles no tiene CREATE TABLE
  -- versionado, así que si su forma real difiere de lo esperado, la reserva
  -- de todas formas se confirma y el partner se asigna manualmente después.
  begin
    select pp.actor_id, pp.nombre_comercial, pp.correo, coalesce(pp.anos_experiencia,0)
      into v_partner_actor_id, v_partner_nombre, v_partner_correo, v_partner_anos
      from public.tpl_partner_perfiles pp
     where pp.estado = 'publicado'
       and (
         (v_propiedad.comuna is not null and exists (
            select 1 from jsonb_array_elements_text(coalesce(pp.comunas_atendidas,'[]'::jsonb)) t(comuna)
            where lower(t.comuna) = lower(v_propiedad.comuna)
         ))
         or (v_propiedad.region is not null and pp.region is not null and lower(pp.region) = lower(v_propiedad.region))
       )
     order by coalesce(pp.anos_experiencia,0) desc, coalesce(pp.puntaje_reputacion,0) desc, coalesce(pp.puntaje_completitud,0) desc
     limit 1;
  exception when others then
    v_partner_actor_id := null; v_partner_nombre := null; v_partner_correo := null; v_partner_anos := null;
  end;

  -- Crea el proyecto: desde aquí la reserva entra a "Operaciones Activas" y a
  -- la máquina de etapas de tpl_proyectos.estado.
  v_codigo_proyecto := 'RES-' || to_char(now(),'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(5),'hex'),1,8));
  insert into public.tpl_proyectos(
    codigo, propiedad_id, comprador_actor_id, tipo, nombre, estado,
    valor_estimado, configuracion, metadata
  ) values (
    v_codigo_proyecto, v_propiedad.id, v_actor_id, 'comercial',
    left(coalesce(v_propiedad.titulo, 'Reserva ' || v_propiedad.codigo), 180),
    'reserva',
    v_propiedad.precio_publicado,
    jsonb_build_object('origen','reserva_parcela','orden_id',v_orden.id,'parcela_codigo',v_propiedad.codigo),
    jsonb_build_object('origen','reserva_parcela','orden_id',v_orden.id,
      'partner_sugerido_actor_id', v_partner_actor_id, 'partner_sugerido_nombre', v_partner_nombre)
  ) returning id into v_project;

  insert into public.tpl_proyecto_actores(proyecto_id, actor_id, rol_en_proyecto, estado_participacion, proxima_accion, metadata)
  values (v_project, v_actor_id, 'comprador', 'activo', 'Confirmar datos y avanzar a solicitud de información',
    jsonb_build_object('origen','reserva_parcela'))
  on conflict (proyecto_id, actor_id, rol_en_proyecto) do nothing;

  if v_partner_actor_id is not null then
    insert into public.tpl_proyecto_actores(proyecto_id, actor_id, rol_en_proyecto, estado_participacion, proxima_accion, metadata)
    values (v_project, v_partner_actor_id, 'partner_sugerido', 'pendiente', 'Prepararse: nueva reserva en su zona de cobertura',
      jsonb_build_object('origen','matching_automatico_reserva','anos_experiencia', v_partner_anos))
    on conflict (proyecto_id, actor_id, rol_en_proyecto) do nothing;

    if v_partner_correo is not null and v_partner_correo <> '' then
      insert into public.tpl_comunicaciones_cola(actor_id, canal, destinatario, plantilla, asunto, payload)
      values(v_partner_actor_id, 'email', v_partner_correo,
        'partner_nueva_reserva_zona',
        'Nueva reserva en tu zona — prepárate para ofrecer tu servicio',
        jsonb_build_object(
          'partner_nombre', v_partner_nombre, 'parcela', v_propiedad.titulo, 'comuna', v_propiedad.comuna,
          'codigo_proyecto', v_codigo_proyecto,
          'idempotency_key', 'partner-nueva-reserva-' || v_project::text
        ))
      on conflict do nothing;
    end if;
  end if;

  -- Oportunidad comercial: aparece en el pipeline en la columna "Reservadas" (azul).
  v_codigo_oportunidad := 'OP-' || substr(v_codigo_proyecto, 5);
  insert into public.tpl_oportunidades(
    codigo, actor_cliente_id, proyecto_id, tipo, origen, estado, prioridad,
    nombre_contacto, email, telefono, presupuesto, partner_actor_id,
    proxima_accion, proxima_accion_at, metadata
  ) values (
    v_codigo_oportunidad, v_actor_id, v_project, 'reserva', 'reserva_parcela', 'reservada', 'alta',
    nullif(v_nombre,''), nullif(v_email,''), nullif(v_telefono,''), v_propiedad.precio_publicado,
    v_partner_actor_id,
    'Solicitar información y coordinar notaría', now() + interval '1 day',
    jsonb_build_object('orden_id', v_orden.id, 'parcela_codigo', v_propiedad.codigo)
  ) returning id into v_oportunidad;

  insert into public.tpl_tareas(actor_id, propiedad_id, proyecto_id, titulo, detalle, tipo, prioridad, vence_at, metadata)
  values(v_actor_id, v_propiedad.id, v_project, 'Confirmar reserva pagada y activar siguiente etapa',
    'Reserva pagada el ' || to_char(now(),'DD/MM/YYYY') || '. Contactar para solicitar información y coordinar notaría.',
    'seguimiento_comercial', 'urgente', now() + interval '1 day',
    jsonb_build_object('orden_id', v_orden.id, 'oportunidad_id', v_oportunidad));

  insert into public.tpl_eventos(actor_id, propiedad_id, proyecto_id, evento, categoria, origen, prioridad, descripcion, metadata)
  values(v_actor_id, v_propiedad.id, v_project, 'reserva_parcela_confirmada_pagada', 'comercial', 'flow', 'alta',
    'Reserva de parcela pagada: proyecto y oportunidad creados automáticamente.',
    jsonb_build_object('orden_id', v_orden.id, 'oportunidad_id', v_oportunidad, 'partner_actor_id', v_partner_actor_id));

  update public.tpl_ordenes_informe
     set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('proyecto_id', v_project, 'oportunidad_id', v_oportunidad)
   where id = v_orden.id;

  return jsonb_build_object('ok', true, 'proyecto_id', v_project, 'oportunidad_id', v_oportunidad, 'partner_actor_id', v_partner_actor_id);
end;
$$;

revoke all on function public.tpl_confirmar_reserva_pagada_v1(uuid) from public, anon, authenticated;
grant execute on function public.tpl_confirmar_reserva_pagada_v1(uuid) to service_role;

comment on function public.tpl_confirmar_reserva_pagada_v1(uuid) is
'Se llama SOLO desde la Edge Function flow-webhook cuando Flow confirma el pago de una reserva de parcela (tpl_ordenes_informe.tipo_informe=reserva_parcela). Idempotente vía tpl_ordenes_informe.metadata->>proyecto_id.';


-- 3) Avanzar la etapa de un proyecto de parcela desde el CRM
create or replace function public.tpl_avanzar_etapa_proyecto_v1(p_proyecto_id uuid, p_estado text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actual text;
  v_permitidos text[];
begin
  if not public.tpl_es_staff() then
    raise exception 'NO_AUTORIZADO';
  end if;

  select estado into v_actual from public.tpl_proyectos where id = p_proyecto_id for update;
  if v_actual is null then
    raise exception 'PROYECTO_NO_ENCONTRADO';
  end if;

  v_permitidos := case v_actual
    when 'reserva' then array['solicitud_info','cancelado']
    when 'solicitud_info' then array['notaria_escritura','cancelado']
    when 'notaria_escritura' then array['visita_escritura','cancelado']
    when 'visita_escritura' then array['finalizado','cancelado']
    else array[]::text[]
  end;

  if p_estado <> v_actual and not (p_estado = any(v_permitidos)) then
    raise exception 'TRANSICION_NO_PERMITIDA';
  end if;

  update public.tpl_proyectos
     set estado = p_estado,
         estado_operativo = case
           when p_estado = 'finalizado' then 'finalizado'
           when p_estado = 'cancelado' then 'descartado'
           else estado_operativo
         end,
         ultimo_movimiento_at = now(),
         updated_at = now()
   where id = p_proyecto_id;

  insert into public.tpl_eventos(proyecto_id, evento, categoria, origen, prioridad, descripcion, metadata)
  values(p_proyecto_id, 'proyecto.etapa_avanzada', 'comercial', 'crm', 'media', 'Etapa del proyecto actualizada desde el CRM.',
    jsonb_build_object('de', v_actual, 'a', p_estado));

  return jsonb_build_object('ok', true, 'estado', p_estado);
end;
$$;

revoke all on function public.tpl_avanzar_etapa_proyecto_v1(uuid,text) from public, anon;
grant execute on function public.tpl_avanzar_etapa_proyecto_v1(uuid,text) to authenticated;


-- 4) Al pasar a "vendida", ofrece automáticamente el partner sugerido al comprador
create or replace function public.tpl_trg_ofrecer_partner_al_vender_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_actor public.tpl_actores;
  v_partner_correo text;
  v_partner_whatsapp text;
  v_partner_nombre text;
begin
  if new.estado = 'vendida'
     and old.estado is distinct from 'vendida'
     and new.partner_actor_id is not null
     and coalesce(new.metadata->>'partner_ofrecido_at','') = '' then

    select * into v_partner_actor from public.tpl_actores where id = new.partner_actor_id;

    begin
      select pp.nombre_comercial, pp.correo, pp.whatsapp
        into v_partner_nombre, v_partner_correo, v_partner_whatsapp
        from public.tpl_partner_perfiles pp
       where pp.actor_id = new.partner_actor_id;
    exception when others then
      v_partner_nombre := null; v_partner_correo := null; v_partner_whatsapp := null;
    end;

    v_partner_nombre := coalesce(v_partner_nombre, v_partner_actor.nombre);
    v_partner_correo := coalesce(v_partner_correo, v_partner_actor.email);

    if new.email is not null and new.email <> '' then
      insert into public.tpl_comunicaciones_cola(actor_id, canal, destinatario, plantilla, asunto, payload)
      values(new.actor_cliente_id, 'email', new.email,
        'oferta_partner_cliente',
        'Un profesional de confianza puede ayudarte con tu escritura',
        jsonb_build_object(
          'cliente_nombre', new.nombre_contacto, 'partner_nombre', v_partner_nombre, 'partner_whatsapp', v_partner_whatsapp,
          'idempotency_key', 'oferta-partner-cliente-' || new.id::text
        ))
      on conflict do nothing;
    end if;

    if v_partner_correo is not null and v_partner_correo <> '' then
      insert into public.tpl_comunicaciones_cola(actor_id, canal, destinatario, plantilla, asunto, payload)
      values(new.partner_actor_id, 'email', v_partner_correo,
        'partner_cliente_confirmado',
        'Cliente confirmado: puedes contactarlo',
        jsonb_build_object(
          'partner_nombre', v_partner_nombre, 'cliente_nombre', new.nombre_contacto, 'cliente_telefono', new.telefono,
          'idempotency_key', 'partner-cliente-confirmado-' || new.id::text
        ))
      on conflict do nothing;
    end if;

    new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object('partner_ofrecido_at', now());

    insert into public.tpl_eventos(proyecto_id, evento, categoria, origen, prioridad, descripcion, metadata)
    values(new.proyecto_id, 'partner_ofrecido_a_cliente', 'comercial', 'automatico', 'alta',
      'Servicio de partner ofrecido automáticamente al confirmarse la venta.',
      jsonb_build_object('oportunidad_id', new.id, 'partner_actor_id', new.partner_actor_id));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tpl_oportunidades_ofrecer_partner on public.tpl_oportunidades;
create trigger trg_tpl_oportunidades_ofrecer_partner
  before update on public.tpl_oportunidades
  for each row
  execute function public.tpl_trg_ofrecer_partner_al_vender_v1();


-- 5) "Operaciones Activas" también expone comprador y partner sugerido
--
-- OJO: no se puede usar "create or replace view" aquí. tpl_proyectos ganó
-- columnas nuevas después de que esta vista se creó por primera vez (p.ej.
-- analisis_territorial_actual_id, migración 202608020008), así que "pr.*"
-- hoy expande a más/otras columnas en otro orden que las que la vista tiene
-- guardadas — Postgres rechaza eso con 42P16 ("cannot change name of view
-- column") porque CREATE OR REPLACE VIEW solo permite agregar columnas al
-- FINAL, nunca reordenar/renombrar las de en medio. Se dropean y recrean
-- ambas vistas completas en su lugar (no tienen RLS propia ni son referidas
-- por FK — es seguro).
drop view if exists public.crm_operaciones_revision;
drop view if exists public.crm_operaciones_activas;

create view public.crm_operaciones_activas as
select
  pr.*,
  prop.codigo as propiedad_codigo,
  prop.titulo as propiedad_titulo,
  prop.comuna,
  comprador.nombre as comprador_nombre,
  comprador.telefono as comprador_telefono,
  partner_sugerido.nombre as partner_sugerido_nombre
from public.tpl_proyectos pr
left join public.tpl_propiedades prop on prop.id = pr.propiedad_id
left join public.tpl_actores comprador on comprador.id = pr.comprador_actor_id
left join lateral (
  select a.nombre
  from public.tpl_proyecto_actores pa
  join public.tpl_actores a on a.id = pa.actor_id
  where pa.proyecto_id = pr.id and pa.rol_en_proyecto = 'partner_sugerido'
  limit 1
) partner_sugerido on true
where pr.estado_operativo not in ('finalizado','cerrado','descartado');

create view public.crm_operaciones_revision as
select *
from public.crm_operaciones_activas
where requiere_revision = true or estado_operativo = 'requiere_revision';

-- 202607300002_tpl_security_rpc_v1 bloqueó estas dos vistas explícitamente
-- (solo se leen a través de funciones security definer). DROP VIEW no
-- conserva privilegios: si el proyecto tiene default privileges que dan
-- SELECT a anon/authenticated sobre objetos nuevos del schema public (patrón
-- común en Supabase), la vista recreada quedaría abierta de nuevo si no se
-- repite el revoke aquí.
revoke all on public.crm_operaciones_activas from anon, authenticated;
revoke all on public.crm_operaciones_revision from anon, authenticated;
