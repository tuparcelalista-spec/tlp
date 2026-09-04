-- Diagnóstico puntual: parcela "Los Ángeles" / Virquenco que entró por el
-- publicador y fue aceptada, pero no muestra fotos ni los campos que sí
-- tienen las demás parcelas.
--
-- Cómo usarlo: pega este archivo completo en el SQL Editor de Supabase y
-- ejecútalo. El paso 1 busca la propiedad; copia el "id" que te devuelva y
-- pégalo donde dice <ID_DE_LA_PROPIEDAD> en los pasos 2, 3 y 4 (con las
-- comillas simples), y corre cada bloque por separado.

-- 0) Confirmar que la migración de fotos/terreno del publicador ya quedó
--    aplicada. Si esto NO devuelve ninguna fila, la migración
--    20260903040000 todavía no está en producción y eso solo ya explica
--    el problema completo (ni la vista ni el backfill corrieron).
select version
from supabase_migrations.schema_migrations
where version = '20260903040000';

-- 1) Ubicar la propiedad por nombre/comuna.
select id, codigo, titulo, comuna, region, estado, publicacion_id,
       agua, electricidad, acceso, topografia, rol_situacion, suelo,
       casa_datos, publicada_at
from public.tpl_propiedades
where titulo ilike '%virquenco%'
   or titulo ilike '%angeles%'
   or comuna ilike '%angeles%'
order by publicada_at desc nulls last
limit 5;

-- 2) ¿Tiene fotos guardadas de verdad en la tabla de imágenes?
--    Si esto devuelve 0 filas, el problema NO es la vista: las fotos nunca
--    llegaron a guardarse (falló la subida desde el publicador).
select id, storage_path, url, es_portada, orden, created_at, metadata
from public.tpl_propiedad_imagenes
where propiedad_id = '<ID_DE_LA_PROPIEDAD>'
order by orden asc;

-- 3) Ver el payload que mandó quien publicó (terreno, casa, fotos que
--    intentó subir) — para comparar contra lo que quedó guardado.
select pub.id, pub.estado, pub.datos
from public.tpl_publicaciones pub
join public.tpl_propiedades prop on prop.publicacion_id = pub.id
where prop.id = '<ID_DE_LA_PROPIEDAD>';

-- 4) Confirmar si el trigger de integración llegó a correr para esta
--    propiedad (evento que deja tpl_integrar_propiedad_publicada_v1).
select created_at, evento, metadata
from public.tpl_eventos
where propiedad_id = '<ID_DE_LA_PROPIEDAD>'
  and evento = 'ecosistema.propiedad_integrada';
