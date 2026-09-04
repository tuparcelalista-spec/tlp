-- Reconciliación del historial de migraciones (no cambia nada en producción).
--
-- Diagnóstico: "supabase migration list --linked" mostró que 202608130001 y
-- 202608230000 nunca quedaron registradas como aplicadas en
-- supabase_migrations.schema_migrations, aunque sus efectos SÍ existen en la
-- base real -- alguien las aplicó (o las modificó después) directo desde el
-- SQL Editor del dashboard, sin pasar por el CLI. Por eso "supabase db push"
-- fallaba: intentaba volver a crear public.crm_parcelas_resumen con la
-- definición vieja de 202608130001 (16 columnas), pero la vista real en vivo
-- ya tiene 21 columnas (le agregaron 5 campos de tasación después) y
-- Postgres no permite quitar columnas de una vista con CREATE OR REPLACE.
--
-- Este archivo NO modifica la vista: la vuelve a declarar exactamente igual
-- a como está hoy en producción (verificado con pg_get_viewdef), para que
-- el repositorio quede sincronizado con la realidad. Los pasos de reparación
-- del historial (marcar 202608130001, 202608230000 y las 2 migraciones de
-- hoy como aplicadas) se hacen aparte con "supabase migration repair",
-- que solo edita el libro de registro, no la base de datos.

begin;

CREATE OR REPLACE VIEW public.crm_parcelas_resumen AS
SELECT
  p.id,
  p.codigo,
  p.titulo,
  p.comuna,
  p.region,
  p.superficie_m2,
  p.precio_publicado,
  p.estado,
  p.publicada_at,
  EXTRACT(DAY FROM now() - p.publicada_at) AS dias_publicada,
  COALESCE(
    (p.metadata -> 'imagenes') ->> 0,
    ((p.metadata -> 'imagenes') -> 0) ->> 'url',
    p.metadata ->> 'imagen_principal'
  ) AS foto_principal,
  jsonb_array_length(COALESCE(p.metadata -> 'imagenes', '[]'::jsonb)) AS total_fotos,
  pl.nombre AS plan_nombre,
  s.periodo_hasta AS expiracion_plan,
  p.metadata ->> 'valor_tpl_tecnico' AS valor_tpl_tecnico,
  p.metadata ->> 'valor_promedio_comunal' AS valor_promedio_comunal,
  p.metadata ->> 'valor_tpl_tasador' AS valor_tpl_tasador,
  p.metadata ->> 'valor_tpl_tasador_ajustado' AS valor_tpl_tasador_ajustado,
  p.metadata ->> 'valor_comunal' AS valor_comunal,
  p.metadata ->> 'valor_tpl_recomendado' AS valor_tpl_recomendado,
  p.metadata ->> 'valor_venta_apuro' AS valor_venta_apuro
FROM public.tpl_propiedades p
LEFT JOIN public.tpl_suscripciones s ON p.id = s.propiedad_id AND s.estado = 'activa'
LEFT JOIN public.tpl_planes_comerciales pl ON s.plan_id = pl.id;

REVOKE ALL ON public.crm_parcelas_resumen FROM public, anon;
GRANT SELECT ON public.crm_parcelas_resumen TO authenticated;

commit;
