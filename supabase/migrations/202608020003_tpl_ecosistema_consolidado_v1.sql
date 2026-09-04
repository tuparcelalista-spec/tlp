begin;

-- Consolidación canónica del ecosistema TPL.
alter table public.tpl_casas
  add column if not exists slug text,
  add column if not exists descripcion text,
  add column if not exists origen text not null default 'crm_tpl',
  add column if not exists proveedor_estado text not null default 'pendiente_identificacion',
  add column if not exists source_legacy_id text,
  add column if not exists sistema_constructivo text,
  add column if not exists estilo text,
  add column if not exists planos jsonb not null default '[]'::jsonb,
  add column if not exists caracteristicas jsonb not null default '[]'::jsonb,
  add column if not exists especificaciones jsonb not null default '{}'::jsonb,
  add column if not exists publicada_at timestamptz;

create unique index if not exists tpl_casas_source_legacy_unique on public.tpl_casas(source_legacy_id) where source_legacy_id is not null;
create unique index if not exists tpl_casas_slug_unique on public.tpl_casas(slug) where slug is not null;

create table if not exists public.tpl_casa_proveedores (
 id uuid primary key default gen_random_uuid(), casa_id uuid not null references public.tpl_casas(id) on delete cascade,
 partner_actor_id uuid references public.tpl_actores(id) on delete set null,
 nombre_proveedor_pendiente text, tipo_relacion text not null default 'comercializador',
 precio_desde bigint, moneda text not null default 'CLP', incluidos jsonb not null default '[]'::jsonb,
 no_incluidos jsonb not null default '[]'::jsonb, plazo_estimado_dias integer,
 regiones text[] not null default '{}', comunas text[] not null default '{}', garantia text,
 porcentaje_anticipo numeric, modalidades_pago jsonb not null default '[]'::jsonb,
 vigencia_precio_hasta date, estado text not null default 'borrador', es_oferta_principal boolean not null default false,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(tipo_relacion in ('constructor','diseñador','fabricante','comercializador','representante')),
 check(estado in ('borrador','revision','publicada','pausada','archivada'))
);
create unique index if not exists tpl_casa_proveedor_principal_unique on public.tpl_casa_proveedores(casa_id) where es_oferta_principal and estado<>'archivada';

create table if not exists public.tpl_casas_proyectos_realizados (
 id uuid primary key default gen_random_uuid(), casa_id uuid references public.tpl_casas(id) on delete set null,
 partner_actor_id uuid references public.tpl_actores(id) on delete set null, nombre_proyecto text not null,
 region text, comuna text, ano integer, superficie_m2 numeric, descripcion text,
 etapas jsonb not null default '[]'::jsonb, imagenes_urls jsonb not null default '[]'::jsonb,
 video_url text, testimonio text, verificado_por_tpl boolean not null default false,
 estado text not null default 'borrador', metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.tpl_catalogo_items (
 id uuid primary key default gen_random_uuid(), codigo text unique, slug text unique, tipo text not null,
 partner_actor_id uuid references public.tpl_actores(id) on delete set null,
 casa_id uuid references public.tpl_casas(id) on delete cascade,
 servicio_id uuid references public.tpl_servicios(id) on delete set null,
 titulo text not null, resumen text, descripcion text, categoria text, subcategoria text,
 region text, comunas text[] not null default '{}', precio_desde bigint, moneda text not null default 'CLP', unidad text,
 imagen_principal_url text, galeria_urls jsonb not null default '[]'::jsonb, atributos jsonb not null default '{}'::jsonb,
 disponibilidad text, estado text not null default 'borrador', destacado boolean not null default false,
 seo jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
 publicada_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(tipo in ('casa','servicio','producto','arriendo','turismo')),
 check(estado in ('borrador','revision','publicado','pausado','archivado'))
);
create unique index if not exists tpl_catalogo_codigo_unique on public.tpl_catalogo_items(codigo) where codigo is not null;
create unique index if not exists tpl_catalogo_slug_unique on public.tpl_catalogo_items(slug) where slug is not null;
create index if not exists tpl_catalogo_tipo_estado_idx on public.tpl_catalogo_items(tipo,estado,publicada_at desc);
create index if not exists tpl_catalogo_partner_idx on public.tpl_catalogo_items(partner_actor_id,tipo,estado);

create table if not exists public.tpl_oportunidades (
 id uuid primary key default gen_random_uuid(), codigo text unique, actor_cliente_id uuid references public.tpl_actores(id) on delete set null,
 proyecto_id uuid references public.tpl_proyectos(id) on delete set null, catalogo_item_id uuid references public.tpl_catalogo_items(id) on delete set null,
 partner_actor_id uuid references public.tpl_actores(id) on delete set null, tipo text not null,
 origen text, estado text not null default 'nueva', prioridad text not null default 'media',
 nombre_contacto text, email text, telefono text, mensaje text, presupuesto bigint, fecha_objetivo date,
 proxima_accion text, proxima_accion_at timestamptz, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(tipo in ('consulta','cotizacion','reserva','compra','arriendo','servicio'))
);

create table if not exists public.tpl_proyecto_componentes (
 id uuid primary key default gen_random_uuid(), proyecto_id uuid not null references public.tpl_proyectos(id) on delete cascade,
 catalogo_item_id uuid references public.tpl_catalogo_items(id) on delete set null, tipo text not null,
 estado text not null default 'idea', nombre text not null, monto_estimado bigint, monto_acordado bigint,
 fecha_objetivo date, dependencia_item_id uuid references public.tpl_proyecto_componentes(id) on delete set null,
 configuracion jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Importación idempotente del catálogo histórico de casas.js.
insert into public.tpl_casas(source_legacy_id,nombre,descripcion,superficie_m2,dormitorios,banos,precio_base,imagenes,planos,origen,proveedor_estado,metadata)
values
('aura18','Casa prefabricada 18m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',18,1,1,2490000,'["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp", "image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp", "image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "20 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura24','Casa prefabricada 24m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',24,2,1,3350000,'["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp", "image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp", "image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "20 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura36','Casa prefabricada 36m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',36,2,1,4840000,'["image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto_render.webp", "image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp", "image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "20 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura42','Casa prefabricada 42m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',42,3,1,5600000,'["image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_render.webp", "image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp", "image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "25 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura48','Casa prefabricada 48m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',48,3,1,5950000,'["image/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_render.webp", "image/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "25 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura54','Casa prefabricada 48m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',54,3,1,6750000,'["image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp", "image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp", "image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "25 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura72','Casa prefabricada 72m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',72,3,2,8750000,'["image/casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp", "image/casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "35 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura84_1','Casa prefabricada 82mts2,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',84,4,2,9200000,'["image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_render.webp", "image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp", "image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp", "image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp", "image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "25 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura84_2','Casa prefabricada 84mts2 de 6 aguas,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',84,4,2,9900000,'["image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_render.webp", "image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp", "image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "25 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura108','Casa prefabricada 108mts2 de 6 aguas,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',108,6,2,13500000,'["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp", "image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp", "image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "25 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('aura120','Casa prefabricada 120mts2 de 6 aguas,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',120,6,2,14700000,'["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp", "image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp", "image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp"]'::jsonb,'["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp", "image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "ChileHome", "tiempo_legacy": "25 días", "descripcion_breve": "Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas."}'::jsonb),
('Innova18','Casa Moderna madera full 18mts2,','Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar.',18,1,1,6300000,'["image/casas/pro/innova/innova_1_habitacion_foto.webp", "image/casas/pro/innova/innova_1_habitacion_plano.webp"]'::jsonb,'["image/casas/pro/innova/innova_1_habitacion_plano.webp", "image/casas/pro/innova/innova_1_habitacion_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "Innova", "tiempo_legacy": "25 días", "descripcion_breve": "Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar."}'::jsonb),
('Innova54','Casa Moderna completa full 54mts2,','Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar.',54,3,1,12600000,'["image/casas/pro/innova/innova_3_habitaciones_foto_1.webp", "image/casas/pro/innova/innova_3_habitaciones_foto_2.webp"]'::jsonb,'[]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "Innova", "tiempo_legacy": "25 días", "descripcion_breve": "Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar."}'::jsonb),
('Nogal72','Casa Moderna completa full 72mts2,','Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar.',72,3,2,28000000,'["image/casas/pro/nogales/Alfa_72_mt2_.webp", "image/casas/pro/nogales/Alfa_72_mt2_plano.webp"]'::jsonb,'["image/casas/pro/nogales/Alfa_72_mt2_plano.webp"]'::jsonb,'catalogo_historico_tpl','identificado_por_nombre','{"empresa_legacy": "Los Nogales", "tiempo_legacy": "25 días", "descripcion_breve": "Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar."}'::jsonb)
on conflict(source_legacy_id) where source_legacy_id is not null do update set nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,
dormitorios=excluded.dormitorios,banos=excluded.banos,precio_base=excluded.precio_base,imagenes=excluded.imagenes,planos=excluded.planos,
metadata=public.tpl_casas.metadata||excluded.metadata,updated_at=now();

update public.tpl_casas set slug=coalesce(slug,public.tpl_slugify_v2(coalesce(source_legacy_id,nombre))), codigo=coalesce(codigo,upper(source_legacy_id)), publicada_at=coalesce(publicada_at,now()) where source_legacy_id is not null;

insert into public.tpl_casa_proveedores(casa_id,nombre_proveedor_pendiente,tipo_relacion,precio_desde,plazo_estimado_dias,estado,es_oferta_principal,metadata)
select c.id,nullif(c.metadata->>'empresa_legacy',''),'comercializador',c.precio_base,
       nullif(regexp_replace(coalesce(c.metadata->>'tiempo_legacy',''),'[^0-9]','','g'),'')::int,
       'publicada',true,jsonb_build_object('origen','casas_js','requiere_vincular_actor',true)
from public.tpl_casas c where c.source_legacy_id is not null
and not exists(select 1 from public.tpl_casa_proveedores cp where cp.casa_id=c.id and cp.es_oferta_principal);

insert into public.tpl_catalogo_items(codigo,slug,tipo,casa_id,titulo,resumen,precio_desde,imagen_principal_url,galeria_urls,atributos,estado,publicada_at,metadata)
select 'CASA-'||upper(c.source_legacy_id),'casa-'||c.slug,'casa',c.id,c.nombre,c.descripcion,c.precio_base,
       coalesce(c.imagenes->>0,null),c.imagenes,
       jsonb_build_object('superficie_m2',c.superficie_m2,'dormitorios',c.dormitorios,'banos',c.banos,'proveedor_estado',c.proveedor_estado,'planos',c.planos),
       case when c.estado='activa' then 'publicado' else 'pausado' end,coalesce(c.publicada_at,now()),jsonb_build_object('origen',c.origen)
from public.tpl_casas c where c.source_legacy_id is not null
on conflict(codigo) where codigo is not null do update set titulo=excluded.titulo,resumen=excluded.resumen,precio_desde=excluded.precio_desde,
imagen_principal_url=excluded.imagen_principal_url,galeria_urls=excluded.galeria_urls,atributos=excluded.atributos,updated_at=now();

create or replace function public.tpl_catalogo_publico_buscar_v2(p_tipo text default 'todos',p_busqueda text default null,p_region text default null,p_limite integer default 80)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.destacado desc,x.publicada_at desc),'[]'::jsonb) from (
  select i.id,i.codigo,i.slug,i.tipo,i.titulo,i.resumen,i.descripcion,i.categoria,i.subcategoria,i.region,i.comunas,
   i.precio_desde,i.moneda,i.unidad,i.imagen_principal_url,i.galeria_urls,i.atributos,i.disponibilidad,i.destacado,i.publicada_at,
   p.slug partner_slug,p.nombre_comercial,p.puntaje_completitud,p.puntaje_reputacion,
   cp.nombre_proveedor_pendiente,cp.tipo_relacion,cp.plazo_estimado_dias,cp.garantia,
   case when i.tipo='casa' and p.id is null then 'Proveedor en proceso de validación' else p.nombre_comercial end proveedor_nombre
  from public.tpl_catalogo_items i
  left join public.tpl_partner_perfiles p on p.actor_id=i.partner_actor_id and p.estado='publicado'
  left join public.tpl_casa_proveedores cp on cp.casa_id=i.casa_id and cp.es_oferta_principal and cp.estado='publicada'
  where i.estado='publicado' and (p_tipo is null or p_tipo in ('','todos') or i.tipo=p_tipo)
    and (p_region is null or p_region='' or lower(coalesce(i.region,''))=lower(p_region) )
    and (p_busqueda is null or p_busqueda='' or concat_ws(' ',i.titulo,i.resumen,i.descripcion,i.categoria,i.subcategoria,i.atributos::text,p.nombre_comercial,cp.nombre_proveedor_pendiente) ilike '%'||p_busqueda||'%')
  limit greatest(1,least(coalesce(p_limite,80),120))
 ) x;
$$;
grant execute on function public.tpl_catalogo_publico_buscar_v2(text,text,text,integer) to anon,authenticated;

create or replace view public.crm_casas as
select c.*,cp.id oferta_principal_id,cp.partner_actor_id,cp.nombre_proveedor_pendiente,cp.tipo_relacion,cp.plazo_estimado_dias,
 cp.garantia,cp.vigencia_precio_hasta,ci.id catalogo_item_id,ci.estado estado_publicacion
from public.tpl_casas c
left join public.tpl_casa_proveedores cp on cp.casa_id=c.id and cp.es_oferta_principal and cp.estado<>'archivada'
left join public.tpl_catalogo_items ci on ci.casa_id=c.id and ci.tipo='casa' and ci.estado<>'archivado';

create or replace function public.tpl_crm_guardar_casa_v1(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_casa uuid;v_oferta uuid;v_item uuid;begin
 if not public.tpl_es_admin() then raise exception 'NO_AUTORIZADO'; end if;
 if nullif(trim(p_payload->>'nombre'),'') is null then raise exception 'NOMBRE_REQUERIDO'; end if;
 v_casa=nullif(p_payload->>'id','')::uuid;
 if v_casa is null then
  insert into public.tpl_casas(codigo,nombre,descripcion,tipo,material,superficie_m2,dormitorios,banos,pisos,precio_base,estado,imagenes,planos,origen,proveedor_estado,metadata)
  values(nullif(p_payload->>'codigo',''),trim(p_payload->>'nombre'),p_payload->>'descripcion',coalesce(nullif(p_payload->>'tipo',''),'prefabricada'),p_payload->>'material',nullif(p_payload->>'superficie_m2','')::numeric,nullif(p_payload->>'dormitorios','')::smallint,nullif(p_payload->>'banos','')::smallint,nullif(p_payload->>'pisos','')::smallint,nullif(p_payload->>'precio_base','')::bigint,coalesce(nullif(p_payload->>'estado',''),'pausada'),coalesce(p_payload->'imagenes','[]'),coalesce(p_payload->'planos','[]'),'crm_tpl',coalesce(nullif(p_payload->>'proveedor_estado',''),'pendiente_identificacion'),coalesce(p_payload->'metadata','{}')) returning id into v_casa;
 else
  update public.tpl_casas set nombre=trim(p_payload->>'nombre'),descripcion=p_payload->>'descripcion',material=p_payload->>'material',superficie_m2=nullif(p_payload->>'superficie_m2','')::numeric,dormitorios=nullif(p_payload->>'dormitorios','')::smallint,banos=nullif(p_payload->>'banos','')::smallint,pisos=nullif(p_payload->>'pisos','')::smallint,precio_base=nullif(p_payload->>'precio_base','')::bigint,estado=coalesce(nullif(p_payload->>'estado',''),estado),imagenes=coalesce(p_payload->'imagenes',imagenes),planos=coalesce(p_payload->'planos',planos),proveedor_estado=coalesce(nullif(p_payload->>'proveedor_estado',''),proveedor_estado),updated_at=now() where id=v_casa;
 end if;
 update public.tpl_casas set slug=coalesce(slug,public.tpl_slugify_v2(nombre)),codigo=coalesce(codigo,'CASA-'||upper(substr(replace(id::text,'-',''),1,8))) where id=v_casa;
 select id into v_oferta from public.tpl_casa_proveedores where casa_id=v_casa and es_oferta_principal and estado<>'archivada' limit 1;
 if v_oferta is null then insert into public.tpl_casa_proveedores(casa_id,partner_actor_id,nombre_proveedor_pendiente,tipo_relacion,precio_desde,plazo_estimado_dias,garantia,estado,es_oferta_principal) values(v_casa,nullif(p_payload->>'partner_actor_id','')::uuid,nullif(p_payload->>'nombre_proveedor_pendiente',''),coalesce(nullif(p_payload->>'tipo_relacion',''),'comercializador'),nullif(p_payload->>'precio_base','')::bigint,nullif(p_payload->>'plazo_estimado_dias','')::int,p_payload->>'garantia','publicada',true) returning id into v_oferta;
 else update public.tpl_casa_proveedores set partner_actor_id=nullif(p_payload->>'partner_actor_id','')::uuid,nombre_proveedor_pendiente=nullif(p_payload->>'nombre_proveedor_pendiente',''),tipo_relacion=coalesce(nullif(p_payload->>'tipo_relacion',''),tipo_relacion),precio_desde=nullif(p_payload->>'precio_base','')::bigint,plazo_estimado_dias=nullif(p_payload->>'plazo_estimado_dias','')::int,garantia=p_payload->>'garantia',updated_at=now() where id=v_oferta; end if;
 select id into v_item from public.tpl_catalogo_items where casa_id=v_casa and tipo='casa' limit 1;
 if v_item is null then insert into public.tpl_catalogo_items(codigo,slug,tipo,casa_id,partner_actor_id,titulo,resumen,precio_desde,imagen_principal_url,galeria_urls,atributos,estado,publicada_at) select 'CASA-'||upper(substr(replace(v_casa::text,'-',''),1,8)),'casa-'||slug,'casa',id,nullif(p_payload->>'partner_actor_id','')::uuid,nombre,descripcion,precio_base,imagenes->>0,imagenes,jsonb_build_object('superficie_m2',superficie_m2,'dormitorios',dormitorios,'banos',banos,'planos',planos),case when estado='activa' then 'publicado' else 'pausado' end,case when estado='activa' then now() end from public.tpl_casas where id=v_casa returning id into v_item;
 else update public.tpl_catalogo_items i set partner_actor_id=nullif(p_payload->>'partner_actor_id','')::uuid,titulo=c.nombre,resumen=c.descripcion,precio_desde=c.precio_base,imagen_principal_url=c.imagenes->>0,galeria_urls=c.imagenes,atributos=jsonb_build_object('superficie_m2',c.superficie_m2,'dormitorios',c.dormitorios,'banos',c.banos,'planos',c.planos,'proveedor_estado',c.proveedor_estado),estado=case when c.estado='activa' then 'publicado' else 'pausado' end,publicada_at=case when c.estado='activa' then coalesce(i.publicada_at,now()) else i.publicada_at end,updated_at=now() from public.tpl_casas c where c.id=v_casa and i.id=v_item; end if;
 insert into public.tpl_eventos(evento,metadata) values('crm_casa_guardada',jsonb_build_object('casa_id',v_casa,'oferta_id',v_oferta,'catalogo_item_id',v_item,'staff_id',auth.uid()));
 return jsonb_build_object('ok',true,'casa_id',v_casa,'oferta_id',v_oferta,'catalogo_item_id',v_item);
end $$;
grant execute on function public.tpl_crm_guardar_casa_v1(jsonb) to authenticated;

alter table public.tpl_casa_proveedores enable row level security;
alter table public.tpl_casas_proyectos_realizados enable row level security;
alter table public.tpl_catalogo_items enable row level security;
alter table public.tpl_oportunidades enable row level security;
alter table public.tpl_proyecto_componentes enable row level security;

drop policy if exists tpl_catalogo_public_read on public.tpl_catalogo_items;
create policy tpl_catalogo_public_read on public.tpl_catalogo_items for select using(estado='publicado');

commit;
