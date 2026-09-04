-- TPL · Publicador/Tasador: persistencia canónica de atributos declarados
-- Conserva GEOINT como dueño de distancias, turismo y riesgos automáticos.

create or replace function public.tpl_sync_publicador_tasador_atributos_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := '{}'::jsonb;
  v_terreno jsonb := '{}'::jsonb;
  v_nature jsonb := '[]'::jsonb;
  v_tasador jsonb := '{}'::jsonb;
begin
  if new.publicacion_id is not null then
    select coalesce(datos,'{}'::jsonb)
      into v_payload
      from public.tpl_publicaciones
     where id = new.publicacion_id;
  end if;

  v_terreno := coalesce(v_payload->'terreno','{}'::jsonb);

  select coalesce(jsonb_agg(to_jsonb(x.valor)), '[]'::jsonb)
    into v_nature
    from (
      select distinct valor
      from (
        select jsonb_array_elements_text(coalesce(new.atributos_naturales,'[]'::jsonb)) as valor
        union all select 'Río dentro o acceso directo' where lower(coalesce(v_terreno->>'rioDirecto','false')) in ('true','t','1','si','sí')
        union all select 'Estero dentro o acceso directo' where lower(coalesce(v_terreno->>'esteroNatural','false')) in ('true','t','1','si','sí')
        union all select 'Vertiente natural' where lower(coalesce(v_terreno->>'vertienteNatural','false')) in ('true','t','1','si','sí')
        union all select 'Orilla o acceso directo a lago' where lower(coalesce(v_terreno->>'orillaLago','false')) in ('true','t','1','si','sí')
        union all select 'Aguas termales / termas' where lower(coalesce(v_terreno->>'termasNaturales','false')) in ('true','t','1','si','sí')
      ) q
      where nullif(trim(valor),'') is not null
    ) x;

  v_tasador := jsonb_strip_nulls(jsonb_build_object(
    'route_distance', coalesce(v_terreno->'distanciaRutaPrincipalKm', to_jsonb(new.distancia_ruta_principal_km)),
    'electricity_pole_distance', v_terreno->'distanciaPosteM',
    'access', coalesce(v_terreno->'acceso', to_jsonb(new.acceso)),
    'topography', coalesce(v_terreno->'topografia', to_jsonb(new.topografia)),
    'soil', to_jsonb(new.suelo),
    'view', coalesce(v_terreno->'vistaPrincipal', to_jsonb(new.vista_principal)),
    'water', coalesce(v_terreno->'agua', to_jsonb(new.agua)),
    'electricity', coalesce(v_terreno->'luz', to_jsonb(new.electricidad)),
    'fencing', coalesce(v_terreno->'cierre', to_jsonb(new.cierre_perimetral)),
    'gate', coalesce(v_terreno->'porton', to_jsonb(new.porton)),
    'condominium', v_terreno->'condominio',
    'vegetation', coalesce(v_terreno->'vegetacion', to_jsonb(new.vegetacion)),
    'nature', v_nature,
    'fire_risk', coalesce(new.metadata->'tasador_entrada'->'fire_risk', new.metadata->'tasador_entrada'->'fireRisk'),
    'flood_risk', coalesce(new.metadata->'tasador_entrada'->'flood_risk', new.metadata->'tasador_entrada'->'floodRisk'),
    'source', 'publicador'
  ));

  new.atributos_naturales := v_nature;
  new.metadata := coalesce(new.metadata,'{}'::jsonb)
    || jsonb_build_object('tasador_entrada',
      coalesce(new.metadata->'tasador_entrada','{}'::jsonb) || v_tasador
    );

  return new;
end;
$$;

drop trigger if exists trg_tpl_sync_publicador_tasador_atributos_v1
  on public.tpl_propiedades;

create trigger trg_tpl_sync_publicador_tasador_atributos_v1
before insert or update of publicacion_id, atributos_naturales, acceso, topografia,
  suelo, vista_principal, agua, electricidad, cierre_perimetral, porton,
  condominio, distancia_ruta_principal_km, vegetacion, metadata
on public.tpl_propiedades
for each row execute function public.tpl_sync_publicador_tasador_atributos_v1();

-- Backfill de propiedades ya publicadas.
update public.tpl_propiedades
   set metadata = coalesce(metadata,'{}'::jsonb),
       updated_at = now()
 where publicacion_id is not null;

create or replace function public.tpl_auditoria_publicador_tasador_atributos_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generado_at', now(),
    'propiedades_publicadas', count(*) filter (where estado in ('publicada','activa','disponible')),
    'con_tasador_entrada', count(*) filter (where metadata ? 'tasador_entrada'),
    'con_atributos_naturales', count(*) filter (where jsonb_array_length(coalesce(atributos_naturales,'[]'::jsonb)) > 0),
    'con_topografia', count(*) filter (where nullif(topografia,'') is not null),
    'con_rol', count(*) filter (where nullif(rol_situacion,'') is not null)
  )
  from public.tpl_propiedades;
$$;

grant execute on function public.tpl_auditoria_publicador_tasador_atributos_v1()
  to authenticated, service_role;
