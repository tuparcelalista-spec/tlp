-- Corrige la generación del token de comienzo de proyecto
--
-- PROBLEMA
--   tpl_registrar_oportunidad_publica_v1 fija search_path a 'public' (correcto
--   por seguridad: evita inyección por search_path). pgcrypto vive en el
--   esquema 'extensions', así que gen_random_bytes() no se resolvía y toda
--   creación de oportunidad fallaba con:
--     42883: function gen_random_bytes(integer) does not exist
--
-- SOLUCIÓN
--   Calificar la llamada como extensions.gen_random_bytes(). Se mantiene el
--   search_path acotado en lugar de ampliarlo.
--
-- TABLAS AFECTADAS
--   Ninguna. Solo cambia el cuerpo de la función.
--
-- REVERSIÓN
--   Reaplicar 20260901140000_tpl_comienzo_proyecto_v1.sql.

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

  -- pgcrypto está en el esquema 'extensions'; se califica porque el
  -- search_path de esta función queda acotado a 'public' a propósito.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

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
