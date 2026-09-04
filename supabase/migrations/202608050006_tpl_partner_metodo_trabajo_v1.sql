begin;

-- P10: conserva el método de trabajo estructurado sin romper etapas_servicio existente.
create or replace function public.tpl_postular_partner_v2(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_codigo text; v_token uuid; v_mail text; begin
 v_mail:=lower(trim(coalesce(p_payload->>'correo','')));
 if v_mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'CORREO_INVALIDO'; end if;
 if length(trim(coalesce(p_payload->>'whatsapp',''))) < 8 then raise exception 'WHATSAPP_INVALIDO'; end if;
 if length(trim(coalesce(p_payload->>'descripcion_servicios',''))) < 40 then raise exception 'DESCRIPCION_MUY_CORTA'; end if;
 if coalesce((p_payload->>'acepta_terminos')::boolean,false)=false or coalesce((p_payload->>'acepta_privacidad')::boolean,false)=false then raise exception 'CONSENTIMIENTOS_REQUERIDOS'; end if;
 if exists(select 1 from public.tpl_partner_postulaciones where lower(correo)=v_mail and created_at>now()-interval '14 days' and estado not in ('rechazada','archivada')) then raise exception 'POSTULACION_RECIENTE_EXISTENTE'; end if;
 v_codigo:='PART-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 insert into public.tpl_partner_postulaciones(codigo,plan_solicitado,nombre_comercial,nombre_responsable,telefono,whatsapp,correo,descripcion_servicios,tipo_servicio,especialidades,actividades,etapas_servicio,region,comunas_atendidas,anos_experiencia,disponibilidad,emite_factura,acepta_proyectos_tpl,trabaja_bajo_marca_tpl,modalidades_pago,porcentaje_anticipo,garantia_servicio,propuesta_corta,diferenciacion,ultimo_trabajo,puntaje_completitud,metadata)
 values(v_codigo,coalesce(nullif(p_payload->>'plan_solicitado',''),'bienvenida'),trim(p_payload->>'nombre_comercial'),trim(p_payload->>'nombre_responsable'),p_payload->>'telefono',p_payload->>'whatsapp',v_mail,trim(p_payload->>'descripcion_servicios'),p_payload->>'tipo_servicio',coalesce(p_payload->'especialidades','[]'),coalesce(p_payload->'actividades','[]'),coalesce(p_payload->'etapas_servicio','[]'),p_payload->>'region',coalesce(p_payload->'comunas_atendidas','[]'),coalesce((p_payload->>'anos_experiencia')::int,0),p_payload->>'disponibilidad',coalesce((p_payload->>'emite_factura')::boolean,false),coalesce((p_payload->>'acepta_proyectos_tpl')::boolean,false),coalesce((p_payload->>'trabaja_bajo_marca_tpl')::boolean,false),coalesce(p_payload->'modalidades_pago','[]'),coalesce((p_payload->>'porcentaje_anticipo')::numeric,0),p_payload->>'garantia_servicio',left(trim(coalesce(p_payload->>'propuesta_corta','')),100),trim(coalesce(p_payload->>'diferenciacion','')),coalesce(p_payload->'ultimo_trabajo','{}'),greatest(0,least(100,coalesce((p_payload->>'puntaje_completitud_inicial')::int,0))),jsonb_build_object(
   'origen','red_partner_v2',
   'autoriza_contacto',coalesce((p_payload->>'autoriza_contacto')::boolean,false),
   'condiciones_pago',coalesce(p_payload->'condiciones_pago','{}'),
   'metodo_trabajo',coalesce(p_payload->'metodo_trabajo','{}'::jsonb)
 ))
 returning id,upload_token into v_id,v_token;
 insert into public.tpl_eventos(evento,metadata) values('partner_postulacion_recibida',jsonb_build_object('postulacion_id',v_id,'codigo',v_codigo,'correo',v_mail,'metodo_calidad',p_payload#>>'{metodo_trabajo,score}')) on conflict do nothing;
 return jsonb_build_object('ok',true,'id',v_id,'codigo',v_codigo,'upload_token',v_token);
end $$;

grant execute on function public.tpl_postular_partner_v2(jsonb) to anon, authenticated;

-- Expone el método aprobado desde la misma ficha canónica del Partner.
create or replace function public.tpl_partner_publico_por_slug_v2(p_slug text)
returns jsonb language sql stable security definer set search_path=public,storage as $$
 select coalesce((select jsonb_build_object(
 'nombre_comercial',p.nombre_comercial,'nombre_responsable',p.nombre_responsable,'descripcion_servicios',p.descripcion_servicios,'tipo_servicio',p.tipo_servicio,'especialidades',p.especialidades,'actividades',p.actividades,'etapas_servicio',p.etapas_servicio,'modalidades_pago',p.modalidades_pago,'porcentaje_anticipo',p.porcentaje_anticipo,'garantia_servicio',p.garantia_servicio,'region',p.region,'comunas_atendidas',p.comunas_atendidas,'anos_experiencia',p.anos_experiencia,'disponibilidad',p.disponibilidad,'emite_factura',p.emite_factura,'whatsapp',p.whatsapp,'correo',p.correo,'slug',p.slug,'curriculum_publicado',p.curriculum_publicado,'logo_url',p.logo_url,'galeria_urls',p.galeria_urls,'propuesta_corta',p.propuesta_corta,'diferenciacion',p.diferenciacion,'ultimo_trabajo',p.ultimo_trabajo,'puntaje_completitud',p.puntaje_completitud,'puntaje_reputacion',p.puntaje_reputacion,
 'metodo_trabajo',coalesce(p.metadata->'metodo_trabajo','{}'::jsonb))
 from public.tpl_partner_perfiles p where p.slug=p_slug and p.estado='publicado' limit 1),'null'::jsonb);
$$;

grant execute on function public.tpl_partner_publico_por_slug_v2(text) to anon, authenticated;

-- Conserva el método al aprobar una postulación, sin cambiar el esquema canónico.
create or replace function public.tpl_partner_sincronizar_metodo_desde_postulacion_v1(p_postulacion_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_method jsonb; begin
 if not public.tpl_es_admin() then raise exception 'NO_AUTORIZADO'; end if;
 select coalesce(metadata->'metodo_trabajo','{}'::jsonb) into v_method from public.tpl_partner_postulaciones where id=p_postulacion_id;
 if v_method is null then return false; end if;
 update public.tpl_partner_perfiles p set metadata=coalesce(p.metadata,'{}'::jsonb)||jsonb_build_object('metodo_trabajo',v_method), updated_at=now()
 where p.postulacion_id=p_postulacion_id;
 return found;
end $$;

grant execute on function public.tpl_partner_sincronizar_metodo_desde_postulacion_v1(uuid) to authenticated;


-- Copia automáticamente el método cuando CRM aprueba y crea/actualiza el perfil.
create or replace function public.tpl_partner_perfil_heredar_metodo_v1()
returns trigger language plpgsql set search_path=public as $$
declare v_method jsonb; begin
 if new.postulacion_id is not null then
   select metadata->'metodo_trabajo' into v_method
   from public.tpl_partner_postulaciones
   where id=new.postulacion_id;
   if v_method is not null and v_method <> '{}'::jsonb then
     new.metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('metodo_trabajo',v_method);
   end if;
 end if;
 return new;
end $$;

drop trigger if exists trg_tpl_partner_perfil_heredar_metodo_v1 on public.tpl_partner_perfiles;
create trigger trg_tpl_partner_perfil_heredar_metodo_v1
before insert or update of postulacion_id on public.tpl_partner_perfiles
for each row execute function public.tpl_partner_perfil_heredar_metodo_v1();

commit;
