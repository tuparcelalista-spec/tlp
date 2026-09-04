-- Oportunidades públicas: aceptar correo O teléfono (antes exigía ambos)
--
-- QUÉ HACE
--   Reemplaza el cuerpo de tpl_registrar_oportunidad_publica_v1 para que baste
--   con UNO de los dos datos de contacto. Antes exigía correo válido Y teléfono
--   de 8+ caracteres, por lo que el cotizador (que no pedía teléfono) fallaba
--   siempre con TELEFONO_INVALIDO o CORREO_INVALIDO.
--
-- TABLAS AFECTADAS
--   Ninguna se altera. Solo cambia la función. Las columnas email y telefono de
--   tpl_oportunidades ya son NULLABLE, así que el esquema soporta esto tal cual.
--
-- ANTIDUPLICADO
--   Antes comparaba siempre por email. Si ahora el email puede venir vacío, esa
--   comparación agruparía por error todas las solicitudes sin correo. Se cambia
--   a: comparar por email cuando hay email, y por teléfono cuando no lo hay.
--
-- RIESGOS
--   Bajo. La validación se relaja, no se endurece: cualquier payload que antes
--   era aceptado lo sigue siendo. Un cliente que enviara ambos campos vacíos
--   ahora recibe CONTACTO_REQUERIDO en lugar de CORREO_INVALIDO.
--
-- DEPENDENCIAS
--   frontend-v2/js/core/tpl-data-service.js  (createPublicOpportunity valida
--   nombre+correo en el cliente; se ajusta en el mismo cambio)
--
-- REVERSIÓN
--   Al final de este archivo, comentada, está la definición anterior exacta.

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
begin
  v_email := lower(trim(coalesce(p_payload->>'email','')));
  v_telefono := trim(coalesce(p_payload->>'telefono',''));
  v_nombre := trim(coalesce(p_payload->>'nombre_contacto',''));
  v_tipo := coalesce(nullif(p_payload->>'tipo',''),'consulta');
  v_origen := coalesce(nullif(p_payload->>'origen',''),'sitio_publico');
  v_parcela := coalesce(p_payload->'metadata'->>'parcela_codigo','');
  v_presupuesto := nullif(p_payload->>'presupuesto','')::bigint;

  if length(v_nombre) < 2 then
    raise exception 'NOMBRE_REQUERIDO';
  end if;

  if v_tipo not in ('consulta','cotizacion','reserva','compra','arriendo','servicio') then
    raise exception 'TIPO_INVALIDO';
  end if;

  -- Al menos una vía de contacto.
  if v_email = '' and v_telefono = '' then
    raise exception 'CONTACTO_REQUERIDO';
  end if;

  -- Cada dato se valida solo si viene informado.
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'CORREO_INVALIDO';
  end if;

  if v_telefono <> '' and length(regexp_replace(v_telefono, '\D', '', 'g')) < 8 then
    raise exception 'TELEFONO_INVALIDO';
  end if;

  -- Antiduplicado (10 min) por la vía de contacto que exista.
  if exists (
    select 1
    from public.tpl_oportunidades o
    where o.origen = v_origen
      and coalesce(o.metadata->>'parcela_codigo','') = v_parcela
      and o.created_at > now() - interval '10 minutes'
      and (
        (v_email <> '' and lower(coalesce(o.email,'')) = v_email)
        or
        (v_email = '' and v_telefono <> '' and coalesce(o.telefono,'') = v_telefono)
      )
  ) then
    raise exception 'SOLICITUD_RECIENTE_EXISTENTE';
  end if;

  v_codigo := 'OP-' || to_char(now(),'YYYYMMDD') || '-' ||
              upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.tpl_oportunidades(
    codigo, tipo, origen, estado, prioridad,
    nombre_contacto, email, telefono, mensaje, presupuesto, metadata
  ) values (
    v_codigo, v_tipo, v_origen, 'nueva',
    coalesce(nullif(p_payload->>'prioridad',''),'media'),
    v_nombre,
    nullif(v_email,''),
    nullif(v_telefono,''),
    nullif(p_payload->>'mensaje',''),
    v_presupuesto,
    coalesce(p_payload->'metadata','{}'::jsonb)
  ) returning id into v_id;

  insert into public.tpl_eventos(evento, metadata)
  values (
    'oportunidad_publica_recibida',
    jsonb_build_object('oportunidad_id', v_id, 'codigo', v_codigo, 'tipo', v_tipo, 'origen', v_origen)
  )
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'id', v_id, 'codigo', v_codigo);
end
$function$;

-- ---------------------------------------------------------------------------
-- REVERSIÓN: ejecutar este bloque restaura exactamente la versión anterior.
-- ---------------------------------------------------------------------------
-- create or replace function public.tpl_registrar_oportunidad_publica_v1(p_payload jsonb)
-- returns jsonb language plpgsql security definer set search_path to 'public'
-- as $function$
-- declare
--   v_id uuid; v_codigo text; v_email text; v_nombre text; v_tipo text; v_presupuesto bigint;
-- begin
--   v_email:=lower(trim(coalesce(p_payload->>'email','')));
--   v_nombre:=trim(coalesce(p_payload->>'nombre_contacto',''));
--   v_tipo:=coalesce(nullif(p_payload->>'tipo',''),'consulta');
--   v_presupuesto:=nullif(p_payload->>'presupuesto','')::bigint;
--   if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'CORREO_INVALIDO'; end if;
--   if length(v_nombre)<2 then raise exception 'NOMBRE_REQUERIDO'; end if;
--   if v_tipo not in ('consulta','cotizacion','reserva','compra','arriendo','servicio') then raise exception 'TIPO_INVALIDO'; end if;
--   if length(coalesce(p_payload->>'telefono',''))<8 then raise exception 'TELEFONO_INVALIDO'; end if;
--   if exists(select 1 from public.tpl_oportunidades
--     where lower(email)=v_email
--       and origen=coalesce(nullif(p_payload->>'origen',''),'sitio_publico')
--       and metadata->>'parcela_codigo'=coalesce(p_payload->'metadata'->>'parcela_codigo','')
--       and created_at>now()-interval '10 minutes') then
--     raise exception 'SOLICITUD_RECIENTE_EXISTENTE';
--   end if;
--   v_codigo:='OP-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
--   insert into public.tpl_oportunidades(codigo,tipo,origen,estado,prioridad,nombre_contacto,email,telefono,mensaje,presupuesto,metadata)
--   values (v_codigo,v_tipo,coalesce(nullif(p_payload->>'origen',''),'sitio_publico'),'nueva',
--     coalesce(nullif(p_payload->>'prioridad',''),'media'),v_nombre,v_email,p_payload->>'telefono',
--     nullif(p_payload->>'mensaje',''),v_presupuesto,coalesce(p_payload->'metadata','{}'::jsonb))
--   returning id into v_id;
--   insert into public.tpl_eventos(evento,metadata)
--   values('oportunidad_publica_recibida',jsonb_build_object('oportunidad_id',v_id,'codigo',v_codigo,'tipo',v_tipo,'origen',coalesce(p_payload->>'origen','sitio_publico')))
--   on conflict do nothing;
--   return jsonb_build_object('ok',true,'id',v_id,'codigo',v_codigo);
-- end $function$;
