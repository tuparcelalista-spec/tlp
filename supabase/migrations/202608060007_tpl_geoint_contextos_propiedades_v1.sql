-- TPL GEOINT G1.3 · RESOLUCIÓN MASIVA DE CONTEXTOS v1
-- Permite ejecución desde service_role y SQL Editor (postgres/supabase_admin).

create or replace function public.tpl_geoint_autorizado_servidor_v1()
returns boolean language sql stable as $$
 select coalesce(auth.role(),'')='service_role' or current_user in ('postgres','supabase_admin');
$$;

-- Ajuste localizado del control de autorización del resolvedor existente.
-- Se recrea desde su definición actual mediante reemplazo dinámico no viable en SQL;
-- por compatibilidad, el batch calcula y persiste directamente con la misma lógica.
create or replace function public.tpl_geoint_recalcular_contextos_v1(
 p_limit integer default null,
 p_solo_publicadas boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 p public.tpl_propiedades%rowtype;
 perfil public.tpl_geoint_perfiles%rowtype;
 centro public.tpl_geoint_referencias%rowtype;
 hub public.tpl_geoint_referencias%rowtype;
 destino public.tpl_geoint_referencias%rowtype;
 secundario public.tpl_geoint_referencias%rowtype;
 clasificacion jsonb;
 d_centro numeric; d_hub numeric; d_destino numeric; d_sec numeric;
 efectivo public.tpl_geoint_referencias%rowtype; d_efectivo numeric;
 procesadas int:=0; completadas int:=0; sin_perfil int:=0; sin_coords int:=0;
begin
 if not public.tpl_geoint_autorizado_servidor_v1() then raise exception 'NO_AUTORIZADO'; end if;
 for p in
   select * from public.tpl_propiedades
   where (not p_solo_publicadas or coalesce(estado,'') in ('publicada','activa','disponible'))
   order by created_at
   limit coalesce(p_limit,2147483647)
 loop
   procesadas:=procesadas+1;
   if p.lat is null or p.lng is null then sin_coords:=sin_coords+1; continue; end if;
   perfil:=public.tpl_geoint_buscar_perfil_v1(p.comuna,
     coalesce(nullif(p.sector,''),nullif(p.metadata->>'localidad',''),nullif(p.metadata->>'sector','')));
   if perfil.id is null then sin_perfil:=sin_perfil+1; continue; end if;
   select * into centro from public.tpl_geoint_referencias where id=perfil.centro_comunal_id and activo;
   select * into hub from public.tpl_geoint_referencias where id=perfil.hub_principal_id and activo;
   select * into destino from public.tpl_geoint_referencias where id=perfil.destino_turistico_id and activo;
   select * into secundario from public.tpl_geoint_referencias where id=perfil.hub_secundario_id and activo;
   d_centro:=case when centro.id is null then null else public.tpl_geoint_haversine_km_v1(p.lat,p.lng,centro.lat,centro.lng) end;
   d_hub:=case when hub.id is null then null else public.tpl_geoint_haversine_km_v1(p.lat,p.lng,hub.lat,hub.lng) end;
   d_destino:=case when destino.id is null then null else public.tpl_geoint_haversine_km_v1(p.lat,p.lng,destino.lat,destino.lng) end;
   d_sec:=case when secundario.id is null then null else public.tpl_geoint_haversine_km_v1(p.lat,p.lng,secundario.lat,secundario.lng) end;
   if perfil.turismo_reemplaza_hub and destino.id is not null then efectivo:=destino; d_efectivo:=d_destino;
   else efectivo:=hub; d_efectivo:=d_hub; end if;
   clasificacion:=public.tpl_geoint_clasificar_activo_v1(p.tipo);
   insert into public.tpl_geoint_propiedad_contexto(
    propiedad_id,perfil_id,tipo_activo,valoracion_suelo_aplica,valoracion_vivienda_aplica,contexto_urbano,
    centro_comunal_id,hub_principal_id,destino_turistico_id,hub_secundario_id,
    distancia_centro_comunal_km,distancia_hub_principal_km,distancia_destino_turistico_km,distancia_hub_secundario_km,
    hub_efectivo_id,hub_efectivo_tipo,hub_efectivo_nombre,distancia_hub_efectivo_km,nivel_turismo,turismo_reemplaza_hub,
    confianza,origen,resultado,geoint_version,calculado_at,updated_at)
   values(p.id,perfil.id,clasificacion->>'tipo',(clasificacion->>'suelo')::boolean,(clasificacion->>'vivienda')::boolean,
    (clasificacion->>'urbano')::boolean,centro.id,hub.id,destino.id,secundario.id,d_centro,d_hub,d_destino,d_sec,
    efectivo.id,efectivo.tipo,efectivo.nombre,d_efectivo,
    coalesce(destino.nivel_turismo,perfil.metadata->>'nivel_turismo','sin_influencia'),perfil.turismo_reemplaza_hub,
    case when centro.id is not null and efectivo.id is not null then 90 else 60 end,'geoint_catalogo_nacional',
    jsonb_build_object('centro_comunal',jsonb_build_object('nombre',centro.nombre,'distance_km',d_centro),
      'hub_principal',jsonb_build_object('nombre',hub.nombre,'tipo',hub.tipo,'distance_km',d_hub),
      'destino_turistico',case when destino.id is null then null else jsonb_build_object('nombre',destino.nombre,'nivel',destino.nivel_turismo,'distance_km',d_destino) end,
      'hub_efectivo',jsonb_build_object('nombre',efectivo.nombre,'tipo',efectivo.tipo,'distance_km',d_efectivo),
      'distance_method','haversine_referencial','geoint_version','geoint-v1-centro-sur'),
    'geoint-v1-centro-sur',now(),now())
   on conflict(propiedad_id) do update set
    perfil_id=excluded.perfil_id,tipo_activo=excluded.tipo_activo,valoracion_suelo_aplica=excluded.valoracion_suelo_aplica,
    valoracion_vivienda_aplica=excluded.valoracion_vivienda_aplica,contexto_urbano=excluded.contexto_urbano,
    centro_comunal_id=excluded.centro_comunal_id,hub_principal_id=excluded.hub_principal_id,
    destino_turistico_id=excluded.destino_turistico_id,hub_secundario_id=excluded.hub_secundario_id,
    distancia_centro_comunal_km=excluded.distancia_centro_comunal_km,distancia_hub_principal_km=excluded.distancia_hub_principal_km,
    distancia_destino_turistico_km=excluded.distancia_destino_turistico_km,distancia_hub_secundario_km=excluded.distancia_hub_secundario_km,
    hub_efectivo_id=excluded.hub_efectivo_id,hub_efectivo_tipo=excluded.hub_efectivo_tipo,hub_efectivo_nombre=excluded.hub_efectivo_nombre,
    distancia_hub_efectivo_km=excluded.distancia_hub_efectivo_km,nivel_turismo=excluded.nivel_turismo,
    turismo_reemplaza_hub=excluded.turismo_reemplaza_hub,confianza=excluded.confianza,origen=excluded.origen,
    resultado=excluded.resultado,geoint_version=excluded.geoint_version,calculado_at=now(),updated_at=now();
   completadas:=completadas+1;
 end loop;
 return jsonb_build_object('procesadas',procesadas,'completadas',completadas,'sin_perfil',sin_perfil,'sin_coordenadas',sin_coords,'generado_at',now());
end;
$$;
revoke all on function public.tpl_geoint_recalcular_contextos_v1(integer,boolean) from public;
grant execute on function public.tpl_geoint_recalcular_contextos_v1(integer,boolean) to service_role;

create or replace function public.tpl_geoint_auditoria_distancias_v1()
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('generado_at',now(),'contextos',count(*),
 'con_dos_distancias',count(*) filter(where distancia_centro_comunal_km is not null and distancia_hub_efectivo_km is not null),
 'distancias_iguales',count(*) filter(where distancia_centro_comunal_km=distancia_hub_efectivo_km),
 'turismo_reemplaza_hub',count(*) filter(where turismo_reemplaza_hub),
 'sin_hub_efectivo',count(*) filter(where hub_efectivo_id is null))
 from public.tpl_geoint_propiedad_contexto;
$$;
grant execute on function public.tpl_geoint_auditoria_distancias_v1() to authenticated,service_role;

select public.tpl_geoint_recalcular_contextos_v1(null,true);
