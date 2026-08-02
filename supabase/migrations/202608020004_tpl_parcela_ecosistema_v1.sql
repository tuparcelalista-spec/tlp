begin;

create or replace function public.tpl_registrar_oportunidad_publica_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_codigo text;
  v_email text;
  v_nombre text;
  v_tipo text;
  v_presupuesto bigint;
begin
  v_email:=lower(trim(coalesce(p_payload->>'email','')));
  v_nombre:=trim(coalesce(p_payload->>'nombre_contacto',''));
  v_tipo:=coalesce(nullif(p_payload->>'tipo',''),'consulta');
  v_presupuesto:=nullif(p_payload->>'presupuesto','')::bigint;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'CORREO_INVALIDO'; end if;
  if length(v_nombre)<2 then raise exception 'NOMBRE_REQUERIDO'; end if;
  if v_tipo not in ('consulta','cotizacion','reserva','compra','arriendo','servicio') then raise exception 'TIPO_INVALIDO'; end if;
  if length(coalesce(p_payload->>'telefono',''))<8 then raise exception 'TELEFONO_INVALIDO'; end if;

  if exists(
    select 1 from public.tpl_oportunidades
    where lower(email)=v_email
      and origen=coalesce(nullif(p_payload->>'origen',''),'sitio_publico')
      and metadata->>'parcela_codigo'=coalesce(p_payload->'metadata'->>'parcela_codigo','')
      and created_at>now()-interval '10 minutes'
  ) then
    raise exception 'SOLICITUD_RECIENTE_EXISTENTE';
  end if;

  v_codigo:='OP-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.tpl_oportunidades(
    codigo,tipo,origen,estado,prioridad,nombre_contacto,email,telefono,mensaje,presupuesto,metadata
  ) values (
    v_codigo,v_tipo,coalesce(nullif(p_payload->>'origen',''),'sitio_publico'),'nueva',
    coalesce(nullif(p_payload->>'prioridad',''),'media'),v_nombre,v_email,p_payload->>'telefono',
    nullif(p_payload->>'mensaje',''),v_presupuesto,coalesce(p_payload->'metadata','{}'::jsonb)
  ) returning id into v_id;

  insert into public.tpl_eventos(evento,metadata)
  values('oportunidad_publica_recibida',jsonb_build_object('oportunidad_id',v_id,'codigo',v_codigo,'tipo',v_tipo,'origen',coalesce(p_payload->>'origen','sitio_publico')))
  on conflict do nothing;

  return jsonb_build_object('ok',true,'id',v_id,'codigo',v_codigo);
end $$;

grant execute on function public.tpl_registrar_oportunidad_publica_v1(jsonb) to anon,authenticated;

commit;
