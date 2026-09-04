import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, readJson } from '../_shared/security.ts';
import { extraerJson, generarTexto } from '../_shared/gemini.ts';

const MIN_LEN = 8;
const MAX_LEN = 600;

// Comunas con stock publicado. Se envían a la IA para que normalice lo que
// escribe el usuario ("los angeles", "ñipas") a un valor que exista realmente.
const COMUNAS = [
  'Florida', 'Nacimiento', 'Negrete', 'Pemuco', 'Pucón', 'Quillón', 'Yumbel', 'Ñipas',
];

/** Convierte a número positivo o null; descarta NaN, negativos y valores absurdos. */
function numeroOpcional(valor: unknown, maximo: number): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0 || n > maximo) return null;
  return Math.round(n);
}

function booleanoOpcional(valor: unknown): boolean | null {
  if (valor === true) return true;
  if (valor === false) return false;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const body = await readJson(req, 8_000);
    const consulta = String(body?.consulta || '').trim();
    if (consulta.length < MIN_LEN) return jsonResponseFor(req, { ok: false, error: 'TEXTO_MUY_CORTO' }, 400);
    if (consulta.length > MAX_LEN) return jsonResponseFor(req, { ok: false, error: 'TEXTO_MUY_LARGO' }, 400);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'gemini-buscador-parcelas', 12, 600, consulta.slice(0, 40));

    const prompt = `Eres un asistente de búsqueda inmobiliaria rural en Chile para "Tu Parcela Lista".
Traduces lo que una persona escribe en lenguaje natural a filtros estructurados.

Comunas disponibles (usa EXACTAMENTE estos nombres, o deja la lista vacía si no menciona ninguna de ellas):
${COMUNAS.join(', ')}

Consulta del usuario:
"""
${consulta}
"""

Reglas:
- Los montos en Chile suelen escribirse como "30 millones", "30M", "$30.000.000". Conviértelos a pesos chilenos como número entero.
- Las superficies vienen en m² o hectáreas ("media hectárea"=5000, "1 hectárea"=10000). Convierte todo a m².
- Marca un requisito en true SOLO si el usuario lo pide explícitamente. Si no lo menciona, usa null.
- "plana", "con vista", "cerca de la ciudad" y similares no son filtros: resúmelos en "otros_criterios".
- No inventes comunas que no estén en la lista.

Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código:
{
  "comunas": [],
  "precio_max": null,
  "precio_min": null,
  "superficie_min": null,
  "superficie_max": null,
  "requiere_agua": null,
  "requiere_luz": null,
  "requiere_rol": null,
  "requiere_naturaleza": null,
  "requiere_facilidad_pago": null,
  "otros_criterios": "",
  "resumen": ""
}
Donde "resumen" es una frase breve (máx 120 caracteres) en segunda persona describiendo qué se buscará.`;

    const parsed = extraerJson(await generarTexto(prompt));

    // Saneamos todo lo que devuelve la IA antes de exponerlo al frontend.
    const comunas = Array.isArray(parsed.comunas)
      ? parsed.comunas
          .map((c: unknown) => String(c || '').trim())
          .filter((c: string) => COMUNAS.some((valida) => valida.toLowerCase() === c.toLowerCase()))
          .slice(0, 8)
      : [];

    const criterios = {
      comunas,
      precio_max: numeroOpcional(parsed.precio_max, 10_000_000_000),
      precio_min: numeroOpcional(parsed.precio_min, 10_000_000_000),
      superficie_min: numeroOpcional(parsed.superficie_min, 100_000_000),
      superficie_max: numeroOpcional(parsed.superficie_max, 100_000_000),
      requiere_agua: booleanoOpcional(parsed.requiere_agua),
      requiere_luz: booleanoOpcional(parsed.requiere_luz),
      requiere_rol: booleanoOpcional(parsed.requiere_rol),
      requiere_naturaleza: booleanoOpcional(parsed.requiere_naturaleza),
      requiere_facilidad_pago: booleanoOpcional(parsed.requiere_facilidad_pago),
      otros_criterios: String(parsed.otros_criterios || '').trim().slice(0, 200),
      resumen: String(parsed.resumen || '').trim().slice(0, 160),
    };

    return jsonResponseFor(req, { ok: true, criterios });
  } catch (error) {
    return jsonResponseFor(req, { ok: false, error: publicError(error) }, 400);
  }
});
