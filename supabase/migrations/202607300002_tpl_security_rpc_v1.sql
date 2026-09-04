-- ============================================================
-- TPL TU PARCELA LISTA
-- Seguridad + RPC de Publicador + Snapshot CRM v1
-- Ejecutar DESPUÉS de:
--   202607300000_tpl_nucleo_v1.sql
--   202607300001_tpl_comercial_crm_v1.sql
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) PERSONAL AUTORIZADO DEL CRM
-- No se autoriza el CRM solo por tener una cuenta.
-- ------------------------------------------------------------
create table if not exists public.tpl_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol text not null default 'asesor'
    check (rol in ('administrador','operador','asesor','solo_lectura')),
  activo boolean not null default true,
  nombre text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tpl_staff enable row level security;

drop policy if exists tpl_staff_read_self on public.tpl_staff;
create policy tpl_staff_read_self
on public.tpl_staff
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.tpl_es_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tpl_staff s
    where s.user_id = auth.uid()
      and s.activo = true
  );
$$;

revoke all on function public.tpl_es_staff() from public;
grant execute on function public.tpl_es_staff() to authenticated;

-- Helper de administración: solo se usa desde SQL Editor/service role.
create or replace function public.tpl_asignar_staff_por_email(
  p_email text,
  p_rol text default 'administrador',
  p_nombre text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_rol text := lower(coalesce(p_rol,'administrador'));
begin
  if v_rol not in ('administrador','operador','asesor','solo_lectura') then
    raise exception 'Rol de staff inválido';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception 'No existe un usuario de Authentication con ese correo';
  end if;

  insert into public.tpl_staff(user_id,rol,activo,nombre)
  values(v_user_id,v_rol,true,p_nombre)
  on conflict(user_id) do update
  set rol=excluded.rol,
      activo=true,
      nombre=coalesce(excluded.nombre,public.tpl_staff.nombre),
      updated_at=now();

  return v_user_id;
end;
$$;

-- Esta función NO se expone al navegador.
revoke all on function public.tpl_asignar_staff_por_email(text,text,text) from public, anon, authenticated;


-- Las vistas internas del CRM/cerebro nunca se consultan directamente
-- desde la publishable key. Solo la RPC tpl_crm_snapshot_v1 puede leerlas.
revoke all on public.crm_compradores from anon, authenticated;
revoke all on public.crm_duenos from anon, authenticated;
revoke all on public.crm_parcelas from anon, authenticated;
revoke all on public.crm_parcelas_casas from anon, authenticated;
revoke all on public.crm_casas from anon, authenticated;
revoke all on public.crm_operaciones_activas from anon, authenticated;
revoke all on public.crm_operaciones_revision from anon, authenticated;
revoke all on public.crm_analytics_diario from anon, authenticated;
revoke all on public.tpl_cerebro_operaciones from anon, authenticated;
revoke all on public.tpl_cerebro_alertas from anon, authenticated;

-- ------------------------------------------------------------
-- 2) UTILIDADES PRIVADAS DEL PUBLICADOR
-- ------------------------------------------------------------
create or replace function public.tpl_text(p_value jsonb, p_key text, p_max integer default 500)
returns text
language sql
immutable
as $$
  select nullif(left(trim(coalesce(p_value ->> p_key,'')), greatest(1,p_max)),'');
$$;

revoke all on function public.tpl_text(jsonb,text,integer) from public, anon, authenticated;

create or replace function public.tpl_num(p_value jsonb, p_key text)
returns numeric
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := nullif(trim(coalesce(p_value ->> p_key,'')),'');
  if v is null then return null; end if;
  begin
    return v::numeric;
  exception when others then
    return null;
  end;
end;
$$;

revoke all on function public.tpl_num(jsonb,text) from public, anon, authenticated;

-- Devuelve el código canónico de servicio para una necesidad declarada.
create or replace function public.tpl_servicio_codigo_desde_texto(p_text text)
returns text
language plpgsql
immutable
as $$
declare
  v text := lower(coalesce(p_text,''));
begin
  if v like '%cerco%' or v like '%cierre%' then return 'cerco_perimetral'; end if;
  if v like '%porton%' or v like '%portón%' then return 'porton_acceso'; end if;
  if v like '%agua%' or v like '%pozo%' or v like '%puntera%' or v like '%apr%' then return 'solucion_agua'; end if;
  if v like '%fosa%' or v like '%sept%' or v like '%sanitari%' then return 'fosa_septica'; end if;
  if v like '%electric%' or v like '%empalme%' or v like '%luz%' then return 'instalacion_electrica'; end if;
  if v like '%radier%' or v like '%fundaci%' then return 'radier_fundacion'; end if;
  if v like '%camino%' or v like '%acceso%' then return 'mejora_camino'; end if;
  if v like '%limpieza%' or v like '%roce%' or v like '%despeje%' then return 'limpieza_terreno'; end if;
  if v like '%movimiento%' or v like '%nivelaci%' or v like '%relleno%' or v like '%excav%' then return 'movimiento_tierra'; end if;
  if v like '%paisaj%' then return 'paisajismo'; end if;
  return null;
end;
$$;

revoke all on function public.tpl_servicio_codigo_desde_texto(text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3) RPC PÚBLICA Y LIMITADA PARA PUBLICAR
-- Una llamada = una transacción. Si falla una parte, no deja registros
-- incompletos en actores/publicación/propiedad.
-- ------------------------------------------------------------
create or replace function public.tpl_publicar_propiedad_v3(p_payload jsonb)
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

  select a.id into v_actor_id
  from public.tpl_actores a
  where (v_rut is not null and a.rut = v_rut)
     or (v_email is not null and lower(a.email) = v_email)
  order by
    case when v_rut is not null and a.rut=v_rut then 0 else 1 end,
    a.created_at asc
  limit 1;

  if v_actor_id is null then
    insert into public.tpl_actores(
      tipo_actor,nombre,rut,email,telefono,region,comuna,origen,metadata
    )
    values(
      'persona',v_nombre,v_rut,v_email,v_tel,v_region,v_comuna,'publicador',
      jsonb_build_object('responsable',coalesce(v_contacto->>'responsable','propietario'))
    )
    returning id into v_actor_id;
  else
    update public.tpl_actores
       set nombre=coalesce(v_nombre,nombre),
           telefono=coalesce(v_tel,telefono),
           email=coalesce(v_email,email),
           rut=coalesce(v_rut,rut),
           region=coalesce(v_region,region),
           comuna=coalesce(v_comuna,comuna),
           updated_at=now()
     where id=v_actor_id;
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
    'necesidades_detectadas',v_created_needs
  );
end;
$$;

revoke all on function public.tpl_publicar_propiedad_v3(jsonb) from public;
grant execute on function public.tpl_publicar_propiedad_v3(jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) EVENTO PÚBLICO DE BAJO RIESGO
-- Para analytics/acciones sin exponer INSERT libre a tpl_eventos.
-- ------------------------------------------------------------
create or replace function public.tpl_registrar_evento_publico_v1(
  p_evento text,
  p_payload jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento text := left(trim(coalesce(p_evento,'')),100);
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb);
begin
  if v_evento = '' then return false; end if;
  if octet_length(v_payload::text) > 20000 then return false; end if;

  -- Solo categorías de frontend expresamente permitidas.
  if v_evento not in (
    'informe_tasacion_solicitado',
    'proyecto_visto',
    'parcela_vista',
    'plano_visto',
    'proyecto_guardado',
    'visita_iniciada'
  ) then
    return false;
  end if;

  insert into public.tpl_analytics_eventos(sesion_id,evento,pagina,origen,metadata)
  values(
    nullif(left(v_payload->>'sesion_id',120),''),
    v_evento,
    nullif(left(v_payload->>'pagina',250),''),
    'frontend',
    v_payload - 'email' - 'telefono' - 'rut' - 'nombre'
  );

  return true;
end;
$$;

revoke all on function public.tpl_registrar_evento_publico_v1(text,jsonb) from public;
grant execute on function public.tpl_registrar_evento_publico_v1(text,jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- 5) SNAPSHOT SEGURO DEL CRM
-- Solo usuarios presentes en tpl_staff.
-- ------------------------------------------------------------
create or replace function public.tpl_crm_snapshot_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso CRM no autorizado' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generated_at',now(),

    'compradores',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.nombre nulls last)
      from public.crm_compradores x
    ),'[]'::jsonb),

    'duenos',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.nombre nulls last)
      from public.crm_duenos x
    ),'[]'::jsonb),

    'parcelas',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from public.crm_parcelas x
    ),'[]'::jsonb),

    'parcelas_casas',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from public.crm_parcelas_casas x
    ),'[]'::jsonb),

    'casas',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from public.crm_casas x
    ),'[]'::jsonb),

    'operaciones',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from public.crm_operaciones_activas x
    ),'[]'::jsonb),

    'revision',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from public.crm_operaciones_revision x
    ),'[]'::jsonb),

    'tareas',coalesce((
      select jsonb_agg(to_jsonb(t) order by
        case t.prioridad when 'urgente' then 0 when 'alta' then 1 when 'media' then 2 else 3 end,
        t.vence_at nulls last,t.created_at desc)
      from (
        select id,actor_id,propiedad_id,proyecto_id,orden_servicio_id,
               titulo,detalle,tipo,prioridad,estado,vence_at,completada_at,created_at,updated_at
        from public.tpl_tareas
        where estado in ('pendiente','en_progreso','esperando')
        limit 300
      ) t
    ),'[]'::jsonb),

    'alertas',coalesce((
      select jsonb_agg(to_jsonb(a) order by a.fecha_relevante nulls last)
      from public.tpl_cerebro_alertas a
    ),'[]'::jsonb),

    'eventos',coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from (
        select id,actor_id,propiedad_id,proyecto_id,orden_servicio_id,
               evento,categoria,origen,pagina,prioridad,descripcion,created_at
        from public.tpl_eventos
        order by created_at desc
        limit 300
      ) e
    ),'[]'::jsonb),

    'publicaciones_revision',coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc)
      from (
        select id,codigo,publicador_actor_id,responsable_actor_id,tipo,estado,
               origen,motivo_revision,enviada_at,revisada_at,created_at,updated_at
        from public.tpl_publicaciones
        where estado in ('enviada','pendiente_revision','requiere_correccion')
        order by created_at desc
        limit 300
      ) p
    ),'[]'::jsonb),

    'ordenes',coalesce((
      select jsonb_agg(to_jsonb(o) order by o.updated_at desc)
      from (
        select id,codigo,proyecto_id,necesidad_id,servicio_id,partner_actor_id,
               estado,monto_estimado,monto_acordado,habilitada_por_pago,
               habilitada_at,enviada_partner_at,aceptada_partner_at,
               inicio_estimado,termino_estimado,created_at,updated_at
        from public.tpl_ordenes_servicio
        where estado not in ('completada','cancelada')
        order by updated_at desc
        limit 300
      ) o
    ),'[]'::jsonb),

    'partners',coalesce((
      select jsonb_agg(to_jsonb(p) order by p.nombre)
      from (
        select
          a.id,a.nombre,a.email,a.telefono,a.region,a.comuna,
          coalesce(jsonb_agg(
            distinct jsonb_build_object(
              'servicio',s.nombre,
              'servicio_codigo',s.codigo,
              'disponibilidad',ps.disponibilidad,
              'comunas',ps.comunas,
              'rating',ps.rating,
              'trabajos_completados',ps.trabajos_completados
            )
          ) filter(where s.id is not null),'[]'::jsonb) as servicios
        from public.tpl_actores a
        join public.tpl_actor_roles ar on ar.actor_id=a.id and ar.rol='partner'
        left join public.tpl_partner_servicios ps on ps.partner_actor_id=a.id and ps.activo=true
        left join public.tpl_servicios s on s.id=ps.servicio_id
        group by a.id,a.nombre,a.email,a.telefono,a.region,a.comuna
      ) p
    ),'[]'::jsonb),

    'analytics_diario',coalesce((
      select jsonb_agg(to_jsonb(a) order by a.dia desc)
      from (
        select *
        from public.crm_analytics_diario
        where dia >= date_trunc('day',now()) - interval '30 days'
        order by dia desc
        limit 500
      ) a
    ),'[]'::jsonb),

    'tasaciones',coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at desc)
      from (
        select id,propiedad_id,actor_id,tipo,superficie_m2,precio_publicado,
               precio_publicado_m2,valor_tpl_total,valor_tpl_m2,referencia_comunal_m2,
               diferencia_publicado_vs_tpl_pct,diferencia_publicado_vs_comunal_pct,
               clasificacion,es_oportunidad,version_motor,created_at
        from public.tpl_tasaciones
        order by created_at desc
        limit 300
      ) t
    ),'[]'::jsonb),

    'mensajes_pendientes',coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at desc)
      from (
        select id,actor_id,propiedad_id,proyecto_id,plantilla_id,canal,direccion,
               destinatario,asunto,estado,programado_at,enviado_at,created_at
        from public.tpl_mensajes
        where estado in ('pendiente','programado','error')
        order by created_at desc
        limit 300
      ) m
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.tpl_crm_snapshot_v1() from public;
grant execute on function public.tpl_crm_snapshot_v1() to authenticated;

-- ------------------------------------------------------------
-- 6) FUNCIÓN PARA PUBLICAR/APROBAR DESDE CRM (staff)
-- La ficha pública solo aparece después de revisión explícita.
-- ------------------------------------------------------------
create or replace function public.tpl_aprobar_publicacion_v1(
  p_publicacion_id uuid,
  p_publicar boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_propiedad_id uuid;
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;

  select id into v_propiedad_id
  from public.tpl_propiedades
  where publicacion_id=p_publicacion_id
  limit 1;

  if v_propiedad_id is null then
    raise exception 'No se encontró la propiedad asociada';
  end if;

  update public.tpl_publicaciones
     set estado='aprobada',
         aprobada_at=now(),
         revisada_at=now(),
         motivo_revision=null
   where id=p_publicacion_id;

  update public.tpl_propiedades
     set estado=case when p_publicar then 'publicada' else 'revision' end,
         publicada_at=case when p_publicar then coalesce(publicada_at,now()) else publicada_at end
   where id=v_propiedad_id;

  insert into public.tpl_eventos(
    propiedad_id,evento,categoria,origen,prioridad,descripcion,metadata
  )
  values(
    v_propiedad_id,'publicacion.aprobada','publicacion','crm','media',
    case when p_publicar then 'Publicación aprobada y habilitada para catálogo público.'
         else 'Publicación aprobada internamente.' end,
    jsonb_build_object('publicacion_id',p_publicacion_id,'publicada',p_publicar,'staff_user_id',auth.uid())
  );

  return jsonb_build_object(
    'ok',true,
    'publicacion_id',p_publicacion_id,
    'propiedad_id',v_propiedad_id,
    'estado',case when p_publicar then 'publicada' else 'revision' end
  );
end;
$$;

revoke all on function public.tpl_aprobar_publicacion_v1(uuid,boolean) from public;
grant execute on function public.tpl_aprobar_publicacion_v1(uuid,boolean) to authenticated;

-- ------------------------------------------------------------
-- 7) Privilegios directos: no damos INSERT/UPDATE público.
-- RLS + RPC son la puerta de entrada.
-- ------------------------------------------------------------
revoke insert, update, delete on public.tpl_actores from anon, authenticated;
revoke insert, update, delete on public.tpl_actor_roles from anon, authenticated;
revoke insert, update, delete on public.tpl_publicaciones from anon, authenticated;
revoke insert, update, delete on public.tpl_propiedades from anon, authenticated;
revoke insert, update, delete on public.tpl_necesidades_proyecto from anon, authenticated;
revoke insert, update, delete on public.tpl_tasaciones from anon, authenticated;
revoke insert, update, delete on public.tpl_eventos from anon, authenticated;
revoke insert, update, delete on public.tpl_pagos from anon, authenticated;
revoke insert, update, delete on public.tpl_contratos from anon, authenticated;
revoke insert, update, delete on public.tpl_ordenes_servicio from anon, authenticated;

-- Nota: tpl_analytics_eventos conserva la policy pública de INSERT creada
-- por la migración comercial. La RPC pública anterior elimina PII conocida
-- para los eventos nuevos de TPL; más adelante podemos cerrar también el
-- INSERT directo cuando todo el frontend use exclusivamente la RPC.

-- FIN
