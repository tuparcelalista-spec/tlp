-- TPL Core canónico: actores, roles, propiedades, necesidades, proyectos y eventos.
-- No modifica ni reemplaza la integración Flow existente.

create extension if not exists pgcrypto;

create table if not exists public.tpl_actores (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('persona','empresa')),
  nombre text not null,
  email text,
  telefono text,
  rut text,
  region text,
  comuna text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tpl_actores_email_unique
  on public.tpl_actores (lower(email)) where email is not null and email <> '';

create table if not exists public.tpl_actor_roles (
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  rol text not null check (rol in ('comprador','propietario','corredor','partner','contratista','equipo_tpl')),
  estado text not null default 'activo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, rol)
);

create table if not exists public.tpl_propiedades (
  id uuid primary key default gen_random_uuid(),
  propietario_actor_id uuid references public.tpl_actores(id),
  corredor_actor_id uuid references public.tpl_actores(id),
  codigo text unique,
  tipo text not null default 'parcela',
  titulo text,
  region text,
  comuna text,
  localidad text,
  ubicacion_texto text,
  lat numeric,
  lng numeric,
  superficie_m2 numeric,
  precio_publicado bigint,
  estado_publicacion text not null default 'pendiente_revision',
  modalidad_administracion text not null default 'por_definir' check (modalidad_administracion in ('por_definir','autogestion','administrado_tpl')),
  atributos jsonb not null default '{}'::jsonb,
  diagnostico jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tpl_necesidades (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid references public.tpl_propiedades(id) on delete cascade,
  proyecto_id uuid,
  tipo text not null,
  descripcion text,
  estado text not null default 'detectada',
  origen text not null default 'publicador',
  negociable boolean not null default false,
  condiciones jsonb not null default '{}'::jsonb,
  datos_tecnicos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tpl_proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  propiedad_id uuid references public.tpl_propiedades(id),
  comprador_actor_id uuid references public.tpl_actores(id),
  propietario_actor_id uuid references public.tpl_actores(id),
  corredor_actor_id uuid references public.tpl_actores(id),
  fase smallint not null default 1 check (fase between 1 and 7),
  estado text not null default 'activo',
  proxima_accion text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tpl_necesidades
  drop constraint if exists tpl_necesidades_proyecto_id_fkey;
alter table public.tpl_necesidades
  add constraint tpl_necesidades_proyecto_id_fkey foreign key (proyecto_id) references public.tpl_proyectos(id) on delete set null;

create table if not exists public.tpl_eventos (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  actor_id uuid references public.tpl_actores(id),
  propiedad_id uuid references public.tpl_propiedades(id),
  proyecto_id uuid references public.tpl_proyectos(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tpl_onboarding (
  actor_id uuid primary key references public.tpl_actores(id) on delete cascade,
  estado text not null default 'registro_creado',
  bienvenida_enviada_at timestamptz,
  correo_acceso_enviado_at timestamptz,
  primer_ingreso_at timestamptz,
  perfil_completo_at timestamptz,
  recordatorio_1_enviado_at timestamptz,
  recordatorio_2_enviado_at timestamptz,
  proxima_accion text,
  proxima_accion_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.tpl_publicar_propiedad_v2(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.tpl_actores;
  v_propiedad public.tpl_propiedades;
  v_necesidad jsonb;
  v_codigo text;
begin
  if coalesce(trim(p_payload #>> '{contacto,nombre}'),'') = '' then
    raise exception 'Nombre de contacto requerido';
  end if;
  if coalesce(trim(p_payload #>> '{contacto,email}'),'') = '' then
    raise exception 'Correo de contacto requerido';
  end if;

  insert into public.tpl_actores(tipo,nombre,email,telefono,rut,region,comuna,metadata)
  values (
    case when coalesce(p_payload #>> '{contacto,tipoActor}','persona')='empresa' then 'empresa' else 'persona' end,
    p_payload #>> '{contacto,nombre}', lower(p_payload #>> '{contacto,email}'),
    p_payload #>> '{contacto,telefono}', p_payload #>> '{contacto,rut}',
    p_payload->>'region', p_payload->>'comuna',
    jsonb_build_object('origen','publicador_v2','responsable',p_payload #>> '{contacto,responsable}')
  )
  on conflict (lower(email)) where email is not null and email <> ''
  do update set nombre=excluded.nombre, telefono=excluded.telefono, rut=excluded.rut,
    region=excluded.region, comuna=excluded.comuna, updated_at=now()
  returning * into v_actor;

  insert into public.tpl_actor_roles(actor_id,rol)
  values (v_actor.id, case when p_payload #>> '{contacto,responsable}'='corredor' then 'corredor' else 'propietario' end)
  on conflict do nothing;

  insert into public.tpl_onboarding(actor_id,estado,proxima_accion)
  values(v_actor.id,'registro_creado','Enviar mensaje de bienvenida y acceso a TPL Business')
  on conflict(actor_id) do update set updated_at=now();

  v_codigo := 'TPL-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.tpl_propiedades(
    propietario_actor_id, corredor_actor_id, codigo, tipo, titulo, region, comuna, localidad,
    ubicacion_texto, lat, lng, superficie_m2, precio_publicado, estado_publicacion,
    atributos, diagnostico, metadata
  ) values (
    case when p_payload #>> '{contacto,responsable}'='propietario' then v_actor.id else null end,
    case when p_payload #>> '{contacto,responsable}'='corredor' then v_actor.id else null end,
    v_codigo, coalesce(p_payload->>'tipo','parcela'), p_payload->>'titulo', p_payload->>'region',
    p_payload->>'comuna', p_payload->>'localidad', p_payload->>'ubicacionTexto',
    nullif(p_payload #>> '{coords,lat}','')::numeric, nullif(p_payload #>> '{coords,lng}','')::numeric,
    nullif(p_payload->>'superficie','')::numeric, nullif(p_payload->>'precio','')::bigint,
    'pendiente_revision', coalesce(p_payload->'servicios','{}'::jsonb),
    coalesce(p_payload->'diagnostico','{}'::jsonb),
    jsonb_build_object('descripcion',p_payload->>'descripcion','tasacion',p_payload->'valuation','photoNames',p_payload->'photoNames')
  ) returning * into v_propiedad;

  for v_necesidad in select * from jsonb_array_elements(coalesce(p_payload #> '{diagnostico,necesidades}','[]'::jsonb))
  loop
    insert into public.tpl_necesidades(propiedad_id,tipo,descripcion,negociable,condiciones,datos_tecnicos)
    values(v_propiedad.id,v_necesidad->>'tipo',v_necesidad->>'descripcion',coalesce((v_necesidad->>'negociable')::boolean,false),
      coalesce(v_necesidad->'condiciones','{}'::jsonb),coalesce(v_necesidad->'datos','{}'::jsonb));
  end loop;

  insert into public.tpl_eventos(evento,actor_id,propiedad_id,payload)
  values('propiedad.publicada',v_actor.id,v_propiedad.id,jsonb_build_object('codigo',v_codigo,'origen','publicador_v2'));

  return jsonb_build_object('ok',true,'actor_id',v_actor.id,'propiedad_id',v_propiedad.id,'codigo',v_codigo,
    'onboarding_estado','registro_creado','proxima_accion','Enviar bienvenida y acceso a TPL Business');
end;
$$;

alter table public.tpl_actores enable row level security;
alter table public.tpl_actor_roles enable row level security;
alter table public.tpl_propiedades enable row level security;
alter table public.tpl_necesidades enable row level security;
alter table public.tpl_proyectos enable row level security;
alter table public.tpl_eventos enable row level security;
alter table public.tpl_onboarding enable row level security;

grant execute on function public.tpl_publicar_propiedad_v2(jsonb) to anon, authenticated;
