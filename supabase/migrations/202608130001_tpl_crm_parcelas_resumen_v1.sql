-- ------------------------------------------------------------
-- MIGRATION: VISTA RESUMIDA DE PARCELAS PARA EL NUEVO CRM TLP V1
-- Esta vista une parcelas, suscripciones y planes comerciales
-- de forma ultra-ligera para evitar cuellos de botella en la grilla.
-- ------------------------------------------------------------

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
  -- Calculamos dinámicamente los días que lleva publicada
  EXTRACT(DAY FROM NOW() - p.publicada_at) AS dias_publicada,
  
  -- Extraemos solo la URL de la primera imagen de la metadata para la grilla
  (p.metadata->'imagenes'->0->>'url') AS foto_principal,
  
  -- Total de fotos contadas desde el array de metadata (para alertas)
  jsonb_array_length(COALESCE(p.metadata->'imagenes', '[]'::jsonb)) AS total_fotos,

  -- Datos de Plan y Expiración desde la tabla de suscripciones
  pl.nombre AS plan_nombre,
  s.periodo_hasta AS expiracion_plan,
  
  -- Extraemos los campos mínimos para calcular la Tasación TPL en el Frontend
  p.metadata->>'valor_tpl_tecnico' as valor_tpl_tecnico,
  p.metadata->>'valor_promedio_comunal' as valor_promedio_comunal

FROM public.tpl_propiedades p
-- Left join para traer el plan ACTIVO si es que existe
LEFT JOIN public.tpl_suscripciones s ON p.id = s.propiedad_id AND s.estado = 'activa'
LEFT JOIN public.tpl_planes_comerciales pl ON s.plan_id = pl.id
WHERE p.estado != 'eliminada';

-- Aseguramos los permisos correctos
REVOKE ALL ON public.crm_parcelas_resumen FROM public, anon;
GRANT SELECT ON public.crm_parcelas_resumen TO authenticated;
