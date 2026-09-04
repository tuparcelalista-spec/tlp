-- ------------------------------------------------------------
-- FIX: VISTA RESUMIDA DE PARCELAS PARA EL NUEVO CRM TLP V1
-- Corrige la extracción de la imagen principal para que se muestre en la grilla
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
  
  -- CORRECCIÓN AQUÍ: 
  -- Primero intentamos leer si es un array de strings (->>0)
  -- Si es un array de objetos con url, intentamos sacar la url (->0->>'url')
  -- Y si existe 'imagen_principal', la usamos.
  COALESCE(
    p.metadata->'imagenes'->>0, 
    p.metadata->'imagenes'->0->>'url',
    p.metadata->>'imagen_principal'
  ) AS foto_principal,
  
  -- Total de fotos contadas desde el array de metadata (para alertas)
  jsonb_array_length(COALESCE(p.metadata->'imagenes', '[]'::jsonb)) AS total_fotos,

  -- Datos de Plan y Expiración desde la tabla de suscripciones
  pl.nombre AS plan_nombre,
  s.periodo_hasta AS expiracion_plan,
  
  -- Extraemos los campos mínimos para calcular la Tasación TPL en el Frontend
  p.metadata->>'valor_tpl_tecnico' as valor_tpl_tecnico,
  p.metadata->>'valor_promedio_comunal' as valor_promedio_comunal,
  p.metadata->>'valor_tpl_tasador' as valor_tpl_tasador,
  p.metadata->>'valor_tpl_tasador_ajustado' as valor_tpl_tasador_ajustado,
  p.metadata->>'valor_comunal' as valor_comunal,
  p.metadata->>'valor_tpl_recomendado' as valor_tpl_recomendado,
  p.metadata->>'valor_venta_apuro' as valor_venta_apuro

FROM public.tpl_propiedades p
-- Left join para traer el plan ACTIVO si es que existe
LEFT JOIN public.tpl_suscripciones s ON p.id = s.propiedad_id AND s.estado = 'activa'
LEFT JOIN public.tpl_planes_comerciales pl ON s.plan_id = pl.id;

-- Aseguramos los permisos correctos
REVOKE ALL ON public.crm_parcelas_resumen FROM public, anon;
GRANT SELECT ON public.crm_parcelas_resumen TO authenticated;
