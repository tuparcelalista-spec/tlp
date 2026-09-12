-- Tu Parcela Lista
-- Borrador de landing persistido en la base de datos
-- Fecha: 2026-09-03
--
-- QUÉ HACE
--   El editor de landing de tpl-business-v2/modules/landing solo guardaba el
--   borrador en localStorage del navegador: si el propietario cambiaba de
--   computador o de navegador, perdía todo lo que había ajustado. Esta tabla
--   guarda el mismo borrador en el servidor, ligado a la propiedad, para que
--   persista entre dispositivos y sesiones. localStorage se mantiene como
--   caché rápida local; el servidor es ahora la fuente de verdad.
--
-- SEGURIDAD
--   Solo el propietario o corredor de la propiedad puede leer o escribir su
--   propio borrador. Staff puede leer todos (consistente con el resto del
--   sistema). tpl_actores NO tiene columna auth_user_id (esa columna solo
--   existe en tablas de onboarding, como tpl_onboarding_propietario) — el
--   patrón real que ya usa el resto del proyecto para resolver el actor
--   autenticado es por correo, comparando contra auth.jwt()->>'email' (ver
--   202608020001_tpl_business_partner_trial_v1.sql línea 117). Se usa el
--   mismo patrón aquí.

create table if not exists public.tpl_landing_borradores (
  propiedad_id uuid primary key references public.tpl_propiedades(id) on delete cascade,
  actor_id uuid references public.tpl_actores(id) on delete set null,
  borrador jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tpl_landing_borradores enable row level security;
revoke all on public.tpl_landing_borradores from anon, authenticated;

create or replace function public.tpl_es_dueno_propiedad(p_propiedad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tpl_propiedades p
    join public.tpl_actores a on a.id in (p.propietario_actor_id, p.corredor_actor_id)
    where p.id = p_propiedad_id
      and lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
      and coalesce(a.email, '') <> ''
  );
$$;

grant execute on function public.tpl_es_dueno_propiedad(uuid) to authenticated;

drop policy if exists tpl_landing_borradores_dueno_select on public.tpl_landing_borradores;
create policy tpl_landing_borradores_dueno_select on public.tpl_landing_borradores
  for select to authenticated
  using (public.tpl_es_dueno_propiedad(propiedad_id) or public.tpl_es_staff());

drop policy if exists tpl_landing_borradores_dueno_insert on public.tpl_landing_borradores;
create policy tpl_landing_borradores_dueno_insert on public.tpl_landing_borradores
  for insert to authenticated
  with check (public.tpl_es_dueno_propiedad(propiedad_id));

drop policy if exists tpl_landing_borradores_dueno_update on public.tpl_landing_borradores;
create policy tpl_landing_borradores_dueno_update on public.tpl_landing_borradores
  for update to authenticated
  using (public.tpl_es_dueno_propiedad(propiedad_id))
  with check (public.tpl_es_dueno_propiedad(propiedad_id));
