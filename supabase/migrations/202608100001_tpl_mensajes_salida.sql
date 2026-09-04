-- ------------------------------------------------------------
-- Tabla mínima para mensajes de salida (usada por la snapshot)
-- ------------------------------------------------------------
create table if not exists public.tpl_mensajes_salida (
    id              uuid primary key default gen_random_uuid(),
    estado          text not null default 'pendiente'
                     check (estado in ('pendiente','error','enviado','cancelado')),
    canal           text not null default 'email'
                     check (canal in ('email','whatsapp','interno')),
    destinatario    text,
    asunto          text,
    payload         jsonb not null default '{}'::jsonb,
    intentos        integer not null default 0,
    ultimo_error    text,
    creado_at       timestamptz not null default now(),
    actualizado_at  timestamptz not null default now()
);

create index if not exists idx_tpl_mensajes_salida_estado
    on public.tpl_mensajes_salida (estado);
