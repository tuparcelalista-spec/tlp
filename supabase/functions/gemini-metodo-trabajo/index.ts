import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, readJson } from '../_shared/security.ts';
import { extraerJson, generarTexto } from '../_shared/gemini.ts';

const MIN_LEN = 20;
const MAX_LEN = 2500;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);
  try {
    const body = await readJson(req, 16_000);
    const texto = String(body?.texto || '').trim();
    if (texto.length < MIN_LEN) return jsonResponseFor(req, { ok: false, error: 'TEXTO_MUY_CORTO' }, 400);
    if (texto.length > MAX_LEN) return jsonResponseFor(req, { ok: false, error: 'TEXTO_MUY_LARGO' }, 400);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'gemini-metodo-trabajo', 8, 600, texto.slice(0, 40));

    const prompt = `Eres un asistente que ayuda a contratistas y prestadores de servicios rurales en Chile (pozos, cercos, electricidad, construcción, transporte, etc.) a explicar con claridad cómo trabajan, para publicar un perfil confiable en "Tu Parcela Lista".

El prestador escribió esta descripción libre de su forma de trabajo:
"""
${texto}
"""

Tu tarea:
1. Divide esa explicación en una lista ordenada de 3 a 6 etapas concretas del proceso de trabajo (desde el primer contacto hasta la entrega final), redactadas en tercera persona, cada una en una frase corta y concreta (máximo 110 caracteres). No inventes etapas que no estén sugeridas por el texto; si el texto es muy breve, infiere las etapas más obvias y razonables para ese tipo de servicio, pero mantente conservador.
2. Evalúa la claridad general de la explicación con una nota de 0 a 100 (0=no se entiende el proceso, 100=explicación completa: menciona pasos, plazos y qué recibe el cliente en cada etapa).

Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código, con esta forma exacta:
{"etapas": ["...", "..."], "claridad": 0}`;

    const parsed = extraerJson(await generarTexto(prompt));

    const etapas = Array.isArray(parsed.etapas)
      ? parsed.etapas.map((item: unknown) => String(item || '').trim().slice(0, 140)).filter(Boolean).slice(0, 6)
      : [];
    if (!etapas.length) throw new Error('RESPUESTA_IA_INVALIDA');
    const claridad = Math.max(0, Math.min(100, Math.round(Number(parsed.claridad) || 0)));

    return jsonResponseFor(req, { ok: true, etapas, claridad });
  } catch (error) {
    return jsonResponseFor(req, { ok: false, error: publicError(error) }, 400);
  }
});
