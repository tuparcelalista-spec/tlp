-- Etapa 9: relaciones del proyecto, análisis global y base del motor de automatizaciones.
-- Extiende el núcleo canónico sin modificar Flow.

create table if not exists public.tpl_proyecto_actores (
  proyecto_id uuid not null references public.tpl_proyectos(id) on delete cascade,
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  rol_en_proyecto text not null,
  estado_participacion text not null default 'al_dia' check (estado_participacion in ('al_dia','pendiente','esperando','bloquea','finalizado')),
  proxima_accion text,
  responsable_desde timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (proyecto_id, actor_id, rol_en_proyecto)
);

create table if not exists public.tpl_analisis_global (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references public.tpl_proyectos(id) on delete cascade,
  tipo text not null check (tipo in ('alerta','riesgo','oportunidad','recomendacion','bloqueo')),
  severidad text not null default 'informativa' check (severidad in ('informativa','baja','media','alta','critica')),
  titulo text not null,
  descripcion text,
  estado text not null default 'abierta' check (estado in ('abierta','en_revision','resuelta','descartada')),
  actor_responsable_id uuid references public.tpl_actores(id),
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.tpl_automatizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  evento_disparador text not null,
  condiciones jsonb not null default '[]'::jsonb,
  pasos jsonb not null default '[]'::jsonb,
  activo boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tpl_automatizacion_ejecuciones (
  id uuid primary key default gen_random_uuid(),
  automatizacion_id uuid not null references public.tpl_automatizaciones(id) on delete cascade,
  evento_id uuid references public.tpl_eventos(id) on delete set null,
  proyecto_id uuid references public.tpl_proyectos(id) on delete cascade,
  actor_id uuid references public.tpl_actores(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente','esperando','ejecutando','completada','cancelada','error')),
  paso_actual integer not null default 0,
  ejecutar_desde timestamptz not null default now(),
  contexto jsonb not null default '{}'::jsonb,
  error_detalle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_eventos_proyecto_fecha_idx on public.tpl_eventos(proyecto_id,created_at desc);
create index if not exists tpl_proyecto_actores_estado_idx on public.tpl_proyecto_actores(proyecto_id,estado_participacion);
create index if not exists tpl_analisis_global_abierto_idx on public.tpl_analisis_global(estado,severidad,created_at desc);
create index if not exists tpl_automatizacion_ejecuciones_pendientes_idx on public.tpl_automatizacion_ejecuciones(estado,ejecutar_desde);

alter table public.tpl_proyecto_actores enable row level security;
alter table public.tpl_analisis_global enable row level security;
alter table public.tpl_automatizaciones enable row level security;
alter table public.tpl_automatizacion_ejecuciones enable row level security;

create or replace view public.tpl_vista_proyecto_360 as
select
  p.id,
  p.codigo,
  p.fase,
  p.estado,
  p.proxima_accion,
  p.created_at,
  pr.codigo as propiedad_codigo,
  pr.titulo as propiedad_titulo,
  pr.comuna,
  coalesce(jsonb_agg(distinct jsonb_build_object(
    'actor_id',a.id,
    'nombre',a.nombre,
    'rol',pa.rol_en_proyecto,
    'estado',pa.estado_participacion,
    'proxima_accion',pa.proxima_accion
  )) filter (where a.id is not null),'[]'::jsonb) as actores
from public.tpl_proyectos p
left join public.tpl_propiedades pr on pr.id=p.propiedad_id
left join public.tpl_proyecto_actores pa on pa.proyecto_id=p.id
left join public.tpl_actores a on a.id=pa.actor_id
group by p.id,pr.codigo,pr.titulo,pr.comuna;
