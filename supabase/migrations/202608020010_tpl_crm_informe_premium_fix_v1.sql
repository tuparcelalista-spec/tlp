-- TPL CRM · Corrección integral Informe Premium Tasador v1
begin;

alter table public.tpl_informes_tasacion
  add column if not exists propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  add column if not exists enviado_at timestamptz,
  add column if not exists enviado_a text,
  add column if not exists asunto_envio text;

create index if not exists tpl_informes_tasacion_propiedad_idx
  on public.tpl_informes_tasacion(propiedad_id, created_at desc);

create or replace function public.tpl_crm_preparar_informe_tasacion_v1(
  p_propiedad_id uuid,
  p_contacto jsonb default '{}'::jsonb,
  p_enviar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop public.tpl_propiedades%rowtype;
  v_tas public.tpl_tasaciones%rowtype;
  v_actor public.tpl_actores%rowtype;
  v_orden public.tpl_ordenes_informe%rowtype;
  v_email text;
  v_nombre text;
  v_telefono text;
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  select * into v_prop
  from public.tpl_propiedades
  where id = p_propiedad_id;

  if v_prop.id is null then
    raise exception 'La propiedad seleccionada no existe.';
  end if;

  select * into v_tas
  from public.tpl_tasaciones
  where propiedad_id = p_propiedad_id
  order by created_at desc
  limit 1;

  if v_tas.id is null then
    raise exception 'Esta parcela todavía no tiene una tasación registrada. Ejecuta primero el Tasador TPL y vuelve a intentar.';
  end if;

  if v_prop.propietario_actor_id is not null then
    select * into v_actor
    from public.tpl_actores
    where id = v_prop.propietario_actor_id;
  end if;

  v_email := lower(trim(coalesce(nullif(p_contacto->>'email',''), v_actor.email, '')));
  v_nombre := trim(coalesce(nullif(p_contacto->>'nombre',''), v_actor.nombre, 'Propietario'));
  v_telefono := trim(coalesce(nullif(p_contacto->>'telefono',''), v_actor.telefono, ''));

  insert into public.tpl_ordenes_informe(
    tasacion_id,
    propiedad_id,
    actor_id,
    tipo_informe,
    estado,
    monto_clp,
    contacto,
    entrada_snapshot,
    resultado_snapshot,
    version_motor,
    metadata,
    pagado_at
  ) values (
    v_tas.id,
    v_prop.id,
    v_prop.propietario_actor_id,
    'tasacion_premium_crm',
    'pagado',
    0,
    jsonb_build_object(
      'nombre', v_nombre,
      'email', v_email,
      'telefono', v_telefono
    ),
    jsonb_build_object(
      'titulo', v_prop.titulo,
      'codigo', v_prop.codigo,
      'comuna', v_prop.comuna,
      'region', v_prop.region,
      'sector', v_prop.sector,
      'superficie_m2', v_prop.superficie_m2,
      'precio_publicado', v_prop.precio_publicado,
      'rol', v_prop.rol_situacion,
      'agua', v_prop.agua,
      'electricidad', v_prop.electricidad,
      'acceso', v_prop.acceso,
      'topografia', v_prop.topografia,
      'suelo', v_prop.suelo,
      'descripcion', v_prop.descripcion,
      'imagenes', coalesce(v_prop.metadata->'imagenes', '[]'::jsonb),
      'atributos', v_prop.atributos_naturales,
      'diagnostico', v_prop.diagnostico
    ),
    jsonb_build_object(
      'recommended', v_tas.valor_tpl_total,
      'valorRecomendado', v_tas.valor_tpl_total,
      'valor_tpl_m2', v_tas.valor_tpl_m2,
      'referencia_comunal_m2', v_tas.referencia_comunal_m2,
      'precio_publicado_m2', v_tas.precio_publicado_m2,
      'diferencia_pct', v_tas.diferencia_publicado_vs_tpl_pct,
      'clasificacion', v_tas.clasificacion,
      'es_oportunidad', v_tas.es_oportunidad,
      'factores', v_tas.factores,
      'entrada', v_tas.entrada,
      'resultado', v_tas.resultado
    ),
    v_tas.version_motor,
    jsonb_build_object(
      'origen', 'crm',
      'generado_por', auth.uid(),
      'enviar', p_enviar
    ),
    now()
  ) returning * into v_orden;

  insert into public.tpl_eventos(
    evento,
    categoria,
    origen,
    prioridad,
    descripcion,
    actor_id,
    propiedad_id,
    metadata
  ) values (
    'informe_premium_crm_preparado',
    'tasacion',
    'crm',
    'media',
    'Informe Premium preparado desde CRM.',
    v_prop.propietario_actor_id,
    v_prop.id,
    jsonb_build_object(
      'orden_id', v_orden.id,
      'tasacion_id', v_tas.id,
      'email', v_email
    )
  );

  return jsonb_build_object(
    'ok', true,
    'orden_id', v_orden.id,
    'codigo', v_orden.codigo,
    'email', v_email,
    'tiene_tasacion', true
  );
end;
$$;

revoke all on function public.tpl_crm_preparar_informe_tasacion_v1(uuid,jsonb,boolean) from public;
grant execute on function public.tpl_crm_preparar_informe_tasacion_v1(uuid,jsonb,boolean) to authenticated;

create or replace function public.tpl_crm_historial_informes_v1(p_propiedad_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is not null and public.tpl_es_staff()
      then coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
    else '[]'::jsonb
  end
  from (
    select
      i.id,
      i.orden_id,
      i.tasacion_id,
      i.propiedad_id,
      i.version_plantilla,
      i.estado,
      i.generado_at,
      i.enviado_at,
      i.enviado_a,
      i.storage_bucket,
      i.storage_path,
      i.created_at,
      o.codigo,
      o.contacto,
      o.version_motor
    from public.tpl_informes_tasacion i
    join public.tpl_ordenes_informe o on o.id = i.orden_id
    where i.propiedad_id = p_propiedad_id
       or o.propiedad_id = p_propiedad_id
  ) x;
$$;

revoke all on function public.tpl_crm_historial_informes_v1(uuid) from public;
grant execute on function public.tpl_crm_historial_informes_v1(uuid) to authenticated;

commit;
