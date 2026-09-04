-- ============================================================
-- TPL TU PARCELA LISTA
-- NÚCLEO CANÓNICO v1
-- Proyecto Supabase nuevo: TPL Tu Parcela Lista
-- Orden: ejecutar ANTES de 202607300001_tpl_comercial_crm_v1.sql
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.tpl_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. ACTORES / PERSONAS / EMPRESAS
-- Una persona o empresa existe una sola vez.
-- Los roles se agregan en tpl_actor_roles.
-- ------------------------------------------------------------
create table if not exists public.tpl_actores (
  id uuid primary key default gen_random_uuid(),
  tipo_actor text not null default 'persona'
    check (tipo_actor in ('persona','empresa','organizacion')),
  nombre text not null,
  rut text,
  email text,
  telefono text,
  region text,
  comuna text,
  direccion text,
  origen text,
  estado text not null default 'activo'
    check (estado in ('activo','inactivo','bloqueado','archivado')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tpl_actores_email_unique
  on public.tpl_actores(lower(email))
  where email is not null and btrim(email) <> '';

create unique index if not exists tpl_actores_rut_unique
  on public.tpl_actores(rut)
  where rut is not null and btrim(rut) <> '';

create index if not exists tpl_actores_nombre_idx
  on public.tpl_actores(lower(nombre));

drop trigger if exists trg_tpl_actores_updated_at on public.tpl_actores;
create trigger trg_tpl_actores_updated_at
before update on public.tpl_actores
for each row execute function public.tpl_set_updated_at();

create table if not exists public.tpl_actor_roles (
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  rol text not null
    check (rol in (
      'comprador',
      'propietario',
      'corredor',
      'partner',
      'empresa_casas',
      'contratista',
      'proveedor',
      'asesor_tpl',
      'administrador'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, rol)
);

create index if not exists tpl_actor_roles_rol_idx
  on public.tpl_actor_roles(rol, actor_id);

-- ------------------------------------------------------------
-- 2. PUBLICACIONES
-- Es el proceso de ingreso/revisión. La propiedad aprobada vive
-- posteriormente en tpl_propiedades.
-- ------------------------------------------------------------
create table if not exists public.tpl_publicaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  publicador_actor_id uuid references public.tpl_actores(id) on delete set null,
  responsable_actor_id uuid references public.tpl_actores(id) on delete set null,
  tipo text not null default 'parcela'
    check (tipo in ('parcela','campo','casa','casa_con_terreno')),
  estado text not null default 'borrador'
    check (estado in (
      'borrador',
      'enviada',
      'pendiente_revision',
      'requiere_correccion',
      'aprobada',
      'rechazada',
      'archivada'
    )),
  origen text not null default 'publicador',
  datos jsonb not null default '{}'::jsonb,
  diagnostico jsonb not null default '{}'::jsonb,
  tasacion_preliminar jsonb not null default '{}'::jsonb,
  motivo_revision text,
  enviada_at timestamptz,
  revisada_at timestamptz,
  aprobada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_publicaciones_updated_at on public.tpl_publicaciones;
create trigger trg_tpl_publicaciones_updated_at
before update on public.tpl_publicaciones
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_publicaciones_estado_idx
  on public.tpl_publicaciones(estado, created_at desc);

-- ------------------------------------------------------------
-- 3. PROPIEDADES
-- Fuente única para Parcela / Campo / Casa con terreno.
-- ------------------------------------------------------------
create table if not exists public.tpl_propiedades (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  publicacion_id uuid references public.tpl_publicaciones(id) on delete set null,
  propietario_actor_id uuid references public.tpl_actores(id) on delete set null,
  corredor_actor_id uuid references public.tpl_actores(id) on delete set null,

  tipo text not null default 'parcela'
    check (tipo in ('parcela','campo','casa','casa_con_terreno')),

  estado text not null default 'revision'
    check (estado in (
      'revision',
      'publicada',
      'reservada',
      'negociacion',
      'vendida',
      'pausada',
      'archivada'
    )),

  titulo text,
  descripcion text,
  region text,
  comuna text,
  sector text,
  direccion_referencia text,

  lat numeric(10,7),
  lng numeric(10,7),

  superficie_m2 numeric,
  precio_publicado bigint,
  moneda text not null default 'CLP',

  rol_situacion text,
  electricidad text,
  agua text,
  acceso text,
  topografia text,
  suelo text,
  exposicion text,
  vista_principal text,
  vegetacion text,
  cierre_perimetral text,
  porton text,
  condominio boolean,
  distancia_ruta_principal_km numeric,

  atributos_naturales jsonb not null default '[]'::jsonb,
  cercanias jsonb not null default '{}'::jsonb,
  cercanias_calculadas_at timestamptz,

  casa_datos jsonb not null default '{}'::jsonb,
  diagnostico jsonb not null default '{}'::jsonb,

  destacada boolean not null default false,
  oportunidad_tpl boolean not null default false,

  publicada_at timestamptz,
  vendida_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tpl_propiedades_lat_check
    check (lat is null or (lat between -90 and 90)),
  constraint tpl_propiedades_lng_check
    check (lng is null or (lng between -180 and 180)),
  constraint tpl_propiedades_superficie_check
    check (superficie_m2 is null or superficie_m2 > 0),
  constraint tpl_propiedades_precio_check
    check (precio_publicado is null or precio_publicado >= 0)
);

drop trigger if exists trg_tpl_propiedades_updated_at on public.tpl_propiedades;
create trigger trg_tpl_propiedades_updated_at
before update on public.tpl_propiedades
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_propiedades_estado_idx
  on public.tpl_propiedades(estado, updated_at desc);
create index if not exists tpl_propiedades_comuna_idx
  on public.tpl_propiedades(comuna, estado);
create index if not exists tpl_propiedades_tipo_idx
  on public.tpl_propiedades(tipo, estado);
create index if not exists tpl_propiedades_oportunidad_idx
  on public.tpl_propiedades(oportunidad_tpl, estado);

-- ------------------------------------------------------------
-- 4. IMÁGENES DE PROPIEDAD
-- ------------------------------------------------------------
create table if not exists public.tpl_propiedad_imagenes (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  storage_path text,
  url text,
  tipo text not null default 'foto'
    check (tipo in ('foto','plano','documento_visual','video_thumb')),
  orden integer not null default 0,
  es_portada boolean not null default false,
  alt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tpl_propiedad_imagenes_propiedad_idx
  on public.tpl_propiedad_imagenes(propiedad_id, orden);

-- ------------------------------------------------------------
-- 5. PROYECTOS
-- Simulación -> interés -> operación activa.
-- ------------------------------------------------------------
create table if not exists public.tpl_proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  comprador_actor_id uuid references public.tpl_actores(id) on delete set null,

  tipo text not null default 'simulacion'
    check (tipo in ('simulacion','comercial','ejecucion')),

  nombre text,
  estado text not null default 'simulacion'
    check (estado in (
      'simulacion',
      'guardado',
      'interes',
      'visita',
      'negociacion',
      'reserva',
      'aprobado',
      'contrato',
      'esperando_pago',
      'activo',
      'en_ejecucion',
      'finalizado',
      'cancelado'
    )),

  presupuesto_objetivo bigint,
  valor_estimado bigint,
  casa_configuracion jsonb not null default '{}'::jsonb,
  configuracion jsonb not null default '{}'::jsonb,

  primer_pago_confirmado boolean not null default false,
  primer_pago_confirmado_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_proyectos_updated_at on public.tpl_proyectos;
create trigger trg_tpl_proyectos_updated_at
before update on public.tpl_proyectos
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_proyectos_comprador_idx
  on public.tpl_proyectos(comprador_actor_id, updated_at desc);
create index if not exists tpl_proyectos_propiedad_idx
  on public.tpl_proyectos(propiedad_id, updated_at desc);
create index if not exists tpl_proyectos_estado_idx
  on public.tpl_proyectos(estado, updated_at desc);

-- ------------------------------------------------------------
-- 6. ACTORES DEL PROYECTO
-- Se van sumando a medida que el proyecto avanza.
-- ------------------------------------------------------------
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

drop trigger if exists trg_tpl_proyecto_actores_updated_at on public.tpl_proyecto_actores;
create trigger trg_tpl_proyecto_actores_updated_at
before update on public.tpl_proyecto_actores
for each row execute function public.tpl_set_updated_at();

-- ------------------------------------------------------------
-- 7. CATÁLOGO DE SERVICIOS
-- Cerco, agua, fosa, electricidad, etc.
-- ------------------------------------------------------------
create table if not exists public.tpl_servicios (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  categoria text not null,
  unidad text,
  descripcion text,
  activo boolean not null default true,
  requiere_visita_tecnica boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_servicios_updated_at on public.tpl_servicios;
create trigger trg_tpl_servicios_updated_at
before update on public.tpl_servicios
for each row execute function public.tpl_set_updated_at();

insert into public.tpl_servicios
(codigo,nombre,categoria,unidad,descripcion,requiere_visita_tecnica)
values
('cerco_perimetral','Cerco perimetral','terreno','metro_lineal','Cierre perimetral para parcela o campo.',true),
('porton_acceso','Portón de acceso','terreno','unidad','Portón de acceso manual o automático.',true),
('solucion_agua','Solución de agua','agua','proyecto','Puntera, pozo u otra solución según factibilidad.',true),
('fosa_septica','Fosa séptica','sanitario','proyecto','Sistema sanitario rural.',true),
('instalacion_electrica','Instalación eléctrica','electricidad','proyecto','Empalme, tablero o instalación según alcance.',true),
('radier_fundacion','Radier / fundación','construccion','m2','Fundación para vivienda o construcción.',true),
('mejora_camino','Mejora de camino / acceso','terreno','proyecto','Mejoramiento de acceso interior o camino.',true),
('limpieza_terreno','Limpieza de terreno','terreno','m2','Roce, despeje y preparación.',true),
('movimiento_tierra','Movimiento de tierra','terreno','proyecto','Nivelación, relleno o excavación.',true),
('paisajismo','Paisajismo','exterior','proyecto','Diseño y ejecución de espacios exteriores.',false)
on conflict (codigo) do nothing;

-- ------------------------------------------------------------
-- 8. NECESIDADES DETECTADAS
-- Puede nacer del publicador/tasador o ser agregada por asesor.
-- ------------------------------------------------------------
create table if not exists public.tpl_necesidades_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references public.tpl_proyectos(id) on delete cascade,
  propiedad_id uuid references public.tpl_propiedades(id) on delete cascade,
  servicio_id uuid not null references public.tpl_servicios(id) on delete restrict,

  origen text not null default 'motor_tpl'
    check (origen in ('motor_tpl','cliente','asesor','partner','inspeccion')),

  prioridad text not null default 'media'
    check (prioridad in ('baja','media','alta','critica')),

  estado text not null default 'detectada'
    check (estado in (
      'detectada',
      'sugerida',
      'agregada',
      'cotizando',
      'contratada',
      'en_ejecucion',
      'completada',
      'descartada'
    )),

  detalle text,
  cantidad numeric,
  unidad text,
  estimacion_referencial bigint,
  evidencia jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tpl_necesidad_proyecto_o_propiedad
    check (proyecto_id is not null or propiedad_id is not null)
);

drop trigger if exists trg_tpl_necesidades_updated_at on public.tpl_necesidades_proyecto;
create trigger trg_tpl_necesidades_updated_at
before update on public.tpl_necesidades_proyecto
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_necesidades_proyecto_idx
  on public.tpl_necesidades_proyecto(proyecto_id, estado);
create index if not exists tpl_necesidades_propiedad_idx
  on public.tpl_necesidades_proyecto(propiedad_id, estado);

-- ------------------------------------------------------------
-- 9. PARTNER -> SERVICIOS -> COBERTURA
-- ------------------------------------------------------------
create table if not exists public.tpl_partner_servicios (
  id uuid primary key default gen_random_uuid(),
  partner_actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  servicio_id uuid not null references public.tpl_servicios(id) on delete cascade,

  regiones text[] not null default '{}',
  comunas text[] not null default '{}',

  modalidad_precio text,
  precio_referencial bigint,
  precio_minimo bigint,

  disponibilidad text not null default 'disponible'
    check (disponibilidad in ('disponible','limitada','no_disponible')),

  rating numeric(3,2),
  trabajos_completados integer not null default 0,

  activo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(partner_actor_id, servicio_id)
);

drop trigger if exists trg_tpl_partner_servicios_updated_at on public.tpl_partner_servicios;
create trigger trg_tpl_partner_servicios_updated_at
before update on public.tpl_partner_servicios
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_partner_servicios_servicio_idx
  on public.tpl_partner_servicios(servicio_id, activo, disponibilidad);

-- ------------------------------------------------------------
-- 10. SOLICITUDES / ÓRDENES DE SERVICIO
-- Partner se activa solo cuando corresponda.
-- ------------------------------------------------------------
create table if not exists public.tpl_ordenes_servicio (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  proyecto_id uuid not null references public.tpl_proyectos(id) on delete cascade,
  necesidad_id uuid references public.tpl_necesidades_proyecto(id) on delete set null,
  servicio_id uuid not null references public.tpl_servicios(id) on delete restrict,
  partner_actor_id uuid references public.tpl_actores(id) on delete set null,

  estado text not null default 'pendiente_activacion'
    check (estado in (
      'pendiente_activacion',
      'buscando_partner',
      'enviada_partner',
      'aceptada_partner',
      'contraoferta',
      'rechazada_partner',
      'esperando_cliente',
      'contratada',
      'en_ejecucion',
      'pausada',
      'completada',
      'cancelada'
    )),

  monto_estimado bigint,
  monto_acordado bigint,
  descripcion_alcance text,

  habilitada_por_pago boolean not null default false,
  habilitada_at timestamptz,

  enviada_partner_at timestamptz,
  aceptada_partner_at timestamptz,
  inicio_estimado date,
  termino_estimado date,
  terminada_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_ordenes_servicio_updated_at on public.tpl_ordenes_servicio;
create trigger trg_tpl_ordenes_servicio_updated_at
before update on public.tpl_ordenes_servicio
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_ordenes_proyecto_idx
  on public.tpl_ordenes_servicio(proyecto_id, estado);
create index if not exists tpl_ordenes_partner_idx
  on public.tpl_ordenes_servicio(partner_actor_id, estado);

-- ------------------------------------------------------------
-- 11. CONTRATOS
-- Plantilla versionada + documento generado.
-- ------------------------------------------------------------
create table if not exists public.tpl_contrato_plantillas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  tipo text not null
    check (tipo in (
      'cliente_tpl',
      'partner_tpl',
      'orden_servicio',
      'anexo',
      'recepcion',
      'otro'
    )),
  version integer not null default 1,
  contenido text not null,
  variables jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  revisado_legalmente boolean not null default false,
  revisado_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(codigo, version)
);

create table if not exists public.tpl_contratos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  proyecto_id uuid references public.tpl_proyectos(id) on delete set null,
  orden_servicio_id uuid references public.tpl_ordenes_servicio(id) on delete set null,
  actor_principal_id uuid references public.tpl_actores(id) on delete set null,
  actor_secundario_id uuid references public.tpl_actores(id) on delete set null,
  plantilla_id uuid references public.tpl_contrato_plantillas(id) on delete restrict,

  tipo text not null,
  version_documento integer not null default 1,

  estado text not null default 'borrador'
    check (estado in (
      'borrador',
      'generado',
      'enviado',
      'aceptado',
      'firmado',
      'rechazado',
      'reemplazado',
      'anulado'
    )),

  monto bigint,
  datos_relleno jsonb not null default '{}'::jsonb,
  contenido_final text,
  pdf_storage_path text,

  generado_at timestamptz,
  enviado_at timestamptz,
  aceptado_at timestamptz,
  firmado_at timestamptz,

  evidencia_aceptacion jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_contratos_updated_at on public.tpl_contratos;
create trigger trg_tpl_contratos_updated_at
before update on public.tpl_contratos
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_contratos_proyecto_idx
  on public.tpl_contratos(proyecto_id, estado);
create index if not exists tpl_contratos_orden_idx
  on public.tpl_contratos(orden_servicio_id, estado);

-- ------------------------------------------------------------
-- 12. PAGOS
-- El primer pago puede habilitar ejecución/Partner.
-- ------------------------------------------------------------
create table if not exists public.tpl_pagos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  proyecto_id uuid not null references public.tpl_proyectos(id) on delete cascade,
  orden_servicio_id uuid references public.tpl_ordenes_servicio(id) on delete set null,
  pagador_actor_id uuid references public.tpl_actores(id) on delete set null,
  receptor_actor_id uuid references public.tpl_actores(id) on delete set null,

  tipo text not null default 'abono'
    check (tipo in (
      'reserva',
      'primer_pago',
      'abono',
      'hito',
      'saldo',
      'devolucion'
    )),

  monto bigint not null check (monto > 0),
  moneda text not null default 'CLP',

  estado text not null default 'pendiente'
    check (estado in (
      'pendiente',
      'informado',
      'en_revision',
      'confirmado',
      'rechazado',
      'anulado',
      'devuelto'
    )),

  medio_pago text,
  referencia text,
  comprobante_storage_path text,

  informado_at timestamptz,
  confirmado_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_pagos_updated_at on public.tpl_pagos;
create trigger trg_tpl_pagos_updated_at
before update on public.tpl_pagos
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_pagos_proyecto_idx
  on public.tpl_pagos(proyecto_id, estado, created_at desc);

-- ------------------------------------------------------------
-- 13. AVANCES DE TRABAJO
-- ------------------------------------------------------------
create table if not exists public.tpl_avances_trabajo (
  id uuid primary key default gen_random_uuid(),
  orden_servicio_id uuid not null references public.tpl_ordenes_servicio(id) on delete cascade,
  partner_actor_id uuid references public.tpl_actores(id) on delete set null,

  porcentaje numeric not null default 0
    check (porcentaje between 0 and 100),

  descripcion text,
  evidencias jsonb not null default '[]'::jsonb,
  monto_solicitado bigint,

  estado text not null default 'enviado'
    check (estado in (
      'borrador',
      'enviado',
      'aprobado_cliente',
      'observado_cliente',
      'aprobado_tpl',
      'pagado'
    )),

  observacion_cliente text,
  enviado_at timestamptz,
  revisado_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_avances_updated_at on public.tpl_avances_trabajo;
create trigger trg_tpl_avances_updated_at
before update on public.tpl_avances_trabajo
for each row execute function public.tpl_set_updated_at();

-- ------------------------------------------------------------
-- 14. EVENTOS / BITÁCORA DEL CEREBRO
-- Todo lo importante debe poder dejar rastro.
-- ------------------------------------------------------------
create table if not exists public.tpl_eventos (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.tpl_actores(id) on delete set null,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  proyecto_id uuid references public.tpl_proyectos(id) on delete set null,
  orden_servicio_id uuid references public.tpl_ordenes_servicio(id) on delete set null,

  evento text not null,
  categoria text,
  origen text,
  pagina text,
  prioridad text,

  descripcion text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists tpl_eventos_proyecto_idx
  on public.tpl_eventos(proyecto_id, created_at desc);
create index if not exists tpl_eventos_propiedad_idx
  on public.tpl_eventos(propiedad_id, created_at desc);
create index if not exists tpl_eventos_evento_idx
  on public.tpl_eventos(evento, created_at desc);

-- ------------------------------------------------------------
-- 15. TAREAS / ACCIONES DEL CRM
-- Para que el cerebro pueda decir "qué hacer hoy".
-- ------------------------------------------------------------
create table if not exists public.tpl_tareas (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.tpl_actores(id) on delete set null,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  proyecto_id uuid references public.tpl_proyectos(id) on delete set null,
  orden_servicio_id uuid references public.tpl_ordenes_servicio(id) on delete set null,

  titulo text not null,
  detalle text,
  tipo text,
  prioridad text not null default 'media'
    check (prioridad in ('baja','media','alta','urgente')),

  estado text not null default 'pendiente'
    check (estado in ('pendiente','en_progreso','esperando','completada','cancelada')),

  vence_at timestamptz,
  completada_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_tareas_updated_at on public.tpl_tareas;
create trigger trg_tpl_tareas_updated_at
before update on public.tpl_tareas
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_tareas_estado_idx
  on public.tpl_tareas(estado, prioridad, vence_at);

-- ------------------------------------------------------------
-- 16. AUTOMATIZACIÓN CLAVE:
-- confirmar primer pago -> proyecto habilitado para órdenes de servicio
-- NO asigna Partner automáticamente; solo habilita la fase.
-- ------------------------------------------------------------
create or replace function public.tpl_sync_primer_pago()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'primer_pago'
     and new.estado = 'confirmado'
     and (TG_OP = 'INSERT' or old.estado is distinct from new.estado) then

    update public.tpl_proyectos
       set primer_pago_confirmado = true,
           primer_pago_confirmado_at = coalesce(new.confirmado_at, now()),
           estado = case
             when estado in ('aprobado','contrato','esperando_pago') then 'activo'
             else estado
           end
     where id = new.proyecto_id;

    update public.tpl_ordenes_servicio
       set habilitada_por_pago = true,
           habilitada_at = coalesce(habilitada_at, now()),
           estado = case
             when estado = 'pendiente_activacion' then 'buscando_partner'
             else estado
           end
     where proyecto_id = new.proyecto_id;

    insert into public.tpl_eventos
      (proyecto_id, evento, categoria, origen, prioridad, descripcion, metadata)
    values
      (
        new.proyecto_id,
        'primer_pago_confirmado',
        'pago',
        'supabase',
        'alta',
        'Primer pago confirmado. El proyecto puede comenzar la activación de servicios y Partners.',
        jsonb_build_object('pago_id', new.id, 'monto', new.monto)
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tpl_sync_primer_pago on public.tpl_pagos;
create trigger trg_tpl_sync_primer_pago
after insert or update of estado on public.tpl_pagos
for each row execute function public.tpl_sync_primer_pago();

-- ------------------------------------------------------------
-- 17. VISTAS DEL CEREBRO
-- ------------------------------------------------------------
create or replace view public.tpl_cerebro_operaciones as
select
  p.id as proyecto_id,
  p.codigo,
  p.nombre,
  p.estado,
  p.primer_pago_confirmado,
  p.updated_at,

  prop.id as propiedad_id,
  prop.titulo as propiedad,
  prop.comuna,
  prop.precio_publicado,

  comp.id as comprador_id,
  comp.nombre as comprador,
  comp.email as comprador_email,
  comp.telefono as comprador_telefono,

  (
    select count(*)
    from public.tpl_necesidades_proyecto n
    where n.proyecto_id=p.id
      and n.estado not in ('completada','descartada')
  ) as necesidades_pendientes,

  (
    select count(*)
    from public.tpl_ordenes_servicio o
    where o.proyecto_id=p.id
      and o.estado not in ('completada','cancelada')
  ) as ordenes_activas,

  (
    select count(*)
    from public.tpl_tareas t
    where t.proyecto_id=p.id
      and t.estado in ('pendiente','en_progreso','esperando')
  ) as tareas_pendientes,

  (
    select max(e.created_at)
    from public.tpl_eventos e
    where e.proyecto_id=p.id
  ) as ultimo_evento_at

from public.tpl_proyectos p
left join public.tpl_propiedades prop on prop.id=p.propiedad_id
left join public.tpl_actores comp on comp.id=p.comprador_actor_id;

create or replace view public.tpl_cerebro_alertas as
select
  'tarea_vencida'::text as tipo,
  t.prioridad,
  t.titulo as mensaje,
  t.proyecto_id,
  t.propiedad_id,
  t.actor_id,
  t.vence_at as fecha_relevante,
  t.id as referencia_id
from public.tpl_tareas t
where t.estado in ('pendiente','en_progreso')
  and t.vence_at is not null
  and t.vence_at < now()

union all

select
  'orden_sin_partner'::text,
  'alta'::text,
  'Servicio habilitado sin Partner asignado'::text,
  o.proyecto_id,
  p.propiedad_id,
  null::uuid,
  coalesce(o.habilitada_at,o.updated_at),
  o.id
from public.tpl_ordenes_servicio o
join public.tpl_proyectos p on p.id=o.proyecto_id
where o.estado='buscando_partner'
  and o.partner_actor_id is null

union all

select
  'proyecto_sin_movimiento'::text,
  'media'::text,
  'Proyecto activo sin movimiento reciente'::text,
  p.id,
  p.propiedad_id,
  p.comprador_actor_id,
  p.updated_at,
  p.id
from public.tpl_proyectos p
where p.estado in ('interes','visita','negociacion','reserva','activo','en_ejecucion')
  and p.updated_at < now() - interval '7 days';

-- ------------------------------------------------------------
-- 18. RLS
-- Datos sensibles quedan cerrados por defecto.
-- ------------------------------------------------------------
alter table public.tpl_actores enable row level security;
alter table public.tpl_actor_roles enable row level security;
alter table public.tpl_publicaciones enable row level security;
alter table public.tpl_propiedades enable row level security;
alter table public.tpl_propiedad_imagenes enable row level security;
alter table public.tpl_proyectos enable row level security;
alter table public.tpl_proyecto_actores enable row level security;
alter table public.tpl_servicios enable row level security;
alter table public.tpl_necesidades_proyecto enable row level security;
alter table public.tpl_partner_servicios enable row level security;
alter table public.tpl_ordenes_servicio enable row level security;
alter table public.tpl_contrato_plantillas enable row level security;
alter table public.tpl_contratos enable row level security;
alter table public.tpl_pagos enable row level security;
alter table public.tpl_avances_trabajo enable row level security;
alter table public.tpl_eventos enable row level security;
alter table public.tpl_tareas enable row level security;

-- Catálogo público: propiedades publicadas, imágenes y servicios.
drop policy if exists tpl_propiedades_public_read on public.tpl_propiedades;
create policy tpl_propiedades_public_read
on public.tpl_propiedades
for select
to anon, authenticated
using (estado='publicada');

drop policy if exists tpl_propiedad_imagenes_public_read on public.tpl_propiedad_imagenes;
create policy tpl_propiedad_imagenes_public_read
on public.tpl_propiedad_imagenes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tpl_propiedades p
    where p.id=tpl_propiedad_imagenes.propiedad_id
      and p.estado='publicada'
  )
);

drop policy if exists tpl_servicios_public_read on public.tpl_servicios;
create policy tpl_servicios_public_read
on public.tpl_servicios
for select
to anon, authenticated
using (activo=true);

-- El resto permanece sin políticas públicas.
-- Las operaciones sensibles deben ejecutarse con usuarios autenticados
-- y, posteriormente, RPC/Edge Functions controladas.

-- ------------------------------------------------------------
-- FIN NÚCLEO CANÓNICO v1
-- ------------------------------------------------------------
