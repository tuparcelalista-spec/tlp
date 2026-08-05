begin;

create or replace function public.tpl_crm_access_check_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', auth.uid(),
    'staff', true,
    'checked_at', now()
  );
end;
$$;

revoke all on function public.tpl_crm_access_check_v1() from public, anon;
grant execute on function public.tpl_crm_access_check_v1() to authenticated;

-- Cierra permisos heredados de RPC exclusivas del CRM. Las funciones mantienen
-- su validación interna tpl_es_staff()/tpl_es_admin() como segunda barrera.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.tpl_crm_snapshot_v1()',
    'public.tpl_crm_command_center_v1()',
    'public.tpl_crm_bandeja_operativa_v1()',
    'public.tpl_crm_historial_tasaciones_v1(uuid)',
    'public.tpl_crm_oportunidades_partner_v1()',
    'public.tpl_crm_preparar_informe_tasacion_v1(uuid,jsonb,boolean)',
    'public.tpl_crm_historial_informes_v1(uuid)',
    'public.tpl_crm_guardar_datos_tasacion_v1(uuid,jsonb,jsonb)',
    'public.tpl_crm_generar_link_propietario_v1(uuid,integer)',
    'public.tpl_crm_guardar_casa_v1(jsonb)',
    'public.tpl_crm_estado_comunicaciones_v1()',
    'public.tpl_aprobar_publicacion_v1(uuid,boolean)',
    'public.tpl_actualizar_uf_v1(numeric,text)'
  ] loop
    if to_regprocedure(v_signature) is not null then
      execute format('revoke all on function %s from public, anon', v_signature);
      execute format('grant execute on function %s to authenticated', v_signature);
    end if;
  end loop;
end $$;

commit;
