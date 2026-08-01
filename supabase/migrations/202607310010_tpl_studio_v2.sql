-- TPL Studio V2 · campañas, recursos, canales y atribución
create extension if not exists pgcrypto;

create table if not exists public.studio_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  nombre text not null,
  tipo_objetivo text not null,
  objetivo_id text,
  objetivo_comercial text not null default 'captar_compradores',
  tono text,
  audiencia text,
  estado text not null default 'borrador' check (estado in ('borrador','revision','aprobada','activa','pausada','finalizada','archivada')),
  datos_fuente jsonb not null default '{}'::jsonb,
  estrategia jsonb not null default '{}'::jsonb,
  storyboard jsonb not null default '{}'::jsonb,
  canales jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_outputs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.studio_campaigns(id) on delete cascade,
  tipo text not null,
  canal text,
  estado text not null default 'preparado' check (estado in ('preparado','revision','renderizando','programado','publicado','fallido','archivado')),
  titulo text,
  contenido jsonb not null default '{}'::jsonb,
  asset_url text,
  external_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_channel_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('youtube','facebook','instagram')),
  external_account_id text,
  display_name text,
  estado text not null default 'pendiente' check (estado in ('pendiente','conectado','revocado','error')),
  scopes text[] not null default '{}',
  token_secret_ref text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(owner_user_id, provider, external_account_id)
);

create table if not exists public.studio_events (
  id bigint generated always as identity primary key,
  campaign_id uuid references public.studio_campaigns(id) on delete set null,
  output_id uuid references public.studio_outputs(id) on delete set null,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  evento text not null,
  pagina text,
  entidad_tipo text,
  entidad_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_studio_campaigns_owner on public.studio_campaigns(owner_user_id, created_at desc);
create index if not exists idx_studio_campaigns_target on public.studio_campaigns(tipo_objetivo, objetivo_id);
create index if not exists idx_studio_outputs_campaign on public.studio_outputs(campaign_id, created_at desc);
create index if not exists idx_studio_events_campaign on public.studio_events(campaign_id, created_at desc);
create index if not exists idx_studio_events_evento on public.studio_events(evento, created_at desc);

alter table public.studio_campaigns enable row level security;
alter table public.studio_outputs enable row level security;
alter table public.studio_channel_connections enable row level security;
alter table public.studio_events enable row level security;

-- Helper canónico para saber si el usuario autenticado pertenece al staff TPL.
create or replace function public.tpl_es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tpl_staff s
    where s.user_id = auth.uid()
  );
$$;

create policy "studio campaigns own or admin select" on public.studio_campaigns
for select to authenticated using (owner_user_id = auth.uid() or public.tpl_es_admin());
create policy "studio campaigns own insert" on public.studio_campaigns
for insert to authenticated with check (owner_user_id is null or owner_user_id = auth.uid() or public.tpl_es_admin());
create policy "studio campaigns own or admin update" on public.studio_campaigns
for update to authenticated using (owner_user_id = auth.uid() or public.tpl_es_admin()) with check (owner_user_id = auth.uid() or public.tpl_es_admin());

create policy "studio outputs visible by campaign" on public.studio_outputs
for select to authenticated using (exists(select 1 from public.studio_campaigns c where c.id=campaign_id and (c.owner_user_id=auth.uid() or public.tpl_es_admin())));
create policy "studio outputs insert by campaign" on public.studio_outputs
for insert to authenticated with check (exists(select 1 from public.studio_campaigns c where c.id=campaign_id and (c.owner_user_id=auth.uid() or public.tpl_es_admin())));
create policy "studio outputs update by campaign" on public.studio_outputs
for update to authenticated using (exists(select 1 from public.studio_campaigns c where c.id=campaign_id and (c.owner_user_id=auth.uid() or public.tpl_es_admin())));

create policy "studio channels own" on public.studio_channel_connections
for all to authenticated using (owner_user_id=auth.uid() or public.tpl_es_admin()) with check (owner_user_id=auth.uid() or public.tpl_es_admin());

create policy "studio event public insert" on public.studio_events
for insert to anon, authenticated with check (true);
create policy "studio event admin or campaign owner select" on public.studio_events
for select to authenticated using (
  public.tpl_es_admin() or exists(select 1 from public.studio_campaigns c where c.id=campaign_id and c.owner_user_id=auth.uid())
);

create or replace function public.tpl_studio_resumen_v1()
returns jsonb language sql stable security definer set search_path=public as $$
  with allowed as (
    select id from public.studio_campaigns
    where owner_user_id=auth.uid() or public.tpl_es_admin()
  ), ev as (
    select e.* from public.studio_events e join allowed a on a.id=e.campaign_id
  )
  select jsonb_build_object(
    'campaigns',(select count(*) from allowed),
    'outputs',(select count(*) from public.studio_outputs o join allowed a on a.id=o.campaign_id),
    'published',(select count(*) from public.studio_outputs o join allowed a on a.id=o.campaign_id where o.estado='publicado'),
    'visits',(select count(*) from ev where evento in ('page_view','landing_view','project_view')),
    'leads',(select count(*) from ev where evento in ('lead','whatsapp_click','call_request','question_sent')),
    'conversions',(select count(*) from ev where evento in ('visit_booked','reservation_paid','sale_closed'))
  );
$$;
grant execute on function public.tpl_studio_resumen_v1() to authenticated;

-- Contexto canónico. Retorna lo disponible sin exigir que todas las tablas existan en cada instalación.
create or replace function public.tpl_studio_contexto_v1(p_tipo text, p_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v jsonb;
begin
  if p_tipo in ('propiedad','parcela','publicacion') and to_regclass('public.publicaciones') is not null then
    execute 'select to_jsonb(x) from public.publicaciones x where x.id::text=$1 limit 1' into v using p_id;
  elsif p_tipo='proyecto' and to_regclass('public.proyectos') is not null then
    execute 'select to_jsonb(x) from public.proyectos x where x.id::text=$1 limit 1' into v using p_id;
  elsif p_tipo in ('cliente','propietario','corredor') and to_regclass('public.clientes') is not null then
    execute 'select to_jsonb(x) from public.clientes x where x.id::text=$1 limit 1' into v using p_id;
  elsif p_tipo='partner' and to_regclass('public.contratistas') is not null then
    execute 'select to_jsonb(x) from public.contratistas x where x.id::text=$1 limit 1' into v using p_id;
  end if;
  return case when v is null then null else jsonb_build_object('id',p_id,'type',p_tipo,'data',v) end;
end;
$$;
grant execute on function public.tpl_studio_contexto_v1(text,text) to authenticated;
