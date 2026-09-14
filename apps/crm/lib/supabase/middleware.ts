import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/**
 * Refresca el token de sesión (si expiró) en cada request — patrón oficial
 * de `@supabase/ssr` para Next.js. Sin esto, una sesión de staff se cae
 * silenciosamente apenas expira el access token de corta duración, aunque
 * el refresh token siga siendo válido (el usuario vería "acceso denegado"
 * sin haber cerrado sesión realmente).
 *
 * No decide aquí si la ruta requiere login — eso lo resuelve
 * `lib/auth/staff.ts` dentro de cada layout/página, que sí puede redirigir
 * con contexto (a `/login` o a `/acceso-denegado` según corresponda).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => (response.cookies as any).set(name, value, options));
      },
    },
  });

  // No se usa el resultado directamente: el solo hecho de llamar getUser()
  // dispara el refresh de token si hace falta (efecto secundario intencional
  // del patrón oficial de @supabase/ssr).
  await supabase.auth.getUser();

  return response;
}
