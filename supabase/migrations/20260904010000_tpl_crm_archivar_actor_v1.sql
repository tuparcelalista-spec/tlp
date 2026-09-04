-- ============================================================================
-- 20260904010000_tpl_crm_archivar_actor_v1
--
-- PROBLEMA
--   El CRM no tiene ninguna forma de sacar a un actor del directorio. No es un
--   olvido de la interfaz: `tpl_actores` tiene RLS habilitado desde
--   202607300000_tpl_nucleo_v1 (linea 903) y NUNCA se le creo una sola policy.
--   Eso significa que un `.from('tpl_actores').update(...)` desde el navegador
--   afecta 0 filas en silencio, aunque el usuario sea staff. El directorio se
--   ve unicamente porque tpl_crm_snapshot_v1 es SECURITY DEFINER y salta el RLS.
--
--   Por eso esto no puede resolverse en el frontend: necesita una RPC.
--
-- DECISION DE DISENO — se archiva, no se borra
--   Un actor cuelga de tpl_oportunidades.actor_cliente_id, tpl_proyecto_actores,
--   tpl_visitas.usuario_staff_id y tpl_propiedades.propietario_id. Borrar la
--   fila de alguien que cerro una venta romperia la trazabilidad de esa venta,
--   que es justo lo que el CRM tiene que poder demostrar despues.
--
--   No hace falta ninguna columna nueva: tpl_actores.estado ya trae el CHECK
--   ('activo','inactivo','bloqueado','archivado') desde el nucleo. Esta
--   migracion solo expone 'archivado' al CRM de forma controlada y deja
--   registro del cambio en tpl_eventos.
--
-- SEGURIDAD
--   security definer + chequeo explicito de tpl_es_staff(), igual que el resto
--   de las RPC del CRM (tpl_crm_actualizar_estado_oportunidad_v1,
--   tpl_avanzar_etapa_proyecto_v1). Se revoca a public/anon y se concede solo
--   a authenticated.
--
-- REVERSION
--   drop function if exists public.tpl_crm_archivar_actor_v1(uuid, boolean, text);
-- ============================================================================

create or replace function public.tpl_crm_archivar_actor_v1(
  p_actor_id uuid,
  p_archivar boolean default true,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_previo text;
  v_nombre text;
  v_estado_nuevo text;
begin
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  select estado, nombre
    into v_estado_previo, v_nombre
  from public.tpl_actores
  where id = p_actor_id
  for update;

  if v_estado_previo is null then
    raise exception 'ACTOR_INEXISTENTE';
  end if;

  -- Al desarchivar se vuelve a 'activo', que es el default de la tabla.
  v_estado_nuevo := case when p_archivar then 'archivado' else 'activo' end;

  if v_estado_previo = v_estado_nuevo then
    return jsonb_build_object(
      'ok', true,
      'sin_cambios', true,
      'actor_id', p_actor_id,
      'estado', v_estado_nuevo
    );
  end if;

  update public.tpl_actores
     set estado = v_estado_nuevo,
         updated_at = now()
   where id = p_actor_id;

  insert into public.tpl_eventos(
    actor_id, evento, categoria, origen, prioridad, descripcion, metadata
  )
  values (
    p_actor_id,
    case when p_archivar then 'actor.archivado' else 'actor.reactivado' end,
    'directorio',
    'crm_staff',
    'baja',
    coalesce(
      p_motivo,
      case when p_archivar
        then 'Actor archivado desde el directorio del CRM.'
        else 'Actor reactivado desde el directorio del CRM.'
      end
    ),
    jsonb_build_object(
      'actor_id', p_actor_id,
      'nombre', v_nombre,
      'estado_anterior', v_estado_previo,
      'estado_nuevo', v_estado_nuevo,
      'motivo', p_motivo
    )
  );

  return jsonb_build_object(
    'ok', true,
    'actor_id', p_actor_id,
    'nombre', v_nombre,
    'estado_anterior', v_estado_previo,
    'estado_nuevo', v_estado_nuevo
  );
end;
$$;

revoke all on function public.tpl_crm_archivar_actor_v1(uuid, boolean, text) from public, anon;
grant execute on function public.tpl_crm_archivar_actor_v1(uuid, boolean, text) to authenticated;

comment on function public.tpl_crm_archivar_actor_v1(uuid, boolean, text) is
  'Archiva o reactiva un actor del directorio del CRM (tpl_actores.estado). No borra: un actor con historial comercial detras debe seguir siendo auditable. Solo staff.';
