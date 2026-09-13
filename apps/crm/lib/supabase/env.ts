/**
 * `apps/crm` es el primer consumidor de `@supabase/ssr` en el monorepo — no
 * existía antes. `@tpl/core`'s `createSupabasePublicClient()` fuerza
 * `persistSession: false` (a propósito: está pensado para lecturas públicas
 * de `apps/publico`, sin sesión que persistir). El CRM SÍ necesita una
 * sesión de staff persistida entre requests (cookies), que es exactamente
 * lo que resuelve `@supabase/ssr` — por eso este cliente vive aquí y no en
 * `@tpl/core`, que es agnóstico de framework y no conoce cookies de Next.js.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, anonKey };
}
