-- VISTA UNIFICADA DE COMPARABLES TPL (FASE 1)
-- Fusiona propiedades internas TPL con catastro de mercado externo

CREATE OR REPLACE VIEW public.vw_buscador_comparables AS

-- 1. Propiedades Internas (TPL)
SELECT 
    c.id AS id,
    'TPL' AS origen,
    'TPL' AS fuente,
    NULL AS url,
    c.titulo,
    c.estado,
    c.region,
    c.comuna,
    c.sector,
    c.lat,
    c.lng,
    t.superficie_m2,
    com.precio_publicado AS precio_clp,
    NULL::NUMERIC AS precio_uf,
    (com.precio_publicado / NULLIF(t.superficie_m2, 0)) AS precio_m2,
    
    -- Atributos Booleanos Normalizados
    (t.agua IS NOT NULL AND t.agua != 'Sin agua' AND t.agua != '') AS tiene_agua,
    (t.electricidad IS NOT NULL AND t.electricidad != 'Sin luz' AND t.electricidad != '') AS tiene_luz,
    (t.bosque_nativo = true OR t.vegetacion ILIKE '%bosque%') AS tiene_bosque,
    (t.topografia ILIKE '%plan%') AS es_plana,
    (t.vista_principal ILIKE '%rio%' OR t.vista_principal ILIKE '%río%') AS tiene_rio,
    (t.vista_principal ILIKE '%lago%') AS tiene_lago,
    (t.acceso ILIKE '%asfalto%' OR t.acceso ILIKE '%pavimento%') AS acceso_pavimentado,
    
    -- Construir un bloque de texto para búsquedas Full Text Search
    LOWER(CONCAT(c.titulo, ' ', c.comuna, ' ', c.sector, ' ', c.region)) AS texto_busqueda,
    c.creado_en AS fecha_referencia

FROM public.tpl_propiedad_core c
LEFT JOIN public.tpl_expediente_terreno t ON c.id = t.propiedad_id
LEFT JOIN public.tpl_propiedad_comercial com ON c.id = com.propiedad_id
WHERE c.tipo IN ('parcela', 'parcela_casa')

UNION ALL

-- 2. Propiedades Externas (Catastro Mercado)
SELECT 
    m.id AS id,
    m.fuente AS origen,
    m.fuente AS fuente,
    m.url,
    m.titulo,
    'competencia' AS estado,
    m.region,
    m.comuna,
    NULL AS sector,
    NULL AS lat,
    NULL AS lng,
    m.superficie_m2,
    m.precio_clp,
    m.precio_uf,
    (m.precio_clp / NULLIF(m.superficie_m2, 0)) AS precio_m2,
    
    -- Inferir atributos desde el título original extraído
    (m.titulo ILIKE '%agua%' OR m.titulo ILIKE '%pozo%' OR m.titulo ILIKE '%apr%') AS tiene_agua,
    (m.titulo ILIKE '%luz%' OR m.titulo ILIKE '%empalme%' OR m.titulo ILIKE '%energia%') AS tiene_luz,
    (m.titulo ILIKE '%bosque%' OR m.titulo ILIKE '%arboles%' OR m.titulo ILIKE '%nativo%') AS tiene_bosque,
    (m.titulo ILIKE '%plan%') AS es_plana,
    (m.titulo ILIKE '%rio%' OR m.titulo ILIKE '%río%' OR m.titulo ILIKE '%orilla%') AS tiene_rio,
    (m.titulo ILIKE '%lago%') AS tiene_lago,
    (m.titulo ILIKE '%asfalto%' OR m.titulo ILIKE '%pavimento%' OR m.titulo ILIKE '%carretera%') AS acceso_pavimentado,

    LOWER(CONCAT(m.titulo, ' ', m.comuna, ' ', m.region)) AS texto_busqueda,
    m.created_at AS fecha_referencia

FROM public.tpl_catastro_mercado m;
