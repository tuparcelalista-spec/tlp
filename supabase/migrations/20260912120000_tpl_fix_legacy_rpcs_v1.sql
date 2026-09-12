-- ============================================================================
-- Migración: 20260912120000_tpl_fix_legacy_rpcs_v1.sql
-- Objetivo: Saneamiento de RPCs legados en Supabase (P0-03)
--
-- Resuelve los 3 endpoints RPC que devolvían 404 en producción:
-- 1. tpl_actualizar_uf_v1: actualización oficial del valor UF en el CRM.
-- 2. tpl_obtener_uf_v1: lectura oficial y estable del valor UF (compatibilidad).
-- 3. tpl_registrar_lead_v1: puente compatible para leads legacy hacia tpl_registrar_oportunidad_publica_v1.
-- 4. manifestar_interes: alias compatible para tpl_partner_manifestar_interes_v1.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de configuración de UF (si no existe)
-- ----------------------------------------------------------------------------
create table if not exists public.tpl_uf_config (
  id integer primary key default 1 check (id = 1),
  valor_clp numeric not null,
  fecha_valor date not null default current_date,
  fuente text not null default 'CRM TPL',
  updated_at timestamptz not null default now()
);

-- Fila base por defecto si la tabla está vacía
insert into public.tpl_uf_config (id, valor_clp, fecha_valor, fuente, updated_at)
values (1, 38000, current_date, 'Inicial TPL', now())
on conflict (id) do nothing;

alter table public.tpl_uf_config enable row level security;

-- Solo lectura pública/anon, escritura reservada a staff
drop policy if exists "tpl_uf_config_select_policy" on public.tpl_uf_config;
create policy "tpl_uf_config_select_policy"
  on public.tpl_uf_config for select
  using (true);

-- ----------------------------------------------------------------------------
-- 2. RPC: tpl_actualizar_uf_v1
-- ----------------------------------------------------------------------------
create or replace function public.tpl_actualizar_uf_v1(
  p_valor_clp numeric,
  p_fuente text default 'CRM TPL'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_fuente text;
begin
  if p_valor_clp is null or p_valor_clp <= 0 then
    raise exception 'VALOR_UF_INVALIDO';
  end if;

  v_fuente := coalesce(nullif(trim(p_fuente), ''), 'CRM TPL');

  insert into public.tpl_uf_config (id, valor_clp, fecha_valor, fuente, updated_at)
  values (1, p_valor_clp, current_date, v_fuente, now())
  on conflict (id) do update
  set valor_clp = excluded.valor_clp,
      fecha_valor = excluded.fecha_valor,
      fuente = excluded.fuente,
      updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'valor_clp', p_valor_clp,
    'fecha_valor', to_char(current_date, 'YYYY-MM-DD'),
    'fuente', v_fuente
  );
end;
$function$;

revoke all on function public.tpl_actualizar_uf_v1(numeric, text) from public;
grant execute on function public.tpl_actualizar_uf_v1(numeric, text) to authenticated;
grant execute on function public.tpl_actualizar_uf_v1(numeric, text) to service_role;

-- ----------------------------------------------------------------------------
-- 3. RPC: tpl_obtener_uf_v1 (Garantiza existencia y formato canónico)
-- ----------------------------------------------------------------------------
create or replace function public.tpl_obtener_uf_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_rec record;
begin
  select valor_clp, fecha_valor, fuente
  into v_rec
  from public.tpl_uf_config
  where id = 1;

  if not found then
    return jsonb_build_object(
      'valor_clp', 38000,
      'fecha_valor', to_char(current_date, 'YYYY-MM-DD'),
      'fuente', 'Fallback TPL'
    );
  end if;

  return jsonb_build_object(
    'valor_clp', v_rec.valor_clp,
    'fecha_valor', to_char(v_rec.fecha_valor, 'YYYY-MM-DD'),
    'fuente', v_rec.fuente
  );
end;
$function$;

revoke all on function public.tpl_obtener_uf_v1() from public;
grant execute on function public.tpl_obtener_uf_v1() to public;
grant execute on function public.tpl_obtener_uf_v1() to anon;
grant execute on function public.tpl_obtener_uf_v1() to authenticated;
grant execute on function public.tpl_obtener_uf_v1() to service_role;

-- ----------------------------------------------------------------------------
-- 4. RPC: tpl_registrar_lead_v1 (Adaptador de compatibilidad para legacy frontend)
--    Redirige transparentemente a tpl_registrar_oportunidad_publica_v1
-- ----------------------------------------------------------------------------
create or replace function public.tpl_registrar_lead_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_adapted jsonb;
  v_result jsonb;
  v_nombre text;
  v_telefono text;
  v_email text;
  v_origen text;
  v_tipo text;
  v_meta jsonb;
begin
  if p_payload is null then
    raise exception 'PAYLOAD_REQUERIDO';
  end if;

  v_nombre := coalesce(nullif(trim(p_payload->>'nombre_contacto'), ''), nullif(trim(p_payload->>'nombre'), ''), 'Contacto');
  v_telefono := coalesce(p_payload->>'telefono', '');
  v_email := coalesce(p_payload->>'email', '');
  v_origen := coalesce(nullif(trim(p_payload->>'origen'), ''), 'lead_visita');
  v_tipo := coalesce(nullif(trim(p_payload->>'tipo'), ''), 'consulta');
  v_meta := coalesce(p_payload->'metadata', '{}'::jsonb);

  if p_payload ? 'parcela_id' then
    v_meta := v_meta || jsonb_build_object('parcela_id', p_payload->>'parcela_id');
  end if;
  if p_payload ? 'canal' then
    v_meta := v_meta || jsonb_build_object('canal', p_payload->>'canal');
  end if;

  v_adapted := jsonb_build_object(
    'nombre_contacto', v_nombre,
    'telefono', v_telefono,
    'email', v_email,
    'origen', v_origen,
    'tipo', v_tipo,
    'metadata', v_meta
  );

  v_result := public.tpl_registrar_oportunidad_publica_v1(v_adapted);
  return v_result;
end;
$function$;

revoke all on function public.tpl_registrar_lead_v1(jsonb) from public;
grant execute on function public.tpl_registrar_lead_v1(jsonb) to anon;
grant execute on function public.tpl_registrar_lead_v1(jsonb) to authenticated;
grant execute on function public.tpl_registrar_lead_v1(jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- 5. RPC: manifestar_interes (Alias de compatibilidad para tpl-business-v2)
--    Llama internamente a tpl_partner_manifestar_interes_v1
-- ----------------------------------------------------------------------------
create or replace function public.manifestar_interes(
  oportunidad_id uuid,
  mensaje text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  return public.tpl_partner_manifestar_interes_v1(oportunidad_id, mensaje);
end;
$function$;

revoke all on function public.manifestar_interes(uuid, text) from public;
grant execute on function public.manifestar_interes(uuid, text) to authenticated;
grant execute on function public.manifestar_interes(uuid, text) to service_role;
