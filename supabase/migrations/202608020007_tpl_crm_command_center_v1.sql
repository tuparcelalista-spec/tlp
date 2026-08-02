begin;

-- Compatibilidad: el CRM no debe caer completo si la vista de alertas aún no existe.
create or replace view public.crm_alertas as
select
  t.id,
  'tarea'::text as tipo,
  coalesce(t.prioridad,'media')::text as prioridad,
  coalesce(t.titulo,'Tarea pendiente')::text as mensaje,
  coalesce(t.vence_at,t.created_at) as fecha_relevante,
  t.actor_id,
  t.propiedad_id,
  t.proyecto_id,
  jsonb_build_object('estado',t.estado,'detalle',t.detalle,'origen','tpl_tareas') as metadata
from public.tpl_tareas t
where t.estado in ('pendiente','en_progreso','esperando')
  and (t.prioridad in ('alta','urgente') or t.vence_at <= now()+interval '3 days')
union all
select
  p.id,
  'publicacion_revision'::text,
  case when p.estado='requiere_correccion' then 'alta' else 'media' end,
  case when p.estado='requiere_correccion' then 'Publicación requiere correcciones' else 'Publicación pendiente de revisión' end,
  coalesce(p.enviada_at,p.created_at),
  p.publicador_actor_id,
  null::uuid,
  null::uuid,
  jsonb_build_object('publicacion_id',p.id,'codigo',p.codigo,'estado',p.estado,'motivo_revision',p.motivo_revision,'origen','tpl_publicaciones')
from public.tpl_publicaciones p
where p.estado in ('enviada','pendiente_revision','requiere_correccion');

revoke all on public.crm_alertas from anon;
grant select on public.crm_alertas to authenticated;

create or replace function public.tpl_crm_command_center_v1()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_staff public.tpl_staff;
begin
  select * into v_staff from public.tpl_staff where user_id=auth.uid() and activo=true limit 1;
  if v_staff.user_id is null then raise exception 'NO_AUTORIZADO'; end if;

  return jsonb_build_object(
    'staff',jsonb_build_object(
      'user_id',v_staff.user_id,
      'nombre',coalesce(v_staff.nombre,'Equipo TPL'),
      'rol',v_staff.rol,
      'email',coalesce(auth.jwt()->>'email','')
    ),
    'prioridades',jsonb_build_object(
      'publicaciones_revision',(select count(*) from public.tpl_publicaciones where estado in ('enviada','pendiente_revision','requiere_correccion')),
      'tareas_vencidas',(select count(*) from public.tpl_tareas where estado in ('pendiente','en_progreso','esperando') and vence_at<now()),
      'partners_pendientes',(select count(*) from public.tpl_partner_postulaciones where estado in ('pendiente','en_revision','requiere_cambios')),
      'informes_pendientes',(select count(*) from public.tpl_ordenes_informe where estado in ('creada','pendiente_pago','pagada','generando'))
    ),
    'totales',jsonb_build_object(
      'actores',(select count(*) from public.tpl_actores),
      'propiedades',(select count(*) from public.tpl_propiedades),
      'proyectos',(select count(*) from public.tpl_proyectos),
      'partners',(select count(*) from public.tpl_partner_perfiles),
      'oportunidades',(select count(*) from public.tpl_oportunidades)
    ),
    'generado_at',now()
  );
end;
$$;

revoke all on function public.tpl_crm_command_center_v1() from public,anon;
grant execute on function public.tpl_crm_command_center_v1() to authenticated;

commit;
