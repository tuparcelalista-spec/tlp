// Cliente compartido para Gemini, con cadena de modelos de respaldo.
//
// Motivo (medido en producción el 2026-09-01): el modelo principal devuelve
// 429 (cuota) y otros 503 (saturación) de forma intermitente. Reintentar el
// MISMO modelo no ayuda ante un 429, así que ante un fallo de capacidad
// pasamos al siguiente modelo, que tiene cuota independiente.
//
// Orden elegido por medición, no por número de versión:
//   - gemini-3.1-flash-lite: ~1s y estable. Suficiente para extracción
//     estructurada y resúmenes cortos, que es todo lo que pedimos.
//   - gemini-3.5-flash: respaldo; funciona pero su latencia oscila 1,3s-9,8s.
//   - gemini-3.6-flash: último. Hoy devuelve 429 (cuota agotada) de forma
//     constante, pero falla en ~200ms y se recuperará al reponerse la cuota.
// Se excluyen a propósito 'gemini-3.7-flash' y 'gemini-flash-latest': tardaban
// 13s y 36s en devolver 503, lo que agota el presupuesto de tiempo.

const CADENA_POR_DEFECTO = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
];

/** Fallos de capacidad: no sirve insistir en el mismo modelo, hay que cambiar. */
const FALLO_DE_CAPACIDAD = new Set([429, 500, 502, 503, 504]);

export interface OpcionesGemini {
  /** Modelos a intentar en orden. */
  modelos?: string[];
  /** Tiempo máximo por intento. Corto a propósito: un modelo saturado puede
   *  tardar decenas de segundos en responder 503, y con 3 modelos en cadena
   *  eso deja al usuario esperando. Con 7s el peor caso ronda los 15s. */
  timeoutMs?: number;
}

/**
 * Genera texto con Gemini recorriendo la cadena de modelos hasta que uno
 * responda. Lanza 'IA_NO_DISPONIBLE' si ninguno lo hace.
 */
export async function generarTexto(prompt: string, opciones: OpcionesGemini = {}): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('CONFIGURACION_INCOMPLETA');

  const modelos = opciones.modelos?.length ? opciones.modelos : CADENA_POR_DEFECTO;
  const timeoutMs = opciones.timeoutMs ?? 7_000;

  for (const modelo of modelos) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: ctrl.signal,
        },
      );

      if (res.ok) {
        const data = await res.json();
        const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (texto) return texto;
        // Respuesta vacía (p. ej. filtro de seguridad): probamos el siguiente.
        console.error(`Gemini ${modelo}: respuesta sin texto`);
        continue;
      }

      const detalle = (await res.text()).slice(0, 200);
      console.error(`Gemini ${modelo} -> ${res.status}: ${detalle}`);
      // Un 4xx que no sea de capacidad (400 por prompt inválido, 404 modelo
      // inexistente) tampoco se arregla con otro modelo del mismo estilo,
      // pero seguimos por si el modelo concreto es el problema.
      if (!FALLO_DE_CAPACIDAD.has(res.status) && res.status !== 404) break;
    } catch (e) {
      console.error(`Gemini ${modelo} fallo de red/timeout:`, String(e).slice(0, 160));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('IA_NO_DISPONIBLE');
}

/** Extrae el primer objeto JSON de una respuesta que puede venir con ```json. */
export function extraerJson(texto: string) {
  const limpio = texto.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/i, '').trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio === -1 || fin === -1 || fin < inicio) throw new Error('RESPUESTA_IA_INVALIDA');
  try {
    return JSON.parse(limpio.slice(inicio, fin + 1));
  } catch {
    throw new Error('RESPUESTA_IA_INVALIDA');
  }
}
