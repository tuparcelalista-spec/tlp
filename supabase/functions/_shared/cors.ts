const DEFAULT_ORIGINS = [
  'https://www.parcelalista.cl',
  'https://parcelalista.cl',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
];

function allowedOrigins() {
  const extra = (Deno.env.get('TPL_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

export function corsHeaders(req: Request, methods = 'POST, GET, OPTIONS') {
  const origin = req.headers.get('origin') || '';
  const allowed = allowedOrigins();
  const selectedOrigin = allowed.has(origin) ? origin : DEFAULT_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': selectedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tpl-secret',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8' },
  });
}
