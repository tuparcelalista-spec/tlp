-- Borrar el texto de IA simulado que quedó guardado en tpl_propiedades
--
-- QUÉ HACE
--   Pone ai_analisis = NULL SOLO en las filas cuyo valor sea exactamente
--   'Análisis IA simulado (Falta ai.js)'.
--
-- POR QUÉ
--   El CRM tenía un stub:
--       const generateMarketAnalysis = async () => "Análisis IA simulado (Falta ai.js)";
--   El botón "Generar con Google Gemini" guardaba esa cadena en la base y
--   mostraba "Análisis IA generado con éxito". Ninguna IA participaba. El stub
--   ya fue reemplazado por una llamada real (edge function
--   gemini-analisis-mercado), pero el texto falso quedó almacenado.
--
-- TABLAS AFECTADAS
--   tpl_propiedades: solo UPDATE de la columna ai_analisis. No se borra
--   ninguna fila, ninguna columna ni ninguna política. El resto de los campos
--   de esas propiedades no se toca.
--
-- ALCANCE VERIFICADO ANTES DE ESCRIBIR ESTA MIGRACIÓN
--   1 fila afectada: codigo 'caburgua' (id 1bbe3e83-f464-48b1-8689-1201b2082cda).
--   Total de propiedades en la tabla: 32. Las otras 31 tienen ai_analisis NULL.
--
-- RIESGOS
--   Muy bajo. La condición exige igualdad exacta con la cadena del stub, así
--   que no puede alcanzar a un análisis real: cualquier texto generado por
--   Gemini es distinto de esa cadena. Si no hay filas con ese valor, la
--   migración no hace nada y es segura de reaplicar.
--
-- REVERSIÓN
--   Restaurar el valor anterior en las filas afectadas (era literalmente la
--   cadena del stub, no había información real que perder):
--     update public.tpl_propiedades
--        set ai_analisis = 'Análisis IA simulado (Falta ai.js)'
--      where id = '1bbe3e83-f464-48b1-8689-1201b2082cda';

do $limpiar$
declare
  v_afectadas integer;
begin
  update public.tpl_propiedades
     set ai_analisis = null
   where ai_analisis = 'Análisis IA simulado (Falta ai.js)';

  get diagnostics v_afectadas = row_count;

  -- Queda registro de la limpieza para poder auditarla después.
  insert into public.tpl_eventos(evento, categoria, descripcion, metadata)
  values (
    'propiedades.ai_analisis_simulado_limpiado',
    'mantenimiento',
    'Se borró el texto de IA simulado que un stub del CRM había guardado en ai_analisis.',
    jsonb_build_object('filas_afectadas', v_afectadas)
  );

  raise notice 'ai_analisis simulado limpiado en % fila(s)', v_afectadas;
end
$limpiar$;
