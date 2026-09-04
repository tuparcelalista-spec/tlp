export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// Variante con origin acotado, para funciones nuevas o recién endurecidas.
// No reemplaza a corsHeaders (usado por firma en ~15 funciones existentes)
// para no repetir el bug de "corsHeaders(req) no es invocable" corregido antes.
const DEFAULT_ALLOWED_ORIGINS = ['https://www.parcelalista.cl', 'https://parcelalista.cl'];

// El desarrollo se hace contra Live Server (127.0.0.1:5501). Sin esto, cada
// función endurecida respondía con Allow-Origin de producción y el navegador
// bloqueaba la llamada local: "Redactar por mí" y el tasador no se podían
// probar sin desplegar.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function allowedOrigins() {
  const raw = Deno.env.get('TPL_ALLOWED_ORIGINS') || '';
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ALLOWED_ORIGINS;
}

export function corsHeadersFor(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = allowedOrigins();
  const allowOrigin = (allowed.includes(origin) || LOCAL_ORIGIN.test(origin)) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}

export function jsonResponseFor(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json; charset=utf-8' },
  });
}
