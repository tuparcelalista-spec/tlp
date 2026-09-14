import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para Server Components / Server Actions / Route Handlers,
 * atado a las cookies de la request actual — es lo que permite que
 * `auth.uid()` exista del lado de Postgres y que RPCs como `tpl_es_staff()`
 * o `tpl_crm_snapshot_v1()` (ambas `grant ... to authenticated`, revocadas
 * de `anon`) funcionen. Patrón oficial de `@supabase/ssr` para Next.js App
 * Router (getAll/setAll), NO un cliente ad-hoc.
 *
 * `setAll` puede fallar cuando se llama desde un Server Component puro (no
 * puede escribir cookies) — se ignora a propósito: `middleware.ts` es quien
 * refresca el token en cada request, así que un Server Component de solo
 * lectura no necesita escribir nada él mismo.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => (cookieStore as any).set(name, value, options));
        } catch {
          // Llamado desde un Server Component (no puede escribir cookies).
          // No pasa nada: middleware.ts refresca la sesión en cada request.
        }
      },
    },
  });
}
