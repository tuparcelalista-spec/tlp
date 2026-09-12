-- TPL Studio & Google Veo: Infraestructura de Video y Persistencia Audiovisual
-- Fecha: 2026-09-10
-- Fase 1: Tablas de videos, proyectos de studio, storage bucket y políticas RLS

begin;

-- 1. Tabla de Videos de la Propiedad
create table if not exists public.tpl_propiedad_videos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  creado_por_actor_id uuid references public.tpl_actores(id) on delete set null,
  formato varchar(10) not null check (formato in ('16:9', '9:16')),
  tipo_video varchar(30) not null default 'veo_cinematic' check (tipo_video in ('veo_cinematic', 'reels_promocional', 'tour_dron', 'otro')),
  titulo varchar(200) not null default 'Video Cinemático TPL',
  storage_path text,
  video_url text,
  thumbnail_url text,
  duracion_segundos numeric(5,2) default 8.00,
  resolucion varchar(20) default '1080p',
  prompt_utilizado text,
  fotos_referencia_utilizadas jsonb default '[]'::jsonb,
  veo_operation_name text,
  estado_generacion varchar(20) not null default 'pendiente' 
    check (estado_generacion in ('pendiente', 'procesando', 'completado', 'fallido')),
  error_mensaje text,
  publicado_en_parcela boolean not null default false,
  orden_en_ficha integer default 1,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de alto rendimiento
create index if not exists idx_propiedad_videos_propiedad 
  on public.tpl_propiedad_videos(propiedad_id, created_at desc);
create index if not exists idx_propiedad_videos_publicado 
  on public.tpl_propiedad_videos(propiedad_id, publicado_en_parcela);
create index if not exists idx_propiedad_videos_estado 
  on public.tpl_propiedad_videos(estado_generacion);

-- Trigger para updated_at automático
drop trigger if exists trg_tpl_propiedad_videos_updated_at on public.tpl_propiedad_videos;
create trigger trg_tpl_propiedad_videos_updated_at
before update on public.tpl_propiedad_videos
for each row execute function public.tpl_set_updated_at();

-- 2. Tabla de Proyectos y Guiones de Studio
create table if not exists public.tpl_studio_proyectos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  creado_por_actor_id uuid references public.tpl_actores(id) on delete set null,
  titulo_proyecto varchar(250) not null default 'Proyecto Audiovisual',
  modo_creador varchar(20) not null default 'staff' check (modo_creador in ('staff', 'propietario')),
  guion_comercial jsonb default '{}'::jsonb,
  configuracion_escenas jsonb default '[]'::jsonb,
  estado varchar(20) not null default 'borrador' check (estado in ('borrador', 'en_render', 'finalizado', 'archivado')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_studio_proyectos_propiedad 
  on public.tpl_studio_proyectos(propiedad_id, created_at desc);

drop trigger if exists trg_tpl_studio_proyectos_updated_at on public.tpl_studio_proyectos;
create trigger trg_tpl_studio_proyectos_updated_at
before update on public.tpl_studio_proyectos
for each row execute function public.tpl_set_updated_at();

-- 3. Storage Bucket para Videos de Propiedades
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tpl-propiedades-videos',
  'tpl-propiedades-videos',
  true,
  104857600, -- 100MB límite
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update 
set public = true,
    file_size_limit = 104857600,
    allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'];

-- 4. Políticas RLS
alter table public.tpl_propiedad_videos enable row level security;
alter table public.tpl_studio_proyectos enable row level security;

-- Lectura pública de videos marcados como publicados en parcela
drop policy if exists tpl_propiedad_videos_public_read on public.tpl_propiedad_videos;
create policy tpl_propiedad_videos_public_read
on public.tpl_propiedad_videos
for select
to anon, authenticated
using (publicado_en_parcela = true);

-- Staff tiene acceso total a todos los videos
drop policy if exists tpl_propiedad_videos_staff_all on public.tpl_propiedad_videos;
create policy tpl_propiedad_videos_staff_all
on public.tpl_propiedad_videos
for all
to authenticated
using (coalesce(public.tpl_es_staff(), false))
with check (coalesce(public.tpl_es_staff(), false));

-- Staff tiene acceso total a los proyectos de studio
drop policy if exists tpl_studio_proyectos_staff_all on public.tpl_studio_proyectos;
create policy tpl_studio_proyectos_staff_all
on public.tpl_studio_proyectos
for all
to authenticated
using (coalesce(public.tpl_es_staff(), false))
with check (coalesce(public.tpl_es_staff(), false));

-- Permisos de Grants
grant select on public.tpl_propiedad_videos to anon;
grant select, insert, update, delete on public.tpl_propiedad_videos to authenticated;
grant select, insert, update, delete on public.tpl_propiedad_videos to service_role;

grant select, insert, update, delete on public.tpl_studio_proyectos to authenticated;
grant select, insert, update, delete on public.tpl_studio_proyectos to service_role;

-- 5. RPC para Publicar/Despublicar Video en Ficha de Parcela
create or replace function public.tpl_studio_publicar_video_parcela_v1(
  p_video_id uuid,
  p_publicar boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_video record;
begin
  -- Validar que el usuario sea staff o service_role
  if auth.role() <> 'service_role' and not coalesce(public.tpl_es_staff(), false) then
    return jsonb_build_object('ok', false, 'error', 'NO_AUTORIZADO');
  end if;

  select * into v_video
  from public.tpl_propiedad_videos
  where id = p_video_id;

  if v_video.id is null then
    return jsonb_build_object('ok', false, 'error', 'VIDEO_NO_ENCONTRADO');
  end if;

  if p_publicar and v_video.estado_generacion <> 'completado' then
    return jsonb_build_object('ok', false, 'error', 'VIDEO_NO_COMPLETADO');
  end if;

  update public.tpl_propiedad_videos
  set publicado_en_parcela = p_publicar,
      updated_at = now()
  where id = p_video_id;

  return jsonb_build_object(
    'ok', true,
    'video_id', p_video_id,
    'propiedad_id', v_video.propiedad_id,
    'publicado_en_parcela', p_publicar
  );
end;
$$;

grant execute on function public.tpl_studio_publicar_video_parcela_v1(uuid, boolean) to authenticated;
grant execute on function public.tpl_studio_publicar_video_parcela_v1(uuid, boolean) to service_role;

commit;
