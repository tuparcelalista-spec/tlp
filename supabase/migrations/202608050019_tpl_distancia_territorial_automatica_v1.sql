-- TPL · T6 · Distancia territorial automática, auditable y reutilizable

create table if not exists public.tpl_referencias_territoriales (
  id uuid primary key default gen_random_uuid(),
  comuna_normalizada text not null unique,
  comuna text not null,
  region text,
  referencia_nombre text not null,
  lat numeric not null,
  lng numeric not null,
  activo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tpl_referencias_territoriales enable row level security;
revoke all on public.tpl_referencias_territoriales from anon, authenticated;
grant all on public.tpl_referencias_territoriales to service_role;

create or replace function public.tpl_normalizar_texto_v1(p_text text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    translate(lower(coalesce(p_text,'')),
      'áéíóúüñÁÉÍÓÚÜÑ',
      'aeiouunAEIOUUN'),
    '[^a-z0-9]+', ' ', 'g'));
$$;

insert into public.tpl_referencias_territoriales
(comuna_normalizada,comuna,region,referencia_nombre,lat,lng,metadata)
values
  (public.tpl_normalizar_texto_v1('Quillón'),'Quillón','Ñuble','Centro urbano de Quillón',-36.7447,-72.4704,'{"tipo":"centro_comunal_referencial"}'),
  (public.tpl_normalizar_texto_v1('Pucón'),'Pucón','La Araucanía','Centro urbano de Pucón',-39.2820,-71.9543,'{"tipo":"centro_comunal_referencial"}'),
  (public.tpl_normalizar_texto_v1('Yumbel'),'Yumbel','Biobío','Centro urbano de Yumbel',-37.0986,-72.5604,'{"tipo":"centro_comunal_referencial"}'),
  (public.tpl_normalizar_texto_v1('Nacimiento'),'Nacimiento','Biobío','Centro urbano de Nacimiento',-37.5025,-72.6736,'{"tipo":"centro_comunal_referencial"}'),
  (public.tpl_normalizar_texto_v1('Florida'),'Florida','Biobío','Centro urbano de Florida',-36.8244,-72.6717,'{"tipo":"centro_comunal_referencial"}'),
  (public.tpl_normalizar_texto_v1('Negrete'),'Negrete','Biobío','Centro urbano de Negrete',-37.5851,-72.5312,'{"tipo":"centro_comunal_referencial"}'),
  (public.tpl_normalizar_texto_v1('Pemuco'),'Pemuco','Ñuble','Centro urbano de Pemuco',-36.9770,-72.0950,'{"tipo":"centro_comunal_referencial"}'),
  (public.tpl_normalizar_texto_v1('Ñipas'),'Ñipas','Ñuble','Centro urbano de Ñipas',-36.6250,-72.5405,'{"tipo":"centro_comunal_referencial"}')
on conflict (comuna_normalizada) do update
set comuna=excluded.comuna,
    region=excluded.region,
    referencia_nombre=excluded.referencia_nombre,
    lat=excluded.lat,
    lng=excluded.lng,
    metadata=excluded.metadata,
    activo=true,
    updated_at=now();

create or replace function public.tpl_distancia_haversine_km_v1(
  p_lat1 numeric,
  p_lng1 numeric,
  p_lat2 numeric,
  p_lng2 numeric
)
returns numeric
language sql
immutable
as $$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians((p_lat2-p_lat1)::double precision)/2),2) +
    cos(radians(p_lat1::double precision)) * cos(radians(p_lat2::double precision)) *
    power(sin(radians((p_lng2-p_lng1)::double precision)/2),2)
  )))::numeric, 2);
$$;

create or replace function public.tpl_resolver_distancia_territorial_v1(p_propiedad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_prop public.tpl_propiedades%rowtype;
  v_ref public.tpl_referencias_territoriales%rowtype;
  v_tasador jsonb;
  v_existente numeric;
  v_distancia numeric;
  v_nuevo_tasador jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'NO_AUTORIZADO'; end if;

  select * into v_prop from public.tpl_propiedades where id=p_propiedad_id for update;
  if not found then raise exception 'PROPIEDAD_NO_EXISTE'; end if;

  v_tasador := coalesce(v_prop.metadata->'tasador_entrada','{}'::jsonb);
  v_existente := coalesce(
    nullif(v_tasador->>'major_city_distance','')::numeric,
    nullif(v_tasador->>'distanceKm','')::numeric,
    nullif(v_tasador->>'commune_distance','')::numeric
  );

  if coalesce(v_existente,0) > 0 then
    return jsonb_build_object('ok',true,'distance_km',v_existente,'origin','existente');
  end if;

  if v_prop.lat is null or v_prop.lng is null then
    return jsonb_build_object('ok',false,'error','COORDENADAS_INCOMPLETAS');
  end if;

  select * into v_ref
  from public.tpl_referencias_territoriales r
  where r.activo=true
    and r.comuna_normalizada=public.tpl_normalizar_texto_v1(v_prop.comuna)
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'error','REFERENCIA_COMUNAL_NO_CONFIGURADA','comuna',v_prop.comuna);
  end if;

  v_distancia := public.tpl_distancia_haversine_km_v1(v_prop.lat,v_prop.lng,v_ref.lat,v_ref.lng);
  if coalesce(v_distancia,0) <= 0 then
    return jsonb_build_object('ok',false,'error','DISTANCIA_NO_VALIDA');
  end if;

  v_nuevo_tasador := v_tasador || jsonb_build_object(
    'major_city_distance',v_distancia,
    'distanceKm',v_distancia,
    'commune_distance',v_distancia,
    'distance_origin','centro_comunal_calculado',
    'distance_reference',v_ref.referencia_nombre,
    'distance_reference_lat',v_ref.lat,
    'distance_reference_lng',v_ref.lng,
    'distance_calculated_at',now()
  );

  update public.tpl_propiedades
  set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{tasador_entrada}',v_nuevo_tasador,true),
      updated_at=now()
  where id=v_prop.id;

  return jsonb_build_object(
    'ok',true,
    'distance_km',v_distancia,
    'origin','centro_comunal_calculado',
    'reference',v_ref.referencia_nombre
  );
end;
$$;

revoke all on function public.tpl_resolver_distancia_territorial_v1(uuid) from public;
grant execute on function public.tpl_resolver_distancia_territorial_v1(uuid) to service_role;

-- Completar antecedentes existentes que sí tienen coordenadas y referencia comunal.
do $$
declare r record;
begin
  for r in
    select p.id
    from public.tpl_propiedades p
    where p.estado in ('publicada','activa','disponible')
      and p.lat is not null and p.lng is not null
      and coalesce(
        nullif(p.metadata->'tasador_entrada'->>'major_city_distance','')::numeric,
        nullif(p.metadata->'tasador_entrada'->>'distanceKm','')::numeric,
        nullif(p.metadata->'tasador_entrada'->>'commune_distance','')::numeric,
        0
      ) <= 0
  loop
    begin
      perform public.tpl_resolver_distancia_territorial_v1(r.id);
    exception when others then
      null;
    end;
  end loop;
end $$;

-- Reabrir trabajos detenidos únicamente por este antecedente.
update public.tpl_cola_recalculo_tasacion q
set estado='pendiente',
    error=null,
    resultado='{}'::jsonb,
    procesado_at=null,
    updated_at=now()
where q.estado='requiere_revision'
  and coalesce(q.error,'') ilike '%distancia_territorial_principal%'
  and exists (
    select 1 from public.tpl_propiedades p
    where p.id=q.propiedad_id
      and coalesce(
        nullif(p.metadata->'tasador_entrada'->>'major_city_distance','')::numeric,
        nullif(p.metadata->'tasador_entrada'->>'distanceKm','')::numeric,
        nullif(p.metadata->'tasador_entrada'->>'commune_distance','')::numeric,
        0
      ) > 0
  );

create or replace function public.tpl_auditoria_distancia_tasador_v1()
returns jsonb
language sql
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'generado_at',now(),
    'propiedades_publicas',count(*),
    'con_distancia',count(*) filter(where coalesce(
      nullif(metadata->'tasador_entrada'->>'major_city_distance','')::numeric,
      nullif(metadata->'tasador_entrada'->>'distanceKm','')::numeric,
      nullif(metadata->'tasador_entrada'->>'commune_distance','')::numeric,
      0)>0),
    'sin_distancia',count(*) filter(where coalesce(
      nullif(metadata->'tasador_entrada'->>'major_city_distance','')::numeric,
      nullif(metadata->'tasador_entrada'->>'distanceKm','')::numeric,
      nullif(metadata->'tasador_entrada'->>'commune_distance','')::numeric,
      0)<=0),
    'sin_coordenadas',count(*) filter(where lat is null or lng is null),
    'sin_referencia_comunal',count(*) filter(where not exists(
      select 1 from public.tpl_referencias_territoriales r
      where r.activo=true and r.comuna_normalizada=public.tpl_normalizar_texto_v1(tpl_propiedades.comuna)
    ))
  )
  from public.tpl_propiedades
  where estado in ('publicada','activa','disponible');
$$;

grant execute on function public.tpl_auditoria_distancia_tasador_v1() to authenticated;
