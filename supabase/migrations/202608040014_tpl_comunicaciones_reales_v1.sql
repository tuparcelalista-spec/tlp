-- TPL Comunicaciones reales v1
-- Procesamiento seguro e idempotente de la cola de correos.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.tpl_comunicaciones_cola (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.tpl_actores(id) on delete set null,
  canal text not null default 'email' check (canal in ('email','whatsapp','interno')),
  destinatario text,
  plantilla text not null,
  asunto text,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente','procesando','enviado','error','cancelado')),
  intentos integer not null default 0,
  ultimo_error text,
  procesar_desde timestamptz not null default now(),
  bloqueado_at timestamptz,
  bloqueado_por text,
  proveedor_id text,
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tpl_comunicaciones_cola
  add column if not exists bloqueado_at timestamptz,
  add column if not exists bloqueado_por text,
  add column if not exists proveedor_id text;

create index if not exists tpl_comunicaciones_cola_proceso_idx
  on public.tpl_comunicaciones_cola(estado,canal,procesar_desde,created_at);
create unique index if not exists tpl_comunicaciones_cola_idempotencia_idx
  on public.tpl_comunicaciones_cola((payload->>'idempotency_key'))
  where nullif(payload->>'idempotency_key','') is not null;

alter table public.tpl_comunicaciones_cola enable row level security;
revoke all on public.tpl_comunicaciones_cola from anon, authenticated;

-- Migra comunicaciones antiguas si esa tabla existe. No duplica filas ya migradas.
do $$
begin
  if to_regclass('public.tpl_comunicaciones_pendientes') is not null then
    execute $m$
      insert into public.tpl_comunicaciones_cola(canal,destinatario,plantilla,asunto,payload,estado,intentos,ultimo_error,procesar_desde,enviado_at,created_at,updated_at)
      select coalesce(tipo,'email'), destinatario, coalesce(plantilla,'generica'), asunto,
             coalesce(variables,'{}'::jsonb) || jsonb_build_object('legacy_id',id::text,'idempotency_key','legacy-'||id::text),
             estado, intentos, ultimo_error, programado_at, enviado_at, created_at, updated_at
      from public.tpl_comunicaciones_pendientes p
      where not exists (
        select 1 from public.tpl_comunicaciones_cola c where c.payload->>'legacy_id'=p.id::text
      )
    $m$;
  end if;
end $$;

create or replace function public.tpl_reclamar_comunicaciones_v1(
  p_worker text,
  p_limite integer default 20
) returns setof public.tpl_comunicaciones_cola
language plpgsql security definer set search_path=public as $$
begin
  -- Recupera trabajos abandonados hace más de 15 minutos.
  update public.tpl_comunicaciones_cola
     set estado='pendiente', bloqueado_at=null, bloqueado_por=null, updated_at=now()
   where estado='procesando' and bloqueado_at < now()-interval '15 minutes';

  return query
  with candidatas as (
    select id
      from public.tpl_comunicaciones_cola
     where estado in ('pendiente','error')
       and canal='email'
       and procesar_desde<=now()
       and intentos<5
     order by created_at
     for update skip locked
     limit greatest(1,least(coalesce(p_limite,20),100))
  )
  update public.tpl_comunicaciones_cola c
     set estado='procesando', intentos=c.intentos+1,
         bloqueado_at=now(), bloqueado_por=left(coalesce(p_worker,'worker'),120), updated_at=now()
    from candidatas x
   where c.id=x.id
  returning c.*;
end $$;

create or replace function public.tpl_finalizar_comunicacion_v1(
  p_id uuid,
  p_ok boolean,
  p_proveedor_id text default null,
  p_error text default null
) returns void
language plpgsql security definer set search_path=public as $$
begin
  update public.tpl_comunicaciones_cola
     set estado=case when p_ok then 'enviado' else 'error' end,
         proveedor_id=case when p_ok then nullif(p_proveedor_id,'') else proveedor_id end,
         ultimo_error=case when p_ok then null else left(coalesce(p_error,'ERROR_DESCONOCIDO'),2000) end,
         enviado_at=case when p_ok then now() else enviado_at end,
         procesar_desde=case when p_ok then procesar_desde else now() + make_interval(mins => least(60, greatest(2, intentos*5))) end,
         bloqueado_at=null, bloqueado_por=null, updated_at=now()
   where id=p_id;
end $$;

create or replace function public.tpl_crm_estado_comunicaciones_v1()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'pendientes',count(*) filter(where estado='pendiente'),
    'procesando',count(*) filter(where estado='procesando'),
    'enviados_24h',count(*) filter(where estado='enviado' and enviado_at>now()-interval '24 hours'),
    'errores',count(*) filter(where estado='error'),
    'ultimo_error',max(ultimo_error) filter(where estado='error')
  ) from public.tpl_comunicaciones_cola;
$$;

revoke all on function public.tpl_reclamar_comunicaciones_v1(text,integer) from public,anon,authenticated;
revoke all on function public.tpl_finalizar_comunicacion_v1(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.tpl_crm_estado_comunicaciones_v1() to authenticated;

comment on function public.tpl_reclamar_comunicaciones_v1(text,integer) is 'Uso exclusivo de Edge Function con service role. Reclama correos sin duplicarlos.';
