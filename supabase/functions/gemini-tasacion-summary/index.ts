import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { consumeRateLimit, publicError } from '../_shared/security.ts';
import { generarTexto } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const { parcela, valuation } = await req.json();

    if (!parcela || !valuation) {
      throw new Error("Faltan datos de la parcela o la tasación en la solicitud.");
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'gemini-tasacion-summary', 20, 600, String(parcela.id || parcela.codigo || ''));

    // Build a strict, zero-hallucination prompt based ONLY on the data
    const prompt = `
Eres un experto tasador de propiedades de "Tu Parcela Lista" (TPL).
Tu tarea es redactar un resumen ejecutivo de las fortalezas de una parcela, basado ESTRICTAMENTE en los datos que te proporciono a continuación. NO inventes características que no estén listadas.
Usa un tono profesional, optimista y convincente para un comprador.
El resumen no debe exceder de 2 párrafos cortos y debe estar en formato HTML con etiquetas <b> o <ul> si es necesario, pero sin la etiqueta <html> ni markdown de bloque (\`\`\`).

DATOS DE LA PARCELA:
- ID/Código: ${parcela.id || parcela.codigo || 'N/A'}
- Título: ${parcela.titulo || 'Parcela'}
- Comuna: ${parcela.comuna || 'N/A'}
- Superficie: ${parcela.superficie_m2 || 'N/A'} m2
- Virtudes reportadas (Metadatos): ${JSON.stringify(parcela.metadata?.virtudes || [])}

DATOS DE TASACIÓN TPL:
- Segmento asignado: ${valuation.references?.[0]?.segmento || 'N/A'}
- Ajustes aplicados (Premios/Castigos): ${JSON.stringify(valuation.adjustments || [])}
- Valor Sugerido (Venta TPL): $ ${valuation.recommendedClp || 'N/A'}
- Confianza del modelo: ${valuation.confidence || 'N/A'}

INSTRUCCIÓN ESPECÍFICA:
Resalta cómo las virtudes y los ajustes positivos justifican el valor sugerido de la parcela. Si la confianza es alta, menciona que el valor está respaldado por abundante data de mercado.
`;

    let generatedText = await generarTexto(prompt);

    // Clean up potential markdown formatting that Gemini might output
    generatedText = generatedText.replace(/^```html/i, '').replace(/```$/i, '').trim();

    return jsonResponseFor(req, { summaryHtml: generatedText });
  } catch (error) {
    return jsonResponseFor(req, { error: publicError(error) }, 400);
  }
});
