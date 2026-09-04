-- ------------------------------------------------------------
-- FASE 1: CREACIÓN DE LA TABLA DE VISITAS PARA CRM TPL
-- ------------------------------------------------------------

create table if not exists public.tpl_visitas (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.tpl_oportunidades(id) on delete cascade,
  usuario_staff_id uuid references public.tpl_actores(id) on delete set null,
  fecha_hora timestamptz not null,
  estado text not null default 'programada'
    check (estado in ('programada','confirmada','realizada','cancelada','no_asistio')),
  resultado text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para optimizar búsquedas frecuentes de la agenda crm
create index if not exists tpl_visitas_oportunidad_idx on public.tpl_visitas(oportunidad_id);
create index if not exists tpl_visitas_fecha_hora_idx on public.tpl_visitas(fecha_hora desc);
create index if not exists tpl_visitas_staff_idx on public.tpl_visitas(usuario_staff_id, fecha_hora desc);

-- Trigger para automatizar el guardado de updated_at
drop trigger if exists trg_tpl_visitas_updated_at on public.tpl_visitas;
create trigger trg_tpl_visitas_updated_at
before update on public.tpl_visitas
for each row execute function public.tpl_set_updated_at();

-- Habilitar Seguridad a Nivel de Fila (RLS)
alter table public.tpl_visitas enable row level security;

-- Política RLS estricta para uso exclusivo de staff autenticado
drop policy if exists tpl_visitas_staff_all on public.tpl_visitas;
create policy tpl_visitas_staff_all
on public.tpl_visitas
for all
to authenticated
using (public.tpl_es_staff())
with check (public.tpl_es_staff());
