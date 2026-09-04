// Análisis comercial de una propiedad contra sus comparables de mercado.
//
// Reemplaza al stub que había en el CRM:
//   const generateMarketAnalysis = async () => "Análisis IA simulado (Falta ai.js)";
// Ese stub devolvía siempre esa cadena, el CRM la GUARDABA en
// tpl_propiedades.ai_analisis y mostraba "Análisis IA generado con éxito".
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, readJson } from '../_shared/security.ts';
import { generarTexto } from '../_shared/gemini.ts';

const limpio = (v: unknown, max = 120) =>
  String(v ?? '').replace(/[<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

const clp = (n: unknown) => {
  const v = Number(n) || 0;
  return v > 0 ? `$${v.toLocaleString('es-CL')}` : 'sin precio informado';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const body = await readJson(req, 24_000);
    const p = body?.propiedad || {};
    const comparables = Array.isArray(body?.comparables) ? body.comparables.slice(0, 8) : [];

    const comuna = limpio(p.comuna, 80);
    const superficie = Number(p.superficie) || 0;
    if (!comuna || !superficie) throw new Error('DATOS_INSUFICIENTES');

    // Este análisis es una herramienta interna del CRM: exige sesión de staff.
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) throw new Error('SESION_REQUERIDA');

    const asStaff = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: esStaff } = await asStaff.rpc('tpl_es_staff');
    if (!esStaff) throw new Error('NO_AUTORIZADO');

    await consumeRateLimit(admin, req, 'gemini-analisis-mercado', 30, 600, userData.user.id);

    const ficha = [
      `Comuna: ${comuna}`,
      `Superficie: ${superficie} m²`,
      `Precio informado: ${clp(p.precio)}`,
      p.agua ? `Agua: ${limpio(p.agua, 60)}` : '',
      p.luz ? `Electricidad: ${limpio(p.luz, 60)}` : '',
      p.topografia ? `Topografía: ${limpio(p.topografia, 60)}` : '',
      p.rol ? `Rol: ${limpio(p.rol, 60)}` : '',
      p.acceso ? `Acceso: ${limpio(p.acceso, 80)}` : '',
    ].filter(Boolean).join('\n');

    const listado = comparables.length
      ? comparables.map((c: Record<string, unknown>, i: number) =>
          `${i + 1}. ${limpio(c.name || c.titulo, 70)} — ${Number(c.superficie) || '?'} m² — ${clp(c.precio)} — ${limpio(c.comuna, 50)}`,
        ).join('\n')
      : '(no hay avisos comparables cargados en el catastro para esta zona)';

    const prompt = `Eres analista de mercado inmobiliario rural en Chile, trabajando para el equipo interno de "Tu Parcela Lista".

PROPIEDAD A ANALIZAR:
"""
${ficha}
"""

AVISOS COMPARABLES DEL MERCADO (catastro de portales):
"""
${listado}
"""

Escribe un análisis comercial breve para el asesor que atenderá esta propiedad.

Reglas estrictas:
- Usa SOLO los datos entregados. No inventes servicios, distancias, plusvalía ni cifras que no aparezcan arriba.
- Si no hay comparables, dilo explícitamente y advierte que la lectura de mercado es débil.
- Compara precio por m² cuando los datos lo permitan; si no, no lo inventes.
- Español de Chile, sobrio y directo, para uso interno. Sin signos de exclamación ni lenguaje publicitario.
- No prometas rentabilidad futura ni tiempos de venta exactos.
- Máximo 3 párrafos cortos: (1) cómo se posiciona el precio, (2) qué la fortalece o debilita frente a los comparables, (3) qué recomendarías al asesor.

Responde solo con el texto del análisis, sin títulos ni viñetas.`;

    const analisis = String(await generarTexto(prompt)).replace(/[<>]/g, '').trim().slice(0, 2500);
    if (analisis.length < 80) throw new Error('RESPUESTA_IA_INVALIDA');

    return jsonResponseFor(req, {
      ok: true,
      analisis,
      comparables_usados: comparables.length,
      generado_en: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponseFor(req, { ok: false, error: publicError(error) }, 400);
  }
});
