-- TPL Security S2
-- Endurecimiento conservador de enlaces por token, RPC administrativas e inventario RLS.
-- No invalida tokens existentes ni cambia URLs públicas.

create extension if not exists pgcrypto with schema extensions;

-- Helper único: rechaza tokens vacíos, excesivos o con caracteres inesperados.
create or replace function public.tpl_token_hash_seguro_v1(p_token text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  v_token text := trim(coalesce(p_token, ''));
begin
  if length(v_token) < 32 or length(v_token) > 256 then
    return null;
  end if;

  if v_token !~ '^[A-Za-z0-9_-]+$' then
    return null;
  end if;

  return encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex');
end;
$$;

revoke all on function public.tpl_token_hash_seguro_v1(text) from public, anon, authenticated;

-- Resumen de propietario: salida mínima, error genérico y token validado.
create or replace function public.tpl_propietario_resumen_por_token_v1(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_link public.tpl_links_propietario;
  v_prop public.tpl_propiedades%rowtype;
  v_tas jsonb := '{}'::jsonb;
begin
  v_hash := public.tpl_token_hash_seguro_v1(p_token);
  if v_hash is null then
    return jsonb_build_object('ok', false, 'error', 'ENLACE_INVALIDO_O_VENCIDO');
  end if;

  select * into v_link
  from public.tpl_links_propietario
  where token_hash = v_hash
    and estado = 'activo'
    and expires_at > now()
  limit 1;

  if v_link.id is null then
    return jsonb_build_object('ok', false, 'error', 'ENLACE_INVALIDO_O_VENCIDO');
  end if;

  select * into v_prop
  from public.tpl_propiedades
  where id = v_link.propiedad_id;

  if v_prop.id is null then
    return jsonb_build_object('ok', false, 'error', 'ENLACE_INVALIDO_O_VENCIDO');
  end if;

  update public.tpl_links_propietario
  set last_used_at = now(),
      usos = least(usos + 1, 2147483647)
  where id = v_link.id;

  select jsonb_build_object(
    'valor_tpl_total', t.valor_tpl_total,
    'valor_tpl_m2', t.valor_tpl_m2,
    'clasificacion', t.clasificacion,
    'resultado', t.resultado,
    'created_at', t.created_at
  )
  into v_tas
  from public.tpl_tasaciones t
  where t.propiedad_id = v_prop.id
  order by t.created_at desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'expires_at', v_link.expires_at,
    'propiedad', jsonb_build_object(
      'id', v_prop.id,
      'codigo', v_prop.codigo,
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
      -- No se expone metadata completa: puede contener datos internos.
      'updated_at', v_prop.updated_at
    ),
    'tasacion', coalesce(v_tas, '{}'::jsonb)
  );
end;
$$;

-- Actualización: lista blanca, límites de tamaño y valores razonables.
create or replace function public.tpl_propietario_actualizar_por_token_v1(
  p_token text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_link public.tpl_links_propietario;
  v_old public.tpl_propiedades%rowtype;
  v_new public.tpl_propiedades%rowtype;
  v_clean jsonb;
  v_fields text[] := array[]::text[];
  v_fotos jsonb := '[]'::jsonb;
  v_contacto jsonb := '{}'::jsonb;
begin
  v_hash := public.tpl_token_hash_seguro_v1(p_token);
  if v_hash is null then
    return jsonb_build_object('ok', false, 'error', 'ENLACE_INVALIDO_O_VENCIDO');
  end if;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 100000 then
    return jsonb_build_object('ok', false, 'error', 'DATOS_INVALIDOS');
  end if;

  select * into v_link
  from public.tpl_links_propietario
  where token_hash = v_hash
    and estado = 'activo'
    and expires_at > now()
  for update;

  if v_link.id is null then
    return jsonb_build_object('ok', false, 'error', 'ENLACE_INVALIDO_O_VENCIDO');
  end if;

  select * into v_old
  from public.tpl_propiedades
  where id = v_link.propiedad_id
  for update;

  if v_old.id is null then
    return jsonb_build_object('ok', false, 'error', 'ENLACE_INVALIDO_O_VENCIDO');
  end if;

  if jsonb_typeof(p_payload->'fotos') = 'array' then
    -- Máximo 30 referencias de fotografías por actualización.
    select coalesce(jsonb_agg(value), '[]'::jsonb)
      into v_fotos
    from (
      select value
      from jsonb_array_elements(p_payload->'fotos')
      limit 30
    ) f;
  end if;

  if jsonb_typeof(p_payload->'contacto') = 'object' then
    v_contacto := jsonb_strip_nulls(jsonb_build_object(
      'nombre', left(nullif(trim(p_payload->'contacto'->>'nombre'), ''), 120),
      'telefono', left(nullif(trim(p_payload->'contacto'->>'telefono'), ''), 40),
      'correo', left(lower(nullif(trim(p_payload->'contacto'->>'correo'), '')), 254)
    ));
  end if;

  v_clean := jsonb_strip_nulls(jsonb_build_object(
    'titulo', left(nullif(trim(p_payload->>'titulo'), ''), 160),
    'descripcion', left(nullif(trim(p_payload->>'descripcion'), ''), 5000),
    'precio_publicado', case
      when (p_payload->>'precio_publicado') ~ '^\d{1,12}$'
       and (p_payload->>'precio_publicado')::numeric between 0 and 999999999999
      then (p_payload->>'precio_publicado')::bigint
      else null end,
    'superficie_m2', case
      when (p_payload->>'superficie_m2') ~ '^\d{1,9}([.]\d{1,2})?$'
       and (p_payload->>'superficie_m2')::numeric between 1 and 999999999
      then (p_payload->>'superficie_m2')::numeric
      else null end,
    'agua', left(nullif(trim(p_payload->>'agua'), ''), 120),
    'electricidad', left(nullif(trim(p_payload->>'electricidad'), ''), 120),
    'acceso', left(nullif(trim(p_payload->>'acceso'), ''), 160),
    'topografia', left(nullif(trim(p_payload->>'topografia'), ''), 120),
    'rol_situacion', left(nullif(trim(p_payload->>'rol_situacion'), ''), 160),
    'cierre_perimetral', left(nullif(trim(p_payload->>'cierre_perimetral'), ''), 120),
    'porton', left(nullif(trim(p_payload->>'porton'), ''), 120)
  ));

  select coalesce(array_agg(key order by key), '{}')
  into v_fields
  from jsonb_object_keys(v_clean) key;

  update public.tpl_propiedades
  set titulo = coalesce(v_clean->>'titulo', titulo),
      descripcion = coalesce(v_clean->>'descripcion', descripcion),
      precio_publicado = coalesce((v_clean->>'precio_publicado')::bigint, precio_publicado),
      superficie_m2 = coalesce((v_clean->>'superficie_m2')::numeric, superficie_m2),
      agua = coalesce(v_clean->>'agua', agua),
      electricidad = coalesce(v_clean->>'electricidad', electricidad),
      acceso = coalesce(v_clean->>'acceso', acceso),
      topografia = coalesce(v_clean->>'topografia', topografia),
      rol_situacion = coalesce(v_clean->>'rol_situacion', rol_situacion),
      cierre_perimetral = coalesce(v_clean->>'cierre_perimetral', cierre_perimetral),
      porton = coalesce(v_clean->>'porton', porton),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'propietario_contacto', v_contacto,
          'fotos_revision_pendiente', v_fotos,
          'ultima_actualizacion_propietario', now()
        ),
      updated_at = now()
  where id = v_link.propiedad_id
  returning * into v_new;

  insert into public.tpl_actualizaciones_propietario(
    propiedad_id,
    link_id,
    datos_anteriores,
    datos_nuevos,
    campos_modificados,
    fotos_pendientes
  ) values (
    v_new.id,
    v_link.id,
    to_jsonb(v_old) - 'metadata',
    v_clean,
    v_fields,
    v_fotos
  );

  update public.tpl_links_propietario
  set last_used_at = now(),
      usos = least(usos + 1, 2147483647)
  where id = v_link.id;

  return jsonb_build_object(
    'ok', true,
    'propiedad_id', v_new.id,
    'codigo', v_new.codigo,
    'campos_modificados', v_fields,
    'fotos_pendientes_revision', jsonb_array_length(v_fotos)
  );
end;
$$;

-- Aplicar permisos explícitos. SECURITY DEFINER no debe quedar ejecutable por PUBLIC.
revoke all on function public.tpl_propietario_resumen_por_token_v1(text) from public;
revoke all on function public.tpl_propietario_actualizar_por_token_v1(text, jsonb) from public;
grant execute on function public.tpl_propietario_resumen_por_token_v1(text) to anon, authenticated;
grant execute on function public.tpl_propietario_actualizar_por_token_v1(text, jsonb) to anon, authenticated;

revoke all on function public.tpl_crm_generar_link_propietario_v1(uuid, integer) from public, anon;
grant execute on function public.tpl_crm_generar_link_propietario_v1(uuid, integer) to authenticated;

-- Inventario de seguridad para el CRM/SQL Editor. Solo staff autenticado.
create or replace function public.tpl_auditoria_rls_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_sin_rls jsonb;
  v_sin_politicas jsonb;
  v_definer_publicas jsonb;
begin
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'NO_AUTORIZADO';
  end if;

  select coalesce(jsonb_agg(format('%I.%I', schemaname, tablename) order by tablename), '[]'::jsonb)
  into v_sin_rls
  from pg_catalog.pg_tables
  where schemaname = 'public'
    and rowsecurity = false;

  select coalesce(jsonb_agg(format('%I.%I', c.table_schema, c.table_name) order by c.table_name), '[]'::jsonb)
  into v_sin_politicas
  from information_schema.tables c
  where c.table_schema = 'public'
    and c.table_type = 'BASE TABLE'
    and exists (
      select 1 from pg_catalog.pg_class pc
      join pg_catalog.pg_namespace pn on pn.oid = pc.relnamespace
      where pn.nspname = c.table_schema
        and pc.relname = c.table_name
        and pc.relrowsecurity = true
    )
    and not exists (
      select 1 from pg_catalog.pg_policies p
      where p.schemaname = c.table_schema
        and p.tablename = c.table_name
    );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'funcion', n.nspname || '.' || p.proname,
      'argumentos', pg_get_function_identity_arguments(p.oid)
    ) order by p.proname
  ), '[]'::jsonb)
  into v_definer_publicas
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef = true
    and has_function_privilege('public', p.oid, 'EXECUTE');

  return jsonb_build_object(
    'ok', true,
    'tablas_sin_rls', v_sin_rls,
    'tablas_rls_sin_politicas', v_sin_politicas,
    'security_definer_ejecutables_por_public', v_definer_publicas,
    'generado_at', now()
  );
end;
$$;

revoke all on function public.tpl_auditoria_rls_v1() from public, anon;
grant execute on function public.tpl_auditoria_rls_v1() to authenticated;

comment on function public.tpl_auditoria_rls_v1()
is 'Inventario de tablas sin RLS, tablas con RLS sin políticas y funciones SECURITY DEFINER ejecutables por PUBLIC. Solo staff TPL.';
