-- Corrige la vista crm_parcelas_resumen: al reescribirla el 2026-08-31 para
-- reconciliar el historial de migraciones con lo que había en producción
-- (ver 20260831030000_tpl_reconcile_crm_parcelas_resumen_v1.sql, que capturó
-- textualmente la definición vigente en ese momento con pg_get_viewdef), se
-- perdió el "WHERE p.estado != 'eliminada'" que sí tenía la versión original
-- (202608130001_tpl_crm_parcelas_resumen_v1.sql) -- probablemente se cayó al
-- editar la vista a mano desde el SQL Editor del dashboard para agregarle las
-- 5 columnas de tasación.
--
-- Efecto del bug: en el CRM, "Eliminar" sobre una parcela con historial
-- (tasaciones/cotizaciones) no puede borrarla físicamente (choca con una FK),
-- así que el botón la archiva como estado='eliminada' ("papelera"). Ese
-- archivado SÍ queda guardado en tpl_propiedades, pero como la vista ya no
-- filtraba por estado, la parcela seguía apareciendo en la grilla del CRM
-- igual que antes: el mensaje decía "eliminada" pero no desaparecía.
--
-- Se usa "is distinct from" en vez de "!=" para no ocultar por accidente
-- ninguna parcela cuyo estado sea NULL (con != esas filas también quedarían
-- fuera del resultado).
begin;

create or replace view public.crm_parcelas_resumen as
select
  p.id,
  p.codigo,
  p.titulo,
  p.comuna,
  p.region,
  p.superficie_m2,
  p.precio_publicado,
  p.estado,
  p.publicada_at,
  extract(day from now() - p.publicada_at) as dias_publicada,
  coalesce(
    (p.metadata -> 'imagenes') ->> 0,
    ((p.metadata -> 'imagenes') -> 0) ->> 'url',
    p.metadata ->> 'imagen_principal'
  ) as foto_principal,
  jsonb_array_length(coalesce(p.metadata -> 'imagenes', '[]'::jsonb)) as total_fotos,
  pl.nombre as plan_nombre,
  s.periodo_hasta as expiracion_plan,
  p.metadata ->> 'valor_tpl_tecnico' as valor_tpl_tecnico,
  p.metadata ->> 'valor_promedio_comunal' as valor_promedio_comunal,
  p.metadata ->> 'valor_tpl_tasador' as valor_tpl_tasador,
  p.metadata ->> 'valor_tpl_tasador_ajustado' as valor_tpl_tasador_ajustado,
  p.metadata ->> 'valor_comunal' as valor_comunal,
  p.metadata ->> 'valor_tpl_recomendado' as valor_tpl_recomendado,
  p.metadata ->> 'valor_venta_apuro' as valor_venta_apuro
from public.tpl_propiedades p
left join public.tpl_suscripciones s on p.id = s.propiedad_id and s.estado = 'activa'
left join public.tpl_planes_comerciales pl on s.plan_id = pl.id
where p.estado is distinct from 'eliminada';

revoke all on public.crm_parcelas_resumen from public, anon;
grant select on public.crm_parcelas_resumen to authenticated;

commit;
