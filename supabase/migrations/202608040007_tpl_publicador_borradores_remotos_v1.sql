create extension if not exists pgcrypto with schema extensions;

create table if not exists public.tpl_publicador_borradores (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'borrador' check (estado in ('borrador','publicado','revocado','vencido')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz
);
create index if not exists tpl_publicador_borradores_email_idx on public.tpl_publicador_borradores(lower(email), updated_at desc);
create index if not exists tpl_publicador_borradores_expires_idx on public.tpl_publicador_borradores(expires_at) where estado='borrador';
alter table public.tpl_publicador_borradores enable row level security;
revoke all on public.tpl_publicador_borradores from anon, authenticated;

create or replace function public.tpl_guardar_borrador_publicador_v1(p_payload jsonb, p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_email text:=lower(trim(coalesce(p_payload#>>'{contacto,email}','')));
  v_token text:=nullif(trim(coalesce(p_token,'')),'');
  v_hash text;
  v_id uuid;
begin
  if v_email='' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok',false,'error','Ingresa un correo válido para guardar el borrador en TPL.');
  end if;
  if pg_column_size(p_payload)>524288 then return jsonb_build_object('ok',false,'error','El borrador supera el tamaño permitido.'); end if;
  if v_token is null then v_token:=encode(extensions.gen_random_bytes(32),'hex'); end if;
  v_hash:=encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex');
  select id into v_id from public.tpl_publicador_borradores where token_hash=v_hash and estado='borrador' and expires_at>now() limit 1;
  if v_id is null then
    insert into public.tpl_publicador_borradores(email,token_hash,payload)
    values(v_email,v_hash,p_payload) returning id into v_id;
  else
    update public.tpl_publicador_borradores set email=v_email,payload=p_payload,updated_at=now(),expires_at=now()+interval '30 days' where id=v_id;
  end if;
  return jsonb_build_object('ok',true,'id',v_id,'token',v_token,'expires_at',now()+interval '30 days');
end$$;

create or replace function public.tpl_recuperar_borrador_publicador_v1(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare v_hash text; v_row public.tpl_publicador_borradores%rowtype;
begin
  if nullif(trim(coalesce(p_token,'')),'') is null then return jsonb_build_object('ok',false); end if;
  v_hash:=encode(extensions.digest(convert_to(trim(p_token),'UTF8'),'sha256'),'hex');
  select * into v_row from public.tpl_publicador_borradores where token_hash=v_hash and estado='borrador' and expires_at>now() limit 1;
  if v_row.id is null then return jsonb_build_object('ok',false,'error','El enlace venció o fue revocado.'); end if;
  update public.tpl_publicador_borradores set last_opened_at=now() where id=v_row.id;
  return jsonb_build_object('ok',true,'payload',v_row.payload,'updated_at',v_row.updated_at,'expires_at',v_row.expires_at);
end$$;

create or replace function public.tpl_revocar_borrador_publicador_v1(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare v_hash text;
begin
  if nullif(trim(coalesce(p_token,'')),'') is null then return jsonb_build_object('ok',true); end if;
  v_hash:=encode(extensions.digest(convert_to(trim(p_token),'UTF8'),'sha256'),'hex');
  update public.tpl_publicador_borradores set estado='publicado',updated_at=now() where token_hash=v_hash and estado='borrador';
  return jsonb_build_object('ok',true);
end$$;

grant execute on function public.tpl_guardar_borrador_publicador_v1(jsonb,text) to anon,authenticated;
grant execute on function public.tpl_recuperar_borrador_publicador_v1(text) to anon,authenticated;
grant execute on function public.tpl_revocar_borrador_publicador_v1(text) to anon,authenticated;
