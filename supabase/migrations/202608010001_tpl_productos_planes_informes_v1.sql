-- Tu Parcela Lista
-- Productos, planes y órdenes de informe v1
-- Fecha: 2026-08-01
-- Requiere las migraciones del núcleo TPL 20260730.

create extension if not exists pgcrypto;

create table if not exists public.tpl_planes_comerciales (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  descripcion text,
  nivel smallint not null default 0,
  precio_mensual_clp bigint,
  dias_prueba smallint not null default 0,
  activo boolean not null default true,
  caracteristicas jsonb not null default '[]'::jsonb,
  limites jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tpl_planes_comerciales
(codigo,nombre,descripcion,nivel,precio_mensual_clp,dias_prueba,caracteristicas,limites)
values
('gratis','Publicación Gratis','Publicación básica y Agenda Virtual del Propietario.',0,0,0,
 '["1 publicación activa","Agenda Virtual del Propietario","Estadísticas básicas","1 edición posterior gratuita","Nueva edición gratuita cada 30 días","Recepción de consultas"]'::jsonb,
 '{"publicaciones_activas":1,"ediciones_iniciales":1,"dias_entre_ediciones":30}'::jsonb),
('basico','Plan Básico','Herramientas para propietarios que administran directamente su venta.',1,null,30,
 '["Todo lo incluido en Gratis","Estadísticas detalladas","Fuentes de visitas y clics","2 ediciones mensuales","Informe mensual de comportamiento","Alertas y recomendaciones automáticas","Plantillas de respuesta"]'::jsonb,
 '{"ediciones_mensuales":2}'::jsonb),
('profesional','Plan Profesional','Asesoría comercial, landing y seguimiento de interesados.',2,null,0,
 '["Todo lo incluido en Básico","Landing individual","Asesoría con IA","Seguimiento de leads","Agenda de visitas","Embudo comercial","Informe semanal","Piezas de marketing","Asesoría de precio"]'::jsonb,
 '{}'::jsonb),
('premium','Administración TPL','Administración comercial integral de la propiedad.',3,null,0,
 '["Todo lo incluido en Profesional","Asesor principal","Gestión de consultas y visitas","Calificación de compradores","Gestión de ofertas y negociación","Campañas administradas","Informes comerciales completos","Intermediación según contrato"]'::jsonb,
 '{}'::jsonb)
on conflict (codigo) do update set
  nombre=excluded.nombre,
  descripcion=excluded.descripcion,
  nivel=excluded.nivel,
  dias_prueba=excluded.dias_prueba,
  caracteristicas=excluded.caracteristicas,
  limites=excluded.limites,
  updated_at=now();

create table if not exists public.tpl_suscripciones (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.tpl_actores(id) on delete cascade,
  propiedad_id uuid references public.tpl_propiedades(id) on delete cascade,
  plan_id uuid not null references public.tpl_planes_comerciales(id) on delete restrict,
  estado text not null default 'activa' check (estado in ('prueba','activa','pausada','vencida','cancelada')),
  inicio_at timestamptz not null default now(),
  prueba_hasta timestamptz,
  periodo_hasta timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_suscripciones_actor_idx on public.tpl_suscripciones(actor_id, estado);
create index if not exists tpl_suscripciones_propiedad_idx on public.tpl_suscripciones(propiedad_id, estado);

create table if not exists public.tpl_ordenes_informe (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null default ('INF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  tasacion_id uuid references public.tpl_tasaciones(id) on delete set null,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  actor_id uuid references public.tpl_actores(id) on delete set null,
  tipo_informe text not null default 'tasacion_premium',
  estado text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago','pago_iniciado','pagado','en_revision','generando','disponible','rechazado','reembolsado','cancelado','error')),
  monto_clp bigint not null check (monto_clp >= 0),
  moneda text not null default 'CLP',
  contacto jsonb not null default '{}'::jsonb,
  entrada_snapshot jsonb not null default '{}'::jsonb,
  resultado_snapshot jsonb not null default '{}'::jsonb,
  version_motor text,
  proveedor_pago text,
  referencia_pago text,
  pagado_at timestamptz,
  disponible_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_ordenes_informe_estado_idx on public.tpl_ordenes_informe(estado, created_at desc);
create index if not exists tpl_ordenes_informe_contacto_email_idx on public.tpl_ordenes_informe((lower(contacto->>'email')));

create table if not exists public.tpl_informes_tasacion (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid unique not null references public.tpl_ordenes_informe(id) on delete cascade,
  tasacion_id uuid references public.tpl_tasaciones(id) on delete set null,
  version_plantilla text not null,
  storage_bucket text,
  storage_path text,
  hash_documento text,
  paginas smallint,
  estado text not null default 'borrador' check (estado in ('borrador','generado','disponible','reemplazado','anulado')),
  generado_at timestamptz,
  generado_por uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.tpl_publicaciones add column if not exists version_actual integer not null default 1;
alter table public.tpl_publicaciones add column if not exists ediciones_gratis_usadas integer not null default 0;
alter table public.tpl_publicaciones add column if not exists proxima_edicion_gratis_at timestamptz;
alter table public.tpl_publicaciones add column if not exists requiere_aprobacion boolean not null default true;

create table if not exists public.tpl_publicacion_versiones (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.tpl_publicaciones(id) on delete cascade,
  version integer not null,
  contenido jsonb not null,
  tipo_cambio text not null default 'edicion_propietario',
  estado_revision text not null default 'pendiente' check (estado_revision in ('pendiente','aprobada','rechazada','reemplazada')),
  autor_actor_id uuid references public.tpl_actores(id) on delete set null,
  revisado_por uuid references auth.users(id) on delete set null,
  revisado_at timestamptz,
  observacion text,
  created_at timestamptz not null default now(),
  unique(publicacion_id, version)
);

create or replace function public.tpl_crear_orden_informe_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_payload#>>'{contacto,email}', p_payload->>'email', '')));
  v_nombre text := trim(coalesce(p_payload#>>'{contacto,nombre}', p_payload->>'nombre', ''));
  v_monto bigint := coalesce(nullif((p_payload->>'monto_clp')::bigint,0),1990);
  v_tasacion uuid;
  v_orden public.tpl_ordenes_informe;
begin
  if v_email = '' or position('@' in v_email) < 2 then
    raise exception 'Debes ingresar un correo válido para recibir el informe.';
  end if;
  if v_nombre = '' then
    raise exception 'Debes ingresar el nombre del solicitante.';
  end if;
  if v_monto < 0 or v_monto > 1000000 then
    raise exception 'Monto de informe inválido.';
  end if;

  begin
    v_tasacion := nullif(p_payload->>'tasacion_id','')::uuid;
  exception when others then
    v_tasacion := null;
  end;

  insert into public.tpl_ordenes_informe(
    tasacion_id,tipo_informe,estado,monto_clp,contacto,entrada_snapshot,resultado_snapshot,version_motor,metadata
  ) values (
    v_tasacion,
    coalesce(nullif(p_payload->>'tipo_informe',''),'tasacion_premium'),
    'pendiente_pago',
    v_monto,
    jsonb_build_object(
      'nombre',v_nombre,
      'email',v_email,
      'telefono',coalesce(p_payload#>>'{contacto,telefono}',p_payload->>'telefono','')
    ),
    coalesce(p_payload->'entrada','{}'::jsonb),
    coalesce(p_payload->'resultado','{}'::jsonb),
    nullif(p_payload->>'version_motor',''),
    jsonb_build_object('origen',coalesce(p_payload->>'origen','publicador'))
  ) returning * into v_orden;

  insert into public.tpl_eventos(evento,categoria,origen,prioridad,descripcion,metadata)
  values('informe_tasacion_solicitado','tasacion','publicador','alta',
    'Nueva solicitud de informe premium pendiente de pago.',
    jsonb_build_object('orden_id',v_orden.id,'codigo',v_orden.codigo,'monto_clp',v_orden.monto_clp,'email',v_email));

  return jsonb_build_object(
    'ok',true,
    'orden_id',v_orden.id,
    'codigo',v_orden.codigo,
    'estado',v_orden.estado,
    'monto_clp',v_orden.monto_clp
  );
end;
$$;

create or replace function public.tpl_listar_planes_publicos_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.nivel),'[]'::jsonb)
  from (
    select codigo,nombre,descripcion,nivel,precio_mensual_clp,dias_prueba,caracteristicas,limites
    from public.tpl_planes_comerciales
    where activo=true
  ) p;
$$;

alter table public.tpl_planes_comerciales enable row level security;
alter table public.tpl_suscripciones enable row level security;
alter table public.tpl_ordenes_informe enable row level security;
alter table public.tpl_informes_tasacion enable row level security;
alter table public.tpl_publicacion_versiones enable row level security;

revoke all on public.tpl_planes_comerciales,public.tpl_suscripciones,public.tpl_ordenes_informe,public.tpl_informes_tasacion,public.tpl_publicacion_versiones from anon, authenticated;
grant execute on function public.tpl_crear_orden_informe_v1(jsonb) to anon, authenticated;
grant execute on function public.tpl_listar_planes_publicos_v1() to anon, authenticated;

comment on function public.tpl_crear_orden_informe_v1(jsonb) is
'Genera una orden pendiente de pago. Antes de campañas públicas debe protegerse con CAPTCHA/rate limit desde una Edge Function.';
