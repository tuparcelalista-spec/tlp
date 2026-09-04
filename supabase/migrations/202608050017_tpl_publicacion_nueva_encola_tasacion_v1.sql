-- TPL · T4 · Toda propiedad nueva o modificada entra al Tasador canónico
-- Requiere T3: public.tpl_cola_recalculo_tasacion

create or replace function public.tpl_encolar_tasacion_propiedad_v1(
  p_propiedad_id uuid,
  p_solicitado_por text default 'sistema',
  p_motivo text default 'Propiedad nueva o modificada'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_prop public.tpl_propiedades%rowtype;
  v_queue_id uuid;
  v_entrada jsonb;
begin
  select * into v_prop
  from public.tpl_propiedades
  where id = p_propiedad_id;

  if v_prop.id is null then
    return null;
  end if;

  v_entrada := coalesce(v_prop.metadata->'tasador_entrada', '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'propiedad_id', v_prop.id,
      'codigo', v_prop.codigo,
      'superficie_m2', v_prop.superficie_m2,
      'precio_publicado', v_prop.precio_publicado,
      'region', v_prop.region,
      'comuna', v_prop.comuna,
      'lat', v_prop.lat,
      'lng', v_prop.lng,
      'access', v_prop.acceso,
      'topography', v_prop.topografia,
      'soil', v_prop.suelo,
      'exposure', v_prop.exposicion,
      'view', v_prop.vista_principal,
      'vegetation', v_prop.vegetacion,
      'water', v_prop.agua,
      'electricity', v_prop.electricidad,
      'fencing', v_prop.cierre_perimetral,
      'gate', v_prop.porton,
      'condominium', v_prop.condominio,
      'route_distance', v_prop.distancia_ruta_principal_km,
      'nature', v_prop.atributos_naturales,
      'casa_datos', v_prop.casa_datos,
      'origen_cola', coalesce(nullif(p_solicitado_por,''), 'sistema'),
      'encolado_at', now()
    ));

  insert into public.tpl_cola_recalculo_tasacion(
    propiedad_id,
    estado,
    solicitado_por,
    motivo,
    entrada
  )
  values(
    v_prop.id,
    'pendiente',
    left(coalesce(nullif(p_solicitado_por,''), 'sistema'), 60),
    left(coalesce(nullif(p_motivo,''), 'Propiedad nueva o modificada'), 300),
    v_entrada
  )
  on conflict (propiedad_id) where estado in ('pendiente','procesando')
  do update set
    estado = 'pendiente',
    solicitado_por = excluded.solicitado_por,
    motivo = excluded.motivo,
    entrada = excluded.entrada,
    error = null,
    procesado_at = null,
    updated_at = now()
  returning id into v_queue_id;

  update public.tpl_propiedades
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'tasacion_recalculo_pendiente', true,
        'tasacion_recalculo_solicitado_at', now(),
        'tasacion_recalculo_motivo', left(coalesce(nullif(p_motivo,''), 'Propiedad nueva o modificada'), 300)
      )
  where id = v_prop.id;

  return v_queue_id;
end;
$$;

revoke all on function public.tpl_encolar_tasacion_propiedad_v1(uuid,text,text) from public;
grant execute on function public.tpl_encolar_tasacion_propiedad_v1(uuid,text,text) to service_role;

create or replace function public.tpl_trigger_encolar_tasacion_propiedad_v1()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_motivo text;
  v_origen text;
begin
  if tg_op = 'INSERT' then
    v_motivo := 'Primera tasación automática de propiedad nueva';
    v_origen := coalesce(new.metadata->>'origen', 'publicador');
    perform public.tpl_encolar_tasacion_propiedad_v1(new.id, v_origen, v_motivo);
    return new;
  end if;

  v_motivo := case
    when old.estado is distinct from new.estado then 'Cambio de estado de la propiedad'
    when old.precio_publicado is distinct from new.precio_publicado then 'Cambio de precio publicado'
    when old.superficie_m2 is distinct from new.superficie_m2 then 'Cambio de superficie'
    when old.region is distinct from new.region or old.comuna is distinct from new.comuna then 'Cambio de ubicación administrativa'
    when old.lat is distinct from new.lat or old.lng is distinct from new.lng then 'Cambio de coordenadas'
    when old.agua is distinct from new.agua or old.electricidad is distinct from new.electricidad then 'Cambio de servicios básicos'
    when old.acceso is distinct from new.acceso or old.distancia_ruta_principal_km is distinct from new.distancia_ruta_principal_km then 'Cambio de acceso o conectividad'
    when old.topografia is distinct from new.topografia or old.suelo is distinct from new.suelo then 'Cambio de terreno o suelo'
    when old.exposicion is distinct from new.exposicion or old.vista_principal is distinct from new.vista_principal then 'Cambio de exposición o vista'
    when old.rol_situacion is distinct from new.rol_situacion then 'Cambio de antecedentes legales'
    when old.cierre_perimetral is distinct from new.cierre_perimetral or old.porton is distinct from new.porton or old.condominio is distinct from new.condominio then 'Cambio de infraestructura o condominio'
    when old.vegetacion is distinct from new.vegetacion or old.atributos_naturales is distinct from new.atributos_naturales then 'Cambio de atributos naturales'
    when old.casa_datos is distinct from new.casa_datos then 'Cambio de vivienda u obras'
    else 'Actualización relevante de la propiedad'
  end;

  v_origen := coalesce(new.metadata->>'ultima_actualizacion_origen', new.metadata->>'origen', 'sistema');
  perform public.tpl_encolar_tasacion_propiedad_v1(new.id, v_origen, v_motivo);
  return new;
end;
$$;

revoke all on function public.tpl_trigger_encolar_tasacion_propiedad_v1() from public;

-- Un trigger para altas y otro restringido únicamente a columnas que afectan el valor.
drop trigger if exists trg_tpl_propiedad_nueva_encola_tasacion on public.tpl_propiedades;
create trigger trg_tpl_propiedad_nueva_encola_tasacion
after insert on public.tpl_propiedades
for each row execute function public.tpl_trigger_encolar_tasacion_propiedad_v1();

drop trigger if exists trg_tpl_propiedad_cambio_encola_tasacion on public.tpl_propiedades;
create trigger trg_tpl_propiedad_cambio_encola_tasacion
after update of
  estado,
  precio_publicado,
  superficie_m2,
  region,
  comuna,
  lat,
  lng,
  agua,
  electricidad,
  acceso,
  distancia_ruta_principal_km,
  topografia,
  suelo,
  exposicion,
  vista_principal,
  rol_situacion,
  cierre_perimetral,
  porton,
  condominio,
  vegetacion,
  atributos_naturales,
  casa_datos
on public.tpl_propiedades
for each row
when (
  old.estado is distinct from new.estado
  or old.precio_publicado is distinct from new.precio_publicado
  or old.superficie_m2 is distinct from new.superficie_m2
  or old.region is distinct from new.region
  or old.comuna is distinct from new.comuna
  or old.lat is distinct from new.lat
  or old.lng is distinct from new.lng
  or old.agua is distinct from new.agua
  or old.electricidad is distinct from new.electricidad
  or old.acceso is distinct from new.acceso
  or old.distancia_ruta_principal_km is distinct from new.distancia_ruta_principal_km
  or old.topografia is distinct from new.topografia
  or old.suelo is distinct from new.suelo
  or old.exposicion is distinct from new.exposicion
  or old.vista_principal is distinct from new.vista_principal
  or old.rol_situacion is distinct from new.rol_situacion
  or old.cierre_perimetral is distinct from new.cierre_perimetral
  or old.porton is distinct from new.porton
  or old.condominio is distinct from new.condominio
  or old.vegetacion is distinct from new.vegetacion
  or old.atributos_naturales is distinct from new.atributos_naturales
  or old.casa_datos is distinct from new.casa_datos
)
execute function public.tpl_trigger_encolar_tasacion_propiedad_v1();

-- Encola propiedades publicadas que aún no tienen tasación ni trabajo pendiente.
insert into public.tpl_cola_recalculo_tasacion(propiedad_id,estado,solicitado_por,motivo,entrada)
select
  p.id,
  'pendiente',
  'migracion_t4',
  'Primera tasación automática pendiente al instalar T4',
  coalesce(p.metadata->'tasador_entrada','{}'::jsonb) || jsonb_build_object('propiedad_id',p.id,'codigo',p.codigo,'encolado_at',now())
from public.tpl_propiedades p
where p.estado in ('publicada','activa','disponible')
  and not exists(select 1 from public.tpl_tasaciones t where t.propiedad_id=p.id)
  and not exists(select 1 from public.tpl_cola_recalculo_tasacion q where q.propiedad_id=p.id and q.estado in ('pendiente','procesando'))
on conflict (propiedad_id) where estado in ('pendiente','procesando') do nothing;

create or replace function public.tpl_auditoria_publicaciones_tasador_v1()
returns jsonb
language sql
security definer
set search_path = public
as $$
select jsonb_build_object(
  'generado_at', now(),
  'propiedades_publicas', count(*) filter(where p.estado in ('publicada','activa','disponible')),
  'con_tasacion', count(*) filter(where p.estado in ('publicada','activa','disponible') and exists(select 1 from public.tpl_tasaciones t where t.propiedad_id=p.id)),
  'en_cola', count(*) filter(where p.estado in ('publicada','activa','disponible') and exists(select 1 from public.tpl_cola_recalculo_tasacion q where q.propiedad_id=p.id and q.estado in ('pendiente','procesando'))),
  'sin_tasacion_ni_cola', count(*) filter(where p.estado in ('publicada','activa','disponible') and not exists(select 1 from public.tpl_tasaciones t where t.propiedad_id=p.id) and not exists(select 1 from public.tpl_cola_recalculo_tasacion q where q.propiedad_id=p.id and q.estado in ('pendiente','procesando')))
)
from public.tpl_propiedades p;
$$;

revoke all on function public.tpl_auditoria_publicaciones_tasador_v1() from public;
grant execute on function public.tpl_auditoria_publicaciones_tasador_v1() to authenticated;
