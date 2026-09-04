begin;

create table if not exists public.tpl_ofertas_propiedad (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  oportunidad_id uuid references public.tpl_oportunidades(id) on delete set null,
  codigo text unique not null,
  tipo text not null check (tipo in ('economica','mejoras','mixta')),
  nombre_contacto text not null,
  email text not null,
  telefono text,
  monto_oferta bigint,
  mejoras jsonb not null default '[]'::jsonb,
  condicion text,
  mensaje text,
  estado text not null default 'enviada' check (estado in ('enviada','vista','aceptada','rechazada','contraoferta','cerrada')),
  respuesta_propietario text,
  monto_contraoferta bigint,
  mejoras_contraoferta jsonb not null default '[]'::jsonb,
  respondida_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tpl_ofertas_propiedad_propiedad_idx on public.tpl_ofertas_propiedad(propiedad_id,estado,created_at desc);
alter table public.tpl_ofertas_propiedad enable row level security;
revoke all on public.tpl_ofertas_propiedad from anon,authenticated;

create or replace function public.tpl_registrar_oferta_propiedad_v1(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
  v_prop uuid; v_id uuid; v_opp uuid; v_codigo text; v_tipo text; v_email text; v_nombre text; v_mejoras jsonb;
begin
  v_nombre:=trim(coalesce(p_payload->>'nombre_contacto',''));
  v_email:=lower(trim(coalesce(p_payload->>'email','')));
  v_tipo:=coalesce(nullif(p_payload->>'tipo',''),'economica');
  if v_tipo='oferta' then v_tipo:='economica'; end if;
  if v_tipo not in ('economica','mejoras','mixta') then raise exception 'TIPO_OFERTA_INVALIDO'; end if;
  if length(v_nombre)<2 then raise exception 'NOMBRE_REQUERIDO'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'CORREO_INVALIDO'; end if;
  if length(coalesce(p_payload->>'telefono',''))<8 then raise exception 'TELEFONO_INVALIDO'; end if;
  select id into v_prop from public.tpl_propiedades
   where id=nullif(p_payload->>'propiedad_id','')::uuid
      or codigo=coalesce(p_payload->>'propiedad_codigo','')
      or source_legacy_id=coalesce(p_payload->>'propiedad_codigo','')
   order by case when id=nullif(p_payload->>'propiedad_id','')::uuid then 0 else 1 end limit 1;
  if v_prop is null then raise exception 'PROPIEDAD_NO_ENCONTRADA'; end if;
  v_mejoras:=coalesce(p_payload->'mejoras','[]'::jsonb);
  if v_tipo in ('mejoras','mixta') and jsonb_array_length(v_mejoras)=0 then raise exception 'MEJORA_REQUERIDA'; end if;
  if v_tipo in ('economica','mixta') and coalesce(nullif(p_payload->>'monto_oferta','')::bigint,0)<=0 then raise exception 'MONTO_REQUERIDO'; end if;
  v_codigo:='OF-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.tpl_oportunidades(codigo,tipo,origen,estado,prioridad,nombre_contacto,email,telefono,mensaje,presupuesto,metadata)
  values(v_codigo,'compra','parcela.html','nueva','alta',v_nombre,v_email,p_payload->>'telefono',nullif(p_payload->>'mensaje',''),nullif(p_payload->>'monto_oferta','')::bigint,
    jsonb_build_object('propiedad_id',v_prop,'tipo_oferta',v_tipo,'mejoras',v_mejoras,'condicion',p_payload->>'condicion')) returning id into v_opp;
  insert into public.tpl_ofertas_propiedad(propiedad_id,oportunidad_id,codigo,tipo,nombre_contacto,email,telefono,monto_oferta,mejoras,condicion,mensaje)
  values(v_prop,v_opp,v_codigo,v_tipo,v_nombre,v_email,p_payload->>'telefono',nullif(p_payload->>'monto_oferta','')::bigint,v_mejoras,nullif(p_payload->>'condicion',''),nullif(p_payload->>'mensaje','')) returning id into v_id;
  insert into public.tpl_eventos(evento,metadata) values('oferta_propiedad_recibida',jsonb_build_object('oferta_id',v_id,'propiedad_id',v_prop,'tipo',v_tipo,'codigo',v_codigo));
  return jsonb_build_object('ok',true,'id',v_id,'codigo',v_codigo);
end $$;
grant execute on function public.tpl_registrar_oferta_propiedad_v1(jsonb) to anon,authenticated;

create or replace function public.tpl_propietario_ofertas_por_token_v1(p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_prop uuid;
begin
  select propiedad_id into v_prop from public.tpl_links_propietario where token_hash=encode(extensions.digest(convert_to(coalesce(trim(p_token),''),'UTF8'),'sha256'),'hex') and estado='activo' and expires_at>now() limit 1;
  if v_prop is null then return jsonb_build_object('ok',false,'error','TOKEN_INVALIDO'); end if;
  return jsonb_build_object('ok',true,'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'codigo',codigo,'tipo',tipo,'nombre_contacto',nombre_contacto,'monto_oferta',monto_oferta,'mejoras',mejoras,'condicion',condicion,'mensaje',mensaje,'estado',estado,'respuesta_propietario',respuesta_propietario,'monto_contraoferta',monto_contraoferta,'mejoras_contraoferta',mejoras_contraoferta,'created_at',created_at) order by created_at desc) from public.tpl_ofertas_propiedad where propiedad_id=v_prop),'[]'::jsonb));
end $$;
grant execute on function public.tpl_propietario_ofertas_por_token_v1(text) to anon,authenticated;

create or replace function public.tpl_propietario_responder_oferta_v1(p_token text,p_oferta_id uuid,p_accion text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_prop uuid; v_offer public.tpl_ofertas_propiedad; v_estado text;
begin
  select propiedad_id into v_prop from public.tpl_links_propietario where token_hash=encode(extensions.digest(convert_to(coalesce(trim(p_token),''),'UTF8'),'sha256'),'hex') and estado='activo' and expires_at>now() limit 1;
  if v_prop is null then raise exception 'TOKEN_INVALIDO'; end if;
  select * into v_offer from public.tpl_ofertas_propiedad where id=p_oferta_id and propiedad_id=v_prop for update;
  if v_offer.id is null then raise exception 'OFERTA_NO_ENCONTRADA'; end if;
  if p_accion not in ('aceptar','rechazar','contraoferta') then raise exception 'ACCION_INVALIDA'; end if;
  v_estado:=case p_accion when 'aceptar' then 'aceptada' when 'rechazar' then 'rechazada' else 'contraoferta' end;
  update public.tpl_ofertas_propiedad set estado=v_estado,respuesta_propietario=nullif(p_payload->>'mensaje',''),monto_contraoferta=case when p_accion='contraoferta' then nullif(p_payload->>'monto','')::bigint else null end,mejoras_contraoferta=case when p_accion='contraoferta' then coalesce(p_payload->'mejoras','[]'::jsonb) else '[]'::jsonb end,respondida_at=now(),updated_at=now() where id=v_offer.id;
  update public.tpl_oportunidades set estado=case when p_accion='aceptar' then 'aceptada' when p_accion='rechazar' then 'rechazada' else 'contactada' end,updated_at=now() where id=v_offer.oportunidad_id;
  insert into public.tpl_eventos(evento,metadata) values('oferta_propiedad_respondida',jsonb_build_object('oferta_id',v_offer.id,'propiedad_id',v_prop,'accion',p_accion));
  insert into public.tpl_comunicaciones_cola(canal,destinatario,plantilla,asunto,payload,estado,procesar_desde)
  values('email',v_offer.email,'generica','Respuesta a tu propuesta en Tu Parcela Lista',jsonb_build_object('titulo','El propietario respondió tu propuesta','mensaje',coalesce(nullif(p_payload->>'mensaje',''),'Revisa el estado de tu propuesta con el equipo TPL.'),'accion_url','https://www.parcelalista.cl'),'pendiente',now());
  return jsonb_build_object('ok',true,'estado',v_estado);
end $$;
grant execute on function public.tpl_propietario_responder_oferta_v1(text,uuid,text,jsonb) to anon,authenticated;

create or replace function public.tpl_activar_partner_al_comprar_v1()
returns trigger language plpgsql security definer set search_path=public as $$
declare n record;
begin
  if new.estado in ('comprada','vendida') and coalesce(old.estado,'') not in ('comprada','vendida') then
    for n in select id from public.tpl_necesidades_proyecto where propiedad_id=new.id and estado in ('detectada','sugerida','agregada') loop
      perform public.tpl_refrescar_matches_necesidad_v1(n.id);
    end loop;
    insert into public.tpl_eventos(evento,metadata) values('propiedad_modo_comprada_activado',jsonb_build_object('propiedad_id',new.id,'estado',new.estado));
  end if;
  return new;
end $$;
drop trigger if exists trg_tpl_activar_partner_al_comprar on public.tpl_propiedades;
create trigger trg_tpl_activar_partner_al_comprar after update of estado on public.tpl_propiedades for each row execute function public.tpl_activar_partner_al_comprar_v1();

commit;
