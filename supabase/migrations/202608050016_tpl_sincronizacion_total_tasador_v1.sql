-- TPL · T3 · Sincronización total del Tasador, fotos reales y cola de recálculo

create table if not exists public.tpl_cola_recalculo_tasacion (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  actualizacion_id uuid references public.tpl_actualizaciones_propietario(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente','procesando','completado','requiere_revision','error','cancelado')),
  intentos integer not null default 0,
  solicitado_por text not null default 'propietario',
  motivo text,
  entrada jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  error text,
  procesado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_cola_recalculo_pendiente_idx
  on public.tpl_cola_recalculo_tasacion(estado, created_at);
create unique index if not exists tpl_cola_recalculo_un_pendiente_idx
  on public.tpl_cola_recalculo_tasacion(propiedad_id)
  where estado in ('pendiente','procesando');

drop trigger if exists trg_tpl_cola_recalculo_updated_at on public.tpl_cola_recalculo_tasacion;
create trigger trg_tpl_cola_recalculo_updated_at
before update on public.tpl_cola_recalculo_tasacion
for each row execute function public.tpl_set_updated_at();

alter table public.tpl_cola_recalculo_tasacion enable row level security;
revoke all on table public.tpl_cola_recalculo_tasacion from anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tpl-propiedades-propietario','tpl-propiedades-propietario',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Sincroniza el JSON canónico con las columnas públicas que consume parcela.html.
create or replace function public.tpl_sincronizar_tasador_propiedad_v1(p_propiedad_id uuid,p_tasador jsonb)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
begin
  if p_propiedad_id is null or jsonb_typeof(coalesce(p_tasador,'{}'::jsonb))<>'object' then return; end if;
  update public.tpl_propiedades
  set
    region=coalesce(nullif(trim(p_tasador->>'region'),''),region),
    comuna=coalesce(nullif(trim(p_tasador->>'comuna'),''),comuna),
    lat=coalesce(case when (p_tasador->>'lat')~'^-?\d{1,3}([.]\d+)?$' then (p_tasador->>'lat')::numeric end,lat),
    lng=coalesce(case when (p_tasador->>'lng')~'^-?\d{1,3}([.]\d+)?$' then (p_tasador->>'lng')::numeric end,lng),
    acceso=coalesce(nullif(trim(p_tasador->>'access'),''),acceso),
    topografia=coalesce(nullif(trim(p_tasador->>'topography'),''),topografia),
    suelo=coalesce(nullif(trim(p_tasador->>'soil'),''),suelo),
    exposicion=coalesce(nullif(trim(p_tasador->>'exposure'),''),exposicion),
    vista_principal=coalesce(nullif(trim(p_tasador->>'view'),''),vista_principal),
    vegetacion=coalesce(nullif(trim(p_tasador->>'vegetation'),''),vegetacion),
    agua=coalesce(nullif(trim(p_tasador->>'water'),''),agua),
    electricidad=coalesce(nullif(trim(p_tasador->>'electricity'),''),electricidad),
    cierre_perimetral=coalesce(nullif(trim(p_tasador->>'fencing'),''),cierre_perimetral),
    porton=coalesce(nullif(trim(p_tasador->>'gate'),''),porton),
    condominio=coalesce(case lower(trim(p_tasador->>'condominium')) when 'si' then true when 'sí' then true when 'true' then true when 'no' then false when 'false' then false end,condominio),
    distancia_ruta_principal_km=coalesce(case when (p_tasador->>'route_distance')~'^\d{1,5}([.]\d+)?$' then (p_tasador->>'route_distance')::numeric end,distancia_ruta_principal_km),
    atributos_naturales=case when jsonb_typeof(p_tasador->'nature')='array' then p_tasador->'nature' else atributos_naturales end,
    casa_datos=coalesce(casa_datos,'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object(
      'superficie_m2',case when (p_tasador->>'area_casa')~'^\d{1,6}([.]\d+)?$' then (p_tasador->>'area_casa')::numeric end,
      'material',nullif(trim(p_tasador->>'material_casa'),''),
      'anio_construccion',case when (p_tasador->>'anio_construccion')~'^\d{4}$' then (p_tasador->>'anio_construccion')::int end,
      'estado',nullif(trim(p_tasador->>'estado_casa'),''),
      'anio_remodelacion',case when (p_tasador->>'anio_remodelacion')~'^\d{4}$' then (p_tasador->>'anio_remodelacion')::int end,
      'dormitorios',case when (p_tasador->>'dormitorios')~'^\d{1,2}$' then (p_tasador->>'dormitorios')::int end,
      'banos',case when (p_tasador->>'banos')~'^\d{1,2}$' then (p_tasador->>'banos')::int end,
      'pisos',case when (p_tasador->>'pisos')~'^\d{1,2}$' then (p_tasador->>'pisos')::int end,
      'obras',case when jsonb_typeof(p_tasador->'works')='object' then p_tasador->'works' end,
      'diferenciador',nullif(trim(p_tasador->>'differentiator'),'')
    )),
    updated_at=now()
  where id=p_propiedad_id;
end;
$$;
revoke all on function public.tpl_sincronizar_tasador_propiedad_v1(uuid,jsonb) from public;

-- Resolver seguro para las Edge Functions usando el token del propietario.
create or replace function public.tpl_propietario_contexto_proceso_v1(p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare v_hash text; v_link public.tpl_links_propietario; v_prop public.tpl_propiedades%rowtype;
begin
  v_hash:=public.tpl_token_hash_seguro_v1(p_token);
  select * into v_link from public.tpl_links_propietario where token_hash=v_hash and estado='activo' and expires_at>now() limit 1;
  if v_link.id is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  select * into v_prop from public.tpl_propiedades where id=v_link.propiedad_id;
  if v_prop.id is null then return jsonb_build_object('ok',false,'error','PROPIEDAD_NO_EXISTE'); end if;
  return jsonb_build_object('ok',true,'link_id',v_link.id,'propiedad',to_jsonb(v_prop));
end;
$$;
revoke all on function public.tpl_propietario_contexto_proceso_v1(text) from public;
grant execute on function public.tpl_propietario_contexto_proceso_v1(text) to service_role;

-- Registro seguro de foto ya subida por la Edge Function.
create or replace function public.tpl_registrar_foto_propietario_v1(p_propiedad_id uuid,p_storage_path text,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public,extensions
as $$
declare v_id uuid; v_order int;
begin
  if auth.role()<>'service_role' then raise exception 'NO_AUTORIZADO'; end if;
  select coalesce(max(orden),-1)+1 into v_order from public.tpl_propiedad_imagenes where propiedad_id=p_propiedad_id;
  insert into public.tpl_propiedad_imagenes(propiedad_id,storage_path,tipo,orden,es_portada,alt,metadata)
  values(p_propiedad_id,left(p_storage_path,500),'foto',v_order,false,'Fotografía aportada por el propietario',coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('origen','link_propietario','estado_revision','pendiente'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.tpl_registrar_foto_propietario_v1(uuid,text,jsonb) from public;
grant execute on function public.tpl_registrar_foto_propietario_v1(uuid,text,jsonb) to service_role;

-- Reemplaza T2A: guarda, sincroniza columnas y encola automáticamente.
create or replace function public.tpl_propietario_actualizar_por_token_v1(p_token text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_hash text; v_link public.tpl_links_propietario; v_old public.tpl_propiedades%rowtype; v_new public.tpl_propiedades%rowtype;
  v_clean jsonb; v_tasador jsonb := '{}'::jsonb; v_contacto jsonb := '{}'::jsonb; v_fotos jsonb := '[]'::jsonb;
  v_fields text[] := array[]::text[]; v_recalculo boolean := false; v_update_id uuid; v_queue_id uuid;
begin
  v_hash:=public.tpl_token_hash_seguro_v1(p_token);
  if v_hash is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>160000 then return jsonb_build_object('ok',false,'error','DATOS_INVALIDOS'); end if;
  select * into v_link from public.tpl_links_propietario where token_hash=v_hash and estado='activo' and expires_at>now() for update;
  if v_link.id is null then return jsonb_build_object('ok',false,'error','ENLACE_INVALIDO_O_VENCIDO'); end if;
  select * into v_old from public.tpl_propiedades where id=v_link.propiedad_id for update;
  if v_old.id is null then return jsonb_build_object('ok',false,'error','PROPIEDAD_NO_EXISTE'); end if;
  if jsonb_typeof(p_payload->'fotos')='array' then select coalesce(jsonb_agg(value),'[]'::jsonb) into v_fotos from (select value from jsonb_array_elements(p_payload->'fotos') limit 20) f; end if;
  if jsonb_typeof(p_payload->'contacto')='object' then v_contacto:=jsonb_strip_nulls(jsonb_build_object('nombre',left(nullif(trim(p_payload->'contacto'->>'nombre'),''),120),'email',left(lower(nullif(trim(coalesce(p_payload->'contacto'->>'email',p_payload->'contacto'->>'correo')),'')),254),'whatsapp',left(nullif(trim(coalesce(p_payload->'contacto'->>'whatsapp',p_payload->'contacto'->>'telefono')),''),40),'tipo',left(nullif(trim(p_payload->'contacto'->>'tipo'),''),30))); end if;
  if jsonb_typeof(p_payload->'tasador_entrada')='object' then v_tasador:=p_payload->'tasador_entrada'||jsonb_build_object('actualizado_por','propietario','actualizado_at',now()); end if;
  v_recalculo:=coalesce((p_payload->>'solicitar_recalculo')::boolean,false);
  v_clean:=jsonb_strip_nulls(jsonb_build_object('titulo',left(nullif(trim(p_payload->>'titulo'),''),160),'descripcion',left(nullif(trim(p_payload->>'descripcion'),''),5000),'precio_publicado',case when (p_payload->>'precio_publicado')~'^\d{1,12}$' then (p_payload->>'precio_publicado')::bigint end,'superficie_m2',case when (p_payload->>'superficie_m2')~'^\d{1,9}([.]\d{1,2})?$' then (p_payload->>'superficie_m2')::numeric end,'agua',left(nullif(trim(p_payload->>'agua'),''),120),'electricidad',left(nullif(trim(p_payload->>'electricidad'),''),120),'acceso',left(nullif(trim(p_payload->>'acceso'),''),160),'topografia',left(nullif(trim(p_payload->>'topografia'),''),120),'rol_situacion',left(nullif(trim(p_payload->>'rol_situacion'),''),160),'cierre_perimetral',left(nullif(trim(p_payload->>'cierre_perimetral'),''),120),'porton',left(nullif(trim(p_payload->>'porton'),''),120)));
  update public.tpl_propiedades set titulo=coalesce(v_clean->>'titulo',titulo),descripcion=coalesce(v_clean->>'descripcion',descripcion),precio_publicado=coalesce((v_clean->>'precio_publicado')::bigint,precio_publicado),superficie_m2=coalesce((v_clean->>'superficie_m2')::numeric,superficie_m2),agua=coalesce(v_clean->>'agua',agua),electricidad=coalesce(v_clean->>'electricidad',electricidad),acceso=coalesce(v_clean->>'acceso',acceso),topografia=coalesce(v_clean->>'topografia',topografia),rol_situacion=coalesce(v_clean->>'rol_situacion',rol_situacion),cierre_perimetral=coalesce(v_clean->>'cierre_perimetral',cierre_perimetral),porton=coalesce(v_clean->>'porton',porton),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('propietario_contacto',v_contacto,'fotos_revision_pendiente',v_fotos,'tasador_entrada',v_tasador,'tasacion_recalculo_pendiente',v_recalculo,'tasacion_recalculo_solicitado_at',case when v_recalculo then now() else null end,'ultima_actualizacion_propietario',now()),updated_at=now() where id=v_link.propiedad_id returning * into v_new;
  perform public.tpl_sincronizar_tasador_propiedad_v1(v_new.id,v_tasador);
  insert into public.tpl_actualizaciones_propietario(propiedad_id,link_id,datos_anteriores,datos_nuevos,campos_modificados,fotos_pendientes) values(v_new.id,v_link.id,to_jsonb(v_old)-'metadata',v_clean||jsonb_build_object('tasador_entrada',v_tasador),v_fields,v_fotos) returning id into v_update_id;
  if v_recalculo then
    insert into public.tpl_cola_recalculo_tasacion(propiedad_id,actualizacion_id,estado,solicitado_por,motivo,entrada)
    values(v_new.id,v_update_id,'pendiente','propietario','Actualización desde Mi Propiedad',v_tasador)
    on conflict (propiedad_id) where estado in ('pendiente','procesando') do update set actualizacion_id=excluded.actualizacion_id,estado='pendiente',entrada=excluded.entrada,error=null,updated_at=now()
    returning id into v_queue_id;
  end if;
  update public.tpl_links_propietario set last_used_at=now(),usos=least(usos+1,2147483647) where id=v_link.id;
  return jsonb_build_object('ok',true,'propiedad_id',v_new.id,'codigo',v_new.codigo,'actualizacion_id',v_update_id,'cola_recalculo_id',v_queue_id,'fotos_pendientes_revision',jsonb_array_length(v_fotos),'recalculo_pendiente',v_recalculo);
end;
$$;
revoke all on function public.tpl_propietario_actualizar_por_token_v1(text,jsonb) from public;
grant execute on function public.tpl_propietario_actualizar_por_token_v1(text,jsonb) to anon,authenticated;

create or replace function public.tpl_auditoria_tasador_conectado_v1(p_codigo text default null)
returns table(codigo text,propiedad_id uuid,ultima_tasacion_id uuid,valor_tpl_total bigint,recalculo_pendiente boolean,cola_estado text,imagenes_total bigint,imagenes_propietario bigint)
language sql security definer set search_path=public
as $$
select p.codigo,p.id,t.id,t.valor_tpl_total,coalesce((p.metadata->>'tasacion_recalculo_pendiente')::boolean,false),q.estado,count(distinct i.id),count(distinct i.id) filter(where i.metadata->>'origen'='link_propietario')
from public.tpl_propiedades p
left join lateral(select * from public.tpl_tasaciones x where x.propiedad_id=p.id order by x.created_at desc,x.id desc limit 1)t on true
left join lateral(select estado from public.tpl_cola_recalculo_tasacion x where x.propiedad_id=p.id order by x.created_at desc limit 1)q on true
left join public.tpl_propiedad_imagenes i on i.propiedad_id=p.id
where p_codigo is null or p.codigo=p_codigo
group by p.codigo,p.id,t.id,t.valor_tpl_total,q.estado;
$$;
revoke all on function public.tpl_auditoria_tasador_conectado_v1(text) from public;
grant execute on function public.tpl_auditoria_tasador_conectado_v1(text) to authenticated;
