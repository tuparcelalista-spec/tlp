-- TPL Onboarding Propietario Gratis v1
-- Ejecutar después de 202608010003_tpl_agenda_propietario_v1.sql

create table if not exists public.tpl_onboarding_propietario (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null unique references public.tpl_publicaciones(id) on delete cascade,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','procesando','invitacion_enviada','completado','error')),
  plan_codigo text not null default 'gratis',
  suscripcion_id uuid references public.tpl_suscripciones(id) on delete set null,
  correo_publicacion_estado text not null default 'pendiente'
    check (correo_publicacion_estado in ('pendiente','enviado','error')),
  correo_bienvenida_estado text not null default 'pendiente'
    check (correo_bienvenida_estado in ('pendiente','enviado','error')),
  correo_publicacion_id text,
  correo_bienvenida_id text,
  invitacion_enviada_at timestamptz,
  completado_at timestamptz,
  intentos integer not null default 0,
  ultimo_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_onboarding_propietario_estado_idx
  on public.tpl_onboarding_propietario(estado, updated_at desc);
create index if not exists tpl_onboarding_propietario_email_idx
  on public.tpl_onboarding_propietario(lower(email));

alter table public.tpl_onboarding_propietario enable row level security;
revoke all on public.tpl_onboarding_propietario from anon, authenticated;

-- Evita duplicar una suscripción del mismo plan para la misma propiedad.
create unique index if not exists tpl_suscripcion_propiedad_plan_activa_unique
  on public.tpl_suscripciones(propiedad_id, plan_id)
  where propiedad_id is not null and estado in ('prueba','activa');

create or replace function public.tpl_estado_onboarding_publicacion_v1(p_publicacion_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid;
  v_row public.tpl_onboarding_propietario;
begin
  if auth.uid() is null then raise exception 'Sesión requerida.'; end if;
  v_actor := public.tpl_actor_actual_id();
  if v_actor is null then return jsonb_build_object('ok',false,'mensaje','Cuenta sin actor vinculado.'); end if;

  select o.* into v_row
  from public.tpl_onboarding_propietario o
  where o.publicacion_id=p_publicacion_id and o.actor_id=v_actor;

  if not found then return jsonb_build_object('ok',false,'encontrado',false); end if;
  return jsonb_build_object(
    'ok',true,
    'encontrado',true,
    'estado',v_row.estado,
    'correo_publicacion_estado',v_row.correo_publicacion_estado,
    'correo_bienvenida_estado',v_row.correo_bienvenida_estado,
    'invitacion_enviada_at',v_row.invitacion_enviada_at,
    'completado_at',v_row.completado_at
  );
end;
$$;

grant execute on function public.tpl_estado_onboarding_publicacion_v1(uuid) to authenticated;

comment on table public.tpl_onboarding_propietario is
'Registra de forma idempotente la activación del Plan Gratis, invitación Auth y correos de publicación/Agenda Virtual.';
