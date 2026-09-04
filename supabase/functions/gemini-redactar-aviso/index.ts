// Redacta título y descripción de un aviso a partir de los datos que la
// persona ya ingresó en el publicador. Antes el botón "Redactar por mí"
// rellenaba una plantilla fija: siempre decía lo mismo y no leía la ficha.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, readJson } from '../_shared/security.ts';
import { extraerJson, generarTexto } from '../_shared/gemini.ts';

/** Deja pasar solo texto corto y plano; nada de HTML ni saltos raros. */
const limpio = (v: unknown, max = 120) =>
  String(v ?? '').replace(/[<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const body = await readJson(req, 12_000);
    const p = body?.propiedad || {};

    const comuna = limpio(p.comuna, 80);
    const superficie = Number(p.superficie) || 0;
    if (!comuna || !superficie) throw new Error('DATOS_INSUFICIENTES');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'gemini-redactar-aviso', 15, 600, comuna);

    const t = p.terreno || {};
    const casa = p.casa || {};
    const naturales = Array.isArray(p.atributosNaturales) ? p.atributosNaturales.map((x: unknown) => limpio(x, 40)) : [];

    const ficha = [
      `Tipo: ${limpio(p.tipo, 40) || 'parcela'}`,
      `Comuna: ${comuna}`,
      p.localidad ? `Sector: ${limpio(p.localidad, 80)}` : '',
      `Superficie: ${superficie} m²`,
      t.topografia ? `Topografía: ${limpio(t.topografia, 60)}` : '',
      t.suelo || p.suelo ? `Suelo: ${limpio(t.suelo || p.suelo, 60)}` : '',
      t.agua ? `Agua: ${limpio(t.agua, 60)}` : '',
      t.luz ? `Electricidad: ${limpio(t.luz, 60)}` : '',
      t.rol ? `Rol: ${limpio(t.rol, 60)}` : '',
      t.acceso ? `Acceso: ${limpio(t.acceso, 80)}` : '',
      t.vegetacion ? `Vegetación: ${limpio(t.vegetacion, 60)}` : '',
      t.cierre ? `Cierre: ${limpio(t.cierre, 60)}` : '',
      naturales.length ? `Atributos naturales: ${naturales.join(', ')}` : '',
      casa.superficieConstruida ? `Casa: ${Number(casa.superficieConstruida)} m² construidos` : '',
      casa.materialidad ? `Materialidad: ${limpio(casa.materialidad, 60)}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `Eres redactor de avisos inmobiliarios rurales en Chile para "Tu Parcela Lista".

Antecedentes REALES de la propiedad:
"""
${ficha}
"""

Redacta un título y una descripción para publicar este aviso.

Reglas estrictas:
- Usa SOLO los antecedentes entregados. No inventes servicios, medidas, vistas, distancias ni cercanías que no aparezcan arriba.
- Si un dato dice "sin factibilidad", "sin cierre" o similar, NO lo presentes como ventaja ni lo escondas: simplemente no lo menciones.
- Español de Chile, tono cercano y sobrio. Nada de "espectacular", "único en su tipo", "oportunidad irrepetible" ni signos de exclamación.
- Título: máximo 70 caracteres, concreto, con la comuna.
- Descripción: 2 párrafos cortos, entre 350 y 700 caracteres en total. Describe el terreno y para qué sirve.
- No prometas rentabilidad ni plusvalía futura.

Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código:
{"titulo":"...","descripcion":"..."}`;

    const parsed = extraerJson(await generarTexto(prompt));

    const titulo = limpio(parsed?.titulo, 100);
    const descripcion = String(parsed?.descripcion ?? '')
      .replace(/[<>]/g, '').trim().slice(0, 1200);

    if (!titulo || descripcion.length < 60) throw new Error('RESPUESTA_IA_INVALIDA');

    return jsonResponseFor(req, { ok: true, titulo, descripcion });
  } catch (error) {
    return jsonResponseFor(req, { ok: false, error: publicError(error) }, 400);
  }
});
