-- Publicar dejaba de funcionar con:
--   duplicate key value violates unique constraint "tpl_actores_email_unique"
--
-- CAUSA RAÍZ (verificada contra los datos reales del proyecto)
--   tpl_publicar_propiedad_v3_core buscaba el actor por RUT o por correo y
--   priorizaba el match de RUT. Después hacía, sin condiciones:
--       update tpl_actores set email = <correo del formulario> where id = <actor del RUT>
--   Si ese correo ya pertenecía a OTRO actor, el update choca contra el
--   índice único tpl_actores_email_unique y TODA la publicación se pierde.
--
--   Caso real en producción: el RUT 15780902-4 pertenece al actor
--   "Juan Fernández" (juanfraferbol@gmail.com) y el correo
--   tuparcelalista@gmail.com pertenece al actor "Prueba Correo" (sin RUT).
--   Al publicar con ese RUT y ese correo, el motor tomaba a Juan e intentaba
--   robarle el correo al otro actor.
--
--   No es una condición de carrera: ocurre siempre que el RUT y el correo
--   ingresados ya están repartidos entre dos actores distintos. El mismo
--   problema existe en espejo con tpl_actores_rut_unique.
--
-- QUÉ CAMBIA
--   1) El correo y el RUT solo se escriben sobre el actor si están libres o
--      ya son de ese mismo actor. Si pertenecen a otra persona, se conservan
--      los datos existentes y se deja registro en tpl_eventos
--      ('publicacion.conflicto_identidad_actor') para que el CRM lo concilie
--      a mano. La publicación se guarda igual.
--   2) El bloque completo queda protegido con un manejador de unique_violation
--      por si dos publicaciones simultáneas crean el mismo actor a la vez.
--   3) El core devuelve 'contacto_email' para que el correo de confirmación
--      llegue al correo que la persona escribió en el formulario, aunque ese
--      correo no se haya podido guardar en la ficha del actor.
--
-- TABLAS AFECTADAS
--   Ninguna estructura cambia. Solo cuerpos de función.
--
-- REVERSIÓN
--   Reaplicar tpl_publicar_propiedad_v3 de 202607300002_tpl_security_rpc_v1.sql
--   bajo el nombre _core, y la versión de encolar_correo de 20260901160000.

create or replace function public.tpl_publicar_propiedad_v3_core(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb);
  v_contacto jsonb := coalesce(v_payload->'contacto','{}'::jsonb);
  v_terreno jsonb := coalesce(v_payload->'terreno','{}'::jsonb);
  v_casa jsonb := coalesce(v_payload->'casa','{}'::jsonb);
  v_diag jsonb := coalesce(v_payload->'diagnostico','{}'::jsonb);
  v_val jsonb := coalesce(v_payload->'valuation','{}'::jsonb);
  v_coords jsonb := coalesce(v_payload->'coords','{}'::jsonb);

  v_actor_id uuid;
  v_actor_por_rut uuid;
  v_actor_por_email uuid;
  v_email_aplicable text;
  v_rut_aplicable text;
  v_conflicto jsonb := '{}'::jsonb;
  v_publicacion_id uuid;
  v_propiedad_id uuid;
  v_servicio_id uuid;

  v_tipo text;
  v_rol_actor text;
  v_email text;
  v_rut text;
  v_nombre text;
  v_tel text;
  v_region text;
  v_comuna text;
  v_superficie numeric;
  v_precio bigint;
  v_lat numeric;
  v_lng numeric;
  v_codigo_publicacion text;
  v_codigo_propiedad text;
  v_need jsonb;
  v_need_text text;
  v_service_code text;
  v_created_needs integer := 0;

  v_tpl_total bigint;
  v_tpl_m2 bigint;
  v_ref_m2 bigint;
  v_pub_m2 bigint;
  v_diff_tpl numeric;
  v_diff_comunal numeric;
  v_class text;
  v_is_opp boolean := false;
begin
  -- Límite defensivo del payload para evitar abuso accidental.
  if octet_length(v_payload::text) > 250000 then
    raise exception 'La publicación supera el tamaño permitido';
  end if;

  v_tipo := lower(coalesce(nullif(trim(v_payload->>'tipo'),''),'parcela'));
  if v_tipo = 'casa' then v_tipo := 'casa_con_terreno'; end if;
  -- El publicador V2 envía 'parcela_casa'; el catálogo lo guarda como
  -- 'casa_con_terreno'. Sin este mapeo, publicar una parcela con casa fallaba
  -- con "Tipo de propiedad inválido".
  if v_tipo in ('parcela_casa','parcela_con_casa','casa_terreno') then
    v_tipo := 'casa_con_terreno';
  end if;
  if v_tipo not in ('parcela','campo','casa_con_terreno') then
    raise exception 'Tipo de propiedad inválido';
  end if;

  v_nombre := nullif(left(trim(coalesce(v_contacto->>'nombre','')),160),'');
  v_email := nullif(lower(left(trim(coalesce(v_contacto->>'email','')),250)),'');
  v_rut := nullif(left(trim(coalesce(v_contacto->>'rut','')),30),'');
  v_tel := nullif(left(trim(coalesce(v_contacto->>'telefono','')),40),'');
  v_region := nullif(left(trim(coalesce(v_payload->>'region','')),120),'');
  v_comuna := nullif(left(trim(coalesce(v_payload->>'comuna','')),120),'');
  v_superficie := public.tpl_num(v_payload,'superficie');
  v_precio := greatest(0,coalesce(public.tpl_num(v_payload,'precio'),0))::bigint;

  if v_nombre is null then raise exception 'Falta el nombre de quien publica'; end if;
  if v_email is null and v_tel is null then raise exception 'Falta un medio de contacto'; end if;
  if v_region is null or v_comuna is null then raise exception 'Falta región o comuna'; end if;
  if v_superficie is null or v_superficie <= 0 or v_superficie > 100000000 then
    raise exception 'Superficie inválida';
  end if;

  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo electrónico inválido';
  end if;

  v_lat := public.tpl_num(v_coords,'lat');
  v_lng := public.tpl_num(v_coords,'lng');
  if v_lat is not null and (v_lat < -90 or v_lat > 90) then raise exception 'Latitud inválida'; end if;
  if v_lng is not null and (v_lng < -180 or v_lng > 180) then raise exception 'Longitud inválida'; end if;

  -- Evita duplicados por doble clic/race del mismo contacto.
  perform pg_advisory_xact_lock(
    hashtext(coalesce(v_rut, v_email, v_tel, v_nombre))
  );

  if v_rut is not null then
    select a.id into v_actor_por_rut
    from public.tpl_actores a
    where a.rut = v_rut
    order by a.created_at asc
    limit 1;
  end if;

  if v_email is not null then
    select a.id into v_actor_por_email
    from public.tpl_actores a
    where lower(a.email) = v_email
    order by a.created_at asc
    limit 1;
  end if;

  -- El RUT manda: es el identificador que el CRM usa para no duplicar personas.
  v_actor_id := coalesce(v_actor_por_rut, v_actor_por_email);

  -- Un dato solo se escribe si está libre o si ya es de este mismo actor.
  -- Escribirlo cuando pertenece a otra persona es lo que reventaba la
  -- publicación contra tpl_actores_email_unique / tpl_actores_rut_unique.
  v_email_aplicable := case
    when v_email is null then null
    when v_actor_por_email is null then v_email
    when v_actor_por_email = v_actor_id then v_email
    else null
  end;

  v_rut_aplicable := case
    when v_rut is null then null
    when v_actor_por_rut is null then v_rut
    when v_actor_por_rut = v_actor_id then v_rut
    else null
  end;

  if (v_email is not null and v_email_aplicable is null)
     or (v_rut is not null and v_rut_aplicable is null) then
    v_conflicto := jsonb_build_object(
      'email_ingresado', v_email,
      'rut_ingresado', v_rut,
      'actor_dueno_email', v_actor_por_email,
      'actor_dueno_rut', v_actor_por_rut
    );
  end if;

  begin
    if v_actor_id is null then
      insert into public.tpl_actores(
        tipo_actor,nombre,rut,email,telefono,region,comuna,origen,metadata
      )
      values(
        'persona',v_nombre,v_rut_aplicable,v_email_aplicable,v_tel,v_region,v_comuna,'publicador',
        jsonb_build_object('responsable',coalesce(v_contacto->>'responsable','propietario'))
      )
      returning id into v_actor_id;
    else
      update public.tpl_actores
         set nombre=coalesce(v_nombre,nombre),
             telefono=coalesce(v_tel,telefono),
             email=coalesce(v_email_aplicable,email),
             rut=coalesce(v_rut_aplicable,rut),
             region=coalesce(v_region,region),
             comuna=coalesce(v_comuna,comuna),
             updated_at=now()
       where id=v_actor_id;
    end if;
  exception when unique_violation then
    -- Red de seguridad ante dos publicaciones simultáneas del mismo contacto:
    -- se recupera el actor que ya quedó grabado y no se toca ningún
    -- identificador. La publicación nunca se pierde por esto.
    select a.id into v_actor_id
    from public.tpl_actores a
    where (v_email is not null and lower(a.email) = v_email)
       or (v_rut is not null and a.rut = v_rut)
    order by a.created_at asc
    limit 1;

    if v_actor_id is null then
      insert into public.tpl_actores(tipo_actor,nombre,telefono,region,comuna,origen,metadata)
      values(
        'persona',v_nombre,v_tel,v_region,v_comuna,'publicador',
        jsonb_build_object('responsable',coalesce(v_contacto->>'responsable','propietario'))
      )
      returning id into v_actor_id;
    end if;

    v_conflicto := v_conflicto || jsonb_build_object('reintento_por_carrera', true);
  end;

  if v_conflicto <> '{}'::jsonb then
    insert into public.tpl_eventos(actor_id, evento, categoria, origen, prioridad, descripcion, metadata)
    values(
      v_actor_id, 'publicacion.conflicto_identidad_actor', 'publicacion', 'publicador', 'alta',
      'El correo o el RUT ingresados ya pertenecían a otra ficha. Se conservó la ficha existente y el dato en conflicto no se sobrescribió.',
      v_conflicto
    );
  end if;

  v_rol_actor := case
    when lower(coalesce(v_contacto->>'responsable','')) like '%corredor%' then 'corredor'
    else 'propietario'
  end;

  insert into public.tpl_actor_roles(actor_id,rol,metadata)
  values(v_actor_id,v_rol_actor,jsonb_build_object('origen','publicador'))
  on conflict(actor_id,rol) do nothing;

  v_codigo_publicacion :=
    'PUB-' || to_char(current_date,'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.tpl_publicaciones(
    codigo,publicador_actor_id,responsable_actor_id,tipo,estado,origen,
    datos,diagnostico,tasacion_preliminar,enviada_at
  )
  values(
    v_codigo_publicacion,v_actor_id,v_actor_id,v_tipo,'pendiente_revision','publicador',
    v_payload,v_diag,v_val,now()
  )
  returning id into v_publicacion_id;

  v_codigo_propiedad :=
    'TPL-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  insert into public.tpl_propiedades(
    codigo,publicacion_id,
    propietario_actor_id,corredor_actor_id,
    tipo,estado,titulo,descripcion,
    region,comuna,sector,direccion_referencia,
    lat,lng,superficie_m2,precio_publicado,
    rol_situacion,electricidad,agua,acceso,topografia,suelo,
    exposicion,vista_principal,vegetacion,cierre_perimetral,porton,
    condominio,distancia_ruta_principal_km,
    atributos_naturales,casa_datos,diagnostico,metadata
  )
  values(
    v_codigo_propiedad,v_publicacion_id,
    case when v_rol_actor='propietario' then v_actor_id else null end,
    case when v_rol_actor='corredor' then v_actor_id else null end,
    v_tipo,'revision',
    nullif(left(trim(coalesce(v_payload->>'titulo','')),180),''),
    nullif(left(trim(coalesce(v_payload->>'descripcion','')),8000),''),
    v_region,v_comuna,
    nullif(left(trim(coalesce(v_payload->>'localidad','')),180),''),
    nullif(left(trim(coalesce(v_payload->>'ubicacionTexto','')),500),''),
    v_lat,v_lng,v_superficie,v_precio,
    nullif(left(trim(coalesce(v_terreno->>'rol','')),120),''),
    nullif(left(trim(coalesce(v_terreno->>'luz','')),120),''),
    nullif(left(trim(coalesce(v_terreno->>'agua','')),120),''),
    nullif(left(trim(coalesce(v_terreno->>'acceso',v_payload->>'acceso','')),180),''),
    nullif(left(trim(coalesce(v_terreno->>'topografia','')),120),''),
    nullif(left(trim(coalesce(v_payload->>'suelo',v_terreno->>'condicionSuelo','')),120),''),
    nullif(left(trim(coalesce(v_terreno->>'orientacion','')),120),''),
    nullif(left(trim(coalesce(v_terreno->>'vistaPrincipal','')),180),''),
    nullif(left(trim(coalesce(v_terreno->>'vegetacion','')),180),''),
    nullif(left(trim(coalesce(v_terreno->>'cierre','')),120),''),
    nullif(left(trim(coalesce(v_terreno->>'porton','')),120),''),
    case lower(trim(coalesce(v_terreno->>'condominio','')))
      when 'sí' then true when 'si' then true when 'true' then true
      when 'no' then false when 'false' then false else null end,
    public.tpl_num(v_terreno,'distanciaRutaPrincipalKm'),
    coalesce(v_payload->'atributosNaturales','[]'::jsonb),
    case when v_tipo='casa_con_terreno' then v_casa else '{}'::jsonb end,
    v_diag,
    jsonb_build_object(
      'publicApproximate',coalesce((v_payload->>'publicApproximate')::boolean,true),
      'googleMapsLink',v_payload->>'googleMapsLink',
      'videoUrl',v_payload->>'videoUrl',
      'photoNames',coalesce(v_payload->'photoNames','[]'::jsonb),
      'estrategia',coalesce(v_payload->'estrategia','{}'::jsonb),
      'contacto_email',v_email,
      'origen','publicador'
    )
  )
  returning id into v_propiedad_id;

  -- Necesidades declaradas en el diagnóstico.
  if jsonb_typeof(v_diag->'necesidades')='array' then
    for v_need in select value from jsonb_array_elements(v_diag->'necesidades')
    loop
      v_need_text := coalesce(v_need->>'tipo',v_need->>'descripcion','');
      v_service_code := public.tpl_servicio_codigo_desde_texto(v_need_text);
      if v_service_code is not null then
        select id into v_servicio_id
        from public.tpl_servicios
        where codigo=v_service_code and activo=true;

        if v_servicio_id is not null and not exists(
          select 1 from public.tpl_necesidades_proyecto
          where propiedad_id=v_propiedad_id and servicio_id=v_servicio_id
            and estado not in ('completada','descartada')
        ) then
          insert into public.tpl_necesidades_proyecto(
            propiedad_id,servicio_id,origen,prioridad,estado,detalle,evidencia,metadata
          )
          values(
            v_propiedad_id,v_servicio_id,'cliente','media','detectada',
            nullif(left(coalesce(v_need->>'descripcion',v_need_text),500),''),
            jsonb_build_object('declarada',true),
            jsonb_build_object('origen_publicacion',v_publicacion_id,'entrada',v_need)
          );
          v_created_needs := v_created_needs + 1;
        end if;
      end if;
    end loop;
  end if;

  -- Inferencias mínimas y transparentes según campos objetivos.
  for v_service_code in
    select x.code
    from (values
      ('cerco_perimetral',
        lower(coalesce(v_terreno->>'cierre','')) like '%sin cierre%'),
      ('porton_acceso',
        lower(coalesce(v_terreno->>'porton','')) like '%sin port%'),
      ('solucion_agua',
        lower(coalesce(v_terreno->>'agua','')) like '%sin factibilidad%'),
      ('instalacion_electrica',
        lower(coalesce(v_terreno->>'luz','')) like '%sin electricidad%'),
      ('mejora_camino',
        lower(coalesce(v_terreno->>'acceso',v_payload->>'acceso','')) like '%por mejorar%')
    ) as x(code,needed)
    where x.needed
  loop
    select id into v_servicio_id
    from public.tpl_servicios
    where codigo=v_service_code and activo=true;

    if v_servicio_id is not null and not exists(
      select 1 from public.tpl_necesidades_proyecto
      where propiedad_id=v_propiedad_id and servicio_id=v_servicio_id
        and estado not in ('completada','descartada')
    ) then
      insert into public.tpl_necesidades_proyecto(
        propiedad_id,servicio_id,origen,prioridad,estado,detalle,evidencia,metadata
      )
      values(
        v_propiedad_id,v_servicio_id,'motor_tpl','media','detectada',
        'Necesidad sugerida automáticamente a partir de los antecedentes declarados.',
        jsonb_build_object('inferida',true),
        jsonb_build_object('origen_publicacion',v_publicacion_id)
      );
      v_created_needs := v_created_needs + 1;
    end if;
  end loop;

  -- Tasación histórica, si el usuario alcanzó a calcularla.
  v_tpl_total := nullif(coalesce(
    public.tpl_num(v_val,'technical'),
    public.tpl_num(v_val,'market')
  ),0)::bigint;

  v_ref_m2 := nullif(coalesce(
    public.tpl_num(coalesce(v_val->'marketReference','{}'::jsonb),'medianM2'),
    public.tpl_num(coalesce(v_val->'marketReference','{}'::jsonb),'median_m2')
  ),0)::bigint;

  if v_precio > 0 and v_superficie > 0 then
    v_pub_m2 := round(v_precio::numeric/v_superficie)::bigint;
  end if;
  if v_tpl_total is not null and v_superficie > 0 then
    v_tpl_m2 := round(v_tpl_total::numeric/v_superficie)::bigint;
  end if;

  if v_tpl_total is not null and v_tpl_total > 0 and v_precio > 0 then
    v_diff_tpl := round(((v_precio-v_tpl_total)::numeric/v_tpl_total)*100,2);
  end if;
  if v_ref_m2 is not null and v_ref_m2 > 0 and v_pub_m2 is not null then
    v_diff_comunal := round(((v_pub_m2-v_ref_m2)::numeric/v_ref_m2)*100,2);
  end if;

  v_class := nullif(left(coalesce(
    v_val#>>'{priceAnalysis,classification}',
    v_val->>'classification',
    ''
  ),160),'');

  v_is_opp := coalesce(
    lower(v_class) like '%oportun%',
    false
  ) or (v_diff_tpl is not null and v_diff_tpl <= -10);

  if v_tpl_total is not null or v_ref_m2 is not null then
    insert into public.tpl_tasaciones(
      propiedad_id,actor_id,tipo,
      superficie_m2,precio_publicado,precio_publicado_m2,
      valor_tpl_total,valor_tpl_m2,referencia_comunal_m2,
      diferencia_publicado_vs_tpl_pct,diferencia_publicado_vs_comunal_pct,
      clasificacion,es_oportunidad,factores,entrada,resultado,version_motor
    )
    values(
      v_propiedad_id,v_actor_id,'precisa',
      v_superficie,v_precio,v_pub_m2,
      v_tpl_total,v_tpl_m2,v_ref_m2,
      v_diff_tpl,v_diff_comunal,
      v_class,v_is_opp,
      coalesce(v_val->'breakdown','[]'::jsonb),
      jsonb_build_object(
        'territorialIndex',v_val->'territorialIndex',
        'propertyIndex',v_val->'propertyIndex',
        'territory',v_val->'territory'
      ),
      v_val,
      nullif(left(coalesce(v_val->>'engineVersion',v_val->>'method','tpl-land-engine-v1.0'),80),'')
    );

    update public.tpl_propiedades
       set oportunidad_tpl=v_is_opp
     where id=v_propiedad_id;
  end if;

  insert into public.tpl_eventos(
    actor_id,propiedad_id,evento,categoria,origen,pagina,prioridad,descripcion,metadata
  )
  values(
    v_actor_id,v_propiedad_id,'propiedad.publicada','publicacion','publicador',
    '/plataforma/publicar/','media',
    'Nueva propiedad recibida y enviada a revisión TPL.',
    jsonb_build_object(
      'publicacion_id',v_publicacion_id,
      'codigo_publicacion',v_codigo_publicacion,
      'necesidades_detectadas',v_created_needs
    )
  );

  return jsonb_build_object(
    'ok',true,
    'source','supabase',
    'actor_id',v_actor_id,
    'publicacion_id',v_publicacion_id,
    'propiedad_id',v_propiedad_id,
    'codigo',v_codigo_publicacion,
    'codigo_propiedad',v_codigo_propiedad,
    'estado','pendiente_revision',
    'necesidades_detectadas',v_created_needs,
    'contacto_email',v_email
  );
end;
$$;

grant execute on function public.tpl_publicar_propiedad_v3_core(jsonb) to anon, authenticated;


-- El correo de confirmación debe llegar al correo que la persona escribió,
-- no al de la ficha del actor: cuando hay conflicto de identidad son distintos.
create or replace function public.tpl_publicar_propiedad_encolar_correo_v1(
  p_actor_id uuid,
  p_propiedad_id uuid,
  p_codigo text,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
  v_nombre text;
  v_p record;
begin
  select a.email, a.nombre into v_email, v_nombre
  from public.tpl_actores a where a.id = p_actor_id;

  v_email := coalesce(nullif(btrim(coalesce(p_email,'')),''), v_email);
  if v_email is null or v_email = '' then return; end if;

  select titulo, comuna, superficie_m2, precio_publicado
    into v_p
  from public.tpl_propiedades where id = p_propiedad_id;

  insert into public.tpl_comunicaciones_cola(
    actor_id, canal, destinatario, plantilla, asunto, payload, estado, procesar_desde
  ) values (
    p_actor_id, 'email', v_email, 'publicacion_recibida',
    'Recibimos tu propiedad en Tu Parcela Lista',
    jsonb_build_object(
      'nombre', v_nombre,
      'titulo', v_p.titulo,
      'comuna', v_p.comuna,
      'superficie', v_p.superficie_m2,
      'precio', v_p.precio_publicado,
      'codigo', p_codigo,
      'url', 'https://www.parcelalista.cl/'
    ),
    'pendiente', now()
  );
end
$function$;

-- La firma de 3 argumentos queda obsoleta: el wrapper pasa siempre 4.
drop function if exists public.tpl_publicar_propiedad_encolar_correo_v1(uuid, uuid, text);

create or replace function public.tpl_publicar_propiedad_v3(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_resultado jsonb;
begin
  v_resultado := public.tpl_publicar_propiedad_v3_core(p_payload);

  -- Correo de confirmación. Si falla, la publicación igual se conserva.
  begin
    perform public.tpl_publicar_propiedad_encolar_correo_v1(
      (v_resultado->>'actor_id')::uuid,
      (v_resultado->>'propiedad_id')::uuid,
      v_resultado->>'codigo_propiedad',
      v_resultado->>'contacto_email'
    );
  exception when others then
    insert into public.tpl_eventos(evento, categoria, descripcion, metadata)
    values ('publicacion.correo_no_encolado', 'publicacion',
            'La propiedad se guardó pero no se pudo encolar el correo de confirmación.',
            jsonb_build_object('propiedad_id', v_resultado->>'propiedad_id', 'error', sqlerrm));
  end;

  return v_resultado;
end
$function$;

grant execute on function public.tpl_publicar_propiedad_v3(jsonb) to anon, authenticated;
