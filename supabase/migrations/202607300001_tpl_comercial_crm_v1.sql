-- TPL Tu Parcela Lista
-- Migración comercial canónica v1
-- Requiere que exista previamente el núcleo TPL:
-- tpl_actores, tpl_actor_roles, tpl_propiedades, tpl_proyectos, tpl_eventos.

create extension if not exists pgcrypto;

-- 1) COMPRADORES: intereses sin duplicar personas
create table if not exists public.tpl_intereses_comprador (
  id uuid primary key default gen_random_uuid(),
  comprador_actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  tipo_interes text not null check (tipo_interes in ('parcela','parcela_casa','casa')),
  region text,
  comuna text,
  presupuesto_min bigint,
  presupuesto_max bigint,
  superficie_min_m2 numeric,
  dormitorios_min smallint,
  prioridad text,
  estado text not null default 'activo'
    check (estado in ('activo','en_seguimiento','pausado','convertido','cerrado')),
  criterios jsonb not null default '{}'::jsonb,
  ultima_interaccion_at timestamptz,
  proxima_accion text,
  proxima_accion_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_intereses_comprador_actor_idx
  on public.tpl_intereses_comprador(comprador_actor_id, estado);

-- 2) CASAS
create table if not exists public.tpl_casas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  nombre text not null,
  empresa_actor_id uuid references public.tpl_actores(id) on delete set null,
  tipo text not null default 'prefabricada',
  material text,
  superficie_m2 numeric,
  dormitorios smallint,
  banos smallint,
  pisos smallint,
  precio_base bigint,
  precio_instalacion bigint,
  estado text not null default 'activa'
    check (estado in ('activa','pausada','agotada','archivada')),
  regiones_disponibles text[] not null default '{}',
  incluidos jsonb not null default '[]'::jsonb,
  extras jsonb not null default '[]'::jsonb,
  imagenes jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) PARCELA + CASA
create table if not exists public.tpl_parcela_casas (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  casa_id uuid not null references public.tpl_casas(id) on delete restrict,
  comprador_actor_id uuid references public.tpl_actores(id) on delete set null,
  proyecto_id uuid references public.tpl_proyectos(id) on delete set null,
  estado text not null default 'cotizacion'
    check (estado in ('cotizacion','interes','reserva','activo','en_ejecucion','finalizado','descartado')),
  precio_parcela bigint,
  precio_casa bigint,
  precio_extras bigint not null default 0,
  precio_total bigint,
  configuracion jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) REFERENCIAS COMUNALES VALIDABLES
create table if not exists public.tpl_referencias_comunales (
  id uuid primary key default gen_random_uuid(),
  region text,
  comuna text not null,
  segmento text not null default 'parcela_sola',
  mediana_m2 bigint not null,
  p25_m2 bigint,
  p75_m2 bigint,
  muestra integer not null default 0,
  confianza text,
  fuentes jsonb not null default '[]'::jsonb,
  observado_at date,
  vigente boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tpl_referencia_comunal_unique
  on public.tpl_referencias_comunales(comuna, segmento, observado_at)
  where observado_at is not null;

-- 5) TASACIONES: los 3 valores quedan separados
create table if not exists public.tpl_tasaciones (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  actor_id uuid references public.tpl_actores(id) on delete set null,
  tipo text not null default 'precisa'
    check (tipo in ('rapida','precisa','interna')),
  superficie_m2 numeric,
  precio_publicado bigint,
  precio_publicado_m2 bigint,
  valor_tpl_total bigint,
  valor_tpl_m2 bigint,
  referencia_comunal_m2 bigint,
  diferencia_publicado_vs_tpl_pct numeric,
  diferencia_publicado_vs_comunal_pct numeric,
  clasificacion text,
  es_oportunidad boolean not null default false,
  factores jsonb not null default '[]'::jsonb,
  entrada jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  version_motor text,
  created_at timestamptz not null default now()
);

create index if not exists tpl_tasaciones_propiedad_idx
  on public.tpl_tasaciones(propiedad_id, created_at desc);
create index if not exists tpl_tasaciones_oportunidad_idx
  on public.tpl_tasaciones(es_oportunidad, created_at desc);

-- 6) OPERACIONES
alter table public.tpl_proyectos add column if not exists tipo_objetivo text;
alter table public.tpl_proyectos add column if not exists estado_operativo text not null default 'nuevo';
alter table public.tpl_proyectos add column if not exists requiere_revision boolean not null default false;
alter table public.tpl_proyectos add column if not exists motivo_revision text;
alter table public.tpl_proyectos add column if not exists ultimo_movimiento_at timestamptz;
alter table public.tpl_proyectos add column if not exists proxima_accion_at timestamptz;

-- Actores que se van incorporando a cada operación/proyecto
create table if not exists public.tpl_proyecto_actores (
  proyecto_id uuid not null references public.tpl_proyectos(id) on delete cascade,
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  rol_en_proyecto text not null,
  estado_participacion text not null default 'activo',
  proxima_accion text,
  proxima_accion_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (proyecto_id, actor_id, rol_en_proyecto)
);

-- 7) MENSAJES / AUTOMATIZACIONES
create table if not exists public.tpl_plantillas_mensaje (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  canal text not null check (canal in ('email','whatsapp','interno')),
  asunto text,
  cuerpo text not null,
  categoria text,
  activo boolean not null default true,
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tpl_mensajes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.tpl_actores(id) on delete set null,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  proyecto_id uuid references public.tpl_proyectos(id) on delete set null,
  plantilla_id uuid references public.tpl_plantillas_mensaje(id) on delete set null,
  canal text not null check (canal in ('email','whatsapp','interno')),
  direccion text not null default 'saliente'
    check (direccion in ('saliente','entrante')),
  destinatario text,
  asunto text,
  cuerpo text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','programado','enviado','entregado','leido','respondido','error','cancelado')),
  programado_at timestamptz,
  enviado_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Plantillas iniciales
insert into public.tpl_plantillas_mensaje
(codigo,nombre,canal,asunto,cuerpo,categoria,variables)
values
(
 'dueno_precio_sobre_tpl',
 'Sugerencia de ajuste de precio',
 'email',
 'Recomendación para mejorar el interés en tu propiedad',
 'Hola {{nombre}}, revisamos {{propiedad}}. Su precio publicado se encuentra {{diferencia}}% sobre la estimación TPL. Podemos revisar una estrategia para mejorar su posición.',
 'precio',
 '["nombre","propiedad","diferencia"]'::jsonb
),
(
 'dueno_informe_semanal',
 'Informe semanal de propiedad',
 'email',
 'Tu informe semanal TPL · {{propiedad}}',
 'Hola {{nombre}}. Esta semana {{propiedad}} registró {{visitas}} visualizaciones, {{interesados}} interesados y {{contactos}} contactos. {{recomendacion}}',
 'informe_semanal',
 '["nombre","propiedad","visitas","interesados","contactos","recomendacion"]'::jsonb
),
(
 'comprador_seguimiento',
 'Seguimiento comprador',
 'email',
 'Nuevas opciones para tu búsqueda',
 'Hola {{nombre}}, encontramos nuevas opciones relacionadas con tu búsqueda de {{tipo_interes}} en {{comuna}}.',
 'seguimiento_comprador',
 '["nombre","tipo_interes","comuna"]'::jsonb
)
on conflict (codigo) do nothing;

-- 8) ANALYTICS
create table if not exists public.tpl_analytics_eventos (
  id uuid primary key default gen_random_uuid(),
  sesion_id text,
  actor_id uuid references public.tpl_actores(id) on delete set null,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  proyecto_id uuid references public.tpl_proyectos(id) on delete set null,
  evento text not null,
  pagina text,
  origen text,
  dispositivo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tpl_analytics_evento_idx
  on public.tpl_analytics_eventos(evento, created_at desc);
create index if not exists tpl_analytics_propiedad_idx
  on public.tpl_analytics_eventos(propiedad_id, created_at desc);

-- 9) VISTAS PARA CRM
create or replace view public.crm_compradores as
select
  a.id as comprador_id, a.nombre, a.email, a.telefono,
  i.tipo_interes, i.region, i.comuna,
  i.presupuesto_min, i.presupuesto_max,
  i.estado, i.ultima_interaccion_at,
  i.proxima_accion, i.proxima_accion_at
from public.tpl_actores a
join public.tpl_actor_roles r
  on r.actor_id=a.id and r.rol='comprador'
left join public.tpl_intereses_comprador i
  on i.comprador_actor_id=a.id;

create or replace view public.crm_duenos as
select
  a.id as dueno_id, a.nombre, a.email, a.telefono, a.region, a.comuna,
  count(distinct p.id) as propiedades,
  count(distinct p.id) filter (where p.tipo in ('parcela','campo')) as parcelas,
  count(distinct p.id) filter (where p.tipo in ('casa','casa_con_terreno')) as casas,
  max(p.updated_at) as ultima_actualizacion
from public.tpl_actores a
join public.tpl_actor_roles r
  on r.actor_id=a.id and r.rol in ('propietario','corredor')
left join public.tpl_propiedades p
  on p.propietario_actor_id=a.id or p.corredor_actor_id=a.id
group by a.id,a.nombre,a.email,a.telefono,a.region,a.comuna;

create or replace view public.crm_parcelas as
select
  p.*,
  case
    when p.superficie_m2 > 0 and p.precio_publicado > 0
    then round(p.precio_publicado::numeric/p.superficie_m2)
    else null
  end as precio_publicado_m2,
  t.valor_tpl_m2,
  t.referencia_comunal_m2,
  t.clasificacion,
  t.es_oportunidad
from public.tpl_propiedades p
left join lateral (
  select x.valor_tpl_m2,x.referencia_comunal_m2,x.clasificacion,x.es_oportunidad
  from public.tpl_tasaciones x
  where x.propiedad_id=p.id
  order by x.created_at desc
  limit 1
) t on true
where p.tipo in ('parcela','campo');

create or replace view public.crm_parcelas_casas as
select
  pc.id, pc.estado, pc.proyecto_id, pc.comprador_actor_id,
  p.id as propiedad_id, p.codigo as propiedad_codigo,
  p.titulo as propiedad, p.comuna,
  c.id as casa_id, c.codigo as casa_codigo,
  c.nombre as casa, c.superficie_m2 as casa_m2,
  c.dormitorios,
  pc.precio_parcela, pc.precio_casa,
  pc.precio_extras, pc.precio_total,
  pc.updated_at
from public.tpl_parcela_casas pc
join public.tpl_propiedades p on p.id=pc.propiedad_id
join public.tpl_casas c on c.id=pc.casa_id;

create or replace view public.crm_casas as
select * from public.tpl_casas;

create or replace view public.crm_operaciones_activas as
select
  pr.*,
  prop.codigo as propiedad_codigo,
  prop.titulo as propiedad_titulo,
  prop.comuna
from public.tpl_proyectos pr
left join public.tpl_propiedades prop on prop.id=pr.propiedad_id
where pr.estado_operativo not in ('finalizado','cerrado','descartado');

create or replace view public.crm_operaciones_revision as
select *
from public.crm_operaciones_activas
where requiere_revision=true or estado_operativo='requiere_revision';

create or replace view public.crm_analytics_diario as
select
  date_trunc('day',created_at) as dia,
  evento,
  pagina,
  count(*) as total,
  count(distinct sesion_id) filter (where sesion_id is not null) as sesiones
from public.tpl_analytics_eventos
group by 1,2,3;

-- 10) RLS
alter table public.tpl_intereses_comprador enable row level security;
alter table public.tpl_casas enable row level security;
alter table public.tpl_parcela_casas enable row level security;
alter table public.tpl_referencias_comunales enable row level security;
alter table public.tpl_tasaciones enable row level security;
alter table public.tpl_proyecto_actores enable row level security;
alter table public.tpl_plantillas_mensaje enable row level security;
alter table public.tpl_mensajes enable row level security;
alter table public.tpl_analytics_eventos enable row level security;

-- Catálogos públicos estrictamente de lectura.
drop policy if exists tpl_casas_public_read on public.tpl_casas;
create policy tpl_casas_public_read
on public.tpl_casas for select
to anon, authenticated
using (estado='activa');

drop policy if exists tpl_referencias_public_read on public.tpl_referencias_comunales;
create policy tpl_referencias_public_read
on public.tpl_referencias_comunales for select
to anon, authenticated
using (vigente=true);

-- El navegador puede registrar eventos, no consultar el historial completo.
drop policy if exists tpl_analytics_public_insert on public.tpl_analytics_eventos;
create policy tpl_analytics_public_insert
on public.tpl_analytics_eventos for insert
to anon, authenticated
with check (true);

-- No se habilita lectura pública de compradores, dueños, operaciones,
-- tasaciones ni mensajes. Esos datos quedan para CRM/RPC autenticadas.
