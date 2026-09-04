begin;

create extension if not exists pgcrypto;

create table if not exists public.tpl_proyecto_accesos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.tpl_proyectos(id) on delete cascade,
  token_hash text not null unique,
  estado text not null default 'activo' check (estado in ('activo','revocado','vencido')),
  expira_at timestamptz,
  ultimo_uso_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tpl_proyecto_accesos_proyecto_idx on public.tpl_proyecto_accesos(proyecto_id,estado);

create table if not exists public.tpl_solicitudes_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.tpl_proyectos(id) on delete cascade,
  actor_id uuid references public.tpl_actores(id) on delete set null,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  tipo text not null check (tipo in ('asesoria','llamada','pregunta','visita','reserva','whatsapp','otro')),
  estado text not null default 'pendiente' check (estado in ('pendiente','contactado','confirmado','resuelto','cancelado')),
  nombre_contacto text,
  email text,
  telefono text,
  mensaje text,
  fecha_preferida date,
  horario_preferido text,
  monto bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tpl_solicitudes_proyecto_estado_idx on public.tpl_solicitudes_proyecto(estado,created_at desc);
create index if not exists tpl_solicitudes_proyecto_proyecto_idx on public.tpl_solicitudes_proyecto(proyecto_id,created_at desc);

alter table public.tpl_proyecto_accesos enable row level security;
alter table public.tpl_solicitudes_proyecto enable row level security;
revoke all on public.tpl_proyecto_accesos from public, anon, authenticated;
revoke all on public.tpl_solicitudes_proyecto from public, anon, authenticated;

create or replace function public.tpl_resolver_propiedad_publica_v1(p_identifier text)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare v_id uuid;
begin
  if nullif(trim(p_identifier),'') is null then return null; end if;
  if p_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select id into v_id from public.tpl_propiedades where id=p_identifier::uuid limit 1;
  else
    select id into v_id from public.tpl_propiedades
     where codigo=p_identifier or metadata->>'source_legacy_id'=p_identifier
     order by updated_at desc limit 1;
  end if;
  return v_id;
end $$;
revoke all on function public.tpl_resolver_propiedad_publica_v1(text) from public;

create or replace function public.tpl_crear_proyecto_desde_cotizador_v1(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_name text:=left(trim(coalesce(p_payload#>>'{client,name}','')),120);
 v_email text:=lower(left(trim(coalesce(p_payload#>>'{client,email}','')),180));
 v_phone text:=left(regexp_replace(coalesce(p_payload#>>'{client,phone}',''),'[^0-9+]','','g'),30);
 v_actor uuid; v_property uuid; v_project uuid; v_code text; v_token text; v_hash text;
 v_catalog uuid; v_house_identifier text:=coalesce(p_payload->>'houseId',p_payload#>>'{houseData,id}');
 v_total bigint:=greatest(0,coalesce((p_payload->>'total')::numeric,0))::bigint;
 v_budget bigint:=greatest(0,coalesce((p_payload->>'budget')::numeric,0))::bigint;
begin
 if v_name='' or v_phone='' then raise exception 'Nombre y teléfono son obligatorios'; end if;
 if coalesce((p_payload->>'consent')::boolean,false) is not true then raise exception 'Se requiere autorización de contacto'; end if;
 if v_email<>'' and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Correo inválido'; end if;
 v_property:=public.tpl_resolver_propiedad_publica_v1(coalesce(p_payload->>'parcelId',p_payload#>>'{parcelData,id}'));
 if v_property is null then raise exception 'La parcela no existe en el catálogo canónico'; end if;

 if v_email<>'' then select id into v_actor from public.tpl_actores where lower(email)=v_email limit 1; end if;
 if v_actor is null then select id into v_actor from public.tpl_actores where regexp_replace(coalesce(telefono,''),'[^0-9]','','g')=regexp_replace(v_phone,'[^0-9]','','g') order by updated_at desc limit 1; end if;
 if v_actor is null then
   insert into public.tpl_actores(tipo,nombre,email,telefono,comuna,metadata)
   values('persona',v_name,nullif(v_email,''),v_phone,nullif(left(p_payload#>>'{client,commune}',100),''),jsonb_build_object('origen','cotizador_tpl')) returning id into v_actor;
 else
   update public.tpl_actores set nombre=coalesce(nullif(v_name,''),nombre),email=coalesce(nullif(v_email,''),email),telefono=coalesce(nullif(v_phone,''),telefono),updated_at=now() where id=v_actor;
 end if;
 insert into public.tpl_actor_roles(actor_id,rol,estado,metadata) values(v_actor,'comprador','activo','{"origen":"cotizador"}'::jsonb) on conflict(actor_id,rol) do update set estado='activo';
 if (select count(*) from public.tpl_proyectos where comprador_actor_id=v_actor and created_at>now()-interval '1 hour')>=5 then raise exception 'Demasiados proyectos creados. Intenta más tarde'; end if;

 v_code:='TPL-'||to_char(now(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(5),'hex'),1,8));
 insert into public.tpl_proyectos(codigo,propiedad_id,comprador_actor_id,tipo,nombre,estado,presupuesto_objetivo,valor_estimado,casa_configuracion,configuracion,metadata)
 values(v_code,v_property,v_actor,'simulacion',left(coalesce(p_payload->>'parcelName','Proyecto TPL'),180),'guardado',nullif(v_budget,0),nullif(v_total,0),
   jsonb_build_object('modalidad',p_payload->>'housing','house_id',v_house_identifier,'house_name',p_payload->>'houseName','m2',p_payload->>'m2','rooms',p_payload->>'rooms','material',p_payload->>'material','house_price',p_payload->>'housePrice'),
   jsonb_build_object('parcel_price',p_payload->>'parcelPrice','parcel_size',p_payload->>'parcelSize','total',v_total,'budget',v_budget,'source',coalesce(p_payload->'source','{}'::jsonb)),
   jsonb_build_object('origen','cotizador_v1','client_snapshot',p_payload->'client')) returning id into v_project;

 select i.id into v_catalog from public.tpl_catalogo_items i left join public.tpl_casas c on c.id=i.casa_id
 where i.tipo='casa' and (i.id::text=v_house_identifier or i.codigo=v_house_identifier or i.slug=v_house_identifier or c.id::text=v_house_identifier or c.source_legacy_id=v_house_identifier) limit 1;
 if coalesce(p_payload->>'housing','')<>'' then
   insert into public.tpl_proyecto_componentes(proyecto_id,catalogo_item_id,tipo,estado,nombre,monto_estimado,configuracion,metadata)
   values(v_project,v_catalog,'vivienda','idea',left(coalesce(p_payload->>'houseName',case when p_payload->>'housing'='diseno-propio' then 'Vivienda de diseño propio' else 'Vivienda seleccionada' end),180),greatest(0,coalesce((p_payload->>'housePrice')::numeric,0))::bigint,
   jsonb_build_object('housing',p_payload->>'housing','m2',p_payload->>'m2','rooms',p_payload->>'rooms','material',p_payload->>'material'),jsonb_build_object('origen','cotizador'));
 end if;

 insert into public.tpl_oportunidades(codigo,actor_cliente_id,proyecto_id,tipo,origen,estado,prioridad,nombre_contacto,email,telefono,presupuesto,proxima_accion,proxima_accion_at,metadata)
 values('OP-'||substr(v_code,5),v_actor,v_project,'cotizacion','cotizador','nueva',case when v_budget>0 then 'alta' else 'media' end,v_name,nullif(v_email,''),v_phone,nullif(v_budget,0),'Contactar y validar proyecto',now()+interval '1 day',jsonb_build_object('total_estimado',v_total));
 insert into public.tpl_tareas(actor_id,propiedad_id,proyecto_id,titulo,detalle,tipo,prioridad,vence_at,metadata)
 values(v_actor,v_property,v_project,'Revisar nuevo proyecto del cotizador','Validar parcela, vivienda, presupuesto y próximo paso comercial.','seguimiento_comercial',case when v_budget>0 then 'alta' else 'media' end,now()+interval '1 day',jsonb_build_object('origen','cotizador'));
 insert into public.tpl_eventos(actor_id,propiedad_id,proyecto_id,evento,categoria,origen,pagina,prioridad,descripcion,metadata)
 values(v_actor,v_property,v_project,'proyecto.creado_desde_cotizador','comercial','cotizador','/cotizador.html','alta','Proyecto creado y conectado al CRM.',jsonb_build_object('total',v_total,'presupuesto',v_budget));

 v_token:=encode(gen_random_bytes(32),'hex'); v_hash:=encode(digest(v_token,'sha256'),'hex');
 insert into public.tpl_proyecto_accesos(proyecto_id,token_hash,expira_at) values(v_project,v_hash,now()+interval '90 days');
 return jsonb_build_object('ok',true,'project_id',v_project,'codigo',v_code,'access_token',v_token,'expires_at',now()+interval '90 days');
end $$;
revoke all on function public.tpl_crear_proyecto_desde_cotizador_v1(jsonb) from public;
grant execute on function public.tpl_crear_proyecto_desde_cotizador_v1(jsonb) to anon, authenticated;

create or replace function public.tpl_proyecto_por_token_v1(p_project_id uuid,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_project public.tpl_proyectos; v_property public.tpl_propiedades; v_hash text;
begin
 if length(coalesce(p_token,''))<40 then return jsonb_build_object('ok',false,'error','TOKEN_INVALIDO'); end if;
 v_hash:=encode(digest(p_token,'sha256'),'hex');
 if not exists(select 1 from public.tpl_proyecto_accesos where proyecto_id=p_project_id and token_hash=v_hash and estado='activo' and (expira_at is null or expira_at>now())) then return jsonb_build_object('ok',false,'error','ACCESO_NO_DISPONIBLE'); end if;
 update public.tpl_proyecto_accesos set ultimo_uso_at=now() where proyecto_id=p_project_id and token_hash=v_hash;
 select * into v_project from public.tpl_proyectos where id=p_project_id;
 select * into v_property from public.tpl_propiedades where id=v_project.propiedad_id;
 return jsonb_build_object('ok',true,'project',jsonb_build_object('id',v_project.id,'codigo',v_project.codigo,'parcelId',v_property.id,'parcelName',v_property.titulo,'parcelCommune',v_property.comuna,'parcelPrice',v_property.precio_publicado,'parcelSize',v_property.superficie_m2,'parcelData',to_jsonb(v_property),'housing',v_project.casa_configuracion->>'modalidad','houseId',v_project.casa_configuracion->>'house_id','houseName',v_project.casa_configuracion->>'house_name','m2',v_project.casa_configuracion->>'m2','rooms',v_project.casa_configuracion->>'rooms','material',v_project.casa_configuracion->>'material','housePrice',v_project.casa_configuracion->>'house_price','total',v_project.configuracion->>'total','budget',v_project.configuracion->>'budget','source',v_project.configuracion->'source'));
end $$;
revoke all on function public.tpl_proyecto_por_token_v1(uuid,text) from public;
grant execute on function public.tpl_proyecto_por_token_v1(uuid,text) to anon, authenticated;

create or replace function public.tpl_registrar_solicitud_proyecto_v1(p_project_id uuid,p_token text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_hash text; v_project public.tpl_proyectos; v_type text; v_request uuid; v_name text; v_email text; v_phone text; v_message text; v_amount bigint;
begin
 v_hash:=encode(digest(coalesce(p_token,''),'sha256'),'hex');
 if not exists(select 1 from public.tpl_proyecto_accesos where proyecto_id=p_project_id and token_hash=v_hash and estado='activo' and (expira_at is null or expira_at>now())) then return jsonb_build_object('ok',false,'error','ACCESO_NO_DISPONIBLE'); end if;
 select * into v_project from public.tpl_proyectos where id=p_project_id;
 v_type:=case coalesce(p_payload->>'action','otro') when 'call' then 'llamada' when 'question' then 'pregunta' when 'visit' then 'visita' when 'reserve' then 'reserva' when 'asesoria' then 'asesoria' when 'whatsapp' then 'whatsapp' else 'otro' end;
 v_name:=left(coalesce(p_payload#>>'{client,name}',p_payload->>'name',''),120); v_email:=lower(left(coalesce(p_payload#>>'{client,email}',p_payload->>'email',''),180)); v_phone:=left(coalesce(p_payload#>>'{client,phone}',p_payload->>'phone',''),30); v_message:=left(coalesce(p_payload#>>'{client,question}',p_payload->>'message',p_payload#>>'{client,reason}',''),2000); v_amount:=greatest(0,coalesce((p_payload->>'reserveAmount')::numeric,0))::bigint;
 insert into public.tpl_solicitudes_proyecto(proyecto_id,actor_id,propiedad_id,tipo,nombre_contacto,email,telefono,mensaje,fecha_preferida,horario_preferido,monto,metadata)
 values(p_project_id,v_project.comprador_actor_id,v_project.propiedad_id,v_type,nullif(v_name,''),nullif(v_email,''),nullif(v_phone,''),nullif(v_message,''),nullif(p_payload#>>'{client,date}','')::date,p_payload#>>'{client,time}',nullif(v_amount,0),p_payload) returning id into v_request;
 insert into public.tpl_oportunidades(codigo,actor_cliente_id,proyecto_id,tipo,origen,estado,prioridad,nombre_contacto,email,telefono,mensaje,presupuesto,proxima_accion,proxima_accion_at,metadata)
 values('SOL-'||upper(substr(encode(gen_random_bytes(5),'hex'),1,8)),v_project.comprador_actor_id,p_project_id,case when v_type='reserva' then 'reserva' else 'consulta' end,'proyecto','nueva',case when v_type in ('reserva','visita') then 'alta' else 'media' end,nullif(v_name,''),nullif(v_email,''),nullif(v_phone,''),nullif(v_message,''),nullif(v_amount,0),'Responder solicitud de proyecto',now()+case when v_type='reserva' then interval '2 hours' else interval '1 day' end,jsonb_build_object('solicitud_id',v_request,'tipo',v_type));
 insert into public.tpl_tareas(actor_id,propiedad_id,proyecto_id,titulo,detalle,tipo,prioridad,vence_at,metadata)
 values(v_project.comprador_actor_id,v_project.propiedad_id,p_project_id,'Atender solicitud: '||v_type,coalesce(nullif(v_message,''),'Revisar datos y contactar al cliente.'),'solicitud_proyecto',case when v_type in ('reserva','visita') then 'urgente' else 'alta' end,now()+case when v_type='reserva' then interval '2 hours' else interval '1 day' end,jsonb_build_object('solicitud_id',v_request));
 insert into public.tpl_eventos(actor_id,propiedad_id,proyecto_id,evento,categoria,origen,pagina,prioridad,descripcion,metadata)
 values(v_project.comprador_actor_id,v_project.propiedad_id,p_project_id,'proyecto.solicitud_'||v_type,'comercial','proyecto','/proyecto.html',case when v_type='reserva' then 'alta' else 'media' end,'Solicitud guardada en Supabase.',jsonb_build_object('solicitud_id',v_request));
 return jsonb_build_object('ok',true,'request_id',v_request,'type',v_type);
end $$;
revoke all on function public.tpl_registrar_solicitud_proyecto_v1(uuid,text,jsonb) from public;
grant execute on function public.tpl_registrar_solicitud_proyecto_v1(uuid,text,jsonb) to anon, authenticated;

create or replace function public.tpl_auditoria_integridad_ecosistema_v1()
returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object(
 'propiedades_sin_publicacion', (select count(*) from tpl_propiedades p where p.estado in ('publicada','activa','disponible') and (p.publicacion_id is null or not exists(select 1 from tpl_publicaciones x where x.id=p.publicacion_id))),
 'proyectos_sin_cliente', (select count(*) from tpl_proyectos where comprador_actor_id is null),
 'proyectos_sin_propiedad', (select count(*) from tpl_proyectos where propiedad_id is null),
 'solicitudes_sin_oportunidad', (select count(*) from tpl_solicitudes_proyecto s where not exists(select 1 from tpl_oportunidades o where o.proyecto_id=s.proyecto_id and o.metadata->>'solicitud_id'=s.id::text)),
 'tasaciones_sin_propiedad', (select count(*) from tpl_tasaciones t where not exists(select 1 from tpl_propiedades p where p.id=t.propiedad_id)),
 'generado_at',now());
$$;
revoke all on function public.tpl_auditoria_integridad_ecosistema_v1() from public,anon,authenticated;
grant execute on function public.tpl_auditoria_integridad_ecosistema_v1() to service_role;

commit;
