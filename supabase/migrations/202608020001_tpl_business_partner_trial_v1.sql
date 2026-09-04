-- TPL Business multirol + activación Partner con prueba de 30 días
create extension if not exists pgcrypto;

alter table public.tpl_partner_postulaciones
  add column if not exists propuesta_corta text,
  add column if not exists diferenciacion text,
  add column if not exists ultimo_trabajo jsonb not null default '{}'::jsonb,
  add column if not exists puntaje_completitud integer not null default 0;

alter table public.tpl_partner_perfiles
  add column if not exists propuesta_corta text,
  add column if not exists diferenciacion text,
  add column if not exists ultimo_trabajo jsonb not null default '{}'::jsonb,
  add column if not exists puntaje_completitud integer not null default 0,
  add column if not exists puntaje_reputacion numeric(5,2) not null default 0;

alter table public.tpl_partner_postulaciones drop constraint if exists tpl_partner_postulaciones_puntaje_completitud_check;
alter table public.tpl_partner_postulaciones add constraint tpl_partner_postulaciones_puntaje_completitud_check check (puntaje_completitud between 0 and 100);
alter table public.tpl_partner_perfiles drop constraint if exists tpl_partner_perfiles_puntaje_completitud_check;
alter table public.tpl_partner_perfiles add constraint tpl_partner_perfiles_puntaje_completitud_check check (puntaje_completitud between 0 and 100);
alter table public.tpl_partner_perfiles drop constraint if exists tpl_partner_perfiles_puntaje_reputacion_check;
alter table public.tpl_partner_perfiles add constraint tpl_partner_perfiles_puntaje_reputacion_check check (puntaje_reputacion between 0 and 100);

insert into public.tpl_planes_comerciales(codigo,nombre,descripcion,nivel,precio_mensual_clp,dias_prueba,caracteristicas,limites)
values('partner_basico','Partner Básico','Perfil, landing y CRM básico para proveedores de servicios del campo.',1,null,30,
 '["Perfil Partner público","Landing comercial editable","CRM básico de oportunidades","Recepción de solicitudes","Galería de trabajos","Cotizaciones y agenda","Estadísticas básicas","Acceso a TPL Studio"]'::jsonb,
 '{"landings":1,"usuarios":1,"campanas_activas":1}'::jsonb)
on conflict(codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,dias_prueba=30,caracteristicas=excluded.caracteristicas,limites=excluded.limites,activo=true,updated_at=now();

create table if not exists public.tpl_onboarding_partner (
 id uuid primary key default gen_random_uuid(),
 postulacion_id uuid unique not null references public.tpl_partner_postulaciones(id) on delete cascade,
 actor_id uuid references public.tpl_actores(id) on delete set null,
 perfil_id uuid references public.tpl_partner_perfiles(id) on delete set null,
 auth_user_id uuid references auth.users(id) on delete set null,
 suscripcion_id uuid references public.tpl_suscripciones(id) on delete set null,
 campaign_id uuid references public.studio_campaigns(id) on delete set null,
 email text not null,
 estado text not null default 'pendiente' check(estado in ('pendiente','procesando','completado','error')),
 intentos integer not null default 0,
 correo_aprobacion_estado text not null default 'pendiente',
 correo_acceso_estado text not null default 'pendiente',
 ultimo_error text,
 completado_at timestamptz,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.tpl_partner_solicitudes (
 id uuid primary key default gen_random_uuid(),
 codigo text unique not null default ('SOL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,9))),
 partner_actor_id uuid not null references public.tpl_actores(id) on delete cascade,
 cliente_actor_id uuid references public.tpl_actores(id) on delete set null,
 servicio_id uuid references public.tpl_servicios(id) on delete set null,
 estado text not null default 'nueva' check(estado in ('nueva','contactada','cotizando','propuesta_enviada','aceptada','rechazada','cerrada')),
 nombre_cliente text,
 email_cliente text,
 telefono_cliente text,
 comuna text,
 descripcion text not null,
 presupuesto_referencial bigint,
 origen text not null default 'landing_partner',
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.tpl_propuestas_partner (
 id uuid primary key default gen_random_uuid(),
 solicitud_id uuid not null references public.tpl_partner_solicitudes(id) on delete cascade,
 partner_actor_id uuid not null references public.tpl_actores(id) on delete cascade,
 estado text not null default 'borrador' check(estado in ('borrador','enviada','vista','aceptada','rechazada','vencida')),
 alcance text not null,
 monto_total bigint,
 porcentaje_anticipo numeric(5,2) not null default 0,
 modalidades_pago jsonb not null default '[]'::jsonb,
 etapas jsonb not null default '[]'::jsonb,
 garantia text,
 vigencia_hasta date,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists tpl_partner_solicitudes_partner_idx on public.tpl_partner_solicitudes(partner_actor_id,estado,created_at desc);
create index if not exists tpl_propuestas_partner_partner_idx on public.tpl_propuestas_partner(partner_actor_id,estado,created_at desc);

create or replace function public.tpl_postular_partner_v2(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_codigo text; v_token uuid; v_mail text; begin
 v_mail:=lower(trim(coalesce(p_payload->>'correo','')));
 if v_mail !~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then raise exception 'CORREO_INVALIDO'; end if;
 if length(trim(coalesce(p_payload->>'whatsapp',''))) < 8 then raise exception 'WHATSAPP_INVALIDO'; end if;
 if length(trim(coalesce(p_payload->>'descripcion_servicios',''))) < 40 then raise exception 'DESCRIPCION_MUY_CORTA'; end if;
 if coalesce((p_payload->>'acepta_terminos')::boolean,false)=false or coalesce((p_payload->>'acepta_privacidad')::boolean,false)=false then raise exception 'CONSENTIMIENTOS_REQUERIDOS'; end if;
 if exists(select 1 from public.tpl_partner_postulaciones where lower(correo)=v_mail and created_at>now()-interval '14 days' and estado not in ('rechazada','archivada')) then raise exception 'POSTULACION_RECIENTE_EXISTENTE'; end if;
 v_codigo:='PART-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 insert into public.tpl_partner_postulaciones(codigo,plan_solicitado,nombre_comercial,nombre_responsable,telefono,whatsapp,correo,descripcion_servicios,tipo_servicio,especialidades,actividades,etapas_servicio,region,comunas_atendidas,anos_experiencia,disponibilidad,emite_factura,acepta_proyectos_tpl,trabaja_bajo_marca_tpl,modalidades_pago,porcentaje_anticipo,garantia_servicio,propuesta_corta,diferenciacion,ultimo_trabajo,puntaje_completitud,metadata)
 values(v_codigo,coalesce(nullif(p_payload->>'plan_solicitado',''),'bienvenida'),trim(p_payload->>'nombre_comercial'),trim(p_payload->>'nombre_responsable'),p_payload->>'telefono',p_payload->>'whatsapp',v_mail,trim(p_payload->>'descripcion_servicios'),p_payload->>'tipo_servicio',coalesce(p_payload->'especialidades','[]'),coalesce(p_payload->'actividades','[]'),coalesce(p_payload->'etapas_servicio','[]'),p_payload->>'region',coalesce(p_payload->'comunas_atendidas','[]'),coalesce((p_payload->>'anos_experiencia')::int,0),p_payload->>'disponibilidad',coalesce((p_payload->>'emite_factura')::boolean,false),coalesce((p_payload->>'acepta_proyectos_tpl')::boolean,false),coalesce((p_payload->>'trabaja_bajo_marca_tpl')::boolean,false),coalesce(p_payload->'modalidades_pago','[]'),coalesce((p_payload->>'porcentaje_anticipo')::numeric,0),p_payload->>'garantia_servicio',left(trim(coalesce(p_payload->>'propuesta_corta','')),100),trim(coalesce(p_payload->>'diferenciacion','')),coalesce(p_payload->'ultimo_trabajo','{}'),greatest(0,least(100,coalesce((p_payload->>'puntaje_completitud_inicial')::int,0))),jsonb_build_object('origen','red_partner_v2','autoriza_contacto',coalesce((p_payload->>'autoriza_contacto')::boolean,false),'condiciones_pago',coalesce(p_payload->'condiciones_pago','{}')))
 returning id,upload_token into v_id,v_token;
 insert into public.tpl_eventos(evento,metadata) values('partner_postulacion_recibida',jsonb_build_object('postulacion_id',v_id,'codigo',v_codigo,'correo',v_mail)) on conflict do nothing;
 return jsonb_build_object('ok',true,'id',v_id,'codigo',v_codigo,'upload_token',v_token);
end $$;

create or replace function public.tpl_partner_publico_por_slug_v2(p_slug text)
returns jsonb language sql stable security definer set search_path=public,storage as $$
 select coalesce((select jsonb_build_object(
 'nombre_comercial',p.nombre_comercial,'nombre_responsable',p.nombre_responsable,'descripcion_servicios',p.descripcion_servicios,'tipo_servicio',p.tipo_servicio,'especialidades',p.especialidades,'actividades',p.actividades,'etapas_servicio',p.etapas_servicio,'modalidades_pago',p.modalidades_pago,'porcentaje_anticipo',p.porcentaje_anticipo,'garantia_servicio',p.garantia_servicio,'region',p.region,'comunas_atendidas',p.comunas_atendidas,'anos_experiencia',p.anos_experiencia,'disponibilidad',p.disponibilidad,'emite_factura',p.emite_factura,'whatsapp',p.whatsapp,'correo',p.correo,'slug',p.slug,'curriculum_publicado',p.curriculum_publicado,'logo_url',p.logo_url,'galeria_urls',p.galeria_urls,'propuesta_corta',p.propuesta_corta,'diferenciacion',p.diferenciacion,'ultimo_trabajo',p.ultimo_trabajo,'puntaje_completitud',p.puntaje_completitud,'puntaje_reputacion',p.puntaje_reputacion)
 from public.tpl_partner_perfiles p where p.slug=p_slug and p.estado='publicado' limit 1),'null'::jsonb);
$$;

create or replace function public.tpl_portal_resumen_v1()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor public.tpl_actores; v_roles jsonb; v_owner jsonb; v_partner jsonb; v_profile public.tpl_partner_perfiles; v_sub jsonb; v_studio jsonb;
begin
 select a.* into v_actor from public.tpl_actores a where lower(a.email)=lower(coalesce(auth.jwt()->>'email','')) order by a.created_at limit 1;
 if v_actor.id is null then return jsonb_build_object('sin_actor',true,'mensaje','Tu cuenta todavía no está vinculada a un perfil TPL.'); end if;
 select coalesce(jsonb_agg(ar.rol order by ar.rol),'[]') into v_roles from public.tpl_actor_roles ar where ar.actor_id=v_actor.id;
 if exists(select 1 from public.tpl_propiedades where propietario_actor_id=v_actor.id) then v_owner:=public.tpl_agenda_propietario_resumen_v1(); end if;
 select * into v_profile from public.tpl_partner_perfiles where actor_id=v_actor.id order by created_at desc limit 1;
 if v_profile.id is not null then
   select to_jsonb(x) into v_sub from (select s.*,p.codigo plan_codigo,p.nombre plan_nombre,p.dias_prueba, greatest(0,ceil(extract(epoch from (coalesce(s.prueba_hasta,s.periodo_hasta,now())-now()))/86400))::int dias_restantes from public.tpl_suscripciones s join public.tpl_planes_comerciales p on p.id=s.plan_id where s.actor_id=v_actor.id and p.codigo like 'partner_%' and s.estado in ('prueba','activa') order by s.created_at desc limit 1)x;
   begin v_studio:=public.tpl_studio_resumen_v1(); exception when others then v_studio:='{}'::jsonb; end;
   v_partner:=jsonb_build_object('perfil',to_jsonb(v_profile),'suscripcion',v_sub,'studio',v_studio,
     'resumen',jsonb_build_object(
       'solicitudes',(select count(*) from public.tpl_partner_solicitudes where partner_actor_id=v_actor.id),
       'solicitudes_nuevas',(select count(*) from public.tpl_partner_solicitudes where partner_actor_id=v_actor.id and estado='nueva'),
       'propuestas',(select count(*) from public.tpl_propuestas_partner where partner_actor_id=v_actor.id),
       'trabajos',(select count(*) from public.tpl_ordenes_servicio where partner_actor_id=v_actor.id),
       'trabajos_completados',(select count(*) from public.tpl_ordenes_servicio where partner_actor_id=v_actor.id and estado in ('terminada','completada'))),
     'solicitudes',(select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc),'[]') from (select * from public.tpl_partner_solicitudes where partner_actor_id=v_actor.id order by created_at desc limit 30)s),
     'propuestas',(select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc),'[]') from (select * from public.tpl_propuestas_partner where partner_actor_id=v_actor.id order by created_at desc limit 30)p),
     'trabajos',(select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc),'[]') from (select * from public.tpl_ordenes_servicio where partner_actor_id=v_actor.id order by created_at desc limit 30)o));
 end if;
 return jsonb_build_object('actor',jsonb_build_object('id',v_actor.id,'nombre',v_actor.nombre,'email',v_actor.email),'roles',v_roles,'propietario',v_owner,'partner',v_partner,'modo_preferido',case when v_partner is not null then 'partner' else 'propietario' end);
end $$;
grant execute on function public.tpl_portal_resumen_v1() to authenticated;

-- Al aprobar, copia todos los campos y deja el onboarding pendiente para la Edge Function.
create or replace function public.tpl_revisar_partner_v2(p_id uuid,p_decision text,p_motivo text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v public.tpl_partner_postulaciones;v_actor uuid;v_slug text;v_perfil uuid;begin
 if not public.tpl_es_admin() then raise exception 'NO_AUTORIZADO'; end if;
 select * into v from public.tpl_partner_postulaciones where id=p_id for update;
 if v.id is null then raise exception 'POSTULACION_NO_EXISTE'; end if;
 if p_decision not in ('aprobada','requiere_cambios','rechazada','archivada') then raise exception 'DECISION_INVALIDA'; end if;
 update public.tpl_partner_postulaciones set estado=p_decision,motivo_revision=p_motivo,revisada_por=auth.uid(),revisada_at=now(),updated_at=now() where id=p_id;
 if p_decision='aprobada' then
  select id into v_actor from public.tpl_actores where lower(email)=lower(v.correo) order by created_at limit 1;
  if v_actor is null then insert into public.tpl_actores(tipo_actor,nombre,email,telefono,region,comuna,origen,estado,metadata) values('persona',v.nombre_responsable,v.correo,coalesce(v.whatsapp,v.telefono),v.region,null,'red_partner_v2','activo',jsonb_build_object('nombre_comercial',v.nombre_comercial)) returning id into v_actor; end if;
  insert into public.tpl_actor_roles(actor_id,rol,metadata) values(v_actor,'partner',jsonb_build_object('postulacion_id',v.id)) on conflict(actor_id,rol) do update set metadata=excluded.metadata;
  v_slug:=public.tpl_slugify_v2(v.nombre_comercial)||'-'||substr(replace(v.id::text,'-',''),1,6);
  insert into public.tpl_partner_perfiles(actor_id,postulacion_id,slug,nombre_comercial,nombre_responsable,descripcion_servicios,tipo_servicio,especialidades,actividades,etapas_servicio,modalidades_pago,porcentaje_anticipo,garantia_servicio,region,comunas_atendidas,anos_experiencia,disponibilidad,emite_factura,whatsapp,correo,logo_url,galeria_urls,propuesta_corta,diferenciacion,ultimo_trabajo,puntaje_completitud,metadata)
  values(v_actor,v.id,v_slug,v.nombre_comercial,v.nombre_responsable,v.descripcion_servicios,v.tipo_servicio,v.especialidades,v.actividades,v.etapas_servicio,v.modalidades_pago,v.porcentaje_anticipo,v.garantia_servicio,v.region,v.comunas_atendidas,v.anos_experiencia,v.disponibilidad,v.emite_factura,v.whatsapp,v.correo,null,'[]',v.propuesta_corta,v.diferenciacion,v.ultimo_trabajo,v.puntaje_completitud,jsonb_build_object('plan',v.plan_solicitado))
  on conflict(actor_id) do update set nombre_comercial=excluded.nombre_comercial,descripcion_servicios=excluded.descripcion_servicios,especialidades=excluded.especialidades,actividades=excluded.actividades,etapas_servicio=excluded.etapas_servicio,modalidades_pago=excluded.modalidades_pago,propuesta_corta=excluded.propuesta_corta,diferenciacion=excluded.diferenciacion,ultimo_trabajo=excluded.ultimo_trabajo,puntaje_completitud=excluded.puntaje_completitud,updated_at=now()
  returning id into v_perfil;
  update public.tpl_partner_postulaciones set actor_id=v_actor where id=v.id;
  insert into public.tpl_onboarding_partner(postulacion_id,actor_id,perfil_id,email,estado,metadata) values(v.id,v_actor,v_perfil,lower(v.correo),'pendiente',jsonb_build_object('aprobada_por',auth.uid())) on conflict(postulacion_id) do update set actor_id=excluded.actor_id,perfil_id=excluded.perfil_id,email=excluded.email,estado=case when tpl_onboarding_partner.estado='completado' then 'completado' else 'pendiente' end,updated_at=now();
 end if;
 return jsonb_build_object('ok',true,'estado',p_decision,'actor_id',v_actor,'perfil_id',v_perfil,'slug',v_slug,'requiere_activacion',p_decision='aprobada');
end $$;
