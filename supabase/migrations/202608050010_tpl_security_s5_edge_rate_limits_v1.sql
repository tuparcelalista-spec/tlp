begin;

create table if not exists public.tpl_edge_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  hits integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

alter table public.tpl_edge_rate_limits enable row level security;
revoke all on table public.tpl_edge_rate_limits from public, anon, authenticated;

create or replace function public.tpl_consumir_rate_limit_edge_v1(
  p_scope text,
  p_key text,
  p_max_requests integer default 20,
  p_window_seconds integer default 60
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_now timestamptz := now();
  v_scope text := left(trim(coalesce(p_scope,'')),80);
  v_hash text := encode(digest(coalesce(p_key,''),'sha256'),'hex');
  v_row public.tpl_edge_rate_limits%rowtype;
begin
  if v_scope = '' or p_max_requests < 1 or p_max_requests > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'RATE_LIMIT_CONFIG_INVALIDA';
  end if;

  insert into public.tpl_edge_rate_limits(scope,key_hash,window_started_at,hits,updated_at)
  values(v_scope,v_hash,v_now,1,v_now)
  on conflict (scope,key_hash) do update set
    window_started_at = case
      when public.tpl_edge_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
      else public.tpl_edge_rate_limits.window_started_at
    end,
    hits = case
      when public.tpl_edge_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
      else public.tpl_edge_rate_limits.hits + 1
    end,
    updated_at = v_now
  returning * into v_row;

  return jsonb_build_object(
    'allowed', v_row.hits <= p_max_requests,
    'hits', v_row.hits,
    'limit', p_max_requests,
    'reset_at', v_row.window_started_at + make_interval(secs => p_window_seconds)
  );
end;
$$;

revoke all on function public.tpl_consumir_rate_limit_edge_v1(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.tpl_consumir_rate_limit_edge_v1(text,text,integer,integer) to service_role;

create index if not exists tpl_edge_rate_limits_updated_idx on public.tpl_edge_rate_limits(updated_at);

commit;
