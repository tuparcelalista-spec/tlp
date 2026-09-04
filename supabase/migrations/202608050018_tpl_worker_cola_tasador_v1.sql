-- TPL · T5 · Worker real por lotes para la cola canónica del Tasador

create or replace function public.tpl_claim_recalculos_tasador_v1(p_limit integer default 20)
returns table(
  cola_id uuid,
  propiedad_id uuid,
  intentos integer,
  motivo text,
  entrada jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'NO_AUTORIZADO';
  end if;

  return query
  with candidatos as (
    select q.id
    from public.tpl_cola_recalculo_tasacion q
    where q.estado = 'pendiente'
    order by q.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,20),50))
  ), tomados as (
    update public.tpl_cola_recalculo_tasacion q
    set estado = 'procesando',
        intentos = q.intentos + 1,
        error = null,
        updated_at = now()
    from candidatos c
    where q.id = c.id
    returning q.id, q.propiedad_id, q.intentos, q.motivo, q.entrada
  )
  select t.id, t.propiedad_id, t.intentos, t.motivo, t.entrada
  from tomados t;
end;
$$;

revoke all on function public.tpl_claim_recalculos_tasador_v1(integer) from public;
grant execute on function public.tpl_claim_recalculos_tasador_v1(integer) to service_role;

create or replace function public.tpl_finalizar_recalculo_tasador_v1(
  p_cola_id uuid,
  p_estado text,
  p_resultado jsonb default '{}'::jsonb,
  p_error text default null,
  p_tasacion_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_propiedad_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_estado not in ('completado','requiere_revision','error','cancelado') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  select propiedad_id into v_propiedad_id
  from public.tpl_cola_recalculo_tasacion
  where id = p_cola_id
  for update;

  if v_propiedad_id is null then
    raise exception 'COLA_NO_EXISTE';
  end if;

  update public.tpl_cola_recalculo_tasacion
  set estado = p_estado,
      resultado = coalesce(p_resultado,'{}'::jsonb),
      error = left(p_error,1000),
      procesado_at = case when p_estado in ('completado','requiere_revision','error','cancelado') then now() else procesado_at end,
      updated_at = now()
  where id = p_cola_id;

  update public.tpl_propiedades
  set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'tasacion_recalculo_pendiente', false,
        'tasacion_recalculo_estado', p_estado,
        'tasacion_recalculo_completado_at', now(),
        'ultima_tasacion_id', p_tasacion_id,
        'tasacion_recalculo_error', p_error
      )),
      updated_at = now()
  where id = v_propiedad_id;
end;
$$;

revoke all on function public.tpl_finalizar_recalculo_tasador_v1(uuid,text,jsonb,text,uuid) from public;
grant execute on function public.tpl_finalizar_recalculo_tasador_v1(uuid,text,jsonb,text,uuid) to service_role;

-- Recupera trabajos que quedaron trabados por una ejecución interrumpida.
create or replace function public.tpl_recuperar_recalculos_trabados_v1(p_minutos integer default 20)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'NO_AUTORIZADO'; end if;
  update public.tpl_cola_recalculo_tasacion
  set estado='pendiente',
      error='Trabajo recuperado después de quedar en procesamiento',
      updated_at=now()
  where estado='procesando'
    and updated_at < now() - make_interval(mins => greatest(5,least(coalesce(p_minutos,20),120)));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.tpl_recuperar_recalculos_trabados_v1(integer) from public;
grant execute on function public.tpl_recuperar_recalculos_trabados_v1(integer) to service_role;
