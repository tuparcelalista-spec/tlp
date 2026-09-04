-- "Comienzo de proyecto": el cliente confirma desde el correo que quiere partir
--
-- QUÉ HACE
--   1. Agrega columnas a tpl_oportunidades para el flujo del cotizador:
--      token de confirmación, marca de tiempo y estado de atención.
--   2. Crea dos funciones SECURITY DEFINER:
--      - tpl_confirmar_comienzo_proyecto_v1(token): la usa la página pública a
--        la que llega el cliente desde el correo. Solo marca la oportunidad.
--      - tpl_marcar_comienzo_atendido_v1(id): la usa el staff desde el CRM.
--
-- TABLAS AFECTADAS
--   tpl_oportunidades: SOLO se agregan columnas nuevas (ADD COLUMN IF NOT
--   EXISTS). No se altera ni elimina nada existente.
--
-- SEGURIDAD
--   La confirmación va por token aleatorio de 32 bytes, no por id: el enlace
--   del correo no permite adivinar ni enumerar otras oportunidades. La función
--   no devuelve datos personales, solo si la confirmación tuvo éxito.
--
-- RIESGOS
--   Bajo. Las columnas son NULLABLE y ninguna lógica existente las lee.
--
-- REVERSIÓN
--   drop function if exists public.tpl_confirmar_comienzo_proyecto_v1(text);
--   drop function if exists public.tpl_marcar_comienzo_atendido_v1(uuid);
--   alter table public.tpl_oportunidades
--     drop column if exists comienzo_token,
--     drop column if exists comienzo_solicitado_at,
--     drop column if exists comienzo_atendido_at,
--     drop column if exists comienzo_atendido_por;

alter table public.tpl_oportunidades
  add column if not exists comienzo_token text,
  add column if not exists comienzo_solicitado_at timestamptz,
  add column if not exists comienzo_atendido_at timestamptz,
  add column if not exists comienzo_atendido_por uuid;

-- Un token no puede repetirse entre oportunidades.
create unique index if not exists tpl_oportunidades_comienzo_token_idx
  on public.tpl_oportunidades (comienzo_token)
  where comienzo_token is not null;

-- Para que el dashboard liste rápido lo pendiente de atender.
create index if not exists tpl_oportunidades_comienzo_pendiente_idx
  on public.tpl_oportunidades (comienzo_solicitado_at desc)
  where comienzo_solicitado_at is not null and comienzo_atendido_at is null;


-- Confirmación desde el correo. Pública, pero solo con el token correcto.
create or replace function public.tpl_confirmar_comienzo_proyecto_v1(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_nombre text;
  v_ya boolean;
begin
  if p_token is null or length(trim(p_token)) < 20 then
    raise exception 'TOKEN_INVALIDO';
  end if;

  select id, nombre_contacto, (comienzo_solicitado_at is not null)
    into v_id, v_nombre, v_ya
  from public.tpl_oportunidades
  where comienzo_token = trim(p_token)
  limit 1;

  if v_id is null then
    raise exception 'TOKEN_INVALIDO';
  end if;

  -- Idempotente: volver a pulsar el enlace no duplica la solicitud.
  if not v_ya then
    update public.tpl_oportunidades
       set comienzo_solicitado_at = now(),
           estado = case when estado = 'nueva' then 'en_contacto' else estado end,
           prioridad = 'alta'
     where id = v_id;

    insert into public.tpl_eventos(evento, metadata)
    values ('comienzo_proyecto_solicitado',
            jsonb_build_object('oportunidad_id', v_id))
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'nombre', v_nombre, 'ya_registrado', v_ya);
end
$function$;


-- El staff marca la notificación como atendida desde el CRM.
create or replace function public.tpl_marcar_comienzo_atendido_v1(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.tpl_es_staff() then
    raise exception 'NO_AUTORIZADO';
  end if;

  update public.tpl_oportunidades
     set comienzo_atendido_at = now(),
         comienzo_atendido_por = auth.uid()
   where id = p_id
     and comienzo_solicitado_at is not null;

  if not found then
    raise exception 'OPORTUNIDAD_NO_ENCONTRADA';
  end if;

  return jsonb_build_object('ok', true);
end
$function$;

revoke all on function public.tpl_marcar_comienzo_atendido_v1(uuid) from anon;


-- El registro de oportunidades públicas ahora emite el token de comienzo y lo
-- devuelve, para que la función de correo pueda construir el enlace sin volver
-- a consultar la tabla.
create or replace function public.tpl_registrar_oportunidad_publica_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_codigo text;
  v_email text;
  v_telefono text;
  v_nombre text;
  v_tipo text;
  v_origen text;
  v_parcela text;
  v_presupuesto bigint;
  v_token text;
begin
  v_email := lower(trim(coalesce(p_payload->>'email','')));
  v_telefono := trim(coalesce(p_payload->>'telefono',''));
  v_nombre := trim(coalesce(p_payload->>'nombre_contacto',''));
  v_tipo := coalesce(nullif(p_payload->>'tipo',''),'consulta');
  v_origen := coalesce(nullif(p_payload->>'origen',''),'sitio_publico');
  v_parcela := coalesce(p_payload->'metadata'->>'parcela_codigo','');
  v_presupuesto := nullif(p_payload->>'presupuesto','')::bigint;

  if length(v_nombre) < 2 then raise exception 'NOMBRE_REQUERIDO'; end if;

  if v_tipo not in ('consulta','cotizacion','reserva','compra','arriendo','servicio') then
    raise exception 'TIPO_INVALIDO';
  end if;

  if v_email = '' and v_telefono = '' then raise exception 'CONTACTO_REQUERIDO'; end if;

  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'CORREO_INVALIDO';
  end if;

  if v_telefono <> '' and length(regexp_replace(v_telefono, '\D', '', 'g')) < 8 then
    raise exception 'TELEFONO_INVALIDO';
  end if;

  if exists (
    select 1 from public.tpl_oportunidades o
    where o.origen = v_origen
      and coalesce(o.metadata->>'parcela_codigo','') = v_parcela
      and o.created_at > now() - interval '10 minutes'
      and ( (v_email <> '' and lower(coalesce(o.email,'')) = v_email)
            or (v_email = '' and v_telefono <> '' and coalesce(o.telefono,'') = v_telefono) )
  ) then
    raise exception 'SOLICITUD_RECIENTE_EXISTENTE';
  end if;

  v_codigo := 'OP-' || to_char(now(),'YYYYMMDD') || '-' ||
              upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  -- 32 bytes aleatorios en hexadecimal: no es adivinable ni enumerable.
  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.tpl_oportunidades(
    codigo, tipo, origen, estado, prioridad,
    nombre_contacto, email, telefono, mensaje, presupuesto, metadata, comienzo_token
  ) values (
    v_codigo, v_tipo, v_origen, 'nueva',
    coalesce(nullif(p_payload->>'prioridad',''),'media'),
    v_nombre, nullif(v_email,''), nullif(v_telefono,''),
    nullif(p_payload->>'mensaje',''), v_presupuesto,
    coalesce(p_payload->'metadata','{}'::jsonb), v_token
  ) returning id into v_id;

  insert into public.tpl_eventos(evento, metadata)
  values ('oportunidad_publica_recibida',
          jsonb_build_object('oportunidad_id', v_id, 'codigo', v_codigo, 'tipo', v_tipo, 'origen', v_origen))
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'id', v_id, 'codigo', v_codigo, 'comienzo_token', v_token);
end
$function$;
