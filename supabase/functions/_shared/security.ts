import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown')
    .split(',')[0].trim().slice(0, 80);
}

export function assertBodySize(req: Request, maxBytes = 64_000) {
  const raw = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(raw) && raw > maxBytes) throw new Error('PAYLOAD_DEMASIADO_GRANDE');
}

export async function readJson(req: Request, maxBytes = 64_000) {
  assertBodySize(req, maxBytes);
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new Error('PAYLOAD_DEMASIADO_GRANDE');
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch { throw new Error('JSON_INVALIDO'); }
}

export async function consumeRateLimit(
  admin: SupabaseClient,
  req: Request,
  scope: string,
  maxRequests: number,
  windowSeconds: number,
  actorKey = '',
) {
  const key = `${clientIp(req)}:${String(actorKey || '').slice(0, 120)}`;
  const { data, error } = await admin.rpc('tpl_consumir_rate_limit_edge_v1', {
    p_scope: scope,
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error('RATE_LIMIT_NO_DISPONIBLE');
  if (data?.allowed === false) throw new Error('DEMASIADAS_SOLICITUDES');
  return data;
}

export function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'ERROR');
  const safe = new Set([
    'NO_AUTORIZADO','SESION_REQUERIDA','SESION_INVALIDA','DEMASIADAS_SOLICITUDES',
    'PAYLOAD_DEMASIADO_GRANDE','JSON_INVALIDO','ORDEN_INVALIDA','CORREO_INVALIDO',
    'POSTULACION_INVALIDA','PUBLICACION_INVALIDA','TOKEN_INVALIDO','METODO_NO_PERMITIDO',
  ]);
  return safe.has(message) ? message : 'SOLICITUD_NO_PROCESADA';
}


export function safeHttpUrl(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'https://www.parcelalista.cl');
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch { return ''; }
}
