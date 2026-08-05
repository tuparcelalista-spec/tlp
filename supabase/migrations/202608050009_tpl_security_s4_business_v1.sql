begin;

-- TPL Business solo opera con usuarios autenticados. La autorización fina
-- continúa dentro de cada RPC y mediante RLS.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'tpl_portal_resumen_v1()',
    'tpl_agenda_marcar_notificacion_v1(uuid)',
    'tpl_ejecucion_resumen_v1()',
    'tpl_partner_guardar_hitos_v1(uuid,jsonb)',
    'tpl_partner_registrar_avance_v1(uuid,jsonb)',
    'tpl_cliente_revisar_avance_v1(uuid,text,text)',
    'tpl_cliente_informar_pago_v1(uuid,text,text,text)',
    'tpl_partner_revisar_pago_v1(uuid,text,text)',
    'tpl_resumen_financiero_orden_v1(uuid)',
    'tpl_partner_oportunidades_v1()',
    'tpl_partner_manifestar_interes_v1(uuid,text)'
  ] loop
    if to_regprocedure('public.' || fn) is not null then
      execute format('revoke all on function public.%s from public, anon', fn);
      execute format('grant execute on function public.%s to authenticated', fn);
    end if;
  end loop;
end $$;

commit;
